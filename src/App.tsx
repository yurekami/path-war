import { useState, useCallback, useRef, useEffect } from 'react'
import type { Graph, AlgorithmName } from './types'
import { ALGORITHMS } from './types'
import { MapView } from './components/MapView'
import { ControlPanel } from './components/ControlPanel'
import { StatsPanel } from './components/StatsPanel'
import { nearestNode } from './algorithms/graph'
import { usePathfinding } from './hooks/usePathfinding'
import { fetchRoadGraph, PRESETS } from './utils/osm'
import type { BBox } from './utils/osm'

import './App.css'

export default function App() {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [enabledAlgos, setEnabledAlgos] = useState<Set<string>>(
    new Set(ALGORITHMS.map((a) => a.name)),
  )
  const [speed, setSpeed] = useState(50)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [center, setCenter] = useState<[number, number]>([40.715, -73.995])

  const { results, runAlgorithms } = usePathfinding()
  const animRef = useRef<number>(0)
  const isPausedRef = useRef(false)

  // When pathfinding results arrive, kick off animation
  const resultsRef = useRef(results)
  useEffect(() => {
    resultsRef.current = results
  }, [results])

  useEffect(() => {
    handleSelectPreset(PRESETS[0])
  }, [])

  // Start animation whenever results are populated (and we are in running state)
  useEffect(() => {
    if (results.size === 0) return

    cancelAnimationFrame(animRef.current)
    setAnimationProgress(0)
    setIsRunning(true)
    setIsPaused(false)
    isPausedRef.current = false

    const stepsPerFrame = Math.max(1, Math.floor(speed * 2))
    const maxSteps = Math.max(
      ...Array.from(results.values()).map((r) => r.steps.length),
      1,
    )
    let currentStep = 0

    function animate() {
      if (isPausedRef.current) {
        animRef.current = requestAnimationFrame(animate)
        return
      }
      currentStep += stepsPerFrame
      const progress = Math.min(currentStep / maxSteps, 1)
      setAnimationProgress(progress)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setIsRunning(false)
        setIsPaused(false)
        isPausedRef.current = false
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animRef.current)
  }, [results])

  const handleSelectPreset = useCallback(async (bbox: BBox) => {
    setIsLoading(true)
    setGraph(null)
    setSourceId(null)
    setTargetId(null)
    setAnimationProgress(0)
    setCenter([(bbox.south + bbox.north) / 2, (bbox.west + bbox.east) / 2])

    try {
      const g = await fetchRoadGraph(bbox, setLoadingMsg)
      setGraph(g)
    } catch (err) {
      setLoadingMsg(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!graph || isRunning) return
      const nodeId = nearestNode(graph, lat, lng)
      if (!nodeId) return

      if (!sourceId) {
        setSourceId(nodeId)
        setAnimationProgress(0)
      } else if (!targetId) {
        setTargetId(nodeId)
      } else {
        setSourceId(nodeId)
        setTargetId(null)
        setAnimationProgress(0)
      }
    },
    [graph, isRunning, sourceId, targetId],
  )

  const handleRun = useCallback(() => {
    if (!graph || !sourceId || !targetId || isRunning) return

    const algorithms = ALGORITHMS
      .filter((a) => enabledAlgos.has(a.name))
      .map((a) => a.name as AlgorithmName)

    runAlgorithms(graph, sourceId, targetId, algorithms)
  }, [graph, sourceId, targetId, isRunning, enabledAlgos, runAlgorithms])

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      isPausedRef.current = !prev
      return !prev
    })
  }, [])

  const handleReset = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    setSourceId(null)
    setTargetId(null)
    setAnimationProgress(0)
    setIsRunning(false)
    setIsPaused(false)
    isPausedRef.current = false
  }, [])

  const handleToggleAlgo = useCallback((name: string) => {
    setEnabledAlgos((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <MapView
        graph={graph}
        results={results}
        animationProgress={animationProgress}
        onMapClick={handleMapClick}
        sourceId={sourceId}
        targetId={targetId}
        center={center}
      />

      <ControlPanel
        enabledAlgos={enabledAlgos}
        onToggleAlgo={handleToggleAlgo}
        onRun={handleRun}
        onReset={handleReset}
        onSelectPreset={handleSelectPreset}
        speed={speed}
        onSpeedChange={setSpeed}
        isRunning={isRunning}
        isLoading={isLoading}
        loadingMsg={loadingMsg}
        graphSize={graph?.nodes.size ?? 0}
        sourceSet={sourceId !== null}
        targetSet={targetId !== null}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
      />

      <StatsPanel results={results} enabledAlgos={enabledAlgos} />
    </div>
  )
}
