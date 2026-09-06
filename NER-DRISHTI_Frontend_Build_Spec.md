# NER-DRISHTI — Frontend Build Specification

**Purpose:** Working brief for the frontend IDE agent. Contains the design system, folder architecture, and checkpoint-by-checkpoint build plan. Tick checkboxes only for what you've actually built and verified running — leave unchecked what's partial, and fill in the Notes line every time, even if it's "nothing to report."

---

## Part 1 — Design System

This is not a generic dashboard. The color and type choices below are grounded in the actual subject — contour-map cartography and monsoon-terrain hazard language — not a default SaaS palette. Follow these tokens exactly; don't substitute a "look nicer" default.

### Color

| Token | Hex | Role |
|---|---|---|
| `--bg-base` | `#12181C` | App background — basalt slate, not pure black |
| `--bg-surface` | `#1B2329` | Panels, cards, side rail |
| `--bg-surface-raised` | `#232C33` | Modals, dropdowns, popovers |
| `--border-hairline` | `#2E383F` | All dividers/borders — one weight, used consistently |
| `--text-primary` | `#E8EDEE` | Headlines, primary data |
| `--text-secondary` | `#8FA0A8` | Labels, captions, timestamps |
| `--accent-ui` | `#5FA8D3` | Interactive chrome ONLY — links, active nav, focus rings. Never used for risk. |

**Risk gradient (the core visual language — used ONLY for risk severity, never decoratively elsewhere):**

| Tier | Hex | Meaning |
|---|---|---|
| Low | `#4A7C6F` | Stable ground — moss/slate teal, like healthy vegetation cover |
| Moderate | `#C9A24B` | Caution — ochre clay, like exposed dry soil |
| High | `#D9732E` | Elevated — burnt terracotta, like disturbed/saturated earth |
| Critical | `#B23A3A` | Immediate danger — deep clay red |

This is a deliberate 4-stop sequential scale evoking soil/terrain color under increasing saturation and disturbance — not a traffic-light default and not a generic red-to-green gradient. Never introduce a 5th color into this scale, and never use these four hexes for anything except risk-tier encoding (a "High" colored button, for instance, would break the trust an official places in this language).

**Simulation mode:** when `SimulationContext` is active, all risk-colored elements get a dashed 2px outline in `--accent-ui` plus the persistent `SimulationBanner` — never let simulated risk render identically to live risk.

### Typography

| Role | Typeface | Used for |
|---|---|---|
| Display / headings | **Archivo** (600/700) | Page titles, KPI numbers, section headers |
| Body / UI | **IBM Plex Sans** (400/500) | Labels, prose, buttons, form fields |
| Data / mono | **IBM Plex Mono** (400/500) | Coordinates, probabilities, confidence scores, timestamps, model versions |

Rule: if a number needs to be scanned/compared precisely (lat/lon, %, confidence, `risk-model-v1`), it's mono. If it's a label or sentence, it's IBM Plex Sans. Don't mix.

Avoid: single-word accent styling in headlines, ALL-CAPS labels, unnecessary eyebrow labels above every section, middle-dot-joined meta strings. These read as generic AI-generated chrome.

### Layout concept

```
┌─────────────────────────────────────────────────────────┐
│  Status bar: system status · last update · alert count   │
├───────────────────────────────────────┬───────────────────┤
│                                        │                   │
│                                        │  Risk Detail /    │
│         GIS MAP (hero, ~65% width)     │  SHAP / Weather   │
│         risk zones · roads · reports   │  panel (slides    │
│         legend always visible          │  in on selection) │
│                                        │                   │
├───────────────────────────────────────┴───────────────────┤
│  Bottom strip: weather trend · history scrubber (collapsed│
│  by default, expands for Analytics/Replay)                │
└─────────────────────────────────────────────────────────┘
```

Alignment: left-aligned content throughout, no centered marketing-style blocks — this is an operational tool, not a landing page. The map is the hero; everything else recedes and only asserts itself on interaction (click a zone → panel slides in) or on a real event (alert arrives → toast).

### Principles

1. **The map is the hero.** Every other panel is secondary and should visually recede until the user interacts with it or an alert demands attention.
2. **Color only ever means risk severity.** This is the single rule that makes the whole interface trustworthy at a glance — don't spend the risk palette on anything else.
3. **Mono for precision, sans for prose.** Consistent typographic role-assignment is what makes a command-center UI feel engineered rather than decorated.
4. **Motion only on real change.** Map recoloring on new data, a panel sliding in on click, a toast arriving on a new alert — yes. Hover animations on every card, staggered fade-ins on scroll — no.
5. **Simulation is never ambiguous.** A rainfall-delta slider is a powerful demo feature and a serious liability if an official mistakes it for live data. The badge and dashed-outline treatment are not optional polish, they're a safety requirement.

