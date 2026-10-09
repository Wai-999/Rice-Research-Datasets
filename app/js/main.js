/* ===== Routing, events, init ===== */
(function (MR) {
'use strict';
var D = MR.D, esc = MR.esc, $ = MR.$, $$ = MR.$$, BY = MR.BY;
var VIEWS = [['overview', 'Overview'], ['search', 'Search'], ['problems', 'Problems'], ['research', 'Research'], ['datasets', 'Datasets'], ['implementation', 'Implementation'], ['connections', 'Connections'], ['countries', 'Countries'], ['gaps', 'Gaps'], ['projects', 'Projects'], ['methodology', 'Methodology']];
MR.cur = null;
/* ---- browser history: #view or #view/RECORD (deep link to an open inspector record) ---- */
function parseHash() { var h = ''; try { h = decodeURIComponent(location.hash.replace(/^#/, '')); } catch (e) { h = location.hash.replace(/^#/, ''); } var m = h.split('/'); return { v: m[0] || '', r: m[1] || '' }; }
function hpush(st, url) { try { history.pushState(st, '', url); return true; } catch (e) { return false; } }
function hrepl(st, url) { try { history.replaceState(st, '', url); return true; } catch (e) { return false; } }
MR.histRecord = function (id, mode) { var st = { v: MR.cur, r: id, mine: 1 }, url = '#' + MR.cur + '/' + encodeURIComponent(id); if (mode === 'push') hpush(st, url); else hrepl(st, url); };
MR.histCloseRecord = function (user) {
  var st = history.state;
  if (user && st && st.r && st.mine) { try { history.back(); return; } catch (e) { } }
  if (parseHash().r) hrepl({ v: MR.cur }, '#' + MR.cur);
};
function applyLocation() {
  var p = parseHash(), v = p.v || 'overview';
  if (v !== MR.cur) MR.go(v, true);
  if (p.r && BY[p.r]) { if (MR.curInsp !== p.r) MR.openInsp(p.r, false, true); }
  else if ($('#insp').classList.contains('open')) MR.closeInsp('history');
}
/* go(v, mode): mode undefined → new history entry; 'replace' → replace entry; true → no history write */
MR.go = function (v, noHash) {
  if (!VIEWS.some(function (x) { return x[0] === v; })) v = 'overview';
  MR.cur = v;
  $$('.view').forEach(function (s) { s.hidden = s.getAttribute('data-view') !== v; });
  $$('#nav button').forEach(function (b) { if (b.getAttribute('data-nav') === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  var el = $('#v-' + v);
  try { MR.V[v](el); } catch (e) { el.innerHTML = '<div class="empty"><b>This view failed to render.</b><p class="small">' + esc(e.message) + '</p></div>'; if (window.console) console.error(e); }
  if (noHash === 'replace') hrepl({ v: v }, '#' + v);
  else if (!noHash) { var cur = parseHash(); if (cur.v !== v || cur.r) { if (!hpush({ v: v }, '#' + v)) { try { location.hash = v; } catch (e) { } } } }
  MR.LS.set('view', v);
  window.scrollTo(0, 0);
};
function focusMain() { setTimeout(function () { var a = document.activeElement; if (!a || a === document.body || !a.isConnected) { try { $('#main').focus({ preventScroll: true }); } catch (e) { } } }, 0); }
function init() {
  if (!document.documentElement.lang) document.documentElement.lang = 'en';
  /* sticky header height → CSS var (sticky filter column, scroll-padding for scrollIntoView) */
  var hdr = $('header.top'), setH = function () { document.documentElement.style.setProperty('--hdr-h', Math.round(hdr.getBoundingClientRect().height) + 'px'); };
  setH(); if (window.ResizeObserver) new ResizeObserver(setH).observe(hdr); else window.addEventListener('resize', setH);
  $('#nav').innerHTML = VIEWS.map(function (v) { return '<button type="button" data-nav="' + v[0] + '">' + v[1] + '</button>'; }).join('');
  var K = D.kpis;
  $('#status').innerHTML = '<span>Built <b>' + esc(D.meta.built) + '</b></span><span><b>' + K.studies + '</b> studies</span><span><b>' + K.datasets + '</b> datasets</span><span><b>' + K.edges.toLocaleString() + '</b> links</span><span title="' + esc(D.methodology.retrieval) + '">Search: <b>BM25 + synonyms</b> (not embeddings)</span>';
  $('#methodNote').textContent = 'Retrieval: ' + MR.adapter.label + '. Searches titles, objectives, findings, abstracts, methods, places, authors, datasets, interventions, gaps and neighbour-country cases. Burmese terms such as စပါး or မြေဩဇာ are mapped to English.';
  $('#examples').innerHTML = '<span class="xs muted" style="align-self:center">Try:</span>' + MR.EXAMPLES.map(function (q, i) { return '<button class="chip' + (i >= 4 ? ' ex-more' : '') + '" type="button" data-ex="' + esc(q) + '"' + (/[က-႟]/.test(q) ? ' lang="my"' : '') + '>' + esc(q) + '</button>'; }).join('') + '<button class="btn ghost xs" type="button" id="exToggle">More examples</button>';
  if (window.innerWidth < 860) $('#examples').classList.add('collapsed');
  $('#exToggle').onclick = function () { var c = $('#examples').classList.toggle('collapsed'); this.textContent = c ? 'More examples' : 'Fewer examples'; };
  var deb; $('#q').addEventListener('input', function () { var v = this.value; clearTimeout(deb); deb = setTimeout(function () { MR.SS.dismissed = {}; MR.setSearch({ q: v }); }, 160); });
  $('#q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(deb); MR.SS.dismissed = {}; MR.setSearch({ q: this.value }); } });
  $('#qclear').onclick = function () { MR.SS.dismissed = {}; MR.setSearch({ q: '' }); $('#q').focus(); };
  $('#sort').onchange = function () { MR.setSearch({ sort: this.value }); };
  $('#more').onclick = function () { MR.SS.page++; MR.runSearch(); };
  $('#expCsv').onclick = function () { MR.searchExport('csv'); }; $('#expJson').onclick = function () { MR.searchExport('json'); }; $('#expCite').onclick = function () { MR.searchExport('cite'); };
  /* phone filter drawer = modal dialog while open; a complementary sidebar otherwise */
  var fq = window.matchMedia ? window.matchMedia('(max-width:860px)') : null;
  function openFacets() { var f = $('#facets'); f.classList.add('open'); f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); $('#openFacets').setAttribute('aria-expanded', 'true'); MR.dialog.open(f, { initial: '#closeFacets', onEsc: closeFacets }); }
  function closeFacets(restore) { var f = $('#facets'); if (!f.classList.contains('open')) return; f.classList.remove('open'); f.setAttribute('role', 'complementary'); f.removeAttribute('aria-modal'); $('#openFacets').setAttribute('aria-expanded', 'false'); MR.dialog.close(f, restore !== false); }
  MR.closeFacets = closeFacets;
  $('#openFacets').onclick = openFacets; $('#closeFacets').onclick = function () { closeFacets(); };
  if (fq) { var onMQ = function () { if (!fq.matches) closeFacets(false); }; if (fq.addEventListener) fq.addEventListener('change', onMQ); else if (fq.addListener) fq.addListener(onMQ); }
  $('#inspClose').onclick = function () { MR.closeInsp('user'); }; $('#scrim').onclick = function () { MR.closeInsp('user'); }; $('#inspBack').onclick = MR.inspBack;
  MR.onCompareChange = function () { if (MR.cur === 'search') MR.runSearch(); };

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-go],[data-graph],[data-compare],[data-trace],[data-dismiss],[data-unf],[data-ft],[data-fall],[data-searchprob],[data-ex],[data-nav],#clearAll');
    if (!t) return;
    if (t.hasAttribute('data-nav')) { MR.go(t.getAttribute('data-nav')); return; }
    var fromInsp = !!t.closest('#insp');
    if (t.hasAttribute('data-ex')) { MR.SS.dismissed = {}; MR.SS.F = {}; MR.SS.yrOn = false; MR.setSearch({ q: t.getAttribute('data-ex') }); return; }
    if (t.hasAttribute('data-open')) { e.preventDefault(); MR.openInsp(t.getAttribute('data-open')); return; }
    if (t.hasAttribute('data-go')) { var g = t.getAttribute('data-go'); if (fromInsp) MR.closeInsp('nav'); if (/^impl:/.test(g)) { MR.setImplStage(g.slice(5)); MR.go('implementation'); } else if (g === 'q:dataset-linked') MR.go('datasets'); else MR.go(g); if (fromInsp) focusMain(); return; }
    if (t.hasAttribute('data-graph')) { MR.focusGraph(t.getAttribute('data-graph')); return; }
    if (t.hasAttribute('data-compare')) { MR.toggleCompare(t.getAttribute('data-compare')); if (MR.curInsp) MR.openInsp(MR.curInsp, false); return; }
    if (t.hasAttribute('data-trace')) { MR.openInsp(t.getAttribute('data-trace')); setTimeout(function () { var h = $$('#inspBody .blk h4').find(function (x) { return /Trace evidence|Evidence \(claim/.test(x.textContent); }); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 260); return; }
    if (t.hasAttribute('data-dismiss')) { MR.SS.dismissed[t.getAttribute('data-dismiss')] = 1; MR.runSearch(); return; }
    if (t.hasAttribute('data-unf')) { var p = t.getAttribute('data-unf').split('|'); if (p[0] === 'year') MR.SS.yrOn = false; else MR.SS.F[p[0]] = (MR.SS.F[p[0]] || []).filter(function (v) { return v !== p[1]; }); MR.SS.page = 1; MR.runSearch(); return; }
    if (t.id === 'clearAll') { MR.SS.F = {}; MR.SS.yrOn = false; MR.SS.dismissed = { types: 1, year: 1, region: 1, res: 1 }; MR.SS.page = 1; MR.runSearch(); return; }
    if (t.hasAttribute('data-ft')) { var k = t.getAttribute('data-ft'), o = MR.openFacet; o[k] = o[k] ? 0 : 1; MR.LS.set('openFacets', o); MR.runSearch(); var fb = document.querySelector('[data-ft="' + k + '"]'); if (fb) fb.focus(); return; }
    if (t.hasAttribute('data-fall')) { var k2 = t.getAttribute('data-fall'), o2 = MR.openFacet; o2[k2 + '_all'] = o2[k2 + '_all'] ? 0 : 1; MR.LS.set('openFacets', o2); MR.runSearch(); return; }
    if (t.hasAttribute('data-searchprob')) { var pid = t.getAttribute('data-searchprob'); MR.closeInsp('nav'); MR.SS.F = { pid: [pid], type: ['Study'] }; MR.SS.dismissed = {}; MR.go('search'); MR.setSearch({ q: '' }); focusMain(); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-f')) { var k = t.getAttribute('data-f'), v = t.value, a = MR.SS.F[k] || []; MR.SS.F[k] = t.checked ? MR.uniq(a.concat([v])) : a.filter(function (x) { return x !== v; }); MR.SS.page = 1; MR.runSearch(); var el = document.getElementById(t.id); if (el) el.focus(); return; }
    if (t.id === 'yrOn') { MR.SS.yrOn = t.checked; MR.runSearch(); return; }
    if (t.id === 'y0' || t.id === 'y1' || t.id === 'yr0' || t.id === 'yr1') { var a0 = +($('#' + (t.id[1] === 'r' ? 'yr0' : 'y0')).value), a1 = +($('#' + (t.id[1] === 'r' ? 'yr1' : 'y1')).value); if (t.id === 'yr0' || t.id === 'yr1') { a0 = +$('#yr0').value; a1 = +$('#yr1').value; } if (a0 > a1) { var tmp = a0; a0 = a1; a1 = tmp; } MR.SS.yr = [Math.max(2000, a0), Math.min(2026, a1)]; MR.SS.yrOn = true; MR.runSearch(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var top = MR.dialog.top(); if (top && top.onEsc) { e.preventDefault(); top.onEsc(); } return; }
    if (e.key === '/' && !MR.dialog.top() && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); MR.go('search'); $('#q').focus(); }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.matches('tr.click')) { e.preventDefault(); document.activeElement.click(); }
  });
  window.addEventListener('popstate', applyLocation);
  window.addEventListener('hashchange', applyLocation);
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (MR.cur) MR.go(MR.cur, true); }); } catch (e) { }
  new MutationObserver(function () { if (MR.cur === 'overview' || MR.cur === 'connections' || MR.cur === 'countries' || MR.cur === 'projects') MR.go(MR.cur, true); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  var start = parseHash();
  MR.go(start.v || MR.LS.get('view', 'overview'), 'replace');
  $('#insp').inert = true;
  if (start.r && BY[start.r]) MR.openInsp(start.r);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(MR);
