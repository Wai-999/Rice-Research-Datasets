# UI/UX bug audit & repair — Myanmar Rice Research Intelligence

Audit date: 2026-10-09 · Build audited: `myanmar-rice-research-intelligence.html` (single-file app, ~2 MB, 439 records)
Method: reproduce → locate → DOM + computed-CSS inspection → root cause → structural fix → edge cases → automated regression.
Engine: headless Chromium (Playwright). Firefox and WebKit were not available in the audit environment (see H).

**Result:** 31 defects logged (2 × P1, 13 × P2, 16 × P3; two of them were regressions introduced during the repair and caught by the new tests before delivery). All are fixed. The new 80-test regression suite passes 80/80 on the repaired build and fails 60/80 on the pre-audit build.

---

## A. Root cause of the screenshot bug (Neighbour case B10 — Thailand: Thai Rice NAMA)

**Observed.** In the inspector block “Problem → country → intervention → date → mechanism → cost → adoption → outcome”, labels (Myanmar problem, Period, Mechanism, Cost, Adoption) were painted underneath their values.

**Reproduced** in Chromium at every viewport (1440×900 and 390×844 shown in `screenshots/bug-B10-before-*.png`).

**Located.** `RENDER.Benchmark` in `app/js/ui.js` rendered the block as `<div class="es">` with alternating `<span>` label / `<b>` value children. The same component was used for Problem “Scope & impacts”, Dataset “Producer → …”, and Intervention “Implementation record”.

**DOM / computed CSS.**

| Measurement (B10, 1440 px) | Value |
|---|---|
| `.es` computed `grid-template-columns` | **`0px 507px`** |
| label `<span>` box width | **0 px** (scrollWidth 26–67 px) |
| value `<b>` box | x = 913, width 507 px |
| painted label text vs value text | overlap 52 × 39 px |

**Root cause.** `.es { grid-template-columns: minmax(0,1fr) auto }`. The value track is `auto`, which sizes to the value's max-content width. Long values (“Training, service providers, 50% subsidy for farmers”) claimed all the space, the `minmax(0,1fr)` label track collapsed to 0 px, and the labels overflowed and painted under the values. It was a short-pair component (built for numbers like effect sizes) being reused for long prose. The block also omitted the Country and Intervention rows its heading promises, and inserted problem names without HTML escaping.

**Fix (structural, no hiding or truncation).** Long label/value metadata is now a semantic definition list: `<dl class="meta-dl">` with one `<div class="meta-row"><dt>…</dt><dd>…</dd></div>` per field. Each row is its own grid, `minmax(6rem, 9.5rem) minmax(0, 1fr)`. The label track can't collapse, the value track can shrink, both wrap (`overflow-wrap: anywhere`), and multi-paragraph values keep their breaks (`white-space: pre-line`). A container query (`@container meta (max-width: 26rem)`) stacks label above value in narrow inspectors, with a media-query fallback. Empty values show “Not recorded” instead of a blank. The B10 chain now renders all eight fields in the heading's order: Myanmar problem (clickable, escaped) → Country → Intervention → Period → Mechanism → Cost → Adoption → Outcome. Country reads “Thailand”, never Myanmar.

**Scope of the same bug.** A sweep of all 439 records found it in 24 records at 1440 px and 48 at 360 px (every Problem, Dataset, Intervention and Neighbour-case record with a long value). After the fix: 0 at 320/390/768/1440 px.

**Regression test.** `test_thailand_b10_metadata_rows_never_overlap` runs at 14 viewport sizes. It asserts `previousRow.bottom <= nextRow.top`, that label width > 20 px, no clipping, and no painted-text intersection between label and value. It checks two columns at ≥1024 px, stacking at ≤430 px, field order, and Country = Thailand.

---

## B. Files changed