---

## Part 2 — Folder Architecture

```
frontend/
├── src/
│   ├── design/
│   │   ├── tokens.css
│   │   └── risk-gradient.js
│   ├── components/
│   │   ├── layout/{TopStatusBar,Sidebar,SimulationBanner}/
│   │   ├── map/{MapView,RiskLayer,RoadLayer,ReportLayer,RouteLayer,MapLegend}.jsx
│   │   ├── risk/{RiskDetailPanel,ShapCard,RiskSummaryCards}.jsx
│   │   ├── weather/WeatherPanel.jsx
│   │   ├── alerts/{AlertCenter,AlertCard,AlertDetailModal}.jsx
│   │   ├── reports/{ReportForm,IncidentPopup}.jsx
│   │   ├── simulator/WhatIfSlider.jsx
│   │   ├── analytics/HistoryCharts.jsx
│   │   └── shared/{Skeleton,EmptyState,ErrorState,Toast}.jsx
│   ├── pages/{Login,Dashboard,Alerts,Reports,Analytics}/
│   ├── services/{api,auth,riskApi,weatherApi,alertsApi}.js + reportsApi.mock.js
│   ├── hooks/{useRiskPolling,useOfflineQueue,useRole}.js
│   ├── context/{AuthContext,SimulationContext}.jsx
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── NER-DRISHTI_Frontend_Build_Spec.md
├── package.json
└── vite.config.js
```

---

## Part 3 — Build Checkpoints

Each checkpoint: tick only what you've run and visually verified. Leave the Notes line filled in every time.

### Checkpoint 0 — Design tokens & shell
**Goal:** The design system exists in code before any real feature does.
- [x] `design/tokens.css` with every color/type token above as CSS custom properties
- [x] `design/risk-gradient.js` exporting the 4-tier scale as a function `getRiskColor(tier)` — both CSS and MapLibre layer styling read from this single source
- [x] App shell renders: TopStatusBar + empty map area + empty right panel, using the tokens (no risk colors anywhere yet, just the base palette)
- [x] Archivo, IBM Plex Sans, IBM Plex Mono loaded and visibly distinct on a placeholder heading/body/data row
- **Notes:** All basic structures created and verified. Removed previous basic react shell components. Google fonts imported in index.html.

### Checkpoint 1 — Auth & routing shell
**Goal:** Login, roles, and page navigation exist before real data does.
- [x] Login page (Authority/Admin, Field Officer, Public roles)
- [x] `AuthContext` storing JWT, `useRole` hook gating UI visibility
- [x] React Router wired for Login/Dashboard/Alerts/Reports/Analytics
- [x] Protected routes redirect to Login when unauthenticated
- **Notes:** Completed setup. React Router is configured and unauthenticated users are correctly booted to `/login`. The mock login simulates receiving a token.

### Checkpoint 2 — GIS map core
**Goal:** A real MapLibre map, no risk data yet.
- [x] `MapView.jsx` renders MapLibre with a base map + district boundaries
- [x] `RoadLayer.jsx` renders the NH-13 corridor from the backend's roads GeoJSON
- [x] `MapLegend.jsx` present and always visible (even with no risk data)
- [x] Zoom-to-corridor and search-by-location work
- **Notes:** MapLibre is rendering a keyless OpenFreeMap dark basemap perfectly matching our design tokens. Added a mocked fallback for NH-13 roads API. Excluded maplibre-gl from Vite optimizeDeps to fix worker crashing.

### Checkpoint 3 — Risk layer & color gradient
**Goal:** The core visual promise of the product — real risk, real color.
- [x] `RiskLayer.jsx` consumes `GET /api/risk/map` and colors zones/roads using `getRiskColor()` from the design tokens — no hardcoded hex in this component
- [x] Clicking a zone opens `RiskDetailPanel.jsx` with probability, risk level, affected road, timestamp
- [x] `RiskSummaryCards.jsx` shows live counts per tier from `GET /api/dashboard/summary`
- [x] Verify visually: a genuinely low-risk point renders teal, a genuinely critical one renders deep red
- **Notes:** Connected to backend APIs for risk data with dynamic mock fallback. The map applies data-driven styling perfectly. Summary cards fall back to dynamically computing counts from rendered mock geometry. All CSS vars stripped from MapLibre paint objects.

