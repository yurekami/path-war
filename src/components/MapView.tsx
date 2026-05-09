import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
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

const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

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
  const readyRef = useRef(false)
  const cbRef = useRef(onMapClick)
  cbRef.current = onMapClick

  // Init map once
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
      cbRef.current(e.lngLat.lat, e.lngLat.lng)
    })

    map.on('load', () => {
      // Road network edges
      map.addSource('edges', { type: 'geojson', data: empty })
      map.addLayer({
        id: 'edges-layer', type: 'line', source: 'edges',
        paint: { 'line-color': '#334155', 'line-width': 0.8, 'line-opacity': 0.5 },
      })

      // Per-algorithm explored nodes + paths
      for (const a of ALGORITHMS) {
        map.addSource(`exp-${a.name}`, { type: 'geojson', data: empty })
        map.addLayer({
          id: `exp-${a.name}`, type: 'circle', source: `exp-${a.name}`,
          paint: { 'circle-radius': 4, 'circle-color': a.color, 'circle-opacity': 0.6, 'circle-blur': 0.4 },
        })
        map.addSource(`path-${a.name}`, { type: 'geojson', data: empty })
        map.addLayer({
          id: `path-${a.name}`, type: 'line', source: `path-${a.name}`,
          paint: { 'line-color': a.glowColor, 'line-width': 4, 'line-opacity': 0.9 },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        })
      }

      // Source / target markers
      map.addSource('markers', { type: 'geojson', data: empty })
      map.addLayer({
        id: 'markers-layer', type: 'circle', source: 'markers',
        paint: {
          'circle-radius': 8,
          'circle-color': ['match', ['get', 't'], 'src', '#22c55e', 'tgt', '#a855f7', '#fff'],
          'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2,
        },
      })

      readyRef.current = true
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; readyRef.current = false }
  }, [])

  // Fly to new city
  useEffect(() => {
    if (mapRef.current && readyRef.current)
      mapRef.current.flyTo({ center: [center[1], center[0]], zoom: 14, duration: 1500 })
  }, [center])

  // Draw road edges when graph changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !graph) return
    const feats: GeoJSON.Feature[] = []
    for (const [fid, edges] of graph.adj) {
      const f = graph.nodes.get(fid)
      if (!f) continue
      for (const { to } of edges) {
        const t = graph.nodes.get(to)
        if (!t) continue
        feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[f.lng, f.lat], [t.lng, t.lat]] }, properties: {} })
      }
    }
    ;(map.getSource('edges') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: feats })
  }, [graph])

  // Update explored nodes, paths, markers on every animation tick
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !graph) return

    for (const a of ALGORITHMS) {
      const r = results.get(a.name)
      const dots: GeoJSON.Feature[] = []
      const lines: GeoJSON.Feature[] = []

      if (r) {
        const max = Math.floor(animationProgress * r.steps.length)
        for (let i = 0; i < max; i++) {
          const s = r.steps[i]
          if (s.kind !== 'settle') continue
          const n = graph.nodes.get(s.nodeId)
          if (n) dots.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lng, n.lat] }, properties: {} })
        }
        if (animationProgress >= 1 && r.path.length > 1) {
          const c = r.path.map(id => { const n = graph.nodes.get(id); return n ? [n.lng, n.lat] : null }).filter(Boolean) as number[][]
          if (c.length > 1) lines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: c }, properties: {} })
        }
      }

      ;(map.getSource(`exp-${a.name}`) as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: dots })
      ;(map.getSource(`path-${a.name}`) as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: lines })
    }

    const mk: GeoJSON.Feature[] = []
    if (sourceId) { const n = graph.nodes.get(sourceId); if (n) mk.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lng, n.lat] }, properties: { t: 'src' } }) }
    if (targetId) { const n = graph.nodes.get(targetId); if (n) mk.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lng, n.lat] }, properties: { t: 'tgt' } }) }
    ;(map.getSource('markers') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: mk })
  }, [graph, results, animationProgress, sourceId, targetId])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }} />
}
