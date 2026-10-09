"""Layout regression: the reported Neighbour-case overlap, every inspector record, every view at every viewport, stress content."""
import pytest
from conftest import VIEWPORTS, UNUSUAL, VIEWS

B10_LABELS = ["Myanmar problem", "Country", "Intervention", "Period", "Mechanism", "Cost", "Adoption", "Outcome"]

ROW_GEOMETRY_JS = """() => {
  const rows = [...document.querySelectorAll('#inspBody .meta-dl .meta-row')];
  const ink = __audit.ink;
  return rows.map(r => { const dt = r.querySelector('dt'), dd = r.querySelector('dd');
    const rb = r.getBoundingClientRect(), a = ink(dt), b = ink(dd), ddb = dd.getBoundingClientRect(), dtb = dt.getBoundingClientRect();
    return { label: dt.textContent, value: dd.textContent, top: rb.top, bottom: rb.bottom,
      dtW: dtb.width, dtClipped: dt.scrollWidth > dt.clientWidth + 1, ddClipped: dd.scrollWidth > dd.clientWidth + 1,
      inkOverlapX: Math.min(a.right, b.right) - Math.max(a.left, b.left), inkOverlapY: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
      ddLeft: ddb.left, dtRight: dtb.right, ddTop: ddb.top, dtBottom: dtb.bottom }; });
}"""


@pytest.mark.parametrize("w,h", VIEWPORTS + UNUSUAL)
def test_thailand_b10_metadata_rows_never_overlap(app_factory, w, h):
    """BUG-001 regression: Neighbour case B10 (Thailand) label/value rows."""
    app = app_factory(w=w, h=h, hash_="countries")
    app.page.click('#v-countries button.cell[data-open="B10"]')
    app.page.wait_for_timeout(350)
    assert app.ev("document.querySelector('#inspType').textContent").startswith("Neighbour case")
    rows = app.ev(ROW_GEOMETRY_JS)
    assert [r["label"] for r in rows] == B10_LABELS
    vals = {r["label"]: r["value"] for r in rows}
    assert vals["Country"] == "Thailand"          # Thailand must never be presented as Myanmar
    assert "Myanmar" not in vals["Country"]
    assert "Thai Rice NAMA" in vals["Intervention"]
    assert vals["Period"] == "2018-2024"
    for prev, nxt in zip(rows, rows[1:]):
        assert prev["bottom"] <= nxt["top"] + 0.5, f"row {prev['label']} overlaps {nxt['label']}"
    for r in rows:
        assert r["dtW"] > 20, f"label track collapsed for {r['label']}"
        assert not r["dtClipped"] and not r["ddClipped"], r
        assert r["inkOverlapX"] <= 1 or r["inkOverlapY"] <= 1, f"label and value paint over each other in {r['label']}"
        stacked = r["ddTop"] >= r["dtBottom"] - 0.5
        side = r["ddLeft"] >= r["dtRight"] - 0.5
        assert stacked or side
    # wide inspector → two columns, phone → stacked
    if w >= 1024:
        assert all(r["ddLeft"] >= r["dtRight"] for r in rows)
    if w <= 430:
        assert all(r["ddTop"] >= r["dtBottom"] - 0.5 for r in rows)


@pytest.mark.parametrize("w", [320, 390, 768, 1440])
def test_every_record_in_inspector_is_clean(app_factory, w):
    app = app_factory(w=w, h=900)
    bad = app.ev("""() => { const out = {};
      MRRI.DOCS.forEach(d => { MRRI.openInsp(d.id, false); const b = document.querySelector('#inspBody');
        const n = __audit.overlaps(b).concat(__audit.collapsed(b), __audit.spills(b), __audit.ellipsized(b));
        if (n.length) out[d.id] = n.slice(0, 2); });
      return out; }""")
    assert not bad, f"{len(bad)} records with layout defects, e.g. {list(bad.items())[:3]}"


