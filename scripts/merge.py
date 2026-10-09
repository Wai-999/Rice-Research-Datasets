import json,re,html,unicodedata
sel=json.load(open('raw/selected.json')); cgs=json.load(open('raw/cg_screen.json'))
absx=json.load(open('raw/abstracts_extra.json')); ext=json.load(open('raw/extra_lookup.json'))+json.load(open('raw/extra_doi.json'))
def norm(t): return re.sub(r"[^a-z0-9]","",unicodedata.normalize("NFKD",t.lower()))[:90]
recs={}; series={}
def add(r,src):
    k=r.get("doi") or norm(r["title"])
    nt=norm(r["title"])
    for kk,v in recs.items():
        if (r.get("doi") and v.get("doi")==r.get("doi")) or v["_nt"]==nt:
            v["source_db"]=sorted(set(v["source_db"]+[src])); 
            if not v.get("abstract") and r.get("abstract"): v["abstract"]=r["abstract"]
            for f in ["handle","cg_country","cg_subjects","cg_type","cg_affil","cg_region","cg_uri"]:
                if r.get(f) and not v.get(f): v[f]=r[f]
            return
    r["_nt"]=nt; r["source_db"]=[src]; recs[k]=r
for r in sel['included']:
    a=r['abstract'] or (absx.get(r['doi'],{}) or {}).get('abstract') or ""
    add({"doi":r['doi'],"title":r['title'],"year":r['year'],"authors":r['authors'],"container":r['container'],"publisher":r['publisher'],"type":r['type'],"abstract":re.sub(r"^\s*(Abstract|ABSTRACT)\s*","",a or ""),"tldr":(absx.get(r['doi'],{}) or {}).get('tldr'),"oa_pdf":(absx.get(r['doi'],{}) or {}).get('oa_pdf'),"cites":r['cites'],"refs":r['refs'],"screen":r['screen']},"crossref")
sea=[r for r in sel['C'] if 'SEA-Rice' in r['title']]
for r in sea: add({"doi":r['doi'],"title":r['title'],"year":r['year'],"authors":r['authors'],"container":r['container'],"publisher":r['publisher'],"type":r['type'],"abstract":r['abstract'],"cites":r['cites'],"refs":r['refs'],"screen":"C"},"crossref")
def cgrec(r):
    doi=r["_doi"] or None
    return {"doi":doi,"title":" ".join(r["dc.title"]),"year":r["_year"],"authors":r["dc.contributor.author"],"container":" ".join(r["dcterms.isPartOf"] or r["cg.howPublished"] or []),"publisher":" ".join(r["dcterms.publisher"]),"type":(r["dcterms.type"] or [""])[0],
            "abstract":" ".join(r["dcterms.abstract"]),"handle":r["handle"],"cg_uri":(r["dc.identifier.uri"] or [None])[0],"cg_country":r["cg.coverage.country"],"cg_subjects":r["dcterms.subject"],"cg_affil":r["cg.contributor.affiliation"],"cg_region":r["cg.coverage.subregion"],"cites":0,"refs":[],"screen":"cgspace"}
EXC_T=["Shocks, Production, Exports and Market Prices","Resource-poor rice farmers","Rice millers –","Rice millers -"]
for r in cgs["mm_rice_title"]:
    t=" ".join(r["dc.title"])
    if any(x in t for x in EXC_T): 
        if "Rice millers" in t: series.setdefault("rice_millers",[]).append(cgrec(r))
        continue
    if "Conflict, inclusivity" in t and (r["dcterms.type"] or [""])[0].startswith("Conference"): continue
    add(cgrec(r),"cgspace")
INC2=["rodent outbreaks","Role of seed","Promoting agricultural growth in Myanmar","Crop production and profitability in Ayeyarwady","Agricultural mechanization in the dry zone of Myanmar","Mapping cropland fallow","Credit access and utilization","Village level value chain upgrading","Providing a framework for the Myanmar government","Irrigation investment in Myanmar","Flood-based farming systems","Agricultural machinery supply businesses","New approach to water users","Variety adoption and demand for quality seed","Mechanization outsourcing services","rapid agricultural mechanization","outlook for Myanmar’s inorganic fertilizer","Women and youth in Myanmar agriculture","Cost-Benefit Analysis of Establishing a Climate Smart Village","stalled transformation of food processing","Water stresses and responses","foreign exchange market distortions","Monsoon Season 2024","Round Four: Note","Dry Season 2024): Farm commercialization","Monsoon 2023): Farming environment","Conflict and agricultural performance","Climate advisory services in Myanmar generate","Fertilizer and conflicts","Round Five: Note","dry season 2025)","Tractor service providers","Combine harvester outsourcing services","scales digital climate advisories","Strengthening Myanmar’s agrifood system","Agricultural credit and conflict","monsoon 2025)","Combine harvester service providers","Disruptions to agrifood value chains"]
for r in cgs["mm_title_rice_abs"]:
    t=" ".join(r["dc.title"])
    if "monthly food price report" in t: series.setdefault("food_price_reports",[]).append(cgrec(r)); continue
    if "crop traders – June 2024" in t: series.setdefault("traders",[]).append(cgrec(r)); continue
    if "input retailers in Myanmar: Insights from the 2025" in t: series.setdefault("input_ret",[]).append(cgrec(r)); continue
    if any(x.lower() in t.lower() for x in INC2): add(cgrec(r),"cgspace")
INC3=["Ten years of technological change","Adoption of improved rice management practices","Optimized mechanised rice harvesting","Optimized downdraft rice husk furnace","Downdraft rice husk furnace","Combine harvesting introduced","early-morning flowering","Food prices, processing, and shocks","Environmental, Social, and Economic Challenges","The rice sector","Agricultural mechanization: Drivers","Emerging outsource agricultural services","Global rice price declines"]
for r in cgs["mm_country_rice_abs"]:
    t=" ".join(r["dc.title"])
    if any(t.startswith(x) or x in t for x in INC3): add(cgrec(r),"cgspace")
for r in ext:
    if r.get("score",1)<0.85: continue
    add({k:r.get(k) for k in ["doi","title","year","authors","container","publisher","type","abstract","cites","refs"]}|{"screen":"targeted"},"crossref-targeted")
# series from crossref selection
for k,v in sel['series'].items():
    for r in v: series.setdefault(k,[]).append({"doi":r['doi'],"title":r['title'],"year":r['year'],"publisher":r['publisher']})
for r in [x for x in list(recs.values()) if "Rice millers" in x["title"] and "Monitoring" in x["title"]]:
    series.setdefault("rice_millers",[]).append({"doi":r['doi'],"title":r['title'],"year":r['year'],"publisher":r.get('publisher')})
    recs={k:v for k,v in recs.items() if v is not r}
L=sorted(recs.values(),key=lambda r:(r["year"] or 0,r["title"]))
for i,r in enumerate(L): r["study_id"]=f"S{i+1:03d}"; r.pop("_nt",None)
json.dump(L,open("data/_studies_merged.json","w"),ensure_ascii=False)
json.dump(series,open("data/_series.json","w"),ensure_ascii=False)
print("studies",len(L),"with abstract",sum(1 for r in L if r.get("abstract")),"series",{k:len(v) for k,v in series.items()})
