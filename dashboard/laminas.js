/* ============================================================
   Láminas explicativas (formato documento funcional).
   Cada función por tipo recibe un objeto de datos y devuelve un
   SVG (cadena). Mide con canvas DM Sans para partir líneas.
   ============================================================ */
(function () {
'use strict';
const AZ = '#007AFF', AZS = '#EAF3FF', INK = '#1B1B20', BODY = '#3A3A42', G2 = '#686868', G3 = '#909098',
      BD = '#D9D9DC', FIL = '#E0E0E6', BG = '#F2F2F4', WARN = '#B25E09';
/* segundo acento: colores de Claude Code, solo para lo que es IA o Claude Code */
const CC = '#D97757', CCD = '#B85C3E', CCS = '#F6E3DA', CCK = '#141413';
/* ¿la pieza es IA / Claude Code? (título con Claude, skill, hook, MCP, agente) */
const esIA = (...t) => /claude|skill|hook|mcp|agente/i.test(t.filter(Boolean).join(' '));
const SANS = '"DM Sans", system-ui, sans-serif', MONO = '"DM Mono", ui-monospace, monospace';
const r1 = v => Math.round(v * 10) / 10;
const ESC = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- medida de texto ---------- */
let _cx;
function medir(s, size = 10, peso = 400, mono = false, ls = 0) {
  _cx = _cx || document.createElement('canvas').getContext('2d');
  _cx.font = `${peso} ${size}px ${mono ? MONO : SANS}`;
  return _cx.measureText(s).width + ls * s.length;
}
function partir(txt, ancho, size = 10, peso = 400, mono = false) {
  const out = []; let cur = '';
  for (const w of String(txt).split(/\s+/).filter(Boolean)) {
    const t = cur ? cur + ' ' + w : w;
    if (!cur || medir(t, size, peso, mono) <= ancho) cur = t; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}

/* ---------- primitivas SVG (lenguaje de mm_lib.py) ---------- */
function T(x, y, s, o = {}) {
  const { size = 10, fill = BODY, peso = 400, anchor = 'start', ls = 0, mono = false } = o;
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" fill="${fill}" font-weight="${peso}" text-anchor="${anchor}"${ls ? ` letter-spacing="${ls}"` : ''}${mono ? ` font-family='${MONO}'` : ''}>${ESC(s)}</text>`;
}
function vs(x, y, s, fill = G2, anchor = 'start') { return T(x, y, s.toUpperCase(), { size: 10, fill, peso: 600, ls: 1.4, anchor }); }
function lin(pts, o = {}) {
  const { col = G2, w = 1, dash = '', marker = '', attr = '' } = o;
  const d = 'M' + pts.map(p => `${r1(p[0])} ${r1(p[1])}`).join('L');
  return `<path d="${d}"${attr} fill="none" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}${marker ? ` marker-end="url(#${marker})"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
}
function flecha(pts, o = {}) {
  const col = o.col || INK;
  const mk = { [INK]: 'mga', [AZ]: 'mgb', [G3]: 'mgg' }[col] || 'mga';
  return lin(pts, { col, w: o.w || 1.4, dash: o.dash || '', marker: mk, attr: (o.obj ? ` data-obj="${o.obj}"` : '') + (o.ia ? ' data-ia="1"' : '') });
}
function punto(x, y) { return `<circle cx="${r1(x)}" cy="${r1(y)}" r="3" fill="${AZ}" stroke="#fff" stroke-width="1"/>`; }
function pin(x, y, n, col = INK) {
  return `<g data-vivo="pin" data-px="${r1(x)}" data-py="${r1(y)}" data-n="${ESC(n)}"><circle cx="${r1(x)}" cy="${r1(y)}" r="9" fill="${col}" stroke="#fff" stroke-width="2"/>` + T(x, y + 3.6, n, { size: 10, fill: '#fff', peso: 700, anchor: 'middle' }) + '</g>';
}
function rrect(x, y, w, h, tl = 0, tr = 0, br = 0, bl = 0) {
  return `M${r1(x + tl)} ${r1(y)}H${r1(x + w - tr)}${tr ? `Q${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + tr)}` : ''}V${r1(y + h - br)}${br ? `Q${r1(x + w)} ${r1(y + h)} ${r1(x + w - br)} ${r1(y + h)}` : ''}H${r1(x + bl)}${bl ? `Q${r1(x)} ${r1(y + h)} ${r1(x)} ${r1(y + h - bl)}` : ''}V${r1(y + tl)}${tl ? `Q${r1(x)} ${r1(y)} ${r1(x + tl)} ${r1(y)}` : ''}Z`;
}
function caja(x, y, w, h, o = {}) {
  const { fill = '#fff', st = BD, sombra = true, dash = '', rx = 4 } = o;
  return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx}" fill="${fill}" stroke="${st}" stroke-width="1"${sombra ? ' filter="url(#mgsh)"' : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}
function grupo(x, y, w, h, inner) { return `<g data-b="${r1(x)} ${r1(y)} ${r1(w)} ${r1(h)}">${inner}</g>`; }

/* nodo de diagrama: blanco, borde, sombra; acento = filete azul; oscuro = tinta (pieza que cierra la persona) */
function nodo(x, y, w, tit, sub, o = {}) {
  const ts = o.tsize || 12, ss = o.ssize || 10, osc = !!o.oscuro, lh = ss * 1.38;
  const hasNum = o.num != null, rv = o.agente ? 36 : 0;
  const tl = partir(tit, w - 26 - rv - (hasNum ? 16 : 0), ts, 600);
  const sl = sub ? partir(sub, w - 26 - rv, ss, 400) : [];
  let h = 8 + tl.length * (ts + 3) + (sl.length ? ss + 3 + (sl.length - 1) * lh : 0) + 11;
  if (o.h) h = Math.max(h, o.h);
  let s = caja(x, y, w, h, { fill: osc ? INK : '#fff', st: osc ? INK : BD, dash: o.dash ? '4 3' : '' });
  if (o.acento && !osc) s += `<rect x="${r1(x)}" y="${r1(y)}" width="3" height="${r1(h)}" rx="1.5" fill="${o.agente || esIA(tit) ? CC : AZ}"/>`;
  tl.forEach((l, i) => { s += T(x + 14, y + 8 + ts - 1 + i * (ts + 3), l, { size: ts, fill: osc ? '#fff' : INK, peso: 600 }); });
  const sy = y + 8 + tl.length * (ts + 3) + ss - 1 + 2;
  sl.forEach((l, i) => { s += T(x + 14, sy + i * lh, l, { size: ss, fill: osc ? '#C8C8D0' : G2 }); });
  if (hasNum) s += T(x + w - 10, y + 8 + ts - 1, o.num, { size: 10, fill: osc ? '#C8C8D0' : G3, peso: 600, anchor: 'end' });
  return { svg: grupo(x, y, w, h, s), x, y, w, h, r: x + w, b: y + h, cx: x + w / 2, cy: y + h / 2, pie: [x + w - 22, y + h - 8] };
}

/* llamada numerada: pin centrado en (x,y), título 600, texto gris, guía fina con punto en la pieza */
function llam(x, y, w, n, tit, txt, route) {
  const a = partir(tit, w - 18, 12, 700), b = partir(txt, w - 18, 10, 400), av = n === '!';
  let s = '';
  if (route) s += lin(route, { col: AZ, w: 1 }) + punto(route[route.length - 1][0], route[route.length - 1][1]);
  s += pin(x, y, n, av ? WARN : INK);
  a.forEach((l, i) => { s += T(x + 17, y + 4 + i * 15, l, { size: 12, fill: av ? WARN : INK, peso: 700 }); });
  b.forEach((l, i) => { s += T(x + 17, y + 4 + a.length * 15 + i * 13.6, l, { size: 10, fill: G2 }); });
  const h = 4 + a.length * 15 + b.length * 13.6 + 6;
  return { svg: grupo(x - 9, y - 9, w + 9, Math.max(h + 5, 18), s), h };
}

/* iconos de trazo 1.6 px en caja de 20 */
const ICONOS = {
  notes: '<path d="M5 3h7l3.5 3.5V17H5z"/><path d="M12 3v3.5h3.5M7.5 10h5M7.5 13h5"/>',
  gear: '<circle cx="10" cy="10" r="2.6"/><circle cx="10" cy="10" r="5.6"/><path d="M10 2.4v2M10 15.6v2M2.4 10h2M15.6 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6L14 6M6 14l-1.4 1.4"/>',
  agent: '<rect x="4" y="6" width="12" height="9.5" rx="2.2"/><path d="M10 2.8V6M7 17.5h6"/><circle cx="7.6" cy="10.7" r=".9" fill="currentColor"/><circle cx="12.4" cy="10.7" r=".9" fill="currentColor"/>',
  book: '<path d="M3 4.6c2.6-1 5-.9 7 .8 2-1.7 4.4-1.8 7-.8v11c-2.6-1-5-.9-7 .8-2-1.7-4.4-1.8-7-.8z"/><path d="M10 5.4v11"/>',
  search: '<circle cx="8.8" cy="8.8" r="5.2"/><path d="M12.8 12.8l4.4 4.4"/>',
  user: '<circle cx="10" cy="6.8" r="3.2"/><path d="M3.8 17c0-3.5 2.7-5.6 6.2-5.6s6.2 2.1 6.2 5.6z"/>',
  lock: '<rect x="4.2" y="9" width="11.6" height="8" rx="1.6"/><path d="M6.6 9V6.6a3.4 3.4 0 016.8 0V9"/>',
  list: '<path d="M7 5h10M7 10h10M7 15h10"/><circle cx="3.8" cy="5" r=".9" fill="currentColor"/><circle cx="3.8" cy="10" r=".9" fill="currentColor"/><circle cx="3.8" cy="15" r=".9" fill="currentColor"/>',
  eye: '<path d="M2 10s3-5.4 8-5.4S18 10 18 10s-3 5.4-8 5.4S2 10 2 10z"/><circle cx="10" cy="10" r="2.4"/>',
  check: '<path d="M3.5 10.5l4.2 4.2L16.5 5.8"/>',
  folder: '<path d="M2.6 5.5h5l1.6 2h8.2v8.4H2.6z"/>',
  doc: '<path d="M5 3h7l3.5 3.5V17H5z"/><path d="M12 3v3.5h3.5"/>'
};
function icono(nombre, x, y, col = AZ) {
  return `<g transform="translate(${r1(x)} ${r1(y)})" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" color="${col}">${ICONOS[nombre] || ICONOS.doc}</g>`;
}
function persona(cx, base, s = 1) {
  return `<circle cx="${r1(cx)}" cy="${r1(base - 82 * s)}" r="${r1(24 * s)}" fill="${INK}"/>` +
    `<path d="M${r1(cx - 30 * s)} ${r1(base)}Q${r1(cx - 30 * s)} ${r1(base - 52 * s)} ${r1(cx)} ${r1(base - 52 * s)}Q${r1(cx + 30 * s)} ${r1(base - 52 * s)} ${r1(cx + 30 * s)} ${r1(base)}Z" fill="${INK}"/>`;
}


/* ---------- agente con personaje (bot) ----------
   Cabeza-bloque tinta con visor y punta de antena en terracota, dos ojos claros, cuerpo pequeño.
   Hijos identificables para animar: .cabeza (oscila), .ojos (parpadean), .antena > .punta (late). */
function botPlano(x, y, o = {}) {
  const s = o.s || .9, osc = !!o.oscuro, hf = osc ? '#3A3A42' : CCK, st = osc ? ' stroke="#9A9AA3" stroke-width="1"' : '';
  return `<g data-vivo="agente" data-paso="${o.paso || 0}" transform="translate(${r1(x)} ${r1(y)}) scale(${s})">` +
    `<ellipse cx="0" cy="1" rx="11" ry="2.6" fill="${INK}" fill-opacity=".08"/>` +
    `<rect x="-7" y="-10" width="14" height="10" rx="3" fill="${hf}"${st}/><rect x="-3" y="-6" width="6" height="2" rx="1" fill="${CC}"/>` +
    `<g class="cabeza" data-px="0" data-py="-11">` +
    `<g class="antena"><path d="M0 -29V-35" stroke="${hf}" stroke-width="1.6" stroke-linecap="round"/><circle class="punta" cx="0" cy="-36.5" r="2.6" fill="${CC}" data-tx="0" data-ty="-36.5"/></g>` +
    `<rect x="-12" y="-29" width="24" height="18" rx="5" fill="${hf}"${st}/><rect x="-9" y="-26" width="18" height="12" rx="3.5" fill="${CC}"/>` +
    `<g class="ojos" data-ex="0" data-ey="-20"><rect x="-6" y="-23" width="4" height="6" rx="2" fill="#fff"/><rect x="2" y="-23" width="4" height="6" rx="2" fill="#fff"/></g>` +
    `</g></g>`;
}
/* versión isométrica: de pie sobre (x,y,z) con huella 16·s */
function botIso(I, x, y, z, s = 1, paso = 0) {
  const w = 16 * s, hb = 8 * s, hc = 13 * s, zc = z + hb + 1, zt = zc + hc, mx = x + w / 2, my = y + w / 2;
  let t = I.sombra(x, y, w, w, hb + hc, z);
  t += I.caja(x + 2 * s, y + 2 * s, z, w - 4 * s, w - 4 * s, hb, 'k');
  const cab = I.caja(x, y, zc, w, w, hc, 'k') + I.poly(I.cara(y + w, x + 2 * s, zc + 3 * s, x + w - 2 * s, zt - 2.5 * s), CC);
  const ey = y + w + .1, e0 = zt - 8.5 * s, e1 = zt - 4.5 * s;
  const ojos = `<g class="ojos" data-ex="${r1(I.p(mx, ey, (e0 + e1) / 2)[0])}" data-ey="${r1(I.p(mx, ey, (e0 + e1) / 2)[1])}">` +
    I.poly(I.cara(ey, x + 4.2 * s, e0, x + 7.2 * s, e1), '#fff') + I.poly(I.cara(ey, x + w - 7.2 * s, e0, x + w - 4.2 * s, e1), '#fff') + '</g>';
  const tp = I.p(mx, my, zt + 9 * s), pv = I.p(mx, my, zc);
  const ant = `<g class="antena">${I.seg([mx, my, zt], [mx, my, zt + 8 * s], CCK, 1.6)}<circle class="punta" cx="${r1(tp[0])}" cy="${r1(tp[1])}" r="${r1(2.6 * Math.max(.8, s))}" fill="${CC}" data-tx="${r1(tp[0])}" data-ty="${r1(tp[1])}"/></g>`;
  return `<g data-vivo="agente" data-paso="${paso}">${t}<g class="cabeza" data-px="${r1(pv[0])}" data-py="${r1(pv[1])}">${cab}${ojos}${ant}</g></g>`;
}

/* burbuja de «pensando…»: tarjeta blanca, filete terracota, rótulo terracota oscuro y texto mono.
   El reproductor la escribe letra a letra; en estático se ve el texto completo. */
function burbuja(k, texto, a, H, dirO) {
  const lines = partir(texto, 150, 10, 400, true), n = lines.length;
  const w = Math.min(188, Math.max(88, Math.max(...lines.map(l => medir(l, 10, 400, true))) + 28)), h = 38 + (n - 1) * 13.4;
  const dir = dirO || a.dir || 'ur', V = H || 500;
  const ox = dir.includes('l') ? -(14 + w) : 14, oy = dir.includes('u') ? -(h + 16) : 18;
  let bx, by;
  if (dir === 'r') { bx = a.x + 26; by = a.y - h / 2; }
  else if (dir === 'l') { bx = a.x - 26 - w; by = a.y - h / 2; }
  else if (dir === 'u') { bx = a.x - w / 2; by = a.y - h - 22; }
  else if (dir === 'd') { bx = a.x - w / 2; by = a.y + 24; }
  else { bx = a.x + ox; by = a.y + oy; }
  if (a.box && !dirO) { bx = a.box[0]; by = a.box[1]; }
  bx = Math.max(4, Math.min(1000 - w - 4, bx)); by = Math.max(4, Math.min(V - h - 4, by));
  const nx = Math.max(bx, Math.min(bx + w, a.x)), ny = Math.max(by, Math.min(by + h, a.y)), dx = nx - a.x, dy = ny - a.y, L = Math.hypot(dx, dy);
  let dots = '';
  if (L > 16) [[.2, 2.2], [.5, 3.2]].forEach(([f, r]) => { dots += `<circle cx="${r1(a.x + dx * f)}" cy="${r1(a.y + dy * f)}" r="${r}" fill="#fff" stroke="${CC}" stroke-width="1"/>`; });
  let t = dots + caja(bx, by, w, h, { fill: '#fff' }) + `<rect x="${r1(bx)}" y="${r1(by)}" width="3" height="${r1(h)}" rx="1.5" fill="${CC}"/>`;
  t += `<text class="pl" x="${r1(bx + 12)}" y="${r1(by + 15)}" font-size="9" font-weight="600" letter-spacing=".8" fill="${CCD}">pensando…</text>`;
  lines.forEach((l, i) => { t += `<text class="pt" x="${r1(bx + 12)}" y="${r1(by + 31 + i * 13.4)}" font-size="10" fill="${INK}" font-family='${MONO}'>${ESC(l)}</text>`; });
  return `<g data-vivo="piensa" data-paso="${k}" data-texto="${ESC(texto).replace(/"/g, '&quot;')}">${t}</g>`;
}

/* pasos animables: g.at(k, cx, cy) elige el paso; g.push() añade a ese paso; g.join() emite <g data-paso> en orden */
function pasos() {
  const m = new Map(); let cur = 0; const anc = {};
  const marca = (k, t) => t.replace(/<path (?=[^>]*marker-end=)/g, `<path data-flujo="${k}" `);
  const get = k => { if (!m.has(k)) m.set(k, { cx: null, cy: null, s: [] }); return m.get(k); };
  const o = {
    at(k, cx, cy) { cur = k; const e = get(k); if (cx != null) { e.cx = cx; e.cy = cy; } return o; },
    push(...a) { get(cur).s.push(...a.map(t => marca(cur, t))); },
    /* ancla de la burbuja del paso k: punto al que apunta y lado preferido */
    ancla(k, x, y, dir, box) { anc[k] = { x, y, dir: dir || 'ur', box }; return o; },
    burbujas(lista, H) {
      (Array.isArray(lista) ? lista : []).slice(0, 3).forEach(b => {
        if (!b || !Number.isInteger(b.paso) || !b.texto || !m.has(b.paso)) return;
        const e = m.get(b.paso), a = anc[b.paso] || { x: e.cx == null ? 500 : e.cx, y: e.cy == null ? 250 : e.cy, dir: 'ur' };
        cur = b.paso; get(cur).s.push(burbuja(b.paso, String(b.texto), a, H, b.dir));
      });
    },
    join() {
      return [...m.keys()].sort((a, b) => a - b).map(k => { const e = m.get(k);
        return `<g data-paso="${k}" data-cx="${r1(e.cx == null ? 500 : e.cx)}" data-cy="${r1(e.cy == null ? 250 : e.cy)}">${e.s.join('')}</g>`; }).join('');
    }
  };
  return o;
}

const DEFS = '<defs>' + [['mga', INK], ['mgb', AZ], ['mgg', G3]].map(([i, c]) =>
  `<marker id="${i}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0 0L8 4L0 8z" fill="${c}"/></marker>`).join('') +
  '<filter id="mgsh" x="-10%" y="-14%" width="120%" height="150%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.3" flood-color="#1B1B20" flood-opacity=".10"/></filter></defs>';
function svg(inner, h = 520, label = '') {
  return `<svg viewBox="0 0 1000 ${h}" role="img" aria-label="${ESC(label)}" font-family="${SANS.replace(/"/g, "'")}">${DEFS}<g class="raiz">${inner}</g></svg>`;
}

/* ============================================================
   1) VENTANA — herramienta dentro de un editor / terminal
   ============================================================ */
function ventana(d) {
  const g = pasos();
  const V = (t, tag) => t.replace('<text ', `<text data-vivo="${tag}" `);

  g.at(0, 510, 214);
  const WX = 250, WY = 22, WW = 520, WH = 384, TB = 38, TW = 170, TERH = 160;
  g.push(caja(WX, WY, WW, WH, { fill: '#fff' }));
  g.push(`<path d="${rrect(WX, WY, WW, TB, 4, 4, 0, 0)}" fill="${INK}"/>`);
  let tx = WX + 18;
  d.tabs.forEach((t, i) => {
    const on = i === (d.activa || 0), w = medir(t, 12, on ? 600 : 400);
    g.push(T(tx, WY + 24, t, { size: 12, fill: on ? '#fff' : '#A9A9B3', peso: on ? 600 : 400 }));
    if (on) g.push(`<rect x="${r1(tx)}" y="${WY + TB - 4}" width="${r1(w)}" height="2" fill="${AZ}"/>`);
    tx += w + 28;
  });
  // árbol
  g.push(`<path d="${rrect(WX, WY + TB, TW, WH - TB, 0, 0, 0, 4)}" fill="${BG}"/>`);
  g.push(T(WX + 14, WY + TB + 22, d.raiz, { size: 10, fill: G2, peso: 500, ls: .4 }));
  let claveY = 0;
  d.arbol.forEach((it, i) => {
    const ry = WY + TB + 34 + i * 30, ix = WX + 14 + (it.nivel || 0) * 14, cy = ry + 15;
    if (it.sel) {
      g.push(`<rect x="${WX}" y="${ry}" width="${TW}" height="28" fill="${AZS}"/><rect x="${WX}" y="${ry}" width="3" height="28" fill="${AZ}"/>`);
    }
    if (it.clave) {
      g.push(`<rect x="${WX + 5}" y="${ry}" width="${TW - 12}" height="28" rx="2" fill="#fff" stroke="${AZ}" stroke-width="1"/>`);
      claveY = cy;
    }
    g.push(T(ix, cy + 4, it.n, { size: 11, fill: it.sel ? AZ : (it.tenue ? G3 : BODY), peso: it.sel ? 600 : 400 }));
  });
  // panel de contenido
  const X0 = WX + TW, PW = WW - TW;
  g.push(T(X0 + 16, WY + TB + 22, d.fichero, { size: 11, fill: INK, peso: 600 }));
  g.push(`<rect x="${X0 + 16}" y="${WY + TB + 29}" width="${r1(medir(d.fichero, 11, 600))}" height="2" fill="${AZ}"/>`);
  d.lineas.forEach((l, i) => {
    g.push(`<rect x="${X0 + 16}" y="${WY + TB + 56 + i * 20}" width="${r1(l.w * (PW - 36))}" height="6" rx="3" fill="${l.az ? '#A9CEF8' : '#DADADD'}"/>`);
  });
  // terminal
  g.at(2, 600, 330);
  const TY = WY + WH - TERH;
  g.push(`<path d="${rrect(X0, TY, PW, TERH, 0, 0, 4, 0)}" fill="${INK}"/>`);
  g.push(T(X0 + 16, TY + 24, 'TERMINAL', { size: 10, fill: '#9A9AA3', peso: 600, ls: 1.4 }));
  let yy = TY + 48;
  const inner = [];
  d.terminal.forEach(c => {
    inner.push(T(X0 + 16, yy, '›', { size: 12, fill: CC, peso: 700, mono: true }));
    inner.push(V(T(X0 + 30, yy, c.cmd, { size: 10.5, fill: '#fff', mono: true }), 'cmd'));
    yy += 14;
    if (c.out) { inner.push(V(T(X0 + 30, yy, c.out, { size: 10, fill: '#9A9AA3', mono: true }), 'out')); yy += 14; }
    yy += 6;
  });
  g.push(grupo(X0, TY, PW, TERH, inner.join('')));
  g.push(`<rect data-vivo="cursor" x="${X0 + 30}" y="${r1(yy - 8)}" width="6" height="11" fill="${CC}"/>`);
  g.push(botPlano(X0 + PW - 26, TY + 38, { paso: 2, s: .8, oscuro: true }));
  g.ancla(2, X0 + PW - 26, TY + 12, 'r', [792, 330]);
  // persona y flechas
  g.at(1, 150, 250);
  const base = WY + WH + 8;
  g.push(`<line x1="20" y1="${base}" x2="780" y2="${base}" stroke="${G3}" stroke-width="1"/>`);
  g.push(persona(130, base, 1));
  g.push(flecha([[182, 318], [WX - 3, 318]], { col: AZ }));
  g.push(T(214, 309, d.pide || 'pide', { size: 11, fill: AZ, peso: 600, anchor: 'middle' }));
  g.push(flecha([[WX - 3, 350], [182, 350]], { col: G3, dash: '4 3' }));
  g.push(T(214, 366, d.propone || 'propone', { size: 11, fill: G2, anchor: 'middle' }));
  // piezas a la derecha
  g.at(3, 880, 170);
  const LX = 800;
  g.push(`<line x1="${LX}" y1="44" x2="${LX}" y2="${WY + WH - 40}" stroke="${FIL}" stroke-width="1"/>`);
  let ly = 60;
  d.piezas.forEach(p => {
    const sl = partir(p.s, 168, 10);
    const inn = T(LX + 14, ly, p.t, { size: 12, fill: INK, peso: 600 }) + sl.map((l, i) => T(LX + 14, ly + 15 + i * 13.4, l, { size: 10, fill: G2 })).join('');
    g.push(grupo(LX + 8, ly - 12, 190, 20 + sl.length * 13.4, inn));
    ly += 30 + sl.length * 13.4 + 10;
  });
  // llamadas
  const L = d.llamadas;
  const c1 = llam(29, 40, 206, L[0].n, L[0].titulo, L[0].texto, [[200, 38 + 4 + 0], [200, claveY], [WX + 5, claveY]]);
  // la guía de la 1 parte bajo el texto: se recalcula con su altura
  const c1b = llam(29, 40, 206, L[0].n, L[0].titulo, L[0].texto, [[205, 40 + c1.h + 4], [205, claveY], [WX + 5, claveY]]);
  g.at(1); g.push(c1b.svg); g.ancla(1, 130, base - 82 - 28, 'ul');
  g.at(2); g.push(llam(432, 454, 250, L[1].n, L[1].titulo, L[1].texto, [[432, 445], [432, WY + WH]]).svg);
  // caja local
  g.at(4, 843, 466);
  const BX = 706, BY = 436, BW = 274, BH = 60;
  const bl = partir(d.local.s, BW - 70, 10);
  g.push(caja(BX, BY, BW, BH, { fill: BG }));
  g.push(icono('lock', BX + 16, BY + 20, INK));
  g.push(grupo(BX, BY, BW, BH, T(BX + 48, BY + 24, d.local.t, { size: 12, fill: INK, peso: 600 }) + bl.map((l, i) => T(BX + 48, BY + 40 + i * 13, l, { size: 10, fill: G2 })).join('')));
  g.push(pin(BX + 4, BY, L[2].n));
  g.ancla(0, WX + WW, 40, 'r').ancla(4, BX + BW - 24, BY, 'ur');
  g.burbujas(d.piensa, 520);
  return svg(g.join(''), 520, 'Ventana: ' + d.fichero);
}

/* ============================================================
   2) CALLES — proceso con reparto agente / persona
   ============================================================ */
function calles(d) {
  const g = pasos(), W = 284, GAP = 68, X0 = 4, Y1 = 98, Y2 = 262, HN = 86;
  const col = i => X0 + i * (W + GAP);
  const pos = [[col(0), Y1], [col(1), Y1], [col(2), Y1], [col(2), Y2], [col(1), Y2], [col(0), Y2]];
  const N = d.pasos.map((p, i) => nodo(pos[i][0], pos[i][1], W, p.t, p.s, { acento: !p.persona, oscuro: !!p.persona, num: i + 1, h: HN, agente: !!p.agente && !p.persona }));
  const a = (i, j, o) => {
    const A = N[i], B = N[j];
    if (A.y === B.y) g.push(flecha(B.x > A.x ? [[A.r, A.cy], [B.x - 1, B.cy]] : [[A.x, A.cy], [B.r + 1, B.cy]], o));
    else g.push(flecha([[A.cx, A.b], [B.cx, B.y - 1]], o));
  };
  N.forEach((n, i) => {
    g.at(i, n.cx, n.cy);
    if (i === 0) { g.push(vs(X0, 76, d.carriles[0])); g.push(vs(X0, 240, d.carriles[1])); }
    if (i) a(i - 1, i, { col: i === 5 ? INK : AZ });
    if (i === 3) { const ny = (N[2].b + N[3].y) / 2 + 4; g.push(T(N[2].cx + 10, ny, d.nota, { size: 10, fill: G2 })); }
    g.push(n.svg);
    { const top = n.y === Y1;
      if (d.pasos[i].agente && !d.pasos[i].persona) g.push(botPlano(n.pie[0], n.pie[1], { paso: i, s: .85 }));
      const col = [0, 1, 2, 2, 1, 0][i];
      g.ancla(i, col === 2 ? n.x + 40 : n.x + 60, top ? n.b : n.y, (top ? 'd' : 'u') + (col === 2 || (col === 1 && !top) ? 'l' : 'r')); }
    d.llamadas.filter(c => c.paso === i).forEach(c => {
      const px = n.x + 14;
      if (n.y === Y1) g.push(llam(px, 52, 270, c.n, c.titulo, c.texto, [[px, 61], [px, n.y]]).svg);
      else g.push(llam(px, n.b + 44, 300, c.n, c.titulo, c.texto, [[px, n.b + 35], [px, n.b]]).svg);
    });
  });
  g.burbujas(d.piensa, 420);
  return svg(g.join(''), 420, 'Calles: ' + d.carriles.join(' / '));
}

/* ============================================================
   3) HUB — una pieza central que conecta muchas
   ============================================================ */
function hub(d) {
  const g = pasos();
  // izquierda: lo que ya tienes
  g.at(0, 150, 150);
  g.push(T(4, 22, d.izq.rot, { size: 13, fill: INK, peso: 600 }));
  g.push(T(4, 38, d.izq.sub, { size: 10, fill: G2 }));
  g.push(`<line x1="4" y1="48" x2="290" y2="48" stroke="${G3}" stroke-width="1"/>`);
  let ly = 68;
  d.izq.items.forEach(it => {
    const sl = partir(it.s, 270, 10);
    g.push(grupo(4, ly - 14, 282, 20 + sl.length * 13.4, T(4, ly, it.t, { size: 12, fill: INK, peso: 600 }) + sl.map((l, i) => T(4, ly + 15 + i * 13.4, l, { size: 10, fill: G2 })).join('')));
    ly += 32 + sl.length * 13.4 + 6;
  });
  const yb = ly - 14;
  // derecha: lo que añade
  g.at(2, 850, 150);
  g.push(T(704, 22, d.der.rot, { size: 13, fill: AZ, peso: 600 }));
  g.push(T(704, 38, d.der.sub, { size: 10, fill: G2 }));
  g.push(`<line x1="704" y1="48" x2="996" y2="48" stroke="${AZ}" stroke-width="1"/>`);
  let ry = 60; const R = [];
  d.der.items.forEach(it => { const n = nodo(704, ry, 292, it.t, it.s, { acento: true, h: 52 }); R.push(n); ry = n.b + 8; });
  const midY = (60 + R[R.length - 1].b) / 2;
  // centro
  const C = nodo(392, midY - 36, 216, d.centro.t, d.centro.s, { oscuro: true, tsize: 15, h: 72, agente: !!d.centro.agente });
  g.at(0); g.push(lin([[294, 54], [294, yb - 10]], { col: G3, w: 1 }));
  g.at(1, C.cx, C.cy); g.push(flecha([[296, C.cy], [C.x - 1, C.cy]], { col: INK }));
  g.at(2); g.push(lin([[690, 54], [690, R[R.length - 1].b]], { col: AZ, w: 1 }));
  g.push(flecha([[C.r + 1, C.cy], [689, C.cy]], { col: AZ }));
  g.at(1); g.push(C.svg);
  if (d.centro.agente) g.push(botPlano(C.pie[0], C.pie[1], { paso: 1, s: .85, oscuro: true }));
  g.ancla(1, C.pie[0], C.y, 'u'); g.at(2); R.forEach(n => g.push(n.svg));
  // flujo
  const FY = 344, FW = 168, FG = 30, FX = (1000 - (5 * FW + 4 * FG)) / 2;
  const fst = i => (i < 2 ? 3 : i + 1);
  g.at(3, FX + FW + FG / 2, FY + 40);
  g.push(vs(FX, FY - 14, d.flujo.rot));
  const F = d.flujo.pasos.map((p, i) => nodo(FX + i * (FW + FG), FY, FW, p.t, p.s, { acento: (!p.persona && i === 2) || !!p.agente, oscuro: !!p.persona, h: 80, agente: !!p.agente && !p.persona }));
  F.forEach((n, i) => { g.at(fst(i), i < 2 ? null : n.cx, i < 2 ? null : n.cy + 40); if (i) g.push(flecha([[F[i - 1].r, n.cy], [n.x - 1, n.cy]], { col: i === F.length - 1 ? INK : AZ, ia: !!d.flujo.pasos[i].agente || !!d.flujo.pasos[i - 1].agente })); g.push(n.svg);
    if (d.flujo.pasos[i].agente && !d.flujo.pasos[i].persona) g.push(botPlano(n.pie[0], n.pie[1], { paso: fst(i), s: .85 }));
    if (d.flujo.pasos[i].agente || i >= 2) g.ancla(fst(i), d.flujo.pasos[i].agente ? n.pie[0] : n.cx, FY, n.cx > 600 ? 'ul' : 'ur'); });
  // llamadas debajo del flujo
  d.llamadas.forEach(c => {
    const n = F[c.paso], px = n.x + 12;
    g.at(fst(c.paso));
    g.push(llam(px, FY + 80 + 36, FW + 18, c.n, c.titulo, c.texto, [[px, FY + 80 + 27], [px, FY + 80]]).svg);
  });
  g.burbujas(d.piensa, 500);
  return svg(g.join(''), 500, 'Hub: ' + d.centro.t);
}

/* ============================================================
   4) CAPAS — pila isométrica con consulta que la atraviesa
   ============================================================ */
function capas(d) {
  const g = pasos(), OX = 430, OY = 330, C = .74, S = .23, W = 170, D = 170, H = 14, GAP = 76;
  const P = (x, y, z) => [OX + (x - y) * C, OY + (x + y) * S - z];
  const pts = a => a.map(q => P(...q).map(r1).join(' ')).join('L');
  const poly = (a, fill, st = 'none', sw = .9, extra = '') => `<path d="M${pts(a)}Z" fill="${fill}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round"${extra}/>`;
  const seg = (a, b, z, col, w = 1, dash = '') => `<path d="M${pts([[a[0], a[1], z], [b[0], b[1], z]])}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} fill="none" stroke-linecap="round"/>`;
  const sq = (u, v, z, s, fill, st) => poly([[u - s, v - s, z], [u + s, v - s, z], [u + s, v + s, z], [u - s, v + s, z]], fill, st, 1);
  const n = d.capas.length;                    // de arriba abajo en d.capas
  const orden = d.capas.map((c, i) => ({ c, k: n - 1 - i }));   // k = 0 base
  const anclas = {};
  orden.slice().sort((a, b) => a.k - b.k).forEach(({ c, k }) => {
    const z = k * GAP, top = z + H, on = !!c.activa;
    { const cc = P(W / 2, D / 2, top); g.at(k, cc[0] + 60, cc[1]); }
    const fT = on ? AZS : '#fff', fL = on ? '#CFE2FA' : '#ECECF0', fR = on ? '#B6D3F5' : '#DADAE0', st = on ? AZ : '#A9A9B3';
    g.push(poly([[0, D, z], [W, D, z], [W, D, top], [0, D, top]], fL, st, 1));
    g.push(poly([[W, 0, z], [W, D, z], [W, D, top], [W, 0, top]], fR, st, 1));
    g.push(poly([[0, 0, top], [W, 0, top], [W, D, top], [0, D, top]], fT, st, 1));
    // dibujo propio de cada losa
    if (c.motivo === 'doc') {
      for (let i = 0; i < 9; i++) { const v = 22 + i * 15; g.push(seg([22, v], [W - 22 - (i % 3) * 22, v], top, '#C9C9D0', 1.2)); }
      g.push(poly([[22, 70, top], [W - 22, 70, top], [W - 22, 100, top], [22, 100, top]], '#BBD9FB', AZ, 1));
    } else if (c.motivo === 'arbol') {
      const rt = [W / 2, 22], hi = [[34, 80], [W / 2, 80], [W - 34, 80]], lo = [[20, 138], [50, 138], [W / 2 - 4, 138], [W / 2 + 28, 138], [W - 50, 138], [W - 20, 138]];
      const ed = [[rt, hi[0]], [rt, hi[1]], [rt, hi[2]], [hi[0], lo[0]], [hi[0], lo[1]], [hi[1], lo[2]], [hi[1], lo[3]], [hi[2], lo[4]], [hi[2], lo[5]]];
      const hot = new Set(['0', '1']);
      ed.forEach(([a, b], i) => g.push(seg(a, b, top, i === 1 || i === 6 ? AZ : '#909098', i === 1 || i === 6 ? 1.4 : 1)));
      g.push(sq(rt[0], rt[1], top, 6, '#fff', INK));
      hi.forEach((p, i) => g.push(sq(p[0], p[1], top, 6, i === 1 ? AZ : '#fff', i === 1 ? AZ : INK)));
      lo.forEach((p, i) => g.push(sq(p[0], p[1], top, 5, i === 3 ? AZ : '#fff', i === 3 ? AZ : '#909098')));
    } else if (c.motivo === 'lector') {
      const a = [[W / 2, 22], [W / 2 - 55, 84], [W / 2 + 2, 140]];
      g.push(seg(a[0], a[1], top, AZ, 1.4, '4 3')); g.push(seg(a[1], a[2], top, AZ, 1.4, '4 3'));
      a.forEach(p => g.push(`<ellipse cx="${r1(P(p[0], p[1], top)[0])}" cy="${r1(P(p[0], p[1], top)[1])}" rx="7.5" ry="3.1" fill="#fff" stroke="${AZ}" stroke-width="1.4"/>`));
    } else if (c.motivo === 'respuesta') {
      for (let i = 0; i < 3; i++) g.push(seg([24, 34 + i * 22], [W - 24 - i * 30, 34 + i * 22], top, '#C9C9D0', 1.2));
      g.push(poly([[24, 108, top], [56, 108, top], [56, 128, top], [24, 128, top]], '#BBD9FB', AZ, 1));
      g.push(poly([[66, 108, top], [98, 108, top], [98, 128, top], [66, 128, top]], '#BBD9FB', AZ, 1));
    }
    const gp = P(W, 0, z + H / 2), gl = P(0, D, z + H / 2);
    anclas[k] = { r: gp, l: gl, c: P(W / 2, D / 2, top) };
    g.ancla(k, gl[0], gl[1], 'l', [24, k >= 2 ? 36 : 392]);
  });
  // consulta que atraviesa las capas
  g.at(n, OX, 190);
  const ctop = P(W / 2, D / 2, (n - 1) * GAP + H), cbase = P(W / 2, D / 2, H);
  g.push(lin([[OX, 70], [OX, cbase[1] - 5]], { col: '#fff', w: 4.5 }));
  g.push(flecha([[OX, 70], [OX, cbase[1] - 5]], { col: AZ, w: 1.5, obj: 'punto' }));
  g.ancla(n, OX, 112, 'r');
  for (let k = 0; k < n; k++) g.push(`<circle cx="${r1(anclas[k].c[0])}" cy="${r1(anclas[k].c[1])}" r="3.2" fill="${AZ}" stroke="#fff" stroke-width="1.2"/>`);
  const q = nodo(OX - 112, 12, 224, d.consulta.t, d.consulta.s, { oscuro: true });
  g.push(q.svg);
  g.push(T(OX, OY + 100, d.consulta.fin, { size: 10, fill: AZ, peso: 600, anchor: 'middle' }));
  // rótulos a la derecha (el nº 1 es la base: sigue el orden del proceso)
  const LX = 640;
  d.capas.forEach((c, i) => {
    const k = n - 1 - i, a = anclas[k].r, ly = a[1];
    g.at(k);
    const sl = partir(c.s, 330, 10);
    g.push(lin([[a[0], a[1]], [LX - 14, ly]], { col: AZ, w: 1 }));
    g.push(punto(a[0], a[1]));
    const inner = pin(LX, ly, k + 1) + T(LX + 17, ly + 4, c.t, { size: 12, fill: INK, peso: 700 }) + sl.map((l, j) => T(LX + 17, ly + 19 + j * 13.4, l, { size: 10, fill: G2 })).join('');
    g.push(grupo(LX - 9, ly - 12, 360, 36 + sl.length * 13.4, inner));
  });
  // árbol del documento (lo que ve el lector)
  const TX = 20, TY = 150;
  g.at(n - 1 - d.capas.findIndex(c => c.activa));
  g.push(vs(TX, TY, d.arbol.rot));
  g.push(`<line x1="${TX}" y1="${TY + 8}" x2="${TX + 220}" y2="${TY + 8}" stroke="${G3}" stroke-width="1"/>`);
  d.arbol.items.forEach((it, i) => {
    const y = TY + 32 + i * 24, x = TX + 8 + (it.nivel || 0) * 16;
    if (it.hit) g.push(`<rect x="${TX}" y="${y - 14}" width="220" height="22" fill="${AZS}"/><rect x="${TX}" y="${y - 14}" width="3" height="22" fill="${AZ}"/>`);
    g.push(T(x, y, it.n, { size: 11, fill: it.hit ? AZ : G2, peso: it.hit ? 600 : 400 }));
  });
  g.push(T(TX, TY + 40 + d.arbol.items.length * 24, d.arbol.pie, { size: 10, fill: G2 }));
  const ak = d.capas.findIndex(c => c.activa), kk = n - 1 - ak, al = anclas[kk].l;
  g.push(lin([[TX + 222, TY + 32 + 1 * 24 - 4], [262, TY + 32 + 1 * 24 - 4], [262, al[1]], [al[0], al[1]]], { col: AZ, w: 1 }));
  g.push(punto(al[0], al[1]));
  g.burbujas(d.piensa, 470);
  return svg(g.join(''), 470, 'Capas: ' + d.capas.map(c => c.t).join(', '));
}

/* ============================================================
   5) TABLA — glosario de piezas
   ============================================================ */
function tabla(d) {
  const g = pasos(), TW = 790, C2 = 548;
  g.at(0, 420, 120);
  g.push(T(104, 30, d.cab[0], { size: 10, fill: G2, peso: 600, ls: .5 }));
  g.push(T(C2 + 14, 30, d.cab[1], { size: 10, fill: G2, peso: 600, ls: .5 }));
  g.push(`<line x1="0" y1="40" x2="${TW}" y2="40" stroke="${INK}" stroke-width="2"/>`);
  let y = 40; const centro = [];
  d.filas.forEach((f, i) => {
    const el = partir(f.s, C2 - 104 - 22, 10), dl = partir(f.donde, TW - C2 - 14 - 6, 10);
    const h = Math.max(70, 18 + 18 + el.length * 13.6 + 14, 16 + dl.length * 13.6 + 20);
    g.at(i, 460, y + h / 2);
    g.push(`<rect data-vivo="barrido" x="0" y="${y + 1}" width="${TW}" height="${h - 2}" fill="${AZS}" opacity="0" data-w="${TW}"/>`);
    g.ancla(i, TW, y + h / 2, 'r');
    const inn = T(0, y + 33, f.n, { size: 22, fill: INK }) + `<g data-vivo="icono">` + icono(f.icono, 62, y + 15, esIA(f.t, f.icono === 'agent' ? 'agente' : '') ? CC : AZ) + `</g>` +
      T(104, y + 28, f.t, { size: 13, fill: INK, peso: 600 }) + el.map((l, j) => T(104, y + 45 + j * 13.6, l, { size: 10, fill: G2 })).join('') +
      `<line x1="${C2}" y1="${y + 10}" x2="${C2}" y2="${y + h - 10}" stroke="${FIL}" stroke-width="1"/>` +
      dl.map((l, j) => T(C2 + 14, y + 28 + j * 13.6, l, { size: 10, fill: BODY })).join('');
    g.push(grupo(0, y, TW, h, inn));
    g.push(`<line x1="0" y1="${y + h}" x2="${TW}" y2="${y + h}" stroke="${FIL}" stroke-width="1"/>`);
    centro.push(y + 28);
    y += h;
  });
  d.llamadas.forEach(c => {
    const cy = centro[c.fila];
    g.at(c.fila);
    g.push(llam(842, cy, 140, c.n, c.titulo, c.texto, [[833, cy], [TW - 12, cy]]).svg);
  });
  g.burbujas(d.piensa, Math.max(300, Math.ceil(y + 24)));
  return svg(g.join(''), Math.max(300, Math.ceil(y + 24)), 'Tabla: ' + d.cab.join(' / '));
}

/* ============================================================
   6) GRUPOS — colecciones de cosas parecidas
   ============================================================ */
function grupos(d) {
  const g = pasos(), CW = 296, GP = 56, cx = i => i * (CW + GP), TOP = 44; let FB = 470;
  const colY = [];
  d.cols.forEach((c, i) => {
    const x = cx(i), col = c.principal ? AZ : INK;
    g.at(i, x + CW / 2, 110);
    g.push(T(x, 20, c.t, { size: 13, fill: INK, peso: 600 }));
    g.push(T(x, 36, c.s, { size: 10, fill: G2 }));
    g.push(`<line x1="${x}" y1="${TOP}" x2="${x + CW}" y2="${TOP}" stroke="${col}" stroke-width="2"/>`);
    let y = TOP + 30; const ys = [];
    const items = c.items;
    items.forEach((it, j) => {
      const sl = it.s ? partir(it.s, CW - 28 - (it.tag ? 0 : 0), 10) : [];
      const tw = it.tag ? medir(it.tag, 10, 600, true) : 0;
      let inn = '';
      if (c.cadena) {
        inn += `<g data-vivo="bola" data-px="${x + 9}" data-py="${y - 4}"><circle cx="${x + 9}" cy="${y - 4}" r="9" fill="${esIA(it.t) ? CC : AZ}"/>` + T(x + 9, y - .4, j + 1, { size: 10, fill: '#fff', peso: 700, anchor: 'middle' }) + '</g>';
        if (j < items.length - 1) { /* flecha vertical se dibuja luego */ }
      } else {
        inn += `<g data-vivo="bola" data-px="${x + 4}" data-py="${y - 4}"><circle cx="${x + 4}" cy="${y - 4}" r="3" fill="${c.principal ? AZ : INK}"/></g>`;
      }
      inn += T(x + 26, y, it.t, { size: 12, fill: INK, peso: 600 });
      inn += sl.map((l, k) => T(x + 26, y + 15 + k * 13.4, l, { size: 10, fill: G2 })).join('');
      if (it.tag) inn += T(x + CW, y, it.tag, { size: 10, fill: WARN, peso: 600, anchor: 'end', mono: true });
      const hh = 22 + sl.length * 13.4;
      g.push(grupo(x - 2, y - 14, CW + 4, hh + 10, inn));
      ys.push({ y, h: hh });
      y += hh + 20;
    });
    if (c.cadena) {
      for (let j = 0; j < items.length - 1; j++) g.push(flecha([[x + 9, ys[j].y + 6], [x + 9, ys[j + 1].y - 16]], { col: AZ, w: 1.4 }));
    }
    colY.push({ x, ys });
  });
  FB = Math.max(...colY.map(c => c.ys[c.ys.length - 1].y + c.ys[c.ys.length - 1].h)) + 56;
  colY.forEach((A, i) => { const ult = A.ys[A.ys.length - 1]; g.ancla(i, A.x + CW - 24, ult.y + ult.h - 8, 'dl'); });
  d.llamadas.forEach(c => {
    g.at(c.col);
    const A = colY[c.col], it = A.ys[c.item], gx = c.lado === 'der' ? A.x + CW + GP / 2 : A.x - GP / 2;
    const ex = c.lado === 'der' ? A.x + CW + 8 : A.x - 6;
    const px = gx;
    g.push(llam(px, FB, c.w || 300, c.n, c.titulo, c.texto, [[px, FB - 9], [px, it.y - 4], [ex, it.y - 4]]).svg);
  });
  g.burbujas(d.piensa, FB + 56);
  return svg(g.join(''), FB + 56, 'Grupos: ' + d.cols.map(c => c.t).join(' / '));
}

/* ============================================================
   7) CICLO — bucle que se repite
   ============================================================ */
function ciclo(d) {
  const g = pasos(), CX = 500, CY = 252, RX = 346, RY = 172, N = d.nodos.length, NW = 192;
  const ang = i => (-90 + i * 360 / N) * Math.PI / 180;
  const box = d.nodos.map((p, i) => {
    const m = nodo(0, 0, NW, p.t, p.s, { oscuro: !!p.persona, h: 70 });
    const px = CX + RX * Math.cos(ang(i)), py = CY + RY * Math.sin(ang(i));
    return { x: px - NW / 2, y: py - m.h / 2, w: NW, h: m.h };
  });
  const ptAt = th => [CX + RX * Math.cos(th), CY + RY * Math.sin(th)];
  const dentro = (p, b, pad) => p[0] > b.x - pad && p[0] < b.x + b.w + pad && p[1] > b.y - pad && p[1] < b.y + b.h + pad;
  const arcos = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N; let t0 = ang(i), t1 = ang(i) + 2 * Math.PI / N;
    while (dentro(ptAt(t0), box[i], 7)) t0 += .004;
    while (dentro(ptAt(t1), box[j], 9)) t1 -= .004;
    const a = ptAt(t0), b = ptAt(t1), cierre = j === 0;
    let ar = `<path d="M${r1(a[0])} ${r1(a[1])}A${RX} ${RY} 0 0 1 ${r1(b[0])} ${r1(b[1])}" fill="none" stroke="${INK}" stroke-width="1.4"${cierre ? ' stroke-dasharray="4 3"' : ''} marker-end="url(#mga)"/>`;
    if (cierre && d.cierre) { const m = ptAt(ang(i) + Math.PI / N * 1.02); ar += T(m[0] - 22, m[1] - 18, d.cierre, { size: 10, fill: G2, anchor: 'end' }); }
    arcos.push(ar);
  }
  const nodes = d.nodos.map((p, i) => nodo(box[i].x, box[i].y, NW, p.t, p.s, { oscuro: !!p.persona, acento: !p.persona, num: i + 1, h: 70, agente: !!p.agente && !p.persona }));
  nodes.forEach((n, i) => { g.at(i, n.cx, n.cy); if (i) g.push(arcos[i - 1]); g.push(n.svg);
    if (d.nodos[i].agente && !d.nodos[i].persona) g.push(botPlano(n.pie[0], n.pie[1], { paso: i, s: .8 }));
    const sn = Math.sin(ang(i)), cs = Math.cos(ang(i)), arr = sn < -.5;
    g.ancla(i, cs > .3 ? n.x + n.w : n.pie[0], arr ? n.b : n.y, (arr ? 'd' : 'u') + (cs > .3 ? 'l' : cs < -.3 ? 'r' : '')); });
  g.at(N, CX, CY); g.push(arcos[N - 1]);
  // centro: resultado acumulado
  const c = d.centro, BW2 = 250, BH2 = 52 + 24 + c.checks.length * 19, BX = CX - BW2 / 2, BY = CY - BH2 / 2;
  let inn = caja(BX, BY, BW2, BH2, { fill: INK, st: INK });
  inn += vs(BX + 16, BY + 24, c.rot, '#9A9AA3');
  inn += T(BX + 16, BY + 52, c.nota, { size: 22, fill: '#fff', peso: 600 });
  inn += T(BX + 16 + medir(c.nota, 22, 600) + 8, BY + 52, c.sub, { size: 10, fill: '#C8C8D0' });
  c.checks.forEach((k, i) => {
    const yy = BY + 80 + i * 19;
    inn += '<g data-vivo="check">';
    inn += k.ok ? `<path d="M${BX + 17} ${yy - 4}l3 3 6-6.4" fill="none" stroke="#4DA3FF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` :
      `<path d="M${BX + 17.5} ${yy - 8}l7 7M${BX + 24.5} ${yy - 8}l-7 7" fill="none" stroke="#E0A25A" stroke-width="1.6" stroke-linecap="round"/>`;
    inn += T(BX + 36, yy, k.t, { size: 10.5, fill: k.ok ? '#fff' : '#E0A25A' }) + '</g>';
  });
  g.push(grupo(BX, BY, BW2, BH2, inn));
  // llamadas
  d.llamadas.forEach(l => {
    const b = box[l.nodo];
    g.at(l.nodo);
    if (l.pos === 'tl') { const h = llam(29, 36, 236, l.n, l.titulo, l.texto).h; g.push(llam(29, 36, 236, l.n, l.titulo, l.texto, [[b.x + 36, 36 + h - 14], [b.x + 36, b.y]]).svg); }
    if (l.pos === 'tr') { const h = llam(724, 36, 258, l.n, l.titulo, l.texto).h; g.push(llam(724, 36, 258, l.n, l.titulo, l.texto, [[b.x + b.w - 36, 36 + h - 14], [b.x + b.w - 36, b.y]]).svg); }
    if (l.pos === 'br') g.push(llam(b.x + 10, b.y + b.h + 44, 300, l.n, l.titulo, l.texto, [[b.x + 10, b.y + b.h + 35], [b.x + 10, b.y + b.h]]).svg);
  });
  g.burbujas(d.piensa, 520);
  return svg(g.join(''), 520, 'Ciclo: ' + d.nodos.map(n => n.t).join(' → '));
}

/* @@NUEVO */
/* ============================================================
   KIT ISOMÉTRICO (misma proyección que capas(): c=.74, s=.23)
   Volúmenes con sombras planas de un solo tono, aristas finas.
   x crece hacia la derecha-abajo, y hacia la izquierda-abajo, z hacia arriba.
   ============================================================ */
const TONOS = {
  b: { t: '#FFFFFF', l: '#ECECF0', r: '#DADAE0', s: '#A9A9B3' },   // blanco
  g: { t: '#F2F2F4', l: '#E4E4E9', r: '#D3D3DA', s: '#B4B4BC' },   // gris
  k: { t: '#3A3A42', l: '#26262C', r: '#1B1B20', s: '#1B1B20' },   // tinta
  a: { t: '#EAF3FF', l: '#CFE2FA', r: '#B6D3F5', s: '#007AFF' },   // azul suave
  z: { t: '#4DA3FF', l: '#007AFF', r: '#0062CC', s: '#0057B3' }    // azul pleno
};
function hull(Q) {
  const P = Q.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of P.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}
function iso(OX, OY, k = 1) {
  const C = .74 * k, S = .23 * k;
  const p = (x, y, z = 0) => [OX + (x - y) * C, OY + (x + y) * S - z * k];
  const pt = a => a.map(q => p(...q).map(r1).join(' ')).join('L');
  const poly = (a, fill, st = 'none', sw = 1, dash = '') => `<path d="M${pt(a)}Z" fill="${fill}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const caja = (x, y, z, w, d, h, t, o = {}) => {
    const c = TONOS[t], sw = o.sw || 1, da = o.dash || '';
    return poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c.l, c.s, sw, da)
      + poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c.r, c.s, sw, da)
      + poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c.t, c.s, sw, da);
  };
  const seg = (a, b, col, w = 1, dash = '') => `<path d="M${pt([a, b])}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const sombra = (x, y, w, d, h, z = 0) => {
    const sx = h * .55, sy = h * .12;
    const c = [[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x + sx, y + sy], [x + w + sx, y + sy], [x + w + sx, y + d + sy], [x + sx, y + d + sy]].map(q => p(q[0], q[1], z));
    return `<path d="M${hull(c).map(q => q.map(r1).join(' ')).join('L')}Z" fill="${INK}" fill-opacity=".07"/>`;
  };
  const cil = (x, y, z, r, h, t, o = {}) => {
    const c = TONOS[t], [X, Y] = p(x, y, z), rx = r * C * 1.4142, ry = r * S * 1.4142, hh = h * k, n = o.anillos || 0;
    let s = `<path d="M${r1(X - rx)} ${r1(Y - hh)}L${r1(X - rx)} ${r1(Y)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(X + rx)} ${r1(Y)}L${r1(X + rx)} ${r1(Y - hh)}Z" fill="${c.l}" stroke="${c.s}" stroke-width="1"/>`;
    for (let i = 1; i <= n; i++) {
      const yy = Y - hh * i / (n + 1), az = o.banda === i;
      s += `<path d="M${r1(X - rx)} ${r1(yy)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(X + rx)} ${r1(yy)}" fill="none" stroke="${az ? AZ : c.s}" stroke-width="${az ? 2.2 : .9}"/>`;
    }
    return s + `<ellipse cx="${r1(X)}" cy="${r1(Y - hh)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${c.t}" stroke="${c.s}" stroke-width="1"/>`;
  };
  const anillo = (x, y, z, r, st, sw = 1.2, fill = 'none') => { const [X, Y] = p(x, y, z); return `<ellipse cx="${r1(X)}" cy="${r1(Y)}" rx="${r1(r * C * 1.4142)}" ry="${r1(r * S * 1.4142)}" fill="${fill}" stroke="${st}" stroke-width="${sw}"/>`; };
  const fl = (pts, o) => flecha(pts.map(q => p(...q)), o);
  const cara = (y, x0, z0, x1, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];      // plano y = cte
  const caraX = (x, y0, z0, y1, z1) => [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];     // plano x = cte
  const plano = (z, x0, y0, x1, y1) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];     // plano z = cte
  return { p, pt, poly, caja, seg, sombra, cil, anillo, fl, cara, caraX, plano, k };
}
/* hoja de papel: lámina fina con renglones (az = marcada en azul) */
function hoja(I, x, y, z, w, d, o = {}) {
  let s = I.caja(x, y, z, w, d, 2.4, o.az ? 'a' : 'b'), n = o.n || 4;
  for (let i = 0; i < n; i++) {
    const yy = y + 7 + i * ((d - 13) / Math.max(1, n - 1));
    s += I.seg([x + 5, yy, z + 2.4], [x + w - 5 - (i % 2) * 9, yy, z + 2.4], i === 0 && o.az ? AZ : '#BEBEC7', 1);
  }
  return s;
}
/* bloque oscuro con banda azul (agente) y losa blanca con banda azul (herramienta) */
function agenteIso(I, x, y, z, w, d, h, t = 'k') {
  return I.caja(x, y, z, w, d, h, t) + I.poly(I.cara(y + d, x, z, x + 9, z + h), AZ) + I.poly(I.plano(z + h, x, y, x + 9, y + d), '#4DA3FF');
}
function peonIso(X, Y, e = 2.4, fill = INK) {
  return `<ellipse cx="${r1(X)}" cy="${r1(Y + 1)}" rx="${r1(9 * e)}" ry="${r1(2.8 * e)}" fill="${INK}" fill-opacity=".07"/>` +
    `<path d="M${r1(X - 7 * e)} ${r1(Y)}Q${r1(X - 7 * e)} ${r1(Y - 14 * e)} ${r1(X)} ${r1(Y - 14 * e)}Q${r1(X + 7 * e)} ${r1(Y - 14 * e)} ${r1(X + 7 * e)} ${r1(Y)}Z" fill="${fill}"/>` +
    `<circle cx="${r1(X)}" cy="${r1(Y - 19 * e)}" r="${r1(4.6 * e)}" fill="${fill}"/>`;
}
/* rótulo suelto (sin número): título 600 y subtítulo gris */
function etq(x, y, tit, sub, anchor = 'start', col = INK) {
  const w = Math.max(medir(tit, 12, 600), sub ? medir(sub, 10) : 0) + 4;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  let s = T(x, y, tit, { size: 12, fill: col, peso: 600, anchor });
  if (sub) s += T(x, y + 14, sub, { size: 10, fill: G2, anchor });
  return grupo(x0 - 2, y - 13, w + 4, sub ? 32 : 18, s);
}
/* llamada con la guía que sale del pin hacia abajo (pin a la izquierda del texto) */
/* llamada con la guía que baja desde el pin hasta la pieza (pin a la izquierda del texto) */
function llamAbajo(x, y, w, n, tit, txt, anc) {
  return llam(x, y, w, n, tit, txt, [[x, y + 10], [x, anc[1]], [anc[0], anc[1]]]);
}
/* guía que sube desde el pin hasta la pieza */
function llamArriba(x, y, w, n, tit, txt, anc) {
  return llam(x, y, w, n, tit, txt, [[x, y - 10], [x, anc[1]], [anc[0], anc[1]]]);
}
/* guía horizontal que sale por la izquierda del pin (texto a la derecha) */
function llamLado(x, y, w, n, tit, txt, anc, via) {
  return llam(x, y, w, n, tit, txt, [[x - 10, y]].concat(via || [], [anc]));
}
/* pin a la izquierda, guía horizontal hasta la pieza y el texto bajo (o sobre) la guía */
function llamH(x, y, w, n, tit, txt, anc, sobre) {
  const a = partir(tit, w - 18, 12, 700), b = partir(txt, w - 18, 10, 400), av = n === '!';
  const h = a.length * 15 + b.length * 13.6;
  const t0 = sobre ? y - 14 - h + 12 : y + 22;
  let s = lin([[x + 10, y], [anc[0], y]], { col: AZ, w: 1 }) + punto(anc[0], y) + pin(x, y, n, av ? WARN : INK);
  a.forEach((l, i) => { s += T(x - 9, t0 + i * 15, l, { size: 12, fill: av ? WARN : INK, peso: 700 }); });
  b.forEach((l, i) => { s += T(x - 9, t0 + a.length * 15 + i * 13.6, l, { size: 10, fill: G2 }); });
  const y0 = sobre ? t0 - 12 : y - 9, hh = sobre ? y + 9 - y0 : t0 + h - y0 - 6 + 9;
  return { svg: grupo(x - 10, y0 - 2, w + 12, hh + 4, s), h };
}

