# CO Map App — Production Roadmap

Internal mapping platform for The Colorado Sun newsroom. Reporters and data visualization staff create maps ranging from simple locator maps to complex choropleth/multi-point visualizations. Maps are embedded in WordPress via iframe. Built with React 19 + Vite + Tailwind v4 + Leaflet, backed by Cloudflare Workers + D1.

**Production URL**: `https://co-map-worker.newsroom-569.workers.dev`
**Target domain**: `maps.coloradosun.com`

---

## Status Summary (updated 2026-03-23)

### Completed Phases

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Database & Management | ✅ | Workers + D1 backend, CRUD API, index page, routing |
| 2 — Accordion Design Sidebar | ✅ | Accordion sections, gear toggle, Cmd+Shift+D |
| 3 — Map Layers & Base Styling | ✅ | Roads/waterways/cities via Overpass, on-demand sub-toggles, label fonts |
| 4 — Data Tab | ✅ | Spreadsheet editor, Google Sheets connection, debounced saves |
| 5 — Drawing & Sketching Tools | ✅ | Point/line/polygon, vertex editing, style controls |
| 7 — Embed & Edge Caching | ✅ | Auto-rotate demo, 24h edge cache, publish flow |
| S1 — Editor UX Polish | ✅ | Font isolation, sidebar reorg, table toggle, empty-by-default, example data, ColorPicker, category colors, border controls, embed padding |
| S2 — Responsive Embed | ✅ | Desktop/mobile aspect ratios, responsive embed.js, live snippets, auto-rotate toggle |
| S3 — Auth & Deployment | ✅ | User login, admin panel, CI/CD, production config |
| S4 — View-Scoped Curation | ✅ | Lock view, per-feature show/hide (prototype — superseded by S8) |

### Sprint 8 — Customize Mode

| Phase | Status | Focus |
|-------|--------|-------|
| C1 — Foundation | ✅ | Editor mode system, statewide data cache, expanded feature types, scaled LOD |
| C2 — Selection & Primary Layer | ✅ | Element selection, ref-tag grouping, primary elements data layer, auto-hide |
| C3 — Styling & Labels | ✅ | Per-element style controls, label dragging, leader line connectors |
| C4 — Quicksearch & Bounds | ✅ | Feature search, publication crop tool, out-of-bounds management |
| C5 — Polish & Embed | 🔲 | Mode re-entry workflow, embed rendering, persistence, Publish integration |

### Next Up

- **Proof-of-concept map**: 🔄 Building CO150 production map — sidebar-filter template, geocoding, live preview working
- **Refinement pass**: 🔄 Addressing UX issues discovered during proof-of-concept testing
- **C5 — Polish & Embed**: Finalize embed rendering, persistence reliability, mode transitions

### Deferred

| Item | Status | Notes |
|------|--------|-------|
| Phase 6 — Locator Map Wizard | 🔲 | Workflow shortcut; editors can create locator maps manually today |
| CSV file upload | 🔲 | Data import alternative to Google Sheets |
| Sprint 5 — Region Choropleth Layer | 🔲 | Gradient fills for county regions, auto-toggle region layer, design controls |
| Sprint 6 — Vector Tile Labels & Local Data | 🔲 | Client-side vector labels, local CO data cache, tile caching |
| Sprint 7 — Responsive Preview Toolbar | 🔲 | Desktop/mobile/article preview modes in the editor |
| Embed Preview Panel | 🔲 | Last-look preview in embed code menu; device-size previews (phone/tablet/desktop), iframe simulation |

---

## What's Built (Architecture Reference)

### Editor Workflow
- **Two-mode editor**: Settings (DesignSidebar) | Customize (CustomizeSidebar)
- **Publish**: Stays in toolbar as status dropdown / embed code (not a separate mode)
- **Sidebar**: 2 collapsible super-groups (Layers, Design) with single-open accordion behavior; Design contains Template, Data Table, Auto-Rotate, Typography, Colors, Sizing, Frame sections

### Primary Elements Layer (S8 C2–C3)
- Click any map element (road, city, waterway, park, lake) in Customize mode to select it
- Double-click a road → selects all segments with same `ref` tag (connected selection)
- "Add to Primary" promotes selected element — geometry **copied** into dedicated data layer
- Original auto-hides on base layer; removing from primary restores it
- Per-element style controls: color, weight, opacity, dashArray (shapes); fontSize, fontColor, bgColor, bgOpacity (labels)
- Style presets: Highlight, Glow, Subdued, Color-code
- City labels are draggable; leader-line connectors drawn from dragged label to source geometry
- Primary elements list in sidebar, grouped by type with counts

### Quicksearch & Bounds (S8 C4)
- Search across all statewide cached features by name, with layer filter checkboxes
- Click result → pan/zoom to feature, select it, quick-add to primary
- Publication bounds: draggable desktop (blue) and mobile (pink) rectangles
- Out-of-bounds indicators: ✅ in / ⚠️ partial / 🚫 out; bulk-remove fully-out elements

