"""Export the published research tables (data/*.json) to flat CSV files in data/csv/.

The JSON files are the source of truth. Column order keeps the historical CSV layout and then
appends any field the earlier exports left out (e.g. Dataset `data_types`, `citation`; Problem
`time_impact`), so no published value is dropped. Lists are joined with "; ", findings with " | ".

Usage: python scripts/export_csv.py
"""
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA, OUT = ROOT / "data", ROOT / "data" / "csv"

# Historical column order (kept so existing users' spreadsheets don't break).
ORDER = {
    "benchmarks": "id,country,intervention,year,problem_ids,mechanism,cost,adoption,impact,why,conditions,transferability,transfer_reason,required_modification,source_ids,confidence",
    "claims": "claim_id,record_id,claim,source_ids,evidence_type,verification_status,confidence,last_verified",
    "datasets": "id,name,producer,tier,description,variables,unit,geography,spatial_resolution,temporal_resolution,start_date,end_date,update_frequency,access_method,api_available,download_format,license,cost,access_class,data_quality,missingness,methodology,known_limitations,source_url,documentation_url,last_verified,problem_ids,study_ids,verified",
    "gaps": "id,gap_type,title,description,problem_ids,evidence_ids,priority,data_availability",
    "interventions": "id,name,status,problem_ids,location,date,organization,farmers,area,outcomes,barriers,persistence,evidence_ids,confidence",
    "problems": "id,problem_name,problem_category,symptom_or_root_cause,problem_definition,symptom,immediate_causes,root_causes,geographic_scope,time_period,farmers_affected,area_affected,yield_impact,financial_impact,labor_impact,trend,existing_interventions,data_availability,data_science_potential,gap_ids,priority,confidence,source_ids,n_studies,n_datasets,score_severity,score_evidence_strength,score_data_availability,score_ds_potential,score_implementation_gap,score_data_gap",
    "projects": "rank,id,title,impact_index,feasibility_index,score,top5,problem_ids,dataset_ids,methods,user,decision,required_information,analysis,action,expected_outcome,gap_ids,intervention_ids,benchmark_ids,pathway,key_risk,score_importance,score_farmers_affected,score_economic_impact,score_yield_impact,score_labor_time_saving,score_data_availability,score_data_reliability,score_technical_feasibility,score_validation_feasibility,score_implementation_feasibility,score_novelty,score_scalability",
    "relationships": "source_id,relationship_type,target_id,evidence,confidence,source_url,origin",
    "studies": "id,title,year,authors,publication_type,journal_or_publisher,doi,original_url,geographic_area,regions,zones,countries,problem_ids,problem_link_source,methods,data_types,research_types,dataset_ids,intervention_ids,implementation_status,objective,objective_source,findings_text,findings_source,effect_sizes_text,sample_size,time_coverage,limitations,research_gap,source_tier,peer_review,confidence,verification_status,curated,cited_by",
}
# Fields appended after the historical columns (previously missing from the CSVs).
APPEND = {
    "datasets": ["data_types", "citation"],
    "problems": ["time_impact"],
    "studies": ["citation"],
}


def cell(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, list):
        return "; ".join(cell(x) for x in v)
    return str(v)


def derive(name, r):
    """Flatten nested structures into the CSV's derived columns."""
    o = dict(r)
    if name == "problems":
        cc = r.get("causal_chain") or {}
        o["symptom"] = cc.get("symptom", "")
        o["immediate_causes"] = cc.get("immediate_causes", [])
        o["root_causes"] = cc.get("root_causes", [])
    if name in ("problems", "projects"):
        for k, v in (r.get("scores") or {}).items():
            o["score_" + k] = v
    if name == "studies":
        o["findings_text"] = " | ".join(r.get("findings") or [])
        o["effect_sizes_text"] = " | ".join(f"{e.get('metric', '')}: {e.get('value', '')} ({e.get('context', '')})" for e in (r.get("effect_sizes") or []))
    return o


def export(name):
    rows = json.load(open(DATA / f"{name}.json", encoding="utf-8"))
    cols = ORDER[name].split(",") + APPEND.get(name, [])
    with open(OUT / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(cols)
        for r in rows:
            d = derive(name, r)
            w.writerow([cell(d.get(c)) for c in cols])
    return len(rows)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for n in ORDER:
        print(f"{n}.csv  {export(n)} rows")
