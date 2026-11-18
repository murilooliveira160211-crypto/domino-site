#!/usr/bin/env node
/**
 * Gera as ilustrações SVG do Dominópolis em assets/img/.
 *
 * Uso:  node scripts/generate-art.mjs
 *
 * Todas as imagens são vetoriais e determinísticas (mesma saída a cada execução).
 * São ilustrações provisórias: troque por fotos reais do produto assim que existirem.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'img');

/* ------------------------------------------------------------------ */
/* Paleta                                                              */
/* ------------------------------------------------------------------ */
const C = {
  ink: '#1E293B',
  ink2: '#334155',
  ink3: '#0F172A',
  sidewalk: '#E2E8F0',
  curb: '#CBD5E1',
  boardCell: '#F1F5F9',
  asphalt: '#475569',
  lane: '#FDE047',
  grass: '#86EFAC',
  grass2: '#BBF7D0',
  tree: '#16A34A',
  treeDark: '#15803D',
  treeLight: '#4ADE80',
  water: '#7DD3FC',
  water2: '#BAE6FD',
  waterDeep: '#0284C7',
  plaza: '#FEF3C7',
  plazaLine: '#FDE68A',
  orange: '#F97316',
  green: '#16A34A',
  woodDark: '#8C5A33',
};
const ROOFS = ['#F97316', '#FB923C', '#FDBA74', '#94A3B8', '#64748B', '#FED7AA'];
const FONT = "'Plus Jakarta Sans', Arial, Helvetica, sans-serif";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const n = (v) => Math.round(v * 100) / 100;
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? n(v) : v}"`)
    .join(' ');
const el = (tag, a = {}, inner) =>
  inner === undefined ? `<${tag} ${attrs(a)}/>` : `<${tag} ${attrs(a)}>${inner}</${tag}>`;
const rect = (x, y, width, height, a = {}) => el('rect', { x, y, width, height, ...a });
const circle = (cx, cy, r, a = {}) => el('circle', { cx, cy, r, ...a });
const line = (x1, y1, x2, y2, a = {}) => el('line', { x1, y1, x2, y2, ...a });
const path = (d, a = {}) => el('path', { d, ...a });
const text = (x, y, str, a = {}) => el('text', { x, y, 'font-family': FONT, ...a }, str);

let uidCounter = 0;
const uid = (p) => `${p}${(++uidCounter).toString(36)}`;

/** PRNG determinístico (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFS = `<defs>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${C.ink3}" flood-opacity=".22"/></filter>
  <filter id="shLg" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="${C.ink3}" flood-opacity=".22"/></filter>
  <filter id="shLift" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="7" flood-color="${C.ink3}" flood-opacity=".25"/></filter>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2AE7C"/><stop offset=".55" stop-color="#C68B59"/><stop offset="1" stop-color="#A86F40"/></linearGradient>
  <linearGradient id="woodBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A86F40"/><stop offset="1" stop-color="#7A4C29"/></linearGradient>
</defs>`;

function svgDoc(w, h, title, body) {
  uidCounter = 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>${title}</title>${DEFS}${body}</svg>\n`;
}

/* ------------------------------------------------------------------ */
/* Terrenos (cada célula ocupa um quadrado de lado s em x,y)           */
/* ------------------------------------------------------------------ */
function drawStreet(x, y, s, { conn = 'EW' } = {}) {
  const set = new Set(conn.split(''));
  const has = (d) => set.has(d);
  const cx = x + s / 2;
  const cy = y + s / 2;
  const rw = s * 0.5;
  const h = rw / 2;
  const grow = s * 0.035;

  const shapes = (g) => {
    let o = rect(cx - h - g, cy - h - g, rw + 2 * g, rw + 2 * g);
    if (has('N')) o += rect(cx - h - g, y, rw + 2 * g, s / 2);
    if (has('S')) o += rect(cx - h - g, cy, rw + 2 * g, s / 2);
    if (has('W')) o += rect(x, cy - h - g, s / 2, rw + 2 * g);
    if (has('E')) o += rect(cx, cy - h - g, s / 2, rw + 2 * g);
    if (set.size === 1) o += circle(cx, cy, h * 1.35 + g);
    return o;
  };

  let o = rect(x, y, s, s, { fill: C.sidewalk });
  o += el('g', { fill: C.curb }, shapes(grow));
  o += el('g', { fill: C.asphalt }, shapes(0));

  const lane = {
    stroke: C.lane,
    'stroke-width': s * 0.035,
    'stroke-dasharray': `${n(s * 0.1)} ${n(s * 0.1)}`,
  };
  if (set.size === 2 && has('N') && has('S')) {
    o += line(cx, y, cx, y + s, lane);
  } else if (set.size === 2 && has('E') && has('W')) {
    o += line(x, cy, x + s, cy, lane);
  } else {
    const stop = set.size >= 3 ? h + grow : 0;
    if (has('N')) o += line(cx, y, cx, cy - stop, lane);
    if (has('S')) o += line(cx, y + s, cx, cy + stop, lane);
    if (has('W')) o += line(x, cy, cx - stop, cy, lane);
    if (has('E')) o += line(x + s, cy, cx + stop, cy, lane);
  }

  return o;
}

function tree(x, y, r, s) {
  return (
    circle(x + s * 0.03, y + s * 0.04, r, { fill: C.treeDark, opacity: 0.35 }) +
    circle(x, y, r, { fill: C.tree }) +
    circle(x - r * 0.28, y - r * 0.3, r * 0.5, { fill: C.treeLight, opacity: 0.85 })
  );
}

