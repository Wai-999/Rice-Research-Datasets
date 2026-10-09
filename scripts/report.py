import pathlib as _pl
ROOT_DIR = str(_pl.Path(__file__).resolve().parents[1])  # repository root
"""Generate REPORT.md (analytical report, Section 53 structure) from the structured database so numbers stay consistent."""
import json, collections
R = ROOT_DIR + "/data"
L = lambda f: json.load(open(f"{R}/{f}.json"))
S, P, DS, IV, B, G, PR, E, C, SRC, M = [L(x) for x in ["studies", "problems", "datasets", "interventions", "benchmarks", "gaps", "projects", "relationships", "claims", "sources", "methodology"]]
SID = {s["id"]: s for s in S}; PID = {p["id"]: p for p in P}
psd = json.load(open(ROOT_DIR + "/raw/psd_rice_8.json")); wfp = json.load(open(ROOT_DIR + "/raw/wfp_rice_summary.json"))
val = json.load(open(ROOT_DIR + "/raw/validation.json"))
ST = {"A": "At scale", "B": "Partial", "C": "Pilot / experimental", "D": "Proposed only", "E": "Unknown"}
o = []
w = o.append
def refs(ids): return ", ".join(f"[{i}]" for i in ids)
def row(*c): return "| " + " | ".join(str(x).replace("|", "/").replace("\n", " ") for x in c) + " |"
top = PR[0]
mm = {r["year"]: r for r in psd["Myanmar"]}; vn = {r["year"]: r for r in psd["Vietnam"]}

w("# Myanmar Rice Research Intelligence — Analytical Report")
w(f"Built {M['search_date']}. Companion to the interactive app `myanmar-rice-research-intelligence.html` and the structured data in `data/`. Bracketed IDs ([S302], [D04], [P04]…) point to records in the app and in `data/sources.json`.\n")
w("> Scope: Myanmar rice agriculture 2000–2026, with benchmark evidence from Thailand, Vietnam, Bangladesh, India, China, Cambodia and Laos. This is a documented, partial sample of the literature, not \"all Myanmar rice research\" (see §17).\n")

w("## 1. Executive intelligence brief")
w(f"- **Corpus:** {len(S)} research records (Crossref + CGIAR repository + targeted search), {len(P)} evidence-verified problems, {len(DS)} datasets with checked access links, {len(IV)} Myanmar interventions audited A–E, {len(B)} neighbour-country cases, {len(G)} research gaps, {len(PR)} scored project candidates, {len(E):,} typed relationships.")
w(f"- **Productivity is stagnant and now falling.** USDA PSD rough-rice yield was {mm[2000]['Yield']} t/ha in 2000 and {mm[2024]['Yield']} t/ha in 2024 (Vietnam {vn[2024]['Yield']} t/ha) [D01]. National monsoon yields fell 8% in 2025 vs 2023 [S302]; exploitable yield gaps are relatively large in Myanmar [S189].")
w("- **The binding problem today is economic, not agronomic alone.** Between the 2023 and 2025 monsoons input spending per acre rose 63%, wages 83–88%, plowing 55%, urea 23%, while farmgate paddy fell 6% and profit per acre fell 40% to a six-year low [S302]. Fuel and urea prices jumped again in mid-2026 [S304]; the dual exchange rate acted as a ~24% export tax [S239].")
w("- **Conflict changed the production function.** Fatal violence cut rice TFP ~4% [S200]; it raised fertilizer prices, lowered use and lowered fertilizer use efficiency each year since 2021 [S269]; formal credit collapsed in conflict areas [S286].")
w("- **Labour scarcity is reshaping practice.** ~50% (monsoon) and ~75% (dry season) of farmers now direct-seed, mostly by broadcasting, because of labour and water constraints, with a perceived yield penalty [S301]. Market-driven mechanization scaled 2011–2020 [S162] but combine use fell 12 pp after 2020 [S252].")
w("- **Research-to-practice gap:** of 22 audited interventions, 3 reached scale (A), 3 partial (B), 12 stalled at pilot (C), 3 never left the proposal stage (D), 1 unknown (E). Weak or non-random evaluation is the most common barrier (13 interventions).")
w(f"- **#1 recommended project ({top['id']}, score {top['score']}/25):** {top['title']}. It closes a documented implementation gap (Myanmar's Rice Crop Manager stopped at a 2019 prototype [S112] while comparable advice raised yields 17–19% in India [S267]) using open panel data [D04] and an existing delivery channel that reached 139,000 farmers in 2025 [S298].\n")

