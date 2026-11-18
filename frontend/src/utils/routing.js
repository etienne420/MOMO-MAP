// utils/routing.js
// Calcul d'itinéraire entre deux locaux sur le réseau de couloirs du plan.
// Le graphe est construit à partir du vecteur #momo-corridor-path de MAP-FINAL.svg,
// et les pins (#momo-pins-layer) servent de points d'entrée / sortie (portes des locaux).
import mapSvgRaw from '../assets/map/MAP-FINAL.svg?raw'
import roomsData from '../assets/map/momo-main-rooms.json'

const SNAP = 0.5 // tolérance (unités SVG) pour fusionner deux extrémités identiques
const JUNCTION_TOLERANCE = 0.8 // un point à moins de ça d'un segment est une jonction en T

// --- Lecture du vecteur de couloirs -------------------------------------------------

function extractCorridorD(svg) {
  const tag = svg.match(/<path[^>]*id="momo-corridor-path"[^>]*>/)
  if (!tag) return ''
  const d = tag[0].match(/\sd="([^"]+)"/)
  return d ? d[1] : ''
}

// Transforme un attribut "d" (M, L, H, V, Z, absolus ou relatifs) en liste de segments
function parsePathSegments(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []
  const segments = []
  let i = 0
  let cmd = null
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  const num = () => parseFloat(tokens[i++])

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++]
      if (cmd === 'Z' || cmd === 'z') {
        if (x !== startX || y !== startY) segments.push([x, y, startX, startY])
        x = startX
        y = startY
      }
      continue
    }
    const rel = cmd === cmd.toLowerCase()
    switch (cmd.toUpperCase()) {
      case 'M': {
        const nx = num()
        const ny = num()
        x = rel ? x + nx : nx
        y = rel ? y + ny : ny
        startX = x
        startY = y
        cmd = rel ? 'l' : 'L' // coordonnées suivantes = lignes implicites
        break
      }
      case 'L': {
        const nx = num()
        const ny = num()
        const tx = rel ? x + nx : nx
        const ty = rel ? y + ny : ny
        segments.push([x, y, tx, ty])
        x = tx
        y = ty
        break
      }
      case 'H': {
        const nx = num()
        const tx = rel ? x + nx : nx
        segments.push([x, y, tx, y])
        x = tx
        break
      }
      case 'V': {
        const ny = num()
        const ty = rel ? y + ny : ny
        segments.push([x, y, x, ty])
        y = ty
        break
      }
      default:
        i++ // commande non gérée (courbes) : on ignore
    }
  }
  return segments
}

function project(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  const x = a.x + t * dx
  const y = a.y + t * dy
  return { x, y, t, dist: Math.hypot(p.x - x, p.y - y) }
}

// --- Graphe de base (nœuds = intersections / coins du couloir) ---------------------

function buildBaseGraph(segments) {
  const nodes = []
  const index = new Map()
  const nodeId = (x, y) => {
    const key = `${Math.round(x / SNAP)},${Math.round(y / SNAP)}`
    let id = index.get(key)
    if (id === undefined) {
      id = nodes.length
      nodes.push({ x, y })
      index.set(key, id)
    }
    return id
  }

  const raw = segments
    .map(([x1, y1, x2, y2]) => [nodeId(x1, y1), nodeId(x2, y2)])
    .filter(([a, b]) => a !== b)

  // Coupe les segments aux jonctions en T (une extrémité posée au milieu d'un autre segment)
  const edges = []
  for (const [a, b] of raw) {
    const inner = []
    nodes.forEach((n, i) => {
      if (i === a || i === b) return
      const pr = project(n, nodes[a], nodes[b])
      if (pr.dist < JUNCTION_TOLERANCE && pr.t > 0.001 && pr.t < 0.999) inner.push({ i, t: pr.t })
    })
    inner.sort((p, q) => p.t - q.t)
    const chain = [a, ...inner.map((p) => p.i), b]
    for (let k = 0; k < chain.length - 1; k++) edges.push([chain[k], chain[k + 1]])
  }
  return { nodes, edges }
}

const BASE_GRAPH = buildBaseGraph(parsePathSegments(extractCorridorD(mapSvgRaw)))

// --- Index des locaux et des portes ------------------------------------------------

const normalize = (s) => String(s || '').trim().toLowerCase()
const compact = (s) => normalize(s).replace(/[\s_\-–—.]/g, '')

const ROOMS_BY_KEY = new Map()
const ROOMS_BY_COMPACT = new Map()
for (const room of roomsData.rooms) {
  if (!room.id || room.type === 'wall') continue
  ROOMS_BY_KEY.set(normalize(room.id), room)
  if (!ROOMS_BY_COMPACT.has(compact(room.id))) ROOMS_BY_COMPACT.set(compact(room.id), room)
}

