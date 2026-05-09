/**
 * Batch SSSP — simplified implementation of the algorithm from:
 *   "Breaking the Sorting Barrier for Directed Single-Source Shortest Paths"
 *    Duan, Mao, Mao, Shu, Yin (2025)  —  arXiv:2504.17033
 *
 * Key ideas faithfully implemented:
 *  1. FindPivots: k rounds of Bellman-Ford relaxation from the frontier
 *     to discover reachable vertices without sorting.
 *  2. Batch extraction via quickselect (O(n) partial sort) instead of
 *     k individual extract-mins from a binary heap (O(k log n)).
 *  3. Batch settlement: settle k vertices simultaneously per round.
 *
 * The full paper uses a recursive BMSSP structure and a two-sequence
 * partial sorting data structure (Lemma 3.3) for tighter bounds.
 * This implementation captures the core insight that produces the
 * distinctive "wave" exploration pattern.
 */

import type { Graph, PathResult, AlgoStep } from '../types'

export function batchSSSP(graph: Graph, source: string, target: string): PathResult {
  const t0 = performance.now()
  const n = graph.nodes.size

  const k = Math.max(12, Math.ceil(Math.pow(Math.log2(n + 1), 1 / 3) * 8))

  const dist = new Map<string, number>()
  const prev = new Map<string, string>()
  const settled = new Set<string>()
  const steps: AlgoStep[] = []
  let comparisons = 0
  let edgesRelaxed = 0
  let stepNum = 0
  let batchNum = 0

  dist.set(source, 0)
  const frontier = new Set<string>([source])

  while (frontier.size > 0 && !settled.has(target)) {
    // ── Phase 1: FindPivots ──
    // Run k rounds of Bellman-Ford relaxation from frontier nodes.
    // This discovers vertices reachable within k hops and improves
    // their distance estimates before we commit to settling anyone.
    let wave = new Set<string>(frontier)

    for (let round = 0; round < k && wave.size > 0; round++) {
      const nextWave = new Set<string>()
      for (const u of wave) {
        const du = dist.get(u) ?? Infinity
        for (const { to, weight } of graph.adj.get(u) ?? []) {
          edgesRelaxed++
          comparisons++
          const nd = du + weight
          if (nd < (dist.get(to) ?? Infinity)) {
            dist.set(to, nd)
            prev.set(to, u)
            if (!settled.has(to)) {
              nextWave.add(to)
              frontier.add(to)
            }
          }
        }
      }
      wave = nextWave
    }

    // ── Phase 2: Batch extraction via partial sort ──
    // Quickselect the k smallest-distance frontier nodes.
    // Cost: O(|frontier|) comparisons, vs k * O(log n) for k heap extract-mins.
    const candidates: Array<{ id: string; d: number }> = []
    for (const nodeId of frontier) {
      if (!settled.has(nodeId)) {
        candidates.push({ id: nodeId, d: dist.get(nodeId) ?? Infinity })
      }
    }

    if (candidates.length === 0) break

    const batchSize = Math.min(k, candidates.length)
    comparisons += quickselectPartition(candidates, 0, candidates.length - 1, batchSize)

    // ── Phase 3: Batch settlement ──
    const currentBatch = batchNum++
    steps.push({
      kind: 'batch-start',
      nodeId: '',
      dist: 0,
      step: stepNum++,
      batchId: currentBatch,
    })

    for (let i = 0; i < batchSize; i++) {
      const { id: nodeId, d } = candidates[i]
      settled.add(nodeId)
      frontier.delete(nodeId)
      steps.push({
        kind: 'settle',
        nodeId,
        dist: d,
        step: stepNum++,
        batchId: currentBatch,
      })

      for (const { to, weight } of graph.adj.get(nodeId) ?? []) {
        edgesRelaxed++
        comparisons++
        const nd = d + weight
        if (nd < (dist.get(to) ?? Infinity)) {
          dist.set(to, nd)
          prev.set(to, nodeId)
          if (!settled.has(to)) {
            frontier.add(to)
            steps.push({ kind: 'relax', nodeId: to, dist: nd, step: stepNum++ })
          }
        }
      }
    }

    steps.push({
      kind: 'batch-end',
      nodeId: '',
      dist: 0,
      step: stepNum++,
      batchId: currentBatch,
    })
  }

  return {
    path: reconstructPath(prev, source, target),
    dist: dist.get(target) ?? Infinity,
    steps,
    stats: {
      nodesExplored: settled.size,
      edgesRelaxed,
      comparisons,
      timeMs: performance.now() - t0,
    },
  }
}

/**
 * Quickselect-based partial sort: rearranges arr so that the k smallest
 * elements are in positions [0..k-1] (unordered among themselves).
 * Returns the number of comparisons made.
 */
function quickselectPartition(
  arr: Array<{ id: string; d: number }>,
  lo: number,
  hi: number,
  k: number,
): number {
  let comps = 0
  if (lo >= hi) return comps

  while (lo < hi) {
    const pivotIdx = lo + ((hi - lo) >> 1)
    const pivotVal = arr[pivotIdx].d
    ;[arr[pivotIdx], arr[hi]] = [arr[hi], arr[pivotIdx]]

    let store = lo
    for (let i = lo; i < hi; i++) {
      comps++
      if (arr[i].d < pivotVal) {
        ;[arr[store], arr[i]] = [arr[i], arr[store]]
        store++
      }
    }
    ;[arr[store], arr[hi]] = [arr[hi], arr[store]]

    if (store === k - 1) break
    if (store < k - 1) lo = store + 1
    else hi = store - 1
  }

  return comps
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