### Overpass & Data Strategy
- All Overpass queries use statewide `CO_BBOX` constant — no bbox-scoped API calls
- Data fetched once per feature type, cached in-memory client-side
- Feature types: motorways, trunk, primary/secondary/tertiary roads, rivers, streams, cities, peaks, parks, lakes
- Level-of-Detail zoom thresholds: motorways always visible, tertiary roads ≥ zoom 11, etc.

### Key Types
- `PrimaryElement`: `{ id, sourceType, sourceIds[], name, geometry, properties, styleOverrides?, labelPosition?, connectorStyle? }`
- `StyleOverrides`: color, weight, opacity, dashArray, fillColor, fillOpacity, fontSize, fontColor, bgColor, bgOpacity
- `ConnectorStyle`: color, weight, dashArray, opacity
- `PublicationBounds`: `{ desktop?: [[south,west],[north,east]], mobile?: [[south,west],[north,east]] }`
- `PrimaryElementSourceType`: `'road' | 'waterway' | 'city' | 'park' | 'lake'`

---

## Phase C5 — Polish & Embed Integration

**Goal**: Ensure smooth mode transitions, reliable persistence, and publication-quality embed rendering.

### C5.1: Mode Re-entry Workflow

- Switching from Customize → Settings preserves all primary elements and their styles
- Switching from Settings → Customize shows existing primary elements in the sidebar
- Changing base-layer settings (tile provider, colors, fonts) in Settings mode is reflected immediately when switching back to Customize
- Primary elements persist regardless of which mode the user is in

### C5.2: Embed Rendering

- EmbedPage renders the Primary Elements Layer on top of base layers
- Publication crop bounds applied: only content within bounds is visible
- Dragged labels render at their custom positions
- Leader line connectors render correctly
- Non-primary layers use base Settings styling (no per-element overrides)
- Hidden base features (that have primary copies) are suppressed

### C5.3: Data Persistence

- All primary elements stored in `data_config.primaryElements[]`
- All publication bounds stored in `data_config.publicationBounds`
- Auto-save via existing debounced `updateMap` API calls
- Full state loadable from API on editor re-open (primary elements, styles, bounds, label positions)

### C5.4: Edge Cases & Polish

- Handle deleted primary elements gracefully (source feature re-appears on base layer)
- Handle maps with no primary elements (Customize mode works but primary layer is empty)
- Undo support for customization actions (stretch goal — evaluate feasibility)
- Performance: primary elements layer should render without blocking interaction
- OSM attribution: ODbL notice on all published maps

**Relevant Files**: `src/pages/EmbedPage.tsx`, `src/pages/MapEditorPage.tsx`, `src/components/MapEditorContent.tsx`, `src/components/layers/PrimaryElementsLayer.tsx`, `src/types.ts`, `worker/src/index.ts`

---

## Deferred Sprints

### Sprint 5 — Region Choropleth Layer

Gradient fills for county polygons driven by data values. Auto-toggle region layer on data load. Color range controls, no-data color, hover/popup, gradient legend.

### Sprint 6 — Vector Tile Labels & Local Data

Replace raster label overlays with client-rendered vector tiles for full font/style control. Build local Colorado data cache (GeoJSON/protobuf) to eliminate Overpass dependency. Scheduled Worker refresh pipeline. Map tile edge caching.

### Sprint 7 — Responsive Preview Toolbar

Desktop/Mobile/Custom/Article preview modes in the editor. Phone-width simulation, custom dimensions, mock Colorado Sun article layout with real typography.

### Phase 6 — Locator Map Wizard & Templates

Guided step-by-step wizard for simple locator maps. Save-as-template system, built-in starters (Default, Locator, Choropleth, Point Cluster).

---

## Decisions

| Decision | Choice |
|----------|--------|
| Backend | Cloudflare Workers + D1 |
| Auth | User login (email + password), session tokens |
| Admin | User management (create/reset password), no roles |
| Frontend hosting | Cloudflare Workers with `[assets]` |
| Production URL | `co-map-worker.newsroom-569.workers.dev` |
| App UI font | Libre Franklin (always) |
| Map fonts | Google Fonts (Libre Franklin, Atkinson Hyperlegible, Plus Jakarta Sans) |
| Embed | iframe with responsive loader script |
| Default tile | Voyager |
| Data sources | Google Sheets (public CSV) + manual entry + example datasets |
| New map default | Empty (no seed data) |
| Visibility | All published maps public, editor requires login |
| Editor workflow | Two-mode: Settings → Customize; Publish in toolbar |
| Overpass strategy | Statewide fetch, client-side cache + bounds filter |
| Primary elements | Geometry copies in own data layer (not references) |
| OSM data license | ODbL — standard attribution required on all maps |
