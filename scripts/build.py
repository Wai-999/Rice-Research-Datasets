import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
import json, re, sys, collections, statistics, datetime, html as _html
sys.path.insert(0, ROOT_DIR + "/scripts")
import taglib
from c_problems import PROBLEMS
from c_interventions import INTERVENTIONS, BENCHMARKS
from c_datasets import DATASETS
from c_studies import CUR, EXTRA
from c_projects import GAPS, PROJECTS, TOP5, IMPACT_KEYS, FEAS_KEYS, CRIT

ROOT = ROOT_DIR + ""
TODAY = "2026-10-09"
S = json.load(open(f"{ROOT}/data/_studies_tagged.json"))
series = json.load(open(f"{ROOT}/data/_series.json"))

# ---------- exclusions found during full-text QC ----------
QC_EXCL = {"S283": "Location is Bago River Irrigation System, Negros Occidental, Philippines - not Myanmar (false positive on 'Bago')."}
excluded_qc = [dict(study_id=k, title=next(r["title"] for r in S if r["study_id"] == k), reason=v) for k, v in QC_EXCL.items()]
S = [r for r in S if r["study_id"] not in QC_EXCL]

# ---------- add World Development version + extra targeted studies ----------
S.append(dict(study_id="S320", title="Agricultural value chains in a fragile state: The case of rice in Myanmar", year=2023, authors=["Bart Minten", "Joseph Goeb", "Khin Zin Win", "Phoo Pye Zone"],
              container="World Development", publisher="Elsevier", type="journal-article", doi="10.1016/j.worlddev.2023.106244", abstract="", source_db=["crossref"], cites=0, refs=[]))
for e in EXTRA:
    r = dict(e); r.setdefault("cites", 0); r.setdefault("refs", []); S.append(r)

def sentences(t):
    t = re.sub(r"\s+", " ", _html.unescape(t or "")).strip()
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9•])", t) if len(x.strip()) > 25]

OBJ = re.compile(r"\b(aim|aims|aimed|objective|purpose|this (study|paper|research|report|brief|chapter)|we (examine|analy[sz]e|investigate|assess|study|explore|estimate|evaluate|use|present|document)|was (conducted|undertaken|carried out) to|to (assess|examine|evaluate|investigate|determine|identify|analy[sz]e|estimate))", re.I)
FND = re.compile(r"\b(found|find|finds|results?|show(s|ed|n)?|reveal|indicat|suggest|demonstrat|increas|decreas|reduc|higher|lower|significant|percent|%)", re.I)

CAT2P = {"Yield & productivity": ["P01"], "Water & irrigation": ["P10"], "Inputs & fertilizer": ["P04"], "Seed & varieties": ["P09"], "Labor & migration": ["P03"], "Mechanization": ["P12"],
         "Markets, trade & value chain": ["P15"], "Post-harvest": ["P11"], "Pests, diseases & weeds": ["P17"], "Environment & emissions": ["P19"]}

def auto_problems(r):
    t = (r["title"] + " " + (r.get("abstract") or "")).lower()
    ps = set()
    for c in r.get("problem_categories", []):
        ps.update(CAT2P.get(c, []))
        if c == "Climate & weather risk":
            if re.search(r"flood|cyclone|storm|submerg|heavy rain|inundat", t): ps.add("P05")
            if re.search(r"drought|dry spell|rainfall variab|dry zone", t): ps.add("P06")
            if re.search(r"salin|saline|salt", t): ps.add("P07")
            if not ps & {"P05", "P06", "P07"}: ps.add("P05" if "delta" in t else "P06")
        if c == "Costs, prices & credit":
            ps.add("P02")
            if re.search(r"credit|loan|microfinance|debt", t): ps.add("P13")
        if c == "Technology, data & extension":
            ps.add("P14")
            if re.search(r"remote sens|satellite|sentinel|landsat|modis|statistic|mapping", t): ps.add("P16")
        if c == "Conflict, policy & institutions" and re.search(r"conflict|coup|violen|instabil|fragile", t): ps.add("P08")
        if c == "Mechanization" and re.search(r"direct.seed|broadcast|establishment", t): ps.add("P18")
    return sorted(ps)

