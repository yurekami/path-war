export interface GraphNode {
  id: string
  lat: number
  lng: number
}

export interface AdjEntry {
  to: string
  weight: number
}

export interface Graph {
  nodes: Map<string, GraphNode>
  adj: Map<string, AdjEntry[]>
}

export type StepKind = 'visit' | 'relax' | 'settle' | 'batch-start' | 'batch-end' | 'pivot'

export interface AlgoStep {
  kind: StepKind
  nodeId: string
  dist: number
  step: number
  batchId?: number
}

export interface PathResult {
  path: string[]
  dist: number
  steps: AlgoStep[]
  stats: {
    nodesExplored: number
    edgesRelaxed: number
    comparisons: number
    timeMs: number
  }
}

export type AlgorithmName = 'dijkstra' | 'astar' | 'batch-sssp'

export interface AlgorithmDef {
  name: AlgorithmName
  label: string
  color: string
  glowColor: string
  enabled: boolean
}

export const ALGORITHMS: AlgorithmDef[] = [
  { name: 'dijkstra', label: 'Dijkstra (1956)', color: '#ef4444', glowColor: '#fca5a5', enabled: true },
  { name: 'astar', label: 'A* Search', color: '#f59e0b', glowColor: '#fde68a', enabled: true },
  { name: 'batch-sssp', label: 'Duan et al. (2025)', color: '#06b6d4', glowColor: '#67e8f9', enabled: true },
]