@pytest.mark.parametrize("w,h", VIEWPORTS + UNUSUAL)
def test_views_have_no_overlap_or_horizontal_scroll(app_factory, w, h):
    app = app_factory(w=w, h=h)
    problems = {}
    for v in VIEWS:
        app.go(v)
        r = app.ev("""() => { const m = document.querySelector('#main'), hd = document.querySelector('header.top');
          return { pov: __audit.pageOverflow(), d: __audit.overlaps(m).concat(__audit.overlaps(hd), __audit.collapsed(m), __audit.spills(m), __audit.spills(hd), __audit.ellipsized(m)) }; }""")
        if r["pov"] > 0 or r["d"]:
            problems[v] = r
    assert not problems, problems


@pytest.mark.parametrize("w,h", [(320, 568), (390, 844), (768, 1024), (1440, 900)])
def test_stress_content(app_factory, w, h):
    app = app_factory(w=w, h=h, stress=True)
    assert app.ev("MRRI.BY.B10.rec.impact.length") == 12
    for rid in ["B10", "B11", "S269", "P04", "D04", "I04"]:
        app.open_record(rid)
        r = app.ev("""() => { const b = document.querySelector('#inspBody'); const rows = [...b.querySelectorAll('.meta-row')]; let seq = 0;
          for (let i = 1; i < rows.length; i++) if (rows[i-1].getBoundingClientRect().bottom > rows[i].getBoundingClientRect().top + 0.5) seq++;
          return { d: __audit.overlaps(b).concat(__audit.collapsed(b), __audit.spills(b), __audit.ellipsized(b)), seq, pov: __audit.pageOverflow(), text: b.textContent }; }""")
        assert not r["d"] and r["seq"] == 0 and r["pov"] <= 0, (rid, r["d"][:3])
        if rid == "B10":
            assert r["text"].count("Outcome 12:") == 1                       # 10+ outcomes all rendered, once
            assert app.ev("window.__STRESS.URL") in r["text"]                 # long URL fully present (not truncated)
            assert app.ev("document.querySelectorAll('#inspBody .meta-row').length") == 8
        if rid == "B11":
            assert app.ev("document.querySelectorAll('#inspBody dd.empty-val').length") >= 2   # missing → 'Not recorded'
        if rid == "S269":
            assert app.ev("window.__STRESS.MY") in r["text"]                  # Burmese preserved
    app.ev("MRRI.closeInsp('nav')")
    for v in VIEWS:
        app.go(v)
        r = app.ev("() => ({ pov: __audit.pageOverflow(), d: __audit.overlaps(document.querySelector('#main')).concat(__audit.spills(document.querySelector('#main'))) })")
        assert r["pov"] <= 0 and not r["d"], (v, r["d"][:3])


def test_multi_paragraph_values_keep_paragraph_breaks(app_factory):
    app = app_factory(w=1440, h=900, stress=True)
    app.open_record("B10")
    ws = app.ev("getComputedStyle([...document.querySelectorAll('#inspBody .meta-row')].find(r=>r.querySelector('dt').textContent==='Mechanism').querySelector('dd')).whiteSpace")
    assert ws == "pre-line"


def test_many_filters_wrap_without_overflow(app_factory):
    app = app_factory(w=390, h=844, stress=True)
    app.go("search")
    app.page.click("#openFacets")
    app.page.wait_for_timeout(250)
    for i in range(12):
        app.page.evaluate("i=>{const c=[...document.querySelectorAll('#facetBody input[type=checkbox]:not(:checked)')].filter(x=>!x.closest('label').classList.contains('zero'));if(c.length)c[Math.min(i,c.length-1)].click()}", i)
        app.page.wait_for_timeout(100)
    app.page.click("#closeFacets")
    app.page.wait_for_timeout(250)
    chips = app.ev("[...document.querySelectorAll('#active .chip')].map(c=>c.textContent)")
    assert len(chips) >= 10 and len(chips) == len(set(chips))           # no duplicate chips
    r = app.ev("() => ({ pov: __audit.pageOverflow(), d: __audit.spills(document.querySelector('#v-search')).concat(__audit.overlaps(document.querySelector('#active'))) })")
    assert r["pov"] <= 0 and not r["d"]