/* ============================================================
   8) ESCRITORIO — el puesto de trabajo con la herramienta en pantalla
   ============================================================ */
function escritorio(d) {
  const g = pasos(), I = iso(440, 120, 1.3), { p, caja, seg, sombra, poly, cara } = I;
  const ZF = 8, ZD = 70, ZT = 78;
  g.at(0, 500, 300);
  g.push(caja(0, 0, 0, 480, 330, ZF, 'g'));
  g.push(sombra(120, 70, 240, 150, ZT, ZF));
  [[126, 76], [126, 212], [352, 76], [352, 212]].sort((a, b) => a[0] + a[1] - b[0] - b[1]).forEach(([x, y]) => g.push(caja(x, y, ZF, 8, 8, ZD - ZF, 'b')));
  g.push(caja(120, 70, ZD, 240, 150, 8, 'b'));
  const pe = p(420, 214, ZF);
  g.push(peonIso(pe[0], pe[1], 2.6));
  g.push(etq(pe[0] - 46, pe[1] - 4, d.tu.t, d.tu.s, 'end'));
  // 1) documentos apilados
  const a1 = p(150, 112, ZT + 14);
  g.at(1, a1[0], a1[1]);
  g.push(sombra(128, 92, 46, 56, 10, ZT));
  for (let i = 0; i < 4; i++) g.push(hoja(I, 130 + (i % 2) * 3, 92 + (i % 2) * 2, ZT + i * 3, 46, 56, { az: i === 3, n: 5 }));
  const L1 = d.llamadas[0], L2 = d.llamadas[1], L3 = d.llamadas[2], L4 = d.llamadas[3];
  g.push(llamH(24, a1[1] - 10, 250, L1.n, L1.titulo, L1.texto, [a1[0], a1[1]], true).svg);
  // 2) carpeta de plugins
  const a2 = p(138, 204, ZT + 8);
  g.at(2, a2[0], a2[1]);
  g.push(sombra(128, 172, 48, 40, 8, ZT));
  g.push(caja(128, 166, ZT, 20, 8, 8, 'a'));
  g.push(caja(128, 172, ZT, 48, 40, 8, 'a'));
  g.push(caja(142, 186, ZT + 8, 14, 14, 5, 'z'));
  g.push(I.fl([[182, 118, ZT + 4], [203, 138, ZT + 4]], { col: AZ }));
  g.push(I.fl([[178, 190, ZT + 4], [203, 168, ZT + 4]], { col: AZ }));
  g.push(llamH(24, a2[1] + 10, 250, L2.n, L2.titulo, L2.texto, [a2[0], a2[1]], false).svg);
  // 3) portátil con la herramienta y el agente
  const a3 = p(334, 128, ZT + 52);
  g.at(3, p(280, 150, ZT + 40)[0], p(280, 150, ZT + 40)[1]);
  const LX = 205, LY = 135, LW = 72;
  g.push(sombra(LX, LY, LW, 50, 4, ZT));
  g.push(caja(LX, LY, ZT, LW, 50, 4, 'b'));
  for (let i = 0; i < 3; i++) g.push(seg([LX + 7, LY + 18 + i * 8, ZT + 4], [LX + LW - 7, LY + 18 + i * 8, ZT + 4], '#C2C2CA', 1));
  g.push(caja(LX, LY, ZT + 4, LW, 4, 52, 'b'));
  g.push(poly(cara(LY + 4, LX + 4, ZT + 8, LX + LW - 4, ZT + 52), INK));
  g.push(poly(cara(LY + 4, LX + 8, ZT + 44, LX + 20, ZT + 47), '#4DA3FF'));
  g.push(poly(cara(LY + 4, LX + 23, ZT + 44, LX + 52, ZT + 47), '#fff'));
  [[.62, 36], [.78, 30], [.5, 24], [.7, 18], [.4, 12]].forEach(([w, z], i) => g.push(poly(cara(LY + 4, LX + 8, ZT + z, LX + 8 + w * (LW - 16), ZT + z + 2.6), i === 1 ? '#4DA3FF' : '#6B6B75')));
  g.push(sombra(306, 126, 40, 40, 50, ZT));
  g.push(agenteIso(I, 306, 126, ZT, 40, 40, 50));
  g.push(botIso(I, 318, 138, ZT + 50, .9, 3));
  { const hb = p(326, 146, ZT + 50 + 30); g.ancla(3, hb[0], hb[1], 'ur'); }
  g.push(I.fl([[280, 150, ZT + 26], [303, 146, ZT + 26]], { col: AZ }));
  g.push(llamLado(790, a3[1], 200, L3.n, L3.titulo, L3.texto, a3).svg);
  // 4) bandeja de salida
  const a4 = p(446, 150, ZF + 36);
  g.at(4, p(414, 130, ZF + 40)[0], p(414, 130, ZF + 40)[1]);
  g.push(sombra(392, 104, 46, 56, 30, ZF));
  g.push(caja(392, 104, ZF, 46, 56, 30, 'b'));
  g.push(caja(384, 96, ZF + 30, 62, 72, 4, 'g'));
  g.push(hoja(I, 392, 108, ZF + 34, 46, 56, { n: 4 }));
  g.push(hoja(I, 394, 106, ZF + 37, 46, 56, { az: true, n: 5 }));
  g.push(I.fl([[350, 146, ZT + 22], [415, 146, ZT + 22], [415, 140, ZF + 50]], { col: INK }));
  g.push(llamLado(790, a4[1] + 112, 200, L4.n, L4.titulo, L4.texto, a4, [[a4[0] + 30, a4[1] + 112], [a4[0] + 30, a4[1] + 4]]).svg);
  g.burbujas(d.piensa, 440);
  return svg(g.join(''), 440, 'Escritorio: ' + d.agente);
}

