"""Build Myanmar Rice Research Intelligence for publishing.

    python scripts/build_site.py              # GitHub Pages site  -> _site/
    python scripts/build_site.py --artifact   # claude.ai artifact -> out/myanmar-rice-research-intelligence.html

Standard library only. The app is a single self-contained page: CSS, JavaScript and the research
database (window.RICE_DATA) are inlined, routing is hash-based (#view or #view/RECORD), and the only
external requests are Google Fonts and the Cytoscape CDN (absolute https URLs). That makes the page
independent of the hosting sub-path (/Rice-Research-Datasets/ on GitHub Pages).

_site/ layout
    index.html        the application (full HTML document: doctype, charset, viewport, lang)
    404.html          sends /<base>/<view>[/<record>] to /<base>/#<view>[/<record>]
    data/*.json       published research tables (same data the app embeds)
    data/csv/*.csv    flat exports of the same tables
    data/index.html   plain file listing with record counts
"""
import argparse
import html
import json
import os
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / "app"
JS_ORDER = ["core.js", "ui.js", "views.js", "graph.js", "main.js"]
VIEWS = ["overview", "search", "problems", "research", "datasets", "implementation", "connections", "countries", "gaps", "projects", "methodology"]
TABLES = ["studies", "problems", "datasets", "interventions", "benchmarks", "gaps", "projects", "relationships", "claims", "sources", "series", "methodology"]
DESCRIPTION = ("Traceable evidence map of Myanmar rice agriculture, 2000-2026: problems, 319 studies, 36 datasets, "
               "audited interventions, neighbour-country cases, research gaps and ranked data-analysis projects.")
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%232C6741'/%3E"
           "%3Cpath d='M16 26V9M16 13c-3-1-5-3-5-6 3 0 5 2 5 6zm0 0c3-1 5-3 5-6-3 0-5 2-5 6zm0 6c-3-1-5-3-5-6 3 0 5 2 5 6zm0 0c3-1 5-3 5-6-3 0-5 2-5 6z' "
           "stroke='%23F4E7C6' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")


def fail(msg):
    sys.exit(f"build_site: ERROR: {msg}")


def bundle_fragment():
    """The app as an HTML fragment (title + head content + body content), exactly as published
    to the claude.ai artifact host, which supplies its own document skeleton."""
    t = (APP / "template.html").read_text(encoding="utf-8")
    css = (APP / "app.css").read_text(encoding="utf-8")
    js = "\n".join((APP / "js" / f).read_text(encoding="utf-8") for f in JS_ORDER)
    data = (APP / "data.js").read_text(encoding="utf-8")
    if not data.startswith("window.RICE_DATA="):
        fail("app/data.js must start with window.RICE_DATA=")
    obj = json.loads(data[len("window.RICE_DATA="):].rstrip().rstrip(";"))
    vp = ROOT / "raw" / "validation.json"
    if vp.exists():
        obj["validation"] = json.loads(vp.read_text(encoding="utf-8"))
    djs = "window.RICE_DATA=" + json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";"
    out = t.replace("/*__CSS__*/", css).replace("/*__DATA__*/", djs).replace("/*__JS__*/", js.replace("</script", "<\\/script"))
    if "/*__" in out:
        fail("unreplaced template placeholder")
    return out, obj


def standalone_document(fragment):
    """Wrap the fragment in a complete standards-mode document for static hosting."""
    i = fragment.find('<header class="top"')
    if i < 0:
        fail("could not find <header class=\"top\"> to split head/body")
    head, body = fragment[:i].rstrip(), fragment[i:]
    meta = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
            f"<meta name=\"description\" content=\"{html.escape(DESCRIPTION)}\">\n"
            "<meta name=\"color-scheme\" content=\"light dark\">\n"
            "<meta name=\"theme-color\" content=\"#2C6741\">\n"
            f"<link rel=\"icon\" href=\"{FAVICON}\">\n")
    noscript = ("<noscript><p style=\"padding:16px;font-family:system-ui,sans-serif\">This research explorer needs JavaScript. "
                "The underlying tables are available as JSON and CSV in <a href=\"data/\">data/</a>.</p></noscript>\n")
    return meta + head + "\n</head>\n<body>\n" + noscript + body.rstrip() + "\n</body>\n</html>\n"


def not_found_page(base):
    views = json.dumps(VIEWS)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Redirecting · Myanmar Rice Research Intelligence</title>
<link rel="icon" href="{FAVICON}">
<script>
/* GitHub Pages serves this file for any missing path under the site. The app routes with the URL
   hash, so /<base>/countries/B10 becomes /<base>/#countries/B10; anything else goes to the app root. */