DSRX = [("D04", r"\bMAPS\b|agricultur(al|e) performance survey"), ("D05", r"household welfare survey|\bMHWS\b"), ("D09", r"sentinel-?1"), ("D10", r"sentinel-?2"), ("D11", r"landsat"), ("D12", r"modis"),
        ("D13", r"chirps"), ("D18", r"\bacled\b|violent events|fatal(ity|ities)? "), ("D21", r"ibtracs|best track"), ("D14", r"era5"), ("D15", r"imerg|gpm")]
IV = {i["intervention_id"]: i for i in INTERVENTIONS}
iv_by_study = collections.defaultdict(set)
for i in INTERVENTIONS:
    for s in i["evidence_ids"]: iv_by_study[s].add(i["intervention_id"])

def citation(r):
    au = r.get("authors") or []
    au = [a for a in au if a and not re.search(r"University|Department|Institute|Ministry|Staff Officer|Organization|Japan External", a)] or au
    a = ", ".join(au[:3]) + (" et al." if len(au) > 3 else "") if au else "Anon."
    venue = r.get("container") or r.get("publisher") or ""
    link = ("https://doi.org/" + r["doi"]) if r.get("doi") else (r.get("url") or "")
    return f"{a} ({r.get('year')}). {r['title']}. {venue}. {link}".replace(" . ", " ").strip()

