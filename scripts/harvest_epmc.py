import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
import json, urllib.request, urllib.parse, time
q = '(Myanmar OR Burma OR Ayeyarwady OR Irrawaddy) AND (rice OR paddy) AND PUB_YEAR:[2000 TO 2026]'
out=[]; cursor="*"
while True:
    params={"query":q,"format":"json","pageSize":250,"resultType":"core","cursorMark":cursor}
    url="https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+urllib.parse.urlencode(params)
    for a in range(5):
        try:
            d=json.load(urllib.request.urlopen(url,timeout=120)); break
        except Exception as e:
            print("retry",e); time.sleep(5)
    res=d.get("resultList",{}).get("result",[])
    out+=res
    print(d.get("hitCount"), len(out), flush=True)
    nc=d.get("nextCursorMark")
    if not res or nc==cursor: break
    cursor=nc
    if len(out)>=d.get("hitCount",0): break
slim=[]
for r in out:
    slim.append({k:r.get(k) for k in ["id","source","pmid","pmcid","doi","title","authorString","pubYear","journalInfo","abstractText","keywordList","isOpenAccess","fullTextUrlList","affiliation","citedByCount","pubTypeList","bookOrReportDetails"]})
json.dump(slim,open(ROOT_DIR + "/raw/epmc_raw.json","w"))
print("saved",len(slim))
