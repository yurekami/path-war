import { useEffect, useRef, useState } from 'react'
import type { PathResult, AlgorithmDef } from '../types'
import { ALGORITHMS } from '../types'

interface Props {
  results: Map<string, PathResult>
  enabledAlgos: Set<string>
}

export function StatsPanel({ results, enabledAlgos }: Props) {
  const activeAlgos = ALGORITHMS.filter((a) => enabledAlgos.has(a.name))
  const activeResults = activeAlgos
    .map((a) => ({ algo: a, result: results.get(a.name) }))
    .filter((r) => r.result != null) as Array<{
    algo: AlgorithmDef
    result: PathResult
  }>

  if (activeResults.length === 0) return null

  // Find algorithm with fewest comparisons for trophy indicator
  const compValues = activeResults.map((r) => r.result.stats.comparisons)
  const minComps = Math.min(...compValues)
  const winnerIndex = compValues.filter((v) => v === minComps).length === 1
    ? compValues.indexOf(minComps)
    : -1

  const metrics = [
    {
      label: 'Nodes Explored',
      key: 'nodesExplored' as const,
      format: (v: number) => v.toLocaleString(),
      lower: true,
    },
    {
      label: 'Edges Relaxed',
      key: 'edgesRelaxed' as const,
      format: (v: number) => v.toLocaleString(),
      lower: true,
    },
    {
      label: 'Comparisons',
      key: 'comparisons' as const,
      format: (v: number) => v.toLocaleString(),
      lower: true,
      highlight: true,
    },
    {
      label: 'Time',
      key: 'timeMs' as const,
      format: (v: number) => `${v.toFixed(1)}ms`,
      lower: true,
    },
  ]

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Results</h2>
        {activeResults.length > 0 && (
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Path: {activeResults[0].result.dist === Infinity
              ? 'No path'
              : `${(activeResults[0].result.dist).toFixed(0)}m`}
          </span>
        )}
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle} />
            {activeResults.map(({ algo }, i) => (
              <th key={algo.name} style={thStyle}>
                <span style={{ color: algo.color }}>
                  {algo.label}
                  {i === winnerIndex && (
                    <span style={{ marginLeft: 4, fontSize: 12 }} title="Fewest comparisons">
                      ♛
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const values = activeResults.map((r) => r.result.stats[m.key])
            const best = Math.min(...values)

            return (
              <tr key={m.key}>
                <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 11 }}>
                  {m.label}
                  {m.highlight && <Star />}
                </td>
                {activeResults.map(({ algo, result }, i) => {
                  const val = values[i]
                  const isBest = val === best && values.filter((v) => v === best).length === 1
                  return (
                    <td
                      key={algo.name}
                      style={{
                        ...tdStyle,
                        fontWeight: isBest ? 700 : 400,
                        color: isBest ? '#22c55e' : '#e2e8f0',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {m.format(val)}
                    </td>
                  )
                })}
              </tr>
            )
          })}

          {/* Batches row — only meaningful for batch-sssp */}
          <BatchesRow activeResults={activeResults} />
        </tbody>
      </table>

      <ComparisonBars activeResults={activeResults} />

      <p style={footerStyle}>
        Duan et al. (2025) proved that Dijkstra's 1956 algorithm is not optimal — the first improvement in 41 years. STOC 2025 Best Paper.
      </p>
    </div>
  )
}

function BatchesRow({
  activeResults,
}: {
  activeResults: Array<{ algo: AlgorithmDef; result: PathResult }>
}) {
  // Only render if batch-sssp is among the active results
  const hasBatch = activeResults.some((r) => r.algo.name === 'batch-sssp')
  if (!hasBatch) return null

  return (
    <tr>
      <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 11 }}>Batches</td>
      {activeResults.map(({ algo, result }) => {
        const isBatch = algo.name === 'batch-sssp'
        const batchCount = isBatch
          ? result.steps.filter((s) => s.kind === 'batch-start').length
          : null
        return (
          <td
            key={algo.name}
            style={{
              ...tdStyle,
              color: isBatch ? '#e2e8f0' : '#475569',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isBatch ? (batchCount ?? 0).toLocaleString() : '—'}
          </td>
        )
      })}
    </tr>
  )
}

function ComparisonBars({
  activeResults,
}: {
  activeResults: Array<{ algo: AlgorithmDef; result: PathResult }>
}) {
  const maxComps = Math.max(...activeResults.map((r) => r.result.stats.comparisons))
  if (maxComps === 0) return null

  // Animate bars from 0 to final width on mount
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      setMounted(true)
    })
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Comparisons
      </span>
      {activeResults.map(({ algo, result }) => {
        const pct = (result.stats.comparisons / maxComps) * 100
        return (
          <div key={algo.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 60, fontSize: 10, color: algo.color, textAlign: 'right' }}>
              {algo.label.split(' ')[0]}
            </span>
            <div style={{ flex: 1, height: 14, background: 'rgba(51,65,85,0.4)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: mounted ? `${pct}%` : '0%',
                  height: '100%',
                  background: `linear-gradient(90deg, ${algo.color}, ${algo.glowColor})`,
                  borderRadius: 4,
                  transition: 'width 0.6s ease-out',
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', width: 50, fontVariantNumeric: 'tabular-nums' }}>
              {result.stats.comparisons.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Star() {
  return (
    <span style={{ color: '#f59e0b', marginLeft: 4, fontSize: 10 }} title="Paper's key metric">
      *
    </span>
  )
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  right: 16,
  maxWidth: 700,
  margin: '0 auto',
  background: 'rgba(15, 23, 42, 0.92)',
  backdropFilter: 'blur(12px)',
  borderRadius: 12,
  padding: 16,
  color: '#e2e8f0',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  fontSize: 13,
  zIndex: 10,
  border: '1px solid rgba(148, 163, 184, 0.1)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
}

const thStyle: React.CSSProperties = {
  textAlign: 'right',
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 600,
  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
}

const tdStyle: React.CSSProperties = {
  textAlign: 'right',
  padding: '4px 8px',
}

const footerStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 10,
  color: '#475569',
  lineHeight: 1.4,
  textAlign: 'center',
}