studies = []
for r in S:
    if r["study_id"].startswith("S3") and int(r["study_id"][1:]) >= 306:
        # extra records: run taggers on their text
        txt = r["title"] + " " + (r.get("methodology") or "") + " " + " ".join(r.get("findings") or [])
        r["problem_categories"] = [k for k, v in taglib.PROB.items() if v.search(txt)]
        r["methods"] = [k for k, v in taglib.METH.items() if v.search(txt)]
        r["data_types"] = [k for k, v in taglib.DATA.items() if v.search(txt)]
        r["regions"] = []; r["zones"] = []
        r["impact_dimensions"] = [k for k, v in taglib.IMPACT.items() if v.search(txt)]
        r["source_tier"] = 2 if re.search(r"IRRI|IFPRI|ACIAR|CGIAR|World Bank|FAO|Government|Ministry|Council", (r.get("publisher") or "") + " ".join(r.get("authors") or [])) else (4 if r.get("type") == "other" else 3)
        r["peer_review"] = {"journal-article": "Peer-reviewed journal", "report": "Institutional report / working paper", "proceedings-article": "Conference paper", "other": "Press release / news"}.get(r.get("type"), "Other")
        r["low_scrutiny_venue"] = False
        r["research_types"] = ["Quantitative"] if r["methods"] else ["Descriptive"]
        r["verification_status"] = ("Verified: DOI registered (Crossref)" if r.get("doi") else "Verified: source URL resolves") + "; content read via abstract/page summary in this build"
    if r["study_id"] == "S320":
        r.update(problem_categories=["Markets, trade & value chain", "Conflict, policy & institutions"], methods=["Survey"], data_types=["Enterprise survey (mills, traders, retailers)"], regions=[], zones=[], countries=["Myanmar"], impact_dimensions=[],
                 source_tier=3, peer_review="Peer-reviewed journal", low_scrutiny_venue=False, research_types=["Quantitative"], confidence="Medium",
                 verification_status="Verified: DOI registered (Crossref); abstract not retrieved")
    c = CUR.get(r["study_id"], {})
    ab = r.get("abstract") or ""
    ss = sentences(ab)
    obj = c.get("objective") or r.get("objective") or next((x for x in ss if OBJ.search(x)), "")
    def fscore(i, x):
        sc = 3 * bool(re.search(r"\b(found|find|finds|results? (show|indicate|reveal|suggest)|showed|shows|revealed|indicated|indicates|suggest|demonstrat|was associated|were associated|significant)", x, re.I))
        sc += 2 * bool(re.search(r"\d+(\.\d+)?\s?(%|percent|t/ha|t ha|kg)", x, re.I)) + bool(re.search(r"increas|decreas|reduc|higher|lower", x, re.I))
        return sc - (2 if i == 0 else 0)
    cand = [(fscore(i, x), i, x) for i, x in enumerate(ss) if x != obj]
    fnd = c.get("findings") or r.get("findings") or [x for sc, i, x in sorted(sorted(cand, key=lambda t: -t[0])[:3], key=lambda t: t[1]) if sc >= 2]
    prob = c.get("problem_ids") or r.get("problem_ids") or auto_problems(r)
    ds = set(c.get("dataset_ids") or [])
    for d, rx in DSRX:
        if re.search(rx, r["title"] + " " + ab, re.I): ds.add(d)
    ivs = sorted(set(c.get("intervention_ids") or []) | iv_by_study.get(r["study_id"], set()))
    impl = "Not assessed"
    if ivs:
        st = sorted({IV[i]["status"] for i in ivs})
        impl = st[0]
    countries = c.get("countries_override") or r.get("countries") or (["Myanmar"] if "Myanmar" in (r.get("countries") or []) else [])
    if not countries: countries = ["Myanmar"]
    rec = dict(
        record_type="Study", id=r["study_id"], study_id=r["study_id"], title=_html.unescape(re.sub(r"<[^>]+>", "", r["title"])), year=r.get("year"), authors=c.get("authors_override") or r.get("authors") or [],
        institution=", ".join((r.get("cg_affil") or [])[:3]) or r.get("publisher") or "", publication_type=r.get("peer_review"), journal_or_publisher=r.get("container") or r.get("publisher") or "",
        doi=r.get("doi"), original_url=("https://doi.org/" + r["doi"]) if r.get("doi") else (r.get("url") or (("https://hdl.handle.net/" + r["handle"]) if r.get("handle") else "")),
        alt_url=r.get("alt_url") or (("https://hdl.handle.net/" + r["handle"]) if r.get("handle") and r.get("doi") else ""), full_text_url=r.get("oa_pdf") or "",
        abstract=_html.unescape(ab), tldr=r.get("tldr") or "", objective=obj, objective_source=("curated" if c.get("objective") or r.get("objective") else ("auto-extracted sentence from abstract" if obj else "not available")),
        methodology=c.get("methodology") or r.get("methodology") or "", findings=fnd, findings_source=("curated" if c.get("findings") or r.get("findings") else ("auto-extracted sentences from abstract" if fnd else "not available")),
        effect_sizes=[dict(metric=m, value=v, context=x) for m, v, x in c.get("effect_sizes", [])], sample_size=c.get("sample_size", ""), time_coverage=c.get("time_coverage", ""),
        geographic_area=c.get("geographic_area") or ", ".join(r.get("regions") or []) or ", ".join(countries), regions=r.get("regions") or [], zones=r.get("zones") or [], countries=countries,
        problem_ids=prob, problem_link_source=("curated" if c.get("problem_ids") or r.get("problem_ids") else "auto-tagged"), problem_categories=r.get("problem_categories") or [],
        methods=c.get("methods") or r.get("methods") or [], data_types=r.get("data_types") or [], research_types=c.get("research_types") or r.get("research_types") or [],
        dataset_ids=sorted(ds), intervention_ids=ivs, implementation_status=impl, impact_dimensions=r.get("impact_dimensions") or [],
        limitations=c.get("limitations", []), research_gap=c.get("research_gap", ""), source_tier=r.get("source_tier", 3), peer_review=r.get("peer_review"), low_scrutiny_venue=r.get("low_scrutiny_venue", False),
        confidence=c.get("confidence") or r.get("confidence") or "Medium", verification_status=r.get("verification_status", ""), cited_by=r.get("cites", 0), refs=r.get("refs", []),
        source_db=r.get("source_db", []), curated=bool(c) or r["study_id"] >= "S306", note=c.get("source_note") or r.get("note") or "", subjects=(r.get("cg_subjects") or [])[:8])
    rec["citation"] = citation(dict(r, authors=rec["authors"]))
    studies.append(rec)
