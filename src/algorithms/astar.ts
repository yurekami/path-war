import type { Graph, PathResult, AlgoStep } from '../types'
import { haversine } from './graph'
import { MinHeap } from './min-heap'

export function astar(graph: Graph, source: string, target: string): PathResult {
  const t0 = performance.now()
  const targetNode = graph.nodes.get(target)
  if (!targetNode) return emptyResult()

  const gScore = new Map<string, number>()
  const prev = new Map<string, string>()
  const settled = new Set<string>()
  const steps: AlgoStep[] = []
  let edgesRelaxed = 0
  let stepNum = 0

  const pq = new MinHeap<string>()
  gScore.set(source, 0)
  const srcNode = graph.nodes.get(source)!
  pq.push(haversine(srcNode.lat, srcNode.lng, targetNode.lat, targetNode.lng), source)

  while (pq.size > 0) {
    const { value: u } = pq.pop()!

    if (settled.has(u)) continue
    settled.add(u)

    const g = gScore.get(u)!
    steps.push({ kind: 'settle', nodeId: u, dist: g, step: stepNum++ })

    if (u === target) break

    for (const { to, weight } of graph.adj.get(u) ?? []) {
      edgesRelaxed++
      const tentative = g + weight
      if (tentative < (gScore.get(to) ?? Infinity)) {
        gScore.set(to, tentative)
        prev.set(to, u)
        const toNode = graph.nodes.get(to)!
        const h = haversine(toNode.lat, toNode.lng, targetNode.lat, targetNode.lng)
        pq.push(tentative + h, to)
        steps.push({ kind: 'relax', nodeId: to, dist: tentative, step: stepNum++ })
      }
    }
  }

  return {
    path: reconstructPath(prev, source, target),
    dist: gScore.get(target) ?? Infinity,
    steps,
    stats: {
      nodesExplored: settled.size,
      edgesRelaxed,
      comparisons: pq.comparisons + edgesRelaxed,
      timeMs: performance.now() - t0,
    },
  }
}

function reconstructPath(
  prev: Map<string, string>,
  source: string,
  target: string,
): string[] {
  const path: string[] = []
  let cur: string | undefined = target
  while (cur && cur !== source) {
    path.unshift(cur)
    cur = prev.get(cur)
  }
  if (cur === source) path.unshift(source)
  else return []
  return path
}

function emptyResult(): PathResult {
  return {
    path: [],
    dist: Infinity,
    steps: [],
    stats: { nodesExplored: 0, edgesRelaxed: 0, comparisons: 0, timeMs: 0 },
  }
}
