import json,re
S=json.load(open("data/_studies_merged.json"))
P=json.load(open("raw/abstract_patch.json"))
for r in S:
    p=P.get(r["study_id"])
    if p and not r.get("abstract"):
        r["abstract"]=p["abstract"]
        if p.get("handle") and not r.get("handle"): r["handle"]=p["handle"]
def rx(*w): return re.compile(r"(?:%s)"%"|".join(w),re.I)
PROB={
 "Yield & productivity":rx(r"\byield",r"productivity",r"yield gap",r"intensification",r"technical efficiency",r"\befficiency\b",r"cropping intensity",r"benchmark"),
 "Climate & weather risk":rx(r"climat",r"flood",r"drought",r"cyclone",r"salin",r"rainfall variab",r"heat stress",r"el ni",r"weather",r"sea level",r"submerg",r"monsoon variab"),
 "Water & irrigation":rx(r"irrigat",r"water management",r"water user",r"\bpump",r"alternate wetting",r"\bawd\b",r"reservoir",r"water productivity",r"water insecurity",r"water stress"),
 "Inputs & fertilizer":rx(r"fertili",r"nitrogen",r"\bN use",r"nutrient",r"urea",r"pesticide",r"agro-?chemical",r"input (use|market|retail)",r"inputs\b"),
 "Seed & varieties":rx(r"\bseed",r"variet",r"cultivar",r"hybrid rice",r"paw san",r"germplasm",r"landrace"),
 "Labor & migration":rx(r"labou?r",r"migra",r"wage",r"employment",r"youth",r"gender",r"women"),
 "Mechanization":rx(r"mechani",r"tractor",r"combine",r"harvester",r"machin",r"thresher",r"transplanter",r"direct.seed",r"establishment method",r"broadcast"),
 "Costs, prices & credit":rx(r"\bcost",r"profit",r"price",r"credit",r"loan",r"microfinance",r"insurance",r"income",r"returns?\b",r"exchange rate",r"foreign exchange",r"debt"),
 "Markets, trade & value chain":rx(r"market",r"value chain",r"supply chain",r"export",r"trade",r"mill",r"trader",r"commerciali",r"contract farming",r"fair ?trade",r"processing"),
 "Post-harvest":rx(r"post.?harvest",r"drying",r"dryer",r"storage",r"hermetic",r"harvest loss",r"rodent",r"milling quality",r"husk furnace"),
 "Pests, diseases & weeds":rx(r"\bpest",r"disease",r"weed",r"nematode",r"blight",r"insect",r"armyworm",r"rodent",r"pathogen",r"leaf folder"),
 "Soil & land":rx(r"\bsoil",r"land (use|cover|tenure|law|fragment)",r"farmland",r"tenure",r"fallow",r"land elevation",r"mangrove"),
 "Technology, data & extension":rx(r"remote sens",r"satellite",r"sentinel",r"landsat",r"modis",r"\bgis\b",r"machine learning",r"neural",r"\bcnn",r"\bai\b",r"digital",r"extension",r"advisory",r"information (access|delivery|service|campaign)",r"image processing",r"crop manager",r"farmer field school",r"\bict\b",r"decision.support"),
 "Conflict, policy & institutions":rx(r"conflict",r"coup",r"instabilit",r"fragile",r"policy",r"policies",r"institution",r"governance",r"strategy",r"covid",r"crisis"),
 "Environment & emissions":rx(r"methane",r"greenhouse",r"\bghg",r"carbon",r"emission",r"\bco2",r"energy (use|balance|efficiency)",r"ecosystem service",r"arsenic",r"heavy metal",r"polycyclic"),
 "Breeding & grain quality":rx(r"genetic",r"genomic",r"marker-assisted",r"\b(dna|molecular|ssr|snp) markers?\b",r"breeding",r"amylose",r"starch",r"aroma",r"physicochemical",r"chalk",r"biofortif",r"phenolog",r"\bqtl",r"sensory",r"germplasm",r"transcriptom",r"cooking"),
 "Food security & welfare":rx(r"food security",r"food insecurity",r"poverty",r"nutrition",r"diet",r"welfare",r"livelihood"),
}
METH={
 "Survey":rx(r"survey",r"interview",r"questionnaire",r"respondent",r"households?\b",r"phone"),
 "Regression / econometrics":rx(r"regression",r"probit",r"logit",r"tobit",r"econometric",r"heckman",r"panel",r"difference.in.difference",r"instrumental",r"fixed effect",r"discontinuity",r"propensity",r"ricardian",r"discrete choice"),
 "Efficiency analysis (SFA/DEA)":rx(r"stochastic frontier",r"data envelopment",r"\bdea\b",r"technical efficiency",r"profit efficiency",r"environmental efficiency",r"translog"),
 "Time series":rx(r"time.series",r"\bvar\b",r"varx",r"cointegrat",r"granger",r"price transmission",r"market integration",r"causality",r"forecast"),
 "Optimization / OR":rx(r"optimi[sz]",r"linear programming",r"model predictive control",r"operations research",r"optimum"),
 "GIS / spatial":rx(r"\bgis\b",r"spatial",r"geostatist",r"mapping",r"suitability"),
 "Remote sensing":rx(r"remote sens",r"satellite",r"sentinel",r"landsat",r"modis",r"palsar",r"\bsar\b",r"ndvi",r"cosmo",r"imagery"),
 "Machine learning / AI":rx(r"machine learning",r"random forest",r"support vector",r"neural",r"\bcnn",r"deep learning",r"\bai\b",r"u-net",r"image processing",r"image classification",r"supervised classification"),
 "Field experiment / trial":rx(r"field experiment",r"field trial",r"on-farm trial",r"\bexperiments?\b",r"randomi[sz]ed complete",r"pot experiment",r"split.plot",r"replication"),
 "Randomized / causal design":rx(r"randomi[sz]ed controlled",r"\brct\b",r"randomly assigned",r"cluster random",r"difference.in.difference",r"discontinuity",r"instrumental variable",r"impact evaluation"),
 "Crop / hydrological simulation":rx(r"simulat",r"\bepic\b",r"oryza",r"crop model",r"apsim",r"dssat",r"aquacrop",r"hydrolog",r"\brri model",r"general equilibrium",r"\bcge"),
 "Economic / cost-benefit analysis":rx(r"cost.benefit",r"cost and return",r"benefit-cost",r"gross margin",r"partial budget",r"profitabilit",r"cost.effective",r"economic assessment",r"economic analysis"),
 "Lab / genetic analysis":rx(r"\bpcr\b",r"\b(dna|molecular|ssr|snp|genetic) markers?\b",r"marker-assisted",r"genotyp",r"\bsequencing\b",r"assay",r"laboratory",r"amylose",r"transcriptom"),
 "Qualitative / review":rx(r"review",r"qualitative",r"focus group",r"case study",r"lessons",r"swot",r"perception",r"key informant",r"policy analysis"),
}
DATA={
 "Farmer survey":rx(r"farmers? survey",r"household survey",r"households",r"respondent",r"interview",r"farmers were",r"sample of"),
 "Phone panel survey":rx(r"phone",r"\bmaps\b",r"agricultural performance survey",r"household welfare survey",r"\bmhws"),
 "Satellite / remote sensing":rx(r"satellite",r"sentinel",r"landsat",r"modis",r"palsar",r"imagery",r"remote sens"),
 "Weather / climate":rx(r"rainfall",r"temperature",r"precipitation",r"weather",r"chirps",r"climate data",r"meteorolog"),
 "Soil":rx(r"\bsoil"),
 "Market / price":rx(r"\bprices?\b",r"market data",r"wholesale",r"retail"),
 "Trade":rx(r"\bexports?\b",r"\bimports?\b",r"comtrade",r"trade data",r"export volume"),
 "Administrative / official statistics":rx(r"official",r"statistic",r"ministry",r"department of agriculture",r"administrative",r"census",r"\bmoali",r"government data"),
 "Experimental / plot data":rx(r"field experiment",r"field trial",r"on-farm trial",r"experimental plots?",r"split.plot",r"pot experiment"),
 "Enterprise survey (mills, traders, retailers)":rx(r"mill(s|ers)\b",r"traders",r"retailers",r"service providers",r"enterprises?\b",r"businesses"),
}
GEO={"Ayeyarwady":rx(r"ayeyarwad+y",r"irrawaddy",r"\bdelta\b",r"maubin",r"myaungmya",r"pyapon",r"bogale",r"labutta",r"pathein",r"hinthada",r"kyaiklat",r"wakema",r"mawlamyinegyun",r"nyaungdone",r"danubyu",r"ahmar",r"einme"),
 "Bago":rx(r"\bbago",r"\bpegu",r"taungoo",r"\bwaw\b",r"\bpyay\b",r"yedashe",r"thanatpin",r"ngamoeyeik",r"daik-?u",r"kawa\b",r"thapanzeik"),
 "Yangon":rx(r"yangon",r"rangoon",r"hmawbi",r"twantay",r"htantabin",r"kayan\b",r"hlegu"),
 "Sagaing":rx(r"sagaing",r"monywa",r"shwebo",r"kanbalu",r"chindwin",r"thapanzeik"),
 "Mandalay":rx(r"mandalay",r"kyaukse",r"myittha",r"meiktila",r"nyaung-?u",r"myingyan"),
 "Magway":rx(r"magway",r"magwe",r"minbu",r"pakokku",r"yenangyaung"),
 "Nay Pyi Taw":rx(r"nay ?pyi ?taw",r"naypyitaw",r"tatkon",r"lewe",r"pyinmana",r"zeyarthiri",r"yezin"),
 "Shan":rx(r"\bshan\b",r"taunggyi",r"lashio",r"inle"),"Kachin":rx(r"kachin",r"indawgyi",r"myitkyina"),"Rakhine":rx(r"rakhine",r"arakan",r"sittwe",r"mrauk"),
 "Mon":rx(r"\bmon state",r"\bmon village",r"thaton",r"mawlamyine\b"),"Kayin":rx(r"kayin",r"karen state",r"hpa-?an"),"Tanintharyi":rx(r"tanintharyi",r"taninthayi",r"dawei",r"myeik"),"Chin":rx(r"\bchin state",r"\bchin hill",r"paletwa"),"Kayah":rx(r"kayah")}
