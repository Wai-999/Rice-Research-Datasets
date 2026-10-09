/* ===== Core: utilities, record normalisation, retrieval adapter ===== */
var MR = window.MRRI = window.MRRI || {};
(function (MR) {
'use strict';
var D = window.RICE_DATA;
MR.D = D;
var esc = MR.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
MR.$ = function (s, el) { return (el || document).querySelector(s); };
MR.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
MR.LS = {
  get: function (k, d) { try { var v = localStorage.getItem('mrri.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('mrri.' + k, JSON.stringify(v)); } catch (e) { } }
};
MR.uniq = function (a) { var s = {}, o = []; (a || []).forEach(function (x) { if (x != null && x !== '' && !s[x]) { s[x] = 1; o.push(x); } }); return o; };

/* ---------- lookups ---------- */
var BY = MR.BY = {};
var PROB = {}; D.problems.forEach(function (p) { PROB[p.id] = p; });
MR.PROB = PROB;
MR.STATUS = { A: 'A · At scale', B: 'B · Partial', C: 'C · Pilot / experimental', D: 'D · Proposed only', E: 'E · Unknown' };
MR.STATUS_WORDS = { A: 'implemented at scale widely adopted reached farmers', B: 'partially implemented partial adoption scaling', C: 'pilot experimental trial demonstration not scaled', D: 'proposed only recommendation not implemented never scaled', E: 'unknown implementation status not verified' };
MR.TYPE_LABEL = { Study: 'Study', Problem: 'Problem', Dataset: 'Dataset', Intervention: 'Intervention', Policy: 'Policy', Benchmark: 'Neighbour case', Gap: 'Research gap', Project: 'Project opportunity' };
var REGIONS = MR.REGIONS = [
  ['Ayeyarwady', 'ဧရာဝတီ', /ayeyarwad+y|irrawaddy|delta\b/i], ['Bago', 'ပဲခူး', /\bbago\b|pegu/i], ['Yangon', 'ရန်ကုန်', /yangon|rangoon/i], ['Sagaing', 'စစ်ကိုင်း', /sagaing|thapanzeik/i],
  ['Mandalay', 'မန္တလေး', /mandalay|kyaukse/i], ['Magway', 'မကွေး', /magway|magwe/i], ['Nay Pyi Taw', 'နေပြည်တော်', /nay ?pyi ?taw|naypyitaw/i], ['Shan', 'ရှမ်း', /\bshan\b/i],
  ['Kachin', 'ကချင်', /kachin/i], ['Rakhine', 'ရခိုင်', /rakhine|arakan/i], ['Mon', 'မွန်', /\bmon\b/i], ['Kayin', 'ကရင်', /kayin|karen/i], ['Tanintharyi', 'တနင်္သာရီ', /tanintharyi|taninthayi/i],
  ['Chin', 'ချင်း', /\bchin\b/i], ['Kayah', 'ကယား', /kayah/i]];
MR.regionMy = {}; REGIONS.forEach(function (r) { MR.regionMy[r[0]] = r[1]; });
MR.COUNTRIES = ['Myanmar', 'Thailand', 'Vietnam', 'Bangladesh', 'India', 'China', 'Cambodia', 'Laos', 'Global / regional', 'Other'];

function regionsFrom(text) { var o = []; REGIONS.forEach(function (r) { if (r[2].test(text || '')) o.push(r[0]); }); return o; }
function yearsIn(text) { var m = String(text || '').match(/(19|20)\d{2}/g); return m ? m.map(Number) : []; }
function pcats(ids) { return MR.uniq((ids || []).map(function (i) { return PROB[i] ? PROB[i].problem_category : null; })); }
function resNorm(t) {
  t = String(t || '').toLowerCase(); var o = [];
  if (/daily|hourly|30-min|\bday\b/.test(t)) o.push('Daily');
  if (/weekly|pentad|5 days|6-12 days|16-day|16 days/.test(t)) o.push('Weekly');
  if (/monthly/.test(t)) o.push('Monthly');
  if (/quarterly/.test(t)) o.push('Quarterly');
  if (/seasonal|biannual/.test(t)) o.push('Seasonal');
  if (/annual/.test(t) && !/biannual/.test(t)) o.push('Annual');
  if (/crop-cycle/.test(t)) o.push('Crop-cycle');
  if (/event/.test(t)) o.push('Event-based');
  if (/static/.test(t)) o.push('Static');
  return o.length ? o : ['Other'];
}
function spatialLevel(d) {
  var s = (d.spatial_resolution + ' ' + d.geography).toLowerCase(), o = [];
  if (/township|village/.test(s)) o.push('Township or finer');
  if (/point|market|plot|household/.test(s)) o.push('Point / market / plot');
  if (/admin-1|state|region|admin-2|adm3/.test(s)) o.push('State/region (admin-1/2)');
  if (/\b\d+ ?m\b|10-20 m|250 m|30 m|10 m/.test(s)) o.push('Raster ≤ 250 m');
  if (/deg|km|0\.0|0\.1|climate zone/.test(s)) o.push('Raster ≥ 5 km');
  if (/country/.test(s)) o.push('National only');
  return o.length ? o : ['Other'];
}
function impactFromText(t) {
  var o = []; t = String(t || '');
  if (/yield|t\/ha|productiv/i.test(t)) o.push('Yield'); if (/cost|price/i.test(t)) o.push('Cost'); if (/labou?r|wage/i.test(t)) o.push('Labor');
  if (/time|timel|faster|speed/i.test(t)) o.push('Time'); if (/water|irrigat/i.test(t)) o.push('Water'); if (/fertili|nitrogen|\bN\b|seed rate|input/i.test(t)) o.push('Input efficiency');
  if (/profit|income|margin|return|BCR|NPV/i.test(t)) o.push('Profit'); if (/risk|loss|insur|shock|resilien/i.test(t)) o.push('Risk reduction');
  return o;
}

/* ---------- unified docs ---------- */
var DOCS = MR.DOCS = [];
var DSNAME = {}; D.datasets.forEach(function (x) { DSNAME[x.id] = x.name; });
function add(doc) { DOCS.push(doc); BY[doc.id] = doc; }
D.studies.forEach(function (s) {
  var pnames = s.problem_ids.map(function (i) { return PROB[i] ? PROB[i].problem_name : ''; }).join(' ');
  add({ id: s.id, type: 'Study', rec: s, title: s.title, year: s.year, span: s.year ? [s.year, s.year] : null,
    f: { pid: s.problem_ids, type: ['Study'], country: s.countries.map(function (c) { return MR.COUNTRIES.indexOf(c) >= 0 ? c : (c === 'Multi-country' ? 'Global / regional' : 'Other'); }), region: s.regions, zone: s.zones, pcat: pcats(s.problem_ids),
      rtype: s.research_types, method: s.methods, dtype: s.data_types, res: [], space: [], impl: [s.implementation_status === 'Not assessed' ? 'N' : s.implementation_status], tier: ['Tier ' + s.source_tier], access: [], impact: s.impact_dimensions, conf: [s.confidence] },
    text: { title: s.title, obj: s.objective, find: (s.findings || []).join(' '), abs: s.abstract || s.tldr || '',
      tags: [pnames, (s.problem_categories || []).join(' '), s.methods.join(' '), s.data_types.join(' '), s.research_types.join(' '), (s.subjects || []).join(' '), s.dataset_ids.map(function (d) { return DSNAME[d] || ''; }).join(' '), s.intervention_ids.length ? MR.STATUS_WORDS[s.implementation_status] || '' : '', s.publication_type || ''].join(' '),
      loc: [s.geographic_area, s.regions.join(' '), s.zones.join(' '), s.countries.join(' ')].join(' '), auth: [s.authors.join(' '), s.institution, s.journal_or_publisher].join(' '),
      other: [s.methodology, (s.limitations || []).join(' '), s.research_gap, s.note, (s.effect_sizes || []).map(function (e) { return e.metric + ' ' + e.value + ' ' + e.context; }).join(' '), s.sample_size].join(' ') } });
});
D.problems.forEach(function (p) {
  var ivs = (p.existing_interventions || []);
  add({ id: p.id, type: 'Problem', rec: p, title: p.problem_name, year: null, span: (function () { var y = yearsIn(p.time_period); return y.length ? [Math.min.apply(0, y), Math.max.apply(0, y)] : null; })(),
    f: { pid: [p.id], type: ['Problem'], country: ['Myanmar'], region: regionsFrom(p.geographic_scope), zone: [], pcat: [p.problem_category], rtype: [], method: [], dtype: [], res: [], space: [], impl: [], tier: [], access: [], impact: impactFromText([p.yield_impact, p.financial_impact, p.labor_impact, p.time_impact].join(' ')), conf: [p.confidence] },
    text: { title: p.problem_name, obj: p.problem_definition, find: p.evidence.map(function (e) { return e.claim; }).join(' '), abs: [p.causal_chain.symptom, p.causal_chain.immediate_causes.join(' '), p.causal_chain.root_causes.join(' ')].join(' '),
      tags: [p.problem_category, p.symptom_or_root_cause, 'problem constraint cause', p.priority + ' priority', p.data_science_potential].join(' '), loc: p.geographic_scope, auth: '',
      other: [p.data_availability, p.trend, p.farmers_affected, p.yield_impact, p.financial_impact, p.labor_impact].join(' ') } });
});
D.datasets.forEach(function (d) {
  var glob = /global|southeast asia|50s-50n|bay of bengal|benchmark/i.test(d.geography);
  add({ id: d.id, type: 'Dataset', rec: d, title: d.name, year: null, span: (function () { var y = yearsIn(d.start_date + ' ' + d.end_date); return y.length ? [Math.min.apply(0, y), Math.max.apply(0, y)] : null; })(),
    f: { pid: d.problem_ids, type: ['Dataset'], country: glob ? ['Myanmar', 'Global / regional'] : ['Myanmar'], region: [], zone: [], pcat: pcats(d.problem_ids), rtype: [], method: [], dtype: d.data_types, res: resNorm(d.temporal_resolution), space: spatialLevel(d), impl: [], tier: ['Tier ' + d.tier], access: [d.access_class], impact: [],
      conf: [/downloaded|api|parsed|profiled|search api|returned/i.test(d.verified) ? 'High' : /resolves/i.test(d.verified) && !/not independently/i.test(d.verified) ? 'Medium' : 'Low'] },
    text: { title: d.name, obj: d.description, find: d.variables.join(' '), abs: [d.methodology, d.data_quality, d.missingness].join(' '), tags: ['dataset data source', d.data_types.join(' '), d.temporal_resolution, d.spatial_resolution, d.access_class, d.access_method, d.download_format, d.license].join(' '),
      loc: d.geography, auth: d.producer, other: d.known_limitations.join(' ') + ' ' + d.unit } });
});
var POLICY = { I07: 1, I21: 1 };
D.interventions.forEach(function (i) {
  add({ id: i.id, type: POLICY[i.id] ? 'Policy' : 'Intervention', rec: i, title: i.name, year: (yearsIn(i.date)[0] || null), span: (function () { var y = yearsIn(i.date); return y.length ? [Math.min.apply(0, y), Math.max.apply(0, y)] : null; })(),
    f: { pid: i.problem_ids, type: [POLICY[i.id] ? 'Policy' : 'Intervention'], country: ['Myanmar'], region: regionsFrom(i.location), zone: [], pcat: pcats(i.problem_ids), rtype: [], method: [], dtype: [], res: [], space: [], impl: [i.status], tier: [], access: [], impact: impactFromText(i.outcomes.join(' ')), conf: [i.confidence] },
    text: { title: i.name, obj: i.outcomes.join(' '), find: i.barriers.join(' '), abs: i.persistence, tags: ['intervention solution', MR.STATUS_WORDS[i.status], i.problem_ids.map(function (x) { return PROB[x] ? PROB[x].problem_name : ''; }).join(' ')].join(' '),
      loc: i.location, auth: i.organization, other: [i.farmers, i.area, i.date].join(' ') } });
});
var TRF = { 'Directly transferable': 0, 'Transferable with modification': 1, 'Difficult': 2, 'Not suitable': 3 };
MR.TRF = TRF;
D.benchmarks.forEach(function (b) {
  add({ id: b.id, type: 'Benchmark', rec: b, title: b.country + ': ' + b.intervention, year: (yearsIn(b.year)[0] || null), span: (function () { var y = yearsIn(b.year); return y.length ? [Math.min.apply(0, y), Math.max.apply(0, y)] : null; })(),
    f: { pid: b.problem_ids, type: ['Benchmark'], country: [b.country], region: [], zone: [], pcat: pcats(b.problem_ids), rtype: [], method: [], dtype: [], res: [], space: [], impl: [], tier: [], access: [], impact: impactFromText(b.impact.join(' ')), conf: [b.confidence] },
    text: { title: b.country + ' ' + b.intervention, obj: b.mechanism + ' ' + b.impact.join(' '), find: b.why + ' ' + b.conditions, abs: b.transfer_reason + ' ' + b.required_modification, tags: ['neighbour country benchmark solution intervention implemented', b.transferability, 'transfer transferable'].join(' '),
      loc: b.country, auth: '', other: [b.adoption, b.cost].join(' ') } });
});
D.gaps.forEach(function (g) {
  add({ id: g.id, type: 'Gap', rec: g, title: g.title, year: null, span: null,
    f: { pid: g.problem_ids, type: ['Gap'], country: ['Myanmar'], region: [], zone: [], pcat: pcats(g.problem_ids), rtype: [], method: [], dtype: [], res: [], space: [], impl: [], tier: [], access: [], impact: [], conf: [] },
    text: { title: g.title, obj: g.description, find: '', abs: '', tags: ['research gap', g.gap_type + ' gap', g.priority + ' priority'].join(' '), loc: 'Myanmar', auth: '', other: '' } });
});
D.projects.forEach(function (p) {
  var sc = p.scores, imp = [];
  if (sc.yield_impact >= 4) imp.push('Yield'); if (sc.labor_time_saving >= 4) imp.push('Labor', 'Time'); if (sc.economic_impact >= 4) imp.push('Profit', 'Cost');
  var dts = MR.uniq([].concat.apply([], p.dataset_ids.map(function (d) { var x = D.datasets.find(function (q) { return q.id === d; }); return x ? x.data_types : []; })));
  add({ id: p.id, type: 'Project', rec: p, title: p.title, year: null, span: null,
    f: { pid: p.problem_ids, type: ['Project'], country: ['Myanmar'], region: [], zone: [], pcat: pcats(p.problem_ids), rtype: [], method: p.methods, dtype: dts, res: [], space: [], impl: [], tier: [], access: [], impact: imp, conf: [] },
    text: { title: p.title, obj: p.decision + ' ' + p.expected_outcome, find: p.analysis, abs: p.required_information + ' ' + p.action, tags: ['project opportunity data science data analyst', p.methods.join(' '), p.user].join(' '), loc: 'Myanmar', auth: '', other: (p.key_risk || '') + ' ' + (p.pathway || '') } });
});
MR.typeOrder = { Problem: 0, Project: 1, Intervention: 2, Policy: 3, Benchmark: 4, Gap: 5, Dataset: 6, Study: 7 };

/* edges index */
MR.EDGES = D.relationships;
MR.adj = {};
D.relationships.forEach(function (e, i) {
  (MR.adj[e.source_id] = MR.adj[e.source_id] || []).push(i);
  (MR.adj[e.target_id] = MR.adj[e.target_id] || []).push(i);
});
MR.CONTRA = {};
D.relationships.forEach(function (e) { if (/contradict|contest|challenges|qualif|differs/.test(e.relationship_type)) { MR.CONTRA[e.source_id] = 1; MR.CONTRA[e.target_id] = 1; } });

/* ===== Text processing ===== */
var BRIT = { labour: 'labor', fertiliser: 'fertilizer', fertilisers: 'fertilizers', mechanisation: 'mechanization', mechanised: 'mechanized', programme: 'program', optimisation: 'optimization', optimise: 'optimize', organisation: 'organization', utilisation: 'utilization', modelling: 'modeling', analyse: 'analyze', analysed: 'analyzed', behaviour: 'behavior', centre: 'center', neighbour: 'neighbor', neighbouring: 'neighboring', sowing: 'sow' };
var STOP = {}; ('a an the of in on at to for from by with and or as is are was were be been being that this these those it its their there which who whom what when where why how than then into over under about between among across per via vs not no can could may might should would will do does did has have had also more most less least very such using used use based within without during after before since until while both each other any all some our we they them his her you your i me my').split(' ').forEach(function (w) { STOP[w] = 1; });
var QSTOP = {}; ('show find list give tell me what which how research studies study paper papers record records evidence about related relating regarding actually please any good best').split(' ').forEach(function (w) { QSTOP[w] = 1; });
var GENERIC = {}; ('rice paddy myanmar agricultur agriculture farming farm related relat data').split(' ').forEach(function (w) { GENERIC[w] = 1; });
var stem = MR.stem = function (w) {
  if (BRIT[w]) w = BRIT[w];
  if (w.length <= 3 || /^\d/.test(w)) return w;
  if (w.length > 5) w = w.replace(/isation$/, 'ization').replace(/ised$/, 'ized').replace(/ising$/, 'izing').replace(/ise$/, 'ize');
  if (/ies$/.test(w) && w.length > 4) w = w.slice(0, -3) + 'y';
  else if (/sses$/.test(w)) w = w.slice(0, -2);
  else if (/[^su]s$/.test(w) && !/(ss|us|is|ys)$/.test(w) && w.length > 3) w = w.slice(0, -1);
  if (/ations?$/.test(w) && w.length > 7) w = w.replace(/ations?$/, '');
  else if (/ingly$/.test(w)) w = w.slice(0, -5);
  else if (/ing$/.test(w) && w.length > 5) w = w.slice(0, -3);
  else if (/ed$/.test(w) && w.length > 4) w = w.slice(0, -2);
  if (/ments?$/.test(w) && w.length > 7) w = w.replace(/ments?$/, '');
  if (/ly$/.test(w) && w.length > 5) w = w.slice(0, -2);
  if (/([bcdfgkmnprt])\1$/.test(w) && w.length > 4) w = w.slice(0, -1);
  if (/e$/.test(w) && w.length > 4) w = w.slice(0, -1);
  if (/iz$/.test(w) && w.length > 6) w = w.slice(0, -2);
  return w;
};
function norm(t) { return String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); }
var tokRe = /[a-z0-9]+(?:[-'][a-z0-9]+)*/g;
var tokens = MR.tokens = function (t, keepStop) {
  var out = [], m, s = norm(t);
  tokRe.lastIndex = 0;
  while ((m = tokRe.exec(s))) {
    var w = m[0].replace(/'s$/, '');
    if (w.indexOf('-') > 0) { var parts = w.split('-'); parts.forEach(function (p) { if (p && (keepStop || !STOP[p])) out.push(stem(p)); }); out.push(stem(parts.join(''))); continue; }
    if (!keepStop && STOP[w]) continue;
    out.push(stem(w));
  }
  return out;
};

/* concept / synonym dictionary (query expansion) */
var CONCEPTS = MR.CONCEPTS = [
  ['labor', 'labour', 'worker', 'workforce', 'wage', 'wages', 'migration', 'migrant', 'shortage', 'scarcity', 'hired'],
  ['mechanization', 'mechanisation', 'tractor', 'combine', 'harvester', 'machinery', 'machine', 'thresher', 'outsourcing', 'service provider'],
  ['yield', 'productivity', 'output', 'production', 't/ha', 'grain yield', 'tfp'],
  ['flood', 'flooding', 'inundation', 'submergence', 'cyclone', 'storm', 'heavy rain', 'nargis', 'mocha', 'yagi'],
  ['drought', 'dry spell', 'water stress', 'rainfall deficit', 'spi', 'aridity'],
  ['fertilizer', 'fertiliser', 'nitrogen', 'urea', 'npk', 'nutrient', 'nutrient management', 'manure', 'site-specific nutrient'],
  ['satellite', 'remote sensing', 'sentinel', 'landsat', 'modis', 'sar', 'ndvi', 'earth observation', 'imagery', 'palsar'],
  ['implemented', 'implementation', 'adoption', 'adopted', 'scaled', 'scale', 'deployed', 'uptake', 'reached farmers', 'real farms', 'diffusion'],
  ['failed', 'failure', 'barrier', 'constraint', 'non-adoption', 'stalled', 'never scaled', 'abandoned', 'not implemented'],
  ['optimization', 'optimisation', 'optimum', 'optimal', 'linear programming', 'operations research', 'location-allocation', 'model predictive control', 'p-median'],
  ['price', 'prices', 'market', 'farmgate', 'wholesale', 'retail', 'export price', 'price transmission'],
  ['credit', 'loan', 'finance', 'microfinance', 'debt', 'mfi', 'madb', 'borrow'],
  ['seed', 'variety', 'varieties', 'cultivar', 'germplasm', 'certified seed', 'hybrid'],
  ['salinity', 'saline', 'salt', 'seawater', 'electrical conductivity', 'saltwater intrusion'],
  ['postharvest', 'post-harvest', 'drying', 'dryer', 'storage', 'milling', 'harvest loss', 'losses', 'rodent', 'hermetic'],
  ['extension', 'advisory', 'information', 'training', 'sms', 'digital', 'farmer field school', 'app', 'climate services'],
  ['conflict', 'coup', 'violence', 'violent', 'insecurity', 'fragile', 'instability', 'war'],
  ['machine learning', 'ml', 'ai', 'artificial intelligence', 'neural', 'random forest', 'deep learning', 'cnn', 'support vector'],
  ['irrigation', 'water management', 'pump', 'canal', 'dam', 'awd', 'alternate wetting', 'water user'],
  ['pest', 'disease', 'weed', 'rodent', 'insect', 'nematode', 'armyworm', 'blight'],
  ['climate', 'weather', 'rainfall', 'temperature', 'monsoon', 'el nino', 'heat'],
  ['profit', 'profitability', 'income', 'margin', 'returns', 'cost', 'costs', 'gross margin', 'benefit-cost'],
  ['cause', 'causes', 'driver', 'determinant', 'factor', 'constraint', 'why', 'reason'],
  ['loss', 'losses', 'damage', 'decline', 'reduction', 'shock'],
  ['transplanting', 'direct seeding', 'broadcasting', 'dsr', 'establishment', 'drum seeder', 'row seeding'],
  ['township', 'subnational', 'village tract', 'district', 'local'],
  ['survey', 'farmer survey', 'household survey', 'phone survey', 'panel', 'questionnaire', 'farmer-level'],
  ['gender', 'women', 'female', 'youth'],
  ['regression', 'econometric', 'panel data', 'stochastic frontier', 'probit', 'logit', 'difference-in-differences'],
  ['time series', 'forecast', 'forecasting', 'nowcast', 'trend', 'cointegration', 'var']];
var CONCEPT_IDX = {};
CONCEPTS.forEach(function (g, gi) { g.forEach(function (term) { if (/\s/.test(term)) return; tokens(term).forEach(function (t) { (CONCEPT_IDX[t] = CONCEPT_IDX[t] || []).push(gi); }); }); });

/* Burmese -> English term map (partial) */
var MY = MR.MY = { 'စပါး': 'paddy rice', 'ဆန်': 'rice', 'မြေဩဇာ': 'fertilizer', 'ရေကြီး': 'flood', 'မိုးခေါင်': 'drought', 'ဆားငန်': 'salinity', 'လုပ်သား': 'labor', 'လုပ်အားခ': 'wage', 'စက်ယန္တရား': 'machinery mechanization',
  'မျိုးစေ့': 'seed', 'ဆည်မြောင်း': 'irrigation', 'ပိုးမွှား': 'pest', 'ဈေးနှုန်း': 'price', 'အထွက်နှုန်း': 'yield', 'ချေးငွေ': 'credit loan', 'ပဋိပက္ခ': 'conflict', 'ရာသီဥတု': 'climate weather', 'မိုးစပါး': 'monsoon paddy',
  'နွေစပါး': 'summer dry season paddy', 'ကောက်စိုက်': 'transplanting', 'ပက်ကြဲ': 'broadcasting direct seeding', 'ဂြိုဟ်တု': 'satellite remote sensing', 'ဧရာဝတီ': 'Ayeyarwady', 'ပဲခူး': 'Bago', 'စစ်ကိုင်း': 'Sagaing', 'မကွေး': 'Magway',
  'မန္တလေး': 'Mandalay', 'ရခိုင်': 'Rakhine', 'ရန်ကုန်': 'Yangon', 'နေပြည်တော်': 'Nay Pyi Taw', 'ရှမ်း': 'Shan', 'ကချင်': 'Kachin', 'မွန်': 'Mon', 'ကရင်': 'Kayin', 'တနင်္သာရီ': 'Tanintharyi', 'ချင်း': 'Chin', 'ကယား': 'Kayah', 'အချက်အလက်': 'dataset data', 'မြေသြဇာ': 'fertilizer', 'ရေလွှမ်း': 'flood inundation', 'ကွန်ဘိုင်း': 'combine harvester' };

/* ===== BM25 index (LocalBM25Adapter) ===== */
var FIELD_W = { title: 3, obj: 2, find: 1.6, tags: 1.6, loc: 1.6, auth: 1, abs: 1, other: 0.8 };
function LocalBM25Adapter() { this.k1 = 1.2; this.b = 0.6; }
LocalBM25Adapter.prototype.name = 'LocalBM25Adapter';
LocalBM25Adapter.prototype.label = 'Hybrid lexical retrieval (BM25 + synonyms + fuzzy + intent parsing) — not embedding-based';
LocalBM25Adapter.prototype.index = function (docs) {
  var df = {}, total = 0, self = this;
  var surf = {};
  docs.forEach(function (d) {
    var tf = {}, len = 0;
    /* surface-word vocabulary (unstemmed) → stem, for typo matching on whole words */
    Object.keys(FIELD_W).forEach(function (f) { var m, s0 = norm(d.text[f]); tokRe.lastIndex = 0; while ((m = tokRe.exec(s0))) { m[0].split(/[-']/).forEach(function (w) { if (w.length >= 4 && !STOP[w] && !/^\d/.test(w) && !surf[w]) surf[w] = stem(w); }); } });
    Object.keys(FIELD_W).forEach(function (f) { var w = FIELD_W[f]; tokens(d.text[f]).forEach(function (t) { tf[t] = (tf[t] || 0) + w; len += w; }); });
    d._tf = tf; d._len = len; total += len;
    Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
    d._full = norm(Object.keys(d.text).map(function (k) { return d.text[k]; }).join(' • '));
  });
  this.df = df; this.N = docs.length; this.avg = total / docs.length; this.vocab = Object.keys(df); this.surf = surf; this.surfVocab = Object.keys(surf);
};
LocalBM25Adapter.prototype.idf = function (t) { var n = this.df[t] || 0; return Math.log(1 + (this.N - n + 0.5) / (n + 0.5)); };
LocalBM25Adapter.prototype.score = function (d, qterms) {
  var s = 0, self = this, hits = 0;
  qterms.forEach(function (q) { var tf = d._tf[q.t]; if (!tf) return; hits++; var den = tf + self.k1 * (1 - self.b + self.b * d._len / self.avg); s += q.w * self.idf(q.t) * tf * (self.k1 + 1) / den; });
  return { s: s, hits: hits };
};
function editDist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  var pp = null, prev = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) { var cur = [i], rowMin = i;
    for (j = 1; j <= b.length; j++) { var c = a[i - 1] === b[j - 1] ? 0 : 1; var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (pp && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, pp[j - 2] + 1);
      cur[j] = v; if (v < rowMin) rowMin = v; }
    if (rowMin > max) return max + 1; pp = prev; prev = cur; }
  return prev[b.length];
}
/* Typo matching. Compares the user's whole (unstemmed) word with whole words seen in the
   corpus, then maps matches to index stems. Old behaviour compared the user's word with
   STEMS only, so a misspelt long word ("optimisaton") could never reach its stem ("optim")
   and was silently ignored. Stem-level matching remains as a fallback. */
LocalBM25Adapter.prototype.fuzzy = function (t, raw) {
  var out = [], seen = {}, self = this;
  function scan(word, list, map) {
    var max = word.length >= 8 ? 2 : 1;
    if (word.length < 4) return;
    for (var i = 0; i < list.length; i++) { var v = list[i]; if (v[0] !== word[0] && max < 2) continue; if (Math.abs(v.length - word.length) > max) continue; var d = editDist(word, v, max);
      if (d <= max) { var st = map ? map[v] : v; if (!self.df[st] || seen[st]) continue; seen[st] = 1; out.push({ t: st, s: v, d: d, n: self.df[st] }); } }
  }
  if (raw) scan(raw, this.surfVocab, this.surf);
  scan(t, this.vocab, null);
  out.sort(function (a, b) { return a.d - b.d || b.n - a.n; });
  if (out.length && out[0].d === 1) out = out.filter(function (o) { return o.d === 1; });   // prefer the closest spellings
  return out.slice(0, 3);
};
MR.adapter = new LocalBM25Adapter();
MR.adapter.index(DOCS);
/* Future: EmbeddingSearchAdapter / RemoteVectorSearchAdapter implement the same index(docs) + score(doc, query) contract. */

/* ===== Query intent parsing ===== */
var TYPE_WORDS = [[/\bdatasets?\b|\bdata sources?\b|\bdata ?sets?\b/i, ['Dataset']], [/\bprojects?\b|\bproject candidates?\b|\bopportunit(y|ies)\b/i, ['Project']], [/\bgaps?\b/i, ['Gap']],
  [/\bproblems?\b|\bconstraints\b|\bissues\b/i, ['Problem']], [/\binterventions?\b|\bsolutions?\b|\bprogrammes?\b|\bprograms?\b|\bpolic(y|ies)\b/i, ['Intervention', 'Policy', 'Benchmark']], [/\bstudies\b|\bpapers?\b|\barticles?\b/i, ['Study']]];
MR.parseIntent = function (q) {
  var it = { types: null, yearMin: null, yearMax: null, regions: [], regionFilter: [], countries: [], res: [], impl: null, effects: false, contra: false, dataRich: false, labor: false, transfer: false, sameDataset: false, strongImpl: false, cause: false, my: [], removed: [] };
  var s = ' ' + q + ' ';
  Object.keys(MY).forEach(function (k) { if (q.indexOf(k) >= 0) { it.my.push([k, MY[k]]); s = s.split(k).join(' ' + MY[k] + ' '); } });
  var m;
  if ((m = s.match(/\b(after|since|from|post)[- ](\d{4})\b/i))) { it.yearMin = +m[2] + (m[1].toLowerCase() === 'after' ? 1 : 0); s = s.replace(m[0], ' '); }
  if ((m = s.match(/\b(before|until|pre)[- ](\d{4})\b/i))) { it.yearMax = +m[2] - (m[1].toLowerCase() === 'before' || m[1].toLowerCase() === 'pre' ? 1 : 0); s = s.replace(m[0], ' '); }
  if ((m = s.match(/\b(\d{4})\s?[-–to]+\s?(\d{4})\b/))) { it.yearMin = +m[1]; it.yearMax = +m[2]; s = s.replace(m[0], ' '); }
  if (/\brecent(ly)?\b|\blatest\b|\bcurrent\b/i.test(s)) { it.yearMin = it.yearMin || 2021; s = s.replace(/\brecent(ly)?\b|\blatest\b|\bcurrent\b/ig, ' '); }
  if (/same dataset|share(d)? (a |the )?dataset/i.test(s)) { it.sameDataset = true; it.types = ['Dataset']; s = s.replace(/(which )?(studies )?(use|using|share|shared)? ?(the )?same dataset/ig, ' '); }
  if (!it.types) { for (var i = 0; i < TYPE_WORDS.length; i++) { if (TYPE_WORDS[i][0].test(s)) { if (/research gaps?/i.test(s) && TYPE_WORDS[i][1][0] !== 'Gap') continue; it.types = TYPE_WORDS[i][1]; s = s.replace(TYPE_WORDS[i][0], ' '); break; } } }
  if (/research gaps?/i.test(q)) { it.types = ['Gap']; s = s.replace(/research gaps?/ig, ' '); }
  REGIONS.forEach(function (r) { var re = new RegExp('\\b(in|from|for|across)\\s+(the\\s+)?' + r[2].source.replace(/\\b/g, ''), 'i'); if (re.test(s)) { it.regionFilter.push(r[0]); s = s.replace(re, ' '); } else if (r[2].test(s) || q.indexOf(r[1]) >= 0) { it.regions.push(r[0]); } });
  if (/dry zone/i.test(s)) it.regions.push('Dry Zone');
  ['Thailand', 'Vietnam', 'Viet Nam', 'Bangladesh', 'India', 'China', 'Cambodia', 'Laos', 'Lao'].forEach(function (c) { if (new RegExp('\\b' + c + '\\b', 'i').test(s)) it.countries.push(c === 'Viet Nam' ? 'Vietnam' : c === 'Lao' ? 'Laos' : c); });
  it.countries = MR.uniq(it.countries);
  var resWords = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['seasonal', 'Seasonal'], ['annual', 'Annual'], ['yearly', 'Annual']];
  resWords.forEach(function (r) { var re = new RegExp('\\b' + r[0] + '\\b', 'i'); if (re.test(s) && (it.types && it.types[0] === 'Dataset' || /\bdata\b|available/i.test(q))) { it.res.push(r[1]); s = s.replace(re, ' '); } });
  if (it.res.length && /or finer|or better|higher frequency/i.test(q)) { var order = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Seasonal', 'Annual']; var k = order.indexOf(it.res[0]); it.res = order.slice(0, k + 1); s = s.replace(/or finer|or better|higher frequency/ig, ' '); }
  if (it.res.length && !it.types) it.types = ['Dataset'];
  if (/never scaled|not scaled|did ?n.t scale|proposed|not implemented|only (piloted|proposed)|stalled/i.test(s)) { it.impl = 'stalled'; s = s.replace(/never scaled|not scaled|did ?n.t scale|not implemented|stalled/ig, ' '); }
  else if (/\bfail(ed|ure|s)?\b|abandon/i.test(s)) { it.impl = 'failed'; }
  else if (/reached farmers|real farms|actually (used|reached|implemented)|implemented|at scale|in practice|adopted/i.test(s)) { it.impl = 'scale'; s = s.replace(/actually|real farms|in practice/ig, ' '); }
  if (/strongest implementation|best implementation|strong implementation/i.test(q)) { it.strongImpl = true; it.impl = 'scale'; s = s.replace(/(the )?(strongest|best|strong) implementation evidence/ig, ' '); }
  if (/quantitative|effect sizes?|quantified|measured (effects?|impacts?)/i.test(s)) { it.effects = true; s = s.replace(/quantitative|effect sizes?|quantified/ig, ' '); }
  if (/conflicting|contradict|disagree|contested|inconsistent/i.test(s)) { it.contra = true; s = s.replace(/conflicting|contradict\w*|disagree\w*|contested|inconsistent/ig, ' '); }
  if (/(good|high|best|strong) data( availability)?|data.rich|available data|data availability/i.test(s)) { it.dataRich = true; s = s.replace(/(with )?(good|high|best|strong) data( availability)?|data.rich|data availability|available data/ig, ' '); }
  if (/high.impact|most important|biggest|severe/i.test(s)) { it.highImpact = true; s = s.replace(/high.impact|most important|biggest|severe/ig, ' '); }
  if (/save (farmer )?(time|labou?r)|labou?r.saving|time.saving|reduc\w* .{0,30}labou?r|labou?r (shortage|scarcity|cost)/i.test(s)) { it.labor = true; }
  if (/transfer|adapt(ed)? to myanmar|could work in myanmar|may work/i.test(s)) { it.transfer = true; s = s.replace(/(may |could )?transfer( to myanmar)?/ig, ' '); }
  if (/suitable for a? ?data (science|analyst)|data science project|for a data analyst/i.test(s)) { it.ds = true; s = s.replace(/(suitable )?for a? ?data (science|analyst)( project)?|data science project/ig, ' '); }
  if (/\bwhat causes\b|\bwhy\b|\bcauses?\b|\bdrivers?\b/i.test(s)) { it.cause = true; }
  if (/solutions? used in (\w+) but not myanmar/i.test(q)) { it.types = ['Benchmark']; }
  it.rest = s;
  return it;
};

/* ===== Search: query -> ranked docs ===== */
MR.search = function (q, opts) {
  opts = opts || {};
  var A = MR.adapter, raw = String(q || '').trim();
  var phrases = []; raw.replace(/"([^"]+)"/g, function (_, p) { phrases.push(norm(p)); return ''; });
  var it = MR.parseIntent(raw.replace(/"[^"]+"/g, ' '));
  var dismissed = opts.dismissed || {};
  var hasIntentFilters = (!!it.types && !dismissed.types) || it.yearMin || it.yearMax || it.regionFilter.length || it.res.length;
  var toks = tokens(it.rest).filter(function (t) { return !QSTOP[t]; });
  if (hasIntentFilters || it.impl || it.effects || it.contra || it.dataRich || it.ds) toks = toks.filter(function (t) { return !GENERIC[t]; });
  var qterms = [], seen = {}, expanded = [], fuzz = [], xphr = [];
  var plainWords = {}, rawFor = {}; tokens(it.rest.replace(/-/g, ' ')).forEach(function (t) { plainWords[t] = 1; });
  (norm(it.rest).match(/[a-z0-9]+/g) || []).forEach(function (w) { if (!STOP[w]) rawFor[stem(w)] = BRIT[w] || w; });
  toks.forEach(function (t) { if (!seen[t]) { seen[t] = 1; qterms.push({ t: t, w: 1, orig: true }); } });
  qterms.slice().forEach(function (q0) {
    if (!A.df[q0.t] && !/^\d+$/.test(q0.t) && plainWords[q0.t]) { A.fuzzy(q0.t, rawFor[q0.t]).forEach(function (f) { if (!seen[f.t]) { seen[f.t] = 1; qterms.push({ t: f.t, w: 0.7 }); fuzz.push([rawFor[q0.t] || q0.t, f.s || f.t]); } }); }
    (CONCEPT_IDX[q0.t] || []).forEach(function (gi) { CONCEPTS[gi].forEach(function (term) { if (/\s/.test(term)) { var ph = norm(term); if (!seen['"' + ph]) { seen['"' + ph] = 1; xphr.push(ph); expanded.push(term); } return; } tokens(term).forEach(function (t) { if (!seen[t]) { seen[t] = 1; qterms.push({ t: t, w: 0.4 }); expanded.push(t); } }); }); });
  });
  var lexical = qterms.length > 0;
  var res = [];
  DOCS.forEach(function (d) {
    var sc = lexical ? A.score(d, qterms) : { s: 0, hits: 0 };
    if (lexical && xphr.length) { xphr.forEach(function (ph) { if (d._full.indexOf(ph) >= 0) sc.s += 1.2; }); }
    if (phrases.length && !phrases.every(function (p) { return d._full.indexOf(p) >= 0; })) return;
    var origHits = 0; qterms.forEach(function (x) { if (x.orig && d._tf[x.t]) origHits++; });
    if (lexical && sc.s <= 0) return;
    res.push({ d: d, bm: sc.s, origHits: origHits, boost: 0 });
  });
  var maxbm = res.reduce(function (m, r) { return Math.max(m, r.bm); }, 0) || 1;
  var nOrig = qterms.filter(function (x) { return x.orig; }).length || 1;
  res.forEach(function (r) {
    var d = r.d, rec = d.rec, b = 0;
    r.lex = r.bm / maxbm * (0.6 + 0.4 * r.origHits / nOrig);
    if (it.regions.length && it.regions.some(function (g) { return d.f.region.indexOf(g) >= 0 || (g === 'Dry Zone' && d.f.zone.indexOf('Central Dry Zone') >= 0); })) b += 0.25;
    if (it.countries.length && it.countries.some(function (c) { return d.f.country.indexOf(c) >= 0; })) b += 0.45 + (d.type === 'Benchmark' ? 0.2 : 0);
    if (it.impl === 'scale') { var st = d.f.impl[0]; if (st === 'A') b += 0.45; else if (st === 'B') b += 0.3; if (d.type === 'Benchmark') b += 0.15; }
    if (it.impl === 'stalled') { var st2 = d.f.impl[0]; if (st2 === 'D') b += 0.5; else if (st2 === 'C' || st2 === 'E') b += 0.3; if (d.type === 'Gap' && rec.gap_type === 'Implementation') b += 0.3; }
    if (it.impl === 'failed') { if (d.type === 'Intervention' || d.type === 'Policy') b += 0.2 + (rec.barriers && rec.barriers.length ? 0.1 : 0); if (d.type === 'Gap' && rec.gap_type === 'Implementation') b += 0.2; }
    if (it.strongImpl) { if ((d.type === 'Intervention' || d.type === 'Policy') && rec.confidence === 'High') b += 0.3; if (d.type === 'Benchmark' && rec.confidence === 'High') b += 0.2; }
    if (it.effects) { if (rec.effect_sizes && rec.effect_sizes.length) b += 0.5; if (d.type === 'Benchmark') b += 0.2; }
    if (it.contra && (r.lex > 0.2 || !lexical)) { if (MR.CONTRA[d.id]) b += 0.6; if (/disagree|contradict|contested|qualif|differs/i.test(d._full)) b += 0.3; }
    if (it.dataRich) { var da = rec.scores ? (rec.scores.data_availability || 0) : (rec.data_availability && typeof rec.data_availability === 'number' ? rec.data_availability : 0); b += da / 5 * 0.5; }
    if (it.highImpact && rec.scores) b += ((rec.scores.severity || rec.scores.importance || 0) / 5) * 0.5;
    if (it.labor) { if (rec.scores && rec.scores.labor_time_saving) b += rec.scores.labor_time_saving / 5 * 0.5; if (d.f.impact.indexOf('Labor') >= 0) b += 0.15; if (d.f.pid && d.f.pid.some(function (p) { return p === 'P03' || p === 'P12' || p === 'P18'; })) b += 0.2; }
    if (it.transfer && d.type === 'Benchmark') b += (3 - (MR.TRF[rec.transferability] || 0)) / 3 * 0.4;
    if (it.ds) { if (d.type === 'Gap') b += (rec.data_availability || 0) / 5 * 0.4 + (rec.priority === 'High' ? 0.2 : 0); if (d.type === 'Project') b += (rec.score || 0) / 25 * 0.5; }
    if (it.sameDataset && d.type === 'Dataset') b += Math.min(rec.study_ids.length, 20) / 20 * 0.8;
    if (it.cause && d.type === 'Problem') b += 0.35;
    if (d.type === 'Study' && rec.curated) b += 0.05;
    r.boost = b; r.score = r.lex + b;
  });
  if (lexical && !phrases.length) res = res.filter(function (r) { return r.lex >= 0.1 || r.boost >= 0.3; });
  if (!lexical && res.some(function (r) { return r.boost > 0.06; })) res = res.filter(function (r) { return r.boost > 0.06; });
  return { results: res, intent: it, qterms: qterms, expanded: MR.uniq(expanded), fuzzy: fuzz, phrases: phrases, lexical: lexical, highlight: qterms.filter(function (x) { return x.w >= 0.4; }).map(function (x) { return x.t; }) };
};

/* ===== Facets ===== */
MR.FACETS = [
  { k: 'pid', label: 'Problem', hidden: true, fmt: function (v) { return PROB[v] ? PROB[v].problem_name : v; } },
  { k: 'type', label: 'Evidence type', order: ['Study', 'Problem', 'Dataset', 'Intervention', 'Policy', 'Benchmark', 'Gap', 'Project'], fmt: function (v) { return MR.TYPE_LABEL[v] || v; } },
  { k: 'country', label: 'Country', order: MR.COUNTRIES },
  { k: 'region', label: 'State / region', order: REGIONS.map(function (r) { return r[0]; }), fmt: function (v) { return v + ' · ' + (MR.regionMy[v] || ''); } },
  { k: 'zone', label: 'Agro-ecological zone' },
  { k: 'year', label: 'Year', special: 'year' },
  { k: 'pcat', label: 'Problem category' },
  { k: 'rtype', label: 'Research type', order: ['Quantitative', 'Qualitative', 'Applied', 'Analytical', 'Experimental', 'Mixed methods', 'Descriptive', 'Unclassified (no abstract)'] },
  { k: 'method', label: 'Method' },
  { k: 'dtype', label: 'Data type' },
  { k: 'res', label: 'Temporal resolution (datasets)', order: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Seasonal', 'Annual', 'Crop-cycle', 'Event-based', 'Static', 'Other'] },
  { k: 'space', label: 'Spatial level (datasets)' },
  { k: 'impl', label: 'Implementation status', order: ['A', 'B', 'C', 'D', 'E', 'N'], fmt: function (v) { return v === 'N' ? 'Not assessed' : MR.STATUS[v]; } },
  { k: 'tier', label: 'Source quality', order: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'], fmt: function (v) { return v + ' · ' + { 'Tier 1': 'official / primary', 'Tier 2': 'FAO, IRRI, CGIAR, IFPRI, WB…', 'Tier 3': 'peer-reviewed / university', 'Tier 4': 'NGO / development', 'Tier 5': 'secondary aggregator' }[v]; } },
  { k: 'access', label: 'Data availability', order: ['Open', 'Registration (free)', 'Request required', 'Restricted', 'Paid', 'Unknown'] },
  { k: 'impact', label: 'Impact dimension', order: ['Yield', 'Cost', 'Labor', 'Time', 'Water', 'Input efficiency', 'Profit', 'Risk reduction'] },
  { k: 'conf', label: 'Evidence confidence', order: ['High', 'Medium', 'Low'] }];

MR.passFacets = function (d, F, skip, yr) {
  for (var k in F) { if (k === skip) continue; var sel = F[k]; if (!sel || !sel.length) continue; var vals = d.f[k] || []; var ok = false; for (var i = 0; i < sel.length; i++) if (vals.indexOf(sel[i]) >= 0) { ok = true; break; } if (!ok) return false; }
  if (yr && skip !== 'year') { if (d.span) { if (d.span[1] < yr[0] || d.span[0] > yr[1]) return false; } else if (yr.strict && d.type === 'Study') return false; }
  return true;
};
})(MR);
