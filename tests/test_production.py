"""Production / GitHub Pages checks: document shell, real mobile emulation, data completeness,
network health on the sub-path, hash routing across reloads, and 404.html pretty-path redirects."""
import json
import os
import urllib.parse
import pytest
from conftest import ROOT, VIEWS, url, served, base_url

TABLES = {"studies": 319, "problems": 19, "datasets": 36, "interventions": 22, "benchmarks": 14,
          "gaps": 12, "projects": 17, "relationships": 1558, "claims": 138}
EXTERNAL_OK = {"fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"}
STRICT = os.environ.get("MRRI_STRICT_NET") == "1"


def test_document_shell_is_standards_mode_and_described(app_factory):
    app = app_factory(w=1280, h=800)
    st = app.ev("""() => ({ mode: document.compatMode, charset: document.characterSet, lang: document.documentElement.lang,
        viewport: (document.querySelector('meta[name=viewport]') || {}).content || '', desc: !!document.querySelector('meta[name=description]'),
        icon: ((document.querySelector('link[rel=icon]') || {}).href || '').slice(0, 15), title: document.title })""")
    if served() or app.page.url.split("#")[0].endswith("index.html"):   # the artifact fragment has no shell by design
        assert st["mode"] == "CSS1Compat", "page must render in standards mode (missing <!doctype html>)"
        assert st["charset"] == "UTF-8" and "width=device-width" in st["viewport"] and st["desc"]
        assert st["icon"].startswith("data:image/svg")      # no /favicon.ico request at the domain root
    assert st["lang"] == "en" and "Myanmar Rice Research Intelligence" in st["title"]


@pytest.mark.parametrize("w,h", [(390, 844), (430, 932)])
def test_real_mobile_device_emulation(browser, w, h):
    """is_mobile honours <meta name=viewport>; without it phones lay the page out ~980px wide."""
    ctx = browser.new_context(viewport={"width": w, "height": h}, is_mobile=True, has_touch=True, device_scale_factor=3)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        page.goto(url("countries"))
        page.wait_for_function("window.MRRI && MRRI.cur")
        page.wait_for_timeout(400)
        st = page.evaluate("() => ({ iw: innerWidth, sw: document.documentElement.scrollWidth })")
        assert st["iw"] == w, f"layout viewport is {st['iw']}px on a {w}px phone (viewport meta not applied)"
        assert st["sw"] <= w, f"horizontal overflow: {st['sw']}px"
        page.locator('#v-countries button.cell[data-open="B10"]').first.tap()
        page.wait_for_timeout(450)
        rows = page.evaluate("""[...document.querySelectorAll('#inspBody .meta-row')].map(r => { const a = r.getBoundingClientRect(), dt = r.querySelector('dt').getBoundingClientRect(), dd = r.querySelector('dd').getBoundingClientRect();
            return { label: r.querySelector('dt').textContent, top: a.top, bottom: a.bottom, stacked: dd.top >= dt.bottom - 0.5, ddw: dd.width }; })""")
        assert [r["label"] for r in rows][:2] == ["Myanmar problem", "Country"] and len(rows) == 8
        assert all(r["stacked"] and r["ddw"] > 200 for r in rows)
        assert all(a["bottom"] <= b["top"] + 0.5 for a, b in zip(rows, rows[1:]))
        page.locator("#inspClose").tap()
        page.wait_for_timeout(350)
        page.evaluate("MRRI.go('search')")
        page.locator("#openFacets").tap()
        page.wait_for_timeout(300)
        assert page.evaluate("document.querySelector('#facets').getBoundingClientRect().width") == w
        page.locator("#closeFacets").tap()
        assert not errors
    finally:
        ctx.close()


def test_research_database_is_complete(app_factory):
    app = app_factory(w=1280, h=800)
    got = app.ev("(" + json.dumps(list(TABLES)) + ").reduce((o, k) => (o[k] = (MRRI.D[k] || []).length, o), {})")
    assert got == TABLES
    for k, n in TABLES.items():                                   # the repo's published files agree with the app
        assert len(json.loads((ROOT / "data" / f"{k}.json").read_text(encoding="utf-8"))) == n
    assert app.ev("MRRI.DOCS.length") == 439
    if served():                                                   # and the published files are reachable on the sub-path
        res = app.ev("""async (names) => { const out = {}; for (const n of names) { const r = await fetch('data/' + n + '.json'); out[n] = [r.status, r.headers.get('content-type'), (await r.json()).length]; }
            const c = await fetch('data/csv/studies.csv'); out.csv = [c.status, c.headers.get('content-type'), (await c.text()).split('\\n').length]; return out; }""", list(TABLES))
        for k, n in TABLES.items():
            assert res[k][0] == 200 and "json" in res[k][1] and res[k][2] == n, (k, res[k])
        assert res["csv"][0] == 200 and res["csv"][2] >= 320