SID = {s["id"]: s for s in studies}

# ---------- problems ----------
problems = []
for p in PROBLEMS:
    q = dict(p); q.update(record_type="Problem", id=p["problem_id"], title=p["problem_name"])
    q["source_ids"] = sorted({x for e in p["evidence"] for x in e["source_ids"]})
    q["study_ids"] = sorted([s["id"] for s in studies if p["problem_id"] in s["problem_ids"]])
    q["dataset_ids"] = sorted([d["dataset_id"] for d in DATASETS if p["problem_id"] in d["problem_ids"]])
    q["n_studies"] = len(q["study_ids"]); q["n_datasets"] = len(q["dataset_ids"])
    problems.append(q)
PID = {p["id"]: p for p in problems}

# ---------- datasets ----------
datasets = []
for d in DATASETS:
    q = dict(d); q.update(record_type="Dataset", id=d["dataset_id"], title=d["name"], last_verified=TODAY)
    linked = sorted(set(d.get("study_ids", [])) | {s["id"] for s in studies if d["dataset_id"] in s["dataset_ids"]})
    q["study_ids"] = [x for x in linked if x in SID]
    for sid in q["study_ids"]:
        if d["dataset_id"] not in SID[sid]["dataset_ids"]: SID[sid]["dataset_ids"].append(d["dataset_id"])
    q["citation"] = f"{d['name']} - {d['producer']} - {d['geography']}, {d['start_date']} to {d['end_date']} - {d['source_url'] or 'access URL not available'}"
    datasets.append(q)

# ---------- interventions & benchmarks ----------
interventions = []
for i in INTERVENTIONS:
    q = dict(i); q.update(record_type="Intervention", id=i["intervention_id"], title=i["name"]); q["evidence_ids"] = [x for x in i["evidence_ids"] if x in SID]; interventions.append(q)
benchmarks = []
for b in BENCHMARKS:
    q = dict(b); q.update(record_type="Benchmark", id=b["benchmark_id"], title=f"{b['country']}: {b['intervention']}"); benchmarks.append(q)
gaps = []
for g in GAPS:
    q = dict(g); q.update(record_type="Gap", id=g["gap_id"]); gaps.append(q)

# ---------- projects with transparent scoring ----------
projects = []
for p in PROJECTS:
    q = dict(p); q.update(record_type="Project", id=p["project_id"])
    sc = p["scores"]
    q["impact_index"] = round(sum(sc[k] for k in IMPACT_KEYS) / len(IMPACT_KEYS), 2)
    q["feasibility_index"] = round(sum(sc[k] for k in FEAS_KEYS) / len(FEAS_KEYS), 2)
    q["score"] = round(q["impact_index"] * q["feasibility_index"], 2)
    projects.append(q)
projects.sort(key=lambda x: (-x["score"], -x["scores"]["novelty"], -x["scores"]["data_reliability"]))
for i, p in enumerate(projects):
    p["rank"] = i + 1; p["top5"] = i < 5; p["is_top1"] = i == 0
    if p["id"] in TOP5: p["design"] = TOP5[p["id"]]

# ---------- relationships ----------
edges = []
def E(src, rel, tgt, evidence="", conf="Medium", url="", origin="curated"):
    edges.append(dict(source_id=src, relationship_type=rel, target_id=tgt, evidence=evidence, confidence=conf, source_url=url, origin=origin))
for s in studies:
    for p in s["problem_ids"]: E(s["id"], "studies problem", p, "Problem link " + s["problem_link_source"], "High" if s["problem_link_source"] == "curated" else "Low", s["original_url"], s["problem_link_source"])
    for d in s["dataset_ids"]: E(s["id"], "uses dataset", d, "Dataset named in curated record or abstract", "Medium", s["original_url"], "curated/auto")
    for i in s["intervention_ids"]: E(s["id"], "evidence on intervention", i, "Listed as evidence in implementation audit", "Medium", s["original_url"])
