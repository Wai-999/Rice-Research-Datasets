import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
import json, urllib.request, urllib.parse, time
QS=["Myanmar rice","Myanmar paddy","Myanmar mechanization","Myanmar agricultural performance survey","Myanmar fertilizer","Myanmar farmers","Myanmar irrigation","Myanmar Ayeyarwady","Myanmar dry zone","Myanmar climate-smart","Myanmar postharvest","Myanmar labor migration rural","Myanmar seed","Myanmar extension","Myanmar agricultural wages","Myanmar rice value chain","Myanmar conflict agriculture","Myanmar household welfare survey"]
F=["dc.title","dc.contributor.author","dcterms.issued","dcterms.abstract","cg.identifier.doi","dc.identifier.uri","dcterms.type","cg.coverage.country","dcterms.subject","cg.contributor.affiliation","dcterms.publisher","cg.coverage.region","cg.coverage.subregion","dcterms.bibliographicCitation","cg.howPublished","cg.identifier.url","dcterms.isPartOf","cg.contributor.initiative","cg.identifier.project"]
items={}; log=[]
for q in QS:
    n=0
    for page in range(0,4):
        url="https://cgspace.cgiar.org/server/api/discover/search/objects?"+urllib.parse.urlencode({"query":q,"size":100,"page":page,"dsoType":"ITEM"})
        for a in range(3):
            try: d=json.load(urllib.request.urlopen(url,timeout=90)); break
            except Exception as e: print("retry",e); time.sleep(4); d=None
        if not d: break
        objs=d["_embedded"]["searchResult"]["_embedded"]["objects"]
        for o in objs:
            io=o["_embedded"]["indexableObject"]; md=io.get("metadata",{})
            rec={k:[v["value"] for v in md.get(k,[])] for k in F}
            rec["uuid"]=io["uuid"]; rec["handle"]=io.get("handle")
            if rec["uuid"] not in items: items[rec["uuid"]]=rec; rec["_q"]=[q]; n+=1
            else: items[rec["uuid"]]["_q"].append(q)
        tot=d["_embedded"]["searchResult"]["page"]["totalElements"]
        if (page+1)*100>=tot: break
        time.sleep(0.5)
    log.append({"query":q,"total_hits":tot,"new":n}); print(q,tot,n,flush=True)
json.dump(items,open(ROOT_DIR + "/raw/cgspace_raw.json","w")); json.dump(log,open(ROOT_DIR + "/raw/cgspace_log.json","w"),indent=1)
print("unique",len(items))
