# Deployment

| | |
|---|---|
| Live URL | https://wai-999.github.io/Rice-Research-Datasets/ |
| Hosting | GitHub Pages, source = **GitHub Actions** |
| Workflow | [`.github/workflows/pages.yml`](.github/workflows/pages.yml) |
| Build command | `python scripts/build_site.py --base "/<repository-name>/"` (standard library only, no Node) |
| Output | `_site/`: `index.html`, `404.html`, `data/*.json`, `data/csv/*.csv`, `data/index.html` |
| Base path | `/Rice-Research-Datasets/` |
| Routing | Hash routes: `#<view>` and `#<view>/<record-id>`, e.g. `#countries/B10` |

## How a deployment runs

1. A push to `main` (or a manual **Run workflow**) starts *Build, test and deploy to GitHub Pages*.
2. **Build and test** job:
   - checks out the repo and sets up Python 3.13;
   - runs `scripts/build_site.py`;
   - installs `requirements-dev.txt` and Playwright's Chromium;
   - runs the full regression suite against `_site/`, served by `tests/pages_server.py` under the Pages base path, the same way GitHub Pages serves it.
3. If every test passes, the job uploads `_site/` as the Pages artifact.
4. **Deploy** job publishes the artifact with `actions/deploy-pages`. It is the only job with `pages: write` and `id-token: write`; everything else is read-only.

Pull requests to `main` run build + tests only. A failing test blocks deployment, and the previous site stays live.

## Why the site works on a sub-path

- The app is one self-contained page. CSS, JavaScript and the research database are inlined, so there are no `/assets/...` or `/data/...` paths to resolve. The only external requests are absolute `https://` URLs (Google Fonts, Cytoscape on cdnjs).
- Navigation uses the URL hash, so refreshing or opening any view or record link never asks the server for a missing path.
- `404.html` handles pretty paths. GitHub Pages serves it for any missing path; it rewrites `/Rice-Research-Datasets/<view>[/<record>]` to `/Rice-Research-Datasets/#<view>[/<record>]` and sends anything else to the app root.
- `build_site.py` stops the build on unreplaced template placeholders, root-relative `src`/`href`, `localhost`/`127.0.0.1`, `file://`, or developer-machine paths. It also stops if any embedded table's record count differs from `data/*.json`.
- The build wraps the app in a full document (`<!doctype html>`, `<meta charset>`, `<meta name="viewport">`, `lang`). Without the viewport tag, phones would lay the page out ~980 px wide. A mobile-emulation test guards this.

## Future deployments

Pushing to `main` redeploys automatically; nothing else is needed. To redeploy without a code change, open **Actions → Build, test and deploy to GitHub Pages → Run workflow**.

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `configure-pages` fails with "Get Pages site failed" / 404 | Pages is not enabled for Actions. **Settings → Pages → Build and deployment → Source: GitHub Actions**, then re-run the workflow. |
| Deploy job fails with a permissions or environment error | The `github-pages` environment's deployment branch rules must allow `main` (**Settings → Environments → github-pages**). |
| Tests fail in CI but pass locally | Run the same command locally: `python scripts/build_site.py && MRRI_SITE_DIR=_site python -m pytest tests -q`. Failures print the record, view and viewport involved. |
| Live site shows the old version | Pages caches for up to ~10 minutes; hard-refresh. Check the latest run's **Deploy** step URL. |
| A shared link like `/Rice-Research-Datasets/countries` 404s | `404.html` should redirect it; make sure `404.html` is in the deployed artifact (`_site/404.html`). |
| Repository renamed | Nothing to change: the workflow passes `/${{ github.event.repository.name }}/` as the base path, and the app is sub-path independent. |

## Verifying a deployment

```bash
MRRI_BASE_URL=https://wai-999.github.io/Rice-Research-Datasets/ MRRI_STRICT_NET=1 python -m pytest tests -q
```

This runs the same suite against the live site. `MRRI_STRICT_NET=1` also fails on any external resource that does not load.

## Production fixes found during the first deployment (2026-10-09)

| Issue | Cause | Fix | Guard |
|---|---|---|---|
| Phones would lay the page out ~980 px wide and zoom out | The app was authored for the claude.ai artifact host, which supplies the HTML document shell; served raw it had no `<!doctype>`, `<meta charset>` or `<meta name="viewport">` (quirks mode) | `build_site.py` wraps it in a complete standards-mode document | `test_real_mobile_device_emulation`, `test_document_shell_is_standards_mode_and_described` |
| Card text ran to ~244 characters per line on 1920 px screens | Result cards span the full column with no text measure | Card text blocks capped at the 1280 px measure (58 rem); layouts up to 1280 px unchanged | `test_card_text_keeps_a_readable_measure_on_wide_screens` |
| First workflow run failed at *Configure Pages* | GitHub Pages was not yet enabled for the repository | Pages source set to **GitHub Actions** | — |
| `ubuntu-latest` moves to Ubuntu 26 on 2026-10-19 | Playwright's `install --with-deps` supports known releases only | Jobs pinned to `ubuntu-24.04` | — |