doi2id = {s["doi"]: s["id"] for s in studies if s.get("doi")}
cites = 0
for s in studies:
    for ref in s.get("refs", []):
        if ref in doi2id and doi2id[ref] != s["id"]:
            E(s["id"], "cites / builds on", doi2id[ref], "Crossref reference list", "High", s["original_url"], "crossref-references"); cites += 1
CUR_EDGES = [
 ("S234", "published version of", "S200", "Same analysis; journal version of IFPRI working paper"), ("S174", "published version of", "S140", "Journal version of IFPRI working paper on rice mills and COVID-19"),
 ("S140", "same analysis as", "S141", "Working paper and research note on the same rice-mill survey"), ("S320", "published version of", "S166", "World Development version of IFPRI paper"),
 ("S263", "contradicts (partially)", "S119", "Combine use not associated with higher paddy margins (S263) vs mechanized post-harvest +30-50% net income in a field experiment (S119); different designs and outcomes"),
 ("S263", "extends", "S162", "Adds seasonality of combine outsourcing"), ("S192", "extends", "S162", "Mechanization fees and plot-size productivity"), ("S269", "extends", "S200", "Conflict channel through fertilizer"),
 ("S082", "challenges assumption in", "S071", "Subsidised credit did not raise yields (fuzzy RDD), though credit access is widely believed to constrain productivity"),
 ("S158", "qualifies (differs from)", "S090", "Central Myanmar farmers (S158) applied more fertilizer than reported national averages, while lower-Myanmar benchmark farms (S090, 2010) reached top yields with only 40 kg N/ha; different regions and periods, so treat fertilizer-use levels as contested"),
 ("S255", "internal inconsistency flagged", "S184", "S255 text says dry-season fertilizer use slipped in 2022 while its table shows +31.2% (2020-2022); S184 reports -6% for 2022 vs 2021"),
 ("S306", "contests", "S008", "SRI yield advantage over best management questioned in empirical synopsis"), ("S189", "corroborates", "S029", "Both find large Myanmar yield gaps"),
 ("S299", "extends", "S139", "From seed demand to shock-resilient seed access"), ("S301", "corroborates", "S302", "More broadcasting linked to lower productivity"), ("S302", "updates", "S252", "Next monsoon assessment (2025 vs 2023)"),
 ("S252", "updates", "S215", "Next monsoon assessment"), ("S215", "updates", "S183", "Next monsoon assessment"), ("S217", "updates", "S184", "Next dry-season assessment"), ("S253", "updates", "S217", "Next dry-season assessment"), ("S281", "updates", "S253", "Next dry-season assessment"),
 ("S155", "same research programme", "S163", "JIRCAS coastal Myanmar WII project (Paddy and Water Environment 2021)"), ("S153", "same research programme", "S163", "JIRCAS WII project"), ("S156", "same research programme", "S163", "JIRCAS WII project"), ("S148", "same research programme", "S163", "JIRCAS WII project"), ("S143", "same research programme", "S163", "JIRCAS WII project"),
 ("S254", "extends", "S060", "Regional Sentinel-based cropping intensity mapping"), ("S251", "uses similar method", "S060", "Satellite rice monitoring"), ("S262", "same intervention as", "S259", "Village Link DCAS evaluation"), ("S298", "scales", "S230", "DCAS pilot to 139,000 farmers"),
 ("S267", "tests comparable intervention to", "S112", "RCM in India vs Myanmar RCM prototype"), ("S186", "evaluates", "S079", "BMP adoption effects in Bago"), ("S297", "validates data used by", "S302", "Bias assessment of MAPS wage data"),
]
for a, rel, b, ev in CUR_EDGES:
    if a in SID and b in SID: E(a, rel, b, ev, "High", SID[a]["original_url"])
for i in interventions:
    for p in i["problem_ids"]: E(i["id"], "addresses", p, i["name"], "Medium")
