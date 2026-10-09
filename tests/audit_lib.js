// Geometry audit helpers injected into the page by the regression tests.
// Reports: sibling overlaps inside layout containers, collapsed text boxes,
// and content that spills out of its box without an intentional scroll container.
window.__audit = (function () {
  function vis(el) { var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; var r = el.getBoundingClientRect(); return r.width > 0 || r.height > 0; }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function label(el) { var s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; }
  // "ink" rect = element box united with the box of its rendered text, so text that
  // spills out of a collapsed (0-width) grid track is still measured where it paints.
  // Union of the element box and the boxes of its *visible* text (text inside closed
  // <details>, hidden nodes or clipped by a scroll/overflow box is ignored), so text that
  // spills out of a collapsed (0-width) grid track is measured where it actually paints.
  function clipRect(node, r) {
    for (var p = node.parentElement; p; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { var c = p.getBoundingClientRect();
        r = { left: Math.max(r.left, c.left), right: Math.min(r.right, c.right), top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom) }; }
    }
    return r;
  }
  function ink(el) {
    var a = el.getBoundingClientRect(), u = { left: a.left, right: a.right, top: a.top, bottom: a.bottom };
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, rg = document.createRange();
    while ((n = tw.nextNode())) {
      if (!n.nodeValue.trim()) continue; var pe = n.parentElement;
      if (!pe || (pe.checkVisibility && !pe.checkVisibility({ visibilityProperty: true })) || pe.closest('.sr')) continue;
      rg.selectNodeContents(n); var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) { var r = rs[i]; if (!r.width || !r.height) continue;
        // use the glyph line box minus 2px so tall display fonts don't register 1px "overlaps"
        // vertical extent is clamped to the parent's box: fallback fonts can report a content
        // area taller than the line box without painting outside it. Vertical overflow of
        // fixed-height boxes is caught separately by spills() ("content taller than box").
        var pb = pe.getBoundingClientRect(); var ih = getComputedStyle(pe).display === 'inline';
        r = clipRect(pe, { left: r.left, right: r.right, top: ih ? r.top + 1 : Math.max(r.top + 1, pb.top), bottom: ih ? r.bottom - 1 : Math.min(r.bottom - 1, pb.bottom) });
        if (r.right - r.left < 1 || r.bottom - r.top < 1) continue;
        u.left = Math.min(u.left, r.left); u.right = Math.max(u.right, r.right); u.top = Math.min(u.top, r.top); u.bottom = Math.max(u.bottom, r.bottom); }
    }
    return u;
  }
  function scrollAncestor(el, root) { for (var p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) { var o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return p; } return null; }
  function overlaps(root, tol) {
    tol = tol == null ? 1 : tol; var out = [];
    root.querySelectorAll('*').forEach(function (c) {
      var cs = getComputedStyle(c); if (!/grid|flex/.test(cs.display) && c !== root) return;
      var kids = Array.prototype.filter.call(c.children, function (k) { var p = getComputedStyle(k).position; return vis(k) && p !== 'absolute' && p !== 'fixed' && k.tagName !== 'svg' && !k.classList.contains('sr'); });
      if (kids.length > 80) kids = kids.slice(0, 80);
      for (var i = 0; i < kids.length; i++) { var a = ink(kids[i]); if (a.right - a.left < 1 || a.bottom - a.top < 1) continue;
        for (var j = i + 1; j < kids.length; j++) { var b = ink(kids[j]); if (b.right - b.left < 1 || b.bottom - b.top < 1) continue;
          var ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > tol && oy > tol) out.push({ parent: label(c), a: label(kids[i]) + ' "' + txt(kids[i]).slice(0, 40) + '"', b: label(kids[j]) + ' "' + txt(kids[j]).slice(0, 40) + '"', ox: Math.round(ox), oy: Math.round(oy) }); } }
    });
    return out;
  }
  function collapsed(root) {
    var out = [];
    root.querySelectorAll('*').forEach(function (el) {
      if (!vis(el) || el.children.length > 3 || el.closest('.sr')) return; var t = txt(el); if (!t) return;
      var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (cs.display === 'inline' || cs.display === 'contents') return;
      if (r.width < 4 && el.scrollWidth > 8) out.push({ el: label(el), text: t.slice(0, 50), w: Math.round(r.width), sw: el.scrollWidth });
    });
    return out;
  }
  function spills(root) {
    var out = [], rr = root.getBoundingClientRect();
    root.querySelectorAll('*').forEach(function (el) {
      if (!vis(el) || el.closest('svg') || el.closest('.sr')) return;
      var r = el.getBoundingClientRect(); if (r.width < 1) return;
      var cs = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'visible' && el.clientWidth > 0 && !/inline/.test(cs.display)) {
        if (!scrollAncestor(el, root)) out.push({ el: label(el), kind: 'content wider than box', text: txt(el).slice(0, 50), cw: el.clientWidth, sw: el.scrollWidth });
      }
      if (el.scrollHeight > el.clientHeight + 3 && cs.overflowY === 'visible' && el.clientHeight > 0 && !/inline|table/.test(cs.display) && el.tagName !== 'DETAILS' && el.tagName !== 'svg') out.push({ el: label(el), kind: 'content taller than fixed-height box', text: txt(el).slice(0, 50), ch: el.clientHeight, sh: el.scrollHeight });
      if (r.right > rr.right + 2 && !scrollAncestor(el, root)) out.push({ el: label(el), kind: 'beyond container right edge', text: txt(el).slice(0, 50), right: Math.round(r.right), limit: Math.round(rr.right) });
    });
    return out;
  }
  function ellipsized(root) {
    var out = [];
    root.querySelectorAll('*').forEach(function (el) { if (!vis(el)) return; var cs = getComputedStyle(el); if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push({ el: label(el), text: txt(el).slice(0, 60) }); });
    return out;
  }
  function pageOverflow() { return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth; }
  return { ink: ink, overlaps: overlaps, collapsed: collapsed, spills: spills, ellipsized: ellipsized, pageOverflow: pageOverflow };
})();
