import { useState, useEffect } from 'react'
import Header from './components/Header'
import KPIRow from './components/KPIRow'
import TrendChart from './components/TrendChart'
import USMap from './components/USMap'
import StateRankings from './components/StateRankings'
import { useNWSSData } from './hooks/useNWSSData'

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('wwsurv-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [selectedStates, setSelectedStates] = useState([])
  // Fetch the full history (2020→now); TrendChart filters locally by range
  const [range] = useState('all')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('wwsurv-theme', theme)
  }, [theme])

  const { nationalTrend, stateTimeSeries, currentByState, stats, loading, error, reload } =
    useNWSSData(range)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-2)' }}>
      <Header
        theme={theme}
        setTheme={setTheme}
        lastUpdated={stats?.lastUpdated}
        loading={loading}
        onReload={reload}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* error banner */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm flex items-center gap-3"
            style={{ background: 'rgba(208,59,59,0.1)', border: '1px solid var(--critical)', color: 'var(--critical)' }}
          >
            <span>⚠</span>
            <span>
              Could not load CDC NWSS data: {error}. The CDC API may be temporarily unavailable.
            </span>
            <button
              onClick={reload}
              className="ml-auto underline text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI tiles */}
        <KPIRow stats={stats} loading={loading} />

        {/* Trend chart — full width, primary story */}
        <TrendChart
          nationalTrend={nationalTrend}
          stateTimeSeries={stateTimeSeries}
          selectedStates={selectedStates}
          setSelectedStates={setSelectedStates}
          loading={loading}
          theme={theme}
        />

        {/* Map + rankings — secondary spatial context */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <USMap
            currentByState={currentByState}
            loading={loading}
            theme={theme}
            selectedStates={selectedStates}
            onStateClick={name => {
              setSelectedStates(prev =>
                prev.includes(name)
                  ? prev.filter(s => s !== name)
                  : prev.length >= 5 ? prev : [...prev, name]
              )
            }}
          />
          <StateRankings
            currentByState={currentByState}
            loading={loading}
            theme={theme}
            selectedStates={selectedStates}
            setSelectedStates={setSelectedStates}
          />
        </div>

        {/* footer */}
        <footer className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>
          Data: CDC National Wastewater Surveillance System (NWSS) ·{' '}
          <a
            href="https://data.cdc.gov/Public-Health-Surveillance/NWSS-Public-SARS-CoV-2-Wastewater-Metric-Data/2ew6-ywp6"
            target="_blank" rel="noopener noreferrer"
            className="underline hover:opacity-70"
          >
            Dataset
          </a>{' '}
          · Built by Ivan Raizada ·{' '}
          <a
            href="https://github.com/IvanR2625/WasteWaterSurveillance"
            target="_blank" rel="noopener noreferrer"
            className="underline hover:opacity-70"
          >
            GitHub
          </a>
        </footer>
      </main>
    </div>
  )
}