function drawPark(x, y, s, { seed = 1 } = {}) {
  const r = rng(seed * 9973 + 17);
  let o = rect(x, y, s, s, { fill: C.grass });
  for (let i = 0; i < 3; i++) {
    o += el('ellipse', {
      cx: x + s * (0.15 + r() * 0.7),
      cy: y + s * (0.15 + r() * 0.7),
      rx: s * (0.1 + r() * 0.08),
      ry: s * (0.06 + r() * 0.05),
      fill: C.grass2,
      opacity: 0.6,
    });
  }
  if (r() > 0.5) {
    // trilha
    const y0 = y + s * (0.3 + r() * 0.4);
    o += path(
      `M${n(x)} ${n(y0)} C${n(x + s * 0.35)} ${n(y0 - s * 0.2)} ${n(x + s * 0.65)} ${n(y0 + s * 0.2)} ${n(x + s)} ${n(y0)}`,
      { fill: 'none', stroke: '#FEF9C3', 'stroke-width': s * 0.07, 'stroke-linecap': 'round', opacity: 0.9 },
    );
  }
  const trees = [];
  const count = 3 + (r() > 0.55 ? 1 : 0);
  let tries = 0;
  while (trees.length < count && tries++ < 80) {
    const tr = s * (0.11 + r() * 0.05);
    const tx = x + s * 0.18 + r() * s * 0.64;
    const ty = y + s * 0.18 + r() * s * 0.64;
    if (trees.every((t) => Math.hypot(t.x - tx, t.y - ty) > (t.r + tr) * 1.0)) trees.push({ x: tx, y: ty, r: tr });
  }
  for (const t of trees) o += tree(t.x, t.y, t.r, s);
  return o;
}

function drawBuilding(x, y, s, { seed = 1 } = {}) {
  const r = rng(seed * 7919 + 3);
  let o = rect(x, y, s, s, { fill: C.sidewalk });
  const layouts = [
    [[0.16, 0.16, 0.68, 0.68]],
    [[0.14, 0.16, 0.34, 0.68], [0.54, 0.16, 0.32, 0.68]],
    [[0.14, 0.14, 0.72, 0.38], [0.14, 0.58, 0.42, 0.28]],
    [[0.14, 0.14, 0.42, 0.42], [0.6, 0.14, 0.26, 0.72], [0.14, 0.6, 0.42, 0.26]],
  ];
  const L = layouts[Math.floor(r() * layouts.length)];
  let last = -1;
  for (const [ux, uy, uw, uh] of L) {
    const bx = x + ux * s;
    const by = y + uy * s;
    const bw = uw * s;
    const bh = uh * s;
    let ci = Math.floor(r() * ROOFS.length);
    if (ci === last) ci = (ci + 1) % ROOFS.length;
    last = ci;
    o += rect(bx + s * 0.035, by + s * 0.045, bw, bh, { rx: s * 0.025, fill: C.ink, opacity: 0.2 });
    o += rect(bx, by, bw, bh, { rx: s * 0.025, fill: ROOFS[ci] });
    o += rect(bx + s * 0.035, by + s * 0.035, bw - s * 0.07, bh - s * 0.07, {
      rx: s * 0.015,
      fill: 'none',
      stroke: '#fff',
      'stroke-opacity': 0.4,
      'stroke-width': s * 0.02,
    });
    if (bw > s * 0.3 && bh > s * 0.3) {
      o += rect(bx + bw * 0.2, by + bh * 0.22, s * 0.09, s * 0.07, { rx: 1, fill: '#fff', opacity: 0.6 });
      o += circle(bx + bw * 0.7, by + bh * 0.68, s * 0.05, { fill: '#fff', opacity: 0.5 });
    } else if (bw * bh > s * s * 0.06) {
      o += rect(bx + bw * 0.3, by + bh * 0.35, s * 0.07, s * 0.06, { rx: 1, fill: '#fff', opacity: 0.55 });
    }
  }
  return o;
}

function drawBridge(x, y, s, { conn = 'EW', seed = 1 } = {}) {
  const r = rng(seed * 31 + 5);
  const vertical = (conn.includes('N') || conn.includes('S')) && !(conn.includes('E') || conn.includes('W'));
  const cx = x + s / 2;
  const cy = y + s / 2;
  const rw = s * 0.5;
  const h = rw / 2;
  let o = rect(x, y, s, s, { fill: C.water });
  for (let i = 0; i < 5; i++) {
    const wx = x + s * (0.06 + r() * 0.7);
    const wy = y + s * (0.08 + r() * 0.84);
    const ww = s * (0.12 + r() * 0.08);
    o += path(`M${n(wx)} ${n(wy)} q${n(ww / 4)} ${n(-s * 0.045)} ${n(ww / 2)} 0 t${n(ww / 2)} 0`, {
      fill: 'none',
      stroke: '#fff',
      'stroke-width': s * 0.025,
      'stroke-linecap': 'round',
      opacity: 0.75,
    });
  }
  let d = '';
  d += rect(x, cy - h + s * 0.08, s, rw, { fill: C.waterDeep, opacity: 0.3 });
  d += rect(x, cy - h - s * 0.06, s, rw + s * 0.12, { fill: '#94A3B8' });
  d += rect(x, cy - h, s, rw, { fill: C.asphalt });
  d += line(x, cy, x + s, cy, {
    stroke: C.lane,
    'stroke-width': s * 0.035,
    'stroke-dasharray': `${n(s * 0.1)} ${n(s * 0.1)}`,
  });
  for (let i = 0; i < 4; i++) {
    const px = x + s * (0.125 + i * 0.25);
    d += rect(px - s * 0.022, cy - h - s * 0.075, s * 0.044, s * 0.05, { fill: '#fff' });
    d += rect(px - s * 0.022, cy + h + s * 0.025, s * 0.044, s * 0.05, { fill: '#fff' });
  }
  o += vertical ? `<g transform="rotate(90 ${n(cx)} ${n(cy)})">${d}</g>` : d;
  return o;
}

