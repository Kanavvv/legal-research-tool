"""
build_sitemap.py

Writes frontend/public/sitemap.xml: the site's pages, one URL per section of
every Act Nyaya holds (/law/<act>/<section>), the rights guides and the
templates. Run it after adding statutes, guides or templates.

    python3 build_sitemap.py
"""
import glob
import os
import re
from urllib.parse import quote

SITE = "https://asknyaya.in"
OUT = "frontend/public/sitemap.xml"
PAGES = [("/", "1.0"), ("/convert", "0.9"), ("/rights", "0.9"), ("/templates", "0.9"), ("/students", "0.8"),
         ("/statutes", "0.8"), ("/compare", "0.7"), ("/argument-builder", "0.7"), ("/documents", "0.8"),
         ("/drafts", "0.7"), ("/digest", "0.7"), ("/lawyers", "0.6"), ("/tools", "0.6"), ("/pricing", "0.6"),
         ("/about", "0.6"), ("/privacy", "0.3"), ("/terms", "0.3")]


def slugs(path, pattern):
    with open(path, encoding="utf-8") as f:
        return re.findall(pattern, f.read())


def main():
    urls = list(PAGES)
    urls += [(f"/rights/{s}", "0.8") for s in slugs("frontend/src/data/rights.js", r'slug: "([a-z-]+)"')]
    urls += [(f"/templates/{s}", "0.8") for s in slugs("frontend/src/data/templates.js", r'slug: "([a-z-]+)"')]
    acts = set(slugs("frontend/src/lawCodes.js", r'^\s+"?([a-z-]+)"?: \{ short:'.replace("^", "(?m)^")))
    sections = []
    for path in glob.glob("corpus_statutes/text/*_s*.txt"):
        act, num = os.path.basename(path)[:-4].rsplit("_s", 1)
        if act in acts:
            sections.append((act, num))
    def order(x):
        m = re.match(r"(\d+)(.*)", x[1])
        return (x[0], int(m.group(1)) if m else 0, m.group(2) if m else x[1])
    weight = {"bns": "0.7", "bnss": "0.7", "bsa": "0.7", "ipc": "0.6", "crpc": "0.6", "iea": "0.6", "constitution-of-india": "0.6"}
    urls += [(f"/law/{a}/{quote(n)}", weight.get(a, "0.5")) for a, n in sorted(sections, key=order)]
    body = "\n".join(f"  <url><loc>{SITE}{u}</loc><priority>{p}</priority></url>" for u, p in urls)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n')
    print(f"wrote {OUT}: {len(urls)} URLs ({len(sections)} sections from {len(acts)} Acts)")


if __name__ == "__main__":
    main()