| File | Change |
|---|---|
| `app/app.css` | `.meta-dl` definition-list component; robust `.es` (`fit-content(50%)`); dialog states (inspector, filter drawer, modals: hidden + inert when closed, sticky headers, internal scroll, phone full-screen, `100dvh`); chips wrap; contrast tokens; card wrapping; `min(…,100%)` grids; card-table grid; toolbar label groups; `--hdr-h` sticky offsets; native search ✕ hidden (+81/−29 lines) |
| `app/js/ui.js` | `MR.metaList`, `MR.clip`, `MR.dialog` (focus trap, inert background, scroll lock, focus restore), `MR.openModal`; inspector rewritten as modal dialog with history; safe `MR.highlight`; Benchmark/Problem/Dataset/Intervention renderers; compare location fix; `role="img"` score dots (+124/−27) |
| `app/js/main.js` | pushState history and `#view/RECORD` deep links, popstate; Escape via dialog stack; filter drawer as dialog; `lang`; header-height observer; Space on table rows; `/` shortcut guard (+44/−11) |
| `app/js/core.js` | typo matching on whole words (surface vocabulary) (+22/−7) |
| `app/js/views.js` | word-boundary clipping; full dataset chip names; toolbar label groups; matrix glyphs + aria-labels (+15/−15) |
| `app/js/graph.js` | text alternative list of graph connections; focus after navigation (+12/−4) |
| `app/template.html` | inspector `role="dialog"`, `aria-modal`, `inert`; filters `div role="complementary"`; `aria-expanded` (+5/−5) |
| `raw/validation.json` | search-validation row for “fertiliser optimisaton” updated (now typo-corrected; 103 results) + audit check line |
| `tests/` (new) | `conftest.py`, `test_layout.py`, `test_dialogs.py`, `test_search_filters.py`, `test_a11y.py`, `audit_lib.js`, `stress_fixtures.js`, `screenshots.py` |

The visual identity (palette hues, type, spacing scale, ledger layout) is unchanged. Three colour tokens were darkened or lightened within the same hue to meet WCAG AA.

---

## C. Bug log