function drawPlaza(x, y, s) {
  let o = rect(x, y, s, s, { fill: C.plaza });
  for (let i = 1; i < 5; i++) {
    o += line(x + (i * s) / 5, y, x + (i * s) / 5, y + s, { stroke: C.plazaLine, 'stroke-width': s * 0.02 });
    o += line(x, y + (i * s) / 5, x + s, y + (i * s) / 5, { stroke: C.plazaLine, 'stroke-width': s * 0.02 });
  }
  return o;
}

function plazaOverlay(sx, sy, s, horizontal) {
  let o = circle(sx, sy, s * 0.38, { fill: '#fff', stroke: C.plazaLine, 'stroke-width': s * 0.04 });
  o += circle(sx, sy, s * 0.29, { fill: C.water });
  o += circle(sx, sy, s * 0.13, { fill: '#fff', opacity: 0.9 });
  o += circle(sx, sy, s * 0.055, { fill: C.water2 });
  const corners = horizontal
    ? [[-0.72, -0.26], [0.72, -0.26], [-0.72, 0.26], [0.72, 0.26]]
    : [[-0.26, -0.72], [0.26, -0.72], [-0.26, 0.72], [0.26, 0.72]];
  for (const [dx, dy] of corners) o += tree(sx + dx * s, sy + dy * s, s * 0.13, s);
  // bancos
  const benches = horizontal ? [[-0.5, 0], [0.5, 0]] : [[0, -0.5], [0, 0.5]];
  for (const [dx, dy] of benches) {
    const bw = horizontal ? s * 0.06 : s * 0.2;
    const bh = horizontal ? s * 0.2 : s * 0.06;
    o += rect(sx + dx * s - bw / 2, sy + dy * s - bh / 2, bw, bh, { rx: s * 0.02, fill: C.orange });
  }
  return o;
}

function drawCell(cell, x, y, s) {
  switch (cell.t) {
    case 'S':
      return drawStreet(x, y, s, cell);
    case 'P':
      return drawPark(x, y, s, cell);
    case 'B':
      return drawBuilding(x, y, s, cell);
    case 'W':
      return drawBridge(x, y, s, cell);
    case 'X':
      return drawPlaza(x, y, s);
    default:
      return '';
  }
}

/* ------------------------------------------------------------------ */
/* Marcadores de ação                                                  */
/* ------------------------------------------------------------------ */
function blitzMark(cx, cy, s) {
  const r = s * 0.32;
  const d = `M${n(cx)} ${n(cy - r)} L${n(cx + r * 0.98)} ${n(cy + r * 0.72)} L${n(cx - r * 0.98)} ${n(cy + r * 0.72)} Z`;
  return (
    path(d, { fill: C.ink, opacity: 0.25, transform: `translate(${n(s * 0.02)} ${n(s * 0.04)})`, 'stroke-linejoin': 'round' }) +
    path(d, { fill: C.orange, stroke: '#fff', 'stroke-width': s * 0.05, 'stroke-linejoin': 'round' }) +
    rect(cx - s * 0.03, cy - r * 0.45, s * 0.06, r * 0.66, { rx: s * 0.025, fill: C.ink }) +
    circle(cx, cy + r * 0.45, s * 0.036, { fill: C.ink })
  );
}

