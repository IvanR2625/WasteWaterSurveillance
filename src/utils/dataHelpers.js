/* State FIPS → full name (us-atlas states-10m.json uses numeric FIPS as feature id) */
export const FIPS_TO_STATE = {
  '01':'Alabama','02':'Alaska','04':'Arizona','05':'Arkansas','06':'California',
  '08':'Colorado','09':'Connecticut','10':'Delaware','11':'District of Columbia',
  '12':'Florida','13':'Georgia','15':'Hawaii','16':'Idaho','17':'Illinois',
  '18':'Indiana','19':'Iowa','20':'Kansas','21':'Kentucky','22':'Louisiana',
  '23':'Maine','24':'Maryland','25':'Massachusetts','26':'Michigan','27':'Minnesota',
  '28':'Mississippi','29':'Missouri','30':'Montana','31':'Nebraska','32':'Nevada',
  '33':'New Hampshire','34':'New Jersey','35':'New Mexico','36':'New York',
  '37':'North Carolina','38':'North Dakota','39':'Ohio','40':'Oklahoma','41':'Oregon',
  '42':'Pennsylvania','44':'Rhode Island','45':'South Carolina','46':'South Dakota',
  '47':'Tennessee','48':'Texas','49':'Utah','50':'Vermont','51':'Virginia',
  '53':'Washington','54':'West Virginia','55':'Wisconsin','56':'Wyoming',
}

export const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC',
  'Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL',
  'Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA',
  'Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN',
  'Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV',
  'New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
  'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR',
  'Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
  'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA',
  'Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
}

/* percentile → level label */
export function getLevel(pct) {
  if (pct == null) return 'unknown'
  if (pct >= 75) return 'high'
  if (pct >= 50) return 'moderate-high'
  if (pct >= 25) return 'moderate'
  return 'low'
}

export const LEVEL_LABEL = {
  high: 'High',
  'moderate-high': 'Mod–High',
  moderate: 'Moderate',
  low: 'Low',
  unknown: '–',
}

/* interpolate between map CSS stops based on 0-100 percentile */
export function mapColor(pct, isDark) {
  if (pct == null) return isDark ? '#2c2c2a' : '#e1e0d9'
  const stops = isDark
    ? [[0,'#1a2a42'],[25,'#1c4a8a'],[50,'#3987e5'],[75,'#6da7ec'],[100,'#cde2fb']]
    : [[0,'#e8f3fe'],[25,'#86b6ef'],[50,'#3987e5'],[75,'#256abf'],[100,'#0d366b']]
  for (let i = 1; i < stops.length; i++) {
    const [lo, cLo] = stops[i - 1]
    const [hi, cHi] = stops[i]
    if (pct <= hi) {
      const t = (pct - lo) / (hi - lo)
      return lerpHex(cLo, cHi, t)
    }
  }
  return stops[stops.length - 1][1]
}

function lerpHex(a, b, t) {
  const ah = parseInt(a.slice(1), 16)
  const bh = parseInt(b.slice(1), 16)
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bv = Math.round(ab + (bb - ab) * t)
  return `#${((r << 16) | (g << 8) | bv).toString(16).padStart(6, '0')}`
}

/* aggregate raw NWSS rows into processed structures */
export function processNWSSRows(rows) {
  const byStateDatePcts = {}
  const byStateDateTrend = {}

  for (const row of rows) {
    const state = row.wwtp_jurisdiction
    if (!state || state === 'National' || state === 'Nationwide') continue
    const date = row.date_start?.substring(0, 10)
    const pct = parseFloat(row.percentile)
    const trend = parseFloat(row.ptc_15d)
    if (!date || isNaN(pct)) continue

    if (!byStateDatePcts[state]) byStateDatePcts[state] = {}
    if (!byStateDatePcts[state][date]) {
      byStateDatePcts[state][date] = { pcts: [], trends: [] }
    }
    byStateDatePcts[state][date].pcts.push(pct)
    if (!isNaN(trend)) byStateDatePcts[state][date].trends.push(trend)
  }

  /* state → sorted time series */
  const stateTimeSeries = {}
  for (const [state, dates] of Object.entries(byStateDatePcts)) {
    stateTimeSeries[state] = Object.entries(dates)
      .map(([date, { pcts, trends }]) => ({
        date,
        pct: avg(pcts),
        trend: avg(trends),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /* national trend: mean across all states per date */
  const allDates = new Set(
    Object.values(stateTimeSeries).flatMap(ts => ts.map(d => d.date))
  )
  const nationalTrend = Array.from(allDates)
    .sort()
    .map(date => {
      const vals = Object.values(stateTimeSeries)
        .map(ts => ts.find(d => d.date === date)?.pct)
        .filter(v => v !== undefined)
      return { date, pct: vals.length ? avg(vals) : null }
    })
    .filter(d => d.pct !== null)

  /* current state snapshot (latest date for each state) */
  const currentByState = {}
  for (const [state, series] of Object.entries(stateTimeSeries)) {
    if (!series.length) continue
    const last = series[series.length - 1]
    currentByState[state] = {
      pct: last.pct,
      trend: last.trend,
      level: getLevel(last.pct),
    }
  }

  /* KPI stats */
  const stateSnaps = Object.values(currentByState)
  const latestDates = Object.values(stateTimeSeries)
    .map(ts => ts[ts.length - 1]?.date)
    .filter(Boolean)
    .sort()
  const lastUpdated = latestDates[latestDates.length - 1] ?? null
  const rising = stateSnaps.filter(s => s.trend > 5).length
  const totalSites = rows.length ? new Set(rows.map(r => r.wwtp_id).filter(Boolean)).size : 0

  const stats = {
    nationalPct: stateSnaps.length ? avg(stateSnaps.map(s => s.pct)) : null,
    pctRising: stateSnaps.length ? Math.round((rising / stateSnaps.length) * 100) : null,
    totalSites: totalSites || null,
    stateCount: stateSnaps.length,
    lastUpdated,
  }

  return { nationalTrend, stateTimeSeries, currentByState, stats }
}

function avg(arr) {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/* cut series to date range */
/*
 * Filter series to the last N days.
 * Anchors to the LAST date in the series, not today — so the range buttons
 * always work even when the dataset lags behind the current calendar date.
 */
export function filterByRange(series, range) {
  if (range === 'all' || !series.length) return series
  const days = { '3m': 90, '6m': 180, '1y': 365 }[range] ?? 180
  const anchor = new Date(series[series.length - 1].date + 'T00:00:00Z')
  const cutoff = new Date(anchor.getTime() - days * 86400000).toISOString().substring(0, 10)
  return series.filter(d => d.date >= cutoff)
}

/* nice date label */
export function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`
}

export function fmtDateShort(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m, 10) - 1]} ${d}`
}