w("## 2. State of Myanmar rice agriculture")
w("| Year | Area harvested (1000 ha) | Rough yield (t/ha) | Milled production (1000 t) | Exports (1000 t) |\n|---|---|---|---|---|")
for y in [2000, 2005, 2010, 2015, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]:
    r = mm[y]; w(row(f"{y}{' (forecast)' if y == 2026 else ''}", int(r["Area Harvested"]), r["Yield"], int(r["Production"]), int(r["Exports"])))
w("\nSource: USDA FAS PSD [D01], downloaded " + M["search_date"] + ". Market year 2026 is a forecast.\n")
w(f"Retail rice prices: WFP's monthly series (low-quality rice) runs {wfp['first']} to {wfp['last']} across {wfp['n_markets']} markets; the national median was {int(wfp['series'][-1]['median_mmk_kg']):,} MMK/kg in {wfp['series'][-1]['month']} [D06]. **No WFP markets exist in Ayeyarwady, Bago (West) or Nay Pyi Taw**, the core rice basket, so farmgate prices must come from MAPS [D04].\n")
w("Season-by-season evidence (IFPRI MAPS assessments): 2023 monsoon yields +7% with more fertilizer and fewer droughts [S252]; 2024 dry season real profits −15% [S253]; 2025 monsoon yields −8%, coastal zone −22% partly due to Rakhine's market isolation, and floods (10% of farmers, −34% yield when affected) [S302].\n")

w("## 3. Myanmar rice problem map")
w("Symptom → immediate cause → root cause is recorded per problem; \"low yield\" is treated as a symptom.\n")
w("| ID | Problem | Level | Severity | Evidence | Data avail. | Impl. gap | DS potential | Studies | Key sources |\n|---|---|---|---|---|---|---|---|---|---|")
for p in sorted(P, key=lambda p: -(p["scores"]["severity"] * 10 + p["scores"]["evidence_strength"])):
    s = p["scores"]; w(row(p["id"], p["problem_name"], p["symptom_or_root_cause"], s["severity"], s["evidence_strength"], s["data_availability"], s["implementation_gap"], s["ds_potential"], p["n_studies"], refs(p["source_ids"][:5])))
w("\nScores are 1–5 analyst judgements: " + M["score_rubric"] + "\n")
for p in [PID["P02"], PID["P04"], PID["P03"], PID["P05"]]:
    w(f"**{p['id']} {p['problem_name']}.** Symptom: {p['causal_chain']['symptom']}. Immediate: {'; '.join(p['causal_chain']['immediate_causes'])}. Root: {'; '.join(p['causal_chain']['root_causes'])}.")
    for e in p["evidence"][:4]: w(f"  - {e['claim']} {refs(e['source_ids'])}")
    w("")

