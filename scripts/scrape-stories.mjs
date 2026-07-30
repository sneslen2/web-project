// Scrapes Agatha Christie's catalog from agathachristie.com/stories into stories.json.
// Run: node scrape-stories.mjs
//
// Recovered from the 2026-06-30 session transcript; the original lived in a temp
// scratchpad and was lost. Last verified against the live site on 2026-06-30 --
// the selectors below depend on the site's markup, so re-check them if a run
// returns 0 cards or the counts look wrong.
//
// Requires cheerio:  npm install cheerio
// Writes stories.json to the current working directory.
import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";

const BASE = "https://www.agathachristie.com/stories";
const FORMATS = ["novel", "collection", "play", "short-story"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The img URLs are imgix links with size params; strip the query string to get a
// clean base the app can resize on demand (e.g. add ?w=200). Commas in the original
// query (auto=compress,format) make srcset unsafe to split, so we use data-src/src.
function coverBase(img, $) {
  const raw = $(img).attr("data-src") || $(img).attr("src") || "";
  return raw ? raw.split("?")[0] : null;
}

function parseCards(html) {
  const $ = cheerio.load(html);
  const out = [];

  $("div.mod.no-pad.text-center").each((_, el) => {
    const card = $(el);
    const link = card.find(".mod-title h3 a");
    const title = link.text().trim();
    if (!title) return; // skip non-story mods

    // Character: text of .character-label minus the empty icon div. Absent => standalone.
    const charLabel = card.find(".character-label").clone();
    charLabel.find(".icon").remove();
    const character = charLabel.text().trim() || null;

    // Type: footer left cell, minus the leading icon glyph span.
    const typeCell = card.find(".footer .c5 .mod-content").first().clone();
    typeCell.find(".icon").remove();
    const type = typeCell.text().trim() || null;

    // Year: footer right cell, minus the "First published:" meta span.
    const yearCell = card.find(".footer .c7 .mod-content").first().clone();
    yearCell.find(".meta").remove();
    const year = Number(yearCell.text().replace(/\D/g, "")) || null;

    out.push({
      title,
      type,
      character,
      year,
      url: link.attr("href") || null,
      cover: coverBase(card.find("img").first(), $),
    });
  });

  return out;
}

const all = [];
const seen = new Set(); // de-dupe by url across pages/formats

for (const format of FORMATS) {
  console.log(`\n=== format: ${format} ===`);
  for (let page = 1; page <= 50; page++) {
    // ?format=<type> selects the story type; /pN paginates within it.
    const path = page === 1 ? BASE : `${BASE}/p${page}`;
    const url = `${path}?format=${format}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CS571-student-project/1.0 (educational scraper)" },
    });
    if (!res.ok) {
      console.error(`  page ${page}: HTTP ${res.status} — stopping this format`);
      break;
    }
    const cards = parseCards(await res.text());
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

    await sleep(1000); // be polite between requests
  }
}

await writeFile("stories.json", JSON.stringify(all, null, 2));
console.log(`\nWrote stories.json with ${all.length} stories.`);

// Quick breakdown by type.
const byType = {};
for (const s of all) byType[s.type ?? "Unknown"] = (byType[s.type ?? "Unknown"] || 0) + 1;
console.log("By type:", byType);
