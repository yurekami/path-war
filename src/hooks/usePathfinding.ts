import { useState, useCallback, useEffect, useRef } from 'react'
import type { Graph, PathResult, AlgorithmName } from '../types'
import type { SerializedGraph, WorkerRequest, WorkerResponse } from '../workers/pathfinding.worker'

function serializeGraph(graph: Graph): SerializedGraph {
  const nodes: SerializedGraph['nodes'] = {}
  for (const [id, node] of graph.nodes) {
    nodes[id] = node
  }

  const adj: SerializedGraph['adj'] = {}
  for (const [id, edges] of graph.adj) {
    adj[id] = edges
  }

  return { nodes, adj }
}

export interface UsePathfindingResult {
  results: Map<string, PathResult>
  isComputing: boolean
  runAlgorithms: (
    graph: Graph,
    source: string,
    target: string,
    algorithms: AlgorithmName[],
  ) => void
}

export function usePathfinding(): UsePathfindingResult {
  const [results, setResults] = useState<Map<string, PathResult>>(new Map())
  const [isComputing, setIsComputing] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/pathfinding.worker.ts', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type !== 'results') return

      const newResults = new Map<string, PathResult>()
      for (const [algoName, result] of Object.entries(e.data.results)) {
        newResults.set(algoName, result)
      }

      setResults(newResults)
      setIsComputing(false)
    }

    worker.onerror = (err) => {
      console.error('Pathfinding worker error:', err)
      setIsComputing(false)
    }

    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const runAlgorithms = useCallback(
    (graph: Graph, source: string, target: string, algorithms: AlgorithmName[]) => {
      const worker = workerRef.current
      if (!worker) return

      setIsComputing(true)
      setResults(new Map())

      const serialized = serializeGraph(graph)
      const request: WorkerRequest = {
        type: 'run',
        graph: serialized,
        source,
        target,
        algorithms,
      }

      worker.postMessage(request)
    },
    [],
  )

  return { results, isComputing, runAlgorithms }
}
