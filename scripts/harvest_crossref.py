import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
import json, time, urllib.request, urllib.parse, sys, os
QUERIES = """Myanmar rice|Myanmar paddy|Burma rice|Myanmar rice yield|Myanmar rice production|Myanmar rice farmers|Myanmar rice mechanization|Myanmar agricultural mechanization|Myanmar rural labor migration agriculture|Myanmar rice fertilizer|Myanmar rice irrigation|Myanmar rice flood|Myanmar rice drought|Myanmar rice salinity|Myanmar rice climate change|Myanmar rice remote sensing|Myanmar rice Sentinel-1|Myanmar rice MODIS|Myanmar rice postharvest|Myanmar rice milling|Myanmar rice value chain|Myanmar rice market price|Myanmar rice export|Myanmar agricultural credit|Myanmar rice profitability cost|Myanmar rice seed variety|Myanmar rice technical efficiency|Ayeyarwady delta rice|Irrawaddy delta rice|Myanmar dry zone rice|Myanmar rice technology adoption|Myanmar alternate wetting drying|Myanmar rice pest disease|Myanmar rice soil nutrient|Myanmar rice yield gap|Myanmar agriculture COVID-19|Myanmar coup agriculture|Myanmar farmland tenure|Myanmar rice methane emission|Myanmar rice food security|Bago region rice|Sagaing rice|Myanmar monsoon paddy|Myanmar rice pulses cropping system|Myanmar rice forecasting|Myanmar rice GIS|Myanmar hybrid rice|Myanmar rice germplasm|Myanmar agricultural extension|Myanmar rice harvest loss|Myanmar rice drying storage|Myanmar paddy land|Myanmar agricultural productivity|Myanmar rice policy|Mekong rice Myanmar""".split("|")
out = {}
log = []
for q in QUERIES:
    params = {"query.bibliographic": q, "rows": 100, "filter": "from-pub-date:2000-01-01,until-pub-date:2026-12-31",
              "select": "DOI,title,author,issued,container-title,publisher,type,abstract,URL,is-referenced-by-count,reference,subject,link"}
    url = "https://api.crossref.org/works?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MyanmarRiceResearchIntel/1.0 (mailto:research-intel@example.org)"})
            d = json.load(urllib.request.urlopen(req, timeout=60))
            items = d["message"]["items"]; break
        except Exception as e:
            items = []; time.sleep(3)
    n_new = 0
    for it in items:
        doi = it.get("DOI","").lower()
        if not doi: continue
        if doi not in out:
            it["_queries"] = [q]; out[doi] = it; n_new += 1
        else:
            out[doi]["_queries"].append(q)
    log.append({"query": q, "returned": len(items), "new": n_new})
    print(q, len(items), n_new, flush=True)
    time.sleep(0.5)
json.dump(out, open(ROOT_DIR + "/raw/crossref_raw.json","w"))
json.dump(log, open(ROOT_DIR + "/raw/crossref_log.json","w"), indent=1)
print("TOTAL unique", len(out))
