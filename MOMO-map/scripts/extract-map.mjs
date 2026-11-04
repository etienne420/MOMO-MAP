#!/usr/bin/env node
/**
 * extract-map.mjs
 *
 * Parses an Inkscape floor SVG (e.g. map/Etage3.svg) and extracts:
 *   - rooms  : from the "Classes" layer (layer2) — rects & paths with ids like B-3300, E-7.2-3, WC-F-3.1
 *   - edges  : from the "Path" layer (layer4) — polylines that form the walkable graph
 *   - nodes  : junctions (shared endpoints) + door nodes (nearest corridor point to each room)
 *
 * Outputs:
 *   map/path.json   — raw parsed polylines + rooms (human-readable intermediate)
 *   map/graph.json  — { nodes, edges, rooms } ready to push to MongoDB
 *
 * Usage:
 *   node scripts/extract-map.mjs [--svg map/Etage3.svg] [--floor 3] [--tolerance 2]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP_DIR = resolve(__dirname, '..', 'map');

// ---------- CLI args ----------
function parseArgs(argv) {
  const args = { svg: resolve(MAP_DIR, 'Etage3.svg'), floor: 3, tolerance: 2 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--svg') args.svg = resolve(process.cwd(), argv[++i]);
    else if (a === '--floor') args.floor = Number(argv[++i]);
    else if (a === '--tolerance') args.tolerance = Number(argv[++i]);
  }
  return args;
}

// ---------- SVG helpers ----------
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
});

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Parse a translate(x,y) / matrix(...) transform string into {a,b,c,d,e,f}. */
function parseTransform(str) {
  const m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  if (!str) return m;
  const re = /(translate|matrix|scale)\s*\(([^)]*)\)/g;
  let match;
  while ((match = re.exec(str))) {
    const kind = match[1];
    const nums = match[2].split(/[\s,]+/).filter(Boolean).map(Number);
    if (kind === 'translate') {
      m.e += nums[0] || 0;
      m.f += nums[1] || 0;
    } else if (kind === 'scale') {
      m.a *= nums[0] ?? 1;
      m.d *= nums[1] ?? nums[0] ?? 1;
    } else if (kind === 'matrix') {
      const [a, b, c, d, e, f] = nums;
      const n = {
        a: m.a * a + m.c * b,
        b: m.b * a + m.d * b,
        c: m.a * c + m.c * d,
        d: m.b * c + m.d * d,
        e: m.a * e + m.c * f + m.e,
        f: m.b * e + m.d * f + m.f,
      };
      Object.assign(m, n);
    }
  }
  return m;
}

function applyTransform(m, [x, y]) {
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}

/** Minimal SVG path parser: M m L l H h V v Z z (all that layer4 uses). */
function parsePathData(d) {
  const tokens = d.match(/[MmLlHhVvZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const points = [];
  let i = 0;
  let cmd = null;
  let cx = 0, cy = 0;
  let startX = 0, startY = 0;

  const num = () => Number(tokens[i++]);

  while (i < tokens.length) {
    if (/[MmLlHhVvZz]/.test(tokens[i])) cmd = tokens[i++];
    if (!cmd) break;
    switch (cmd) {
      case 'M': cx = num(); cy = num(); startX = cx; startY = cy; points.push([cx, cy]); cmd = 'L'; break;
      case 'm': cx += num(); cy += num(); startX = cx; startY = cy; points.push([cx, cy]); cmd = 'l'; break;
      case 'L': cx = num(); cy = num(); points.push([cx, cy]); break;
      case 'l': cx += num(); cy += num(); points.push([cx, cy]); break;
      case 'H': cx = num(); points.push([cx, cy]); break;
      case 'h': cx += num(); points.push([cx, cy]); break;
      case 'V': cy = num(); points.push([cx, cy]); break;
      case 'v': cy += num(); points.push([cx, cy]); break;
      case 'Z':
      case 'z':
        cx = startX; cy = startY;
        points.push([cx, cy]);
        cmd = null;
        break;
      default:
        i++;
    }
  }
  return points;
}

// ---------- Layer extraction ----------
function findLayer(groups, id) {
  for (const g of groups) {
    if (g['@_id'] === id) return g;
  }
  return null;
}

function collectShapes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('@_')) continue;
    for (const child of asArray(val)) {
      if (key === 'rect' || key === 'path') out.push({ tag: key, el: child });
      else if (typeof child === 'object') collectShapes(child, out);
    }
  }
  return out;
}

