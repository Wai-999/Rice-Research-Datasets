"""Screenshot regression pass: key screens at desktop and phone size (light + one dark inspector).
Usage: python tests/screenshots.py [out_dir]   → PNGs plus contact sheets (desktop.png / mobile.png)."""
import pathlib
import sys
from playwright.sync_api import sync_playwright
from conftest import url

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent / "screens")
OUT.mkdir(parents=True, exist_ok=True)
SCREENS = [
    ("overview", "overview", None),
    ("search", "search", "flood impact on rice yield in Ayeyarwady"),
    ("problems", "problems", None),
    ("research", "research", None),
    ("datasets", "datasets", None),
    ("neighbour-detail-B10", "countries/B10", None),
    ("implementation", "implementation", None),
    ("connections", "connections", None),
    ("projects", "projects", None),
]
SIZES = {"desktop": (1440, 900), "mobile": (390, 844)}

with sync_playwright() as p:
    b = p.chromium.launch()
    shots = {}
    for size, (w, h) in SIZES.items():
        for name, hash_, q in SCREENS:
            ctx = b.new_context(viewport={"width": w, "height": h})
            pg = ctx.new_page()
            pg.goto(url(hash_))
            pg.wait_for_function("window.MRRI && MRRI.cur")
            if q:
                pg.fill("#q", q); pg.press("#q", "Enter")
            pg.wait_for_timeout(1200 if "connections" in hash_ else 600)
            f = OUT / f"{size}-{name}.png"
            pg.screenshot(path=str(f))
            shots.setdefault(size, []).append(f)
            ctx.close()
        ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme="dark")
        pg = ctx.new_page(); pg.goto(url("countries/B10")); pg.wait_for_function("window.MRRI && MRRI.cur"); pg.wait_for_timeout(600)
        f = OUT / f"{size}-neighbour-detail-B10-dark.png"; pg.screenshot(path=str(f)); shots[size].append(f); ctx.close()
    b.close()

try:
    from PIL import Image, ImageDraw
    for size, files in shots.items():
        ims = [Image.open(f) for f in files]
        scale = 0.32 if size == "desktop" else 0.5
        th = [im.resize((int(im.width * scale), int(im.height * scale))) for im in ims]
        cols = 5
        cw, ch = th[0].width, th[0].height + 18
        sheet = Image.new("RGB", (cols * (cw + 8), ((len(th) + cols - 1) // cols) * (ch + 8)), "white")
        d = ImageDraw.Draw(sheet)
        for i, (im, f) in enumerate(zip(th, files)):
            x, y = (i % cols) * (cw + 8), (i // cols) * (ch + 8)
            sheet.paste(im, (x, y + 18)); d.text((x + 2, y + 2), f.stem, fill="black")
        sheet.save(OUT / f"{size}.png")
except ImportError:
    pass
print("screens written to", OUT)
