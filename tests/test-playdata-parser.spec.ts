import { expect, test } from "@playwright/test";

// Minimal mock of the rating.taiko.wiki HTML structure.
// The page embeds all user data as a JSON argument to kit.start() in a script tag.
const MOCK_TAIKO_WIKI_HTML = `<html lang="en"><head></head><body>
<script>
  Promise.all([import("a"), import("b")]).then(([kit, app]) => {
    kit.start(app, element, {
      node_ids: [0, 2, 19],
      data: [null, {type:"data",data:{theme:"light"}}, {type:"data",data:{
        ratingData:{
          currentRatingScore:10856,
          lastUpload:new Date(1768280045000),
          scoreData:{
            "1":{title:"Test Song Alpha",songNo:"1",difficulty:{oni:{crown:"gold",badge:"purple",score:988000,ranking:0,good:807,ok:22,bad:2,maxCombo:412,roll:64,count:{donderfullcombo:0,fullcombo:2,clear:113,play:122}}}},
            "2":{title:"Test Song Beta",songNo:"2",difficulty:{oni:{crown:"gold",badge:"purple",score:990420,ranking:0,good:396,ok:10,bad:0,maxCombo:406,roll:0,count:{donderfullcombo:0,fullcombo:3,clear:5,play:5}},easy:{crown:"silver",badge:"bronze",score:700000,ranking:0,good:100,ok:5,bad:1,maxCombo:100,roll:0,count:{donderfullcombo:0,fullcombo:0,clear:2,play:3}}}},
            "3":{title:"Test Song Gamma",songNo:"3",difficulty:{ura:{crown:"donderfull",badge:"rainbow",score:1000000,ranking:0,good:200,ok:0,bad:0,maxCombo:200,roll:0,count:{donderfullcombo:1,fullcombo:1,clear:1,play:1}}}}
          }
        }
      }}]
    });
  });
</script>
</body></html>`;

test.describe("parseTaikoWikiRatingHtml", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => typeof window.parseTaikoWikiRatingHtml === "function");
  });

  test("parses correct number of entries", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    // song 1: 1 difficulty, song 2: 2 difficulties, song 3: 1 difficulty = 4 total
    expect(result.entries).toHaveLength(4);
  });

  test("sets source to taiko-wiki-rating", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    expect(result.source).toBe("taiko-wiki-rating");
  });

  test("extracts updatedAt from lastUpload timestamp", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    expect(result.updatedAt).toBe(new Date(1768280045000).toISOString());
  });

  test("maps gold crown to FullCombo (2)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    const oniEntry = result.entries.find((e) => e.songId === 1 && e.difficulty === 4);
    expect(oniEntry).toBeDefined();
    expect(oniEntry?.crown).toBe(2); // Crown.FullCombo
  });

  test("maps silver crown to Clear (1)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    const easyEntry = result.entries.find((e) => e.songId === 2 && e.difficulty === 1);
    expect(easyEntry).toBeDefined();
    expect(easyEntry?.crown).toBe(1); // Crown.Clear
  });

  test("maps perfect crown to Perfect (3)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    const uraEntry = result.entries.find((e) => e.songId === 3 && e.difficulty === 5);
    expect(uraEntry).toBeDefined();
    expect(uraEntry?.crown).toBe(3); // Crown.Perfect
  });

  test("maps badge to scoreRank correctly", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    const purpleEntry = result.entries.find((e) => e.songId === 1);
    const bronzeEntry = result.entries.find((e) => e.songId === 2 && e.difficulty === 1);
    const rainbowEntry = result.entries.find((e) => e.songId === 3);
    expect(purpleEntry?.scoreRank).toBe(6); // ScoreRank.Purple
    expect(bronzeEntry?.scoreRank).toBe(2); // ScoreRank.Bronze
    expect(rainbowEntry?.scoreRank).toBe(7); // ScoreRank.Rainbow
  });

  test("maps note stats correctly (good=良, ok=可)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    const entry = result.entries.find((e) => e.songId === 1);
    expect(entry?.great).toBe(807); // good field → great
    expect(entry?.good).toBe(22); // ok field → good
    expect(entry?.bad).toBe(2);
    expect(entry?.combo).toBe(412); // maxCombo → combo
    expect(entry?.drumroll).toBe(64); // roll → drumroll
    expect(entry?.score).toBe(988000);
  });

  test("maps difficulty names to numbers", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseTaikoWikiRatingHtml(html), MOCK_TAIKO_WIKI_HTML);
    expect(result.entries.find((e) => e.songId === 2 && e.difficulty === 1)).toBeDefined(); // easy=1
    expect(result.entries.find((e) => e.songId === 1 && e.difficulty === 4)).toBeDefined(); // oni=4
    expect(result.entries.find((e) => e.songId === 3 && e.difficulty === 5)).toBeDefined(); // ura=5
  });

  test("returns empty entries for non-taiko-wiki HTML", async ({ page }) => {
    const result = await page.evaluate(
      (html) => window.parseTaikoWikiRatingHtml(html),
      "<html><body><p>hello</p></body></html>",
    );
    expect(result.entries).toHaveLength(0);
    expect(result.source).toBe("taiko-wiki-rating");
  });
});