function styleFill(style) {
  if (!style) return null;
  const m = /fill:\s*(#[0-9a-fA-F]{3,8})/.exec(style);
  return m ? m[1].toLowerCase() : null;
}

const FILL_TO_TYPE = {
  '#00a41f': 'classroom',
  '#a76e00': 'stairs',
  '#6700a4': 'wc-f',
  '#0200a4': 'wc-m',
};

function extractRooms(layer, transform) {
  const rooms = [];
  for (const { tag, el } of collectShapes(layer)) {
    const id = el['@_id'];
    if (!id) continue;
    const fill = styleFill(el['@_style']);
    const type = FILL_TO_TYPE[fill] || 'unknown';
    let polygon = [];
    if (tag === 'rect') {
      const x = Number(el['@_x'] || 0);
      const y = Number(el['@_y'] || 0);
      const w = Number(el['@_width'] || 0);
      const h = Number(el['@_height'] || 0);
      polygon = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    } else if (tag === 'path') {
      polygon = parsePathData(el['@_d'] || '');
    }
    if (polygon.length < 3) continue;
    const world = polygon.map((p) => applyTransform(transform, p));
    const cx = world.reduce((s, p) => s + p[0], 0) / world.length;
    const cy = world.reduce((s, p) => s + p[1], 0) / world.length;
    rooms.push({ id, type, polygon: world, center: [cx, cy] });
  }
  return rooms;
}

function extractPaths(layer, transform) {
  const paths = [];
  for (const { tag, el } of collectShapes(layer)) {
    if (tag !== 'path') continue;
    const pts = parsePathData(el['@_d'] || '');
    if (pts.length < 2) continue;
    paths.push({
      id: el['@_id'] || null,
      points: pts.map((p) => applyTransform(transform, p)),
    });
  }
  return paths;
}

// ---------- Graph building ----------
function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function buildGraph(paths, rooms, tolerance) {
  const nodes = [];
  const edges = [];

  const findOrCreateNode = (pt) => {
    for (const n of nodes) {
      if (dist(n.xy, pt) <= tolerance) return n;
    }
    const n = { id: `n${nodes.length}`, xy: pt, type: 'junction' };
    nodes.push(n);
    return n;
  };

  // 1. Corridor edges from layer4 polylines
  for (const p of paths) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const a = findOrCreateNode(p.points[i]);
      const b = findOrCreateNode(p.points[i + 1]);
      if (a.id === b.id) continue;
      edges.push({
        id: `e${edges.length}`,
        from: a.id,
        to: b.id,
        weight: dist(a.xy, b.xy),
        source: p.id,
      });
    }
  }

  // 2. Door nodes: nearest corridor node to each room center
  for (const room of rooms) {
    let best = null;
    let bestD = Infinity;
    for (const n of nodes) {
      const d = dist(n.xy, room.center);
      if (d < bestD) { bestD = d; best = n; }
    }
    if (!best) continue;
    const door = {
      id: `d${room.id}`,
      xy: room.center,
      type: 'door',
      roomId: room.id,
    };
    nodes.push(door);
    edges.push({
      id: `e${edges.length}`,
      from: door.id,
      to: best.id,
      weight: bestD,
      source: 'door-link',
    });
    room.doorNode = door.id;
  }

  return { nodes, edges };
}

// ---------- Main ----------
function main() {
  const args = parseArgs(process.argv);
  const xml = readFileSync(args.svg, 'utf8');
  const doc = parser.parse(xml);

  const svg = doc.svg;
  const layer1 = asArray(svg.g).find((g) => g['@_id'] === 'layer1');
  if (!layer1) throw new Error('layer1 not found');

  const layer1T = parseTransform(layer1['@_transform']);
  const groups = asArray(layer1.g);

  const layer2 = findLayer(groups, 'layer2');
  const layer4 = findLayer(groups, 'layer4');
  if (!layer2) throw new Error('layer2 (Classes) not found');
  if (!layer4) throw new Error('layer4 (Path) not found');

  const layer2T = parseTransform(layer2['@_transform']);
  const layer4T = parseTransform(layer4['@_transform']);

  // Compose layer1 ∘ layerN
  const compose = (outer, inner) => ({
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f,
  });

  const rooms = extractRooms(layer2, compose(layer1T, layer2T));
  const paths = extractPaths(layer4, compose(layer1T, layer4T));

  const { nodes, edges } = buildGraph(paths, rooms, args.tolerance);

  const pathJson = {
    floor: args.floor,
    source: args.svg,
    rooms: rooms.map((r) => ({
      id: r.id,
      type: r.type,
      center: r.center,
      polygon: r.polygon,
      doorNode: r.doorNode || null,
    })),
    paths,
  };

  const graphJson = {
    floor: args.floor,
    nodes: nodes.map((n) => ({
      _id: n.id,
      floor: args.floor,
      x: n.xy[0],
      y: n.xy[1],
      type: n.type,
      roomId: n.roomId || null,
    })),
    edges: edges.map((e) => ({
      _id: e.id,
      floor: args.floor,
      from: e.from,
      to: e.to,
      weight: e.weight,
      source: e.source,
    })),
    rooms: rooms.map((r) => ({
      _id: r.id,
      floor: args.floor,
      label: r.id,
      type: r.type,
      center: r.center,
      polygon: r.polygon,
      doorNode: r.doorNode || null,
    })),
  };

  writeFileSync(resolve(MAP_DIR, 'path.json'), JSON.stringify(pathJson, null, 2));
  writeFileSync(resolve(MAP_DIR, 'graph.json'), JSON.stringify(graphJson, null, 2));

  console.log(`floor ${args.floor}: ${rooms.length} rooms, ${paths.length} paths, ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`wrote ${resolve(MAP_DIR, 'path.json')}`);
  console.log(`wrote ${resolve(MAP_DIR, 'graph.json')}`);
}

main();
