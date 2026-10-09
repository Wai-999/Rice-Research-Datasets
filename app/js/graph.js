/* ===== Connection explorer (Cytoscape) ===== */
(function (MR) {
'use strict';
var D = MR.D, esc = MR.esc, $ = MR.$, $$ = MR.$$, BY = MR.BY;
var GS = MR.GS = { mode: 'problem', focus: 'P04', depth: 1, hidden: {} };
var cy = null;
var TCOL = { Study: '--t-study', Problem: '--t-problem', Dataset: '--t-dataset', Intervention: '--t-intervention', Policy: '--t-policy', Benchmark: '--t-benchmark', Gap: '--t-gap', Project: '--t-project', Method: '--ink-3', Outcome: '--gold' };
var SHAPE = { Study: 'ellipse', Problem: 'diamond', Dataset: 'round-rectangle', Intervention: 'hexagon', Policy: 'hexagon', Benchmark: 'triangle', Gap: 'octagon', Project: 'star', Method: 'tag', Outcome: 'round-tag' };
var MODES = { problem: 'Problem → evidence → intervention → gap', study: 'Study → dataset → method → outcome', project: 'Project chain', ego: 'Neighbourhood of any record', citations: 'Citation & study-to-study network' };
var PRIO = function (rt) { return /contradict|contest|challeng/.test(rt) ? 0 : /extends|published|corrobor|updates|same|scales|tests|evaluates|validates|cites/.test(rt) ? 1 : /evidence|leaves gap|addresses|comparable|targets|enables|learns|builds on/.test(rt) ? 2 : /uses dataset|measures/.test(rt) ? 3 : 4; };

function build() {
  var nodes = {}, edges = [], f = GS.focus;
  function addN(id, extra) { if (nodes[id]) return; var d = BY[id]; if (!d && !extra) return; nodes[id] = extra || { id: id, type: d.type, label: d.title }; }
  function edgesAmong() { MR.EDGES.forEach(function (e, i) { if (nodes[e.source_id] && nodes[e.target_id] && e.source_id !== e.target_id) edges.push({ id: 'e' + i, s: e.source_id, t: e.target_id, rt: e.relationship_type, ev: e.evidence }); }); }
  if (GS.mode === 'problem') {
    var p = BY[f] && BY[f].type === 'Problem' ? BY[f].rec : D.problems[3]; GS.focus = p.id; addN(p.id);
    var st = p.study_ids.map(function (s) { return BY[s].rec; }).sort(function (a, b) { return (b.problem_link_source === 'curated') - (a.problem_link_source === 'curated') || ({ High: 3, Medium: 2, Low: 1 }[b.confidence] - { High: 3, Medium: 2, Low: 1 }[a.confidence]) || b.year - a.year; }).slice(0, 16);
    st.forEach(function (s) { addN(s.id); });
    p.source_ids.forEach(function (s) { addN(s); });
    D.interventions.forEach(function (i) { if (i.problem_ids.indexOf(p.id) >= 0) addN(i.id); });
    D.benchmarks.forEach(function (b) { if (b.problem_ids.indexOf(p.id) >= 0) addN(b.id); });
    D.gaps.forEach(function (g) { if (g.problem_ids.indexOf(p.id) >= 0) addN(g.id); });
    D.projects.forEach(function (q) { if (q.problem_ids.indexOf(p.id) >= 0 && q.rank <= 8) addN(q.id); });
    edgesAmong();
  } else if (GS.mode === 'study') {
    var s = BY[f] && BY[f].type === 'Study' ? BY[f].rec : BY.S269.rec; GS.focus = s.id; addN(s.id);
    s.dataset_ids.forEach(function (d) { addN(d); BY[d].rec.study_ids.filter(function (x) { return x !== s.id; }).slice(0, 8).forEach(function (x) { addN(x); }); });
    s.problem_ids.forEach(function (p) { addN(p); }); s.intervention_ids.forEach(function (i) { addN(i); });
    (MR.adj[s.id] || []).forEach(function (i) { var e = MR.EDGES[i]; var o = e.source_id === s.id ? e.target_id : e.source_id; if (BY[o] && BY[o].type === 'Study') addN(o); });
    edgesAmong();
    (s.methods || []).forEach(function (m) { var id = 'M:' + m; addN(id, { id: id, type: 'Method', label: m }); edges.push({ id: 'em' + m, s: s.id, t: id, rt: 'uses method', ev: '' }); });
    var outs = (s.effect_sizes || []).map(function (e) { return e.metric + ': ' + e.value; });
    if (!outs.length) outs = (s.findings || []).slice(0, 3).map(function (x) { return x.length > 70 ? x.slice(0, 68) + '…' : x; });
    outs.slice(0, 4).forEach(function (o, k) { var id = 'O:' + k; addN(id, { id: id, type: 'Outcome', label: o }); edges.push({ id: 'eo' + k, s: s.id, t: id, rt: 'finds', ev: '' }); });
  } else if (GS.mode === 'project') {
    var q = BY[f] && BY[f].type === 'Project' ? BY[f].rec : D.projects[0]; GS.focus = q.id; addN(q.id);
    q.problem_ids.concat(q.gap_ids, q.dataset_ids, q.intervention_ids, q.benchmark_ids).forEach(function (x) { addN(x); });
    q.gap_ids.forEach(function (g) { (BY[g] ? BY[g].rec.evidence_ids : []).forEach(function (x) { addN(x); }); });
    (BY[q.intervention_ids[0]] ? BY[q.intervention_ids[0]].rec.evidence_ids : []).forEach(function (x) { addN(x); });
    edgesAmong();
  } else if (GS.mode === 'citations') {
    MR.EDGES.forEach(function (e) { if (BY[e.source_id] && BY[e.target_id] && BY[e.source_id].type === 'Study' && BY[e.target_id].type === 'Study') { addN(e.source_id); addN(e.target_id); } });
    edgesAmong();
  } else {
    if (!BY[f]) GS.focus = f = 'S269';
    addN(f); var frontier = [f];
    for (var dep = 0; dep < GS.depth; dep++) {
      var next = [];
      frontier.forEach(function (id) {
        var nb = (MR.adj[id] || []).map(function (i) { var e = MR.EDGES[i]; return { o: e.source_id === id ? e.target_id : e.source_id, p: PRIO(e.relationship_type), c: e.confidence }; });
        nb.sort(function (a, b) { return a.p - b.p || (a.c === 'High' ? -1 : 1); });
        nb.slice(0, dep === 0 ? 40 : 6).forEach(function (n) { if (!nodes[n.o] && BY[n.o] && Object.keys(nodes).length < 90) { addN(n.o); next.push(n.o); } });
      });
      frontier = next;
    }
    edgesAmong();
  }
  return { nodes: nodes, edges: edges };
}
function short(n) { var l = n.label || ''; if (n.type === 'Study') return n.id; if (n.type === 'Method' || n.type === 'Outcome') return l.length > 34 ? l.slice(0, 32) + '…' : l; return n.id + ' ' + (l.length > 30 ? l.slice(0, 28) + '…' : l); }
MR.V.connections = function (el) {
  var opts = function (list, cur) { return list.map(function (x) { return '<option value="' + esc(x.id) + '" ' + (x.id === cur ? 'selected' : '') + '>' + esc(x.id + ' — ' + MR.clip(x.title || x.problem_name || x.name, 70)) + '</option>'; }).join(''); };
  var focusList = GS.mode === 'problem' ? D.problems : GS.mode === 'project' ? D.projects : GS.mode === 'study' ? D.studies.filter(function (s) { return s.curated; }) : null;
  el.innerHTML = '<div class="section-h" style="margin-top:0"><h2>Research connection explorer</h2><span class="note">Focused graphs, not a hairball — pick a mode and a focus record</span></div><div class="graph-wrap"><div class="gctl">' +
    '<label for="gmode">Mode<select id="gmode">' + Object.keys(MODES).map(function (k) { return '<option value="' + k + '" ' + (GS.mode === k ? 'selected' : '') + '>' + esc(MODES[k]) + '</option>'; }).join('') + '</select></label>' +
    (focusList ? '<label for="gfocus">Focus<select id="gfocus">' + opts(focusList, GS.focus) + '</select></label>' : GS.mode === 'ego' ? '<label for="gfocusT">Focus record ID<input type="text" id="gfocusT" value="' + esc(GS.focus) + '" list="gids" autocomplete="off"></label><datalist id="gids">' + MR.DOCS.slice(0, 600).map(function (d) { return '<option value="' + d.id + '">' + esc(MR.clip(d.title, 70)) + '</option>'; }).join('') + '</datalist><label for="gdepth">Depth<select id="gdepth"><option value="1" ' + (GS.depth === 1 ? 'selected' : '') + '>1 hop</option><option value="2" ' + (GS.depth === 2 ? 'selected' : '') + '>2 hops</option></select></label>' : '') +
    '<div><div class="small" style="font-weight:600;margin-bottom:4px">Relationships</div><div class="rels" id="grels"></div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" type="button" id="gfit">Fit</button><button class="btn" type="button" id="gzi" aria-label="Zoom in">+</button><button class="btn" type="button" id="gzo" aria-label="Zoom out">−</button></div>' +
    '<div><div class="small" style="font-weight:600;margin-bottom:4px">Legend</div><div class="glegend">' + Object.keys(TCOL).map(function (t) { return '<span class="type t-' + t + '" style="--tc:var(' + TCOL[t] + ')">' + esc(MR.TYPE_LABEL[t] || t) + '</span>'; }).join('') + '</div><p class="xs muted" style="margin-top:6px">Click a node to highlight its neighbours and open it in the inspector. Red edges mark contradicting or contested evidence.</p></div><div id="ginfo" class="small"></div></div>' +
    '<div style="min-width:0"><div id="cy" role="img" aria-label="Network graph of research connections. A text list of the same connections follows."></div><div id="gfallback"></div><details class="graph-list" id="glist"><summary>List these connections as text (keyboard and screen-reader friendly)</summary><div class="gl-body" id="glistBody"></div></details></div></div>';
  var G = build();
  var types = {}; G.edges.forEach(function (e) { types[e.rt] = (types[e.rt] || 0) + 1; });
  $('#grels').innerHTML = Object.keys(types).sort(function (a, b) { return types[b] - types[a]; }).map(function (t, i) { var id = 'gr' + i; return '<label for="' + id + '"><input type="checkbox" id="' + id + '" data-rel="' + esc(t) + '" ' + (GS.hidden[t] ? '' : 'checked') + '> ' + esc(t) + ' <span class="muted">(' + types[t] + ')</span></label>'; }).join('');
  $('#ginfo').innerHTML = '<span class="muted">' + Object.keys(G.nodes).length + ' nodes · ' + G.edges.length + ' edges</span>';
  $('#gmode').onchange = function () { GS.mode = this.value; GS.hidden = {}; if (GS.mode === 'problem' && (!BY[GS.focus] || BY[GS.focus].type !== 'Problem')) GS.focus = 'P04'; if (GS.mode === 'project' && (!BY[GS.focus] || BY[GS.focus].type !== 'Project')) GS.focus = D.projects[0].id; if (GS.mode === 'study' && (!BY[GS.focus] || BY[GS.focus].type !== 'Study')) GS.focus = 'S269'; MR.V.connections(el); };
  var gf = $('#gfocus'); if (gf) gf.onchange = function () { GS.focus = this.value; MR.V.connections(el); };
  var gt = $('#gfocusT'); if (gt) gt.onchange = function () { var v = this.value.trim().toUpperCase(); if (BY[v]) { GS.focus = v; MR.V.connections(el); } else MR.toast('No record with ID ' + v); };
  var gd = $('#gdepth'); if (gd) gd.onchange = function () { GS.depth = +this.value; MR.V.connections(el); };
  $('#glistBody').innerHTML = edgeList(G);
  if (typeof window.cytoscape !== 'function') { fallback(G); return; }
  var C = function (v) { return MR.cssVar(v); };
  var elsArr = Object.keys(G.nodes).map(function (k) { var n = G.nodes[k]; return { data: { id: n.id, label: short(n), full: n.label, type: n.type, color: C(TCOL[n.type] || '--ink-3'), shape: SHAPE[n.type] || 'ellipse', focus: n.id === GS.focus ? 1 : 0 } }; })
    .concat(G.edges.filter(function (e) { return !GS.hidden[e.rt]; }).map(function (e) { var red = /contradict|contest|challeng/.test(e.rt); return { data: { id: e.id, source: e.s, target: e.t, rt: e.rt, ev: e.ev, color: red ? C('--t-problem') : /cites|extends|published|updates|corrobor|same|scales|tests|evaluates|validates/.test(e.rt) ? C('--indigo') : C('--line-2'), w: red ? 2.6 : 1.3 } }; }));
  if (cy) { try { cy.destroy(); } catch (e) { } }
  cy = window.cytoscape({ container: $('#cy'), elements: elsArr, minZoom: 0.2, maxZoom: 3,
    style: [
      { selector: 'node', style: { 'background-color': 'data(color)', shape: 'data(shape)', label: 'data(label)', 'font-size': 9, 'font-family': 'IBM Plex Sans, system-ui, sans-serif', color: C('--ink-2'), 'text-valign': 'bottom', 'text-margin-y': 3, width: 16, height: 16, 'text-wrap': 'ellipsis', 'text-max-width': 130, 'border-width': 1, 'border-color': C('--surface') } },
      { selector: 'node[focus = 1]', style: { width: 30, height: 30, 'font-size': 11, 'font-weight': 600, color: C('--ink'), 'border-width': 3, 'border-color': C('--gold') } },
      { selector: 'node[type = "Study"]', style: { width: 11, height: 11 } },
      { selector: 'edge', style: { width: 'data(w)', 'line-color': 'data(color)', 'target-arrow-color': 'data(color)', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.7, 'curve-style': 'bezier', opacity: 0.85 } },
      { selector: '.faded', style: { opacity: 0.12 } },
      { selector: 'node.hl', style: { 'border-width': 3, 'border-color': C('--gold'), color: C('--ink'), 'font-size': 10 } },
      { selector: 'edge.hl', style: { label: 'data(rt)', 'font-size': 8, color: C('--ink-2'), 'text-background-color': C('--surface'), 'text-background-opacity': 0.85, 'text-background-padding': 2, opacity: 1, width: 2.2 } }],
    layout: GS.mode === 'citations' || GS.mode === 'ego' ? { name: 'cose', animate: false, nodeRepulsion: 9000, idealEdgeLength: 70, padding: 20 } : { name: 'concentric', animate: false, minNodeSpacing: 24, padding: 20, concentric: function (n) { var t = n.data('type'); return n.data('focus') ? 10 : { Problem: 8, Project: 8, Gap: 7, Intervention: 6, Policy: 6, Benchmark: 6, Dataset: 5, Method: 7, Outcome: 7, Study: 3 }[t] || 2; }, levelWidth: function () { return 1; } } });
  cy.on('tap', 'node', function (ev) {
    var n = ev.target; cy.elements().removeClass('hl faded'); var nb = n.closedNeighborhood(); cy.elements().not(nb).addClass('faded'); nb.addClass('hl');
    var id = n.id(); if (BY[id]) MR.openInsp(id); else $('#ginfo').innerHTML = '<b>' + esc(n.data('type')) + ':</b> ' + esc(n.data('full'));
  });
  cy.on('tap', function (ev) { if (ev.target === cy) cy.elements().removeClass('hl faded'); });
  cy.on('mouseover', 'node', function (ev) { $('#ginfo').innerHTML = '<span class="mono xs">' + esc(ev.target.id()) + '</span> ' + esc(ev.target.data('full') || ''); });
  $('#gfit').onclick = function () { cy.fit(undefined, 20); }; $('#gzi').onclick = function () { cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); }; $('#gzo').onclick = function () { cy.zoom({ level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); };
  $$('[data-rel]', el).forEach(function (c) { c.onchange = function () { GS.hidden[c.getAttribute('data-rel')] = !c.checked; MR.V.connections(el); }; });
};
function edgeList(G) {
  var es = G.edges.filter(function (e) { return !GS.hidden[e.rt]; });
  if (!es.length) return '<p class="small muted">No connections with the selected relationship types.</p>';
  return es.slice(0, 300).map(function (e) { var a = G.nodes[e.s], b = G.nodes[e.t]; var lab = function (n, id) { return BY[id] ? MR.refInline([id]) + ' <span class="xs">' + esc(MR.clip(BY[id].title || '', 90)) + '</span>' : '<span class="xs">' + esc(n ? n.label : id) + '</span>'; }; return '<div class="small">' + lab(a, e.s) + ' <span class="muted">— ' + esc(e.rt) + ' →</span> ' + lab(b, e.t) + '</div>'; }).join('') + (es.length > 300 ? '<p class="xs muted">+' + (es.length - 300) + ' more</p>' : '');
}
function fallback(G) {
  $('#cy').hidden = true;
  $('#gfallback').innerHTML = '<div class="empty" style="text-align:left"><p><b>The interactive graph library did not load</b> (offline or blocked). Connections are listed instead.</p>' + G.edges.filter(function (e) { return !GS.hidden[e.rt]; }).slice(0, 200).map(function (e) { return '<div class="small">' + (BY[e.s] ? MR.refInline([e.s]) : esc(e.s)) + ' <span class="muted">' + esc(e.rt) + '</span> ' + (BY[e.t] ? MR.refInline([e.t]) : esc(e.t)) + '</div>'; }).join('') + '</div>';
}
MR.focusGraph = function (id) {
  var d = BY[id]; if (!d) return;
  GS.hidden = {};
  if (d.type === 'Problem') { GS.mode = 'problem'; } else if (d.type === 'Study') { GS.mode = 'study'; } else if (d.type === 'Project') { GS.mode = 'project'; } else { GS.mode = 'ego'; GS.depth = 1; }
  var fromInsp = document.getElementById('insp').classList.contains('open');
  GS.focus = id; MR.closeInsp('nav'); MR.go('connections');
  if (fromInsp) setTimeout(function () { var m = document.getElementById('gmode'); if (m) m.focus({ preventScroll: true }); }, 0);
};
})(MR);
