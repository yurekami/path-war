import { useEffect, useRef, useCallback, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { Graph, PathResult } from '../types'
import { ALGORITHMS } from '../types'

interface Props {
  graph: Graph | null
  results: Map<string, PathResult>
  animationProgress: number
  onMapClick: (lat: number, lng: number) => void
  sourceId: string | null
  targetId: string | null
  center: [number, number]
}

interface EdgeSegment {
  path: [number, number][]
}

interface ExploredNode {
  position: [number, number]
}

interface MarkerNode {
  position: [number, number]
  type: 'source' | 'target'
}

const ALGO_COLORS: Record<string, { fill: [number, number, number]; glow: [number, number, number] }> = {
  dijkstra: { fill: [239, 68, 68], glow: [252, 165, 165] },
  astar: { fill: [245, 158, 11], glow: [253, 230, 138] },
  'batch-sssp': { fill: [6, 182, 212], glow: [103, 232, 249] },
}

const MARKER_COLORS: Record<string, [number, number, number]> = {
  source: [34, 197, 94],
  target: [168, 85, 247],
}

export function MapView({
  graph,
  results,
  animationProgress,
  onMapClick,
  sourceId,
  targetId,
  center,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const mapLoadedRef = useRef(false)
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [center[1], center[0]],
      zoom: 14,
      attributionControl: false,
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('click', (e) => {
      onMapClickRef.current(e.lngLat.lat, e.lngLat.lng)
    })

    const overlay = new MapboxOverlay({ layers: [] })
    map.addControl(overlay as unknown as maplibregl.IControl)
    overlayRef.current = overlay

    map.on('load', () => {
      mapLoadedRef.current = true
    })

    mapRef.current = map

    return () => {
      overlay.finalize()
      map.remove()
      mapRef.current = null
      overlayRef.current = null
      mapLoadedRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return

    if (center) {
      map.flyTo({ center: [center[1], center[0]], zoom: 14, duration: 1500 })
    }
  }, [center])

  const edgeData = useMemo<EdgeSegment[]>(() => {
    if (!graph) return []
    const segments: EdgeSegment[] = []
    for (const [fromId, edges] of graph.adj) {
      const from = graph.nodes.get(fromId)
      if (!from) continue
      for (const { to } of edges) {
        const toNode = graph.nodes.get(to)
        if (!toNode) continue
        segments.push({
          path: [
            [from.lng, from.lat],
            [toNode.lng, toNode.lat],
          ],
        })
      }
    }
    return segments
  }, [graph])

  const exploredData = useMemo(() => {
    if (!graph) return new Map<string, ExploredNode[]>()

    const dataByAlgo = new Map<string, ExploredNode[]>()
    for (const algo of ALGORITHMS) {
      const result = results.get(algo.name)
      if (!result) {
        dataByAlgo.set(algo.name, [])
        continue
      }

      const maxStep = Math.floor(animationProgress * result.steps.length)
      const nodes: ExploredNode[] = []
      for (let i = 0; i < maxStep; i++) {
        const s = result.steps[i]
        if (s.kind !== 'settle') continue
        const node = graph.nodes.get(s.nodeId)
        if (!node) continue
        nodes.push({ position: [node.lng, node.lat] })
      }
      dataByAlgo.set(algo.name, nodes)
    }
    return dataByAlgo
  }, [graph, results, animationProgress])

  const pathData = useMemo(() => {
    if (!graph || animationProgress < 1) return new Map<string, EdgeSegment[]>()

    const dataByAlgo = new Map<string, EdgeSegment[]>()
    for (const algo of ALGORITHMS) {
      const result = results.get(algo.name)
      if (!result || result.path.length < 2) {
        dataByAlgo.set(algo.name, [])
        continue
      }

      const coords = result.path
        .map((id) => {
          const n = graph.nodes.get(id)
          return n ? [n.lng, n.lat] as [number, number] : null
        })
        .filter((c): c is [number, number] => c !== null)

      if (coords.length > 1) {
        dataByAlgo.set(algo.name, [{ path: coords }])
      } else {
        dataByAlgo.set(algo.name, [])
      }
    }
    return dataByAlgo
  }, [graph, results, animationProgress])

  const markerData = useMemo<MarkerNode[]>(() => {
    if (!graph) return []
    const markers: MarkerNode[] = []
    if (sourceId) {
      const s = graph.nodes.get(sourceId)
      if (s) markers.push({ position: [s.lng, s.lat], type: 'source' })
    }
    if (targetId) {
      const t = graph.nodes.get(targetId)
      if (t) markers.push({ position: [t.lng, t.lat], type: 'target' })
    }
    return markers
  }, [graph, sourceId, targetId])

  const updateLayers = useCallback(() => {
    const overlay = overlayRef.current
    if (!overlay) return

    const layers: (PathLayer<EdgeSegment> | ScatterplotLayer<ExploredNode> | ScatterplotLayer<MarkerNode> | PathLayer)[] = []

    // Graph edges — thin dark lines showing road network
    layers.push(
      new PathLayer<EdgeSegment>({
        id: 'graph-edges',
        data: edgeData,
        getPath: (d) => d.path,
        getColor: [51, 65, 85, 128],
        getWidth: 1,
        widthUnits: 'pixels',
        widthMinPixels: 0.8,
        pickable: false,
      }),
    )

    // Explored nodes per algorithm — colored scatter dots
    for (const algo of ALGORITHMS) {
      const data = exploredData.get(algo.name) ?? []
      const colors = ALGO_COLORS[algo.name]

      layers.push(
        new ScatterplotLayer<ExploredNode>({
          id: `explored-${algo.name}`,
          data,
          getPosition: (d) => d.position,
          getFillColor: [...colors.fill, 153] as [number, number, number, number],
          getRadius: 4,
          radiusUnits: 'pixels',
          radiusMinPixels: 2,
          antialiasing: true,
          pickable: false,
          updateTriggers: {
            data: [animationProgress, results],
          },
        }),
      )
    }

    // Final paths per algorithm — glow effect with two PathLayers
    for (const algo of ALGORITHMS) {
      const data = pathData.get(algo.name) ?? []
      const colors = ALGO_COLORS[algo.name]

      // Wide glow layer underneath
      layers.push(
        new PathLayer<EdgeSegment>({
          id: `path-glow-${algo.name}`,
          data,
          getPath: (d) => d.path,
          getColor: [...colors.glow, 100] as [number, number, number, number],
          getWidth: 10,
          widthUnits: 'pixels',
          capRounded: true,
          jointRounded: true,
          pickable: false,
        }),
      )

      // Narrow bright line on top
      layers.push(
        new PathLayer<EdgeSegment>({
          id: `path-${algo.name}`,
          data,
          getPath: (d) => d.path,
          getColor: [...colors.fill, 230] as [number, number, number, number],
          getWidth: 4,
          widthUnits: 'pixels',
          capRounded: true,
          jointRounded: true,
          pickable: false,
        }),
      )
    }

    // Source/target markers
    layers.push(
      new ScatterplotLayer<MarkerNode>({
        id: 'markers',
        data: markerData,
        getPosition: (d) => d.position,
        getFillColor: (d) => MARKER_COLORS[d.type],
        getLineColor: [255, 255, 255],
        getRadius: 8,
        radiusUnits: 'pixels',
        stroked: true,
        filled: true,
        lineWidthUnits: 'pixels',
        getLineWidth: 2,
        pickable: false,
      }),
    )

    overlay.setProps({ layers })
  }, [edgeData, exploredData, pathData, markerData, animationProgress, results])

  useEffect(() => {
    updateLayers()
  }, [updateLayers])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
    />
  )
}