(function () {{
  var BASE = {json.dumps(base)}, VIEWS = {views};
  var path = location.pathname, low = path.toLowerCase(), b = BASE.toLowerCase();
  var root = low.indexOf(b) === 0 ? path.slice(0, BASE.length) : (low + '/' === b ? path + '/' : '/');
  var rest = low.indexOf(b) === 0 ? path.slice(BASE.length) : '';
  var parts = rest.split('/').filter(Boolean);
  var v = (parts[0] || '').toLowerCase().replace(/\\.html?$/, ''), r = parts[1] || '';
  var hash = VIEWS.indexOf(v) >= 0 ? '#' + v + (/^[A-Za-z]{{1,2}}\\d{{2,3}}$/.test(r) ? '/' + r.toUpperCase() : '') : (location.hash || '');
  location.replace(root + hash);
}})();
</script>
</head>
<body><p style="font-family:system-ui,sans-serif;padding:16px">Page not found. <a href="{html.escape(base)}">Open Myanmar Rice Research Intelligence</a>.</p></body>
</html>
"""


def data_index(rows):
    def csv_link(n):
        return f'<a href="csv/{n}.csv">{n}.csv</a>' if (ROOT / "data" / "csv" / f"{n}.csv").exists() else "–"
    items = "\n".join(f'<tr><td><a href="{n}.json">{n}.json</a></td><td>{c}</td><td>{csv_link(n)}</td></tr>' for n, c in rows)
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Data files · Myanmar Rice Research Intelligence</title><link rel="icon" href="{FAVICON}">
<style>body{{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:760px;margin:0 auto;padding:24px 16px;color:#17201A;background:#F2F4EF;line-height:1.5}}
table{{border-collapse:collapse;width:100%;background:#fff}}td,th{{border-bottom:1px solid #D2DACF;padding:8px 10px;text-align:left}}a{{color:#2F4C86}}
@media (prefers-color-scheme:dark){{body{{background:#0F1411;color:#E3EAE4}}table{{background:#161D18}}td,th{{border-color:#2A352D}}a{{color:#A2B6EC}}}}</style></head>
<body><h1 style="font-size:1.4rem">Research data files</h1>
<p>Tables behind <a href="../">Myanmar Rice Research Intelligence</a>. JSON is the source of truth; CSV files are flat exports
(lists joined with “; ”). Each record keeps its source IDs, confidence and verification status.</p>
<table><thead><tr><th>JSON</th><th>Records</th><th>CSV</th></tr></thead><tbody>
{items}
</tbody></table></body></html>
"""


def audit(text, where, base=None):
    """Fail on references that break on a GitHub Pages sub-path or point at a developer machine.
    `base` (e.g. /Rice-Research-Datasets/) is allowed as an absolute prefix only in 404.html,
    which is served at arbitrary depths and must link back to the site root."""
    probs = []
    allow = (r"(?!" + re.escape(base.lstrip("/")) + r")") if base else ""
    for pat, why in [(r"""(?:src|href)\s*=\s*["']/(?!/)""" + allow, "root-relative src/href"),
                     (r"localhost|127\.0\.0\.1", "localhost reference"),
                     (r"file://", "file:// reference"),
                     (r"/home/claude|/Users/", "developer-machine path")]:
        for m in re.finditer(pat, text):
            ctx = text[max(0, m.start() - 40): m.end() + 40].replace("\n", " ")
            probs.append(f"{where}: {why}: …{ctx}…")
    return probs


def build_site(out_dir, base):
    fragment, obj = bundle_fragment()
    out = pathlib.Path(out_dir)
    if out.exists():
        shutil.rmtree(out)
    (out / "data" / "csv").mkdir(parents=True)
    index = standalone_document(fragment)
    (out / "index.html").write_text(index, encoding="utf-8")
    (out / "404.html").write_text(not_found_page(base), encoding="utf-8")
    rows = []
    for n in TABLES:
        src = ROOT / "data" / f"{n}.json"
        if not src.exists():
            fail(f"missing data/{n}.json")
        shutil.copy2(src, out / "data" / src.name)
        v = json.loads(src.read_text(encoding="utf-8"))
        rows.append((n, len(v) if isinstance(v, (list, dict)) else 1))
    for f in sorted((ROOT / "data" / "csv").glob("*.csv")):
        shutil.copy2(f, out / "data" / "csv" / f.name)
    (out / "data" / "index.html").write_text(data_index(rows), encoding="utf-8")

    # ---- integrity checks: never publish a broken or data-less build ----
    probs = audit(index, "index.html") + audit((out / "404.html").read_text(), "404.html", base) + audit((out / "data" / "index.html").read_text(), "data/index.html")
    if probs:
        fail("\n  " + "\n  ".join(probs[:10]))
    for k in ["studies", "problems", "datasets", "interventions", "benchmarks", "gaps", "projects", "relationships", "claims"]:
        expect = json.loads((ROOT / "data" / f"{k}.json").read_text(encoding="utf-8"))
        got = obj.get(k)
        if not isinstance(got, list) or len(got) != len(expect):
            fail(f"embedded table '{k}' has {len(got) if isinstance(got, list) else 'no'} records; data/{k}.json has {len(expect)}")
    for needle in ["<!doctype html>", '<meta charset="utf-8">', 'name="viewport"', 'lang="en"', "window.RICE_DATA=", "MRRI"]:
        if needle not in index:
            fail(f"index.html is missing {needle!r}")
    kb = len(index.encode()) // 1024
    print(f"_site built: index.html {kb} KB · 404.html · {len(rows)} JSON tables · "
          f"{len(list((out / 'data' / 'csv').glob('*.csv')))} CSV files · base {base}")
    for n, c in rows:
        print(f"  data/{n}.json  {c}")


def build_artifact():
    fragment, _ = bundle_fragment()
    out = ROOT / "out"
    out.mkdir(exist_ok=True)
    (out / "myanmar-rice-research-intelligence.html").write_text(fragment, encoding="utf-8")
    print("artifact bundle KB", len(fragment.encode()) // 1024)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--artifact", action="store_true", help="write the claude.ai artifact fragment to out/")
    ap.add_argument("--out", default=str(ROOT / "_site"), help="site output directory (default _site/)")
    repo = os.environ.get("GITHUB_REPOSITORY", "Wai-999/Rice-Research-Datasets").split("/")[-1]
    ap.add_argument("--base", default=f"/{repo}/", help="URL base path of the Pages site (default /<repo>/)")
    a = ap.parse_args()
    if a.artifact:
        build_artifact()
    else:
        build_site(a.out, a.base if a.base.endswith("/") else a.base + "/")
