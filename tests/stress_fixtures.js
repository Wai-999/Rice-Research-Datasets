// Content stress fixtures. Injected with page.add_init_script BEFORE the bundle runs:
// a setter on window.RICE_DATA mutates a handful of real records in memory only.
(function () {
  var LONG = 'An extremely long title used to stress the layout of cards, tables, inspector headings and compare views so that nothing overlaps, clips or forces horizontal scrolling even when a record name runs well past two hundred characters in total length';
  var URL = 'https://example.org/' + 'very-long-path-segment-without-any-spaces-or-hyphen-breaks_'.repeat(4) + '?query=' + 'x'.repeat(80);
  var MY = 'မြန်မာ့စပါးစိုက်ပျိုးရေး တောင်သူများအတွက် မြေဩဇာ ဈေးနှုန်း မြင့်တက်မှု';
  var MIX = 'Mixed text: ' + MY + ' — fertilizer (urea) price rose sharply in Ayeyarwady ဧရာဝတီ during 2024–2026.';
  var PARA = 'First paragraph of a multi-paragraph comparison that explains why the intervention worked in its own institutional setting.\n\nSecond paragraph: conditions differ in Myanmar because extension is weaker, finance is scarcer and conflict disrupts input supply.\n\nThird paragraph: a staged pilot would be needed.';
  var many = function (n, p) { var a = []; for (var i = 1; i <= n; i++) a.push(p + ' ' + i + ': outcome text that is long enough to wrap onto a second line on phones and narrow inspectors'); return a; };
  var store;
  Object.defineProperty(window, 'RICE_DATA', { configurable: true, get: function () { return store; }, set: function (D) {
    var b = D.benchmarks.filter(function (x) { return x.id === 'B10'; })[0];
    b.intervention = LONG; b.title = b.country + ': ' + LONG; b.mechanism = PARA; b.cost = 'EUR 14.9 m provided; EUR 14 m leveraged; plus ' + URL; b.adoption = '79,275 households; 319,526 ha; 2,544 farmer groups; 99,094 farmers trained; '.repeat(3);
    b.impact = many(12, 'Outcome'); b.why = PARA; b.transfer_reason = MIX; delete b.required_modification; b.conditions = '';
    var b2 = D.benchmarks.filter(function (x) { return x.id === 'B11'; })[0]; delete b2.cost; b2.adoption = ''; b2.impact = []; b2.problem_ids = b2.problem_ids.slice(0, 1);
    var s = D.studies.filter(function (x) { return x.id === 'S269'; })[0];
    s.title = LONG + ' ' + MY; s.citation = 'Author A, Author B (2024). ' + LONG + '. ' + URL; s.objective = MIX; s.findings = many(12, 'Finding'); s.geographic_area = 'Ayeyarwady, Bago, Yangon, Sagaing, Mandalay, Magway, Nay Pyi Taw, Shan, Kachin, Rakhine, Mon, Kayin, Tanintharyi, Chin, Kayah';
    s.effect_sizes = [{ metric: 'Change in paddy yield per hectare relative to control plots across all seasons', value: '+0.31 t/ha (95% CI 0.12–0.50; n = 1,204 plots)' }, { metric: 'Profit', value: URL.slice(0, 60) }];
    s.publication_type = 'Working paper in an extremely long institutional discussion-paper series name that keeps going';
    var p = D.problems.filter(function (x) { return x.id === 'P04'; })[0];
    p.geographic_scope = 'National; ' + 'most severe in Ayeyarwady, Bago, Sagaing and the Central Dry Zone where input markets are thin; '.repeat(3); delete p.time_impact; p.trend = MIX;
    var d = D.datasets.filter(function (x) { return x.id === 'D04'; })[0];
    d.name = LONG; d.variables = many(20, 'Variable'); d.known_limitations = many(10, 'Limitation'); d.source_url = URL; d.producer = 'IFPRI / MSU ' + MY; d.data_types = [];
    var iv = D.interventions.filter(function (x) { return x.id === 'I04'; })[0];
    iv.outcomes = many(12, 'Outcome'); iv.barriers = many(12, 'Barrier'); iv.organization = LONG; delete iv.area;
    D.kpis.studies = 1234567; D.kpis.edges = 9876543;
    window.__STRESS = { LONG: LONG, URL: URL, MY: MY };
    store = D;
  } });
})();
