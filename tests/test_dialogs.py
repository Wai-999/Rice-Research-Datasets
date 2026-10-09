"""Inspector, filter drawer, export/compare modals and browser history."""
import pytest

ACTIVE_IN = "(sel) => { const a = document.activeElement; return !!a && !!a.closest(sel); }"


def tab_cycle_stays_in(app, sel, n=30, shift=False):
    for _ in range(n):
        app.page.keyboard.press("Shift+Tab" if shift else "Tab")
        if not app.ev(ACTIVE_IN, sel):
            return False
    return True


@pytest.mark.parametrize("w,h", [(1440, 900), (390, 844)])
def test_inspector_is_a_modal_dialog(app_factory, w, h):
    app = app_factory(w=w, h=h, hash_="search")
    app.page.fill("#q", "fertilizer")
    app.page.press("#q", "Enter")
    app.page.wait_for_timeout(300)
    opener = app.page.locator("#cards .card h3 button").first
    opener_id = opener.get_attribute("data-open")
    opener.focus()
    app.page.keyboard.press("Enter")
    app.page.wait_for_timeout(350)
    st = app.ev("""() => { const I = document.querySelector('#insp'); return { role: I.getAttribute('role'), modal: I.getAttribute('aria-modal'),
        labelled: !!document.getElementById(I.getAttribute('aria-labelledby') || 'x'), vis: getComputedStyle(I).visibility, inert: I.inert,
        mainInert: document.querySelector('#main').inert, headerInert: document.querySelector('header.top').inert,
        lock: document.documentElement.classList.contains('lock'), ov: getComputedStyle(document.documentElement).overflow, focus: document.activeElement.id }; }""")
    assert st == {"role": "dialog", "modal": "true", "labelled": True, "vis": "visible", "inert": False, "mainInert": True,
                  "headerInert": True, "lock": True, "ov": "hidden", "focus": "inspClose"}
    # Close button never covers content: header row and body do not intersect
    assert app.ev("document.querySelector('.insp-h').getBoundingClientRect().bottom <= document.querySelector('#inspBody').getBoundingClientRect().top + 0.5")
    assert tab_cycle_stays_in(app, "#insp", 40)
    assert tab_cycle_stays_in(app, "#insp", 15, shift=True)
    # in-dialog navigation keeps focus inside and enables Back
    app.page.locator("#inspBody .rellink").first.click()
    app.page.wait_for_timeout(250)
    assert app.ev(ACTIVE_IN, "#insp") and app.ev("!document.querySelector('#inspBack').hidden")
    app.page.keyboard.press("Escape")
    app.page.wait_for_timeout(350)
    st2 = app.ev("""() => ({ vis: getComputedStyle(document.querySelector('#insp')).visibility, inert: document.querySelector('#insp').inert,
        mainInert: document.querySelector('#main').inert, lock: document.documentElement.classList.contains('lock'),
        focusOpen: document.activeElement.getAttribute('data-open'), hash: location.hash })""")
    assert st2["vis"] == "hidden" and st2["inert"] and not st2["mainInert"] and not st2["lock"]
    assert st2["focusOpen"] == opener_id          # focus restored to the opener
    assert st2["hash"] == "#search"


def test_closed_inspector_and_drawer_are_not_focusable(app_factory):
    app = app_factory(w=390, h=844, hash_="search")
    for _ in range(80):
        app.page.keyboard.press("Tab")
        bad = app.ev("() => { const a = document.activeElement; return !!(a.closest('#insp') || a.closest('#facets')); }")
        assert not bad, "focus reached a hidden off-canvas panel"


def test_scrim_click_closes_and_restores_focus(app_factory):
    app = app_factory(w=1440, h=900, hash_="countries")
    app.page.locator('#v-countries button.cell[data-open="B10"]').first.click()
    app.page.wait_for_timeout(350)
    app.page.mouse.click(50, 450)        # on the scrim, left of the inspector
    app.page.wait_for_timeout(350)
    assert app.ev("!document.querySelector('#insp').classList.contains('open')")
    assert app.ev("document.activeElement.getAttribute('data-open')") == "B10"