def test_network_is_clean_on_the_sub_path(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    reqs, bad = [], []
    page.on("request", lambda r: reqs.append(r.url))
    page.on("response", lambda r: bad.append((r.status, r.url)) if r.status >= 400 else None)
    page.on("requestfailed", lambda r: bad.append(("failed", r.url)))
    try:
        page.goto(url())
        page.wait_for_function("window.MRRI && MRRI.cur")
        for v in VIEWS:
            page.evaluate(f"MRRI.go('{v}', true)")
            page.wait_for_timeout(700 if v == "connections" else 150)
        page.evaluate("MRRI.openInsp('B10')")
        page.wait_for_timeout(300)
    finally:
        ctx.close()
    origin = urllib.parse.urlsplit(page.url)
    for u in reqs:
        p = urllib.parse.urlsplit(u)
        if p.scheme in ("data", "blob"):
            continue
        same = (p.scheme, p.netloc) == (origin.scheme, origin.netloc)
        assert same or p.netloc in EXTERNAL_OK, f"unexpected request to {u}"
        if served() and same:
            assert p.path.startswith(urllib.parse.urlsplit(base_url()).path), f"request escapes the Pages base path: {u}"
        assert "localhost" not in p.netloc or same
    own = [b for b in bad if urllib.parse.urlsplit(str(b[1])).netloc in ("", origin.netloc)]
    assert not own, own
    if STRICT:
        assert not bad, bad


@pytest.mark.parametrize("hash_,view,record", [("projects", "projects", None), ("countries/B10", "countries", "B10"), ("research/S269", "research", "S269")])
def test_reload_keeps_route(app_factory, hash_, view, record):
    app = app_factory(w=1280, h=800, hash_=hash_)
    for _ in range(2):
        assert app.ev("MRRI.cur") == view and app.ev("MRRI.curInsp") == record
        app.page.reload()
        app.page.wait_for_function("window.MRRI && MRRI.cur")
        app.page.wait_for_timeout(300)


def test_every_view_reachable_from_navigation(app_factory):
    app = app_factory(w=1280, h=800)
    for v in VIEWS:
        app.page.click(f'#nav [data-nav="{v}"]')
        app.page.wait_for_timeout(700 if v == "connections" else 150)
        st = app.ev("() => ({ cur: MRRI.cur, hash: location.hash, txt: document.querySelector('#v-' + MRRI.cur).textContent.length, hidden: document.querySelector('#v-' + MRRI.cur).hidden })")
        assert st["cur"] == v and st["hash"] == "#" + v and st["txt"] > 100 and not st["hidden"], st


@pytest.mark.skipif(not (os.environ.get("MRRI_SITE_DIR") or os.environ.get("MRRI_BASE_URL")), reason="needs the site served (404.html behaviour)")
@pytest.mark.parametrize("path,view,record", [("countries", "countries", None), ("countries/b10", "countries", "B10"), ("Datasets/", "datasets", None),
                                              ("no-such-page", "overview", None), ("projects/PR01", "projects", "PR01")])
def test_pretty_paths_redirect_through_404(browser, path, view, record):
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    try:
        resp = page.goto(base_url() + path)
        assert resp.status == 404                               # GitHub Pages serves 404.html with status 404
        page.wait_for_function("window.MRRI && MRRI.cur", timeout=15000)
        page.wait_for_timeout(300)
        assert page.evaluate("MRRI.cur") == view and page.evaluate("MRRI.curInsp") == record
        assert urllib.parse.urlsplit(page.url).path == urllib.parse.urlsplit(base_url()).path
    finally:
        ctx.close()


@pytest.mark.skipif(not (os.environ.get("MRRI_SITE_DIR") or os.environ.get("MRRI_BASE_URL")), reason="needs the site served")
def test_data_index_page_lists_published_files(browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    try:
        resp = page.goto(base_url() + "data/")
        assert resp.status == 200
        links = page.evaluate("[...document.querySelectorAll('a[href$=\".json\"], a[href$=\".csv\"]')].map(a => a.href)")
        assert len(links) >= 18
        for href in links[:4] + links[-2:]:
            r = page.request.get(href)
            assert r.status == 200 and len(r.body()) > 100, href
    finally:
        ctx.close()


def test_source_links_are_well_formed(app_factory):
    app = app_factory(w=1280, h=800)
    hrefs = []
    for rid in ["S269", "S302", "S267", "D04", "D13", "S076"]:
        app.open_record(rid)
        hrefs += app.ev("[...document.querySelectorAll('#inspBody a[href^=\"http\"]')].map(a => [a.href, a.target, a.rel])")
    assert len(hrefs) >= 6
    for h, target, rel in hrefs:
        p = urllib.parse.urlsplit(h)
        assert p.scheme == "https" or p.scheme == "http", h
        assert p.netloc and "." in p.netloc and target == "_blank" and "noopener" in rel, h
