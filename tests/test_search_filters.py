"""Search, filters, tables, graph and links."""
import time
import pytest


def search(app, q, wait=250):
    app.page.fill("#q", q)
    app.page.press("#q", "Enter")
    app.page.wait_for_timeout(wait)
    return app.ev("() => ({ n: +(document.querySelector('#rcount').textContent.match(/^\\d+/) || [0])[0], cards: document.querySelectorAll('#cards .card').length, empty: !!document.querySelector('#cards .empty'), interp: document.querySelector('#interp').textContent })")


def test_search_states(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    total = app.ev("MRRI.DOCS.length")
    r = search(app, "")
    assert r["n"] == total and r["cards"] == 20                                  # empty query = browse everything, paged
    r = search(app, "flood impact on rice yield in Ayeyarwady")
    assert 0 < r["n"] < total and "Ayeyarwady" in r["interp"]
    assert app.ev("document.querySelectorAll('#cards mark').length") > 0
    r = search(app, "fertiliser optimisaton")                                     # British spelling + typo
    assert r["n"] > 0 and "typo" in r["interp"]
    r = search(app, "zzqxv kkkpw")                                                # no results → helpful empty state
    assert r["n"] == 0 and r["empty"]
    app.page.click("#emptyClear"); app.page.wait_for_timeout(200)
    assert app.ev("document.querySelector('#q').value") == "" and app.ev("MRRI.SS.q") == ""
    r = search(app, "မြေဩဇာ ဈေးနှုန်း")                                           # Burmese
    assert r["n"] > 0 and "→" in r["interp"]
    r = search(app, ("rice yield fertilizer labour Ayeyarwady drought price " * 40).strip())   # very long query
    assert r["n"] > 0
    app.page.click("#qclear"); app.page.wait_for_timeout(250)
    assert app.ev("document.querySelector('#q').value") == "" and app.ev("document.activeElement.id") == "q"


def test_search_is_injection_safe_and_highlight_never_breaks_entities(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    search(app, '<img src=x onerror="window.__xss=1"> "quoted phrase" & amp')
    assert app.ev("document.querySelectorAll('#cards img, #interp img, #active img').length") == 0
    assert app.ev("window.__xss") is None
    for q in ["amp", "quot", "lt gt amp"]:
        search(app, q)
        html = app.ev("document.querySelector('#cards').innerHTML")
        assert "&<mark>" not in html and "<mark>amp</mark>;" not in html
    # highlight helper directly: entity-bearing text stays intact
    out = app.ev("MRRI.highlight('Rice & amp; <b>quot</b> \"amp\"', ['amp','quot'])")
    assert out.count("<mark>") == 3 and "&amp; <mark>amp</mark>;" in out and "<b>" not in out


def test_rapid_typing_shows_final_query(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    app.page.click("#q")
    app.page.keyboard.type("drought rainfall dry zone", delay=15)
    app.page.wait_for_timeout(450)
    shown = app.ev("[...document.querySelectorAll('#cards .card')].slice(0,10).map(c=>c.querySelector('h3 button').dataset.open)")
    expect = app.ev("""() => { const r = MRRI.search('drought rainfall dry zone', {dismissed:{}}); return r.results.length; }""")
    assert app.ev("MRRI.SS.q") == "drought rainfall dry zone" and len(shown) == 10 and expect > 0


def test_search_state_persists_across_reload(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    search(app, "mechanization")
    app.page.reload(); app.page.wait_for_function("window.MRRI && MRRI.cur"); app.page.wait_for_timeout(300)
    assert app.ev("document.querySelector('#q').value") == "mechanization"


def test_facet_counts_match_results(app_factory):
    """Selecting one facet value must produce exactly the count that the facet displayed."""
    app = app_factory(w=1280, h=800, hash_="search")
    search(app, "")
    facets = app.ev("[...new Set([...document.querySelectorAll('#facetBody input[data-f]')].map(i=>i.dataset.f))]")
    assert len(facets) >= 5
    checked = 0
    for f in facets:
        opts = app.ev(f"[...document.querySelectorAll('#facetBody input[data-f=\"{f}\"]')].slice(0,3).map(i=>[i.id, +i.closest('label').querySelector('.c').textContent])")
        for cid, cnt in opts:
            if cnt == 0:
                continue
            app.ev(f"document.getElementById('{cid}').click()"); app.page.wait_for_timeout(120)
            n = app.ev("+(document.querySelector('#rcount').textContent.match(/^\\d+/) || [0])[0]")
            assert n == cnt, f"facet {f}:{cid} showed {cnt} but produced {n}"
            chips = app.ev("[...document.querySelectorAll('#active .chip')].map(c=>c.textContent)")
            assert len(chips) == 1
            app.ev(f"document.getElementById('{cid}').click()"); app.page.wait_for_timeout(120)
            checked += 1
    assert checked >= 10


def test_filter_chip_removal_and_clear_all(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    base = search(app, "")["n"]
    ids = app.ev("[...document.querySelectorAll('#facetBody input[data-f]')].filter(i=>+i.closest('label').querySelector('.c').textContent>0).slice(0,1).map(i=>i.id)")
    app.ev(f"document.getElementById('{ids[0]}').click()"); app.page.wait_for_timeout(150)
    app.ev("document.getElementById('yrOn').click()"); app.page.wait_for_timeout(150)
    assert app.ev("document.querySelectorAll('#active .chip').length") == 2
    app.page.locator("#active .chip").first.click(); app.page.wait_for_timeout(150)
    assert app.ev("document.querySelectorAll('#active .chip').length") == 1
    app.page.click("#clearAll"); app.page.wait_for_timeout(150)
    assert app.ev("document.querySelectorAll('#active .chip').length") == 0
    assert app.ev("+(document.querySelector('#rcount').textContent.match(/^\\d+/) || [0])[0]") == base


def test_facet_keyboard_toggle_keeps_focus(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    btn = app.page.locator("#facetBody .facet > button").first
    btn.focus(); app.page.keyboard.press("Enter"); app.page.wait_for_timeout(150)
    assert app.ev("document.activeElement.matches('#facetBody .facet > button')")
    cb = app.page.locator("#facetBody input[type=checkbox]").nth(1)
    cid = cb.get_attribute("id")
    cb.focus(); app.page.keyboard.press("Space"); app.page.wait_for_timeout(150)
    assert app.ev("document.activeElement.id") == cid and app.ev(f"document.getElementById('{cid}').checked")


def test_research_table_sort_and_keyboard_rows(app_factory):
    app = app_factory(w=1280, h=800, hash_="research")
    years = app.ev("[...document.querySelectorAll('#v-research tbody tr')].slice(0,30).map(r=>+r.cells[0].textContent||0)")
    assert years == sorted(years, reverse=True)
    app.page.click('[data-rsort="year"]'); app.page.wait_for_timeout(200)
    years = app.ev("[...document.querySelectorAll('#v-research tbody tr')].slice(0,30).map(r=>+r.cells[0].textContent||0)")
    assert years == sorted(years)
    row = app.page.locator("#v-research tbody tr.click").first
    rid = row.get_attribute("data-open")
    row.focus(); app.page.keyboard.press(" "); app.page.wait_for_timeout(300)
    assert app.ev("MRRI.curInsp") == rid
    app.page.keyboard.press("Escape"); app.page.wait_for_timeout(300)
    assert app.ev("document.activeElement.getAttribute('data-open')") == rid


@pytest.mark.parametrize("w,h", [(1440, 900), (390, 844)])
def test_graph_modes_size_and_controls(app_factory, w, h):
    app = app_factory(w=w, h=h, hash_="connections")
    has_cy = app.ev("typeof cytoscape === 'function'")
    for mode in ["problem", "study", "project", "ego", "citations"]:
        app.ev(f"document.querySelector('#gmode').value='{mode}'; document.querySelector('#gmode').dispatchEvent(new Event('change'))")
        app.page.wait_for_timeout(700)
        st = app.ev("""() => { const c = document.querySelector('#cy').getBoundingClientRect(), g = document.querySelector('.gctl').getBoundingClientRect();
          const ov = Math.min(c.right, g.right) - Math.max(c.left, g.left) > 1 && Math.min(c.bottom, g.bottom) - Math.max(c.top, g.top) > 1;
          return { w: c.width, h: c.height, ov, list: document.querySelectorAll('#glistBody .small').length }; }""")
        assert st["list"] > 0, mode
        if has_cy:
            assert st["w"] > 200 and st["h"] > 300 and not st["ov"], (mode, st)
            assert app.ev("document.querySelectorAll('#cy canvas').length") > 0


def test_graph_follows_container_resize(app_factory):
    app = app_factory(w=1440, h=900, hash_="connections")
    if not app.ev("typeof cytoscape === 'function'"):
        pytest.skip("cytoscape not reachable offline; text fallback covered elsewhere")
    app.page.set_viewport_size({"width": 390, "height": 844}); app.page.wait_for_timeout(600)
    cw, canvas_w = app.ev("[document.querySelector('#cy').clientWidth, document.querySelector('#cy canvas').getBoundingClientRect().width]")
    assert abs(cw - canvas_w) <= 2


def test_external_links_are_safe_and_valid(app_factory):
    app = app_factory(w=1280, h=800)
    bad = []
    for v in ["overview", "research", "datasets", "methodology"]:
        app.go(v)
        bad += app.ev("""[...document.querySelectorAll('#main a[href]')].filter(a => { const h = a.getAttribute('href');
           if (/^(undefined|null|)$/.test(h) || /undefined|null/.test(h)) return true;
           if (/^https?:/.test(h)) return a.target !== '_blank' || !/noopener/.test(a.rel); return false; }).map(a => a.outerHTML.slice(0, 120))""")
    for rid in ["S269", "D04", "B10", "P04"]:
        app.open_record(rid)
        bad += app.ev("""[...document.querySelectorAll('#inspBody a[href]')].filter(a => /undefined|null/.test(a.getAttribute('href')) || (/^https?:/.test(a.getAttribute('href')) && (a.target !== '_blank' || !/noopener/.test(a.rel)))).map(a => a.outerHTML.slice(0,120))""")
    assert not bad, bad[:5]


def test_search_latency(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    times = app.ev("""() => ['flood yield','fertilizer price','mechanization labour','Sentinel Landsat','research gaps data science','မြေဩဇာ'].map(q => { const t = performance.now(); MRRI.search(q, {dismissed:{}}); return performance.now() - t; })""")
    assert max(times) < 250, times
    t = time.time()
    app.page.fill("#q", "rice yield"); app.page.press("#q", "Enter")
    app.page.wait_for_function("MRRI.SS.q === 'rice yield'")
    assert time.time() - t < 2.0