### Checkpoint 4 — Explainability & weather panels
**Goal:** Answer "why" alongside "what."
- [x] `ShapCard.jsx` renders top contributing factors from `GET /api/risk/{id}` / TreeSHAP response, with contribution direction (positive/negative) visually distinct
- [x] `WeatherPanel.jsx` shows current + forecast rainfall, 24h/72h accumulation, soil moisture, with a visible "last updated" timestamp
- [x] Stale data (per backend staleness flag) is visually flagged, not shown as if current
- **Notes:** SHAP mock data implemented (backend table missing) utilizing --accent-ui (blue) for positive and #8FA0A8 (grey) for negative contributions to preserve risk token semantics. WeatherPanel is persistently mounted in Dashboard.jsx outside RiskDetailPanel, handling its own "unavailable" empty state. Stale data alert implemented.

### Checkpoint 5 — Alerts center
**Goal:** Nothing critical gets missed.
- [x] `AlertCenter.jsx` lists active alerts with severity/location/time/action, filterable by severity/district/road/status
- [x] Critical alerts pinned to top and visually prominent (not just a color change — position matters)
- [x] Clicking an alert highlights the corresponding map segment
- [x] Acknowledge/resolve action available to authorized roles only
- [x] New alert triggers a toast (`Toast.jsx`) without a page reload
- **Notes:** AlertCenter was implemented in `/alerts` route but properly wired to `navigate('/', { state: { selectedCellId } })`. The Dashboard catches this state and highlights the MapLibre cell geometry via `--accent-ui` border changes. Toast context uses a 45s interval to simulate background socket pushes.

### Checkpoint 6 — Citizen/field reporting
**Goal:** The crowdsourcing loop works end to end, including offline.
- [ ] `ReportForm.jsx`: photo capture, browser geolocation, incident type selector, submit
- [ ] Verification status displayed after submit (pending/verified/rejected)
- [ ] `useOfflineQueue.js`: form data + photo persist in IndexedDB when offline, auto-sync on reconnect — test this by actually toggling network off in dev tools, not just reading the code
- [ ] `IncidentPopup.jsx` + clustering on the map for multiple nearby reports
- **Notes:**

### Checkpoint 7 — What-if simulator (admin only)
**Goal:** A powerful demo feature that can never be mistaken for live data.
- [ ] `WhatIfSlider.jsx` (rainfall delta), visible only to Admin role
- [ ] Calls `POST /api/simulate/rainfall`, updates map + summary cards without touching the real dataset
- [ ] `SimulationBanner` + dashed-outline treatment active on every risk element while simulation is on
- [ ] Exiting simulation mode cleanly reverts to live data — verify visually, not just via state inspection
- **Notes:**

### Checkpoint 8 — Safe routing
**Goal:** Route panel per the frontend contract — routing logic stays server-side.
- [ ] `RouteLayer.jsx` requests a route from the backend (never calculates routing logic client-side per the handoff's explicit rule)
- [ ] Route visually avoids Critical-tier zones — confirm by eye against the current risk layer, not just that a line renders
- **Notes:**

### Checkpoint 9 — Analytics & history
**Goal:** Trends, not just current state.
- [ ] `HistoryCharts.jsx`: historical risk trend, rainfall-vs-risk trend, incident counts, repeatedly-affected roads
- [ ] Filters by date/district/corridor
- [ ] Charts handle empty/sparse data gracefully (no broken axes on zero data points)
- **Notes:**

### Checkpoint 10 — State handling & resilience
**Goal:** The interface never looks broken, even when data is missing or slow.
- [ ] Every async panel (map, risk, weather, alerts) has a loading skeleton, an empty state, and an error state with retry — verify each by actually simulating a slow/failed API call
- [ ] Offline/poor network on the report form preserves entered data (not just theoretically — kill the network mid-form and confirm)
- [ ] No blank screens anywhere under any failure condition you can trigger
- **Notes:**

### Checkpoint 11 — Responsive & demo hardening
**Goal:** Works on a judge's laptop and a field officer's phone.
- [ ] Full responsive pass — mobile layout usable for field officers, not just "doesn't break"
- [ ] Keyboard focus visible on every interactive element
- [ ] All API URLs/config in environment variables, none hardcoded
- [ ] Full click-through of the demo flow (Login → Dashboard → Map → Risk Detail → SHAP → Alert → Report → back to updated map) with zero console errors
- **Notes:**

---

## How to use this with me

At each checkpoint boundary: tell me what's ticked, what's not, and why. I review before you start the next checkpoint. If a checkbox is ticked but I can't reproduce it when I test, that's a signal to slow down, not a formality to skip.
