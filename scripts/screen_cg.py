import json,re
cg=json.load(open('raw/cgspace_raw.json'))
sel=json.load(open('raw/selected.json'))
known={r['doi'] for r in sel['included']}|{r['doi'] for v in sel['series'].values() for r in v}|{r['doi'] for r in sel['excluded']}
MM=re.compile(r"\b(myanmar|burma|ayeyarwad+y|irrawaddy)\b",re.I)
RICE=re.compile(r"\b(rice|paddy|paddies)\b",re.I)
out={"mm_rice_title":[],"mm_title_rice_abs":[],"mm_country_rice_abs":[],"other":0,"dup_doi":0}
for u,r in cg.items():
    t=" ".join(r["dc.title"]); ab=" ".join(r["dcterms.abstract"]); c=" ".join(r["cg.coverage.country"])
    yr=(r["dcterms.issued"] or ["0"])[0][:4]
    try: yr=int(yr)
    except: yr=0
    if yr<2000: out["other"]+=1; continue
    doi=(r["cg.identifier.doi"] or [""])[0].lower().replace("https://doi.org/","").replace("http://dx.doi.org/","")
    r["_doi"]=doi; r["_year"]=yr
    if doi and doi in known: out["dup_doi"]+=1; continue
    if MM.search(t) and RICE.search(t): out["mm_rice_title"].append(r)
    elif MM.search(t) and RICE.search(ab): out["mm_title_rice_abs"].append(r)
    elif "Myanmar" in c and RICE.search(t+" "+ab) and MM.search(ab): out["mm_country_rice_abs"].append(r)
    else: out["other"]+=1
json.dump(out,open('raw/cg_screen.json','w'))
for k in ["mm_rice_title","mm_title_rice_abs","mm_country_rice_abs"]:
    print("==",k,len(out[k]))
    for r in sorted(out[k],key=lambda r:r["_year"]):
        print(r["_year"],(r["dcterms.type"] or [""])[0][:8],"|"," ".join(r["dc.title"])[:110],"|",(r["_doi"] or r["handle"] or "")[:30])
print("other",out["other"],"dup",out["dup_doi"])
