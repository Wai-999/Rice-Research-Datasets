/* ===== Shared UI helpers, charts, inspector, exports, compare ===== */
(function (MR) {
'use strict';
var D = MR.D, esc = MR.esc, $ = MR.$, BY = MR.BY;

MR.typeBadge = function (t) { return '<span class="type t-' + t + '">' + esc(MR.TYPE_LABEL[t] || t) + '</span>'; };
MR.statusPill = function (s) { if (!s || s === 'N' || s === 'Not assessed') return ''; return '<span class="pill st-' + s + '" title="Implementation status">' + esc(MR.STATUS[s] || s) + '</span>'; };
MR.confBadge = function (c) { if (!c) return ''; return '<span class="conf" data-c="' + esc(c) + '" title="Evidence confidence: ' + esc(c) + '"><i></i><i></i><i></i> ' + esc(c) + '</span>'; };
MR.tierBadge = function (t) { return t ? '<span class="tier" title="Source quality tier">T' + esc(String(t).replace('Tier ', '')) + '</span>' : ''; };
MR.link = function (url, label) { return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || 'Open original source') + ' ↗</a>' : '<span class="muted small">No public link</span>'; };
MR.refLink = function (id, label) { var d = BY[id]; if (!d) return esc(id); return '<button class="rellink" type="button" data-open="' + esc(id) + '"><span class="mono xs muted">' + esc(id) + '</span> ' + esc(label || d.title) + '</button>'; };
MR.refInline = function (ids) { return (ids || []).map(function (id) { var d = BY[id]; return d ? '<button class="chip" type="button" data-open="' + esc(id) + '" title="' + esc(d.title) + '">' + esc(id) + '</button>' : '<span class="chip">' + esc(id) + '</span>'; }).join(' '); };
MR.dots = function (n, max) { var s = '<span class="dots" role="img" aria-label="' + n + ' of ' + (max || 5) + '">'; for (var i = 1; i <= (max || 5); i++) s += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return s + '</span>'; };
MR.plural = function (w, n) { if (n === 1) return w; if (/case$|gap$/.test(w)) return w + 's'; if (/y$/.test(w) && !/[aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies'; return w + 's'; };
MR.toast = function (msg) { var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); };
MR.cssVar = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };

/* Highlight matched terms. Tokenises the RAW text and escapes each slice, so a query
   such as "amp" or "quot" can never land inside an HTML entity (old bug: esc() first,
   then regex over the escaped string produced "&<mark>amp</mark>;"). */
MR.highlight = function (text, stems) {
  text = String(text == null ? '' : text);
  if (!stems || !stems.length) return esc(text);
  var set = {}; stems.forEach(function (t) { set[t] = 1; });
  var out = '', last = 0, re = /[A-Za-z][A-Za-z0-9\-]*/g, m;
  while ((m = re.exec(text))) { var w = m[0]; if (w.length >= 3 && set[MR.stem(w.toLowerCase())]) { out += esc(text.slice(last, m.index)) + '<mark>' + esc(w) + '</mark>'; last = m.index + w.length; } }
  return out + esc(text.slice(last));
};
/* Label → value rows as a semantic <dl>. Values are pre-escaped HTML; an empty value
   renders an explicit "Not recorded" instead of a blank cell. */
MR.metaList = function (rows) {
  return '<dl class="meta-dl">' + rows.map(function (r) {
    var v = r[1], empty = v == null || !String(v).replace(/<[^>]*>/g, '').trim();
    return '<div class="meta-row"><dt>' + esc(r[0]) + '</dt>' + (empty ? '<dd class="empty-val">Not recorded</dd>' : '<dd>' + v + '</dd>') + '</div>';
  }).join('') + '</dl>';
};
function jn(sep) { return Array.prototype.slice.call(arguments, 1).filter(function (x) { return x != null && String(x).trim() !== '' && x !== 'undefined'; }).join(sep); }
MR.jn = jn;
/* Shorten summary text at a word boundary and always mark it with an ellipsis (the full
   text is one click away in the inspector). Replaces raw .slice(0, n) cuts mid-word. */
MR.clip = function (t, n) { t = String(t == null ? '' : t); if (t.length <= n) return t; var c = t.slice(0, n), i = c.lastIndexOf(' '); if (i > n * 0.6) c = c.slice(0, i); return c.replace(/[\s,;:·–\-]+$/, '') + '…'; };
MR.TRF_GLYPH = { 'Directly transferable': '✓', 'Transferable with modification': '~', 'Difficult': '!', 'Not suitable': '×' };

/* ---------- dialogs: focus trap, inert background, scroll lock, focus restore ---------- */
var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
function isVisible(el) { if (!el || !el.isConnected || !el.getClientRects().length) return false; var cs = getComputedStyle(el); return cs.visibility !== 'hidden' && !el.closest('[inert]'); }
function focusables(root) { return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), isVisible); }
function selectorFor(el) {
  if (!el || !el.getAttribute || el === document.body) return null;
  if (el.id) return '#' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
  var view = el.closest('.view'), pre = view && view.id ? '#' + view.id + ' ' : '';
  var attrs = ['data-open', 'data-graph', 'data-compare', 'data-trace', 'data-nav', 'data-go', 'data-psel', 'data-stage', 'data-ex'];
  for (var i = 0; i < attrs.length; i++) if (el.hasAttribute(attrs[i])) return pre + '[' + attrs[i] + '="' + String(el.getAttribute(attrs[i])).replace(/"/g, '\\"') + '"]';
  return null;
}
MR.selectorFor = selectorFor;
var dstack = [];
function syncBackground() {
  var top = dstack[dstack.length - 1];
  Array.prototype.forEach.call(document.body.children, function (c) {
    if (/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(c.tagName) || c.id === 'scrim') return;   // scrim = click-outside-to-close
    var closedInsp = c.id === 'insp' && !c.classList.contains('open');
    c.inert = closedInsp || (!!top && !c.contains(top.el));
  });
  document.documentElement.classList.toggle('lock', dstack.some(function (d) { return d.lock; }));
}
MR.dialog = {
  open: function (el, o) {
    o = o || {};
    if (dstack.some(function (d) { return d.el === el; })) return;
    var ret = o.returnFocus || document.activeElement;
    dstack.push({ el: el, ret: ret, retSel: selectorFor(ret), lock: o.lock !== false, onEsc: o.onEsc });
    syncBackground();
    var f = (o.initial && el.querySelector(o.initial)) || focusables(el)[0] || el;
    setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { } }, o.delay == null ? 30 : o.delay);
  },
  close: function (el, restore) {
    var i = -1; dstack.forEach(function (d, k) { if (d.el === el) i = k; }); if (i < 0) return;
    var d = dstack.splice(i, 1)[0]; syncBackground();
    if (restore === false) return;
    var t = isVisible(d.ret) ? d.ret : (d.retSel ? document.querySelector(d.retSel) : null);
    if (!isVisible(t)) t = document.getElementById('main');
    setTimeout(function () { try { t.focus({ preventScroll: true }); } catch (e) { } }, 0);
  },
  top: function () { return dstack[dstack.length - 1]; },
  isOpen: function (el) { return dstack.some(function (d) { return d.el === el; }); },
  sync: syncBackground
};
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Tab') return; var d = MR.dialog.top(); if (!d) return;
  var f = focusables(d.el); if (!f.length) { e.preventDefault(); d.el.focus(); return; }
  var first = f[0], last = f[f.length - 1], a = document.activeElement;
  if (!d.el.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
  if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
}, true);
/* Generic modal (export, compare): sticky header, scrollable body, Escape/backdrop close. */
MR.openModal = function (title, headHtml, bodyHtml) {
  var host = $('#modalHost'); if (MR.dialog.top() && MR.dialog.top().el === host) MR.closeModal(false);
  host.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdlTitle"><div class="box" tabindex="-1"><div class="mh"><h3 id="mdlTitle">' + esc(title) + '</h3>' + headHtml + '<button class="btn" id="mdlClose" type="button">Close</button></div><div class="mb">' + bodyHtml + '</div></div></div>';
  $('#mdlClose').onclick = function () { MR.closeModal(); };
  host.querySelector('.modal').addEventListener('mousedown', function (e) { if (e.target === this) MR.closeModal(); });
  MR.dialog.open(host, { initial: '#mdlClose', onEsc: function () { MR.closeModal(); } });
  return host;
};
MR.closeModal = function (restore) { var host = $('#modalHost'); if (!host.innerHTML) return; host.innerHTML = ''; MR.dialog.close(host, restore); };
MR.snippet = function (d, stems) {
  var src = [].concat(d.rec.findings || [], (d.text.abs || '').split(/(?<=[.!?])\s+/), (d.text.obj || '').split(/(?<=[.!?])\s+/));
  var set = {}; (stems || []).forEach(function (t) { set[t] = 1; });
  var best = '', bs = -1;
  src.forEach(function (x) { if (!x || x.length < 30) return; var c = 0; MR.tokens(x).forEach(function (t) { if (set[t]) c++; }); if (c > bs) { bs = c; best = x; } });
  return bs > 0 ? best : '';
};