| ID | Sev | Route / component | Reproduction | Root cause | Fix | Regression test | Status |
|---|---|---|---|---|---|---|---|
| BUG-001 | P1 | Countries → B10 inspector (`RENDER.Benchmark`, `.es`) | Open B10; labels sit under values | `.es` `auto` value track → label track 0 px | Semantic `dl.meta-dl` rows, container-query stacking | `test_thailand_b10_metadata_rows_never_overlap` ×14 | Fixed |
| BUG-002 | P1 | Problem / Dataset / Intervention / Neighbour inspectors | Sweep: 24 records @1440, 48 @360 | Same as BUG-001 | Same component everywhere | `test_every_record_in_inspector_is_clean` (439 records × 4 widths) | Fixed |
| BUG-003 | P2 | B10 chain block | Heading lists Country, Intervention, Outcome; rows missing / outcome elsewhere; names unescaped | Partial field mapping | Eight rows in heading order; escaped clickable problem links | B10 test (labels, order, Country=Thailand) | Fixed |
| BUG-004 | P2 | Problem & Dataset inspectors | `time_impact`, `data_types` never shown | Fields not mapped | Rows added; “Not recorded” for empties | Stress test (empty values) | Fixed |
| BUG-005 | P2 | Effect sizes, scores, DOI rounds (`.es`) | Long effect value squeezes metric | Same `auto` track | `minmax(0,1fr) fit-content(50%)`, children wrap | Stress S269 | Fixed |
| BUG-006 | P2 | Inspector (closed) | Tab from page reaches off-canvas Close/links; `aria-hidden` on focusable content | Hidden only by `transform` | `visibility:hidden` after transition + `inert` | `test_closed_inspector_and_drawer_are_not_focusable` | Fixed |
| BUG-007 | P2 | Inspector (open) | Tab escapes behind scrim; page scrolls behind; focus lost on close | No dialog semantics / trap / restore | `role=dialog`, `aria-modal`, labelled by title; focus trap; inert background; scroll lock; focus restore | `test_inspector_is_a_modal_dialog` ×2 | Fixed |
| BUG-008 | P2 | Search filter drawer (≤860 px) | Closed drawer focusable; no focus move or restore; stays open if viewport grows; header scrolls away | Off-canvas transform only | Dialog while open, `aria-expanded`, sticky header, closes on breakpoint change | `test_mobile_filter_drawer` ×2, `test_drawer_closes_when_viewport_grows` | Fixed |
| BUG-009 | P2 | Export / Compare modals | No initial focus, trap or restore; Close scrolls away; cramped on phones | Ad-hoc modal markup | `MR.openModal`: sticky header, scrolling body, full-screen ≤600 px, backdrop close | `test_export_modal` ×2, `test_compare_modal_isolation_and_locations` | Fixed |
| BUG-010 | P2 | Routing | Browser Back leaves the app; no record links | `replaceState` only | pushState per view, `#view/ID` deep links, popstate, Close steps back | `test_browser_back_forward_and_deep_links`, `test_deep_link_…`, `test_navigation_from_inspector_…` | Fixed |
| BUG-011 | P2 | Search highlighting | Query “amp” → `&<mark>amp</mark>;` | Regex run over already-escaped HTML | Tokenise raw text, escape slices | `test_search_is_injection_safe_…` | Fixed |
| BUG-012 | P2 | Search typo tolerance | “fertiliser optimisaton” ignores 2nd word (built-in example) | Fuzzy matched against stems (`optim`) | Whole-word surface vocabulary → stems | `test_search_states` | Fixed |
| BUG-013 | P2 | Theme tokens | `--ink-3` 3.96:1 on bg, 3.37:1 on tints; gold 4.27:1; dark muted 4.1:1; zero facets at 45% opacity | Token values | `#56635A`, `#8A5F09`, dark `#9AA89E`; zero options keep text colour | `test_text_contrast_meets_wcag_aa` light + dark | Fixed |
| BUG-014 | P3 | Countries matrix | Transferability shown by cell colour only | Colour-only encoding | Glyph (✓ ~ ! ×) + aria-label; legend glyphs | `test_status_is_never_color_only` | Fixed |
| BUG-015 | P3 | Chips (filters, interpretation, tags) | Long chips cut with “…” | `nowrap` + `ellipsis` | Chips wrap | `ellipsized()` checks in view/stress tests | Fixed |
| BUG-016 | P3 | Countries cards @320 px | 26 px horizontal page scroll | `minmax(330px,1fr)` | `minmax(min(330px,100%),1fr)` (+3 other grids) | `test_views_…` @320 | Fixed |
| BUG-017 | P3 | Result cards | Unbreakable URL → 217 px page scroll @320 (stress) | Flex item min-content | `overflow-wrap:anywhere`, `min-width:0` | `test_stress_content` | Fixed |
| BUG-018 | P3 | Projects weight sliders | “implementation feasibility” overlaps slider | 72 px label track | Label row above slider + value | `test_views_…` 1280/1440 | Fixed |
| BUG-019 | P3 | Phone card-tables | Multiple pills placed into label column | **Introduced in this audit** (td → grid) | `td>*{grid-column:2}` | `test_views_…` @390 problems | Fixed |
| BUG-020 | P3 | Research / Datasets toolbars (phone) | Filter input ~40 px wide | `flex:1` with no basis | `flex:1 1 14rem` | `test_phone_filter_inputs_are_usable` | Fixed |
| BUG-021 | P3 | Toolbars (phone) | Label at line end, its select on the next line | Label and control wrap separately | `.tgrp` label + control groups | `test_toolbar_labels_stay_beside_their_controls` ×3 | Fixed |
| BUG-022 | P3 | Main search box | Native ✕ and “Clear” both shown | `type=search` default | Native cancel hidden (fields without Clear keep it) | stylesheet assertion in phone test | Fixed |
| BUG-023 | P3 | Cards, tables, graph selects | “D04 Myanmar Agricultural Performance S”; objectives cut mid-word | `.slice(0,n)` without ellipsis | `MR.clip` (word boundary + “…”); full chip names; full text in inspector | `test_summaries_are_clipped_at_word_boundaries` | Fixed |
| BUG-024 | P3 | Inspector paragraphs | Multi-paragraph text merged | Whitespace collapsed | `white-space: pre-line` | `test_multi_paragraph_values_…` | Fixed |
| BUG-025 | P3 | Compare modal | Records with no location shown as “Myanmar” | Fallback literal | `country` / `countries` fields; “–” fallback | compare test (B10 = Thailand) | Fixed |
| BUG-026 | P3 | Sticky header | Filter column offset hard-coded 110 px; project detail scrolls under header | Fixed offsets | `--hdr-h` via ResizeObserver + `scroll-padding-top` | `test_scroll_targets_land_below_sticky_header` ×2 | Fixed |
| BUG-027 | P3 | Document / score dots | No `lang`; `aria-label` on generic span not announced | Missing semantics | `lang="en"` if absent; `role="img"` on dots | `test_landmarks_language_and_ids`, name test | Fixed |
| BUG-028 | P3 | Connections graph | Canvas-only graph unusable by keyboard / screen reader | No text alternative | “List these connections as text” | `test_graph_modes_size_and_controls` | Fixed |
| BUG-029 | P3 | Clickable table rows | Space did nothing | Only Enter handled | Enter and Space | `test_research_table_sort_and_keyboard_rows` | Fixed |
| BUG-030 | P3 | “/” shortcut | Fired with modifiers or behind a dialog (focus to inert input) | No guard | Guarded | — (trivial) | Fixed |
| BUG-031 | P2 | Scrim | Click outside no longer closed inspector | **Introduced in this audit** (scrim made inert) | Scrim excluded from inert set | `test_scrim_click_closes_and_restores_focus` | Fixed |