/* ============================================================
   9) FÁBRICA — cinta con máquinas: entran piezas, salen productos
   ============================================================ */
function fabrica(d) {
  const g = pasos(), I = iso(236, 150, 1.12), { p, caja, seg, sombra, poly, cil, caraX, plano } = I;
  const ZF = 6, ZB = 46, BY0 = 44, BD = 72, Y0 = BY0 - 16, Y1 = BY0 + BD + 8, ZT = ZB + 70;
  g.at(0, 480, 280);
  g.push(caja(-20, 0, 0, 760, 250, ZF, 'g'));
  const arcoTras = (x, w) => caja(x, Y0, ZF, w, 10, ZT - ZF, 'k');
  const arcoDel = (x, w) => caja(x, Y1 - 10, ZF, w, 10, ZT - ZF, 'k');
  const arcoDin = (x, w) => caja(x, Y0, ZT, w, Y1 - Y0, 22, 'k') + poly(caraX(x + w, Y0 + 3, ZT + 8, Y1 - 3, ZT + 14), AZ) + poly(plano(ZT + 22, x, Y0, x + 9, Y1), '#4DA3FF');
  const X1 = 258, X2 = 500, AW = 34;
  g.push(arcoTras(X1, AW)); g.push(arcoTras(X2, AW));
  for (let x = 20; x <= 700; x += 140) { g.push(caja(x, BY0 + 6, ZF, 8, 8, ZB - 8 - ZF, 'b')); g.push(caja(x, BY0 + BD - 14, ZF, 8, 8, ZB - 8 - ZF, 'b')); }
  g.push(caja(0, BY0, ZB - 8, 700, BD, 8, 'g'));
  for (let x = 12; x < 700; x += 24) g.push(seg([x, BY0 + 4, ZB], [x, BY0 + BD - 4, ZB], '#CFCFD6', 1));
  g.push(caja(0, BY0 - 3, ZB, 700, 3, 5, 'b'));
  const e2 = p(772, 96, ZB);
  g.push(vs(e2[0], e2[1], d.sale));
  g.at(1); { const a = p(10, BY0 + 36, ZB + 3), b = p(X1 + 40, BY0 + 36, ZB + 3); g.push(`<path data-flujo="1" data-obj="hoja" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}" fill="none" stroke="none"/>`); }
  const L1 = d.llamadas[0], L2 = d.llamadas[1], L3 = d.llamadas[2], L4 = d.llamadas[3];
  // 1) piezas que entran
  g.at(1, p(100, BY0 + 36, ZB + 10)[0], p(100, BY0 + 36, ZB + 10)[1]);
  [[30, 0], [96, 0], [162, 1]].forEach(([x, az]) => { g.push(sombra(x, BY0 + 14, 32, 44, 3, ZB)); g.push(hoja(I, x, BY0 + 14, ZB, 32, 44, { az, n: 4 })); });
  const ti = p(40, BY0 + BD + 20, ZB);
  g.push(vs(ti[0] - 76, ti[1] + 34, d.entra));
  g.push(etq(ti[0] - 76, ti[1] + 56, d.entrada.t, d.entrada.s));
  // 2) la herramienta: solo reprocesa lo que cambia
  const a1 = p(X1 + 12, Y0, ZT + 20);
  g.at(2, p(X1 + 17, BY0 + 36, ZT + 10)[0], p(X1 + 17, BY0 + 36, ZT + 10)[1]);
  g.push(sombra(X1, Y0, AW, Y1 - Y0, ZT - ZF + 22, ZF));
  g.push(arcoDel(X1, AW)); g.push(arcoDin(X1, AW));
  g.push(sombra(330, BY0 + 18, 30, 36, 6, ZB));
  g.push(caja(330, BY0 + 18, ZB, 30, 36, 6, 'z'));
  for (let i = 1; i < 3; i++) g.push(seg([334, BY0 + 18 + i * 12, ZB + 6], [356, BY0 + 18 + i * 12, ZB + 6], '#fff', 1));
  [380, 428].forEach(x => g.push(poly(plano(ZB + .5, x, BY0 + 14, x + 32, BY0 + 58), 'none', G3, 1, '3 3')));
  g.push(llamH(24, a1[1], 250, L1.n, L1.titulo, L1.texto, a1, true).svg);
  // 3) el índice (base de datos al lado de la cinta)
  const a2 = p(334, 184, ZF + 16);
  g.at(3, p(350, 178, ZF + 22)[0], p(350, 178, ZF + 22)[1]);
  g.push(sombra(326, 154, 48, 48, 46, ZF));
  g.push(cil(350, 178, ZF, 24, 46, 'b', { anillos: 2, banda: 1 }));
  g.push(I.fl([[345, BY0 + BD + 4, ZB + 14], [350, 150, ZF + 56]], { col: AZ }));
  g.push(llamArriba(a2[0], 452, 240, L2.n, L2.titulo, L2.texto, a2).svg);
  // 4) el agente consulta el índice y responde
  const a3 = p(X2 + 14, Y0, ZT + 20);
  g.at(4, p(X2 + 17, BY0 + 36, ZT + 10)[0], p(X2 + 17, BY0 + 36, ZT + 10)[1]);
  g.push(sombra(X2, Y0, AW, Y1 - Y0, ZT - ZF + 22, ZF));
  g.push(arcoDel(X2, AW)); g.push(arcoDin(X2, AW));
  g.push(I.fl([[376, 178, ZF + 26], [X2 + 17, 178, ZF + 26], [X2 + 17, Y1 + 2, ZF + 26]], { col: AZ }));
  g.push(botIso(I, X2 + 9, (Y0 + Y1) / 2 - 8, ZT + 22, .9, 4));
  { const hb = p(X2 + 17, (Y0 + Y1) / 2, ZT + 22 + 32); g.ancla(4, hb[0], hb[1], 'ur'); }
  { const a = p(X2 + 17, BY0 + 36, ZB + 3), b = p(690, BY0 + 36, ZB + 3); g.push(`<path data-flujo="4" data-obj="hoja" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}" fill="none" stroke="none"/>`); }
  [556, 598].forEach(x => { g.push(sombra(x, BY0 + 14, 30, 44, 3, ZB)); g.push(hoja(I, x, BY0 + 14, ZB, 30, 44, { az: 1, n: 3 })); });
  g.push(llamLado(800, a3[1], 190, L3.n, L3.titulo, L3.texto, a3).svg);
  // 5) bandeja y persona que valida
  const pe = p(716, 168, ZF);
  g.at(5, p(690, 100, ZB)[0], p(690, 100, ZB)[1] + 30);
  g.push(sombra(650, BY0 - 4, 78, BD + 8, 10, ZB - 4));
  g.push(caja(650, BY0 - 4, ZB - 4, 78, BD + 8, 6, 'a'));
  [[660, 0], [676, 1], [692, 1]].forEach(([x], i) => g.push(hoja(I, x, BY0 + 8 + i * 3, ZB + 2 + i * 3, 30, 44, { az: 1, n: 3 })));
  g.push(peonIso(pe[0], pe[1], 2.4));
  g.push(llamArriba(pe[0] + 10, 452, 250, L4.n, L4.titulo, L4.texto, [pe[0] + 10, pe[1] + 6]).svg);
  g.burbujas(d.piensa, 530);
  return svg(g.join(''), 530, 'Fábrica: ' + d.entrada.t);
}

