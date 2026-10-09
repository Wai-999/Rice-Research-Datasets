import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
import asyncio, json, sys
from playwright.async_api import async_playwright
URL="file://" + ROOT_DIR + "/out/myanmar-rice-research-intelligence.html"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={"width":1440,"height":900})
        errs=[]
        pg.on("console", lambda m: errs.append(("console."+m.type, m.text)) if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append(("pageerror", str(e))))
        await pg.goto(URL, wait_until="networkidle")
        for v in ["overview","search","problems","research","datasets","implementation","connections","countries","gaps","projects","methodology"]:
            await pg.evaluate(f"MRRI.go('{v}')")
            await pg.wait_for_timeout(400)
            txt=await pg.evaluate(f"document.querySelector('#v-{v}').innerText.length")
            failed=await pg.evaluate(f"document.querySelector('#v-{v}').innerText.indexOf('failed to render')>=0")
            print(v, txt, "FAILED" if failed else "")
            await pg.screenshot(path=ROOT_DIR + f"/shots/d-{v}.png", full_page=False)
        print("ERRORS:", errs[:20])
        await b.close()
asyncio.run(main())
