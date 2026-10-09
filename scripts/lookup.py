import json,urllib.request,urllib.parse,sys,re,html,difflib
def look(title):
    url="https://api.crossref.org/works?"+urllib.parse.urlencode({"query.bibliographic":title,"rows":3,"select":"DOI,title,author,issued,container-title,publisher,type,abstract,is-referenced-by-count,reference"})
    d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"RiceIntel/1.0"}),timeout=60))
    best=None;bs=0
    for it in d["message"]["items"]:
        t=" ".join(it.get("title") or [])
        s=difflib.SequenceMatcher(None,t.lower(),title.lower()).ratio()
        if s>bs: bs=s;best=it
    return bs,best
titles=[l.strip() for l in open(sys.argv[1]) if l.strip()]
out=[]
for t in titles:
    try: s,b=look(t)
    except Exception as e: print("ERR",t,e); continue
    if b:
        rec={"query":t,"score":round(s,2),"doi":b["DOI"].lower(),"title":re.sub(r"<[^>]+>","",html.unescape(" ".join(b.get("title") or []))),"year":(b.get("issued",{}).get("date-parts") or [[None]])[0][0],
             "authors":[(a.get("given","")+" "+a.get("family","")).strip() or a.get("name","") for a in b.get("author",[])],"container":" ".join(b.get("container-title") or []),"publisher":b.get("publisher"),"type":b.get("type"),
             "abstract":re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",html.unescape(b.get("abstract","")))).strip(),"cites":b.get("is-referenced-by-count",0),"refs":[r.get("DOI","").lower() for r in b.get("reference",[]) if r.get("DOI")]}
        out.append(rec); print(rec["score"],rec["year"],rec["doi"],"|",rec["title"][:90],"|",", ".join(rec["authors"][:3]))
json.dump(out,open(sys.argv[2],"w"))
