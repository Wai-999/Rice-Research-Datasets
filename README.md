# Myanmar Rice Research Intelligence

A traceable evidence map of Myanmar rice agriculture, 2000–2026. It runs from problems to studies, datasets, implemented interventions, neighbour-country solutions and research gaps, and ends in ranked data-analysis projects. Every number links back to its source record.

**Live site:** https://wai-999.github.io/Rice-Research-Datasets/
**Data files:** https://wai-999.github.io/Rice-Research-Datasets/data/

## What the app does

- **Search:** plain-language search across studies, problems, datasets, interventions, neighbour cases, gaps and projects. It is lexical retrieval (BM25 + synonyms + typo tolerance + intent parsing; Burmese terms such as မြေဩဇာ are mapped to English), **not** embeddings. Faceted filters show live counts.
- **Views:** Overview, Problems (symptom → immediate cause → root cause), Research (319-record literature table), Datasets (36 sources with access and coverage), Implementation (A–E audit of 22 interventions), Connections (focused graphs plus a text list), Countries (14 neighbour-country cases with transferability), Gaps, Projects (Impact × Feasibility ranking with adjustable weights) and Methodology.
- **Evidence inspector:** a detail panel for every record, with citation, original-source link, claim → source trace, and related records.
- **Exports and sharing:** CSV/JSON/citation exports, side-by-side compare, and deep links to any record, e.g. [`#countries/B10`](https://wai-999.github.io/Rice-Research-Datasets/#countries/B10).

## Research data

The app embeds the full database. The same tables are published as files in [`data/`](data/) (JSON is the source of truth; `data/csv/` holds flat exports with lists joined by `; `).

| Table | Records | IDs | Contents |
|---|---|---|---|
| `studies.json` | 319 | S001–S320 | Title, authors, year, DOI / original URL, objective, methods, findings, effect sizes, regions, linked problems/datasets/interventions, source tier, confidence, verification status |
| `problems.json` | 19 | P01–P19 | Definition, causal chain, evidence claims with sources, scope, impacts, scores, data availability |
| `datasets.json` | 36 | D01–D36 | Producer, variables, coverage, temporal/spatial resolution, access, licence, quality, limitations, links |
| `interventions.json` | 22 | I01–I26 | Status A at scale · B partial · C pilot · D proposed · E unknown; reach, outcomes, barriers, persistence, evidence |
| `benchmarks.json` | 14 | B01–B14 | Neighbour-country case: mechanism, cost, adoption, outcomes, why it worked, transferability to Myanmar |
| `gaps.json` | 12 | G01–G12 | Implementation / knowledge / data / technology / decision gaps |
| `projects.json` | 17 | PR01–PR17 | Scored data-analysis project candidates with full research designs |
| `relationships.json` | 1,558 | — | Typed edges between records, with evidence, confidence and origin |
| `claims.json` | 138 | — | Derived claims → record → source IDs → verification status |
| `sources.json` | 355 | — | Source registry with citations and tiers |
| `series.json`, `methodology.json` | — | — | Collapsed report series; search log, inclusion rules, scoring rubric |

**Honest limits:** this is not "all Myanmar rice research". It draws on Crossref, the CGIAR repository and targeted search. Burmese-language literature was not systematically searched. About 80 records without abstracts are tagged from titles only and marked Low confidence. Problem and project scores are analyst judgements on the published rubric. See [`docs/REPORT.md`](docs/REPORT.md) §17 and the app's Methodology view.

## Repository layout

| Path | Purpose |
|---|---|
| `app/` | Front-end source: `template.html`, `app.css`, `js/` (core, ui, views, graph, main) and the generated database `data.js` |
| `data/` | Published research tables (JSON + `csv/`) and pipeline intermediates (`_*.json`) |
| `scripts/` | `build_site.py` (site build), `export_csv.py`, and the research pipeline (`harvest_*` → `screen*` → `select` → `merge` → `tag` → `build` → `report`) |
| `raw/` | Small inputs the pipeline reads (screening results, logs, PSD/WFP extracts, validation results) |
| `tests/` | Playwright + pytest regression suite and a GitHub-Pages-like local server |
| `docs/` | Analytical report, UI bug-audit report, screenshots |
| `.github/workflows/pages.yml` | Build → test → deploy to GitHub Pages |

## Local development

The site build needs only Python 3.10+ (standard library).

```bash
python scripts/build_site.py                 # → _site/ (index.html, 404.html, data/)
python tests/pages_server.py _site           # preview at http://127.0.0.1:8000/Rice-Research-Datasets/
```

Run the tests (Chromium via Playwright):

```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
MRRI_SITE_DIR=_site python -m pytest tests -q          # full suite against the built site, served under the Pages base path
MRRI_BASE_URL=https://wai-999.github.io/Rice-Research-Datasets/ python -m pytest tests -q   # against the live site
python tests/screenshots.py                            # desktop + phone screenshots → tests/screens/
```

Edit the app in `app/` (never in `_site/`). To update the research data, rerun the pipeline: `scripts/build.py` regenerates `data/*.json` and `app/data.js`, `scripts/export_csv.py` regenerates `data/csv/`, and `scripts/report.py` regenerates the report. The large harvest dumps are not committed; rerun `scripts/harvest_crossref.py` and `scripts/harvest_cgspace.py` to recreate them. `python scripts/build_site.py --artifact` writes the single-file version used for the claude.ai artifact.

## Deployment

Every push to `main` builds the site, runs the full test suite against it, and deploys to GitHub Pages through GitHub Actions. Pull requests build and test without deploying. See [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Documentation

- [`docs/REPORT.md`](docs/REPORT.md): analytical report, ending with the #1 project recommendation and the full source registry.
- [`docs/BUG_AUDIT_REPORT.md`](docs/BUG_AUDIT_REPORT.md): UI/UX audit (31 defects fixed) and test coverage.

## Licence

No licence has been chosen for this repository yet. Third-party datasets referenced here keep their own terms (see the `license` field in `data/datasets.json`), and study records link to their original publishers.