@pytest.mark.parametrize("w,h", [(390, 844), (320, 568)])
def test_mobile_filter_drawer(app_factory, w, h):
    app = app_factory(w=w, h=h, hash_="search")
    app.page.click("#openFacets")
    app.page.wait_for_timeout(300)
    st = app.ev("""() => { const f = document.querySelector('#facets'); return { role: f.getAttribute('role'), modal: f.getAttribute('aria-modal'),
        exp: document.querySelector('#openFacets').getAttribute('aria-expanded'), focus: document.activeElement.id, lock: document.documentElement.classList.contains('lock'),
        full: Math.round(f.getBoundingClientRect().width) === innerWidth }; }""")
    assert st == {"role": "dialog", "modal": "true", "exp": "true", "focus": "closeFacets", "lock": True, "full": True}
    assert tab_cycle_stays_in(app, "#facets", 25)
    # toggling a facet keeps focus on that checkbox inside the drawer
    cb = app.page.locator("#facetBody input[type=checkbox]").first
    cb.focus(); app.page.keyboard.press("Space"); app.page.wait_for_timeout(200)
    assert app.ev(ACTIVE_IN, "#facets")
    # sticky "Show results" header stays visible while the drawer scrolls
    app.ev("document.querySelector('#facets').scrollTop = 99999")
    app.page.wait_for_timeout(100)
    assert app.ev("document.querySelector('.facets-close').getBoundingClientRect().top >= -1")
    app.page.keyboard.press("Escape")
    app.page.wait_for_timeout(300)
    assert app.ev("document.activeElement.id") == "openFacets"
    assert app.ev("getComputedStyle(document.querySelector('#facets')).visibility") == "hidden"
    assert app.ev("document.querySelector('#openFacets').getAttribute('aria-expanded')") == "false"


def test_drawer_closes_when_viewport_grows(app_factory):
    app = app_factory(w=390, h=844, hash_="search")
    app.page.click("#openFacets"); app.page.wait_for_timeout(250)
    app.page.set_viewport_size({"width": 1280, "height": 800}); app.page.wait_for_timeout(300)
    st = app.ev("() => ({ open: document.querySelector('#facets').classList.contains('open'), mainInert: document.querySelector('#main').inert, headerInert: document.querySelector('header.top').inert, role: document.querySelector('#facets').getAttribute('role'), lock: document.documentElement.classList.contains('lock') })")
    assert st == {"open": False, "mainInert": False, "headerInert": False, "role": "complementary", "lock": False}


@pytest.mark.parametrize("w,h", [(1440, 900), (390, 844)])
def test_export_modal(app_factory, w, h):
    app = app_factory(w=w, h=h, hash_="search")
    app.page.locator("#expCsv").focus()
    app.page.keyboard.press("Enter")
    app.page.wait_for_selector("#modalHost .modal", timeout=3000)
    app.page.wait_for_timeout(200)
    st = app.ev("""() => { const m = document.querySelector('#modalHost .modal'), box = m.querySelector('.box'), mh = m.querySelector('.mh'), mb = m.querySelector('.mb');
        const r = box.getBoundingClientRect(); return { role: m.getAttribute('role'), modal: m.getAttribute('aria-modal'), title: document.getElementById(m.getAttribute('aria-labelledby')).textContent,
        focus: document.activeElement.id, fits: r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5,
        bodyScrolls: getComputedStyle(mb).overflowY, mainInert: document.querySelector('#main').inert }; }""")
    assert st["role"] == "dialog" and st["modal"] == "true" and st["title"].endswith(".csv")
    assert st["focus"] == "mdlClose" and st["fits"] and st["bodyScrolls"] == "auto" and st["mainInert"]
    if w <= 600:
        assert app.ev("Math.round(document.querySelector('#modalHost .box').getBoundingClientRect().height) >= innerHeight - 1")  # full screen on phones
    app.ev("document.querySelector('#modalHost .mb').scrollTop = 99999")
    assert app.ev("document.querySelector('#modalHost .mh').getBoundingClientRect().top >= -0.5")   # header (Close) stays visible
    assert tab_cycle_stays_in(app, "#modalHost", 12)
    app.page.keyboard.press("Escape"); app.page.wait_for_timeout(150)
    assert app.ev("document.querySelector('#modalHost').innerHTML") == ""
    assert app.ev("document.activeElement.id") == "expCsv"


