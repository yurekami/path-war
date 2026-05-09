import { buildGraphFromOSM } from '../algorithms/graph'
import type { Graph } from '../types'

const STATIC_DATA: Record<string, string> = {
  '40.7,-74.018,40.735,-73.972': '/data/lower-manhattan.json',
}

const OVERPASS_URLS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const STORAGE_KEY = 'sssp-graph-v1'

export interface BBox {
  south: number
  west: number
  north: number
  east: number
  label: string
}

export const PRESETS: BBox[] = [
  { south: 40.700, west: -74.018, north: 40.735, east: -73.972, label: 'Lower Manhattan' },
  { south: 40.758, west: -73.990, north: 40.775, east: -73.965, label: 'Midtown Manhattan' },
  { south: 48.845, west: 2.330, north: 48.870, east: 2.370, label: 'Paris (Latin Quarter)' },
  { south: 51.500, west: -0.140, north: 51.520, east: -0.100, label: 'London (Westminster)' },
  { south: 1.280, west: 103.840, north: 1.310, east: 103.870, label: 'Singapore (Marina Bay)' },
]

export async function fetchRoadGraph(
  bbox: BBox,
  onProgress?: (msg: string) => void,
): Promise<Graph> {
  const cacheKey = `${STORAGE_KEY}-${bbox.south}-${bbox.west}-${bbox.north}-${bbox.east}`

  onProgress?.('Checking cache...')
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    onProgress?.('Building graph from cache...')
    const elements = JSON.parse(cached)
    const graph = buildGraphFromOSM(elements)
    onProgress?.(`Loaded ${graph.nodes.size} nodes from cache`)
    return graph
  }

  const query = `
[out:json][timeout:30];
way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
(._;>;);
out body;
`

  let resp: Response | null = null
  for (const url of OVERPASS_URLS) {
    onProgress?.(`Fetching road network from ${new URL(url).hostname}...`)
    try {
      resp = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (resp.ok) break
    } catch {
      continue
    }
  }

  if (!resp || !resp.ok) {
    onProgress?.('API failed, loading bundled data...')
    const staticFile = STATIC_DATA[`${bbox.south},${bbox.west},${bbox.north},${bbox.east}`]
    if (staticFile) {
      const staticResp = await fetch(staticFile)
      const staticData = await staticResp.json()
      const graph = buildGraphFromOSM(staticData.elements)
      onProgress?.(`Loaded ${graph.nodes.size} nodes from bundled data`)
      return graph
    }
    throw new Error('All Overpass API mirrors failed and no bundled data available')
  }

  onProgress?.('Parsing response...')
  const data = await resp.json()

  try {
    localStorage.setItem(cacheKey, JSON.stringify(data.elements))
  } catch {
    // localStorage full — continue without caching
  }

  onProgress?.('Building graph...')
  const graph = buildGraphFromOSM(data.elements)
  onProgress?.(`Loaded ${graph.nodes.size} intersections, ready`)
  return graph
}
