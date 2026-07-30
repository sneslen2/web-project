// Scrapes Agatha Christie's catalog from agathachristie.com into stories.json.
//
// Two passes:
//   1. The paginated listing pages, per format, to enumerate every story URL.
//   2. Each story's own detail page, for the richer fields the listing omits
//      (synopsis, "more about this story" prose, trivia, quote, extract PDF).
//
// Run: npm install cheerio && node scrape-stories.mjs
//   --limit=N   only scrape N detail pages (smoke-test without ~300 requests)
//   --listing   skip pass 2 entirely (listing fields only)
//
// Selectors were verified against novel, short-story, and play pages on
// 2026-07-29. They depend on the site's markup: if detail fields start coming
// back null across the board, re-inspect the HTML rather than trusting a run.
import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";

const BASE = "https://www.agathachristie.com/stories";
const FORMATS = ["novel", "collection", "play", "short-story"];
const UA = "CS571-student-project/1.0 (educational scraper)";
const DELAY_MS = 1000; // be polite between requests
const KNOWN_TYPES = new Set(["Novel", "Collection", "Play", "Short Story"]);

const args = new Set(process.argv.slice(2));
const limitArg = [...args].find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const LISTING_ONLY = args.has("--listing");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Strip an imgix query string to get a clean base the app can resize on demand
// (e.g. append ?w=200). Commas in the original query (auto=compress,format)
// make srcset unsafe to split, so read data-src/src instead.
const coverBase = (raw) => (raw ? raw.split("?")[0] : null);

// Collapse the site's generous whitespace/newlines inside text nodes.
const clean = (s) => s.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Pass 1 -- listing pages
// ---------------------------------------------------------------------------
function parseCards(html) {
  const $ = cheerio.load(html);
  const out = [];

  $("div.mod.no-pad.text-center").each((_, el) => {
    const card = $(el);
    const link = card.find(".mod-title h3 a");
    const title = clean(link.text());
    if (!title) return; // skip non-story mods

    // Character: text of .character-label minus the empty icon div. Absent => standalone.
    const charLabel = card.find(".character-label").clone();
    charLabel.find(".icon").remove();

    // Type: footer left cell, minus the leading icon glyph span.
    const typeCell = card.find(".footer .c5 .mod-content").first().clone();
    typeCell.find(".icon").remove();

    // Year: footer right cell, minus the "First published:" meta span.
    const yearCell = card.find(".footer .c7 .mod-content").first().clone();
    yearCell.find(".meta").remove();

    out.push({
      title,
      type: clean(typeCell.text()) || null,
      character: clean(charLabel.text()) || null,
      year: Number(yearCell.text().replace(/\D/g, "")) || null,
      url: link.attr("href") || null,
      cover: coverBase(card.find("img").first().attr("data-src") || card.find("img").first().attr("src")),
    });
  });

  return out;
}

async function collectListing() {
  const all = [];
  const seen = new Set(); // de-dupe by url across pages/formats

  for (const format of FORMATS) {
    console.log(`\n=== format: ${format} ===`);
    for (let page = 1; page <= 50; page++) {
      // ?format=<type> selects the story type; /pN paginates within it.
      const path = page === 1 ? BASE : `${BASE}/p${page}`;
      let cards;
      try {
        cards = parseCards(await fetchHtml(`${path}?format=${format}`));
      } catch (err) {
        console.error(`  page ${page}: ${err.message} — stopping this format`);
        break;
      }
      if (cards.length === 0) {
        console.log(`  page ${page}: 0 cards — end of ${format}`);
        break;
      }

      let added = 0;
      for (const c of cards) {
        const key = c.url || c.title;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(c);
        added++;
      }
      console.log(`  page ${page}: ${cards.length} cards (${added} new) — running total ${all.length}`);
      if (added === 0) {
        console.log(`  no new cards — end of ${format} (pagination looped)`);
        break;
      }

      await sleep(DELAY_MS);
    }
  }

  return all;
}

