/* ===== Views ===== */
(function (MR) {
'use strict';
var D = MR.D, esc = MR.esc, $ = MR.$, $$ = MR.$$, BY = MR.BY;
var V = MR.V = {};
var K = D.kpis;

/* ---------- Overview ---------- */
V.overview = function (el) {
  var top = D.projects[0];
  var probs = D.problems.slice().sort(function (a, b) { return (b.scores.severity * 2 + b.scores.evidence_strength) - (a.scores.severity * 2 + a.scores.evidence_strength); }).slice(0, 6);
  var recent = D.studies.slice().filter(function (s) { return s.countries.indexOf('Myanmar') >= 0; }).sort(function (a, b) { return (b.year - a.year) || (b.curated - a.curated); }).slice(0, 6);
  var dsv = D.datasets.slice().sort(function (a, b) { return (b.problem_ids.length * 2 + b.study_ids.length / 3 - a.tier) - (a.problem_ids.length * 2 + a.study_ids.length / 3 - b.tier); }).slice(0, 6);
  var igap = D.problems.slice().sort(function (a, b) { return b.scores.implementation_gap - a.scores.implementation_gap || b.scores.severity - a.scores.severity; }).slice(0, 5);
  var kp = [
    ['Verified Myanmar rice problems', K.problems, 'Problem map with causal chains', 'problems'],
    ['Research records indexed', K.studies, K.studies_with_links + ' with original-source links', 'research'],
    ['Studies linked to datasets', K.studies_with_datasets, 'named dataset in record or abstract', 'q:dataset-linked'],
    ['Interventions at scale (A)', K.iv_A, 'of ' + D.interventions.length + ' audited', 'impl:A'],
    ['Pilot / experimental only (C)', K.iv_C, 'not yet scaled', 'impl:C'],
    ['Proposed only (D)', K.iv_D, 'never implemented', 'impl:D'],
    ['Verified datasets', K.datasets, 'links checked ' + D.meta.built, 'datasets'],
    ['High-priority research gaps', K.gaps_high, 'of ' + D.gaps.length + ' gaps', 'gaps'],
    ['Project candidates scored', K.projects, 'Impact × Feasibility', 'projects']];
  el.innerHTML =
    '<div class="hero"><div><p class="eyebrow">Myanmar rice agriculture · 2000–2026 · evidence to decision</p><h2 id="h-overview">Which unresolved rice problems have enough evidence and data to support an analysis that changes a real decision?</h2>' +
    '<p class="lede">A traceable map from problems to studies, datasets, implemented interventions, neighbour-country solutions and research gaps — ending in ranked data-analysis projects. Every number links to its source record.</p>' +
    '<div class="pipeline" aria-label="Guiding pipeline">' + ['Evidence', 'Problem', 'Data', 'Analysis', 'Decision', 'Intervention', 'Measurable impact'].map(function (s, i) { return (i ? '<span class="arr">→</span>' : '') + '<span>' + s + '</span>'; }).join('') + '</div>' +
    '<div class="kpis">' + kp.map(function (k) { return '<button class="kpi" type="button" data-go="' + esc(k[3]) + '"><span class="n">' + k[1] + '</span><span class="l">' + esc(k[0]) + '</span><span class="s">' + esc(k[2]) + '</span></button>'; }).join('') + '</div></div>' +
    '<div class="side"><div class="rec"><p class="eyebrow">#1 recommended project · score ' + top.score + ' / 25</p><h3>' + esc(top.title) + '</h3>' +
    '<div class="chain">' + [['User', top.user], ['Decision', top.decision], ['Information', top.required_information], ['Analysis', top.analysis], ['Action', top.action], ['Outcome', top.expected_outcome]].map(function (r) { return '<div><span class="k">' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>'; }).join('') + '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" data-go="projects">See ranking and design</button><button class="btn" type="button" data-open="' + top.id + '">Evidence trail</button></div></div>' +
    '<div class="panel"><div style="padding:12px 14px;border-bottom:1px solid var(--line)"><h3 style="font-size:1rem">Research workflow</h3></div><ol class="small" style="margin:0;padding:10px 14px 12px 34px;display:flex;flex-direction:column;gap:3px">' +
    [['Discover problem', 'problems'], ['Search evidence', 'search'], ['Inspect research objectives', 'research'], ['Trace related studies', 'connections'], ['Check real-world implementation', 'implementation'], ['Identify gap', 'gaps'], ['Find available data', 'datasets'], ['Compare neighbour solutions', 'countries'], ['Evaluate analytical methods', 'projects'], ['Rank project opportunity', 'projects'], ['Define research question', 'projects'], ['Build the project', 'projects']].map(function (s) { return '<li><button class="rellink" data-go="' + s[1] + '">' + s[0] + '</button></li>'; }).join('') + '</ol></div>' + '</div></div>' +
    '<div class="section-h"><h2>Where Myanmar stands</h2><span class="note">Context from verified datasets, not decorative statistics</span></div>' +
    '<div class="grid2"><div class="panel figure"><h3 style="font-size:1rem">Paddy yield, Myanmar vs neighbours (t/ha, rough basis)</h3><div id="ch-yield"></div><div class="cap">' + esc(D.charts.psd_note) + ' Source: <button class="chip" data-open="D01">D01 USDA PSD</button></div></div>' +
    '<div class="panel figure"><h3 style="font-size:1rem">Retail price of low-quality rice (MMK/kg, national median)</h3><div id="ch-price"></div><div class="cap">' + esc(D.charts.wfp_note) + '. <b>Coverage gap:</b> no WFP markets in Ayeyarwady, Bago (West) or Nay Pyi Taw. Source: <button class="chip" data-open="D06">D06 WFP</button></div></div></div>' +
    '<div class="grid3" style="margin-top:18px">' +
    listPanel('Top unresolved problems', 'problems', probs.map(function (p) { return [p.id, p.problem_name, '<span class="chip">' + esc(p.problem_category) + '</span> severity ' + MR.dots(p.scores.severity) + ' evidence ' + MR.dots(p.scores.evidence_strength), p.priority]; })) +
    listPanel('Recently published Myanmar research', 'research', recent.map(function (s) { return [s.id, s.title, s.year + ' · ' + esc(MR.clip(s.authors[0] || s.journal_or_publisher || '', 48)) + ' ' + MR.confBadge(s.confidence), '']; })) +
    listPanel('Highest-value datasets', 'datasets', dsv.map(function (d) { return [d.id, d.name, MR.tierBadge(d.tier) + ' ' + esc(d.temporal_resolution) + ' · ' + esc(d.access_class) + ' · ' + d.study_ids.length + ' studies', '']; })) +
    listPanel('Biggest implementation gaps', 'implementation', igap.map(function (p) { return [p.id, p.problem_name, 'implementation gap ' + MR.dots(p.scores.implementation_gap) + ' · ' + p.existing_interventions.map(function (i) { return MR.statusPill(BY[i] ? BY[i].rec.status : ''); }).join(' '), '']; })) +
    listPanel('Top project candidates', 'projects', D.projects.slice(0, 5).map(function (p) { return [p.id, p.title, '<span class="mono">' + p.score + '</span> · impact ' + p.impact_index + ' × feasibility ' + p.feasibility_index, p.rank === 1 ? '#1' : 'Top 5']; })) +
'</div>';
  drawYield($('#ch-yield'), ['Myanmar', 'Vietnam', 'Thailand', 'Bangladesh', 'Cambodia', 'Laos']);
  drawPrice($('#ch-price'));
};
function listPanel(title, go, items) {
  return '<div class="panel"><div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;gap:8px"><h3 style="font-size:1rem">' + esc(title) + '</h3><button class="btn ghost xs" data-go="' + go + '" type="button">All →</button></div><div class="list">' +
    items.map(function (it) { return '<button class="li" type="button" data-open="' + esc(it[0]) + '"><span class="t">' + esc(it[1]) + '</span><span class="xs mono muted">' + esc(it[3] || it[0]) + '</span><span class="m">' + it[2] + '</span></button>'; }).join('') + '</div></div>';
}
var CC = { Myanmar: '--accent', Vietnam: '--t-study', Thailand: '--t-benchmark', Bangladesh: '--t-dataset', India: '--t-problem', China: '--ink-3', Cambodia: '--t-gap', Laos: '--t-policy' };
function drawYield(host, countries) {
  var psd = D.charts.psd;
  MR.lineChart(host, { id: 'cy' + Math.random().toString(36).slice(2, 6), aria: 'Line chart of paddy yield by country 2000 to 2026', xMin: 2000, xMax: 2026, yMin: 0, yMax: 8, yTicks: [0, 2, 4, 6, 8], xTicks: [2000, 2005, 2010, 2015, 2020, 2026], yFmt: function (v, ro) { return ro ? v.toFixed(2) + ' t/ha' : v; }, endFmt: function (v) { return v.toFixed(1); },
    series: countries.map(function (c) { return { name: c, color: MR.cssVar(CC[c]), width: c === 'Myanmar' ? 3 : 1.5, points: psd[c].map(function (r) { return [r.year, r.Yield]; }) }; }), hint: 'Hover for values. 2026 values are USDA forecasts.' });
}
MR.drawYield = drawYield;
function drawPrice(host) {
  var s = D.charts.wfp.series;
  var pts = s.map(function (r) { var p = r.month.split('-'); return [+p[0] + (+p[1] - 1) / 12, r.median_mmk_kg]; });
  MR.lineChart(host, { id: 'cp', aria: 'Line chart of monthly median retail rice price in Myanmar, 2008 to 2026', xMin: 2008, xMax: 2026.7, yMin: 0, yMax: 2800, yTicks: [0, 700, 1400, 2100, 2800], xTicks: [2008, 2012, 2016, 2020, 2024],
    xFmt: function (v) { var y = Math.floor(v + 1e-6), m = Math.round((v - y) * 12) + 1; return Math.abs(v - Math.round(v)) < 1e-6 && arguments.length === 1 && false ? y : (m > 12 ? y + 1 + '-01' : y + '-' + String(m).padStart(2, '0')); },
    yFmt: function (v, ro) { return ro ? Math.round(v).toLocaleString() + ' MMK/kg' : v.toLocaleString(); }, band: [2021.08, 2021.25], bandColor: MR.cssVar('--gold-soft'), bandLabel: 'Feb 2021',
    series: [{ name: 'Median', color: MR.cssVar('--accent'), width: 2.2, area: true, points: pts }], hint: 'Hover for monthly values (number of reporting markets varies by month).' });
  host.querySelectorAll('svg text').forEach(function (t) { if (/^\d{4}-01$/.test(t.textContent)) t.textContent = t.textContent.slice(0, 4); });
}

/* ---------- Search ---------- */
var S = MR.SS = MR.LS.get('search', { q: '', F: {}, yr: [2000, 2026], yrOn: false, sort: 'rel', dismissed: {} });
S.page = 1; S.F = S.F || {}; S.dismissed = {};
var lastRes = null;
MR.setSearch = function (o) { Object.assign(S, o); S.page = 1; if (o.q != null) $('#q').value = o.q; MR.runSearch(); };
MR.runSearch = function () {
  var r = MR.search(S.q, { dismissed: S.dismissed }), it = r.intent;
  var F = JSON.parse(JSON.stringify(S.F));
  if (it.types && !S.dismissed.types) F.type = MR.uniq((F.type || []).concat(it.types));
  if (it.regionFilter.length && !S.dismissed.region) F.region = MR.uniq((F.region || []).concat(it.regionFilter));
  if (it.res.length && !S.dismissed.res) F.res = MR.uniq((F.res || []).concat(it.res));
  var yr = S.yrOn ? [S.yr[0], S.yr[1]] : null;
  if ((it.yearMin || it.yearMax) && !S.dismissed.year) { yr = [Math.max(yr ? yr[0] : 1990, it.yearMin || 1990), Math.min(yr ? yr[1] : 2030, it.yearMax || 2030)]; yr.strict = true; }
  if (yr && S.yrOn) yr.strict = true;
  var res = r.results.filter(function (x) { return MR.passFacets(x.d, F, null, yr); });
  var sorters = { rel: function (a, b) { return b.score - a.score || (MR.typeOrder[a.d.type] - MR.typeOrder[b.d.type]) || ((b.d.year || 0) - (a.d.year || 0)); }, new: function (a, b) { return (b.d.year || 0) - (a.d.year || 0); }, old: function (a, b) { return (a.d.year || 9999) - (b.d.year || 9999); },
    conf: function (a, b) { var o = { High: 0, Medium: 1, Low: 2 }; return (o[a.d.f.conf[0]] ?? 3) - (o[b.d.f.conf[0]] ?? 3) || b.score - a.score; }, type: function (a, b) { return MR.typeOrder[a.d.type] - MR.typeOrder[b.d.type] || b.score - a.score; } };
  var anyBoost = res.some(function (x) { return x.boost > 0.06; });
  if (!r.lexical && S.sort === 'rel') res.sort(function (a, b) { return (anyBoost ? b.boost - a.boost : 0) || MR.typeOrder[a.d.type] - MR.typeOrder[b.d.type] || ((b.d.year || 0) - (a.d.year || 0)); });
  else res.sort(sorters[S.sort] || sorters.rel);
  lastRes = { r: r, res: res, F: F, yr: yr, base: r.results };
  MR.LS.set('search', { q: S.q, F: S.F, yr: S.yr, yrOn: S.yrOn, sort: S.sort });
  renderInterp(r); renderActive(F, yr); renderFacets(r.results, F, yr); renderCards();
};
function renderInterp(r) {
  var it = r.intent, c = [];
  if (it.types && !S.dismissed.types) c.push(['types', 'Type: ' + it.types.map(function (t) { return MR.TYPE_LABEL[t]; }).join(' / ')]);
  if ((it.yearMin || it.yearMax) && !S.dismissed.year) c.push(['year', 'Years: ' + (it.yearMin || '…') + '–' + (it.yearMax || '…')]);
  if (it.regionFilter.length && !S.dismissed.region) c.push(['region', 'Region: ' + it.regionFilter.join(', ')]);
  if (it.res.length && !S.dismissed.res) c.push(['res', 'Resolution: ' + it.res.join(', ')]);
  var soft = [];
  if (it.regions.length) soft.push('boost ' + it.regions.join(', ')); if (it.countries.length) soft.push('boost ' + it.countries.join(', '));
  if (it.impl === 'scale') soft.push('prefer implemented at scale'); if (it.impl === 'stalled') soft.push('prefer proposed/pilot-only'); if (it.impl === 'failed') soft.push('prefer records with barriers');
  if (it.effects) soft.push('prefer quantified effects'); if (it.contra) soft.push('prefer contradicting evidence'); if (it.dataRich) soft.push('prefer good data availability'); if (it.highImpact) soft.push('prefer high severity');
  if (it.labor) soft.push('prefer labour/time saving'); if (it.transfer) soft.push('rank by transferability'); if (it.ds) soft.push('prefer data-science-ready'); if (it.sameDataset) soft.push('datasets shared by most studies'); if (it.cause) soft.push('prefer problem records');
  it.my.forEach(function (m) { soft.push(m[0] + ' → ' + m[1]); });
  r.fuzzy.forEach(function (f) { soft.push('typo: ' + f[0] + ' ≈ ' + f[1]); });
  var h = c.length || soft.length || r.expanded.length ? '<span>Interpreted:</span>' + c.map(function (x) { return '<button class="chip" type="button" data-dismiss="' + x[0] + '" title="Remove this interpretation">' + esc(x[1]) + ' <span class="x">×</span></button>'; }).join('') + soft.map(function (s) { return '<span class="chip">' + esc(s) + '</span>'; }).join('') +
    (r.expanded.length ? '<span title="' + esc(r.expanded.join(', ')) + '">+ ' + r.expanded.length + ' related terms</span>' : '') : '';
  $('#interp').innerHTML = h;
}
function renderActive(F, yr) {
  var chips = [];
  Object.keys(S.F).forEach(function (k) { (S.F[k] || []).forEach(function (v) { var fd = MR.FACETS.find(function (x) { return x.k === k; }); chips.push('<button class="chip on" type="button" data-unf="' + esc(k) + '|' + esc(v) + '">' + esc(fd.label + ': ' + (fd.fmt ? fd.fmt(v) : v)) + ' <span class="x">×</span></button>'); }); });
  if (S.yrOn) chips.push('<button class="chip on" type="button" data-unf="year|">Year: ' + S.yr[0] + '–' + S.yr[1] + ' <span class="x">×</span></button>');
  var n = chips.length; $('#fcount').textContent = n ? '(' + n + ')' : '';
  $('#active').innerHTML = n ? '<span class="small muted">' + n + ' active filter' + (n > 1 ? 's' : '') + '</span>' + chips.join('') + '<button class="btn ghost xs" type="button" id="clearAll">Clear all</button>' : '';
}
MR.openFacet = MR.LS.get('openFacets', { type: 1, region: 1, year: 1, pcat: 1, impl: 1, conf: 1 });
function renderFacets(base, F, yr) {
  var html = '';
  var openFacet = MR.openFacet;
  MR.FACETS.forEach(function (fd) {
    if (fd.hidden) return;
    if (fd.special === 'year') {
      html += '<div class="facet"><button type="button" aria-expanded="' + (!!openFacet.year) + '" data-ft="year">Year <span>' + (openFacet.year ? '–' : '+') + '</span></button>' + (openFacet.year ? '<div class="yr"><label class="sr" for="y0">From year</label><input id="y0" type="number" min="2000" max="2026" value="' + S.yr[0] + '"><label class="sr" for="y1">To year</label><input id="y1" type="number" min="2000" max="2026" value="' + S.yr[1] + '"><label class="sr" for="yr0">From year slider</label><input id="yr0" type="range" min="2000" max="2026" value="' + S.yr[0] + '"><label class="sr" for="yr1">To year slider</label><input id="yr1" type="range" min="2000" max="2026" value="' + S.yr[1] + '"></div><label style="margin-top:4px"><input type="checkbox" id="yrOn" ' + (S.yrOn ? 'checked' : '') + '> Apply year range (records without a year are excluded)</label>' : '') + '</div>';
      return;
    }
    var counts = {};
    base.forEach(function (x) { if (!MR.passFacets(x.d, F, fd.k, yr)) return; (x.d.f[fd.k] || []).forEach(function (v) { counts[v] = (counts[v] || 0) + 1; }); });
    var sel = S.F[fd.k] || [];
    var vals = MR.uniq((fd.order || []).filter(function (v) { return counts[v] || sel.indexOf(v) >= 0; }).concat(Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })).concat(sel));
    if (!vals.length) return;
    var open = !!openFacet[fd.k] || sel.length;
    var lim = openFacet[fd.k + '_all'] ? 999 : 8;
    html += '<div class="facet"><button type="button" aria-expanded="' + !!open + '" data-ft="' + fd.k + '">' + esc(fd.label) + (sel.length ? ' (' + sel.length + ')' : '') + ' <span>' + (open ? '–' : '+') + '</span></button>' + (open ? '<div class="opts" role="group" aria-label="' + esc(fd.label) + '">' + vals.slice(0, lim).map(function (v) {
      var id = 'f-' + fd.k + '-' + v.replace(/[^a-z0-9]/gi, '_');
      return '<label class="' + (counts[v] ? '' : 'zero') + '" for="' + id + '"><input type="checkbox" id="' + id + '" data-f="' + esc(fd.k) + '" value="' + esc(v) + '" ' + (sel.indexOf(v) >= 0 ? 'checked' : '') + '><span>' + esc(fd.fmt ? fd.fmt(v) : v) + '</span><span class="c">' + (counts[v] || 0) + '</span></label>';
    }).join('') + (vals.length > 8 ? '<button class="btn ghost more" type="button" data-fall="' + fd.k + '">' + (lim > 8 ? 'Show fewer' : 'Show all ' + vals.length) + '</button>' : '') + '</div>' : '') + '</div>';
  });
  $('#facetBody').innerHTML = html;
}
function card(x, hl) {
  var d = x.d, r = d.rec, t = d.type, h = '', kv = [];
  var meta = [];
  if (d.year) meta.push(d.year);
  var loc = r.geographic_area || r.geographic_scope || r.location || r.geography || r.country || '';
  if (loc) meta.push(loc.length > 90 ? '<span title="' + esc(loc) + '">' + esc(MR.clip(loc, 90)) + '</span>' : esc(loc));
  var probs = (r.problem_ids || []).slice(0, 3).map(function (p) { return '<button class="chip" type="button" data-open="' + p + '">' + esc(MR.PROB[p] ? MR.PROB[p].problem_name.split(/[,(:]/)[0] : p) + '</button>'; }).join(' ');
  if (t === 'Study') {
    kv.push(['Objective', r.objective ? MR.highlight(r.objective, hl) : '<span class="muted">Not available (no abstract)</span>']);
    kv.push(['Method', esc((r.methods || []).slice(0, 4).join(' · ') || r.methodology || '–')]);
    var sn = MR.snippet(d, hl); var f0 = (r.findings || [])[0];
    kv.push(['Finding', f0 ? MR.highlight(f0, hl) : sn ? MR.highlight(sn, hl) : '<span class="muted">Not extracted</span>']);
    if (r.dataset_ids.length) kv.push(['Data', r.dataset_ids.map(function (x) { return '<button class="chip" type="button" data-open="' + x + '">' + esc(x + ' ' + (BY[x] ? BY[x].title.split(/[(,]/)[0].trim() : '')) + '</button>'; }).join(' ')]);
    meta.push(esc(MR.clip(r.authors[0] || '', 60))); meta.push(esc(r.publication_type || ''));
  } else if (t === 'Problem') { kv.push(['Definition', MR.highlight(r.problem_definition, hl)]); kv.push(['Evidence', MR.highlight(r.evidence[0].claim, hl)]); kv.push(['Scores', 'severity ' + MR.dots(r.scores.severity) + ' evidence ' + MR.dots(r.scores.evidence_strength) + ' data ' + MR.dots(r.scores.data_availability)]); }
  else if (t === 'Dataset') { kv.push(['Variables', MR.highlight(r.variables.slice(0, 5).join('; '), hl)]); kv.push(['Coverage', esc(r.geography + ' · ' + r.start_date + '–' + r.end_date)]); kv.push(['Resolution', esc(r.temporal_resolution + ' · ' + r.spatial_resolution)]); kv.push(['Access', esc(r.access_class + ' · ' + r.access_method)]); meta.push(esc(r.producer)); }
  else if (t === 'Intervention' || t === 'Policy') { kv.push(['Outcome', MR.highlight(r.outcomes[0] || '–', hl)]); kv.push(['Reach', esc(r.farmers)]); kv.push(['Barrier', MR.highlight(r.barriers[0] || '–', hl)]); meta.push(esc(MR.clip(r.organization, 90))); }
  else if (t === 'Benchmark') { kv.push(['Mechanism', MR.highlight(r.mechanism, hl)]); kv.push(['Outcome', MR.highlight(r.impact.join(' · '), hl)]); kv.push(['Transfer', '<span class="trf trf-' + MR.TRF[r.transferability] + '">' + esc(r.transferability) + '</span> ' + esc(MR.clip(r.transfer_reason, 160))]); }
  else if (t === 'Gap') { kv.push(['Gap', MR.highlight(r.description, hl)]); kv.push(['Type', esc(r.gap_type + ' · ' + r.priority + ' priority')]); }
  else if (t === 'Project') { kv.push(['Decision', MR.highlight(r.decision, hl)]); kv.push(['Analysis', MR.highlight(r.analysis, hl)]); kv.push(['Score', '<span class="mono">' + r.score + '</span> = impact ' + r.impact_index + ' × feasibility ' + r.feasibility_index + (r.top5 ? ' <span class="' + (r.is_top1 ? 'badge1' : 'badge5') + '">' + (r.is_top1 ? '#1' : 'Top 5') + '</span>' : '')]); }
  var url = r.original_url || r.source_url || '';
  var acts = '<button class="btn ghost" type="button" data-open="' + d.id + '">View details</button>' + (url ? '<a class="btn ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Open original source ↗</a>' : '') +
    '<button class="btn ghost" type="button" data-graph="' + d.id + '">View related</button>' + (t === 'Study' && r.dataset_ids.length ? '<button class="btn ghost" type="button" data-open="' + r.dataset_ids[0] + '">View dataset</button>' : '') +
    '<button class="btn ghost" type="button" data-compare="' + d.id + '" aria-pressed="' + (MR.compare.indexOf(d.id) >= 0) + '">' + (MR.compare.indexOf(d.id) >= 0 ? 'Comparing ✓' : 'Compare') + '</button><button class="btn ghost" type="button" data-trace="' + d.id + '">Trace evidence</button>';
  var status = (t === 'Study' && d.f.impl[0] !== 'N' ? '<span class="xs muted">linked intervention</span>' : '') + MR.statusPill(d.f.impl[0]) + MR.tierBadge(d.f.tier[0] ? d.f.tier[0].replace('Tier ', '') : '') + MR.confBadge(d.f.conf[0]) + (t === 'Dataset' ? '<span class="chip">' + esc(r.access_class) + '</span>' : '');
  var tags = MR.uniq([].concat(d.f.region.slice(0, 2), d.f.impact.slice(0, 3))).map(function (v) { return '<span class="chip">' + esc(v) + '</span>'; }).join(' ');
  return '<article class="card' + (MR.curInsp === d.id ? ' sel' : '') + '"><div class="row">' + MR.typeBadge(t) + '<span class="mono xs muted">' + d.id + '</span>' + status + '</div><h3><button type="button" data-open="' + d.id + '">' + MR.highlight(d.title, hl) + '</button></h3>' +
    '<div class="meta">' + meta.filter(Boolean).join(' · ') + '</div>' + (probs ? '<div class="row">' + probs + ' ' + tags + '</div>' : tags ? '<div class="row">' + tags + '</div>' : '') + '<div class="kv">' + kv.map(function (k) { return '<span class="k">' + k[0] + '</span><span>' + k[1] + '</span>'; }).join('') + '</div><div class="acts">' + acts + '</div></article>';
}
function renderCards() {
  var res = lastRes.res, n = res.length, shown = res.slice(0, S.page * 20);
  var byType = {}; res.forEach(function (x) { byType[x.d.type] = (byType[x.d.type] || 0) + 1; });
  $('#rcount').textContent = n + ' result' + (n === 1 ? '' : 's') + (n ? ' — ' + Object.keys(byType).sort(function (a, b) { return MR.typeOrder[a] - MR.typeOrder[b]; }).map(function (t) { return byType[t] + ' ' + MR.plural(MR.TYPE_LABEL[t].toLowerCase(), byType[t]); }).join(', ') : '');
  $('#cards').innerHTML = n ? shown.map(function (x) { return card(x, lastRes.r.highlight); }).join('') : '<div class="empty"><p><b>No records match.</b></p><p class="small">Try fewer words, remove a filter chip above, or try one of the example questions. Spelling variants (labour/labor) and related terms are already included.</p><button class="btn" type="button" id="emptyClear">Clear search and filters</button></div>';
  $('#more').hidden = shown.length >= n; $('#more').textContent = 'Show ' + Math.min(20, n - shown.length) + ' more';
  var ec = $('#emptyClear'); if (ec) ec.onclick = function () { S.F = {}; S.yrOn = false; S.dismissed = {}; MR.setSearch({ q: '' }); };
}
MR.searchExport = function (kind) {
  var rows = lastRes.res.map(function (x) { return Object.assign({ _type: x.d.type, _title: x.d.title }, x.d.rec); });
  if (kind === 'json') MR.save('myanmar-rice-search-results.json', JSON.stringify(rows.map(function (r) { var o = Object.assign({}, r); delete o.refs; delete o.abstract; return o; }), null, 1));
  else if (kind === 'cite') MR.save('myanmar-rice-citations.txt', rows.map(function (r) { return r.citation || (r._type + ': ' + r._title); }).join('\n\n'));
  else { var st = rows.filter(function (r) { return r._type === 'Study'; }); MR.save('myanmar-rice-search-results.csv', st.length === rows.length ? MR.csv(st, MR.studyCols) : MR.csv(rows, MR.genericCols)); }
};
V.search = function () { $('#q').value = S.q; $('#sort').value = S.sort; MR.runSearch(); };
MR.EXAMPLES = ['What causes rice yield loss in Myanmar?', 'Show studies about labor shortages after 2015', 'Find research that actually reached farmers', 'Show proposed solutions that never scaled', 'What datasets can measure rainfall and rice yield?', 'Show studies using Sentinel or Landsat', 'Find research in Ayeyarwady', 'Show monthly datasets related to rice agriculture', 'Find optimization studies', 'How has Vietnam reduced rice production labor?', 'What interventions from Thailand may transfer to Myanmar?', 'Show high-impact problems with good data availability', 'Find research gaps suitable for a data science project', 'Which project can save farmer time or labor?', 'Show studies with quantitative yield effects', 'Show conflicting research about fertilizer', 'Which studies use the same dataset?', 'What research has the strongest implementation evidence?', 'မြေဩဇာ ဈေးနှုန်း', 'fertiliser optimisaton'];

/* ---------- Problems ---------- */
var probSort = 'impact';
V.problems = function (el) {
  var sorts = { impact: ['Highest impact', function (p) { return p.scores.severity * 10 + p.scores.evidence_strength; }], evidence: ['Strongest evidence', function (p) { return p.scores.evidence_strength * 10 + p.n_studies / 100; }], datagap: ['Largest data gap', function (p) { return p.scores.data_gap * 10 + p.scores.severity; }],
    data: ['Best data availability', function (p) { return p.scores.data_availability * 10 + p.scores.severity; }], impl: ['Highest implementation gap', function (p) { return p.scores.implementation_gap * 10 + p.scores.severity; }], ds: ['Best data-science opportunity', function (p) { return p.scores.ds_potential * 10 + p.scores.data_availability + p.scores.severity / 10; }] };
  var ps = D.problems.slice().sort(function (a, b) { return sorts[probSort][1](b) - sorts[probSort][1](a); });
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>Myanmar rice problem map</h2><span class="note">' + ps.length + ' problems verified from evidence; scores are analyst judgements on a published rubric</span></div>' +
    '<p class="lede">Each problem separates the symptom from immediate and root causes. "Low yield" is treated as a symptom, not a root problem.</p>' +
    '<div class="toolbar"><span class="tgrp"><label for="psort" class="small">Sort by</label><select id="psort">' + Object.keys(sorts).map(function (k) { return '<option value="' + k + '" ' + (k === probSort ? 'selected' : '') + '>' + sorts[k][0] + '</option>'; }).join('') + '</select></span><span class="xs muted">Click a row for causal chain, evidence and sources.</span></div>' +
    '<div class="tbl-wrap"><table class="tbl cardify"><thead><tr><th>#</th><th>Problem</th><th>Level</th><th>Severity</th><th>Evidence</th><th>Trend</th><th>Yield / economic / labour impact</th><th class="num">Studies</th><th class="num">Datasets</th><th>Interventions</th><th>Impl. gap</th><th>DS potential</th></tr></thead><tbody>' +
    ps.map(function (p, i) {
      return '<tr class="click" data-open="' + p.id + '" tabindex="0"><td data-l="Rank" class="num">' + (i + 1) + '</td><td data-l="Problem"><b>' + esc(p.problem_name) + '</b><div class="xs muted">' + esc(p.problem_category) + ' · ' + esc(MR.clip(p.geographic_scope, 90)) + '</div></td><td data-l="Level" class="xs">' + esc(p.symptom_or_root_cause) + '</td>' +
        '<td data-l="Severity">' + MR.dots(p.scores.severity) + '</td><td data-l="Evidence">' + MR.dots(p.scores.evidence_strength) + '</td><td data-l="Trend" class="xs">' + esc(p.trend) + '</td><td data-l="Impacts" class="xs">' + esc(p.yield_impact) + ' · ' + esc(p.financial_impact) + ' · ' + esc(p.labor_impact) + '</td>' +
        '<td data-l="Studies" class="num">' + p.n_studies + '</td><td data-l="Datasets" class="num">' + p.n_datasets + '</td><td data-l="Interventions">' + (p.existing_interventions.map(function (iv) { return MR.statusPill(BY[iv] ? BY[iv].rec.status : ''); }).join(' ') || '<span class="xs muted">none</span>') + '</td>' +
        '<td data-l="Impl. gap">' + MR.dots(p.scores.implementation_gap) + '</td><td data-l="DS potential">' + MR.dots(p.scores.ds_potential) + '</td></tr>';
    }).join('') + '</tbody></table></div><p class="xs muted" style="margin-top:8px">Study counts include automatically tagged links (marked as such in each record). ' + esc(D.methodology.score_rubric) + '</p>';
  $('#psort').onchange = function () { probSort = this.value; V.problems(el); };
};

/* ---------- Research (studies table) ---------- */
var RS = { q: '', sort: 'year', dir: -1, page: 1, country: 'Myanmar', conf: '' };
V.research = function (el) {
  var rows = D.studies.filter(function (s) {
    if (RS.country && s.countries.indexOf(RS.country) < 0 && !(RS.country === 'Neighbour' && s.countries.some(function (c) { return c !== 'Myanmar'; }))) return false;
    if (RS.conf && s.confidence !== RS.conf) return false;
    if (RS.q) { var t = (s.title + ' ' + s.authors.join(' ') + ' ' + s.objective + ' ' + s.geographic_area + ' ' + s.methods.join(' ')).toLowerCase(); return RS.q.toLowerCase().split(/\s+/).every(function (w) { return t.indexOf(w) >= 0; }); }
    return true;
  });
  var key = { year: function (s) { return s.year || 0; }, title: function (s) { return s.title.toLowerCase(); }, conf: function (s) { return { High: 3, Medium: 2, Low: 1 }[s.confidence]; }, tier: function (s) { return -s.source_tier; }, type: function (s) { return s.publication_type || ''; } }[RS.sort];
  rows.sort(function (a, b) { var x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * RS.dir; });
  var shown = rows.slice(0, RS.page * 50);
  function th(k, l) { return '<th><button type="button" data-rsort="' + k + '">' + l + (RS.sort === k ? (RS.dir > 0 ? ' ▲' : ' ▼') : '') + '</button></th>'; }
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>2000–2026 literature database</h2><span class="note">' + D.studies.length + ' records · objectives shown for every study with an abstract · ' + D.series.reduce(function (n, s) { return n + s.items.length; }, 0) + ' survey-round reports collapsed into ' + D.series.length + ' series</span></div>' +
    '<div class="toolbar"><label class="sr" for="rq">Filter studies</label><input type="search" id="rq" placeholder="Filter by title, author, place, method…" value="' + esc(RS.q) + '"><span class="tgrp"><label for="rc" class="small">Scope</label><select id="rc"><option value="Myanmar">Myanmar</option><option value="Neighbour">Neighbour-country benchmarks</option><option value="">All</option></select></span><span class="tgrp"><label for="rcf" class="small">Confidence</label><select id="rcf"><option value="">Any</option><option>High</option><option>Medium</option><option>Low</option></select></span><span class="small muted">' + rows.length + ' shown</span><button class="btn" type="button" id="rexp">Export CSV</button></div>' +
    '<div class="tbl-wrap"><table class="tbl cardify"><thead><tr>' + th('year', 'Year') + th('title', 'Title & objective') + '<th>Place</th><th>Problems</th><th>Methods</th>' + th('type', 'Type') + th('tier', 'Tier') + th('conf', 'Confidence') + '<th>Source</th></tr></thead><tbody>' +
    shown.map(function (s) { return '<tr class="click" data-open="' + s.id + '" tabindex="0"><td data-l="Year" class="num">' + (s.year || '') + '</td><td data-l="Title"><b>' + esc(s.title) + '</b><div class="xs muted">' + esc(MR.clip(s.objective || 'Objective not available', 220)) + '</div></td><td data-l="Place" class="xs">' + esc(MR.clip(s.regions.join(', ') || s.geographic_area || '', 60)) + '</td><td data-l="Problems" class="xs mono">' + esc(s.problem_ids.join(' ')) + '</td><td data-l="Methods" class="xs">' + esc(s.methods.slice(0, 3).join(', ')) + '</td><td data-l="Type" class="xs">' + esc(s.publication_type || '') + '</td><td data-l="Tier">' + MR.tierBadge(s.source_tier) + '</td><td data-l="Confidence">' + MR.confBadge(s.confidence) + '</td><td data-l="Source" class="xs">' + (s.original_url ? '<a href="' + esc(s.original_url) + '" target="_blank" rel="noopener">' + (s.doi ? 'DOI' : 'Link') + ' ↗</a>' : '') + '</td></tr>'; }).join('') +
    '</tbody></table></div>' + (shown.length < rows.length ? '<div class="showmore"><button class="btn" type="button" id="rmore">Show 50 more</button></div>' : '') +
    '<div class="section-h"><h2 style="font-size:1.1rem">Collapsed survey-round report series</h2><span class="note">Repeated monitoring rounds kept as one series each to avoid inflating counts</span></div><div class="grid3">' +
    D.series.map(function (s) { return '<details class="panel" style="padding:10px 14px"><summary class="small"><b>' + esc(s.name) + '</b> · ' + s.items.length + ' reports</summary><ul class="xs" style="padding-left:16px">' + s.items.map(function (i) { return '<li>' + (i.url ? '<a href="' + esc(i.url) + '" target="_blank" rel="noopener">' + esc(i.title) + '</a>' : esc(i.title)) + ' (' + (i.year || '') + ')</li>'; }).join('') + '</ul></details>'; }).join('') + '</div>';
  $('#rc').value = RS.country; $('#rcf').value = RS.conf;
  var deb; $('#rq').oninput = function () { var v = this.value; clearTimeout(deb); deb = setTimeout(function () { RS.q = v; RS.page = 1; V.research(el); var i = $('#rq'); i.focus(); i.setSelectionRange(v.length, v.length); }, 200); };
  $('#rc').onchange = function () { RS.country = this.value; RS.page = 1; V.research(el); }; $('#rcf').onchange = function () { RS.conf = this.value; RS.page = 1; V.research(el); };
  $('#rexp').onclick = function () { MR.save('myanmar-rice-studies.csv', MR.csv(rows, MR.studyCols)); };
  var rm = $('#rmore'); if (rm) rm.onclick = function () { RS.page++; V.research(el); };
  $$('[data-rsort]', el).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var k = b.getAttribute('data-rsort'); if (RS.sort === k) RS.dir *= -1; else { RS.sort = k; RS.dir = k === 'title' ? 1 : -1; } V.research(el); }; });
};

/* ---------- Datasets ---------- */
var DS = { q: '', res: '', access: '', space: '', preset: '' };
V.datasets = function (el) {
  var docs = MR.DOCS.filter(function (d) { return d.type === 'Dataset'; });
  var fine = ['Daily', 'Weekly', 'Monthly'];
  var rows = docs.filter(function (d) {
    var r = d.rec;
    if (DS.preset === 'monthly-flood-yield' && !(d.f.res.some(function (x) { return fine.indexOf(x) >= 0; }) && r.problem_ids.some(function (p) { return p === 'P05' || p === 'P01'; }))) return false;
    if (DS.preset === 'township' && d.f.space.indexOf('Township or finer') < 0 && d.f.space.indexOf('Point / market / plot') < 0 && d.f.space.indexOf('Raster ≤ 250 m') < 0) return false;
    if (DS.preset === 'open' && d.f.access[0] !== 'Open') return false;
    if (DS.res && d.f.res.indexOf(DS.res) < 0) return false; if (DS.access && d.f.access.indexOf(DS.access) < 0) return false; if (DS.space && d.f.space.indexOf(DS.space) < 0) return false;
    if (DS.q) { var t = d._full; return DS.q.toLowerCase().split(/\s+/).every(function (w) { return t.indexOf(w) >= 0; }); }
    return true;
  });
  function opts(k, list) { return '<option value="">Any</option>' + list.map(function (v) { return '<option ' + (DS[k] === v ? 'selected' : '') + '>' + esc(v) + '</option>'; }).join(''); }
  var allRes = MR.uniq([].concat.apply([], docs.map(function (d) { return d.f.res; }))), allAcc = MR.uniq(docs.map(function (d) { return d.f.access[0]; })), allSp = MR.uniq([].concat.apply([], docs.map(function (d) { return d.f.space; })));
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>Dataset inventory</h2><span class="note">' + docs.length + ' datasets · original producers preferred · native frequency preserved (no annual→quarterly fabrication)</span></div>' +
    '<div class="toolbar"><span class="small">Quick questions:</span><button class="chip ' + (DS.preset === 'monthly-flood-yield' ? 'on' : '') + '" type="button" data-dpre="monthly-flood-yield">Monthly or finer data on rice yield and flooding</button><button class="chip ' + (DS.preset === 'township' ? 'on' : '') + '" type="button" data-dpre="township">Suitable for township-level analysis</button><button class="chip ' + (DS.preset === 'open' ? 'on' : '') + '" type="button" data-dpre="open">Fully open access</button></div>' +
    '<div class="toolbar"><label class="sr" for="dq">Filter datasets</label><input type="search" id="dq" placeholder="Filter by variable, producer…" value="' + esc(DS.q) + '"><span class="tgrp"><label for="dres" class="small">Frequency</label><select id="dres">' + opts('res', allRes) + '</select></span><span class="tgrp"><label for="dacc" class="small">Access</label><select id="dacc">' + opts('access', allAcc) + '</select></span><span class="tgrp"><label for="dsp" class="small">Spatial</label><select id="dsp">' + opts('space', allSp) + '</select></span><span class="small muted">' + rows.length + ' shown</span><button class="btn" type="button" id="dexp">Export inventory</button></div>' +
    '<div class="tbl-wrap"><table class="tbl cardify"><thead><tr><th>Dataset</th><th>Producer</th><th>Variables</th><th>Geography</th><th>Years</th><th>Temporal</th><th>Spatial</th><th>Format / access</th><th>Tier</th><th>Problems</th><th class="num">Studies</th><th>Source</th></tr></thead><tbody>' +
    rows.map(function (d) { var r = d.rec; return '<tr class="click" data-open="' + d.id + '" tabindex="0"><td data-l="Dataset"><span class="mono xs muted">' + d.id + '</span> <b>' + esc(r.name) + '</b></td><td data-l="Producer" class="xs">' + esc(r.producer) + '</td><td data-l="Variables" class="xs">' + esc(r.variables.slice(0, 4).join('; ')) + '</td><td data-l="Geography" class="xs">' + esc(r.geography) + '</td><td data-l="Years" class="xs">' + esc(r.start_date + ' – ' + r.end_date) + '</td><td data-l="Temporal" class="xs">' + esc(r.temporal_resolution) + '</td><td data-l="Spatial" class="xs">' + esc(r.spatial_resolution) + '</td><td data-l="Access" class="xs">' + esc(r.download_format + ' · ' + r.access_class) + '</td><td data-l="Tier">' + MR.tierBadge(r.tier) + '</td><td data-l="Problems" class="xs mono">' + esc(r.problem_ids.join(' ')) + '</td><td data-l="Studies" class="num">' + r.study_ids.length + '</td><td data-l="Source" class="xs">' + (r.source_url ? '<a href="' + esc(r.source_url) + '" target="_blank" rel="noopener">Open ↗</a>' : '<span class="muted">Access uncertain</span>') + '</td></tr>'; }).join('') +
    '</tbody></table></div>' + (rows.length ? '' : '<div class="empty" style="margin-top:10px">No datasets match these filters.</div>') +
    '<div class="section-h"><h2 style="font-size:1.1rem">Post-2021 data uncertainty</h2></div><div class="grid2"><div class="panel" style="padding:14px 16px"><ul class="small prose" style="margin:0;padding-left:18px">' +
    '<li>Official subnational production statistics are not publicly available after 2020 (<button class="chip" data-open="S251">S251</button>). Treat any post-2020 subnational production figure as an estimate.</li><li>The main rice regions (Ayeyarwady, Bago West) have no WFP retail price markets (<button class="chip" data-open="D06">D06</button>); use MAPS farmgate prices (<button class="chip" data-open="D04">D04</button>) there.</li>' +
    '<li>Phone panels exclude households without phones; conflict-zone recall bias in wages is modest (<button class="chip" data-open="S297">S297</button>).</li><li>World Bank RTFP/RTFX series are model-imputed; never mix them with observed prices without a flag (<button class="chip" data-open="D35">D35</button>).</li><li>Satellite and administrative estimates can disagree; this inventory does not merge them.</li></ul></div>' +
    '<div class="panel" style="padding:14px 16px"><h3 style="font-size:1rem;margin-bottom:6px">WFP rice price coverage by state/region</h3><div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Admin-1</th><th class="num">Markets</th><th class="num">Months</th><th>Span</th></tr></thead><tbody>' +
    Object.keys(D.charts.wfp.coverage).sort().map(function (k) { var c = D.charts.wfp.coverage[k]; return '<tr><td>' + esc(k) + '</td><td class="num">' + c.markets + '</td><td class="num">' + c.months + '</td><td class="xs">' + c.first + ' → ' + c.last + '</td></tr>'; }).join('') + '<tr><td><b>Ayeyarwady · Bago (West) · Nay Pyi Taw</b></td><td class="num">0</td><td class="num">0</td><td class="xs">no coverage</td></tr></tbody></table></div></div></div>' +
    dataPlan();
  var deb; $('#dq').oninput = function () { var v = this.value; clearTimeout(deb); deb = setTimeout(function () { DS.q = v; V.datasets(el); var i = $('#dq'); i.focus(); i.setSelectionRange(v.length, v.length); }, 200); };
  $('#dres').onchange = function () { DS.res = this.value; V.datasets(el); }; $('#dacc').onchange = function () { DS.access = this.value; V.datasets(el); }; $('#dsp').onchange = function () { DS.space = this.value; V.datasets(el); };
  $$('[data-dpre]', el).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-dpre'); DS.preset = DS.preset === p ? '' : p; V.datasets(el); }; });
  $('#dexp').onclick = function () { MR.save('myanmar-rice-dataset-inventory.csv', MR.csv(rows.map(function (d) { return d.rec; }), [['dataset_id', 'id'], ['name', 'name'], ['producer', 'producer'], ['tier', 'tier'], ['variables', 'variables'], ['geography', 'geography'], ['spatial_resolution', 'spatial_resolution'], ['temporal_resolution', 'temporal_resolution'], ['start_date', 'start_date'], ['end_date', 'end_date'], ['access_class', 'access_class'], ['access_method', 'access_method'], ['download_format', 'download_format'], ['license', 'license'], ['known_limitations', 'known_limitations'], ['source_url', 'source_url'], ['problem_ids', 'problem_ids'], ['study_ids', 'study_ids'], ['last_verified', 'last_verified']])); };
};
function dataPlan() {
  var top = D.projects[0], dsg = top.design || {};
  return '<div class="section-h"><h2 style="font-size:1.1rem">Data acquisition plan (for the #1 project)</h2><span class="note">How to obtain existing data and what must be collected</span></div><div class="grid2"><div class="panel" style="padding:14px 16px"><h3 style="font-size:.95rem;margin-bottom:6px">Obtain existing data</h3><ol class="small" style="margin:0;padding-left:18px">' +
    '<li>MAPS rounds 1–8: Harvard Dataverse (register, accept IFPRI terms) → Stata/CSV; join rounds on household ID; keep largest-plot module (<button class="chip" data-open="D04">D04</button>).</li><li>CHIRPS daily rainfall: Google Earth Engine <span class="mono xs">UCSB-CHG/CHIRPS/DAILY</span> → township seasonal totals and dry-spell counts (<button class="chip" data-open="D13">D13</button>).</li>' +
    '<li>ACLED events: register → CSV → count fatal events per township per season (<button class="chip" data-open="D18">D18</button>).</li><li>Township boundaries and P-codes: MIMU / HDX COD (<button class="chip" data-open="D19">D19</button>).</li><li>SoilGrids N, pH, SOC at 250 m → township means (coarse; use as control only) (<button class="chip" data-open="D17">D17</button>).</li><li>Prices: MAPS farmgate and urea prices first; WFP/RTFP only where MAPS lacks months.</li></ol></div>' +
    '<div class="panel" style="padding:14px 16px"><h3 style="font-size:.95rem;margin-bottom:6px">Collect what is missing</h3><div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Variable</th><th>Unit</th><th>Frequency</th><th>Sampling</th><th>QC / validation</th><th>Bias · missing risk</th></tr></thead><tbody>' +
    (dsg.collection_plan || []).map(function (c) { return '<tr><td class="xs">' + esc(c.variable) + '</td><td class="xs">' + esc(c.unit) + '</td><td class="xs">' + esc(c.frequency) + '</td><td class="xs">' + esc(c.sampling + ' · level: ' + c.level) + '</td><td class="xs">' + esc(c.qc + ' · ' + c.validation) + '</td><td class="xs">' + esc(c.bias + ' · ' + c.missing_risk) + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
}

/* ---------- Implementation ---------- */
var implStage = '';
var BARRIERS = [['Conflict / insecurity', /conflict|insecur|cut off/i], ['Finance / cost', /cost|financ|credit|subsid|investment|fiscal|fee/i], ['Infrastructure / fuel', /fuel|electric|infrastruct|drainage|canal|deliver/i], ['Extension / training', /extension|training|DoA|skill/i], ['Policy / FX', /policy|forex|\bFX\b|licens|pricing of/i],
  ['Technology / service availability', /service|supply|seeder|providers|availability|machin/i], ['Market incentives', /price|market|incentive|volumetric/i], ['Data / weak evaluation', /non-random|self-reported|counterfactual|evaluation|before-after|not independently|no evidence|no adoption|no deployment|no outcome|ground-truth|not quantified/i], ['Maintenance / persistence', /maint|persist|sustain|after (project|trials)/i]];
V.implementation = function (el) {
  var IV = D.interventions, st = { A: [], B: [], C: [], D: [], E: [] };
  IV.forEach(function (i) { st[i.status].push(i); });
  var resN = MR.uniq([].concat.apply([], IV.map(function (i) { return i.evidence_ids; }))).length;
  var stages = [['R', 'Research', resN, 'studies providing intervention evidence'], ['D', 'Recommendation only', st.D.length, 'D · proposed, never implemented'], ['C', 'Pilot / experimental', st.C.length, 'C · trials, prototypes, pilots'], ['B', 'Partial adoption', st.B.length, 'B · partially implemented'], ['A', 'At scale', st.A.length, 'A · implemented at scale']];
  var mx = Math.max.apply(0, stages.slice(1).map(function (s) { return s[2]; }));
  var bcount = BARRIERS.map(function (b) { var ids = IV.filter(function (i) { return b[1].test(i.barriers.join(' ') + ' ' + i.persistence); }).map(function (i) { return i.id; }); return [b[0], ids]; });
  var list = implStage && implStage !== 'R' ? st[implStage] : IV.slice().sort(function (a, b) { return 'DCBAE'.indexOf(a.status) - 'DCBAE'.indexOf(b.status); });
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>Research-to-implementation audit</h2><span class="note">' + IV.length + ' Myanmar interventions classified A–E from documented evidence; ' + st.E.length + ' with unknown status</span></div>' +
    '<p class="lede">Research → recommendation → pilot → adoption → scale. Most Myanmar evidence stops at the pilot stage; the market-driven mechanization wave is the clearest case of scale, and it is now reversing.</p>' +
    '<div class="funnel" style="margin-top:14px">' + stages.map(function (s) { return '<button class="stage ' + (implStage === s[0] ? 'on' : '') + '" type="button" data-stage="' + s[0] + '"><span class="l">' + esc(s[1]) + '</span><span class="n">' + s[2] + '</span>' + (s[0] === 'R' ? '<span class="d">' + esc(s[3]) + '</span>' : '<span class="bar"><i style="width:' + (s[2] / mx * 100) + '%;background:var(--s-' + s[0] + ')"></i></span><span class="d">' + esc(s[3]) + '</span>') + '</button>'; }).join('') + '</div>' +
    '<div class="section-h"><h2 style="font-size:1.1rem">Where evidence gets blocked</h2><span class="note">Barrier categories coded from each intervention\'s verified or analyst-flagged barriers — click to see which</span></div><div class="barrier-grid">' +
    bcount.map(function (b) { return '<div class="barrier"><span class="n">' + b[1].length + '</span><b>' + esc(b[0]) + '</b><div style="margin-top:4px">' + MR.refInline(b[1]) + '</div></div>'; }).join('') + '</div>' +
    '<div class="section-h"><h2 style="font-size:1.1rem">' + (implStage && implStage !== 'R' ? esc(MR.STATUS[implStage]) : 'All interventions') + '</h2>' + (implStage ? '<button class="btn ghost" type="button" data-stage="">Show all</button>' : '') + '</div><div class="cards">' +
    list.map(function (i) { return '<article class="card"><div class="row">' + MR.typeBadge(BY[i.id].type) + '<span class="mono xs muted">' + i.id + '</span>' + MR.statusPill(i.status) + MR.confBadge(i.confidence) + '</div><h3><button type="button" data-open="' + i.id + '">' + esc(i.name) + '</button></h3><div class="meta">' + esc(i.location) + ' · ' + esc(i.date) + ' · ' + esc(i.organization) + '</div><div class="kv"><span class="k">Reach</span><span>' + esc(i.farmers) + '</span><span class="k">Outcome</span><span>' + esc(i.outcomes[0] || '–') + '</span><span class="k">Barriers</span><span>' + esc(i.barriers.join('; ') || '–') + '</span><span class="k">Persistence</span><span>' + esc(i.persistence) + '</span><span class="k">Evidence</span><span>' + MR.refInline(i.evidence_ids) + '</span></div></article>'; }).join('') + '</div>' +
    '<div class="section-h"><h2 style="font-size:1.1rem">Problem → research → implementation chains</h2></div><div class="tbl-wrap"><table class="tbl cardify"><thead><tr><th>Problem</th><th class="num">Studies</th><th>Proposed (D)</th><th>Pilot (C)</th><th>Partial (B)</th><th>Scale (A)</th><th>Gaps</th></tr></thead><tbody>' +
    D.problems.map(function (p) { var by = function (s) { return IV.filter(function (i) { return i.status === s && i.problem_ids.indexOf(p.id) >= 0; }).map(function (i) { return i.id; }); }; return '<tr class="click" data-open="' + p.id + '" tabindex="0"><td data-l="Problem">' + esc(p.problem_name) + '</td><td data-l="Studies" class="num">' + p.n_studies + '</td><td data-l="Proposed">' + MR.refInline(by('D')) + '</td><td data-l="Pilot">' + MR.refInline(by('C')) + '</td><td data-l="Partial">' + MR.refInline(by('B')) + '</td><td data-l="Scale">' + MR.refInline(by('A')) + '</td><td data-l="Gaps">' + MR.refInline(p.gap_ids) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  $$('[data-stage]', el).forEach(function (b) { b.onclick = function () { implStage = b.getAttribute('data-stage'); if (implStage === 'R') { MR.go('research'); return; } V.implementation(el); }; });
};
MR.setImplStage = function (s) { implStage = s; };

/* ---------- Countries ---------- */
var CS = { country: '', trf: '' };
V.countries = function (el) {
  var B = D.benchmarks, cs = ['Thailand', 'Vietnam', 'Bangladesh', 'India', 'China', 'Cambodia', 'Laos'];
  var rows = B.filter(function (b) { return (!CS.country || b.country === CS.country) && (!CS.trf || b.transferability === CS.trf); });
  var probs = D.problems.filter(function (p) { return B.some(function (b) { return b.problem_ids.indexOf(p.id) >= 0; }); });
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>Myanmar problem ↔ neighbour solution</h2><span class="note">' + B.length + ' cases from 7 countries; transferability is an analyst judgement with stated reasons</span></div>' +
    '<p class="lede">No foreign result is assumed to work in Myanmar. Each case records why it worked, under what institutions, and what would have to change.</p>' +
    '<div class="section-h"><h2 style="font-size:1.1rem">Coverage matrix</h2><span class="note">Number of cases per problem and country — click a cell</span></div><div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>Myanmar problem</th>' + cs.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
    probs.map(function (p) { return '<tr><td>' + MR.refLink(p.id, p.problem_name) + '</td>' + cs.map(function (c) { var bs = B.filter(function (b) { return b.country === c && b.problem_ids.indexOf(p.id) >= 0; }); return '<td>' + (bs.length ? bs.map(function (b) { return '<button class="cell trf-' + MR.TRF[b.transferability] + '" type="button" data-open="' + b.id + '" title="' + esc(b.intervention + ' — ' + b.transferability) + '" aria-label="' + esc(b.id + ' ' + b.country + ': ' + b.intervention + ' — ' + b.transferability) + '">' + b.id + ' <span aria-hidden="true">' + (MR.TRF_GLYPH[b.transferability] || '') + '</span></button>'; }).join(' ') : '<span class="muted">·</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="legend" style="margin-top:8px">' + Object.keys(MR.TRF).map(function (k) { return '<span><span class="trf trf-' + MR.TRF[k] + '"><span aria-hidden="true">' + (MR.TRF_GLYPH[k] || '') + '</span> ' + esc(k) + '</span></span>'; }).join('') + '</div>' +
    '<div class="toolbar" style="margin-top:16px"><span class="tgrp"><label for="cc" class="small">Country</label><select id="cc"><option value="">All</option>' + cs.map(function (c) { return '<option ' + (CS.country === c ? 'selected' : '') + '>' + c + '</option>'; }).join('') + '</select></span><span class="tgrp"><label for="ctf" class="small">Transferability</label><select id="ctf"><option value="">Any</option>' + Object.keys(MR.TRF).map(function (k) { return '<option ' + (CS.trf === k ? 'selected' : '') + '>' + k + '</option>'; }).join('') + '</select></span><span class="small muted">' + rows.length + ' cases</span></div>' +
    '<div class="bench">' + rows.map(function (b) {
      return '<article class="card"><div class="row"><span class="type t-Benchmark">' + esc(b.country) + '</span><span class="mono xs muted">' + b.id + '</span><span class="trf trf-' + MR.TRF[b.transferability] + '">' + esc(b.transferability) + '</span>' + MR.confBadge(b.confidence) + '</div><h3><button type="button" data-open="' + b.id + '">' + esc(b.intervention) + '</button></h3><div class="meta">' + esc(b.year) + ' · cost: ' + esc(b.cost) + '</div>' +
        '<div class="kv"><span class="k">Myanmar problem</span><span>' + b.problem_ids.map(function (p) { return '<button class="chip" data-open="' + p + '" type="button">' + esc(MR.PROB[p].problem_name.split(/[,(:]/)[0]) + '</button>'; }).join(' ') + '</span><span class="k">Adoption</span><span>' + esc(b.adoption) + '</span><span class="k">Impact</span><span>' + esc(b.impact.join(' · ')) + '</span><span class="k">Why it worked</span><span>' + esc(b.why) + '</span><span class="k">Transfer</span><span>' + esc(b.transfer_reason) + '</span><span class="k">Modify</span><span>' + esc(b.required_modification) + '</span><span class="k">Evidence</span><span>' + MR.refInline(b.source_ids) + '</span></div></article>';
    }).join('') + '</div>' +
    '<div class="section-h"><h2 style="font-size:1.1rem">Yield trajectories, all benchmark countries</h2></div><div class="panel figure"><div id="ch-yield-all"></div><div class="cap">' + esc(D.charts.psd_note) + '</div></div>';
  $('#cc').onchange = function () { CS.country = this.value; V.countries(el); }; $('#ctf').onchange = function () { CS.trf = this.value; V.countries(el); };
  MR.drawYield($('#ch-yield-all'), ['Myanmar', 'Vietnam', 'Thailand', 'Bangladesh', 'India', 'China', 'Cambodia', 'Laos']);
};

/* ---------- Gaps ---------- */
V.gaps = function (el) {
  var types = ['Implementation', 'Knowledge', 'Data', 'Technology', 'Decision'];
  var desc = { Implementation: 'Evidence exists but has not reached farmers or never scaled', Knowledge: 'Scientifically unknown', Data: 'Cannot be measured adequately', Technology: 'Useful technology unavailable or underused', Decision: 'Important decisions made without sufficient evidence' };
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>Gap analysis</h2><span class="note">' + D.gaps.length + ' gaps · implementation gaps listed first: research exists, but implementation failed or never scaled</span></div><div class="cards">' +
    types.map(function (t) { var gs = D.gaps.filter(function (g) { return g.gap_type === t; }); if (!gs.length) return ''; return '<div class="section-h" style="margin:8px 0 0"><h3 style="font-size:1.05rem">' + t + ' gaps</h3><span class="note">' + esc(desc[t]) + '</span></div>' + gs.map(function (g) { var pr = D.projects.filter(function (p) { return p.gap_ids.indexOf(g.id) >= 0; }); return '<article class="card"><div class="row"><span class="type t-Gap">' + esc(g.gap_type) + ' gap</span><span class="mono xs muted">' + g.id + '</span><span class="chip ' + (g.priority === 'High' ? 'on' : '') + '">' + g.priority + ' priority</span><span class="xs muted">data availability</span>' + MR.dots(g.data_availability) + '</div><h3><button type="button" data-open="' + g.id + '">' + esc(g.title) + '</button></h3><p class="small" style="margin:0">' + esc(g.description) + '</p><div class="kv"><span class="k">Problems</span><span>' + MR.refInline(g.problem_ids) + '</span><span class="k">Evidence</span><span>' + MR.refInline(g.evidence_ids) + '</span><span class="k">Projects</span><span>' + (MR.refInline(pr.map(function (p) { return p.id; })) || '–') + '</span></div></article>'; }).join(''); }).join('') + '</div>';
};

/* ---------- Projects ---------- */
var PS = { sort: 'score', sel: null, w: null };
var CRIT = D.methodology.scoring.criteria, IK = D.methodology.scoring.impact_keys, FK = D.methodology.scoring.feasibility_keys;
function rescored() {
  var w = PS.w || {}; var W = function (k) { return w[k] == null ? 1 : w[k]; };
  return D.projects.map(function (p) {
    var iw = IK.reduce(function (s, k) { return s + W(k); }, 0) || 1, fw = FK.reduce(function (s, k) { return s + W(k); }, 0) || 1;
    var ii = IK.reduce(function (s, k) { return s + p.scores[k] * W(k); }, 0) / iw, fi = FK.reduce(function (s, k) { return s + p.scores[k] * W(k); }, 0) / fw;
    ii = +ii.toFixed(2); fi = +fi.toFixed(2);
    return { p: p, ii: ii, fi: fi, sc: +(ii * fi).toFixed(2) };
  });
}
V.projects = function (el) {
  var R = rescored(), key = { score: function (x) { return x.sc + x.p.scores.novelty / 100; }, impact: function (x) { return x.ii; }, feas: function (x) { return x.fi; } };
  CRIT.forEach(function (c) { key[c] = function (x) { return x.p.scores[c] + x.sc / 100; }; });
  R.sort(function (a, b) { return key[PS.sort](b) - key[PS.sort](a); });
  var weighted = !!PS.w;
  var byScore = rescored().sort(function (a, b) { return b.sc - a.sc || b.p.scores.novelty - a.p.scores.novelty; }).map(function (x) { return x.p.id; });
  var sel = PS.sel || D.projects[0].id;
  var short = { importance: 'Imp', farmers_affected: 'Farm', economic_impact: 'Econ', yield_impact: 'Yld', labor_time_saving: 'Lab', data_availability: 'Data', data_reliability: 'Rel', technical_feasibility: 'Tech', validation_feasibility: 'Val', implementation_feasibility: 'Impl', novelty: 'Nov', scalability: 'Scal' };
  el.innerHTML = '<div class="answer"><p class="eyebrow">The final question</p><h3>If you can do only one project that could actually help Myanmar rice farmers</h3><div class="answer-grid"><div>' + finalAnswer() + '</div>' + glance() + '</div></div>' +
    '<div class="section-h"><h2>Project opportunity matrix</h2><span class="note">' + D.projects.length + ' candidates · ' + esc(D.methodology.scoring.formula) + '</span></div>' +
    '<details class="panel" style="padding:10px 14px" ' + (weighted ? 'open' : '') + '><summary class="small"><b>Adjust criterion weights</b> (default: equal weights) — see how the ranking responds</summary><div class="weights" style="margin-top:10px">' + CRIT.filter(function (c) { return c !== 'novelty'; }).map(function (c) { var v = PS.w && PS.w[c] != null ? PS.w[c] : 1; return '<label for="w-' + c + '"><span>' + esc(c.replace(/_/g, ' ')) + ' <span class="muted">(' + (IK.indexOf(c) >= 0 ? 'impact' : 'feasibility') + ')</span></span><input type="range" id="w-' + c + '" min="0" max="2" step="0.5" value="' + v + '" data-w="' + c + '"><span class="mono">×' + v + '</span></label>'; }).join('') + '</div><button class="btn" type="button" id="wreset" style="margin-top:8px">Reset to equal weights</button></details>' +
    '<div class="toolbar"><span class="tgrp"><label for="prs" class="small">Sort by</label><select id="prs"><option value="score">Impact × Feasibility</option><option value="impact">Impact index</option><option value="feas">Feasibility index</option>' + CRIT.map(function (c) { return '<option value="' + c + '">' + esc(c.replace(/_/g, ' ')) + '</option>'; }).join('') + '</select></span><button class="btn" type="button" id="pexp">Export shortlist</button>' + (weighted ? '<span class="chip on">Custom weights applied</span>' : '') + '</div>' +
    '<div class="proj-top"><div class="panel figure"><h3 style="font-size:.95rem">Impact vs feasibility</h3><div id="pscatter"></div></div><div class="panel" style="padding:14px 16px"><h3 style="font-size:.95rem;margin-bottom:6px">How to read the ranking</h3><ul class="small prose" style="margin:0;padding-left:18px"><li><b>Impact index</b> = mean of importance, farmers affected, economic impact, yield impact, labour/time saving and scalability.</li><li><b>Feasibility index</b> = mean of data availability, data reliability, technical, validation and implementation feasibility.</li><li><b>Score</b> = impact × feasibility (max 25). Novelty breaks ties only, so a technically flashy project with no route to farmers (e.g. PR17, image-based pest app) ranks low.</li><li>Scores marked * carry a written note; hover them. Use the weights panel to test whether the ranking is robust.</li></ul></div></div>' +
    '<div class="tbl-wrap"><table class="tbl cardify"><thead><tr><th>Rank</th><th>Project</th><th>Impact</th><th>Feasib.</th><th>Score</th>' + CRIT.map(function (c) { return '<th title="' + esc(c.replace(/_/g, ' ')) + '" class="num">' + short[c] + '</th>'; }).join('') + '</tr></thead><tbody>' +
    R.map(function (x) { var p = x.p, rk = byScore.indexOf(p.id) + 1; return '<tr class="click ' + (rk === 1 ? 'p-top1' : '') + '" data-psel="' + p.id + '" tabindex="0" ' + (sel === p.id ? 'style="background:var(--accent-soft)"' : '') + '><td data-l="Rank" class="num">' + rk + (rk === 1 ? ' <span class="badge1">#1</span>' : rk <= 5 ? ' <span class="badge5">Top 5</span>' : '') + '</td><td data-l="Project" class="ptitle"><b>' + esc(p.title) + '</b><div class="xs muted mono">' + p.id + ' · ' + p.problem_ids.join(' ') + '</div></td><td data-l="Impact" class="num">' + x.ii + '</td><td data-l="Feasibility" class="num">' + x.fi + '</td><td data-l="Score"><div style="display:flex;gap:6px;align-items:center"><span class="mono">' + x.sc + '</span><span class="bar" style="flex:1"><i style="width:' + (x.sc / 25 * 100) + '%"></i></span></div></td>' + CRIT.map(function (c) { return '<td data-l="' + esc(c.replace(/_/g, ' ')) + '" class="num" title="' + esc((p.score_notes && p.score_notes[c]) || '') + '">' + p.scores[c] + ((p.score_notes && p.score_notes[c]) ? '*' : '') + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div>' +
    '<div id="pdetail" class="panel pdetail" style="margin-top:18px"></div>';
  scatter($('#pscatter'), rescored(), byScore);
  $('#pdetail').innerHTML = MR.projectDetail(BY[sel].rec, false);
  $('#prs').value = PS.sort; $('#prs').onchange = function () { PS.sort = this.value; V.projects(el); };
  $$('[data-psel]', el).forEach(function (r) { r.onclick = function () { PS.sel = r.getAttribute('data-psel'); V.projects(el); $('#pdetail').scrollIntoView({ behavior: 'smooth', block: 'start' }); }; r.onkeydown = function (e) { if (e.key === 'Enter') r.onclick(); }; });
  $$('[data-w]', el).forEach(function (r) { r.oninput = function () { PS.w = PS.w || {}; PS.w[r.getAttribute('data-w')] = +r.value; V.projects(el); var n = $('#w-' + r.getAttribute('data-w')); if (n) n.focus(); }; });
  $('#wreset').onclick = function () { PS.w = null; V.projects(el); };
  $('#pexp').onclick = function () { MR.save('myanmar-rice-project-shortlist.csv', MR.csv(rescored().sort(function (a, b) { return b.sc - a.sc; }).map(function (x) { return Object.assign({ _ii: x.ii, _fi: x.fi, _sc: x.sc }, x.p, x.p.scores); }), [['project_id', 'id'], ['title', 'title'], ['impact_index', '_ii'], ['feasibility_index', '_fi'], ['score', '_sc']].concat(CRIT.map(function (c) { return [c, c]; })).concat([['problem_ids', 'problem_ids'], ['dataset_ids', 'dataset_ids'], ['user', 'user'], ['decision', 'decision']]))); };
};
function scatter(host, R, byScore) {
  var W = 360, H = 300, m = 34, X = function (v) { return m + (v - 1) / 4 * (W - m - 12); }, Y = function (v) { return H - m - (v - 1) / 4 * (H - m - 12); };
  var g = '';
  [1, 2, 3, 4, 5].forEach(function (t) { g += '<line class="gl" x1="' + X(1) + '" x2="' + X(5) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><line class="gl" y1="' + Y(1) + '" y2="' + Y(5) + '" x1="' + X(t) + '" x2="' + X(t) + '"/><text x="' + (X(1) - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + t + '</text><text x="' + X(t) + '" y="' + (H - m + 16) + '" text-anchor="middle">' + t + '</text>'; });
  g += '<text x="' + (W / 2) + '" y="' + (H - 4) + '" text-anchor="middle">Feasibility index</text><text transform="translate(10 ' + (H / 2) + ') rotate(-90)" text-anchor="middle">Impact index</text>';
  var placed = [];
  R.slice().sort(function (a, b) { return byScore.indexOf(a.p.id) - byScore.indexOf(b.p.id); }).forEach(function (x) { var rk = byScore.indexOf(x.p.id) + 1, c = rk === 1 ? MR.cssVar('--gold') : rk <= 5 ? MR.cssVar('--accent') : MR.cssVar('--ink-3');
    var cx = X(x.fi), cyy = Y(x.ii), lab = '';
    if (rk <= 5) {
      var cands = [[cx + 9, cyy + 4, 'start'], [cx - 9, cyy + 4, 'end'], [cx, cyy - 10, 'middle'], [cx, cyy + 18, 'middle']];
      var pick = cands.find(function (cd) { var x0 = cd[2] === 'start' ? cd[0] : cd[2] === 'end' ? cd[0] - 36 : cd[0] - 18, x1 = x0 + 36, y0 = cd[1] - 10, y1 = cd[1] + 2;
        var clashL = placed.some(function (q) { return !(x1 < q[0] || x0 > q[1] || y1 < q[2] || y0 > q[3]); });
        var clashP = R.some(function (o) { if (o === x) return false; var ox = X(o.fi), oy = Y(o.ii); return ox > x0 - 6 && ox < x1 + 6 && oy > y0 - 6 && oy < y1 + 6; });
        return !clashL && !clashP; }) || cands[0];
      var bx0 = pick[2] === 'start' ? pick[0] : pick[2] === 'end' ? pick[0] - 36 : pick[0] - 18; placed.push([bx0, bx0 + 36, pick[1] - 10, pick[1] + 2]);
      lab = '<text x="' + pick[0] + '" y="' + pick[1] + '" text-anchor="' + pick[2] + '" style="fill:' + c + ';font-weight:600">' + x.p.id + '</text>';
    }
    g += '<g><title>' + esc(x.p.id + ' ' + x.p.title + ' — score ' + x.sc) + '</title><circle cx="' + cx + '" cy="' + cyy + '" r="' + (rk <= 5 ? 6 : 4) + '" fill="' + c + '" opacity=".9"/>' + lab + '</g>'; });
  host.innerHTML = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:0" role="img" aria-label="Scatter plot of project impact against feasibility">' + g + '</svg></div>';
}
MR.projectDetail = function (p, compact) {
  var dsg = p.design;
  var chain = [['Problem', p.problem_ids.map(function (x) { return MR.PROB[x].problem_name.split(/[,(:]/)[0]; }).join('; ')], ['Evidence', D.gaps.filter(function (g) { return p.gap_ids.indexOf(g.id) >= 0; }).map(function (g) { return g.evidence_ids.join(', '); }).join('; ') || '–'], ['Gap', p.gap_ids.map(function (g) { return BY[g] ? BY[g].title : g; }).join('; ')],
    ['Dataset', p.dataset_ids.join(', ')], ['Method', p.methods.join(', ')], ['Decision', p.decision], ['Intervention', p.intervention_ids.map(function (i) { return BY[i] ? BY[i].title.split('(')[0] : i; }).join('; ') || p.action], ['Expected impact', p.expected_outcome]];
  var h = '<h2 style="font-size:1.25rem">' + esc(p.title) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="mono">' + p.id + '</span>' + (p.rank === 1 ? '<span class="badge1">#1 recommended</span>' : p.top5 ? '<span class="badge5">Top 5</span>' : '<span class="chip">Rank ' + p.rank + '</span>') + '<span class="chip">Score ' + p.score + ' = ' + p.impact_index + ' × ' + p.feasibility_index + '</span></div>' +
    '<div class="chainline">' + chain.map(function (c, i) { return (i ? '<span class="a">→</span>' : '') + '<div class="c"><b>' + c[0] + '</b>' + esc(c[1]) + '</div>'; }).join('') + '</div>' +
    '<div class="chain">' + [['User', p.user], ['Decision', p.decision], ['Required information', p.required_information], ['Analysis / model', p.analysis], ['Action', p.action], ['Expected outcome', p.expected_outcome], ['Pathway', p.pathway], ['Key risk', p.key_risk]].map(function (r) { return '<div><span class="k">' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>'; }).join('') + '</div>' +
    '<div class="blk"><h4>Score breakdown (1–5)</h4><div class="es">' + CRIT.map(function (c) { return '<span>' + esc(c.replace(/_/g, ' ')) + ' <span class="xs muted">' + (IK.indexOf(c) >= 0 ? 'impact' : FK.indexOf(c) >= 0 ? 'feasibility' : 'tie-breaker') + (p.score_notes && p.score_notes[c] ? ' — ' + esc(p.score_notes[c]) : '') + '</span></span><b>' + MR.dots(p.scores[c]) + '</b>'; }).join('') + '</div></div>' +
    '<div class="blk"><h4>Linked records</h4>' + MR.refInline(p.problem_ids.concat(p.gap_ids, p.dataset_ids, p.intervention_ids, p.benchmark_ids)) + '</div>';
  if (dsg) {
    var F = function (k, v, wide) { return '<div class="f' + (wide ? ' wide' : '') + '"><div class="k">' + k + '</div>' + (Array.isArray(v) ? '<ul style="margin:2px 0;padding-left:18px">' + v.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<div>' + esc(v) + '</div>') + '</div>'; };
    h += '<div class="blk" style="margin-top:12px"><h4>Research project builder</h4><div class="builder">' + F('Why it matters', dsg.why_it_matters, true) + F('Research question', dsg.research_question, true) + F('Hypothesis', dsg.hypothesis, true) + F('Target population / geography', dsg.target) + F('Decision maker / end user', dsg.end_user) +
      F('Decision to improve', dsg.decision) + F('Required variables', dsg.required_data) + F('Available datasets', dsg.available_data) + F('Missing data', dsg.missing_data) + F('Dependent variable', dsg.dependent) + F('Independent variables', dsg.independent) + F('Confounders', dsg.confounders) + F('Baseline method', dsg.baseline) + F('Advanced method (only if justified)', dsg.advanced) + F('Validation', dsg.validation) +
      F('Causal vs predictive', dsg.causal_note) + F('Expected output', dsg.output) + F('Intervention pathway', dsg.intervention) + F('Impact measurement', dsg.impact_measurement) + F('Limitations', dsg.limitations) + F('Risks', dsg.risks) + '</div></div>';
  }
  return h;
};
function glance() {
  var p = D.projects[0];
  return '<aside class="glance" aria-label="Recommendation at a glance"><b>At a glance</b><dl>' +
    '<dt>Problem</dt><dd>' + MR.refInline(['P04', 'P02']) + ' fertilizer cost and declining use efficiency; cost-price squeeze</dd>' +
    '<dt>Gap</dt><dd>' + MR.refInline(['G02', 'G08']) + ' proven tools never deployed; no price-aware optimum N</dd>' +
    '<dt>Data</dt><dd>' + MR.refInline(['D04', 'D13', 'D18', 'D17']) + ' MAPS 8 rounds, ~4,700-5,500 households each</dd>' +
    '<dt>Method</dt><dd>Response curves → panel FE + control function → randomized A/B test</dd>' +
    '<dt>Decision</dt><dd>N rate and timing per season</dd>' +
    '<dt>Channel</dt><dd>' + MR.refInline(['I04', 'I03']) + ' digital advisory app; DoA extension</dd>' +
    '<dt>Measure</dt><dd>Profit per acre; kg grain per kg N; adoption</dd>' +
    '<dt>Score</dt><dd><span class="mono">' + p.score + '</span> / 25 (impact ' + p.impact_index + ' × feasibility ' + p.feasibility_index + ')</dd>' +
    '<dt>Learns from</dt><dd>' + MR.refInline(['B01', 'B08', 'B02']) + '</dd></dl></aside>';
}
function finalAnswer() {
  var p = D.projects[0];
  return '<p><b>Work on price-aware nitrogen advice for monsoon rice (' + p.id + '), delivered through a digital advisory channel that already reaches farmers.</b></p>' +
    '<p><b>Why:</b> fertilizer is the largest commercial input, and its economics deteriorated sharply: urea +23% and profits −40% between the 2023 and 2025 monsoons, urea +28–49% again in mid-2026, and conflict has lowered fertilizer use efficiency every year since 2021 ' + MR.refInline(['S302', 'S304', 'S269']) + '. Proven tools exist abroad — site-specific advice raised yields 17–19% in Odisha ' + MR.refInline(['S267']) + ' and integrated recommendations reached 20.9 million Chinese farmers with +11% yield and −15–18% N ' + MR.refInline(['S076']) + ' — while Myanmar\'s Rice Crop Manager stopped at a 2019 prototype ' + MR.refInline(['S112']) + '. That is an implementation gap a data analyst can close.</p>' +
    '<p><b>Data:</b> MAPS rounds 1–8 (plot fertilizer, yields, prices, establishment method, shocks, township) ' + MR.refInline(['D04']) + ', CHIRPS rainfall ' + MR.refInline(['D13']) + ', ACLED conflict ' + MR.refInline(['D18']) + '; collect crop-cut yields and split-application dates from a pilot subsample.</p>' +
    '<p><b>Method:</b> start simple — zone-level yield-response curves and the economic-optimum N where marginal product × paddy price = urea price; then panel fixed effects with a control function, because farmers choose N. Machine learning only if heterogeneity remains unexplained. Validate out of sample and with a randomized A/B test of advice variants.</p>' +
    '<p><b>Decision improved:</b> each farmer\'s N rate and timing this season. <b>Route to farmers:</b> seasonal lookup tables pushed through the Htwet Toe digital advisory platform (139,000 farmers in 2025) and DoA extension ' + MR.refInline(['S298', 'I04']) + '; measure profit per acre and kg grain per kg N against control users.</p>' +
    '<p class="xs muted">Runner-up designs: crop-establishment decision model (PR04), township flood-loss estimates (PR03), randomized evaluation of digital advisories (PR14), profitability nowcast (PR02).</p>';
}

/* ---------- Methodology ---------- */
V.methodology = function (el) {
  var M = D.methodology, f = M.flow;
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>Research coverage and methodology</h2><span class="note">Search date ' + esc(M.search_date) + '. This is not "all Myanmar rice research".</span></div>' +
    '<div class="flow">' + [['Crossref unique records', f.crossref_unique], ['Title-screened: Myanmar + rice', f.crossref_title_screen_rice], ['Title-screened: Myanmar + agriculture', f.crossref_title_screen_agri], ['CGSpace unique records', f.cgspace_unique], ['CGSpace candidates', f.cgspace_candidates], ['Merged after dedup', f.merged_after_dedup], ['Removed at full-text QC', f.removed_full_text_qc], ['Targeted additions', f.targeted_additions], ['Final study records', f.final_studies], ['With abstracts', f.with_abstract], ['Curated in depth', f.curated], ['Report rounds collapsed', f.report_series_collapsed]].map(function (x) { return '<div class="f"><div class="n">' + x[1] + '</div><div class="l">' + esc(x[0]) + '</div></div>'; }).join('') + '</div>' +
    '<div class="section-h"><h2 style="font-size:1.1rem">Sources searched</h2></div><div class="tbl-wrap"><table class="tbl cardify"><thead><tr><th>Source</th><th>Role</th><th>Queries</th><th>Records</th><th>Status</th></tr></thead><tbody>' + M.sources_searched.map(function (s) { return '<tr><td data-l="Source"><b>' + esc(s.name) + '</b></td><td data-l="Role" class="xs">' + esc(s.role) + '</td><td data-l="Queries" class="num">' + esc(s.queries) + '</td><td data-l="Records" class="num">' + esc(s.records) + '</td><td data-l="Status" class="xs">' + esc(s.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="grid2" style="margin-top:14px"><div class="panel" style="padding:14px 16px"><h3 style="font-size:1rem">Inclusion</h3><ul class="small prose">' + M.inclusion.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><h3 style="font-size:1rem">Exclusion</h3><ul class="small prose">' + M.exclusion.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '<p class="xs muted">Title-stage exclusions: ' + Object.keys(M.exclusion_reasons).map(function (k) { return esc(k) + ' (' + M.exclusion_reasons[k] + ')'; }).join('; ') + '. Full-text QC removals: ' + M.excluded_qc.map(function (x) { return esc(x.study_id + ' — ' + x.reason); }).join('; ') + '</p></div>' +
    '<div class="panel" style="padding:14px 16px"><h3 style="font-size:1rem">Known blind spots</h3><ul class="small prose">' + M.blind_spots.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>' +
    '<div class="grid2" style="margin-top:14px"><div class="panel" style="padding:14px 16px"><h3 style="font-size:1rem">Retrieval method</h3><p class="small">' + esc(M.retrieval) + '</p><p class="xs muted">Adapter in use: <span class="mono">' + esc(MR.adapter.name) + '</span>. Interfaces: search(query, filters), rank, filter(records, facets), getRelated(id), getEvidence(id). An EmbeddingSearchAdapter or RemoteVectorSearchAdapter can replace it without changing the UI.</p>' +
    '<h3 style="font-size:1rem">Scoring</h3><p class="small">' + esc(M.scoring.formula) + '</p><p class="small">' + esc(M.score_rubric) + '</p><h3 style="font-size:1rem">Confidence rubric</h3><ul class="small prose">' + M.confidence_rubric.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
    '<div class="panel" style="padding:14px 16px"><h3 style="font-size:1rem">Search validation</h3>' + valTable() + '</div></div>' +
    '<details class="panel" style="padding:10px 14px;margin-top:14px"><summary class="small"><b>Query log</b> — ' + M.crossref_queries.length + ' Crossref and ' + M.cgspace_queries.length + ' CGSpace queries</summary><div class="grid2" style="margin-top:8px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Crossref query</th><th class="num">Returned</th><th class="num">New</th></tr></thead><tbody>' + M.crossref_queries.map(function (q) { return '<tr><td class="xs">' + esc(q.query) + '</td><td class="num">' + q.returned + '</td><td class="num">' + q['new'] + '</td></tr>'; }).join('') + '</tbody></table></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>CGSpace query</th><th class="num">Hits</th><th class="num">New</th></tr></thead><tbody>' + M.cgspace_queries.map(function (q) { return '<tr><td class="xs">' + esc(q.query) + '</td><td class="num">' + q.total_hits + '</td><td class="num">' + q['new'] + '</td></tr>'; }).join('') + '</tbody></table></div></div></details>' +
    '<div class="section-h"><h2 style="font-size:1.1rem">Source registry and provenance</h2><span class="note">' + D.sources.length + ' sources · ' + D.claims.length + ' derived claims with source IDs</span></div>' +
    '<div class="toolbar"><button class="btn" type="button" id="mx1">Export all data (JSON)</button><button class="btn" type="button" id="mx2">Citation list</button><button class="btn" type="button" id="mx3">Relationships (CSV)</button><button class="btn" type="button" id="mx4">Claims / provenance (CSV)</button></div>' +
    '<details class="panel" style="padding:10px 14px"><summary class="small"><b>Derived claims</b> (claim → record → sources → verification)</summary><div class="tbl-wrap" style="margin-top:8px"><table class="tbl"><thead><tr><th>ID</th><th>Claim</th><th>Sources</th><th>Status</th><th>Confidence</th></tr></thead><tbody>' + D.claims.map(function (c) { return '<tr><td class="mono xs">' + esc(c.claim_id) + '</td><td class="xs">' + esc(c.claim) + '</td><td>' + MR.refInline(c.source_ids) + '</td><td class="xs">' + esc(c.verification_status) + '</td><td>' + MR.confBadge(c.confidence) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  $('#mx1').onclick = function () { var o = Object.assign({}, D); o.studies = D.studies.map(function (s) { var x = Object.assign({}, s); delete x.refs; return x; }); MR.save('myanmar-rice-research-intelligence.json', JSON.stringify(o)); };
  $('#mx2').onclick = function () { MR.save('myanmar-rice-source-registry.txt', D.sources.map(function (s) { return '[' + s.source_id + '] ' + s.citation + ' (Tier ' + s.tier + '; ' + s.verification_status + ')'; }).join('\n')); };
  $('#mx3').onclick = function () { MR.save('myanmar-rice-relationships.csv', MR.csv(D.relationships, [['source_id', 'source_id'], ['relationship_type', 'relationship_type'], ['target_id', 'target_id'], ['evidence', 'evidence'], ['confidence', 'confidence'], ['source_url', 'source_url'], ['origin', 'origin']])); };
  $('#mx4').onclick = function () { MR.save('myanmar-rice-claims.csv', MR.csv(D.claims, [['claim_id', 'claim_id'], ['record_id', 'record_id'], ['claim', 'claim'], ['source_ids', 'source_ids'], ['evidence_type', 'evidence_type'], ['verification_status', 'verification_status'], ['confidence', 'confidence'], ['last_verified', 'last_verified']])); };
};
function valTable() {
  var v = D.validation; if (!v) return '<p class="small muted">Validation results not attached.</p>';
  return '<p class="xs muted">Run ' + esc(v.date) + ' in headless Chromium against this build. "Useful" = a human-judged relevant record appears in the top 5.</p><div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Query</th><th class="num">Results</th><th>Top results</th><th>Useful?</th></tr></thead><tbody>' +
    v.queries.map(function (q) { return '<tr><td class="xs">' + esc(q.q) + '</td><td class="num">' + q.n + '</td><td class="xs">' + q.top.map(function (t) { return '<button class="chip" data-open="' + esc(t) + '" type="button">' + esc(t) + '</button>'; }).join(' ') + '</td><td class="xs ' + (q.ok ? 'testok' : 'testwarn') + '">' + esc(q.verdict) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    (v.checks ? '<h4 style="font-family:var(--f-body);font-size:.8rem;margin-top:10px">Other checks</h4><ul class="xs prose">' + v.checks.map(function (c) { return '<li><span class="' + (c.ok ? 'testok' : 'testwarn') + '">' + (c.ok ? 'Pass' : 'Note') + '</span> — ' + esc(c.t) + '</li>'; }).join('') + '</ul>' : '');
}
})(MR);