/* ---------- SVG line chart ---------- */
MR.lineChart = function (host, cfg) {
  var W = 720, H = cfg.height || 280, m = { l: 48, r: 92, t: 14, b: 30 };
  var xs = [], ys = [];
  cfg.series.forEach(function (s) { s.points.forEach(function (p) { if (p[1] != null) { xs.push(p[0]); ys.push(p[1]); } }); });
  var x0 = cfg.xMin != null ? cfg.xMin : Math.min.apply(0, xs), x1 = cfg.xMax != null ? cfg.xMax : Math.max.apply(0, xs);
  var y0 = cfg.yMin != null ? cfg.yMin : Math.min.apply(0, ys), y1 = cfg.yMax != null ? cfg.yMax : Math.max.apply(0, ys) * 1.05;
  var X = function (v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }, Y = function (v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); };
  var g = '';
  (cfg.yTicks || []).forEach(function (t) { g += '<line class="gl" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + esc(cfg.yFmt ? cfg.yFmt(t) : t) + '</text>'; });
  (cfg.xTicks || []).forEach(function (t) { g += '<text x="' + X(t) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(cfg.xFmt ? cfg.xFmt(t) : t) + '</text>'; });
  g += '<line class="ax" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (H - m.b) + '" y2="' + (H - m.b) + '"/>';
  if (cfg.band) g += '<rect x="' + X(cfg.band[0]) + '" y="' + m.t + '" width="' + Math.max(0, X(cfg.band[1]) - X(cfg.band[0])) + '" height="' + (H - m.t - m.b) + '" fill="' + cfg.bandColor + '" opacity=".35"/><text x="' + (X(cfg.band[0]) + 4) + '" y="' + (m.t + 12) + '">' + esc(cfg.bandLabel || '') + '</text>';
  var labels = [];
  cfg.series.forEach(function (s) {
    var pts = s.points.filter(function (p) { return p[1] != null; });
    if (!pts.length) return;
    var dpath = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
    if (s.area) g += '<path d="' + dpath + ' L' + X(pts[pts.length - 1][0]) + ' ' + Y(y0) + ' L' + X(pts[0][0]) + ' ' + Y(y0) + ' Z" fill="' + s.color + '" opacity=".08"/>';
    g += '<path d="' + dpath + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.width || 1.6) + '" stroke-linejoin="round" ' + (s.dash ? 'stroke-dasharray="4 3"' : '') + '/>';
    var last = pts[pts.length - 1];
    g += '<circle cx="' + X(last[0]) + '" cy="' + Y(last[1]) + '" r="' + (s.width > 2 ? 3.5 : 2.5) + '" fill="' + s.color + '"/>';
    labels.push({ y: Y(last[1]), x: X(last[0]) + 6, t: s.name + (cfg.endFmt ? ' ' + cfg.endFmt(last[1]) : ''), c: s.color, bold: s.width > 2 });
  });
  labels.sort(function (a, b) { return a.y - b.y; });
  for (var i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 12) labels[i].y = labels[i - 1].y + 12;
  labels.forEach(function (l) { g += '<text x="' + l.x + '" y="' + (l.y + 4) + '" style="fill:' + l.c + ';font-weight:' + (l.bold ? 700 : 500) + '">' + esc(l.t) + '</text>'; });
  g += '<line id="' + cfg.id + '-hl" x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="' + MR.cssVar('--ink-3') + '" stroke-dasharray="2 3" opacity="0"/>';
  g += '<rect x="' + m.l + '" y="' + m.t + '" width="' + (W - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent" id="' + cfg.id + '-hit"/>';
  host.innerHTML = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(cfg.aria) + '">' + g + '</svg></div><div class="readout" id="' + cfg.id + '-ro">' + esc(cfg.hint || 'Hover the chart to read values.') + '</div>';
  var svg = host.querySelector('svg'), hl = host.querySelector('#' + cfg.id + '-hl'), ro = host.querySelector('#' + cfg.id + '-ro');
  function move(ev) {
    var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
    var xv = x0 + (px - m.l) / (W - m.l - m.r) * (x1 - x0);
    var near = null, nd = 1e9;
    cfg.series[0].points.forEach(function (p) { var dd = Math.abs(p[0] - xv); if (dd < nd) { nd = dd; near = p[0]; } });
    if (near == null) return;
    hl.setAttribute('x1', X(near)); hl.setAttribute('x2', X(near)); hl.setAttribute('opacity', 1);
    ro.innerHTML = '<b>' + esc(cfg.xFmt ? cfg.xFmt(near) : near) + '</b> · ' + cfg.series.map(function (s) { var p = s.points.find(function (q) { return q[0] === near; }); return '<span style="color:' + s.color + '">' + esc(s.name) + '</span> ' + (p && p[1] != null ? esc(cfg.yFmt ? cfg.yFmt(p[1], true) : p[1]) : '–'); }).join(' · ');
  }
  svg.addEventListener('mousemove', move); svg.addEventListener('mouseleave', function () { hl.setAttribute('opacity', 0); });
};

/* ---------- exports ---------- */
var dlCap = null; MR.dlReady = (window.claude && window.claude.use) ? window.claude.use('downloads').then(function (x) { dlCap = x; return x; }).catch(function () { return null; }) : Promise.resolve(null);
MR.csv = function (rows, cols) { var q = function (v) { v = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return [cols.map(function (c) { return q(c[0]); }).join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return q(typeof c[1] === 'function' ? c[1](r) : r[c[1]]); }).join(','); })).join('\n'); };
MR.save = function (filename, text) {
  MR.dlReady.then(function (cap) {
    if (cap) { cap.save({ filename: filename, data: text }).then(function (r) { MR.toast(r.status === 'saved' ? 'Saved ' + filename : 'Sent ' + filename); }).catch(function (e) { if (e && e.code === 'declined') return; showExport(filename, text); }); }
    else showExport(filename, text);
  });
};
function showExport(filename, text) {
  var url = ''; try { url = URL.createObjectURL(new Blob([text], { type: /json$/.test(filename) ? 'application/json' : /csv$/.test(filename) ? 'text/csv' : 'text/plain' })); } catch (e) { }
  MR.openModal(filename, (url ? '<a class="btn primary" href="' + url + '" download="' + esc(filename) + '">Download file</a>' : '') + '<button class="btn" id="expCopy" type="button">Copy to clipboard</button>',
    '<p class="small muted" style="margin-top:0">If the download button does nothing in this viewer, copy the text and paste it into a file.</p><label class="sr" for="expText">Export text</label><textarea class="exp" id="expText" readonly>' + esc(text) + '</textarea>');
  $('#expCopy').onclick = function () { var ta = $('#expText'); (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { MR.toast('Copied'); }).catch(function () { ta.focus(); ta.select(); MR.toast('Text selected — press Ctrl/Cmd+C'); }); };
}
MR.studyCols = [['study_id', 'id'], ['title', 'title'], ['year', 'year'], ['authors', function (r) { return r.authors; }], ['publication_type', 'publication_type'], ['journal_or_publisher', 'journal_or_publisher'], ['doi', 'doi'], ['original_url', 'original_url'],
  ['geographic_area', 'geographic_area'], ['problem_ids', 'problem_ids'], ['methods', 'methods'], ['data_types', 'data_types'], ['dataset_ids', 'dataset_ids'], ['implementation_status', 'implementation_status'], ['objective', 'objective'], ['findings', 'findings'],
  ['source_tier', 'source_tier'], ['confidence', 'confidence'], ['verification_status', 'verification_status']];