// ---------------------------------------------------------------------------
// Pass 2 -- individual story pages
// ---------------------------------------------------------------------------
function parseDetail(html) {
  const $ = cheerio.load(html);

  // The header meta list is POSITIONAL with no labels, and the character entry
  // is simply absent on standalone stories -- so match on content, not index.
  const metaItems = $(".book-header__meta li .icon-label")
    .map((_, e) => clean($(e).text()))
    .get()
    .filter(Boolean);

  let character = null;
  let type = null;
  let year = null;
  for (const item of metaItems) {
    if (/^\d{4}$/.test(item)) year = Number(item);
    else if (KNOWN_TYPES.has(item)) type = item;
    else character = item; // whatever's left is the recurring character
  }

  // Synopsis: the first .section after the book header. It has no class of its
  // own, hence the positional anchor. The "Read an extract" button lives in its
  // own <p>, so exclude paragraphs containing a .btn.
  const synopsisParas = $(".book-header")
    .nextAll("div.section")
    .first()
    .find("p")
    .filter((_, e) => $(e).find("a.btn").length === 0)
    .map((_, e) => clean($(e).text()))
    .get()
    .filter(Boolean);

  // "More about this story": the heading sits in one .section and the prose in
  // the next, so step across rather than descending.
  const moreParas = $("h2.section-heading span")
    .filter((_, e) => /More about this story/i.test($(e).text()))
    .closest("div.section")
    .nextAll("div.section")
    .first()
    .find("p")
    .map((_, e) => clean($(e).text()))
    .get()
    .filter(Boolean);

  // "Did you know?" trivia -- present on some novels, absent on most others.
  const trivia = $("h2.tabpanel__label")
    .filter((_, e) => /Did you know/i.test($(e).text()))
    .closest("div.section")
    .find("ol.bullets li")
    .map((_, e) => clean($(e).text()))
    .get()
    .filter(Boolean);

  // Pull-quote from a character. Often absent.
  const blockquote = $("blockquote").first();
  const quoteText = clean(blockquote.find("p").first().text());
  const quoteAuthor = clean(blockquote.find(".author").text());

  // "Other stories you might enjoy" -- the related cards at the page foot.
  const related = $(".mod-title h3 a")
    .map((_, e) => ({ title: clean($(e).text()), url: $(e).attr("href") || null }))
    .get()
    .filter((r) => r.title);

  return {
    character,
    type,
    year,
    synopsis: synopsisParas.join("\n\n") || null,
    moreAbout: moreParas.join("\n\n") || null,
    trivia,
    quote: quoteText ? { text: quoteText, author: quoteAuthor || null } : null,
    extractPdf: $('a.btn[href$=".pdf"]').attr("href") || null,
    related,
    // Full-size cover from the header (the listing only offers a thumbnail).
    cover: coverBase($(".book-header__img img").attr("src")),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const stories = await collectListing();
console.log(`\nListing pass complete: ${stories.length} stories.`);

if (!LISTING_ONLY) {
  const targets = stories.filter((s) => s.url).slice(0, LIMIT);
  console.log(`\n=== detail pass: ${targets.length} pages (~${Math.ceil((targets.length * DELAY_MS) / 60000)} min) ===`);

  let done = 0;
  const failures = [];
  for (const story of targets) {
    try {
      const detail = parseDetail(await fetchHtml(story.url));
      // Listing values win where both exist and the listing is more reliable;
      // detail fills the gaps and upgrades the cover to full size.
      Object.assign(story, {
        ...detail,
        title: story.title,
        type: story.type ?? detail.type,
        character: story.character ?? detail.character,
        year: story.year ?? detail.year,
        cover: detail.cover ?? story.cover,
      });
      if (!detail.synopsis) console.warn(`  ! no synopsis: ${story.title}`);
    } catch (err) {
      failures.push({ title: story.title, url: story.url, error: err.message });
      console.error(`  ! failed ${story.title}: ${err.message}`);
    }

    if (++done % 25 === 0) console.log(`  ${done}/${targets.length}…`);
    await sleep(DELAY_MS);
  }

  console.log(`\nDetail pass complete: ${done - failures.length} ok, ${failures.length} failed.`);
  if (failures.length) console.log("Failures:", failures);
}

await writeFile("stories.json", JSON.stringify(stories, null, 2));
console.log(`\nWrote stories.json with ${stories.length} stories.`);

// Breakdown + field coverage, so a silent selector break is visible.
const byType = {};
for (const s of stories) byType[s.type ?? "Unknown"] = (byType[s.type ?? "Unknown"] || 0) + 1;
console.log("By type:", byType);

if (!LISTING_ONLY) {
  const n = stories.filter((s) => s.synopsis !== undefined).length || 1;
  const pct = (k) => Math.round((stories.filter((s) => s[k] != null && s[k] !== "").length / n) * 100);
  console.log(
    `Coverage: synopsis ${pct("synopsis")}%, moreAbout ${pct("moreAbout")}%, ` +
      `quote ${pct("quote")}%, extractPdf ${pct("extractPdf")}%, ` +
      `trivia ${Math.round((stories.filter((s) => s.trivia?.length).length / n) * 100)}%`,
  );
}