/* ============================================================
   10) FRONTERA — tres zonas como plataformas y por dónde viajan los datos
   ============================================================ */
function frontera(d) {
  const g = pasos(), I = iso(470, 120, 1.1), { p, caja, seg, sombra, poly, cil, cara } = I;
  const Z = 12;
  const A = [0, 0, 220, 190], B = [300, 0, 220, 190], C = [0, 280, 220, 180];   // x, y, w, d
  g.at(0, 500, 250);
  g.push(caja(C[0], C[1], 0, C[2], C[3], Z, 'g', { dash: '5 3' }));
  g.push(caja(A[0], A[1], 0, A[2], A[3], Z, 'b'));
  g.push(caja(B[0], B[1], 0, B[2], B[3], Z, 'a'));
  const tA = p(0, 0, Z), tB = p(B[0], 0, Z), tC = p(C[0] + C[2], C[1] + C[3], 0);
  { const bA = p(A[2], A[3], 0); g.push(etq(bA[0], bA[1] + 36, d.zonas[0].t, d.zonas[0].s, 'middle')); }
  g.push(etq(990, p(520, 95, 0)[1] + 38, d.zonas[1].t, d.zonas[1].s, 'end'));
  g.push(etq(tC[0], tC[1] + 34, d.zonas[2].t, d.zonas[2].s, 'middle'));
  const L1 = d.llamadas[0], L2 = d.llamadas[1], L3 = d.llamadas[2], L4 = d.llamadas[3];
  // 1) en tu portátil: conversación, Mem0 y memorias
  g.at(1, p(110, 90, Z + 30)[0], p(110, 90, Z + 30)[1]);
  g.push(sombra(20, 34, 54, 42, 26, Z));
  g.push(caja(20, 34, Z, 54, 42, 26, 'g'));
  for (let i = 0; i < 3; i++) g.push(seg([26, 42 + i * 10, Z + 26], [68 - (i % 2) * 12, 42 + i * 10, Z + 26], i === 0 ? AZ : '#BEBEC7', 1.2));
  g.push(sombra(90, 70, 64, 64, 52, Z));
  g.push(agenteIso(I, 90, 70, Z, 64, 64, 52, 'b'));
  g.push(botIso(I, 96, 76, Z + 52, 1, 1));
  { const hb = p(104, 84, Z + 52 + 34); g.ancla(1, hb[0], hb[1], 'l'); }
  g.push(sombra(166, 30, 36, 36, 44, Z));
  g.push(cil(184, 48, Z, 18, 44, 'b', { anillos: 2, banda: 1 }));
  g.push(I.fl([[76, 54, Z + 12], [92, 80, Z + 12]], { col: AZ }));
  g.push(I.fl([[158, 86, Z + 26], [176, 62, Z + 26]], { col: AZ }));
  const a1 = p(122, 100, Z + 52), a2 = p(184, 58, Z + 38);
  g.push(llamAbajo(a1[0], 30, 240, L1.n, L1.titulo, L1.texto, a1).svg);
  g.push(llamAbajo(780, 30, 210, L2.n, L2.titulo, L2.texto, a2).svg);
  // 2) lo que cruza hacia el proveedor externo
  const a4 = p(70, 372, Z + 24);
  g.at(2, p(120, 280, Z + 20)[0], p(120, 280, Z + 20)[1]);
  g.push(sombra(70, 330, 80, 80, 46, Z));
  g.push(caja(70, 330, Z, 80, 80, 46, 'b'));
  g.push(poly(cara(410, 70, Z, 80, Z + 46), WARN));
  g.push(I.fl([[122, 138, Z + 10], [122, 324, Z + 10]], { col: INK, obj: 'paquete' }));
  const mid = p(122, 236, Z + 10);
  g.push(pin(mid[0], mid[1], '!', WARN));
  g.push(llamAbajo(24, 110, 240, L4.n, L4.titulo, L4.texto, a4).svg);
  // 3) la alternativa dentro del tenant
  const a3 = p(424, 120, Z + 26);
  g.at(3, p(392, 92, Z + 20)[0], p(392, 92, Z + 20)[1]);
  g.push(sombra(360, 60, 64, 64, 38, Z));
  g.push(caja(360, 60, Z, 64, 64, 38, 'a', { dash: '4 3' }));
  g.push(I.fl([[158, 100, Z + 20], [356, 100, Z + 20]], { col: G3, dash: '4 3' }));
  g.push(llamArriba(a3[0], 386, 220, L3.n, L3.titulo, L3.texto, a3).svg);
  g.burbujas(d.piensa, 470);
  return svg(g.join(''), 470, 'Frontera: ' + d.zonas.map(z => z.t).join(' / '));
}