ZONE={"Delta / coastal lowland":rx(r"delta",r"coastal",r"lower myanmar",r"ayeyarwad"),"Central Dry Zone":rx(r"dry zone",r"\bcdz\b",r"central myanmar",r"magway",r"mandalay",r"sagaing"),"Hills / uplands":rx(r"upland",r"\bshan\b",r"\bchin\b",r"kachin",r"hill")}
COUNTRIES={"Vietnam":rx(r"viet ?nam",r"mekong (river )?delta"),"Thailand":rx(r"thai"),"Bangladesh":rx(r"bangladesh"),"India":rx(r"india",r"odisha",r"orissa"),"China":rx(r"china",r"chinese"),"Cambodia":rx(r"cambodia"),"Laos":rx(r"\blao",r"laos"),"Philippines":rx(r"philippin")}
IMPACT={"Yield":rx(r"\byield"),"Cost":rx(r"\bcost"),"Labor":rx(r"labou?r",r"wage"),"Time":rx(r"time.sav",r"turnaround",r"timeliness",r"labou?r time",r"working hours",r"person.days",r"man.days"),"Water":rx(r"water"),"Input efficiency":rx(r"fertili[sz]er use",r"nitrogen use",r"input use",r"use efficiency",r"seed rate"),"Profit":rx(r"profit",r"income",r"net return",r"gross margin"),"Risk reduction":rx(r"risk",r"insurance",r"resilien",r"variability",r"shock")}
T2=rx(r"international food policy",r"ifpri",r"irri",r"international rice research",r"world bank",r"asian development bank",r"\bfao\b",r"food and agriculture organization",r"cgiar",r"international water management",r"iwmi",r"worldfish",r"ccafs",r"\bilo\b",r"unu-wider",r"wider",r"wageningen centre for development",r"oecd",r"jircas",r"aciar")
LOWV=rx(r"asian research journal of agriculture",r"journal of experimental agriculture international",r"international journal of plant & soil",r"international journal of advanced research",r"international journal of scientific and research publications",r"international research journal of modernization",r"journal of survey in fisheries",r"international journal of research publication",r"asian journal of agricultural extension",r"asian research journal of current science",r"economics world",r"journal of life sciences",r"american journal of agriculture and fore",r"machine learning research",r"international journal of scientific and engineering",r"international journal of statistics",r"psaku",r"jurnal informatika",r"indian journal of ecology",r"open agriculture journal",r"international journal of science and research")
for r in S:
    txt=" ".join([r["title"]]*3+[r.get("abstract") or "", " ".join(r.get("cg_subjects") or [])])
    tt=r["title"]+" "+(r.get("abstract") or "")
    r["problem_categories"]=[k for k,v in PROB.items() if v.search(txt)]
    r["methods"]=[k for k,v in METH.items() if v.search(tt)]
    r["data_types"]=[k for k,v in DATA.items() if v.search(tt)]
    r["regions"]=[k for k,v in GEO.items() if v.search(tt)]
    r["zones"]=[k for k,v in ZONE.items() if v.search(tt)]
    myan=bool(re.search(r"myanmar|burma|ayeyarwad|irrawaddy",tt,re.I)) or "Myanmar" in (r.get("cg_country") or [])
    others=[k for k,v in COUNTRIES.items() if v.search(tt)]
    r["countries"]=(["Myanmar"] if myan else [])+[c for c in others if c!="Myanmar"]
    r["impact_dimensions"]=[k for k,v in IMPACT.items() if v.search(tt)]
    pub=" ".join([r.get("publisher") or "",r.get("container") or ""," ".join(r.get("cg_affil") or [])," ".join(r.get("authors") or [])])
    t=(r.get("type") or "").lower()
    if T2.search(pub) or (r.get("doi") or "").startswith(("10.2499","10.1596","10.4060")) or r.get("handle"): tier=2
    elif t in("journal-article","journal article","proceedings-article","book-chapter","book chapter","book","posted-content") or "journal" in t: tier=3
    else: tier=4
    if t=="posted-content": r["peer_review"]="Preprint (not peer-reviewed)"
    elif "journal" in t: r["peer_review"]="Peer-reviewed journal"
    elif t in("report","working paper","brief","report-component","case study","data paper","internal document"): r["peer_review"]="Institutional report / working paper"
    else: r["peer_review"]={"book-chapter":"Book chapter","book":"Book / monograph","monograph":"Book / monograph","proceedings-article":"Conference paper","edited-book":"Book / handbook","other":"Other"}.get(t,r.get("type") or "Other")
    r["source_tier"]=tier
    r["low_scrutiny_venue"]=bool(LOWV.search(pub))
    rt=[]
    if any(m in r["methods"] for m in ["Regression / econometrics","Efficiency analysis (SFA/DEA)","Time series","Machine learning / AI","Remote sensing","Optimization / OR","Crop / hydrological simulation"]): rt.append("Quantitative")
    if "Field experiment / trial" in r["methods"] or "Randomized / causal design" in r["methods"]: rt.append("Experimental")
    if "Qualitative / review" in r["methods"]: rt.append("Qualitative")
    if "Survey" in r["methods"] and "Quantitative" not in rt: rt.append("Quantitative")
    if len(rt)>=2 and "Qualitative" in rt: rt.append("Mixed methods")
    if any(m in r["methods"] for m in ["Optimization / OR","Machine learning / AI","Remote sensing","GIS / spatial"]) or "Technology, data & extension" in r["problem_categories"]: rt.append("Applied")
    if any(m in r["methods"] for m in ["Regression / econometrics","Efficiency analysis (SFA/DEA)","Time series","Economic / cost-benefit analysis"]): rt.append("Analytical")
    r["research_types"]=sorted(set(rt)) or ["Unclassified (no abstract)"] if not r.get("abstract") else sorted(set(rt)) or ["Descriptive"]
    conf="Medium"
    if r.get("abstract") and (tier==2 or (r["peer_review"]=="Peer-reviewed journal" and not r["low_scrutiny_venue"])): conf="High"
    if r["low_scrutiny_venue"] or not r.get("abstract"): conf="Low"
    r["confidence"]=conf
    r["verification_status"]=("Verified: DOI registered (Crossref) and metadata matched" if r.get("doi") and "crossref" in " ".join(r["source_db"]) else "Verified: CGIAR repository record (CGSpace)" if r.get("handle") else "Verified: Crossref record")+("" if r.get("abstract") else "; abstract not available — content not independently checked")
json.dump(S,open("data/_studies_tagged.json","w"),ensure_ascii=False)
import collections
for f in ["problem_categories","methods","data_types","regions","zones","countries","impact_dimensions","research_types"]:
    c=collections.Counter(x for r in S for x in r[f]); print(f,dict(c.most_common()))
print("tier",collections.Counter(r["source_tier"] for r in S),"conf",collections.Counter(r["confidence"] for r in S),"lowv",sum(r["low_scrutiny_venue"] for r in S))
print("no problem tag:",[r["title"][:50] for r in S if not r["problem_categories"]][:10])
