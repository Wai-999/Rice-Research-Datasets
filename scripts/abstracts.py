import json,urllib.request,urllib.parse,time,re,html
sel=json.load(open('raw/selected.json'))
recs=sel['included']+sel['C'][2:3]
need=[r['doi'] for r in recs if not r['abstract']]
got={}
for i in range(0,len(need),80):
    chunk=need[i:i+80]
    body=json.dumps({"ids":["DOI:"+d for d in chunk]}).encode()
    for a in range(4):
        try:
            req=urllib.request.Request("https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,abstract,tldr,externalIds,openAccessPdf,citationCount,referenceCount",data=body,headers={"Content-Type":"application/json"})
            res=json.load(urllib.request.urlopen(req,timeout=90)); break
        except Exception as e:
            print("retry",e); time.sleep(8); res=[]
    for d,x in zip(chunk,res):
        if x: got[d]={"abstract":x.get("abstract"),"tldr":(x.get("tldr") or {}).get("text"),"oa_pdf":(x.get("openAccessPdf") or {}).get("url"),"s2id":x.get("paperId")}
    time.sleep(3)
print("S2 got", sum(1 for v in got.values() if v.get("abstract")), "abstracts,", sum(1 for v in got.values() if v.get("tldr")),"tldr")
# EPMC fallback
for d in need:
    if got.get(d,{}).get("abstract"): continue
    url="https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+urllib.parse.urlencode({"query":f'DOI:"{d}"',"format":"json","resultType":"core"})
    try:
        r=json.load(urllib.request.urlopen(url,timeout=40))["resultList"]["result"]
        if r and r[0].get("abstractText"):
            got.setdefault(d,{})["abstract"]=re.sub(r"<[^>]+>"," ",r[0]["abstractText"]); got[d]["src"]="epmc"
    except Exception as e: pass
    time.sleep(0.3)
print("total with abstract", sum(1 for v in got.values() if v.get("abstract")),"of",len(need))
json.dump(got,open('raw/abstracts_extra.json','w'))