/* ============================================================
   11) MAQUETA — arquitectura como bloques isométricos conectados
   ============================================================ */
function maqueta(d) {
  const g = pasos(), I = iso(320, 120, 1.25), { p, caja, seg, sombra, poly, cil, caraX, plano } = I;
  const ZP = 10;
  const L1 = d.rotulos[0], L2 = d.rotulos[1], L3 = d.rotulos[2], L4 = d.rotulos[3];
  g.at(0, 500, 250);
  // 1) losa con rejilla: la estructura que se carga
  const SX = 230, SY = -150, SW = 160, SD = 110;
  const a1 = p(SX + SW * .6, SY + SD, ZP);
  g.at(1, p(SX + SW / 2, SY + SD / 2, ZP)[0], p(SX + SW / 2, SY + SD / 2, ZP)[1]);
  g.push(sombra(SX, SY, SW, SD, 10, 0));
  g.push(caja(SX, SY, 0, SW, SD, ZP, 'b'));
  for (let i = 1; i < 5; i++) g.push(seg([SX + i * SW / 5, SY, ZP], [SX + i * SW / 5, SY + SD, ZP], '#C9C9D0', 1));
  for (let j = 1; j < 4; j++) g.push(seg([SX, SY + j * SD / 4, ZP], [SX + SW, SY + j * SD / 4, ZP], '#C9C9D0', 1));
  [[0, 1], [2, 1], [2, 2], [3, 0]].forEach(([i, j]) => g.push(poly(plano(ZP + .2, SX + i * SW / 5, SY + j * SD / 4, SX + (i + 1) * SW / 5, SY + (j + 1) * SD / 4), '#BBD9FB', AZ, 1)));
  g.push(llamAbajo(a1[0] + 40, 30, 250, L1.n, L1.titulo, L1.texto, [a1[0] + 40, a1[1] - 4]).svg);
  // 2) base de datos (cilindro) sobre su plataforma
  const CXc = 305, CYc = 100;
  const a2 = p(CXc - 20, CYc + 34, ZP + 30);
  g.at(0, p(305, 100, 0)[0], p(305, 100, 0)[1]);
  g.push(sombra(210, 30, 190, 140, 8, 0));
  g.push(caja(210, 30, 0, 190, 140, ZP, 'g'));
  g.at(2, p(CXc, CYc, ZP + 40)[0], p(CXc, CYc, ZP + 40)[1]);
    g.push(sombra(CXc - 34, CYc - 34, 68, 68, 70, ZP));
  g.push(cil(CXc, CYc, ZP, 34, 70, 'b', { anillos: 2, banda: 1 }));
  g.push(I.fl([[CXc, SY + SD + 2, ZP + 40], [CXc, CYc - 20, ZP + 76]], { col: AZ }));
  g.push(llamArriba(a2[0], 400, 230, L2.n, L2.titulo, L2.texto, a2).svg);
  // 3) puerta de consulta, agente que traduce y quien pregunta
  const a3 = p(60, 130, 22);
  g.at(3, p(100, 100, 40)[0], p(100, 100, 40)[1]);
  g.push(sombra(170, 60, 12, 80, 64, 0));
  g.push(caja(170, 60, 0, 12, 80, 64, 'g'));
  g.push(poly(caraX(182, 76, 0, 124, 50), INK));
  g.push(poly(caraX(182, 76, 50, 124, 58), AZ));
  g.push(I.fl([[182, 100, 28], [262, 100, 28]], { col: AZ }));
  g.push(sombra(50, 70, 60, 60, 50, 0));
  g.push(agenteIso(I, 50, 70, 0, 60, 60, 50));
  g.push(botIso(I, 72, 92, 50, 1, 3));
  { const hb = p(80, 100, 50 + 34); g.ancla(3, hb[0], hb[1], 'ul'); }
  g.push(seg([112, 100, 28], [170, 100, 28], AZ, 1.4));
  const pe = p(-6, 100, 0);
  g.push(peonIso(pe[0], pe[1], 2.1));
  g.push(etq(pe[0] - 26, pe[1] - 8, d.tu.t, d.tu.s, 'end'));
  g.push(I.fl([[6, 100, 26], [46, 100, 26]], { col: G3, dash: '4 3' }));
  const pc = p(176, 100, 66);
  g.push(etq(pc[0], pc[1] - 12, d.puerta, null, 'middle'));
  g.push(llamArriba(a3[0] + 4, 400, 230, L3.n, L3.titulo, L3.texto, [a3[0] + 4, a3[1]]).svg);
  // 4) el resultado
  const IX = 450, IY = 50, a4 = p(IX + 110, IY + 100, ZP / 2);
  g.at(4, p(IX + 85, IY + 50, ZP)[0], p(IX + 85, IY + 50, ZP)[1]);
  g.push(sombra(IX, IY, 170, 100, 10, 0));
  g.push(caja(IX, IY, 0, 170, 100, ZP, 'b'));
  [[0, .82], [1, .6], [2, .7], [3, .44]].forEach(([i, w]) => g.push(poly(plano(ZP + .2, IX + 12, IY + 10 + i * 21, IX + 12 + w * 146, IY + 10 + i * 21 + 11), i < 2 ? '#BBD9FB' : '#E0E0E6', i < 2 ? AZ : 'none', 1)));
  g.push(I.fl([[342, 100, 34], [446, 100, ZP + 6]], { col: AZ }));
  g.push(llamArriba(a4[0], 400, 210, L4.n, L4.titulo, L4.texto, a4).svg);
  g.burbujas(d.piensa, 480);
  return svg(g.join(''), 480, 'Maqueta: ' + d.rotulos.map(r => r.titulo).join(', '));
}