for b in benchmarks:
    for p in b["problem_ids"]: E(b["id"], "comparable solution for", p, b["transferability"] + ": " + b["transfer_reason"], b["confidence"])
    for s in b["source_ids"]:
        if s in SID: E(s, "evidence for benchmark", b["id"], "Source of benchmark figures", b["confidence"], SID[s]["original_url"])
E("B08", "comparable to", "I03", "India RCM trials vs Myanmar RCM prototype", "High"); E("B03", "comparable to", "I02", "Mechanized seeding vs drum seeders in BMPs", "Medium"); E("B11", "comparable to", "I06", "Implemented insurance vs proposed index insurance", "Medium")
for g in gaps:
    for p in g["problem_ids"]: E(g["id"], "gap in", p, g["title"], "Medium")
    for s in g["evidence_ids"]:
        if s in SID: E(s, "leaves gap", g["id"], g["description"], "Medium", SID[s]["original_url"])
for p in projects:
    for x in p["problem_ids"]: E(p["id"], "targets problem", x, p["title"], "High")
    for x in p["dataset_ids"]: E(x, "enables project", p["id"], "Required/available dataset", "Medium")
    for x in p["gap_ids"]: E(p["id"], "addresses gap", x, "", "Medium")
    for x in p["intervention_ids"]: E(p["id"], "builds on intervention", x, "", "Medium")
    for x in p["benchmark_ids"]: E(p["id"], "learns from", x, "", "Medium")
for d in datasets:
    for p in d["problem_ids"]: E(d["id"], "measures problem", p, "Dataset variables relevant to problem", "Medium", d["source_url"])

# ---------- claims (provenance) ----------
claims = []
for p in problems:
    for j, e in enumerate(p["evidence"]):
        claims.append(dict(claim_id=f"{p['id']}-C{j+1}", record_id=p["id"], claim=e["claim"], source_ids=e["source_ids"], evidence_type="Problem evidence", verification_status="Source located and read (abstract/summary)" + (" - " + e["note"] if e.get("note") else ""), confidence=e["confidence"], last_verified=TODAY))
for b in benchmarks:
    for j, t in enumerate(b["impact"]):
        claims.append(dict(claim_id=f"{b['id']}-C{j+1}", record_id=b["id"], claim=t, source_ids=b["source_ids"], evidence_type="Benchmark outcome", verification_status="Source located and read (page summary)", confidence=b["confidence"], last_verified=TODAY))
for i in interventions:
    for j, t in enumerate(i["outcomes"]):
        claims.append(dict(claim_id=f"{i['id']}-C{j+1}", record_id=i["id"], claim=t, source_ids=i["evidence_ids"], evidence_type="Implementation outcome", verification_status="Source located", confidence=i["confidence"], last_verified=TODAY))

# ---------- sources registry ----------
sources = [dict(source_id=s["id"], kind="Study", citation=s["citation"], url=s["original_url"], doi=s["doi"], tier=s["source_tier"], verification_status=s["verification_status"]) for s in studies]
sources += [dict(source_id=d["id"], kind="Dataset", citation=d["citation"], url=d["source_url"], doi="", tier=d["tier"], verification_status=d["verified"]) for d in datasets]

# ---------- charts data ----------
psd = json.load(open(f"{ROOT}/raw/psd_rice_8.json"))
wfp = json.load(open(f"{ROOT}/raw/wfp_rice_summary.json"))
charts = dict(psd=psd, psd_note="USDA PSD rice: Yield = t/ha rough basis; Production = 1000 t milled; latest market year is a forecast. Downloaded " + TODAY,
              wfp=wfp, wfp_note="WFP retail Rice (low quality), MMK/kg, national median across reporting markets; market panel changes over time. Downloaded from HDX " + TODAY)

