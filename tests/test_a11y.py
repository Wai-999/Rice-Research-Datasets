"""Accessibility: landmarks, names, ids, language, contrast (light + dark), focus visibility."""
import pytest
from conftest import VIEWS

CONTRAST_JS = r"""() => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0,0,0,0]; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); if (!a) return [0,0,0,0]; return [0,1,2].map(i => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat([a]); };
  const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const b = parse(getComputedStyle(e).backgroundColor); if (b[3] > 0) layers.push(b); if (b[3] >= 1) break; }
    let c = parse(getComputedStyle(document.body).backgroundColor); if (c[3] < 1) c = [255,255,255,1];
    for (let i = layers.length - 1; i >= 0; i--) c = over(layers[i], c); return c; };
  const opac = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const out = [], seen = new Set();
  document.querySelectorAll('#main *, header.top *, #insp.open *').forEach(el => {
    if (el.closest('svg') || el.closest('.sr') || el.closest('[aria-hidden="true"]') || el.disabled) return;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
    let fg = parse(cs.color); const bg = bgOf(el); fg = over([fg[0], fg[1], fg[2], fg[3] * opac(el)], bg);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5)) { const k = el.tagName + '.' + el.className + cs.color + bg.join(); if (!seen.has(k)) { seen.add(k); out.push({ el: el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 30), text: el.textContent.trim().slice(0, 30), ratio: Math.round(ratio * 100) / 100, color: cs.color }); } }
  });
  return out;
}"""


def test_landmarks_language_and_ids(app_factory):
    app = app_factory(w=1280, h=800)
    st = app.ev("""() => ({ lang: document.documentElement.lang, banner: !!document.querySelector('header[role=banner], header.top'), nav: !!document.querySelector('nav[aria-label]'),
        main: !!document.querySelector('main#main'), title: document.title, my: [...document.querySelectorAll('[lang=my]')].length })""")
    assert st["lang"] == "en" and st["banner"] and st["nav"] and st["main"] and st["title"] and st["my"] >= 1
    for v in VIEWS:
        app.go(v)
        dups = app.ev("(() => { const c = {}; document.querySelectorAll('[id]').forEach(e => c[e.id] = (c[e.id] || 0) + 1); return Object.keys(c).filter(k => c[k] > 1); })()")
        assert not dups, (v, dups)


@pytest.mark.parametrize("w", [1280, 390])
def test_every_control_has_an_accessible_name(app_factory, w):
    app = app_factory(w=w, h=800)
    js = """() => [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], summary')].filter(e => {
        if (e.closest('[inert]') || getComputedStyle(e).visibility === 'hidden' || !e.getClientRects().length) return false;
        const name = (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.textContent || (e.labels && [...e.labels].map(l => l.textContent).join(' ')) || e.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || '').trim();
        return !name; }).map(e => e.outerHTML.slice(0, 100))"""
    for v in VIEWS:
        app.go(v)
        assert not app.ev(js), v
    app.open_record("B10")
    assert not app.ev(js)


@pytest.mark.parametrize("scheme", ["light", "dark"])
def test_text_contrast_meets_wcag_aa(app_factory, scheme):
    app = app_factory(w=1280, h=900, color_scheme=scheme)
    fails = {}
    for v in VIEWS:
        app.go(v)
        f = app.ev(CONTRAST_JS)
        if f:
            fails[v] = f[:6]
    for rid in ["B10", "S269", "D04", "P04", "PR01"]:
        app.open_record(rid)
        f = app.ev(CONTRAST_JS)
        if f:
            fails[rid] = f[:6]
        app.ev("MRRI.closeInsp('nav')")
    assert not fails, fails


def test_focus_indicator_is_visible(app_factory):
    app = app_factory(w=1280, h=800, hash_="search")
    for _ in range(6):
        app.page.keyboard.press("Tab")
    st = app.ev("(() => { const cs = getComputedStyle(document.activeElement); return { w: parseFloat(cs.outlineWidth), style: cs.outlineStyle }; })()")
    assert st["w"] >= 2 and st["style"] != "none"


def test_status_is_never_color_only(app_factory):
    app = app_factory(w=1280, h=800, hash_="countries")
    cells = app.ev("[...document.querySelectorAll('#v-countries .cell')].map(c => [c.getAttribute('aria-label'), c.textContent])")
    assert cells and all(lbl and ("transferable" in lbl.lower() or "difficult" in lbl.lower() or "not suitable" in lbl.lower()) for lbl, _ in cells)
    assert all(any(g in t for g in "✓~!×") for _, t in cells)
    app.go("problems")
    pills = app.ev("[...document.querySelectorAll('#v-problems .pill')].map(p => p.textContent)")
    assert pills and all(p[0] in "ABCDE" for p in pills)