/* ============================================================
   12) LUPA — un documento grande con focos y lo que ha encontrado
   ============================================================ */
function lupa(d) {
  const g = pasos(), I = iso(330, 185, 1.25), { p, seg, sombra, poly, anillo, plano } = I;
  const DX = 0, DY = 0, DW = 240, DD = 300, TOP = 10;
  g.at(0, 330, 290);
  g.push(sombra(DX, DY, DW, DD, 14, 0));
  g.push(I.caja(DX + 6, DY + 6, 0, DW, DD, 4, 'g'));
  g.push(I.caja(DX, DY, 4, DW, DD, 6, 'b'));
  const barra = (y, w, col, x0 = 20, hh = 4) => poly(plano(TOP + .1, DX + x0, DY + y, DX + x0 + w, DY + y + hh), col);
  g.push(barra(22, 130, INK, 20, 8));
  g.push(barra(38, 80, '#BEBEC7', 20, 4));
  [0, 1, 2, 3].forEach(b => [0, 1, 2, 3].forEach(r => { if (b === 0 && r === 0) return; g.push(barra(60 + b * 64 + r * 12, [1, .9, .96, .55][r] * (DW - 40), '#D5D5DB')); }));
  g.push(barra(60, (DW - 40), '#D5D5DB'));
  const pb = p(DW, DD, 0);
  g.push(etq(pb[0], pb[1] + 36, d.doc.t, d.doc.s, 'middle'));
  // 1) la lupa
  const lc = [DW / 2 + 6, 147];
  g.at(1, p(lc[0], lc[1], 70)[0], p(lc[0], lc[1], 70)[1]);
  g.push('<g data-vivo="lupa">');
  g.push(seg([lc[0] - 36, lc[1] - 36, 76], [18, 124, TOP], AZ, 1, '3 3'));
  g.push(seg([lc[0] + 36, lc[1] + 36, 76], [DW - 14, 170, TOP], AZ, 1, '3 3'));
  g.push(seg([lc[0] + 32, lc[1] - 32, 76], [lc[0] + 84, lc[1] - 84, 112], INK, 7));
  g.push(anillo(lc[0], lc[1], 76, 44, INK, 6, 'rgba(255,255,255,.35)'));
  g.push(anillo(lc[0], lc[1], 76, 44, AZ, 1.6));
  g.push('</g>');
  const ex = p(lc[0] + 84, lc[1] - 84, 112);
  { const lp = p(lc[0], lc[1], 76); g.ancla(1, lp[0], lp[1] - 40, 'ur'); }
  g.push(etq(ex[0] + 24, ex[1] - 6, d.lupa.t, d.lupa.s));
  // 2..4) zonas y tarjetas
  const CX0 = 706, CW = 282;
  d.hallazgos.forEach((h, i) => {
    const a = p(DX + DW - 16, DY + h.y + h.h / 2, TOP);
    g.at(2 + i, a[0] - 100, a[1]);
    g.push(poly(plano(TOP + .4, DX + 14, DY + h.y - 4, DX + DW - 14, DY + h.y + h.h + 2), 'rgba(0,122,255,.14)', AZ, 1.2).replace('<path ', '<path data-vivo="zona" '));
    g.ancla(2 + i, CX0 - 30 + i * 8, 70 + i * 124 + 40, 'l');
    const tl = partir(h.texto, CW - 38, 10), cy = 70 + i * 124;
    const th = 14 + 15 + tl.length * 13.6 + 14;
    g.push(`<rect x="${CX0 + 7}" y="${cy - 14 + 7}" width="${CW}" height="${r1(th)}" rx="4" fill="#E4E4E9"/>`);
    g.push(caja(CX0, cy - 14, CW, th, { fill: '#fff' }));
    g.push(`<rect x="${CX0}" y="${cy - 14}" width="3" height="${r1(th)}" rx="1.5" fill="${AZ}"/>`);
    g.push(lin([[a[0], a[1]], [CX0 - 30 + i * 8, a[1]], [CX0 - 30 + i * 8, cy], [CX0 - 9, cy]], { col: AZ, w: 1 }) + punto(a[0], a[1]));
    g.push(grupo(CX0 - 9, cy - 14, CW + 9, th, pin(CX0, cy, h.n) + T(CX0 + 17, cy + 4, h.titulo, { size: 12, fill: INK, peso: 700 }) + tl.map((l, j) => T(CX0 + 17, cy + 22 + j * 13.6, l, { size: 10, fill: G2 })).join('')));
  });
  // 5) quien lleva el resultado
  const nf = nodo(CX0, 442, CW, d.fin.t, d.fin.s, { oscuro: true, h: 58 });
  g.at(5, nf.cx, nf.cy);
  g.push(flecha([[CX0 + 40, 70 + 2 * 124 + 66], [CX0 + 40, 440]], { col: INK }));
  g.push(nf.svg);
  g.burbujas(d.piensa, 520);
  return svg(g.join(''), 520, 'Lupa: ' + d.doc.t);
}