w("## 4. 2000–2026 research landscape")
by5 = collections.Counter((s["year"] // 5) * 5 for s in S if s["year"] and "Myanmar" in s["countries"])
w("Myanmar records by period: " + "; ".join(f"{k}–{k+4}: {by5[k]}" for k in sorted(by5)) + ".")
pc = collections.Counter(p for s in S for p in s["problem_ids"])
w("Records per problem (curated + auto-tagged): " + "; ".join(f"{PID[k]['problem_name'].split('(')[0].strip()} {v}" for k, v in pc.most_common(8)) + ".")
mc = collections.Counter(m for s in S for m in s["methods"])
w("Most common methods: " + "; ".join(f"{k} ({v})" for k, v in mc.most_common(8)) + f". Randomized or quasi-experimental designs are rare ({mc.get('Randomized / causal design', 0)} records); optimization/OR is thin ({mc.get('Optimization / OR', 0)}).")
tc = collections.Counter(s["source_tier"] for s in S); cc = collections.Counter(s["confidence"] for s in S)
w(f"Source tiers: Tier 2 (FAO/IRRI/CGIAR/IFPRI/World Bank…) {tc[2]}, Tier 3 (peer-reviewed/university) {tc[3]}, Tier 4 {tc.get(4,0)}. Confidence: High {cc['High']}, Medium {cc['Medium']}, Low {cc['Low']}. Since 2021 the evidence base is dominated by IFPRI phone-panel work; independent academic field research inside Myanmar has thinned.\n")

w("## 5. Research evidence database")
w(f"`data/studies.json` holds all {len(S)} records with objective, methodology, findings, effect sizes, problems, datasets, interventions, limitations, tier, confidence and verification status. Curated records ({sum(1 for s in S if s['curated'])}) were written from abstracts/summaries read for this build; others carry auto-extracted objective and finding sentences (labelled as such). Key curated studies:\n")
for i in ["S302", "S252", "S269", "S200", "S239", "S301", "S162", "S263", "S192", "S090", "S114", "S119", "S299", "S286", "S262", "S060", "S155", "S082", "S158", "S189"]:
    s = SID[i]; w(f"- [{i}] {s['citation']} — *{s['objective']}* Findings: {'; '.join(s['findings'][:3])}")
w("")

w("## 6. Research connection map")
ec = collections.Counter(e["relationship_type"] for e in E)
w("Relationship types: " + "; ".join(f"{k} {v}" for k, v in ec.most_common()) + ". Citation edges come from Crossref reference lists.")
w("Notable curated relationships:")
for e in E:
    if e["origin"] == "curated" and e["relationship_type"] in ("contradicts (partially)", "challenges assumption in", "contests", "qualifies (differs from)", "internal inconsistency flagged", "published version of", "extends", "scales", "tests comparable intervention to"):
        w(f"- [{e['source_id']}] **{e['relationship_type']}** [{e['target_id']}]: {e['evidence']}")
w("")

w("## 7. Research-to-implementation audit")
w("| ID | Intervention | Status | Reach | Main reported outcome | Evidence |\n|---|---|---|---|---|---|")
for i in sorted(IV, key=lambda i: "ABCDE".index(i["status"])):
    w(row(i["id"], i["name"], f"{i['status']} · {ST[i['status']]}", i["farmers"], i["outcomes"][0] if i["outcomes"] else "–", refs(i["evidence_ids"][:4])))
w("")

w("## 8. Failure and non-adoption analysis")
import re
BAR = [("Data / weak evaluation", r"non-random|self-reported|counterfactual|evaluation|before-after|not independently|no evidence|no adoption|no deployment|no outcome|ground-truth|not quantified"), ("Conflict / insecurity", r"conflict|insecur|cut off"), ("Finance / cost", r"cost|financ|credit|subsid|investment|fiscal|fee"), ("Infrastructure / fuel", r"fuel|electric|infrastruct|drainage|canal|deliver"), ("Extension / training", r"extension|training|DoA|skill"), ("Technology / service availability", r"service|supply|seeder|providers|availability|machin"), ("Market incentives", r"price|market|incentive|volumetric")]
for name, rx in BAR:
    ids = [i["id"] for i in IV if re.search(rx, " ".join(i["barriers"]) + " " + i["persistence"], re.I)]
    w(f"- **{name}** ({len(ids)}): {', '.join(ids)}")
w("\nReadings: (1) most Myanmar interventions were never evaluated with a counterfactual, so \"success\" claims (e.g., digital advisories +20% yield, BCR 155:1 [S262]) should be treated as upper bounds; (2) the one clear at-scale success (mechanization outsourcing [I01]) was market-driven and is now eroded by fuel costs and insecurity [S252, S302]; (3) proven tools (Rice Crop Manager [I03], index insurance [I06]) stalled at prototype/proposal; (4) the Bangladesh AWD RCT shows that incentives (volumetric water pricing), not information, determined adoption [S128].\n")

w("## 9. Data landscape")
w("| ID | Dataset | Producer | Tier | Temporal | Spatial | Years | Access |\n|---|---|---|---|---|---|---|---|")
for d in DS: w(row(d["id"], d["name"], d["producer"], d["tier"], d["temporal_resolution"], d["spatial_resolution"], f"{d['start_date']}–{d['end_date']}", d["access_class"]))
w("\nPost-2021 uncertainty: official subnational production data are not public after 2020 [S251]; WFP price coverage misses the main rice regions [D06]; World Bank RTFP/RTFX series are model-imputed [D35, D36]; phone panels exclude phone-less households; satellite and administrative estimates are not merged in this database.\n")

d1 = top["design"]
w("## 10. Data acquisition plan (for the #1 project)")
w("Existing data:")
w("1. MAPS rounds 1–8 [D04] — Harvard Dataverse, register and accept IFPRI terms; DOIs: " + ", ".join(r[1] for r in next(d for d in DS if d["id"] == "D04")["rounds"]) + ".")
w("2. CHIRPS daily rainfall [D13] via Google Earth Engine (`UCSB-CHG/CHIRPS/DAILY`), aggregated to township-season totals and dry-spell counts.")
w("3. ACLED [D18] — register; count fatal events per township-season. 4. MIMU P-codes/boundaries [D19]. 5. SoilGrids [D17] as a coarse control. 6. Prices: MAPS farmgate and urea first; WFP/RTFP only to fill months.")
w("\nTo collect (pilot subsample):\n")
w("| Variable | Unit | Frequency | Sampling | Level | QC / validation | Expected bias | Missing-data risk |\n|---|---|---|---|---|---|---|---|")
for c in d1["collection_plan"]: w(row(c["variable"], c["unit"], c["frequency"], c["sampling"], c["level"], c["qc"] + "; " + c["validation"], c["bias"], c["missing_risk"]))
w("\nConversions to document before analysis: convert each fertilizer product to kg N using its labelled N content (urea is 46% N); convert paddy baskets/acre to t/ha using the basket weight documented by MAPS (verify against the questionnaire).\n")

w("## 11. Neighbour-country benchmark")
w("| ID | Country | Intervention | Adoption | Outcome | Transferability | Why / modification | Sources |\n|---|---|---|---|---|---|---|---|")
for b in B: w(row(b["id"], b["country"], b["intervention"], b["adoption"], "; ".join(b["impact"][:3]), b["transferability"], b["transfer_reason"], refs(b["source_ids"])))
w("\nNo foreign result is assumed to transfer; ratings are analyst judgements with stated reasons.\n")

w("## 12. Gap analysis")
for t in ["Implementation", "Knowledge", "Data", "Technology", "Decision"]:
    for g in [g for g in G if g["gap_type"] == t]:
        w(f"- **{g['id']} [{t}] {g['title']}** — {g['description']} Evidence: {refs(g['evidence_ids'])}. Priority {g['priority']}.")
w("")

w("## 13. Data-science opportunity matrix")
w(M["scoring"]["formula"] + "\n")
crit = M["scoring"]["criteria"]
w("| Rank | ID | Project | Impact | Feasibility | Score | " + " | ".join(c.replace("_", " ") for c in crit) + " |\n|" + "---|" * (6 + len(crit)))
for p in PR: w(row(p["rank"], p["id"], p["title"], p["impact_index"], p["feasibility_index"], p["score"], *[p["scores"][c] for c in crit]))
w("")

w("## 14. Top-5 project designs")
for p in PR[:5]:
    d = p["design"]
    w(f"### {p['rank']}. {p['id']} — {p['title']} (score {p['score']})")
    w(f"- **User → decision → information → analysis → action → outcome:** {p['user']} → {p['decision']} → {p['required_information']} → {p['analysis']} → {p['action']} → {p['expected_outcome']}")
    for k, lab in [("why_it_matters", "Why it matters"), ("research_question", "Research question"), ("hypothesis", "Hypothesis"), ("target", "Target population/location"), ("dependent", "Dependent variable"), ("baseline", "Baseline method"), ("advanced", "Advanced method (only if justified)"), ("validation", "Validation"), ("causal_note", "Prediction vs causation"), ("output", "Expected output"), ("intervention", "Intervention pathway"), ("end_user", "End user"), ("impact_measurement", "Impact measurement")]:
        w(f"- **{lab}:** {d[k]}")
    for k, lab in [("required_data", "Required data"), ("available_data", "Available data"), ("missing_data", "Missing data"), ("independent", "Independent variables"), ("confounders", "Confounders"), ("limitations", "Limitations"), ("risks", "Risks")]:
        w(f"- **{lab}:** {'; '.join(d[k]) if d[k] else '–'}")
    w(f"- **Evidence/gaps:** problems {refs(p['problem_ids'])}; gaps {refs(p['gap_ids'])}; datasets {refs(p['dataset_ids'])}; benchmarks {refs(p['benchmark_ids'])}\n")

w("## 15. #1 recommended project — the final question")
w("*If I am a developing data analyst / data scientist and can do only one project with a realistic chance of helping Myanmar rice agriculture, what should I work on?*\n")
w(f"**Work on {top['title'].lower()} ({top['id']}).**\n")
w("- **Why:** fertilizer is the largest commercial input; its economics deteriorated sharply (urea +23% and profits −40% between the 2023 and 2025 monsoons [S302]; urea +28–49% again in mid-2026 [S304]); conflict lowered fertilizer use efficiency every year since 2021 [S269]. Doubling fertilizer is associated with only ~9% more yield on average [S302], so the right rate depends strongly on prices and conditions — exactly where a data analyst adds value. Comparable decision tools work: +17–19% yield in Odisha on-farm trials [S267]; +11% yield with −15–18% N for 20.9 million Chinese farmers [S076]. Myanmar's own Rice Crop Manager stalled at a 2019 prototype [S112].")
w("- **What data:** MAPS rounds 1–8 [D04] (plot fertilizer, yields, prices, establishment method, shocks, township), CHIRPS [D13], ACLED [D18], SoilGrids [D17]; collect crop-cut yields and split-application dates in a pilot.")
w("- **What method:** start with zone × establishment-method yield-response curves and the economic optimum where marginal product × paddy price = urea price; then panel fixed effects / correlated random effects with a control function for endogenous N (as in [S269]); machine learning only if heterogeneity remains unexplained. Validate out of sample by round, against agronomic benchmarks (40 kg N/ha on top-yield farms in [S090]; ORYZA potentials in [S114]), and with a randomized A/B test of advice variants.")
w("- **What decision improves:** each farmer's N rate and timing per season, given the urea:paddy price ratio, zone and establishment method.")
w("- **How it reaches farmers:** seasonal lookup tables delivered through the Htwet Toe digital advisory platform (139,000 farmers across 10 commodities in 2025 [S298]; rice pilot with 5,000 Delta farmers [S230]) and DoA extension; impact measured as profit per acre and kg grain per kg N against control users.")
w("- **Honest limits:** MAPS yields are self-reported for the largest plot; soil N supply is unobserved; advice cannot fix fertilizer unavailability in cut-off areas such as Rakhine [S302]; DCAS impact claims so far are non-random [S262].\n")

w("## 16. Research roadmap (16 weeks)")
for wk, t in [("Weeks 1–2", "Register on Dataverse; download MAPS R1–R8; build a plot-level panel; document fertilizer and basket conversions; replicate IFPRI headline numbers for 2023 and 2025 monsoons as a pipeline check [S252, S302]."),
              ("Weeks 3–4", "Descriptive analysis: N rates, timing, price ratios and yields by zone, season, establishment method and conflict exposure; join CHIRPS and ACLED at township level."),
              ("Weeks 5–7", "Yield-response estimation: pooled quadratic/plateau → household FE/CRE → control function; heterogeneity by zone and establishment; robustness to weather and conflict."),
              ("Weeks 8–9", "Economic-optimum N bands by price ratio; sensitivity analysis; leave-one-round-out validation; compare to agronomic benchmarks [S090, S114]."),
              ("Weeks 10–11", "Write a 4-page bilingual (Burmese/English) brief and a lookup table; share with IFPRI's Myanmar team and an advisory provider."),
              ("Weeks 12–16", "Design a pre-registered A/B pilot: sample size, randomization unit, crop-cut protocol, consent and data-safety plan for conflict areas.")]:
    w(f"- **{wk}:** {t}")
w("")

w("## 17. Search methodology and coverage")
w(f"Search date {M['search_date']}. Sources: " + "; ".join(f"{s['name']} ({s['status']})" for s in M["sources_searched"]) + ".")
f = M["flow"]
w(f"Flow: Crossref {f['crossref_unique']} unique records → title screen {f['crossref_title_screen_rice']} (Myanmar + rice) + {f['crossref_title_screen_agri']} (Myanmar + agriculture) candidates; CGSpace {f['cgspace_unique']} unique → {f['cgspace_candidates']} candidates; merged/deduplicated {f['merged_after_dedup']}; removed at QC {f['removed_full_text_qc']}; targeted additions {f['targeted_additions']}; final {f['final_studies']} records ({f['with_abstract']} with abstracts, {f['curated']} curated); {f['report_series_collapsed']} survey-round reports collapsed into series.")
w("Inclusion: " + "; ".join(M["inclusion"]) + ". Exclusion: " + "; ".join(M["exclusion"]) + ".")
w("Known blind spots: " + "; ".join(M["blind_spots"]) + ".")
w("Retrieval in the app: " + M["retrieval"])
w(f"Validation ({val['date']}): {sum(q['ok'] for q in val['queries'])}/{len(val['queries'])} test queries returned a useful record in the top 5; " + "; ".join(c["t"] for c in val["checks"]) + ".\n")
w("Crossref queries: " + "; ".join(q["query"] for q in M["crossref_queries"]) + ".")
w("CGSpace queries: " + "; ".join(q["query"] for q in M["cgspace_queries"]) + ".\n")

w("## 18. Source registry")
for s in SRC: w(f"- [{s['source_id']}] {s['citation']} — Tier {s['tier']}; {s['verification_status']}")
open(ROOT_DIR + "/out/REPORT.md", "w").write("\n".join(o) + "\n")
print("REPORT lines", len(o))