---

## D. Structural fixes (not patches)

1. **One metadata component.** Every long label/value block uses `MR.metaList` → `<dl class="meta-dl">`. It has a guaranteed label track, a shrinkable value track, container-query stacking, “Not recorded” for missing values, and preserved paragraphs.
2. **One dialog system.** `MR.dialog` is a stack that manages the focus trap, inert background, scroll lock, Escape and focus restore (with a selector fallback when the opener has been re-rendered). It's used by the inspector, the phone filter drawer, and the export and compare modals. Closed panels are `visibility:hidden` + `inert`, not merely off-screen.
3. **Real navigation history.** Views and records are addressable (`#countries/B10`). Back and Forward work. Programmatic navigation never leaves dangling history entries.
4. **Safe text pipeline.** Highlighting escapes raw text slices. Summaries are clipped only at word boundaries with an ellipsis, and the full text is always one click away.
5. **Layout primitives that can't overflow.** `min(…,100%)` in auto-fill grids, `min-width:0` on grid and flex children, `overflow-wrap:anywhere` where user data appears, label + control groups in toolbars.

---

## E. Tests

`tests/` — Playwright + pytest, 80 tests, about 5 minutes. Run with `python -m pytest tests -q`; `python tests/screenshots.py` writes the screenshot pass.

| Area | What is checked |
|---|---|
| Geometry library (`audit_lib.js`) | Sibling overlaps measured on **painted text**, not just boxes (so text spilling from a 0 px track is caught); collapsed boxes; content wider than its box; content beyond the container edge; ellipsis-hidden text; page horizontal overflow |
| Reported bug | B10 rows at 14 viewport sizes (`previousRow.bottom <= nextRow.top`, no label/value ink intersection, two-column vs stacked) |
| Whole dataset | All 439 inspector records × 4 widths; all 11 views × 14 viewport sizes |
| Stress fixtures (`stress_fixtures.js`) | ~250-character titles; 3–5-line and multi-paragraph values; 200+-character unbreakable URL; missing fields; empty arrays; 12 outcomes / findings / barriers; 20 variables; long facet labels; 12 simultaneous filters; 7-digit counts; Burmese and mixed Burmese/English |
| Dialogs | Semantics, initial focus, Tab / Shift+Tab trap, inert background, scroll lock, Escape, scrim click, focus restoration, sticky headers, phone full-screen, viewport-change closing |
| Navigation | Back / Forward across views and records, deep links, Close stepping back, focus after navigating from the inspector |
| Search | Empty, normal, long, typo, no-result + recovery, Burmese, rapid typing, clear, reload persistence, HTML-injection query, entity-safe highlighting, latency |
| Filters | For every facet, selecting a value yields exactly the count shown; chip removal; Clear all; no duplicate chips; keyboard toggling keeps focus |
| Tables / graph / links | Sort direction; Enter and Space row activation; all 5 graph modes have size > 0 and no control overlap; canvas follows resize; text alternative; external links use `_blank` + `noopener`, never `undefined` / `null` |
| Accessibility | `lang`, landmarks, unique ids per view, accessible names for every control, WCAG AA text contrast in light **and** dark themes, visible focus ring, non-colour status, reduced motion |
| Console | Every test fails on any console or page error |