/* @@FIN-NUEVO */

/* ============================================================
   CAPA VIVA — Laminas.animar(svgEl, opciones) -> { paso(k, {todo}), fin(), parar() }
   Anima lo que la lámina marca con data-vivo / data-flujo / data-obj; no toca el zoom ni la opacidad
   de los pasos (eso lo hace quien reproduce). Sin librerías.
     opciones: reducido (bool), hablando (fn -> bool: la voz habla)
   ============================================================ */
function animar(svg, opt = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const red = opt.reducido != null ? !!opt.reducido : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const habla = typeof opt.hablando === 'function' ? opt.hablando : () => false;
  const now = () => performance.now();
  const $$ = (q, r = svg) => Array.from(r.querySelectorAll(q));
  const pasoDe = el => { const g = el.closest('[data-paso]:not([data-vivo])'); return g ? +g.dataset.paso : -1; };
  const mk = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  svg.classList.add('vivo-on');
  let cur = -1, todo = false, raf = 0, vivo = true;
  const fx = [];
  let objs = [];
  const num = v => Math.round(v * 100) / 100;

  const ags = $$('[data-vivo="agente"]').map(el => {
    const cab = el.querySelector('.cabeza'), oj = el.querySelector('.ojos'), pu = el.querySelector('.punta');
    return { el, paso: +el.dataset.paso, cab, oj, pu, px: +cab.dataset.px, py: +cab.dataset.py, ex: +oj.dataset.ex, ey: +oj.dataset.ey,
      tx: +pu.dataset.tx, ty: +pu.dataset.ty, prox: now() + 1500 + Math.random() * 2200, parp: -1e9, fase: Math.random() * 6.28 };
  });
  const pens = $$('[data-vivo="piensa"]').map(el => {
    const pt = $$('.pt', el);
    return { el, paso: +el.dataset.paso, pt, full: pt.map(t => t.textContent), lab: el.querySelector('.pl') };
  });
  const latidos = $$('[data-vivo="pin"]').filter(p => p.dataset.n === '!').map(p => ({ p, prox: 0 }));
  const iconos = $$('[data-vivo="icono"]'), lupas = $$('[data-vivo="lupa"]');
  const cursores = $$('[data-vivo="cursor"]');
  const esIAPaso = k => ags.some(a => a.paso === k);

  const ficha = (c, kind) => {
    const g = mk('g', {});
    if (kind === 'punto') g.append(mk('circle', { r: 3.6, fill: c, stroke: '#fff', 'stroke-width': 1 }));
    else if (kind === 'paquete') {
      g.append(mk('rect', { x: -8, y: -6, width: 16, height: 12, rx: 2, fill: INK, stroke: '#fff', 'stroke-width': 1 }),
        mk('rect', { x: -8, y: -1.5, width: 16, height: 3, fill: WARN }));
    } else if (kind === 'hoja') {
      g.append(mk('path', { d: 'M0 -4L11.6 -.4L1.7 2.7L-10 -.9Z', fill: '#fff', stroke: c, 'stroke-width': 1, 'stroke-linejoin': 'round' }));
    } else {
      g.append(mk('rect', { x: -5, y: -6, width: 10, height: 12, rx: 1.5, fill: '#fff', stroke: c, 'stroke-width': 1.2 }),
        mk('path', { d: 'M-2.5 -2H2.5M-2.5 1H2.5M-2.5 4H.5', stroke: c, 'stroke-width': .9, fill: 'none', 'stroke-linecap': 'round' }));
    }
    g.setAttribute('opacity', '0'); g.setAttribute('pointer-events', 'none');
    return g;
  };
  const limpiarObjs = () => { objs.forEach(o => o.el.remove()); objs = []; };
  const crearObjs = k => {
    limpiarObjs();
    if (red) return;
    const ps = $$(`[data-flujo="${k}"]`).sort((a, b) => (b.dataset.obj === 'hoja') - (a.dataset.obj === 'hoja')).slice(0, 3);
    ps.forEach((path, i) => {
      let L = 0; try { L = path.getTotalLength(); } catch (e) {}
      if (!(L > 10)) return;
      const kind0 = path.dataset.obj || null, ia = path.dataset.ia === '1' || esIAPaso(k), col = ia ? CC : AZ;
      const n = kind0 === 'paquete' ? 1 : kind0 === 'hoja' ? 3 : ps.length === 1 ? 3 : (i === 0 ? 2 : 1);
      for (let j = 0; j < n; j++) {
        const kind = kind0 || ((i + j) % 2 === 0 ? 'ficha' : 'punto'), el = ficha(col, kind);
        path.parentNode.appendChild(el);
        { const p0 = path.getPointAtLength(0); el.setAttribute('transform', `translate(${num(p0.x)} ${num(p0.y)})`); }
        objs.push({ el, path, L, off: j / n, t0: now(), dur: Math.max(1.4, Math.min(4.2, L / (kind === 'hoja' ? 60 : 95))) * 1000, kind });
      }
    });
  };
  const anillo = (p, retraso, col) => {
    if (red) return;
    const x = +p.dataset.px, y = +p.dataset.py, c = mk('circle', { cx: x, cy: y, r: 9, fill: 'none', stroke: col, 'stroke-width': 1.6, opacity: 0 });
    p.parentNode.insertBefore(c, p);
    fx.push({ t0: now() + retraso, dur: 800, f: u => { c.setAttribute('r', num(9 + 14 * u)); c.setAttribute('opacity', num(.7 * (1 - u))); if (u >= 1) c.remove(); } });
  };
  const escribir = b => {
    if (red) { b.pt.forEach((e, i) => { e.textContent = b.full[i]; }); b.lab.textContent = 'listo'; return; }
    const tot = b.full.reduce((a, t) => a + t.length, 0), t0 = now() + 300;
    b.pt.forEach(e => { e.textContent = ''; }); b.lab.textContent = 'pensando…';
    fx.push({ t0, dur: Math.max(1, tot * 25), f: u => {
      let c = Math.round(u * tot);
      b.pt.forEach((e, i) => { e.textContent = b.full[i].slice(0, Math.max(0, c)); c -= b.full[i].length; });
    } });
    fx.push({ t0: t0 + tot * 25 + 450, dur: 1, f: () => { b.lab.textContent = 'listo'; } });
  };
  const terminal = k => {
    const it = $$('[data-vivo="cmd"],[data-vivo="out"]').filter(e => pasoDe(e) === k);
    if (!it.length) return;
    it.forEach(e => { if (e._full == null) e._full = e.textContent; });
    if (red) { it.forEach(e => { e.textContent = e._full; }); return; }
    let t = now() + 400;
    it.forEach(e => {
      const full = e._full, cmd = e.dataset.vivo === 'cmd', dur = cmd ? Math.max(1, full.length * 28) : 1;
      e.textContent = '';
      fx.push({ t0: t, dur, f: u => { e.textContent = cmd ? full.slice(0, Math.round(u * full.length)) : full; } });
      t += dur + (cmd ? 220 : 320);
    });
  };
  const checks = (k, todos) => {
    const cs = $$('[data-vivo="check"]').filter(e => todos || pasoDe(e) === k);
    cs.forEach((c, i) => {
      if (red) { c.style.opacity = '1'; return; }
      c.style.opacity = '0';
      fx.push({ t0: now() + 450 + i * 480, dur: 320, f: u => { c.style.opacity = String(num(u)); c.setAttribute('transform', `translate(${num((1 - u) * -10)} 0)`); } });
    });
  };
  const efectosPaso = k => {
    $$('[data-vivo="pin"]').filter(p => pasoDe(p) === k).forEach((p, i) => anillo(p, 200 + i * 160, p.dataset.n === '!' ? WARN : (esIAPaso(k) ? CC : AZ)));
    pens.filter(b => b.paso === k).forEach(escribir);
    terminal(k);
    $$('[data-vivo="bola"]').filter(b => pasoDe(b) === k && !red).forEach((b, i) => {
      const x = b.dataset.px, y = b.dataset.py;
      fx.push({ t0: now() + 250 + i * 170, dur: 440, f: u => { const sc = 1 + .55 * Math.sin(Math.PI * u); b.setAttribute('transform', `translate(${x} ${y}) scale(${num(sc)}) translate(${-x} ${-y})`); } });
    });
    $$('[data-vivo="zona"]').filter(z => pasoDe(z) === k && !red).forEach(z => {
      fx.push({ t0: now() + 200, dur: 1500, f: u => { z.style.opacity = String(num(.35 + .65 * Math.abs(Math.cos(u * Math.PI * 2)))); } });
    });
    $$('[data-vivo="barrido"]').filter(b => pasoDe(b) === k && !red).forEach(b => {
      const w = +b.dataset.w;
      fx.push({ t0: now() + 150, dur: 1000, f: u => { b.setAttribute('width', num(w * Math.min(1, u * 1.6))); b.setAttribute('opacity', num(u < .5 ? .9 : .9 * (1 - u) * 2)); } });
    });
  };

  const tick = t => {
    if (!vivo) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) return;
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i], u = (t - e.t0) / e.dur;
      if (u < 0) continue;
      e.f(Math.min(1, u)); if (u >= 1) fx.splice(i, 1);
    }
    if (red) return;
    const hb = habla();
    ags.forEach(a => {
      if (!(todo || a.paso <= cur)) return;
      a.cab.setAttribute('transform', `rotate(${num(3 * Math.sin(t / 950 + a.fase))} ${a.px} ${a.py})`);
      if (t >= a.prox) { a.parp = t; a.prox = t + 3000 + Math.random() * 1000; }
      const bu = t - a.parp, sy = bu < 170 ? 1 - .9 * Math.sin(Math.PI * bu / 170) : 1;
      a.oj.setAttribute('transform', `translate(${a.ex} ${a.ey}) scale(1 ${num(sy)}) translate(${-a.ex} ${-a.ey})`);
      const sc = (a.paso === cur || hb) ? 1 + .55 * (.5 + .5 * Math.sin(t / 210)) : 1;
      a.pu.setAttribute('transform', `translate(${a.tx} ${a.ty}) scale(${num(sc)}) translate(${-a.tx} ${-a.ty})`);
    });
    objs.forEach(o => {
      const u = ((t - o.t0) / o.dur + o.off) % 1, pt = o.path.getPointAtLength(u * o.L), a = Math.min(1, u * 7, (1 - u) * 7);
      o.el.setAttribute('transform', `translate(${num(pt.x)} ${num(pt.y)})`);
      o.el.setAttribute('opacity', num(o.kind === 'hoja' ? Math.min(1, u * 14, (1 - u) * 14) : a));
    });
    latidos.forEach(l => { if (pasoDe(l.p) === cur && t >= l.prox) { anillo(l.p, 0, WARN); l.prox = t + 1100; } });
    iconos.forEach(e => { const on = pasoDe(e) === cur; e.setAttribute('transform', on ? `translate(0 ${num(-2 * Math.abs(Math.sin(t / 330)))})` : ''); });
    lupas.forEach(e => { const on = pasoDe(e) === cur; e.setAttribute('transform', on ? `translate(${num(9 * Math.sin(t / 900))} ${num(5 * Math.cos(t / 1250))})` : ''); });
    cursores.forEach(e => { e.style.opacity = (Math.floor(t / 520) % 2) ? '0' : '1'; });
  };
  raf = requestAnimationFrame(tick);

  const ctl = {
    paso(k, o = {}) {
      if (o.todo) todo = true;
      if (k === cur && !o.forzar) return;
      cur = k;
      crearObjs(k);
      efectosPaso(k);
      checks(k, !!o.todo);
    },
    fin() {
      fx.splice(0).forEach(e => e.f(1));
      limpiarObjs(); todo = true;
      $$('[data-vivo="check"]').forEach(c => { c.style.opacity = '1'; c.removeAttribute('transform'); });
      pens.forEach(b => { if (b.pt.some((e, i) => e.textContent !== b.full[i])) { b.pt.forEach((e, i) => { e.textContent = b.full[i]; }); b.lab.textContent = 'listo'; } });
      $$('[data-vivo="cmd"],[data-vivo="out"]').forEach(e => { if (e._full != null) e.textContent = e._full; });
    },
    parar() {
      vivo = false; cancelAnimationFrame(raf); ctl.fin(); svg.classList.remove('vivo-on');
    }
  };
  return ctl;
}