def test_compare_modal_isolation_and_locations(app_factory):
    app = app_factory(w=1280, h=800)
    app.ev("MRRI.toggleCompare('B10'); MRRI.toggleCompare('S269'); MRRI.toggleCompare('D04')")
    app.page.click("#cmpGo"); app.page.wait_for_timeout(200)
    cols = app.ev("[...document.querySelectorAll('#modalHost thead th')].slice(1).map(t=>t.textContent)")
    assert len(cols) == 3 and "B10" in cols[0]
    loc = app.ev("[...document.querySelectorAll('#modalHost tbody tr')].find(r=>r.querySelector('th').textContent==='Location').querySelectorAll('td')[0].textContent")
    assert loc == "Thailand"
    app.page.keyboard.press("Escape")
    app.ev("MRRI.compare.splice(0); MRRI.toggleCompare('B02')")
    app.page.click("#cmpGo"); app.page.wait_for_timeout(200)
    cols2 = app.ev("[...document.querySelectorAll('#modalHost thead th')].slice(1).map(t=>t.textContent)")
    assert len(cols2) == 1 and "B02" in cols2[0]          # no stale columns from the previous comparison


def test_browser_back_forward_and_deep_links(app_factory):
    app = app_factory(w=1280, h=800, hash_="overview")
    app.page.click('#nav [data-nav="problems"]'); app.page.wait_for_timeout(200)
    app.page.click('#nav [data-nav="datasets"]'); app.page.wait_for_timeout(200)
    app.page.go_back(); app.page.wait_for_timeout(250)
    assert app.ev("MRRI.cur") == "problems" and app.ev("location.hash") == "#problems"
    app.page.go_forward(); app.page.wait_for_timeout(250)
    assert app.ev("MRRI.cur") == "datasets"
    app.page.locator("#v-datasets tr.click").first.click(); app.page.wait_for_timeout(300)
    rid = app.ev("MRRI.curInsp")
    assert app.ev("location.hash") == f"#datasets/{rid}"
    app.page.go_back(); app.page.wait_for_timeout(350)
    assert app.ev("!document.querySelector('#insp').classList.contains('open')") and app.ev("location.hash") == "#datasets"
    app.page.go_forward(); app.page.wait_for_timeout(350)
    assert app.ev("MRRI.curInsp") == rid
    # Close button steps history back instead of leaving a dangling record URL
    app.page.click("#inspClose"); app.page.wait_for_timeout(350)
    assert app.ev("location.hash") == "#datasets" and app.ev("MRRI.cur") == "datasets"


def test_deep_link_opens_record_and_close_stays_in_app(app_factory):
    app = app_factory(w=1280, h=800, hash_="countries/B10")
    app.page.wait_for_timeout(300)
    assert app.ev("MRRI.cur") == "countries" and app.ev("MRRI.curInsp") == "B10"
    app.page.click("#inspClose"); app.page.wait_for_timeout(400)
    assert app.ev("location.hash") == "#countries" and app.ev("MRRI.cur") == "countries"


def test_navigation_from_inspector_lands_focus_in_page(app_factory):
    app = app_factory(w=1280, h=800, hash_="problems")
    app.open_record("P04")
    app.page.locator('#inspBody [data-graph="P04"]').first.click(); app.page.wait_for_timeout(900)
    st = app.ev("() => ({ cur: MRRI.cur, open: document.querySelector('#insp').classList.contains('open'), mainInert: document.querySelector('#main').inert, focus: document.activeElement.id, hash: location.hash })")
    assert st["cur"] == "connections" and not st["open"] and not st["mainInert"] and st["focus"] == "gmode" and st["hash"] == "#connections"
    app.page.go_back(); app.page.wait_for_timeout(350)
    assert app.ev("MRRI.cur") == "problems"


def test_reduced_motion_disables_panel_animation(app_factory):
    app = app_factory(w=1280, h=800, reduced_motion="reduce")
    app.open_record("B10")
    assert app.ev("getComputedStyle(document.querySelector('#insp')).transitionDuration").split(",")[0].strip() in ("0s", "0ms")
