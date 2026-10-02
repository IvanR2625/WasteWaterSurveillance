# Wastewater Surveillance — Viral Signal Monitor

An interactive dashboard visualising SARS-CoV-2 viral signal in US wastewater, built on the CDC National Wastewater Surveillance System (NWSS) public open dataset.

**Live site → https://ivanr2625.github.io/WasteWaterSurveillance/**

---

## What it shows

| Panel | Description |
|---|---|
| **KPI tiles** | National average signal percentile, share of states trending up, total monitoring sites |
| **Trend chart** | Weekly national rolling average with optional per-state overlays; filterable by 3 mo / 6 mo / 1 yr / All |
| **US choropleth map** | Each state coloured by its current NWSS percentile (light = low, dark = high) |
| **State rankings table** | All states sorted by current signal level or 15-day trend; click any row to overlay it on the chart |

---

## Data source

**CDC National Wastewater Surveillance System (NWSS)**
- Dataset: [NWSS Public SARS-CoV-2 Wastewater Metric Data](https://data.cdc.gov/Public-Health-Surveillance/NWSS-Public-SARS-CoV-2-Wastewater-Metric-Data/2ew6-ywp6)
- API: Socrata open data — fetched live in the browser at page load, no backend required
- Coverage: ~2020 onward; the dataset ends around **2024–2025**

### A note on the date range buttons

The 3 mo, 6 mo, and 1 yr range buttons are anchored to the **last available date in the dataset**, not to the current calendar date. Because the NWSS dataset ends around 2024–2025, anchoring to today would produce an empty chart for any sub-"All" range. Instead each button shows the most recent N months of *recorded* data, giving you a meaningful view of the tail end of surveillance.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Charts | Recharts (area + composed multi-line) |
| Map | react-simple-maps + us-atlas (bundled topojson, no CDN dependency) |
| Styling | Tailwind CSS + CSS custom properties |
| Hosting | GitHub Pages via `gh-pages` branch |

---

## Running locally

```bash
npm install
npm run dev
```

## Deploying

```bash
npm run deploy
```

This builds to `dist/` and pushes it to the `gh-pages` branch, which GitHub Pages serves automatically.

---

## Colour palette

The dashboard uses a design-system-agnostic palette with validated CVD-safe categorical colours and a sequential blue ramp for the choropleth map. Dark and light modes are both supported and toggle-able in the header.

---

Built by [Ivan Raizada](https://github.com/IvanR2625)