/* ============================================================
   COREOGRAFÍA DE CÁMARA — Laminas.coreo(tipo, paso, c) -> { a, b, salta } | null
   c = { cx, cy, z (pose base del paso), W, H, n (nº de pasos) }.
   a = pose al empezar el beat, b = pose al acabar (deriva lenta). El reproductor la acota al SVG.
   ============================================================ */
function coreo(tipo, k, c) {
  const a = { cx: c.cx, cy: c.cy, z: c.z }, b = { cx: c.cx, cy: c.cy, z: c.z };
  switch (tipo) {
    case 'ventana':
      if (k === 0) { Object.assign(a, { cx: 130, cy: 300, z: Math.max(c.z, 1.45) }); Object.assign(b, { cx: 510, cy: 200, z: Math.max(c.z, 1.2) }); }
      else if (k === 1) { b.cx = c.cx + 40; b.cy = c.cy + 50; }
      else if (k === 2) { Object.assign(a, { cx: c.cx - 60, cy: 200 }); }
      else if (k === 3) { a.cy = c.cy - 40; b.cy = c.cy + 60; }
      else return null;
      break;
    case 'capas':
      if (k < c.n - 1) { a.cy = c.cy + 40; b.cy = c.cy - 40; } else { a.cy = c.cy - 100; b.cy = c.cy + 100; }
      break;
    case 'fabrica':
      a.z = b.z = Math.max(c.z, 1.35); a.cx = c.cx - 70; b.cx = c.cx + 70;
      break;
    case 'frontera':
      return { a, b, salta: true };
    case 'ciclo': {
      const CX = 500, CY = 252, RX = 346, RY = 172;
      if (k >= c.n - 1) return null;
      const th = Math.atan2((c.cy - CY) / RY, (c.cx - CX) / RX);
      a.z = b.z = Math.max(c.z, 1.35);
      b.cx = CX + RX * Math.cos(th + .3); b.cy = CY + RY * Math.sin(th + .3);
      break;
    }
    default: return null;
  }
  return { a, b };
}

/* ---------- API pública ---------- */
const TIPOS = { ventana, calles, hub, capas, tabla, grupos, ciclo, escritorio, fabrica, frontera, maqueta, lupa };
/* cada tipo marca su <svg> con data-tipo; los pasos se cuentan por sus grupos con data-cx (los data-vivo no cuentan) */
const MARCADOS = {};
Object.keys(TIPOS).forEach(k => { MARCADOS[k] = d => TIPOS[k](d).replace('<svg ', `<svg data-tipo="${k}" `); });
window.Laminas = { ...MARCADOS, medir, partir, nodo, llam, pin, flecha, icono, botPlano, animar, coreo,
  pasos: s => (String(s).match(/<g data-paso="\d+" data-cx/g) || []).length };
})();