# ---------- series (collapsed report series) ----------
series_out = [dict(series_id=k, name={"rice_millers": "IFPRI monitoring: Rice millers survey rounds", "food_price_reports": "IFPRI Myanmar monthly food price reports", "input_ret": "IFPRI monitoring: Agricultural input retailers rounds",
          "traders": "IFPRI monitoring: Crop/commodity traders rounds", "mech_sp": "IFPRI monitoring: Mechanization service providers rounds", "equip_ret": "IFPRI monitoring: Agricultural equipment retailers rounds"}[k],
          items=[dict(title=x["title"], year=x.get("year"), doi=x.get("doi"), url=("https://doi.org/" + x["doi"]) if x.get("doi") else (("https://hdl.handle.net/" + x["handle"]) if x.get("handle") else "")) for x in v]) for k, v in series.items()]

# ---------- methodology / coverage ----------
cr_log = json.load(open(f"{ROOT}/raw/crossref_log.json")); cg_log = json.load(open(f"{ROOT}/raw/cgspace_log.json"))
sel = json.load(open(f"{ROOT}/raw/selected.json"))
excl_reasons = collections.Counter(r.get("exclude_reason", "") for r in sel["excluded"])
method = dict(
    search_date=TODAY,
    sources_searched=[dict(name="Crossref REST API", role="Primary bibliographic search (titles, DOIs, abstracts where deposited, reference lists)", queries=len(cr_log), records=3632, status="Completed"),
                      dict(name="CGSpace (CGIAR repository) DSpace API", role="Grey literature from IFPRI, IRRI, IWMI, CCAFS, WorldFish with abstracts", queries=len(cg_log), records=1807, status="Completed"),
                      dict(name="Semantic Scholar Graph API", role="Abstract back-fill for DOIs lacking abstracts", queries="batch", records="72 abstracts", status="Completed (rate-limited)"),
                      dict(name="Europe PMC REST API", role="Planned abstract source", queries=1, records=1, status="Unavailable during search (HTTP 503); used for one record"),
                      dict(name="OpenAlex", role="Planned citation chaining", queries=0, records=0, status="Unavailable (daily API budget exhausted for shared IP)"),
                      dict(name="Harvard Dataverse, HDX, World Bank Microdata, USDA PSD", role="Dataset discovery and verification", queries="targeted", records="see Dataset Explorer", status="Completed"),
                      dict(name="Web search + page reading", role="Neighbour-country benchmarks and grey literature without DOIs", queries=30, records=14, status="Completed")],
    crossref_queries=cr_log, cgspace_queries=cg_log,
    inclusion=["Published 2000-2026", "Myanmar (or Burma/Ayeyarwady/Irrawaddy or a Myanmar state/region) in title, or Myanmar in abstract/coverage metadata for CGSpace", "Rice/paddy in title, abstract, or rice-relevant agricultural topic with rice in abstract", "Benchmark studies from Thailand, Vietnam, Bangladesh, India, China, Cambodia, Laos added by targeted search"],
    exclusion=["Colonial-era economic history (pre-1948 subject matter)", "Not agriculture (e.g., health, displacement narratives)", "Not Myanmar (false positives such as Karnataka 'dry zone', Philippines 'Bago')", "Duplicates (DOI, normalised title), Burmese-language duplicates of English reports, preprints with published versions", "News briefings and book reviews"],
    flow=dict(crossref_unique=3632, crossref_title_screen_rice=173, crossref_title_screen_agri=271, cgspace_unique=1807, cgspace_candidates=125, merged_after_dedup=305, removed_full_text_qc=len(excluded_qc), targeted_additions=len(EXTRA) + 1,
              final_studies=len(studies), report_series_collapsed=sum(len(v["items"]) for v in series_out), with_abstract=sum(1 for s in studies if s["abstract"]), curated=sum(1 for s in studies if s["curated"])),
    exclusion_reasons=dict(excl_reasons), excluded_qc=excluded_qc,
    blind_spots=["Burmese-language literature was not systematically searched (no indexed Burmese-language database was reachable); Burmese terms are supported in the search box only", "Google Scholar not used (no API); some theses and university repository items (e.g., Yezin Agricultural University) may be missing",
                 "80+ records lack abstracts - their tags are title-only and their confidence is set to Low", "Automatic tags (problem, method, data type) are rule-based and imperfect; curated records are marked", "Full texts behind paywalls were not read; findings for those come from abstracts",
                 "OpenAlex citation chaining unavailable on search date; citation edges come from Crossref reference lists only (publisher-deposited references)", "Official Myanmar statistics after 2020 could not be accessed"],
    scoring=dict(impact_keys=IMPACT_KEYS, feasibility_keys=FEAS_KEYS, formula="Score = Impact index x Feasibility index (each the mean of its 1-5 criteria; max 25). Novelty is shown but used only as a tie-breaker, so technically novel projects are not rewarded unless impact and feasibility are high.",
                 criteria=CRIT),
    retrieval="Hybrid lexical retrieval: field-weighted BM25 + synonym/concept expansion (English and partial Burmese term map) + fuzzy token matching + query-intent parsing (years, regions, record type, resolution, implementation status). This is NOT embedding-based semantic search; the adapter interface allows an embedding or vector-database backend to be swapped in later.",
    confidence_rubric=["High: peer-reviewed journal or Tier-2 institution with abstract/method available", "Medium: conference/working paper, or curated with design caveats", "Low: no abstract available, low-scrutiny venue, before-after/no-counterfactual design, or not independently verified"],
    score_rubric="Problem scores (1-5): severity = magnitude x breadth of documented losses; evidence strength = number/quality of independent sources; data availability = open data at needed resolution; DS potential = whether analysis can change a decision; implementation gap = proven solutions not reaching farmers; data gap = missing measurement.")

