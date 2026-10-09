import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
import json, re, html
raw=json.load(open(ROOT_DIR + "/raw/crossref_raw.json"))
MM=re.compile(r"\b(myanmar|burma|burmese|ayeyarwad+y|irrawaddy|bago|pegu|sagaing|mandalay|magway|magwe|yangon|rangoon|naypyi?taw|nay pyi taw|rakhine|arakan|kachin|shan state|mon state|kayin|karen state|tanintharyi|chin state|kayah|dry zone)\b",re.I)
MM_STRICT=re.compile(r"\b(myanmar|burma|burmese|ayeyarwad+y|irrawaddy|rakhine|sagaing|bago|magway|mandalay|yangon|naypyi?taw|tanintharyi|kachin)\b",re.I)
RICE=re.compile(r"\b(rice|paddy|paddies|oryza|monsoon crop)\b",re.I)
AGRI=re.compile(r"(agricultur|agrarian|farm|crop|irrigat|fertili[sz]|mechani[sz]|harvest|rural|seed|food security|pulse|tractor|labou?r|migra|land|cultivat|agro|extension|yield|soil|drought|flood|salin)",re.I)
BAD_TYPES={"component","peer-review","grant","dataset","journal-issue","journal","proceedings","report-series","book-series","standard"}
def clean(s): 
    s=re.sub(r"<[^>]+>"," ",s or ""); return re.sub(r"\s+"," ",html.unescape(s)).strip()
A=[];B=[];C=[];X=0
for doi,it in raw.items():
    t=clean(" ".join(it.get("title") or []))
    ab=clean(it.get("abstract",""))
    yr=(it.get("issued",{}).get("date-parts") or [[None]])[0][0]
    if not yr or yr<2000 or yr>2026 or it.get("type") in BAD_TYPES or not t: X+=1; continue
    rec={"doi":doi,"title":t,"year":yr,"type":it.get("type"),"container":clean(" ".join(it.get("container-title") or [])),"publisher":it.get("publisher"),"abstract":ab,
         "authors":[(a.get("given","")+" "+a.get("family","")).strip() or a.get("name","") for a in it.get("author",[])],"cites":it.get("is-referenced-by-count",0),
         "refs":[r.get("DOI","").lower() for r in it.get("reference",[]) if r.get("DOI")],"queries":it["_queries"]}
    tm=MM.search(t); tr=RICE.search(t)
    if tm and tr: rec["screen"]="A_title_mm_rice"; A.append(rec)
    elif tm and AGRI.search(t):
        rec["screen"]="B_title_mm_agri"+("_abs_rice" if RICE.search(ab) else ""); B.append(rec)
    elif MM_STRICT.search(ab) and RICE.search(ab) and (tr or AGRI.search(t)):
        rec["screen"]="C_abstract_mm_rice"; C.append(rec)
    else: X+=1
print("A",len(A),"B",len(B),"C",len(C),"excluded",X)
json.dump({"A":A,"B":B,"C":C},open(ROOT_DIR + "/raw/screen1.json","w"))
