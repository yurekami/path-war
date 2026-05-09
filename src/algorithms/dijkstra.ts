import type { Graph, PathResult, AlgoStep } from '../types'
import { MinHeap } from './min-heap'

export function dijkstra(graph: Graph, source: string, target: string): PathResult {
  const t0 = performance.now()
  const dist = new Map<string, number>()
  const prev = new Map<string, string>()
  const settled = new Set<string>()
  const steps: AlgoStep[] = []
  let edgesRelaxed = 0
  let stepNum = 0

  const pq = new MinHeap<string>()
  dist.set(source, 0)
  pq.push(0, source)

  while (pq.size > 0) {
    const entry = pq.pop()!
    const u = entry.value
    const d = entry.key

    if (settled.has(u)) continue
    settled.add(u)
    steps.push({ kind: 'settle', nodeId: u, dist: d, step: stepNum++ })

    if (u === target) break

    for (const { to, weight } of graph.adj.get(u) ?? []) {
      edgesRelaxed++
      const nd = d + weight
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd)
        prev.set(to, u)
        pq.push(nd, to)
        steps.push({ kind: 'relax', nodeId: to, dist: nd, step: stepNum++ })
      }
    }
  }

  return {
    path: reconstructPath(prev, source, target),
    dist: dist.get(target) ?? Infinity,
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
