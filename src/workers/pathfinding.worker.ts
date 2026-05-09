import type { Graph, GraphNode, AdjEntry, PathResult, AlgorithmName } from '../types'
import { dijkstra } from '../algorithms/dijkstra'
import { astar } from '../algorithms/astar'
import { batchSSSP } from '../algorithms/batch-sssp'

// Plain-object representation of Graph for postMessage transfer
export interface SerializedGraph {
  nodes: Record<string, GraphNode>
  adj: Record<string, AdjEntry[]>
}

export type WorkerRequest = {
  type: 'run'
  graph: SerializedGraph
  source: string
  target: string
  algorithms: AlgorithmName[]
}

export type WorkerResponse = {
  type: 'results'
  results: Record<string, PathResult>
}

function deserializeGraph(serialized: SerializedGraph): Graph {
  const nodes = new Map<string, GraphNode>()
  for (const [id, node] of Object.entries(serialized.nodes)) {
    nodes.set(id, node)
  }

  const adj = new Map<string, AdjEntry[]>()
  for (const [id, edges] of Object.entries(serialized.adj)) {
    adj.set(id, edges)
  }

  return { nodes, adj }
}

const ALGO_FNS: Record<AlgorithmName, (g: Graph, s: string, t: string) => PathResult> = {
  dijkstra,
  astar,
  'batch-sssp': batchSSSP,
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, graph: serializedGraph, source, target, algorithms } = e.data

  if (type !== 'run') return

  const graph = deserializeGraph(serializedGraph)
  const results: Record<string, PathResult> = {}

  for (const algoName of algorithms) {
    const fn = ALGO_FNS[algoName]
    if (fn) {
      results[algoName] = fn(graph, source, target)
    }
  }

  const response: WorkerResponse = { type: 'results', results }
  self.postMessage(response)
}