// ─── fumen-database ───────────────────────────────────────────────────────────

// Minimal mock of the fumen-database HTML structure, based on the actual page.
// Crown/scoreRank are identified by image src substrings; stats are in classed divs.
const MOCK_FUMEN_DB_HTML = `<html><head><meta charset="utf-8"></head><body>
  <p>最終更新：2026-02-10 02:01:52</p>
  <div class="table table_grid filter_selector genre_pops star8 difficulty_extreme crown_gold">
    <div class="table_grid_body table_grid_body_left table_song_name">
      <a href="/song/1439-4/423918217799">Test Song Delta</a>
    </div>
    <div class="table_grid_body table_crown table_crown_lightgold table_center">
      <img class="table_crown_image" src="/image/crown/crown_preDonderfull.png">
    </div>
    <div class="table_grid_body table_scorerank table_scorerank_data table_center">
      <img class="table_scorerank_image" src="/image/score/scoreRank_purple.png">
    </div>
    <div class="table_grid_body table_score table_totalscore table_center">
      999560<span class="table_totalscore_ten">点</span>
    </div>
    <div class="table_grid_body table_score table_good table_center">506</div>
    <div class="table_grid_body table_score table_ok table_center">9</div>
    <div class="table_grid_body table_score table_bad table_center">0</div>
    <div class="table_grid_body table_score table_combo table_center">515</div>
    <div class="table_grid_body table_score table_roll table_center">194</div>
  </div>
  <div class="table table_grid filter_selector genre_pops star9 difficulty_hidden crown_silver">
    <div class="table_grid_body table_grid_body_left table_song_name">
      <a href="/song/1440-5/423918217799">Test Song Epsilon</a>
    </div>
    <div class="table_grid_body table_crown table_center">
      <img class="table_crown_image" src="/image/crown/crown_clear.png">
    </div>
    <div class="table_grid_body table_scorerank table_scorerank_data table_center">
      <img class="table_scorerank_image" src="/image/score/scoreRank_gold.png">
    </div>
    <div class="table_grid_body table_score table_totalscore table_center">
      994,100<span class="table_totalscore_ten">点</span>
    </div>
    <div class="table_grid_body table_score table_good table_center">763</div>
    <div class="table_grid_body table_score table_ok table_center">19</div>
    <div class="table_grid_body table_score table_bad table_center">1</div>
    <div class="table_grid_body table_score table_combo table_center">403</div>
    <div class="table_grid_body table_score table_roll table_center">53</div>
  </div>
</body></html>`;

test.describe("parseFumenDatabaseHtml", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => typeof window.parseFumenDatabaseHtml === "function");
  });

  test("parses correct number of entries", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries).toHaveLength(2);
  });

  test("sets source to fumen-database", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.source).toBe("fumen-database");
  });

  test("extracts updatedAt", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.updatedAt).toBe("2026-02-10 02:01:52");
  });

  test("extracts songId and difficulty from href", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries[0].songId).toBe(1439);
    expect(result.entries[0].difficulty).toBe(4); // oni/extreme
    expect(result.entries[1].songId).toBe(1440);
    expect(result.entries[1].difficulty).toBe(5); // ura/hidden
  });

  test("maps crown_preDonderfull to FullCombo (2)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries[0].crown).toBe(2); // Crown.FullCombo
  });

  test("maps crown_clear to Clear (1)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries[1].crown).toBe(1); // Crown.Clear
  });

  test("maps scoreRank_purple to Purple (6)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries[0].scoreRank).toBe(6); // ScoreRank.Purple
  });

  test("maps scoreRank_gold to Gold (4)", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries[1].scoreRank).toBe(4); // ScoreRank.Gold
  });

  test("parses score, stripping 点 and commas", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries[0].score).toBe(999560);
    expect(result.entries[1].score).toBe(994100);
  });

  test("parses note stats correctly", async ({ page }) => {
    const result = await page.evaluate((html) => window.parseFumenDatabaseHtml(html), MOCK_FUMEN_DB_HTML);
    expect(result.entries[0].great).toBe(506);
    expect(result.entries[0].good).toBe(9);
    expect(result.entries[0].bad).toBe(0);
    expect(result.entries[0].combo).toBe(515);
    expect(result.entries[0].drumroll).toBe(194);
  });

  test("returns empty entries for non-fumen-database HTML", async ({ page }) => {
    const result = await page.evaluate(
      (html) => window.parseFumenDatabaseHtml(html),
      "<html><body><p>hello</p></body></html>",
    );
    expect(result.entries).toHaveLength(0);
    expect(result.source).toBe("fumen-database");
  });
});
