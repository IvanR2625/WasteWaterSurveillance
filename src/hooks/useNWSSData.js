import { useState, useEffect, useCallback } from 'react'
import { processNWSSRows } from '../utils/dataHelpers'

const API = 'https://data.cdc.gov/resource/2ew6-ywp6.json'

/*
 * Build a Socrata SoQL URL.
 * Commas in $select must NOT be percent-encoded — Socrata uses them as
 * field delimiters and won't split an encoded value like `a%2Cb` correctly.
 * Only the $where and $order values are encoded (for spaces / operators).
 */
function buildURL(cutoffDate) {
  // Literal commas kept intentionally — do not wrap this in encodeURIComponent
  const select = 'wwtp_jurisdiction,wwtp_id,date_start,percentile,ptc_15d'
  const where  = encodeURIComponent(`date_start >= '${cutoffDate}'`)
  const order  = encodeURIComponent('date_start DESC')
  return (
    `${API}?$select=${select}` +
    `&$where=${where}` +
    `&$order=${order}` +
    `&$limit=200000`
  )
}

function getCutoff(range) {
  // 'all' uses a fixed anchor so we always get the full NWSS history
  if (range === 'all') return '2020-01-01'
  const days = { '3m': 90, '6m': 180, '1y': 365 }[range] ?? 365
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().substring(0, 10)
}

export function useNWSSData(range = '1y') {
  const [state, setState] = useState({
    raw: null,
    processed: null,
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const url = buildURL(getCutoff(range))
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows = await res.json()
      const processed = processNWSSRows(rows)
      setState({ raw: rows, processed, loading: false, error: null })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }))
    }
  }, [range])

  useEffect(() => { load() }, [load])

  return {
    ...state.processed,
    loading: state.loading,
    error: state.error,
    reload: load,
  }
}
