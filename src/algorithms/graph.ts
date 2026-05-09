import type { Graph, GraphNode, AdjEntry } from '../types'

export function createEmptyGraph(): Graph {
  return { nodes: new Map(), adj: new Map() }
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLng = (lng2 - lng1) * toRad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestNode(graph: Graph, lat: number, lng: number): string | null {
  let bestId: string | null = null
  let bestDist = Infinity
  for (const [id, node] of graph.nodes) {
    const d = haversine(lat, lng, node.lat, node.lng)
    if (d < bestDist) {
      bestDist = d
      bestId = id
    }
  }
  return bestId
}

interface OSMElement {
  type: string
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, string>
}

export function buildGraphFromOSM(elements: OSMElement[]): Graph {
  const nodes = new Map<string, GraphNode>()
  const adj = new Map<string, AdjEntry[]>()

  for (const el of elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(String(el.id), { id: String(el.id), lat: el.lat, lng: el.lon })
    }
  }

  for (const el of elements) {
    if (el.type !== 'way' || !el.nodes) continue
    const wayNodes = el.nodes.map(String)
    const isOneway = el.tags?.oneway === 'yes'

    for (let i = 0; i < wayNodes.length - 1; i++) {
      const fromId = wayNodes[i]
      const toId = wayNodes[i + 1]
      const from = nodes.get(fromId)
      const to = nodes.get(toId)
      if (!from || !to) continue

      const dist = haversine(from.lat, from.lng, to.lat, to.lng)

      if (!adj.has(fromId)) adj.set(fromId, [])
      adj.get(fromId)!.push({ to: toId, weight: dist })

      if (!isOneway) {
        if (!adj.has(toId)) adj.set(toId, [])
        adj.get(toId)!.push({ to: fromId, weight: dist })
      }
    }
  }

  const connectedIds = new Set<string>()
  for (const [fromId, edges] of adj) {
    connectedIds.add(fromId)
    for (const e of edges) connectedIds.add(e.to)
  }

  const connectedNodes = new Map<string, GraphNode>()
  for (const id of connectedIds) {
    const node = nodes.get(id)
    if (node) connectedNodes.set(id, node)
  }

  return { nodes: connectedNodes, adj }
}