**Before → after:** pre-audit build 20/80 pass (60 fail); repaired build **80/80 pass**. The search-validation set (28 queries) still has 28/28 useful top-5 results.

---

## F. Responsive results

All 11 views plus every inspector record were checked at **320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080**, plus short screens **1280×500, 390×500**: 0 overlaps, 0 collapsed labels, 0 overflowing boxes, 0 horizontal page scroll.
Before the repair: the B10 test failed at all 14 sizes, and the view sweep failed at 8 of them (Countries at 320 px with 26 px of horizontal scroll; Projects weight labels; card-table cells on phones).

The inspector shows two-column rows from about 26 rem of content width (desktop side panel, tablets) and stacked rows on phones. The phone filter drawer and modals are full-screen with sticky headers.

## G. Accessibility results

- Dialog semantics, focus trap and restore, and inert background for the inspector, filter drawer and modals. Closed panels are unreachable by Tab (verified with an 80-step Tab walk).
- WCAG AA contrast: 0 failing text elements across 11 views and 5 inspector types, in light and dark themes. Before: failures in both themes.
- Every interactive control has an accessible name at desktop and phone sizes. Score dots are announced (“3 of 5”). Transferability is shown by text or glyph, not colour alone.
- Keyboard: Enter and Space on rows; `/` focuses search; Escape closes the top-most surface; focus ring is 2 px.
- `prefers-reduced-motion` removes panel animation.
- Browser zoom 125 / 150 / 200 % (equivalent CSS viewports 1024×640, 853×533, 640×400) and 400 % reflow (320 px): no overlap, no horizontal scroll.
- The graph canvas has a text alternative listing every connection.

## H. Remaining limitations

1. **Cross-browser:** only Chromium was available. Firefox and WebKit/Safari were not run. Set `MRRI_BROWSERS=chromium,firefox,webkit` to run the suite in them where installed. Features used and their fallbacks: `inert` (Safari 15.5+, Firefox 112+; `visibility:hidden` also covers closed panels), container queries (Safari 16+, Firefox 110+; `@supports` media-query fallback), `dvh` (falls back to `100%`).
2. **Fonts:** Google Fonts were unreachable in the audit sandbox, so geometry was measured with fallback fonts. The detector clamps text metrics to line boxes so font differences can't hide or invent overlaps, but a final visual pass with the real IBM Plex / Source Serif fonts is recommended.
3. **Not tested:** real touch devices and iOS Safari address-bar resizing; screen readers (NVDA, VoiceOver). Semantics were verified programmatically only.
4. **Not covered by automated contrast:** chart SVG text and canvas graph labels.
5. **Browser-native behaviour:** closed `<select>` elements truncate long option labels.
6. **History inside the claude.ai artifact frame:** pushState is wrapped in try/catch. If a host blocks it, navigation still works without Back/Forward entries.
7. **Intentional summaries:** cards and tables still shorten long text (with an ellipsis, at word boundaries). The inspector always shows the full text.

## I. Before → after

| | Before | After |
|---|---|---|
| B10 metadata | Label track `0px`; labels painted under values; Country / Intervention missing | Eight labelled rows in heading order; two columns on desktop, stacked on phones; Country = Thailand |
| Records with metadata defects | 24 @1440 px, 48 @360 px | 0 at every tested width |
| Views with layout defects | 8 of 14 viewport sizes | 0 of 14 |
| Inspector / drawer / modals | Off-screen but focusable; no trap or restore; Back exits app | Modal dialogs with trap, restore, scroll lock; Back/Forward and deep links |
| Search | Highlight could break entities; long-word typos ignored | Entity-safe; “optimisaton → optimization” |
| Contrast (AA) | Failing in light and dark | Passing in both |
| Regression suite | none | 80 tests (60 fail on old build, 80 pass on new) |

Screenshots: `screenshots/bug-B10-before-1440.png`, `bug-B10-after-1440.png`, `bug-B10-before-390.png`, `bug-B10-after-390.png`; full pass in `screenshots/regression/` (desktop and mobile contact sheets plus 20 individual screens).
