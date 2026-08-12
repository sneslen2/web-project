# The Christie Project

An interactive reading tracker and mystery-solving companion for the complete
works of Agatha Christie — 302 novels, collections, plays, and short stories.

Built for CS571 (UW) as a React single-page app, hosted on GitHub Pages.

## Part 2 Log

- Backup in case the Supabase project is paused or down
- Send recurring ping to keep the project active
- Restructure Collections as not separate works, just groupings of short stories
- Email confirmation link doesn't work, get rid of
- Collection should not show as a format option, collection should be integrated
- Fixed title of the tab
- Change accounts to use username instead of email
- Short stories link to a description of the collection(s)
- Sign in directs to Home or previous page
- Scrapped Read an extract (PDF)
- Added count to filters
- Made finished date editable
- UK spelling changed to US spelling
- Show total and relative progress on the checklist
- Enable marking in progress from the checklist
- Easier check-off
- Design overhaul, defining universal theming
- Custom tab label icon
- Fleshed out About page
- Easy back button from story
- Filters should be saved when user navigates back to checklist


## Todo

- Collapse the filters
- Quick button filters
- Not completely satisfied with the home page, keep tweaking
  - Links to the activities, meh
  - Add recently read
- Author field for inspired by
- Recently finished only pulls the first few
- Clear progress when logged out
- Recently finished should link to the work
- Add in progress color to progress bar
- Formatting clean up
  - Fix username/sign in buttons in navigation bar
  - Progress bar coloring
  - Toggle button
  - Not completely sold on the current cards
  - Reset progress button
  - Links
  - Too dark, would like to add more white/light colors, esp on detail pages
  - Reading status switch button
  - Card tag coloring
  - Fonts everywhere
  - Integrate blue (and maybe purple?) jewel tones
- Rail/jump bar should stay visible when scrolling
- Filters should be a sidebar
- Subtext on Home banner, liked the quote from one of the mockups
- "Progress is currently saved in this browser only" message when I'm logged in
- Catalog total on About page is white on white for some reason
- Inspired by prob should be distinct in the about page



**Tentative**

- Mystery solver activity!
- Separate tab/checklist for plays, inspired by, and/or Mary Westmacott
- Add biography works
- Remove Ariadne Oliver and/or Harley Quin
- Scrape additional data from Goodreads (cover photos for short stories?)
- Get additional short story collection data
- Add star rating filter
- Some kind of scroll or quick jump function on the checklist
  (timeline, alphabet, groupings, etc dynamic sidebar)
- More discrete fields on each story
- Customize what counts towards completion
- Not sure about related stories, may scrap
- Rename from "The Christie Project", idk it's kinda growing on me


**Nice to have**
- Add film/TV works (or a checklist?)
- Wikipedia links
- Ancillary characters like Japp, Hastings, etc
- Links to public domain ebooks

## Features

- **Checklist** — every story, with title search, sorting by publication date or
  title, grouping by format/detective/decade, and filtering by format,
  detective, and reading status.
- **Story pages** — each checklist card opens a full page with cover art,
  metadata, and per-story progress: status, 1–5 rating, finish date, and notes.
- **Statistics** — completion overall and broken down by format, detective, and
  decade, plus average rating and recently finished stories.
- **About Agatha Christie** — biography and catalog figures computed from the
  data.
- **Accounts** — Supabase email/password sign-in (optional; see *Reading
  progress* below).

## Stack

| Concern      | Choice                                 |
| ------------ | -------------------------------------- |
| Build tool   | Vite                                   |
| UI           | react-bootstrap + bootstrap            |
| Routing      | react-router-dom (`HashRouter`)        |
| Backend      | Supabase (`@supabase/supabase-js`)     |
| Language     | React + JavaScript (no TypeScript)     |

`HashRouter` is required: GitHub Pages has no server to rewrite unknown paths
back to `index.html`, so routes live after a `#` (`/#/checklist`) and never 404
on refresh.

## Getting started

```bash
npm install
npm run dev      # Vite prints a localhost URL
```

Other scripts:

```bash
npm run build    # production build into docs/
npm run lint     # oxlint
npm run preview  # serve the built output locally
```

## Project structure

```
├── index.html                    # App shell; Vite entry point
├── vite.config.js                # base:'./' + build.outDir:'docs'
├── supabase-schema.sql           # Run in the Supabase SQL Editor
├── src/
│   ├── main.jsx                  # Entry: HashRouter > AuthProvider > ProgressProvider
│   ├── App.jsx                   # Navbar + routes
│   ├── supabaseClient.js         # Shared Supabase client
│   ├── auth/
│   │   ├── AuthProvider.jsx      # Session state, signUp/signIn/signOut
│   │   └── ProtectedRoute.jsx    # Redirects signed-out users to /login
│   ├── progress/
│   │   └── ProgressProvider.jsx  # Reading progress (the Supabase seam)
│   ├── data/
│   │   ├── stories.js            # Slugs, lookup, derived facets
│   │   └── story-cards.json      # Scraped catalog (302 stories)
│   ├── components/
│   │   └── StoryCard.jsx         # One story in the checklist
│   └── pages/                    # Home, Checklist, Story, Statistics, About, Login, NotFound
├── scripts/
│   └── scrape-stories.mjs        # Catalog scraper
└── docs/                         # BUILD OUTPUT — committed, served by GitHub Pages
```

