import type { AlgorithmDef } from '../types'
import { ALGORITHMS } from '../types'
import type { BBox } from '../utils/osm'
import { PRESETS } from '../utils/osm'

interface Props {
  enabledAlgos: Set<string>
  onToggleAlgo: (name: string) => void
  onRun: () => void
  onReset: () => void
  onSelectPreset: (bbox: BBox) => void
  speed: number
  onSpeedChange: (s: number) => void
  isRunning: boolean
  isLoading: boolean
  loadingMsg: string
  graphSize: number
  sourceSet: boolean
  targetSet: boolean
  isPaused: boolean
  onTogglePause: () => void
}

const ALGO_DESCRIPTIONS: Record<string, string> = {
  dijkstra: 'Classic priority queue — O(m + n log n)',
  astar: 'Heuristic-guided — explores fewer nodes',
  'batch-sssp': 'Batch frontier processing — O(m log²/³n)',
}

export function ControlPanel({
  enabledAlgos,
  onToggleAlgo,
  onRun,
  onReset,
  onSelectPreset,
  speed,
  onSpeedChange,
  isRunning,
  isLoading,
  loadingMsg,
  graphSize,
  sourceSet,
  targetSet,
  isPaused,
  onTogglePause,
}: Props) {
  return (
    <div style={panelStyle}>
      <div>
        <h1 style={titleStyle}>
          Breaking the Sorting Barrier
        </h1>
        <p style={subtitleStyle}>
          Duan, Mao, Mao, Shu, Yin — arXiv:2504.17033 (2025)
        </p>
        <div style={{ marginTop: 6 }}>
          <span style={badgeStyle}>
            STOC 2025 Best Paper
          </span>
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>City</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onSelectPreset(p)}
              disabled={isLoading || isRunning}
              style={presetBtnStyle}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
          <span>{loadingMsg}</span>
        </div>
      )}

      {graphSize > 0 && (
        <div style={{ ...sectionStyle, color: '#94a3b8', fontSize: 12 }}>
          {graphSize.toLocaleString()} intersections loaded
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>Algorithms</label>
        {ALGORITHMS.map((algo) => (
          <AlgoCheckbox
            key={algo.name}
            algo={algo}
            checked={enabledAlgos.has(algo.name)}
            onChange={() => onToggleAlgo(algo.name)}
            description={ALGO_DESCRIPTIONS[algo.name]}
          />
        ))}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Playback Speed</label>
        <input
          type="range"
          min={1}
          max={100}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#06b6d4' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
          <span>Slow</span>
          <span>Fast</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRun}
          disabled={!sourceSet || !targetSet || isRunning || isLoading || graphSize === 0}
          style={{
            ...btnStyle,
            flex: 1,
            background: !sourceSet || !targetSet || isLoading ? '#334155' : '#06b6d4',
            color: '#fff',
          }}
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
        {isRunning && (
          <button
            onClick={onTogglePause}
            style={{
              ...btnStyle,
              padding: '8px 10px',
              fontSize: 11,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button onClick={onReset} style={{ ...btnStyle, flex: 1 }}>
          Reset
        </button>
      </div>

      {!sourceSet && graphSize > 0 && (
        <p style={hintStyle}>Click the map to set a start point</p>
      )}
      {sourceSet && !targetSet && (
        <p style={hintStyle}>Click the map to set a destination</p>
      )}
    </div>
  )
}

function AlgoCheckbox({
  algo,
  checked,
  onChange,
  description,
}: {
  algo: AlgorithmDef
  checked: boolean
  onChange: () => void
  description?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={checkboxRowStyle}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: algo.color,
            display: 'inline-block',
            boxShadow: `0 0 6px ${algo.color}`,
          }}
        />
        <span style={{ color: '#e2e8f0' }}>{algo.label}</span>
      </label>
      {description && (
        <span style={{ fontSize: 10, color: '#475569', paddingLeft: 42, lineHeight: 1.3 }}>
          {description}
        </span>
      )}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 280,
  background: 'rgba(15, 23, 42, 0.92)',
  backdropFilter: 'blur(12px)',
  borderRadius: 12,
  padding: 20,
  color: '#e2e8f0',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  fontSize: 13,
  zIndex: 10,
  border: '1px solid rgba(148, 163, 184, 0.1)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: '#64748b',
  lineHeight: 1.3,
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: 10,
  fontWeight: 600,
  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(168, 85, 247, 0.2))',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  borderRadius: 12,
  color: '#fbbf24',
  letterSpacing: '0.03em',
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#94a3b8',
}

const presetBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  background: 'rgba(51, 65, 85, 0.6)',
  color: '#cbd5e1',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  borderRadius: 6,
  cursor: 'pointer',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
}

const btnStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 600,
  background: 'rgba(51, 65, 85, 0.6)',
  color: '#cbd5e1',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  borderRadius: 8,
  cursor: 'pointer',
}

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#94a3b8',
  fontStyle: 'italic',
  textAlign: 'center',
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#06b6d4',
  fontSize: 12,
}

const spinnerStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  border: '2px solid rgba(6, 182, 212, 0.3)',
  borderTopColor: '#06b6d4',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}
