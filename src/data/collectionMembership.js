/**
 * Which short stories belong to which collections.
 *
 * The scraped catalog does not model this explicitly. What it has is the
 * `related` field, which means two different things depending on the row:
 *
 *   - On a Collection, `related` is the collection's table of contents. Every
 *     one of the 235 links on the 20 collections points at a Short Story, and
 *     nothing else. It is membership data wearing a recommendations label.
 *   - On a Novel, Play, or Short Story, `related` is genuine "you might also
 *     enjoy" recommendations -- a mix of novels, plays, collections and shorts.
 *
 * So `related` is only reinterpreted as membership for rows of type Collection.
 * Everywhere else it keeps its original meaning.
 */

/** The one row type whose `related` field is a table of contents. */
const COLLECTION_TYPE = 'Collection'

/**
 * Memberships the source site omits.
 *
 * agathachristie.com lists the 11-story UK contents of Poirot Investigates.
 * The US edition adds three more, and the site carries pages for all three
 * without listing them under any collection -- so without this they would look
 * like standalone stories. Kept separate from the scraped data so re-running
 * the scraper cannot silently drop them.
 *
 * Two uncollected shorts are deliberately absent:
 *
 *   - "The Adventure of the Christmas Pudding" (the-adventure-of-the-christmas-pudding-2)
 *     is the title story of a collection that is not in this catalog at all.
 *     There is no correct row to attach it to.
 *   - "Poirot and the Regatta Mystery" (poirot-and-the-regatta-mystery, 1936)
 *     is the Poirot version of a story Christie later rewrote for Parker Pyne.
 *     The rewritten "The Regatta Mystery" (1939) is already in The Regatta
 *     Mystery and Other Stories; adding the variant there too would show one
 *     story twice.
 *
 * Both keep their Short Story type and are listed as independent entries
 * alongside the novels and plays, until someone decides where they go.
 */
export const EXTRA_MEMBERSHIPS = {
  'poirot-investigates': ['the-chocolate-box', 'the-veiled-lady', 'the-lost-mine'],
}

/** Slug from the tail of a story URL, matching the rest of the app. */
const slugFromUrl = (url) => (url || '').split('/').filter(Boolean).pop() || ''

/**
 * Build the membership indexes once per catalog load.
 *
 * Returns:
 *   membersOf     Map<collectionSlug, storySlug[]>  -- in published order
 *   collectionsOf Map<storySlug, collectionSlug[]>  -- reverse; 64 shorts have >1
 *   uncollected   storySlug[]                       -- shorts in no collection
 *
 * Only slugs present in the catalog are recorded, so a table-of-contents entry
 * pointing at a story with no page here cannot produce a dead link.
 */
export function buildMembership(stories) {
  const bySlug = new Map(stories.map((s) => [s.slug, s]))
  const membersOf = new Map()
  const collectionsOf = new Map()

  const link = (collectionSlug, storySlug) => {
    if (!bySlug.has(storySlug)) return

    const members = membersOf.get(collectionSlug)
    // A story can legitimately be reachable twice (listed in `related` and also
    // named in EXTRA_MEMBERSHIPS); record it once.
    if (members.includes(storySlug)) return
    members.push(storySlug)

    if (!collectionsOf.has(storySlug)) collectionsOf.set(storySlug, [])
    collectionsOf.get(storySlug).push(collectionSlug)
  }

  for (const story of stories) {
    if (story.type !== COLLECTION_TYPE) continue

    membersOf.set(story.slug, [])
    for (const entry of story.related ?? []) {
      link(story.slug, slugFromUrl(entry.url))
    }
  }

  // Applied after the scraped pass so these append to a collection that exists.
  for (const [collectionSlug, storySlugs] of Object.entries(EXTRA_MEMBERSHIPS)) {
    if (!membersOf.has(collectionSlug)) continue
    for (const storySlug of storySlugs) link(collectionSlug, storySlug)
  }

  const uncollected = stories
    .filter((s) => s.type === 'Short Story' && !collectionsOf.has(s.slug))
    .map((s) => s.slug)

  return { membersOf, collectionsOf, uncollected }
}
