import json, concurrent.futures, urllib.request, ssl
S=json.load(open("data/studies.json")); D=json.load(open("data/datasets.json"))
urls=[(s["id"],s["original_url"]) for s in S if s["original_url"]]+[(d["id"],d["source_url"]) for d in D if d["source_url"]]
def chk(item):
    i,u=item
    try:
        req=urllib.request.Request(u,method="HEAD",headers={"User-Agent":"Mozilla/5.0 RiceIntel linkcheck"})
        class NoRedir(urllib.request.HTTPRedirectHandler):
            def redirect_request(self,*a,**k): return None
        op=urllib.request.build_opener(NoRedir)
        try: r=op.open(req,timeout=25); code=r.status
        except urllib.error.HTTPError as e: code=e.code
        return (i,u,code)
    except Exception as e: return (i,u,"ERR "+type(e).__name__)
with concurrent.futures.ThreadPoolExecutor(16) as ex: res=list(ex.map(chk,urls))
from collections import Counter
print(Counter(str(r[2]) for r in res))
bad=[r for r in res if not (isinstance(r[2],int) and r[2] in (200,301,302,303,307,308,202))]
for b in bad: print(b)
json.dump(res,open("raw/linkcheck.json","w"))