const PINS_BY_ROOM = new Map()
for (const pin of roomsData.pins || []) {
  if (!pin.roomId) continue
  if (!PINS_BY_ROOM.has(pin.roomId)) PINS_BY_ROOM.set(pin.roomId, [])
  PINS_BY_ROOM.get(pin.roomId).push(pin)
}

// Accepte "a-3133", "A3133", " A-3133 " ...
export function resolveRoom(text) {
  if (!normalize(text)) return null
  return ROOMS_BY_KEY.get(normalize(text)) || ROOMS_BY_COMPACT.get(compact(text)) || null
}

// Points de départ possibles d'un local : ses portes (pins), sinon son centre
function roomAnchors(room) {
  const pins = PINS_BY_ROOM.get(room.id)
  if (pins?.length) return pins.map((p) => ({ x: p.cx, y: p.cy }))
  return [{ x: room.cx, y: room.cy }]
}

// --- Plus court chemin (Dijkstra) --------------------------------------------------

function shortestPath(startPoints, endPoints) {
  const { nodes, edges } = BASE_GRAPH
  if (edges.length === 0) return null

  const all = nodes.slice()
  const attachments = new Map() // index d'arête -> [{ t, id }]

  // Accroche un point (porte) au couloir le plus proche : un nœud pour la porte,
  // un nœud pour sa projection sur le couloir.
  const anchor = (p) => {
    let best = null
    edges.forEach(([a, b], ei) => {
      const pr = project(p, nodes[a], nodes[b])
      if (!best || pr.dist < best.pr.dist) best = { ei, pr }
    })
    const projId = all.length
    all.push({ x: best.pr.x, y: best.pr.y })
    if (!attachments.has(best.ei)) attachments.set(best.ei, [])
    attachments.get(best.ei).push({ t: best.pr.t, id: projId })
    const pointId = all.length
    all.push({ x: p.x, y: p.y })
    return { pointId, projId }
  }

  const starts = startPoints.map(anchor)
  const ends = endPoints.map(anchor)

  const adj = all.map(() => [])
  const link = (i, j) => {
    const w = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)
    adj[i].push([j, w])
    adj[j].push([i, w])
  }

  edges.forEach(([a, b], ei) => {
    const list = attachments.get(ei)
    if (!list) {
      link(a, b)
      return
    }
    list.sort((p, q) => p.t - q.t)
    const chain = [a, ...list.map((p) => p.id), b]
    for (let k = 0; k < chain.length - 1; k++) link(chain[k], chain[k + 1])
  })
  for (const s of starts) link(s.pointId, s.projId)
  for (const e of ends) link(e.pointId, e.projId)

  // Super-source / super-puits pour tester toutes les portes d'un coup
  const SRC = all.length
  const SNK = all.length + 1
  adj.push([], [])
  for (const s of starts) adj[SRC].push([s.pointId, 0])
  for (const e of ends) adj[e.pointId].push([SNK, 0])

  const n = adj.length
  const dist = new Array(n).fill(Infinity)
  const prev = new Array(n).fill(-1)
  const done = new Array(n).fill(false)
  dist[SRC] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i
    if (u === -1 || dist[u] === Infinity) break
    if (u === SNK) break
    done[u] = true
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        prev[v] = u
      }
    }
  }
  if (dist[SNK] === Infinity) return null

  const ids = []
  for (let u = prev[SNK]; u !== -1 && u !== SRC; u = prev[u]) ids.push(u)
  ids.reverse()

  const points = []
  for (const id of ids) {
    const p = all[id]
    const last = points[points.length - 1]
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.01) points.push({ x: p.x, y: p.y })
  }
  return { points, length: dist[SNK] }
}

// --- API publique ------------------------------------------------------------------

// Retourne { fromId, toId, points: [{x,y}], length, bounds } ou { error }
export function findRoute(fromText, toText) {
  const from = resolveRoom(fromText)
  if (!from) return { error: `Local introuvable : ${String(fromText).trim()}` }
  const to = resolveRoom(toText)
  if (!to) return { error: `Local introuvable : ${String(toText).trim()}` }
  if (from.id === to.id) return { error: 'Le départ et la destination sont le même local.' }

  const result = shortestPath(roomAnchors(from), roomAnchors(to))
  if (!result || result.points.length < 2) return { error: 'Aucun trajet trouvé entre ces locaux.' }

  const xs = result.points.map((p) => p.x)
  const ys = result.points.map((p) => p.y)
  return {
    fromId: from.id,
    toId: to.id,
    points: result.points,
    length: result.length,
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
  }
}
