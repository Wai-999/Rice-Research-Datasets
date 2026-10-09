"""Shared fixtures for the Myanmar Rice Research Intelligence UI regression suite.

Run against the built GitHub Pages site, served like Pages under /Rice-Research-Datasets/ (preferred):
    python scripts/build_site.py && MRRI_SITE_DIR=_site python -m pytest tests -q
Run against a single HTML file over file:// (artifact bundle or a downloaded copy):
    MRRI_HTML=/path/to/myanmar-rice-research-intelligence.html python -m pytest tests -q
Run against the live deployment (read-only checks work the same way):
    MRRI_BASE_URL=https://wai-999.github.io/Rice-Research-Datasets/ python -m pytest tests -q
Uses Playwright's Chromium. Firefox/WebKit run too if installed: MRRI_BROWSERS=chromium,firefox,webkit
"""
import os
import pathlib
import pytest
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SITE_DIR = os.environ.get("MRRI_SITE_DIR", "")
BASE_PATH = os.environ.get("MRRI_BASE_PATH", "/Rice-Research-Datasets/")
_base_url = os.environ.get("MRRI_BASE_URL", "")
CANDIDATES = [
    os.environ.get("MRRI_HTML", ""),
    HERE.parent / "_site" / "index.html",
    HERE.parent / "out" / "myanmar-rice-research-intelligence.html",
    HERE.parent / "myanmar-rice-research-intelligence.html",
    HERE.parent.parent / "myanmar-rice-research-intelligence.html",
]
HTML = next((pathlib.Path(c) for c in CANDIDATES if c and pathlib.Path(c).exists()), None)
AUDIT_JS = (HERE / "audit_lib.js").read_text()
STRESS_JS = (HERE / "stress_fixtures.js").read_text()

VIEWPORTS = [(320, 568), (360, 800), (390, 844), (430, 932), (768, 1024), (1024, 768), (1280, 800), (1440, 900), (1920, 1080)]
UNUSUAL = [(1280, 500), (390, 500), (1024, 640), (853, 533), (640, 400)]  # short screens + 125/150/200% zoom of 1280x800
VIEWS = ["overview", "search", "problems", "research", "datasets", "implementation", "connections", "countries", "gaps", "projects", "methodology"]


def served():
    """True when tests run over HTTP (local Pages-like server or the live site)."""
    return bool(_base_url)


def base_url():
    return _base_url


def url(hash_=""):
    if _base_url:
        return _base_url + (("#" + hash_) if hash_ else "")
    assert HTML, "No build found: run scripts/build_site.py, or set MRRI_SITE_DIR / MRRI_HTML / MRRI_BASE_URL"
    return HTML.as_uri() + (("#" + hash_) if hash_ else "")


@pytest.fixture(scope="session", autouse=True)
def pages_site():
    """Serve MRRI_SITE_DIR like GitHub Pages (base path + 404.html) for the whole session."""
    global _base_url
    if not SITE_DIR or os.environ.get("MRRI_BASE_URL"):
        yield _base_url
        return
    import pages_server
    srv, _base_url = pages_server.start(SITE_DIR, BASE_PATH)
    yield _base_url
    srv.shutdown()


def browser_names():
    return [b.strip() for b in os.environ.get("MRRI_BROWSERS", "chromium").split(",") if b.strip()]


@pytest.fixture(scope="session")
def pw():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session", params=browser_names())
def browser(pw, request):
    bt = getattr(pw, request.param)
    try:
        b = bt.launch()
    except Exception as e:  # browser not installed in this environment
        pytest.skip(f"{request.param} not available: {e}")
    yield b
    b.close()


class App:
    """Thin page wrapper: loads the app, injects the geometry audit library, records console errors."""

    def __init__(self, browser, w=1440, h=900, stress=False, hash_="", reduced_motion=None, color_scheme=None):
        ctx_args = {"viewport": {"width": w, "height": h}}
        if reduced_motion:
            ctx_args["reduced_motion"] = reduced_motion
        if color_scheme:
            ctx_args["color_scheme"] = color_scheme
        self.ctx = browser.new_context(**ctx_args)
        self.page = self.ctx.new_page()
        self.errors = []
        self.page.on("console", lambda m: self.errors.append(m.text) if m.type == "error" else None)
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        if stress:
            self.page.add_init_script(STRESS_JS)
        self.page.add_init_script(AUDIT_JS)
        self.page.goto(url(hash_))
        self.page.wait_for_function("window.MRRI && MRRI.cur")
        self.page.wait_for_timeout(300)

    def ev(self, js, arg=None):
        return self.page.evaluate(js, arg) if arg is not None else self.page.evaluate(js)

    def go(self, v):
        self.ev(f"MRRI.go('{v}', true)")
        self.page.wait_for_timeout(900 if v == "connections" else 250)

    def open_record(self, rid):
        self.ev(f"MRRI.openInsp('{rid}')")
        self.page.wait_for_timeout(320)

    def close(self):
        self.ctx.close()


@pytest.fixture
def app_factory(browser):
    made = []

    def make(**kw):
        a = App(browser, **kw)
        made.append(a)
        return a

    yield make
    for a in made:
        strict = os.environ.get("MRRI_STRICT_NET") == "1"   # CI / live: external resources must load too
        errs = [e for e in a.errors if strict or ("fonts.g" not in e and "net::ERR" not in e and "Failed to load resource" not in e)]
        a.close()
        assert not errs, f"console/page errors: {errs[:5]}"