function craneMark(cx, cy, s) {
  const r = s * 0.33;
  const k = r / 30;
  let o = circle(cx + s * 0.02, cy + s * 0.04, r, { fill: C.ink, opacity: 0.22 });
  o += circle(cx, cy, r, { fill: '#FFF7ED', stroke: C.orange, 'stroke-width': s * 0.05 });
  const g = [
    `M${n(cx - 10 * k)} ${n(cy + 18 * k)} V${n(cy - 12 * k)}`,
    `M${n(cx - 20 * k)} ${n(cy - 10 * k)} H${n(cx + 19 * k)}`,
    `M${n(cx - 10 * k)} ${n(cy - 19 * k)} L${n(cx - 20 * k)} ${n(cy - 10 * k)}`,
    `M${n(cx - 10 * k)} ${n(cy - 19 * k)} L${n(cx + 19 * k)} ${n(cy - 10 * k)}`,
    `M${n(cx + 12 * k)} ${n(cy - 10 * k)} V${n(cy + 2 * k)}`,
    `M${n(cx - 17 * k)} ${n(cy + 18 * k)} H${n(cx - 3 * k)}`,
  ].join(' ');
  o += path(g, { fill: 'none', stroke: C.ink, 'stroke-width': s * 0.045, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  o += rect(cx + 7 * k, cy + 2 * k, 10 * k, 8 * k, { rx: 1, fill: C.orange });
  return o;
}

const MARKS = { blitz: blitzMark, crane: craneMark };

/* ------------------------------------------------------------------ */
/* Peça de dominó                                                      */
/* ------------------------------------------------------------------ */
function domino({ x, y, s = 60, orient = 'h', a, b, rot = 0, shadow = 'sh', thick = 0 }) {
  const W = orient === 'h' ? 2 * s : s;
  const H = orient === 'h' ? s : 2 * s;
  const gap = s * 0.035;
  const margin = s * 0.05;
  const kx = x + gap;
  const ky = y + gap;
  const kw = W - 2 * gap;
  const kh = H - 2 * gap;
  const ix = kx + margin;
  const iy = ky + margin;
  const iw = kw - 2 * margin;
  const ih = kh - 2 * margin;
  const bx = orient === 'h' ? x + s : x;
  const by = orient === 'h' ? y : y + s;
  const sx = orient === 'h' ? x + s : x + s / 2;
  const sy = orient === 'h' ? y + s / 2 : y + s;
  const clip = uid('c');
  const isPlaza = a.t === 'X' && b.t === 'X';

  let o = `<g${rot ? ` transform="rotate(${n(rot)} ${n(x + W / 2)} ${n(y + H / 2)})"` : ''}>`;
  if (thick) {
    o += rect(kx, ky + thick, kw, kh, { rx: s * 0.12, fill: '#CBD5E1', filter: shadow ? `url(#${shadow})` : undefined });
    o += rect(kx, ky + thick * 0.5, kw, kh, { rx: s * 0.12, fill: '#E2E8F0' });
  }
  o += rect(kx, ky, kw, kh, { rx: s * 0.12, fill: '#fff', filter: shadow && !thick ? `url(#${shadow})` : undefined });
  o += `<clipPath id="${clip}">${rect(ix, iy, iw, ih, { rx: s * 0.07 })}</clipPath>`;
  o += `<g clip-path="url(#${clip})">${drawCell(a, x, y, s)}${drawCell(b, bx, by, s)}`;
  if (isPlaza) o += plazaOverlay(sx, sy, s, orient === 'h');
  o += '</g>';
  if (!isPlaza) {
    o +=
      orient === 'h'
        ? line(sx, iy, sx, iy + ih, { stroke: '#fff', 'stroke-width': s * 0.045 })
        : line(ix, sy, ix + iw, sy, { stroke: '#fff', 'stroke-width': s * 0.045 });
    o += circle(sx, sy, s * 0.055, { fill: '#F1F5F9', stroke: '#94A3B8', 'stroke-width': s * 0.018 });
  }
  if (a.mark) o += MARKS[a.mark](x + s / 2, y + s / 2, s);
  if (b.mark) o += MARKS[b.mark](bx + s / 2, by + s / 2, s);
  o += rect(kx, ky, kw, kh, { rx: s * 0.12, fill: 'none', stroke: C.ink, 'stroke-opacity': 0.1, 'stroke-width': 1 });
  o += '</g>';
  return o;
}

/** Verso da peça (o que os outros jogadores veem). */
function dominoBack({ x, y, s = 60, orient = 'v', rot = 0, shadow = 'sh' }) {
  const W = orient === 'h' ? 2 * s : s;
  const H = orient === 'h' ? s : 2 * s;
  const gap = s * 0.035;
  const cx = x + W / 2;
  const cy = y + H / 2;
  const clip = uid('bk');
  const ix = x + gap + s * 0.06;
  const iy = y + gap + s * 0.06;
  const iw = W - 2 * gap - s * 0.12;
  const ih = H - 2 * gap - s * 0.12;
  let o = `<g${rot ? ` transform="rotate(${n(rot)} ${n(cx)} ${n(cy)})"` : ''}>`;
  o += rect(x + gap, y + gap, W - 2 * gap, H - 2 * gap, { rx: s * 0.12, fill: '#fff', filter: shadow ? `url(#${shadow})` : undefined });
  o += rect(ix, iy, iw, ih, { rx: s * 0.08, fill: C.ink });
  o += `<clipPath id="${clip}">${rect(ix, iy, iw, ih, { rx: s * 0.08 })}</clipPath><g clip-path="url(#${clip})" stroke="#334155" stroke-width="${n(s * 0.03)}">`;
  for (let i = 1; i < 6; i++) o += line(ix + (iw * i) / 6, iy, ix + (iw * i) / 6, iy + ih);
  for (let i = 1; i < 12; i++) o += line(ix, iy + (ih * i) / 12, ix + iw, iy + (ih * i) / 12);
  o += '</g>';
  o += logoMark(cx, cy, s * 0.78, orient === 'v');
  o += rect(x + gap, y + gap, W - 2 * gap, H - 2 * gap, { rx: s * 0.12, fill: 'none', stroke: C.ink, 'stroke-opacity': 0.12, 'stroke-width': 1 });
  o += '</g>';
  return o;
}

/** Marca do logo: peça dividida em parque + rua. */
function logoMark(cx, cy, w, vertical = false) {
  const h = w * 0.58;
  const g = `<g transform="translate(${n(cx - w / 2)} ${n(cy - h / 2)}) scale(${n(w / 48)})">
    <rect x="1" y="1" width="46" height="26" rx="6" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
    <rect x="4.5" y="4.5" width="18.5" height="19" rx="3" fill="#16A34A"/>
    <circle cx="10.5" cy="11" r="3" fill="#86EFAC"/><circle cx="16.5" cy="17" r="3" fill="#86EFAC"/>
    <rect x="25" y="4.5" width="18.5" height="19" rx="3" fill="#475569"/>
    <line x1="25" y1="14" x2="43.5" y2="14" stroke="#F97316" stroke-width="2.4" stroke-dasharray="3.6 2.6"/>
  </g>`;
  return vertical ? `<g transform="rotate(90 ${n(cx)} ${n(cy)})">${g}</g>` : g;
}

/* ------------------------------------------------------------------ */
/* Tabuleiro                                                           */
/* ------------------------------------------------------------------ */
const ROAD = new Set(['S', 'W']);

function parseMap(rows) {
  return rows.map((row) => [...row]);
}

function computeConn(map, r, c) {
  const R = map.length;
  const Cn = map[0].length;
  const at = (rr, cc) => (rr >= 0 && rr < R && cc >= 0 && cc < Cn ? map[rr][cc] : null);
  const t = map[r][c];
  const dirs = { N: [-1, 0], S: [1, 0], W: [0, -1], E: [0, 1] };
  let conn = '';
  for (const [d, [dr, dc]] of Object.entries(dirs)) {
    const nb = at(r + dr, c + dc);
    if (nb && ROAD.has(nb)) {
      if (t === 'W' || nb !== 'W') conn += d;
      else if (nb === 'W') conn += d;
    }
  }
  if (t === 'W') {
    // ponte segue o eixo da via
    if (/[NS]/.test(conn) && !/[EW]/.test(conn)) return 'NS';
    return /[NS]/.test(conn) ? 'NS' : 'EW';
  }
  if (conn.length === 1) {
    // rua "em obras": continua até a borda se a próxima casa estiver vazia
    const opp = { N: 'S', S: 'N', E: 'W', W: 'E' }[conn];
    const [dr, dc] = dirs[opp];
    const nb = at(r + dr, c + dc);
    if (!nb || nb === '.') conn += opp;
  }
  if (conn.length === 0) conn = 'EW';
  return conn;
}

/** Encontra uma divisão das casas ocupadas em dominós (backtracking). */
function tileMap(map, forced) {
  const R = map.length;
  const Cn = map[0].length;
  const used = map.map((row) => row.map((ch) => ch === '.'));
  const pieces = [];
  for (const pair of forced) {
    for (const [r, c] of pair) used[r][c] = true;
    pieces.push(pair);
  }
  const rand = rng(7);
  const solve = () => {
    let r0 = -1;
    let c0 = -1;
    outer: for (let r = 0; r < R; r++) {
      for (let c = 0; c < Cn; c++) {
        if (!used[r][c]) {
          r0 = r;
          c0 = c;
          break outer;
        }
      }
    }
    if (r0 < 0) return true;
    const opts = [
      [r0, c0 + 1],
      [r0 + 1, c0],
    ];
    if (rand() < 0.5) opts.reverse();
    for (const [r, c] of opts) {
      if (r < R && c < Cn && !used[r][c]) {
        used[r0][c0] = used[r][c] = true;
        pieces.push([
          [r0, c0],
          [r, c],
        ]);
        if (solve()) return true;
        used[r0][c0] = used[r][c] = false;
        pieces.pop();
      }
    }
    return false;
  };
  if (!solve()) throw new Error('Mapa sem divisão possível em dominós');
  return pieces;
}

function board({ x, y, P = 60, F = 28, rows, forced = [], labels = true }) {
  const map = parseMap(rows);
  const N = map.length;
  const size = N * P + 2 * F;
  let o = '';
  o += rect(x, y, size, size, { rx: P * 0.38, fill: C.ink, filter: 'url(#shLg)' });
  o += rect(x + P * 0.1, y + P * 0.1, size - P * 0.2, size - P * 0.2, {
    rx: P * 0.32,
    fill: 'none',
    stroke: '#334155',
    'stroke-width': P * 0.035,
  });
  const gx = x + F;
  const gy = y + F;
  o += rect(gx, gy, N * P, N * P, { rx: P * 0.08, fill: C.boardCell });
  for (let i = 1; i < N; i++) {
    o += line(gx + i * P, gy, gx + i * P, gy + N * P, { stroke: '#CBD5E1', 'stroke-width': P * 0.025 });
    o += line(gx, gy + i * P, gx + N * P, gy + i * P, { stroke: '#CBD5E1', 'stroke-width': P * 0.025 });
  }
  if (labels) {
    const fs = Math.max(9, P * 0.2);
    for (let i = 0; i < N; i++) {
      o += text(gx + i * P + P / 2, y + F * 0.68, 'ABCDEFGH'[i], {
        'font-size': fs,
        'font-weight': 700,
        fill: '#64748B',
        'text-anchor': 'middle',
      });
      o += text(x + F * 0.5, gy + i * P + P / 2 + fs * 0.36, String(i + 1), {
        'font-size': fs,
        'font-weight': 700,
        fill: '#64748B',
        'text-anchor': 'middle',
      });
    }
    o += text(x + size / 2, y + size - F * 0.3, 'DOMINÓPOLIS', {
      'font-size': fs * 0.95,
      'font-weight': 800,
      fill: '#94A3B8',
      'text-anchor': 'middle',
      'letter-spacing': P * 0.07,
    });
    o += circle(x + size - F * 0.5, y + size - F * 0.5, P * 0.07, { fill: C.orange });
  }
  const pieces = tileMap(map, forced);
  for (const [[r1, c1], [r2, c2]] of pieces) {
    const cell = (r, c) => ({ t: map[r][c], conn: computeConn(map, r, c), seed: r * 8 + c + 3 });
    const orient = r1 === r2 ? 'h' : 'v';
    o += domino({ x: gx + c1 * P, y: gy + r1 * P, s: P, orient, a: cell(r1, c1), b: cell(r2, c2), shadow: false });
  }
  return o;
}

const CITY = [
  '..BSPP..',
  '.BBSPPB.',
  'SSSSSSSS',
  'PPSXXWBB',
  'PPSPPWBB',
  '.BSSSSP.',
  '...SPPP.',
  '........',
];
const CITY_FORCED = [
  [
    [3, 3],
    [3, 4],
  ],
  [
    [3, 5],
    [4, 5],
  ],
];

/* ------------------------------------------------------------------ */
/* Suporte de madeira                                                  */
/* ------------------------------------------------------------------ */
function rack({ x, y, w, s, faces = [], back = false }) {
  const pieceW = s;
  const pieceH = 2 * s;
  const k = faces.length;
  const gapX = (w - k * pieceW) / (k + 1);
  const lipY = y + pieceH * 0.74;
  const lipH = s * 0.62;
  let o = '';
  o += el('ellipse', { cx: x + w / 2, cy: lipY + lipH * 0.98, rx: w * 0.53, ry: s * 0.2, fill: C.ink, opacity: 0.16 });
  if (!back) {
    o += rect(x + s * 0.12, y + pieceH * 0.34, w - s * 0.24, pieceH * 0.5, { rx: s * 0.1, fill: 'url(#woodBack)' });
    faces.forEach((f, i) => {
      const px = x + gapX + i * (pieceW + gapX);
      o += `<g transform="translate(${n(px)} ${n(y)})">${domino({ x: 0, y: 0, s, orient: 'v', a: f[0], b: f[1], rot: (i - (k - 1) / 2) * 1.2 })}</g>`;
    });
  } else {
    faces.forEach((_, i) => {
      const px = x + gapX + i * (pieceW + gapX);
      o += dominoBack({ x: px, y, s, orient: 'v', rot: (i - (k - 1) / 2) * 1.5 });
    });
  }
  // aba frontal
  o += rect(x, lipY, w, lipH, { rx: s * 0.14, fill: 'url(#wood)' });
  o += line(x + s * 0.2, lipY + s * 0.08, x + w - s * 0.2, lipY + s * 0.08, {
    stroke: '#fff',
    'stroke-opacity': 0.35,
    'stroke-width': s * 0.04,
    'stroke-linecap': 'round',
  });
  const r = rng(Math.round(w + s));
  for (let i = 0; i < 4; i++) {
    const gy = lipY + lipH * (0.3 + i * 0.15);
    const x0 = x + w * (0.05 + r() * 0.2);
    const x1 = x + w * (0.7 + r() * 0.25);
    o += path(`M${n(x0)} ${n(gy)} Q${n((x0 + x1) / 2)} ${n(gy + (r() - 0.5) * s * 0.18)} ${n(x1)} ${n(gy)}`, {
      fill: 'none',
      stroke: C.woodDark,
      'stroke-opacity': 0.35,
      'stroke-width': s * 0.025,
      'stroke-linecap': 'round',
    });
  }
  return o;
}

/* ------------------------------------------------------------------ */
/* Cenas                                                               */
/* ------------------------------------------------------------------ */
const S = (conn) => ({ t: 'S', conn });
const P = (seed = 1) => ({ t: 'P', seed });
const B = (seed = 1) => ({ t: 'B', seed });
const Wb = (conn = 'EW') => ({ t: 'W', conn, seed: 3 });
const X = () => ({ t: 'X' });

const scenes = {};

scenes['cidade.svg'] = () =>
  svgDoc(600, 600, 'Cidade de Dominópolis montada no Tabuleiro-Moldura 8x8', board({ x: 32, y: 26, P: 60, F: 28, rows: CITY, forced: CITY_FORCED }));

scenes['pecas-rua.svg'] = () =>
  svgDoc(
    600,
    600,
    'Peças de Rua',
    [
      domino({ x: 36, y: 46, s: 116, a: S('EW'), b: S('EW'), rot: -5 }),
      domino({ x: 404, y: 30, s: 116, orient: 'v', a: S('NS'), b: S('NSE'), rot: 4 }),
      domino({ x: 58, y: 232, s: 116, a: S('NS'), b: P(4), rot: 3 }),
      domino({ x: 40, y: 420, s: 116, a: S('EW'), b: S('WS'), rot: -3 }),
      domino({ x: 384, y: 324, s: 116, orient: 'v', a: S('NS'), b: B(5), rot: -4 }),
    ].join(''),
  );

scenes['pecas-parque.svg'] = () =>
  svgDoc(
    600,
    600,
    'Peças de Parque',
    [
      domino({ x: 40, y: 44, s: 116, a: P(11), b: P(12), rot: -4 }),
      domino({ x: 406, y: 34, s: 116, orient: 'v', a: P(13), b: S('NS'), rot: 5 }),
      domino({ x: 52, y: 236, s: 116, a: P(14), b: B(6), rot: 3 }),
      domino({ x: 36, y: 424, s: 116, a: Wb('EW'), b: P(15), rot: -2 }),
      domino({ x: 386, y: 326, s: 116, orient: 'v', a: X(), b: X(), rot: -5 }),
    ].join(''),
  );

scenes['pecas-predio.svg'] = () =>
  svgDoc(
    600,
    600,
    'Peças de Prédio',
    [
      domino({ x: 36, y: 48, s: 116, a: B(21), b: B(22), rot: 4 }),
      domino({ x: 404, y: 32, s: 116, orient: 'v', a: B(23), b: P(24), rot: -4 }),
      domino({ x: 60, y: 236, s: 116, a: S('EW'), b: B(25), rot: -3 }),
      domino({ x: 40, y: 424, s: 116, a: B(26), b: B(27), rot: 2 }),
      domino({ x: 388, y: 324, s: 116, orient: 'v', a: B(28), b: S('NS'), rot: 5 }),
    ].join(''),
  );

scenes['pecas-ponte.svg'] = () =>
  svgDoc(
    600,
    600,
    'Peças de Ponte, as coringas do jogo',
    [
      domino({ x: 36, y: 96, s: 132, a: Wb('EW'), b: Wb('EW'), rot: -4, shadow: 'shLift' }),
      domino({ x: 428, y: 52, s: 104, orient: 'v', a: Wb('NS'), b: Wb('NS'), rot: 6 }),
      domino({ x: 18, y: 392, s: 94, a: S('EW'), b: S('EW') }),
      domino({ x: 206, y: 392, s: 94, a: Wb('EW'), b: Wb('EW') }),
      domino({ x: 394, y: 392, s: 94, a: P(31), b: P(32) }),
      circle(300, 364, 22, { fill: C.orange, stroke: '#fff', 'stroke-width': 4 }),
      path('M300 352 l3.4 7 7.6 1.1 -5.5 5.4 1.3 7.6 -6.8 -3.6 -6.8 3.6 1.3 -7.6 -5.5 -5.4 7.6 -1.1z', { fill: '#fff' }),
    ].join(''),
  );

scenes['suportes.svg'] = () =>
  svgDoc(
    600,
    600,
    'Suportes de madeira com peças',
    [
      `<g transform="translate(80 40) scale(.8)">`,
      rack({ x: 30, y: 40, w: 520, s: 66, faces: [1, 2, 3, 4, 5].map(() => [0, 0]), back: true }),
      `</g>`,
      rack({
        x: 30,
        y: 270,
        w: 540,
        s: 86,
        faces: [
          [S('NS'), P(41)],
          [B(42), S('NS')],
          [Wb('NS'), Wb('NS')],
          [P(43), B(44)],
          [{ t: 'S', conn: 'NS', mark: 'blitz' }, S('NS')],
        ],
      }),
    ].join(''),
  );

scenes['passo-1.svg'] = () =>
  svgDoc(
    320,
    200,
    'Encaixando peças com terrenos iguais',
    [
      domino({ x: 24, y: 112, s: 62, a: S('EW'), b: P(51) }),
      rect(150, 115.5, 120, 55, { rx: 7, fill: 'none', stroke: C.green, 'stroke-width': 2.5, 'stroke-dasharray': '7 6' }),
      line(148, 118, 148, 168, { stroke: C.green, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.85 }),
      domino({ x: 170, y: 14, s: 62, a: P(52), b: B(53), rot: 9, shadow: 'shLift' }),
      path('M196 92 C182 104 178 112 182 122', { fill: 'none', stroke: C.orange, 'stroke-width': 4, 'stroke-linecap': 'round' }),
      path('M174 116 l8 9 7 -10', { fill: 'none', stroke: C.orange, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    ].join(''),
  );

scenes['passo-2.svg'] = () => {
  const s = 46;
  const ox = 66;
  const oy = 28;
  return svgDoc(
    320,
    200,
    'Parque cercado e descarte de peça',
    [
      domino({ x: ox + s, y: oy, s, a: S('EW'), b: S('EW') }),
      domino({ x: ox, y: oy + s * 0.5, s, orient: 'v', a: S('NS'), b: S('NS') }),
      domino({ x: ox + s, y: oy + s, s, a: P(61), b: P(62) }),
      domino({ x: ox + 3 * s, y: oy + s * 0.5, s, orient: 'v', a: S('NS'), b: S('NS') }),
      domino({ x: ox + s, y: oy + 2 * s, s, a: S('EW'), b: S('EW') }),
      circle(ox + 2 * s, oy + 1.5 * s, 15, { fill: C.green, stroke: '#fff', 'stroke-width': 3 }),
      path(`M${ox + 2 * s - 6.5} ${oy + 1.5 * s} l4.5 4.5 8.5 -9`, {
        fill: 'none',
        stroke: '#fff',
        'stroke-width': 3.2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      dominoBack({ x: 252, y: 26, s: 30, orient: 'v', rot: 24, shadow: 'shLift' }),
      path('M236 118 C246 100 252 92 258 84', { fill: 'none', stroke: C.orange, 'stroke-width': 3, 'stroke-dasharray': '5 5', 'stroke-linecap': 'round' }),
      circle(286, 106, 17, { fill: C.orange, stroke: '#fff', 'stroke-width': 3 }),
      text(286, 112, '−1', { 'font-size': 15, 'font-weight': 800, fill: C.ink, 'text-anchor': 'middle' }),
    ].join(''),
  );
};

scenes['passo-3.svg'] = () => {
  const s = 54;
  const px = 160;
  const py = 190;
  const card = (rot, inner) => `<g transform="rotate(${rot} ${px} ${py})">${inner}</g>`;
  return svgDoc(
    320,
    200,
    'Peças de ação: Ponte, Blitz e Guindaste',
    [
      card(-24, domino({ x: px - s / 2, y: 18, s, orient: 'v', a: Wb('NS'), b: Wb('NS') })),
      card(24, domino({ x: px - s / 2, y: 18, s, orient: 'v', a: B(71), b: { t: 'B', seed: 72, mark: 'crane' } })),
      card(0, domino({ x: px - s / 2, y: 8, s, orient: 'v', a: { t: 'S', conn: 'NS', mark: 'blitz' }, b: S('NS'), shadow: 'shLift' })),
    ].join(''),
  );
};

scenes['comp-pecas.svg'] = () => {
  const s = 52;
  return svgDoc(
    400,
    300,
    '40 peças cartonadas de alta espessura',
    [
      // pilha mostrando a espessura
      domino({ x: 236, y: 196, s, a: S('EW'), b: P(81), thick: 9 }),
      domino({ x: 240, y: 178, s, a: B(82), b: S('EW'), thick: 9, rot: 3 }),
      domino({ x: 234, y: 160, s, a: P(83), b: P(84), thick: 9, rot: -2 }),
      domino({ x: 30, y: 26, s, a: X(), b: X(), rot: -6 }),
      domino({ x: 160, y: 18, s, orient: 'v', a: Wb('NS'), b: Wb('NS'), rot: 8 }),
      domino({ x: 240, y: 30, s, a: { t: 'S', conn: 'EW', mark: 'blitz' }, b: S('EW'), rot: 5 }),
      domino({ x: 22, y: 128, s, a: B(85), b: { t: 'B', seed: 86, mark: 'crane' }, rot: 4 }),
      domino({ x: 50, y: 210, s, a: P(87), b: B(88), rot: -3 }),
    ].join(''),
  );
};

scenes['comp-tabuleiro.svg'] = () =>
  svgDoc(
    400,
    300,
    'Tabuleiro-Moldura com grade 8x8',
    board({
      x: 72,
      y: 12,
      P: 30,
      F: 14,
      labels: false,
      rows: ['........', '........', '..SSPP..', '..PXX...', '..PBS...', '...BS...', '........', '........'],
      forced: [
        [
          [3, 3],
          [3, 4],
        ],
      ],
    }),
  );

scenes['comp-suportes.svg'] = () =>
  svgDoc(
    400,
    300,
    '4 suportes de madeira',
    [
      `<g transform="translate(40 2) scale(.62)">`,
      rack({ x: 30, y: 40, w: 460, s: 62, faces: [1, 2, 3, 4].map(() => 0), back: true }),
      `</g>`,
      rack({
        x: 34,
        y: 108,
        w: 332,
        s: 56,
        faces: [
          [S('NS'), B(91)],
          [P(92), P(93)],
          [B(94), S('NS')],
          [Wb('NS'), Wb('NS')],
        ],
      }),
    ].join(''),
  );

scenes['comp-guia.svg'] = () => {
  const panel = (x, y, w, h, skew, inner) =>
    `<g transform="translate(${x} ${y}) skewY(${skew})">${rect(0, 0, w, h, { rx: 6, fill: '#fff', stroke: '#E2E8F0', 'stroke-width': 1.5 })}${inner}</g>`;
  const bars = (x, y, widths) => widths.map((w, i) => rect(x, y + i * 14, w, 6, { rx: 3, fill: '#CBD5E1' })).join('');
  const stepDot = (x, y, k) =>
    circle(x, y, 10, { fill: C.green }) + text(x, y + 4.5, String(k), { 'font-size': 12, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle' });
  return svgDoc(
    400,
    300,
    'Guia rápido de regras',
    [
      el('ellipse', { cx: 200, cy: 266, rx: 150, ry: 14, fill: C.ink, opacity: 0.12 }),
      `<g filter="url(#shLg)">`,
      panel(
        66,
        58,
        134,
        196,
        -6,
        [
          rect(14, 16, 106, 40, { rx: 6, fill: C.ink }),
          logoMark(38, 36, 30),
          text(58, 33, 'GUIA', { 'font-size': 10, 'font-weight': 800, fill: '#fff' }),
          text(58, 46, 'RÁPIDO', { 'font-size': 10, 'font-weight': 800, fill: '#86EFAC' }),
          bars(14, 74, [100, 84, 96, 60]),
          domino({ x: 22, y: 136, s: 44, a: S('EW'), b: P(97), shadow: false }),
        ].join(''),
      ),
      panel(
        200,
        44,
        134,
        196,
        6,
        [
          stepDot(26, 30, 1),
          bars(44, 24, [72, 56]),
          stepDot(26, 78, 2),
          bars(44, 72, [76, 50]),
          stepDot(26, 126, 3),
          bars(44, 120, [66, 58]),
          rect(14, 156, 106, 24, { rx: 6, fill: '#FFF7ED' }),
          bars(24, 165, [86]),
        ].join(''),
      ),
      `</g>`,
      circle(330, 66, 32, { fill: C.orange, stroke: '#fff', 'stroke-width': 4 }),
      text(330, 64, '2', { 'font-size': 24, 'font-weight': 800, fill: C.ink, 'text-anchor': 'middle' }),
      text(330, 81, 'MIN', { 'font-size': 11, 'font-weight': 800, fill: C.ink, 'text-anchor': 'middle' }),
    ].join(''),
  );
};

function boxArt({ w, h, label, color, mini }) {
  const x = (160 - w) / 2 - 6;
  const y = 160 - h - 22;
  const d = Math.round(w * 0.12);
  let o = el('ellipse', { cx: 80, cy: 146, rx: w * 0.62, ry: 7, fill: C.ink, opacity: 0.18 });
  o += path(`M${x} ${y} l${d} ${-d} h${w} l${-d} ${d} z`, { fill: '#475569' });
  o += path(`M${x + w} ${y} l${d} ${-d} v${h} l${-d} ${d} z`, { fill: C.ink3 });
  o += rect(x, y, w, h, { fill: C.ink });
  const clip = uid('bx');
  o += `<clipPath id="${clip}">${rect(x, y, w, h)}</clipPath><g clip-path="url(#${clip})">`;
  const cs = mini;
  const cols = Math.ceil(w / cs) + 1;
  const rowsArt = [
    'SSSSSSSSSS',
    'PBWPBPBWPB',
  ];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      const t = rowsArt[r][c % 10];
      const cell = t === 'S' ? S('EW') : t === 'W' ? Wb('NS') : { t, seed: r * 10 + c + 2 };
      o += drawCell(cell, x - 4 + c * cs, y + h - (2 - r) * cs, cs);
    }
  }
  o += '</g>';
  o += logoMark(x + w / 2, y + h * 0.26, w * 0.34);
  o += rect(x + w * 0.14, y + h * 0.44, w * 0.72, h * 0.13, { rx: h * 0.03, fill: color });
  o += text(x + w / 2, y + h * 0.535, label, {
    'font-size': h * 0.09,
    'font-weight': 800,
    fill: color === C.orange ? C.ink : '#fff',
    'text-anchor': 'middle',
    'letter-spacing': 0.6,
  });
  return o;
}

scenes['thumb-pocket.svg'] = () =>
  svgDoc(160, 160, 'Caixa da Edição Pocket', boxArt({ w: 82, h: 92, label: 'POCKET', color: C.orange, mini: 16 }));

scenes['thumb-completa.svg'] = () =>
  svgDoc(160, 160, 'Caixa da Edição Completa', boxArt({ w: 118, h: 100, label: 'COMPLETA', color: C.green, mini: 18 }));

scenes['logo-mark.svg'] = () => svgDoc(48, 28, 'Dominópolis', logoMark(24, 14, 48).replace(/<g transform="translate\(0 0\) scale\(1\)">/, '<g>'));

/* ------------------------------------------------------------------ */
mkdirSync(OUT, { recursive: true });
for (const [file, make] of Object.entries(scenes)) {
  writeFileSync(join(OUT, file), make());
  console.log('✓', file);
}