@pytest.mark.parametrize("w,h", [(320, 568), (390, 844)])
def test_phone_filter_inputs_are_usable(app_factory, w, h):
    """BUG: toolbar filter inputs were squeezed to ~40px on phones (placeholder unreadable)."""
    app = app_factory(w=w, h=h)
    for v, sel in [("research", "#rq"), ("datasets", "#dq")]:
        app.go(v)
        assert app.ev(f"document.querySelector('{sel}').getBoundingClientRect().width") >= 0.5 * (w - 32), v
    app.go("search")
    # the native cancel "x" is suppressed so our own Clear button is the single clear control
    assert app.ev("[...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(r => (r.selectorText || '').includes('.searchbox input::-webkit-search-cancel-button') && r.style.display === 'none'); } catch (e) { return false; } })")


def test_summaries_are_clipped_at_word_boundaries(app_factory):
    """BUG: card/table summaries were cut mid-word without an ellipsis (e.g. 'Performance S')."""
    app = app_factory(w=1440, h=900, hash_="search")
    app.page.fill("#q", "MAPS phone panel profitability"); app.page.press("#q", "Enter"); app.page.wait_for_timeout(300)
    chips = app.ev("[...document.querySelectorAll('#cards .kv button.chip[data-open=\"D04\"]')].map(c => c.textContent)")
    assert chips and all(c.endswith("Survey") for c in chips), chips
    clip = app.ev("[MRRI.clip('alpha beta gamma delta epsilon', 14), MRRI.clip('short', 14)]")
    assert clip == ["alpha beta…", "short"]
    app.go("research")
    rows = app.ev("[...document.querySelectorAll('#v-research tbody tr')].map(r => [r.dataset.open, r.querySelector('td[data-l=Title] .xs').textContent])")
    for rid, shown in rows:
        full = app.ev(f"MRRI.BY['{rid}'].rec.objective || 'Objective not available'")
        assert shown == full if len(full) <= 220 else (shown.endswith("…") and full.startswith(shown[:-1].rstrip()))


@pytest.mark.parametrize("w,h", [(320, 568), (390, 844), (768, 1024)])
def test_toolbar_labels_stay_beside_their_controls(app_factory, w, h):
    """BUG: on phones a toolbar label wrapped to the end of the previous line, away from its select."""
    app = app_factory(w=w, h=h)
    for v in ["problems", "research", "datasets", "countries", "projects"]:
        app.go(v)
        bad = app.ev("""[...document.querySelectorAll('#v-%s .toolbar label[for]')].filter(l => { const c = document.getElementById(l.htmlFor); if (!c || c.type === 'search') return false;
            const a = l.getBoundingClientRect(), b = c.getBoundingClientRect(); const midA = (a.top + a.bottom) / 2;
            return !(midA >= b.top && midA <= b.bottom && a.right <= b.left + 1 && b.left - a.right < 16); }).map(l => l.textContent)""" % v)
        assert not bad, (v, bad)


@pytest.mark.parametrize("w,h", [(1440, 900), (390, 844)])
def test_scroll_targets_land_below_sticky_header(app_factory, w, h):
    """BUG: project detail scrolled under the sticky header; filter column used a hard-coded 110px offset."""
    app = app_factory(w=w, h=h, hash_="projects")
    app.page.locator("#v-projects tr[data-psel]").nth(3).click()
    app.page.wait_for_timeout(900)
    hdr, top = app.ev("[document.querySelector('header.top').getBoundingClientRect().bottom, document.querySelector('#pdetail').getBoundingClientRect().top]")
    assert top >= hdr - 1, (hdr, top)
    assert app.ev("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'))") == pytest.approx(app.ev("document.querySelector('header.top').getBoundingClientRect().height"), abs=1)


@pytest.mark.parametrize("w", [1280, 1920, 2560])
def test_card_text_keeps_a_readable_measure_on_wide_screens(app_factory, w):
    """Production QA: at 1920px card text ran to ~244 characters per line; it is now capped at the 1280px measure."""
    app = app_factory(w=w, h=900, hash_="search")
    longest = app.ev("""(() => { let best = 0; document.querySelectorAll('#cards .card .kv > span:not(.k)').forEach(s => { const rg = document.createRange(); rg.selectNodeContents(s);
        best = Math.max(best, s.textContent.length / Math.max(1, [...rg.getClientRects()].filter(x => x.width > 40).length)); }); return best; })()""")
    assert longest <= 155, f"{longest:.0f} characters per line at {w}px"
    assert app.ev("document.querySelector('#cards .card').getBoundingClientRect().width") > 0.6 * (w - 300)   # cards still use the column
