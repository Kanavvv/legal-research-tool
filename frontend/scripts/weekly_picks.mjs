// Writes ../weekly_picks.json: the rights, guides and templates the weekly email rotates
// through ("one right you might not know", "one free template"). Run after adding any.
import { writeFileSync } from "node:fs";
import { RIGHTS } from "../src/data/rights.js";
import { GUIDES } from "../src/data/guides.js";
import { TEMPLATES } from "../src/data/templates.js";

const out = {
  rights: RIGHTS.map((r) => ({ path: `/rights/${r.slug}`, title: r.title.en, lede: r.lede.en, point: r.points[0]?.en || "" })),
  guides: GUIDES.map((g) => ({ path: `/now/${g.slug}`, title: g.title.en, lede: g.lede.en })),
  templates: TEMPLATES.map((t) => ({ path: `/templates/${t.slug}`, title: t.title, blurb: t.blurb })),
};
writeFileSync(new URL("../../weekly_picks.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`weekly_picks: ${out.rights.length} rights, ${out.guides.length} guides, ${out.templates.length} templates`);