## The catalog data

`src/data/story-cards.json` is scraped from agathachristie.com. Each record:

```json
{
  "title": "The Mysterious Affair at Styles",
  "type": "Novel",
  "character": "Hercule Poirot",
  "year": 1920,
  "url": "https://www.agathachristie.com/stories/the-mysterious-affair-at-styles",
  "cover": "https://agathachristie.imgix.net/hcus-paperback/MysteriousAffairAtStyles_PB.jpg"
}
```

`character` is `null` for standalone stories. `cover` is an imgix base URL with
its query stripped, so any width can be requested on demand — `coverAt(story,
400)` in `src/data/stories.js` does this.

Story pages are addressed by a slug derived from the tail of `url`
(`/#/story/the-mysterious-affair-at-styles`). All 302 slugs are unique.

### Re-scraping

```bash
cd scripts
npm install cheerio
node scrape-stories.mjs            # full run: ~330 requests, ~6 min
node scrape-stories.mjs --limit=5  # smoke test a few detail pages
node scrape-stories.mjs --listing  # listing pages only, 6 fields
```

The scraper runs two passes: the paginated listing pages to enumerate every
story, then each story's own page for `synopsis`, `moreAbout`, `trivia`,
`quote`, `extractPdf`, and `related`. It writes `stories.json` to the working
directory; copy it over `src/data/story-cards.json` to use it.

`src/pages/Story.jsx` already handles both shapes — it renders the synopsis when
present and a short placeholder when not, so dropping in the enriched file needs
no code changes.

Counts come out as 86 novels / 20 collections / 30 plays / 166 short stories.
The novel and play totals run higher than commonly cited figures because the
site includes Mary Westmacott titles and stage adaptations.

**Selectors are markup-dependent.** They were verified against novel,
short-story, and play pages on 2026-07-29. If a run returns 0 cards or the
detail fields come back null across the board, re-inspect the page HTML rather
than trusting the output — the script prints a field-coverage summary at the end
to make that visible.

## Supabase

Project: `https://lskobysyxbngryxzkxez.supabase.co`

1. Supabase dashboard → SQL Editor → paste `supabase-schema.sql` → Run. It's
   safe to re-run.
2. For faster local testing, turn off Authentication → Sign In / Up → *Confirm
   email*. Otherwise new accounts must click a confirmation link before signing
   in.

The **publishable** key is hardcoded in `src/supabaseClient.js`. That is
intended — it's designed to be public, and **Row Level Security is the actual
access control**. Because the key ships in the JavaScript bundle, anyone can
read it and issue queries against the project; the RLS policies are what confine
each user to their own rows.

Consequences:

- Every new table needs `alter table … enable row level security` plus policies,
  or it is either fully exposed or fully inaccessible.
- Never put the **secret** / `service_role` key in client code — it bypasses RLS
  entirely.
- No `.env` file is needed; nothing reads environment variables. (A `.env`
  wouldn't help anyway: Vite inlines `VITE_`-prefixed values into the bundle at
  build time.)

### Reading progress

Progress currently persists to **localStorage**, so the app works fully without
signing in, but data stays in one browser.

`src/progress/ProgressProvider.jsx` is the seam for changing that. Replace its
load/persist internals with queries against a `reading_progress` table
(`user_id`, `story_slug`, `status`, `rating`, `finished_on`, `notes`) and the
hook's public shape stays identical — no page needs editing.

## Build & deploy

The production build is written to `docs/`, and GitHub Pages serves the site
from the `main` branch `/docs` folder.

```bash
npm run build
git add docs
git commit -m "Build site"
git push
```

One-time GitHub setup: *Settings → Pages → Source: **Deploy from a branch**,
Branch: **main**, Folder: **/docs**.*

Gotchas:

- **`base: './'`** in `vite.config.js` — required so asset URLs resolve under
  the `/<repo>/` subpath. Without it the CSS/JS 404 on the deployed site.
- **`HashRouter`** — required so route refreshes and deep links don't 404.
- **`docs/` must be committed** — it's the deployed artifact.

## Constraints

- **Client-side only.** No server of our own; Supabase is reached over HTTPS
  from the browser.
- **No Next.js, no SSR, no server components.** GitHub Pages is a static file
  host.
- **React + JavaScript**, no TypeScript.