MR.genericCols = [['id', function (r) { return r.id; }], ['record_type', function (r) { return r._type; }], ['title', function (r) { return r._title; }], ['year', function (r) { return r.year || ''; }], ['url', function (r) { return r.original_url || r.source_url || ''; }], ['problem_ids', function (r) { return r.problem_ids || ''; }], ['confidence', function (r) { return r.confidence || ''; }]];

/* ---------- compare ---------- */
MR.compare = [];
MR.toggleCompare = function (id) {
  var i = MR.compare.indexOf(id);
  if (i >= 0) MR.compare.splice(i, 1); else { if (MR.compare.length >= 3) { MR.toast('Compare holds up to 3 records'); return; } MR.compare.push(id); }
  renderTray(); if (MR.onCompareChange) MR.onCompareChange();
};
function renderTray() {
  var t = $('#tray'); if (!MR.compare.length) { t.hidden = true; return; }
  t.hidden = false; t.innerHTML = '<span>' + MR.compare.length + ' selected to compare</span><button class="btn" type="button" id="cmpGo">Compare</button><button class="btn" type="button" id="cmpClr">Clear</button>';
  $('#cmpGo').onclick = openCompare; $('#cmpClr').onclick = function () { MR.compare = []; renderTray(); if (MR.onCompareChange) MR.onCompareChange(); };
}
function attrRows(d) {
  var r = d.rec, o = [];
  o.push(['Type', MR.TYPE_LABEL[d.type]]); o.push(['Year / period', r.year || r.time_period || r.date || (r.start_date ? r.start_date + '–' + r.end_date : '') || '–']);
  o.push(['Location', r.country || r.geographic_area || r.geographic_scope || r.location || r.geography || ((r.countries || []).join(', ')) || (d.type === 'Gap' || d.type === 'Project' ? 'Myanmar' : '–')]);
  o.push(['Problem', (r.problem_ids || [r.problem_id]).filter(Boolean).map(function (p) { return MR.PROB[p] ? MR.PROB[p].problem_name : p; }).join('; ')]);
  o.push(['Objective / definition', r.objective || r.problem_definition || r.description || r.mechanism || r.decision || '–']);
  o.push(['Method', (r.methods || []).join(', ') || r.methodology || r.access_method || '–']);
  o.push(['Main finding / outcome', (r.findings || r.outcomes || r.impact || []).slice ? (r.findings || r.outcomes || r.impact || []).slice(0, 3).join(' | ') : '–']);
  o.push(['Implementation', MR.STATUS[r.status || r.implementation_status] || r.transferability || '–']);
  o.push(['Source quality', r.source_tier ? 'Tier ' + r.source_tier : r.tier ? 'Tier ' + r.tier : '–']);
  o.push(['Confidence', r.confidence || d.f.conf[0] || '–']);
  return o;
}
function openCompare() {
  var ds = MR.compare.map(function (id) { return BY[id]; }).filter(Boolean); if (!ds.length) return;
  var rows = attrRows(ds[0]).map(function (r, i) { return '<tr><th scope="row">' + esc(r[0]) + '</th>' + ds.map(function (d) { return '<td>' + esc(attrRows(d)[i][1]) + '</td>'; }).join('') + '</tr>'; }).join('');
  MR.openModal('Compare ' + ds.length + ' records', '', '<div class="tbl-wrap"><table class="tbl cmp"><thead><tr><th scope="col"><span class="sr">Attribute</span></th>' +
    ds.map(function (d) { return '<th scope="col" style="white-space:normal;text-transform:none;letter-spacing:0;font-size:.85rem;min-width:12rem">' + MR.typeBadge(d.type) + ' <span class="mono xs">' + esc(d.id) + '</span><br>' + esc(d.title) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>');
}

/* ---------- Inspector ---------- */
var hist = [];
/* openInsp(id, pushInternal, fromHistory)
   - pushInternal !== false: remember the current record for the inspector's own Back button
   - fromHistory: called from popstate/hashchange, so do not write browser history again */
MR.openInsp = function (id, push, fromHistory) {
  var d = BY[id]; if (!d) return;
  var I = $('#insp'), wasOpen = I.classList.contains('open');
  var act = document.activeElement, keepSel = wasOpen && I.contains(act) ? selectorFor(act) : null;
  if (push !== false) { if (MR.curInsp && MR.curInsp !== id) hist.push(MR.curInsp); }
  var same = MR.curInsp === id;
  MR.curInsp = id;
  $('#inspType').outerHTML = '<span class="type t-' + d.type + '" id="inspType">' + esc(MR.TYPE_LABEL[d.type]) + ' · <span class="mono">' + esc(id) + '</span></span>';
  var body = $('#inspBody'), st = body.scrollTop;
  body.innerHTML = RENDER[d.type === 'Policy' ? 'Intervention' : d.type](d);
  var h2 = body.querySelector('h2'); if (h2) { h2.id = 'inspTitle'; h2.tabIndex = -1; I.setAttribute('aria-labelledby', 'inspTitle'); I.removeAttribute('aria-label'); } else { I.removeAttribute('aria-labelledby'); I.setAttribute('aria-label', 'Evidence inspector'); }
  body.scrollTop = same ? st : 0;
  $('#inspBack').hidden = !hist.length;
  I.classList.add('open'); $('#scrim').classList.add('on');
  if (!wasOpen) { MR.dialog.open(I, { initial: '#inspClose', onEsc: function () { MR.closeInsp('user'); } }); }
  else { MR.dialog.sync(); var k = keepSel ? (body.querySelector(keepSel.replace(/^#v-\S+ /, '')) || I.querySelector(keepSel.replace(/^#v-\S+ /, ''))) : null; setTimeout(function () { try { (k || h2 || $('#inspClose')).focus({ preventScroll: true }); } catch (e) { } }, 0); }
  if (!fromHistory && MR.histRecord) MR.histRecord(id, wasOpen ? 'replace' : 'push');
};
/* how: 'user' (Close/Escape/scrim: restore focus, step browser history back),
        'nav' (a navigation follows: no focus restore, strip the record from the URL),
        'history' (popstate already moved the URL) */
MR.closeInsp = function (how) {
  var I = $('#insp'); if (!I.classList.contains('open')) { hist = []; MR.curInsp = null; return; }
  I.classList.remove('open'); $('#scrim').classList.remove('on'); hist = []; MR.curInsp = null;
  MR.dialog.close(I, how !== 'nav');
  if (how !== 'history' && MR.histCloseRecord) MR.histCloseRecord(how === 'user');
};
MR.inspBack = function () { var p = hist.pop(); if (p) MR.openInsp(p, false); };

function blk(h, body) { return body ? '<div class="blk"><h4>' + esc(h) + '</h4>' + body + '</div>' : ''; }
function ul(a) { return a && a.length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; }
function related(id) {
  var groups = {};
  (MR.adj[id] || []).forEach(function (i) {
    var e = MR.EDGES[i], other = e.source_id === id ? e.target_id : e.source_id, dir = e.source_id === id ? e.relationship_type : '← ' + e.relationship_type;
    if (!BY[other]) return; (groups[dir] = groups[dir] || []).push([other, e]);
  });
  var keys = Object.keys(groups); if (!keys.length) return '<p class="muted small">No recorded connections.</p>';
  keys.sort(function (a, b) { return groups[b].length - groups[a].length; });
  return keys.map(function (k) {
    var items = groups[k]; var shown = items.slice(0, 8);
    return '<div class="relgroup"><div class="rt">' + esc(k) + ' (' + items.length + ')</div>' + shown.map(function (x) { return MR.refLink(x[0]) + (x[1].evidence && /contradict|contest|challeng|extends|published|corrobor|updates|same|scales|tests|evaluates|validates/.test(x[1].relationship_type) ? '<div class="xs muted" style="margin:-2px 0 4px 0">' + esc(x[1].evidence) + '</div>' : ''); }).join('') + (items.length > 8 ? '<div class="xs muted">+' + (items.length - 8) + ' more — see Connections view</div>' : '') + '</div>';
  }).join('') + '<button class="btn" data-graph="' + esc(id) + '" type="button">View in connection graph</button>';
}
function claimsFor(id) {
  var cs = D.claims.filter(function (c) { return c.record_id === id || (c.source_ids || []).indexOf(id) >= 0; });
  if (!cs.length) return '';
  return '<div class="trace">' + cs.slice(0, 12).map(function (c) {
    return '<div class="step"><span class="k">Claim</span><span>' + esc(c.claim) + '</span><span class="k">Record</span><span>' + MR.refInline([c.record_id]) + ' <span class="xs muted">' + esc(c.claim_id) + '</span></span><span class="k">Citation</span><span>' + (c.source_ids || []).map(function (s) { var d = BY[s]; return d ? '<div class="xs">' + esc(d.rec.citation || d.title) + '</div>' : esc(s); }).join('') + '</span><span class="k">Status</span><span class="xs">' + esc(c.verification_status) + ' · ' + MR.confBadge(c.confidence) + ' · checked ' + esc(c.last_verified) + '</span></div>';
  }).join('') + '</div>';
}
function actionsRow(id, url) { return '<div style="display:flex;gap:6px;flex-wrap:wrap">' + (url ? '<a class="btn primary" href="' + esc(url) + '" target="_blank" rel="noopener">Open original source ↗</a>' : '') + '<button class="btn" type="button" data-compare="' + esc(id) + '">' + (MR.compare.indexOf(id) >= 0 ? 'Remove from compare' : 'Add to compare') + '</button><button class="btn" type="button" data-graph="' + esc(id) + '">Connections</button></div>'; }
var RENDER = {
  Study: function (d) {
    var s = d.rec;
    var ds = s.dataset_ids.map(function (x) { return MR.refLink(x); }).join('');
    var es = s.effect_sizes && s.effect_sizes.length ? '<div class="es">' + s.effect_sizes.map(function (e) { return '<span>' + esc(e.metric) + (e.context ? ' <span class="muted xs">(' + esc(e.context) + ')</span>' : '') + '</span><b>' + esc(e.value) + '</b>'; }).join('') + '</div>' : '<p class="small muted">No quantified effect sizes extracted.</p>';
    return '<h2>' + esc(s.title) + '</h2><div class="row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + MR.statusPill(s.implementation_status) + MR.tierBadge(s.source_tier) + MR.confBadge(s.confidence) + '<span class="chip">' + esc(s.publication_type || '') + '</span>' + (s.low_scrutiny_venue ? '<span class="chip" title="Venue with limited indexing or peer-review transparency">Verify venue</span>' : '') + (s.curated ? '<span class="chip on">Curated record</span>' : '<span class="chip">Auto-extracted</span>') + '</div>' +
      actionsRow(d.id, s.original_url) +
      blk('Citation', '<div class="cite">' + esc(s.citation) + '</div>' + (s.alt_url ? '<div class="xs" style="margin-top:4px">Also: ' + MR.link(s.alt_url, MR.clip(s.alt_url.replace(/^https?:\/\//, ''), 70)) + '</div>' : '') + (s.full_text_url ? '<div class="xs" style="margin-top:4px">Open-access PDF: ' + MR.link(s.full_text_url, 'full text') + '</div>' : '')) +
      blk('Research objective', s.objective ? '<p>' + esc(s.objective) + '</p><div class="src">' + esc(s.objective_source) + '</div>' : '<p class="muted small">Objective not available (no abstract retrieved). Open the original source.</p>') +
      blk('Problem', s.problem_ids.map(function (p) { return MR.refLink(p); }).join('') + '<div class="src">Problem link: ' + esc(s.problem_link_source) + '</div>') +
      blk('Location & period', '<p>' + esc(s.geographic_area || '–') + (s.time_coverage ? ' · ' + esc(s.time_coverage) : '') + (s.year ? ' · published ' + s.year : '') + '</p>' + (s.regions.length ? '<div class="xs muted">' + s.regions.map(function (r) { return esc(r + ' ' + (MR.regionMy[r] || '')); }).join(' · ') + '</div>' : '')) +
      blk('Methodology', '<p>' + esc(s.methodology || '–') + '</p><div class="xs muted">' + esc((s.methods || []).join(' · ')) + (s.research_types.length ? ' · ' + esc(s.research_types.join(', ')) : '') + '</div>' + (s.sample_size ? '<div class="xs">Sample: ' + esc(s.sample_size) + '</div>' : '')) +
      blk('Data', (ds || '<p class="small muted">No catalogued dataset linked.</p>') + (s.data_types.length ? '<div class="xs muted">Data types: ' + esc(s.data_types.join(', ')) + '</div>' : '')) +
      blk('Variables', '<p class="small muted">' + (s.curated && s.methodology ? 'See methodology; variable lists were not extracted as structured fields.' : 'Not extracted.') + '</p>') +
      blk('Findings', s.findings && s.findings.length ? ul(s.findings) + '<div class="src">' + esc(s.findings_source) + '</div>' : '<p class="muted small">Findings not extracted — see abstract or source.</p>') +
      blk('Intervention & implementation', s.intervention_ids.length ? s.intervention_ids.map(function (i) { return MR.refLink(i) + ' ' + MR.statusPill(BY[i] ? BY[i].rec.status : ''); }).join('') : '<p class="small muted">Not linked to an audited intervention.</p>') +
      blk('Impact (effect sizes)', es) +
      blk('Limitations', s.limitations && s.limitations.length ? ul(s.limitations) : '<p class="small muted">None recorded.</p>') +
      blk('Remaining gap', s.research_gap ? '<p>' + esc(s.research_gap) + '</p>' : '') +
      blk('Connections', related(d.id)) +
      blk('Trace evidence', claimsFor(d.id) || '<p class="small muted">No derived claims cite this record.</p>') +
      blk('Source & verification', '<p class="small">' + esc(s.verification_status) + '</p><p class="xs muted">Indexed from: ' + esc(s.source_db.join(', ')) + ' · cited-by count (Crossref): ' + (s.cited_by || 0) + (s.note ? ' · ' + esc(s.note) : '') + '</p>') +
      (s.abstract ? '<details class="abs"><summary>Abstract</summary><p>' + esc(s.abstract) + '</p></details>' : '');
  },
  Problem: function (d) {
    var p = d.rec, c = p.causal_chain;
    var ivs = p.existing_interventions.map(function (i) { return MR.refLink(i) + ' ' + MR.statusPill(BY[i] ? BY[i].rec.status : ''); }).join('');
    return '<h2>' + esc(p.problem_name) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">' + esc(p.problem_category) + '</span><span class="chip">' + esc(p.symptom_or_root_cause) + '</span><span class="chip on">' + esc(p.priority) + ' priority</span>' + MR.confBadge(p.confidence) + '</div>' + actionsRow(d.id, '') +
      blk('Definition', '<p>' + esc(p.problem_definition) + '</p>') +
      blk('Symptom → immediate cause → root cause', '<div class="causal"><div class="lvl s"><b class="xs">SYMPTOM</b><br>' + esc(c.symptom) + '</div><div class="lvl i"><b class="xs">IMMEDIATE CAUSES</b>' + ul(c.immediate_causes) + '</div><div class="lvl r"><b class="xs">ROOT / STRUCTURAL CAUSES</b>' + ul(c.root_causes) + '</div></div>') +
      blk('Evidence (claim → source)', '<div class="trace">' + p.evidence.map(function (e) { return '<div class="step"><span class="k">Claim</span><span>' + esc(e.claim) + (e.note ? '<div class="xs muted">' + esc(e.note) + '</div>' : '') + '</span><span class="k">Source</span><span>' + MR.refInline(e.source_ids) + ' ' + MR.confBadge(e.confidence) + '</span></div>'; }).join('') + '</div>') +
      blk('Scope & impacts', MR.metaList([['Geography', esc(p.geographic_scope)], ['Period', esc(p.time_period)], ['Farmers affected', esc(p.farmers_affected)], ['Area', esc(p.area_affected)], ['Yield impact', esc(p.yield_impact)], ['Financial impact', esc(p.financial_impact)], ['Labour impact', esc(p.labor_impact)], ['Time impact', esc(p.time_impact)], ['Trend', esc(p.trend)]])) +
      blk('Scores (1–5, analyst rubric)', '<div class="es">' + Object.keys(p.scores).map(function (k) { return '<span>' + esc(k.replace(/_/g, ' ')) + '</span><b>' + MR.dots(p.scores[k]) + '</b>'; }).join('') + '</div>') +
      blk('Existing interventions', ivs || '<p class="small muted">None audited.</p>') +
      blk('Data availability', '<p>' + esc(p.data_availability) + '</p>' + p.dataset_ids.map(function (x) { return MR.refLink(x); }).join('')) +
      blk('Data-science potential', '<p>' + esc(p.data_science_potential) + '</p>') +
      blk('Research gaps', p.gap_ids.map(function (g) { return MR.refLink(g); }).join('')) +
      blk('Supporting studies (' + p.n_studies + ')', p.study_ids.slice(0, 12).map(function (s) { return MR.refLink(s, (BY[s] ? BY[s].rec.year + ' · ' + BY[s].title : s)); }).join('') + (p.n_studies > 12 ? '<button class="btn" type="button" data-searchprob="' + esc(p.id) + '">All ' + p.n_studies + ' studies in Search</button>' : ''));
  },
  Dataset: function (d) {
    var x = d.rec;
    var rounds = x.rounds ? '<div class="es">' + x.rounds.map(function (r) { return '<span>' + esc(r[0]) + '</span><a href="https://doi.org/' + esc(r[1].replace('doi:', '')) + '" target="_blank" rel="noopener" class="mono xs">' + esc(r[1]) + ' ↗</a>'; }).join('') + '</div>' : '';
    return '<h2>' + esc(x.name) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap">' + MR.tierBadge(x.tier) + '<span class="chip">' + esc(x.access_class) + '</span><span class="chip">' + esc(x.temporal_resolution) + '</span><span class="chip">' + esc(x.spatial_resolution) + '</span></div>' + actionsRow(d.id, x.source_url) +
      blk('Citation', '<div class="cite">' + esc(x.citation) + '</div>') +
      blk('Description', '<p>' + esc(x.description) + '</p>') +
      blk('Producer → collection method → coverage → frequency → limitations → access', MR.metaList([['Producer', esc(x.producer)], ['Collection method', esc(x.methodology)], ['Geographic coverage', esc(x.geography)], ['Period', esc(jn(' – ', x.start_date, x.end_date))], ['Spatial resolution', esc(x.spatial_resolution)], ['Frequency', esc(jn(' ', x.temporal_resolution, x.update_frequency ? '(updates: ' + x.update_frequency + ')' : ''))], ['Data types', esc((x.data_types || []).join(', '))], ['Limitations', ul(x.known_limitations)], ['Access', esc(jn(' · ', x.access_method, x.download_format, x.api_available ? 'API: ' + x.api_available : ''))], ['Licence / cost', esc(jn(' · ', x.license, x.cost))], ['Quality', esc(x.data_quality)], ['Missingness', esc(x.missingness)]])) +
      blk('Variables', ul(x.variables) + '<div class="xs muted">Unit: ' + esc(x.unit) + '</div>') + (rounds ? blk('Rounds (Harvard Dataverse DOIs)', rounds) : '') +
      blk('Related problems', x.problem_ids.map(function (p) { return MR.refLink(p); }).join('')) +
      blk('Studies using this dataset (' + x.study_ids.length + ')', x.study_ids.slice(0, 15).map(function (s) { return MR.refLink(s); }).join('') || '<p class="small muted">None linked.</p>') +
      blk('Verification', '<p class="small">' + esc(x.verified) + ' · last verified ' + esc(x.last_verified) + '</p>' + (x.documentation_url ? '<p class="xs">Documentation: ' + MR.link(x.documentation_url, 'docs') + '</p>' : '')) +
      blk('Connections', related(d.id));
  },
  Intervention: function (d) {
    var i = d.rec;
    var bench = D.benchmarks.filter(function (b) { return b.problem_ids.some(function (p) { return i.problem_ids.indexOf(p) >= 0; }); }).slice(0, 5);
    return '<h2>' + esc(i.name) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap">' + MR.statusPill(i.status) + MR.confBadge(i.confidence) + '</div>' + actionsRow(d.id, '') +
      blk('Implementation record', MR.metaList([['Location', esc(i.location)], ['Date', esc(i.date)], ['Organisation', esc(i.organization)], ['Farmers', esc(i.farmers)], ['Area', esc(i.area)], ['Persistence', esc(i.persistence)]])) +
      blk('Outcomes (as reported)', ul(i.outcomes)) + blk('Barriers / caveats (verified or analyst-flagged)', ul(i.barriers)) +
      blk('Problems addressed', i.problem_ids.map(function (p) { return MR.refLink(p); }).join('')) +
      blk('Evidence sources', i.evidence_ids.map(function (s) { return MR.refLink(s); }).join('')) +
      blk('Comparable neighbour-country cases', bench.map(function (b) { return MR.refLink(b.id); }).join('') || '<p class="small muted">None.</p>') +
      blk('Trace evidence', claimsFor(d.id));
  },
  Benchmark: function (d) {
    var b = d.rec;
    return '<h2>' + esc(b.country + ': ' + b.intervention) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="trf trf-' + MR.TRF[b.transferability] + '">' + esc(b.transferability) + '</span>' + MR.confBadge(b.confidence) + '</div>' + actionsRow(d.id, '') +
      blk('Problem → country → intervention → date → mechanism → cost → adoption → outcome', MR.metaList([['Myanmar problem', (b.problem_ids || []).map(function (p) { return MR.refLink(p); }).join('')], ['Country', esc(b.country)], ['Intervention', esc(b.intervention)], ['Period', esc(b.year)], ['Mechanism', esc(b.mechanism)], ['Cost', esc(b.cost)], ['Adoption', esc(b.adoption)], ['Outcome', ul(b.impact)]])) +
      blk('Why it worked', '<p>' + esc(b.why) + '</p>') + blk('Institutional conditions', '<p>' + esc(b.conditions) + '</p>') +
      blk('Transferability to Myanmar (analyst judgement)', '<p><b>' + esc(b.transferability) + '.</b> ' + esc(b.transfer_reason) + '</p><p class="small">Required modification: ' + esc(b.required_modification) + '</p><p class="xs muted">A foreign result is not assumed to work in Myanmar.</p>') +
      blk('Sources', b.source_ids.map(function (s) { return MR.refLink(s); }).join('')) + blk('Trace evidence', claimsFor(d.id));
  },
  Gap: function (d) {
    var g = d.rec; var pr = D.projects.filter(function (p) { return p.gap_ids.indexOf(g.id) >= 0; });
    return '<h2>' + esc(g.title) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip on">' + esc(g.gap_type) + ' gap</span><span class="chip">' + esc(g.priority) + ' priority</span><span class="chip">Data availability ' + MR.dots(g.data_availability) + '</span></div>' +
      blk('Description', '<p>' + esc(g.description) + '</p>') + blk('Problems', g.problem_ids.map(function (p) { return MR.refLink(p); }).join('')) + blk('Evidence', g.evidence_ids.map(function (s) { return MR.refLink(s); }).join('')) +
      blk('Projects that address it', pr.map(function (p) { return MR.refLink(p.id); }).join('') || '<p class="small muted">None yet.</p>');
  },
  Project: function (d) { return MR.projectDetail(d.rec, true); }
};
MR.RENDER = RENDER;
})(MR);
