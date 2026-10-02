import { useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Annotation } from 'react-simple-maps'
import { feature } from 'topojson-client'
import { FIPS_TO_STATE, mapColor, getLevel, LEVEL_LABEL, STATE_ABBR } from '../utils/dataHelpers'

/* Import us-atlas topojson bundled locally */
import usAtlas from 'us-atlas/states-10m.json'

const statesGeoJSON = feature(usAtlas, usAtlas.objects.states)

const LEGEND_STOPS = [
  { label: '0', pct: 0 },
  { label: '25', pct: 25 },
  { label: '50', pct: 50 },
  { label: '75', pct: 75 },
  { label: '100', pct: 100 },
]

export default function USMap({ currentByState, loading, theme, selectedStates, onStateClick }) {
  const [tooltip, setTooltip] = useState(null)
  const isDark = theme === 'dark'

  const stateColorMap = useMemo(() => {
    if (!currentByState) return {}
    const out = {}
    for (const [name, d] of Object.entries(currentByState)) {
      out[name] = mapColor(d.pct, isDark)
    }
    return out
  }, [currentByState, isDark])

  function handleEnter(e, geo) {
    const fips = String(geo.id).padStart(2, '0')
    const name = FIPS_TO_STATE[fips]
    const data = currentByState?.[name]
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ name, data, x: rect.left + rect.width / 2, y: rect.top })
  }

  return (
    <div className="panel flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Current signal by state
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          NWSS percentile for the most recent reporting week · click state to overlay in chart
        </p>
      </div>

      {loading ? (
        <div className="skeleton h-64 w-full rounded-lg" />
      ) : (
        <div className="relative">
          <ComposableMap
            projection="geoAlbersUsa"
            width={780}
            height={480}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={statesGeoJSON}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const fips = String(geo.id).padStart(2, '0')
                  const name = FIPS_TO_STATE[fips]
                  const data = currentByState?.[name]
                  const fill = stateColorMap[name] ?? (isDark ? '#2c2c2a' : '#e1e0d9')
                  const isSelected = selectedStates?.includes(name)

                  return (
                    <Geography
                      key={geo.rsmKey ?? geo.id}
                      geography={geo}
                      fill={fill}
                      stroke={isDark ? '#1a1a19' : '#fcfcfb'}
                      strokeWidth={isSelected ? 2 : 0.8}
                      style={{
                        default: {
                          outline: 'none',
                          opacity: isSelected ? 1 : 0.9,
                        },
                        hover: {
                          outline: 'none',
                          opacity: 0.75,
                          cursor: 'pointer',
                        },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={e => handleEnter(e, geo)}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => name && onStateClick?.(name)}
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>

          {/* Floating tooltip */}
          {tooltip?.name && (
            <div
              className="panel pointer-events-none fixed text-xs shadow-xl z-50"
              style={{ left: tooltip.x, top: tooltip.y - 80, transform: 'translateX(-50%)' }}
            >
              <p className="font-medium mb-1" style={{ color: 'var(--ink)' }}>{tooltip.name}</p>
              {tooltip.data ? (
                <>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--ink-2)' }}>Signal</span>
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                      {Math.round(tooltip.data.pct)}th %ile
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--ink-2)' }}>Level</span>
                    <span style={{ color: 'var(--ink)' }}>{LEVEL_LABEL[tooltip.data.level]}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: 'var(--ink-2)' }}>15-day Δ</span>
                    <span
                      style={{
                        color: tooltip.data.trend > 5
                          ? 'var(--critical)'
                          : tooltip.data.trend < -5
                          ? 'var(--good)'
                          : 'var(--muted)',
                      }}
                    >
                      {tooltip.data.trend > 0 ? '+' : ''}{Math.round(tooltip.data.trend)}%
                    </span>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--muted)' }}>No data</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Low</span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: isDark
              ? 'linear-gradient(to right, #1a2a42, #1c4a8a, #3987e5, #6da7ec, #cde2fb)'
              : 'linear-gradient(to right, #e8f3fe, #86b6ef, #3987e5, #256abf, #0d366b)',
          }}
        />
        <span className="text-xs" style={{ color: 'var(--muted)' }}>High</span>
        <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
          <span
            className="inline-block w-3 h-3 rounded-sm mr-1 align-middle"
            style={{ background: isDark ? '#2c2c2a' : '#e1e0d9' }}
          />
          No data
        </span>
      </div>
    </div>
  )
}
