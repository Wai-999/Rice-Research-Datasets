import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
import asyncio, json
from playwright.async_api import async_playwright
URL="file://" + ROOT_DIR + "/out/myanmar-rice-research-intelligence.html"
QS=["What causes rice yield loss in Myanmar?","Show studies about labor shortages after 2015","Find research that actually reached farmers","Show proposed solutions that never scaled","What datasets can measure rainfall and rice yield?","Show studies using Sentinel or Landsat","Find research in Ayeyarwady","Show monthly datasets related to rice agriculture","Find optimization studies","How has Vietnam reduced rice production labor?","What interventions from Thailand may transfer to Myanmar?","Show high-impact problems with good data availability","Find research gaps suitable for a data science project","Which project can save farmer time or labor?","Show studies with quantitative yield effects","Show conflicting research about fertilizer","Which studies use the same dataset?","What research has the strongest implementation evidence?",
    "mechanization","mechanisation Myanmar","fertiliser optimisaton","\"alternate wetting\"","မြေဩဇာ ဈေးနှုန်း","flood impact on rice yield","research with farmer-level datasets","solutions used in Vietnam but not Myanmar","xylophone quantum","" ]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1440,"height":900})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL, wait_until="networkidle"); await pg.evaluate("MRRI.go('search')")
        out=[]
        for q in QS:
            await pg.evaluate("q=>{MRRI.SS.F={};MRRI.SS.yrOn=false;MRRI.SS.dismissed={};MRRI.setSearch({q:q})}", q)
            r=await pg.evaluate("""()=>({count:document.querySelector('#rcount').textContent, interp:document.querySelector('#interp').innerText,
               top:[...document.querySelectorAll('#cards article')].slice(0,6).map(a=>a.querySelector('.mono').textContent+' | '+a.querySelector('h3').innerText.slice(0,80))})""")
            out.append(dict(q=q,**r)); print("\n##",q,"→",r["count"][:90]); print("   interp:",r["interp"][:160].replace("\n"," "))
            for t in r["top"]: print("   ",t)
        # filter combo test
        await pg.evaluate("()=>{MRRI.SS.dismissed={};MRRI.SS.F={type:['Study'],region:['Ayeyarwady'],conf:['High']};MRRI.SS.yr=[2018,2026];MRRI.SS.yrOn=true;MRRI.setSearch({q:'flood'})}")
        r=await pg.evaluate("()=>({count:document.querySelector('#rcount').textContent,active:document.querySelector('#active').innerText,years:[...document.querySelectorAll('#cards article .meta')].map(m=>m.textContent.slice(0,4))})")
        print("\n## COMBO flood + Study + Ayeyarwady + High + 2018-2026 →",r["count"],"| years:",sorted(set(r["years"]))); print("   active:",r["active"].replace("\n"," ")[:200])
        await pg.evaluate("()=>{MRRI.SS.F={};MRRI.SS.yrOn=false;MRRI.setSearch({q:''})}")
        r2=await pg.evaluate("()=>document.querySelector('#rcount').textContent"); print("## after clear all:",r2[:60])
        print("ERRORS",errs)
        json.dump(out,open(ROOT_DIR + "/raw/val_raw.json","w"),ensure_ascii=False,indent=1)
        await b.close()
asyncio.run(main())