kpis = dict(problems=len(problems), studies=len(studies), studies_with_links=sum(1 for s in studies if s["original_url"]), studies_with_datasets=sum(1 for s in studies if s["dataset_ids"]),
            iv_A=sum(1 for i in interventions if i["status"] == "A"), iv_B=sum(1 for i in interventions if i["status"] == "B"), iv_C=sum(1 for i in interventions if i["status"] == "C"), iv_D=sum(1 for i in interventions if i["status"] == "D"), iv_E=sum(1 for i in interventions if i["status"] == "E"),
            datasets=len(datasets), gaps_high=sum(1 for g in gaps if g["priority"] == "High"), projects=len(projects), edges=len(edges), cite_edges=cites)

out = dict(meta=dict(title="Myanmar Rice Research Intelligence", built=TODAY, scope="Myanmar rice agriculture 2000-2026; benchmarks: Thailand, Vietnam, Bangladesh, India, China, Cambodia, Laos", version="1.0"),
           kpis=kpis, studies=studies, problems=problems, datasets=datasets, interventions=interventions, benchmarks=benchmarks, gaps=gaps, projects=projects, relationships=edges, claims=claims, sources=sources, series=series_out, charts=charts, methodology=method)
for k in ["studies", "problems", "datasets", "interventions", "benchmarks", "gaps", "projects", "relationships", "claims", "sources", "series", "methodology"]:
    json.dump(out[k], open(f"{ROOT}/data/{k}.json", "w"), ensure_ascii=False, indent=1)
slim = dict(out)
slim["studies"] = [{k: v for k, v in s.items() if k not in ("refs",)} for s in studies]
open(f"{ROOT}/app/data.js", "w").write("window.RICE_DATA=" + json.dumps(slim, ensure_ascii=False, separators=(",", ":")) + ";")
print(json.dumps(kpis)); print("top5:", [(p["id"], p["score"]) for p in projects[:6]])
print("edge types:", collections.Counter(e["relationship_type"] for e in edges).most_common())
missing = [x for p in problems for e in p["evidence"] for x in e["source_ids"] if x not in SID and not x.startswith("D")]
print("missing source refs:", missing)
miss2 = [x for i in interventions for x in i["evidence_ids"] if x not in SID] + [x for b in benchmarks for x in b["source_ids"] if x not in SID] + [x for g in gaps for x in g["evidence_ids"] if x not in SID]
print("missing iv/bench/gap refs:", miss2)
import os; print("data.js KB", os.path.getsize(f"{ROOT}/app/data.js") // 1024)
