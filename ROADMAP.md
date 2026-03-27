# CO Map App — Production Roadmap

















































Update ROADMAP.md: change L1 status from 🔲 to ✅.## After completion3. Visual check: Carto labels on Watercolor have a clean modern look vs. the vintage tile style. If it looks jarring, consider adding an opacity prop to the label TileLayer (stretch — not required for this phase).   - Select **Terrain (no labels)** → toggle Labels ON → confirm labels, no metric elevations   - Select **Toner (no labels)** → toggle Labels ON → confirm dark-themed labels, no metric elevations   - Toggle **Cities & Peaks ON** → peaks should show elevation in feet (e.g., "14,440 ft")   - Select **Watercolor** tile preset → toggle **Labels Overlay ON** → confirm labels show road/city names without metric peak elevations2. Run dev server, create/open a map:1. `npx tsc --noEmit` — no type errors## Verification- `DesignSidebar.tsx` Labels section with Elevation Units toggle works independently — no changes needed- `CityLayer.tsx` independently renders peaks with feet — no changes needed- `LabelLayer.tsx` reads `labelsUrl` generically — no changes needed### No other files need changes   ```   labelsUrl: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",   ```3. **`stadia-terrain-nolabels`** labelsUrl: change from `stamen_terrain_labels` to Carto `light_only_labels`:   ```   labelsUrl: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",   ```2. **`stadia-toner-nolabels`** labelsUrl: change from `stamen_toner_labels` to Carto `dark_only_labels` (toner is dark-themed):   ```   labelsUrl: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",   ```1. **`stadia-watercolor`** labelsUrl: change from `stamen_terrain_labels` to Carto `light_only_labels`:### `src/config.ts`## Changes Required- Other presets (carto-light-nolabels, carto-dark-nolabels, carto-voyager-nolabels) already use Carto label tiles correctly.  - Dark: `https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png`  - Light: `https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png`- Carto provides labels-only tiles with no elevation data:  3. `stadia-terrain-nolabels` (line ~131): `stamen_terrain_labels` → shows metric peaks  2. `stadia-toner-nolabels` (line ~106): `stamen_toner_labels` → shows metric peaks  1. `stadia-watercolor` (line ~87): `stamen_terrain_labels` → shows metric peaks- Three tile presets currently use Stamen terrain/toner label tiles that include metric peak elevations:- It reads `tileConfig.labelsUrl` from `src/config.ts` via `getTileConfig(design.tilePreset)`- The Labels Overlay is a raster `TileLayer` rendered by `src/components/layers/LabelLayer.tsx`## ContextReplace Stamen terrain label overlays with Carto labels-only tiles so that peak elevations are NOT baked into the raster overlay (they show metric). Our CityLayer already renders peaks with imperial feet via the `formatElevation()` function and `useMetricUnits` design param — that's sufficient for peak labels.## GoalInternal mapping platform for The Colorado Sun newsroom. Reporters and data visualization staff create maps ranging from simple locator maps to complex choropleth/multi-point visualizations. Maps are embedded in WordPress via iframe. Built with React 19 + Vite + Tailwind v4 + Leaflet, backed by Cloudflare Workers + D1.

**Production URL**: `https://co-map-worker.newsroom-569.workers.dev`
**Target domain**: `maps.coloradosun.com`

---

## Status Summary (updated 2026-03-26)

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

### Sprint 9 — Production Launch Polish

| Phase | Status | Focus |
|-------|--------|-------|
| L1 — Label Tile Swap | ✅ | Switch Stamen terrain label overlays → Carto labels-only tiles (no metric peak elevations) |
| L2 — Sidebar Reorganization | ✅ | Move Roads/Waterways/Parks/Lakes + Lock View into Customize tab behind "Under Development" banner; keep Tiles, Labels, Regions, Points, Cities & Peaks, State Border in Settings |
| L3 — Tile Prefetching | ✅ | Prefetch tiles for CO bounding box at common zoom levels on embed load for snappy UX |

### Sprint 10 — CO150 Production Features

| Phase | Status | Focus |
|-------|--------|-------|
| P1 — Smart City Label Repositioning | 🔲 | Collision-aware city labels that reposition with leader lines to avoid dense point clusters |
| P2 — Active/Upcoming Data Status | 🔲 | "status" column role (active/upcoming); upcoming points faded + non-interactive, category badge counts |
| P3 — Dot → Marker on Category Filter | 🔲 | Auto-upgrade dot markers to full shaped markers when a category filter is active |
| P4 — Responsive Sidebar Filter | 🔲 | Mobile layout modes: drawer / below / hidden; swipe gestures; mobile-aware FloatingPointCard |
| P5 — Instructional Toast Messages | 🔲 | Device-aware onboarding toasts (arrow keys / pinch to zoom); editable in DesignSidebar |
| P6 — Accessibility & ARIA | 🔲 | Screen-reader support, focus management, ARIA roles/labels across all embed components |

### Deferred / Post-Launch

| Item | Status | Notes |
|------|--------|-------|
| C5 — Customize Polish & Embed | 🔲 | Mode re-entry workflow, embed rendering, persistence, Publish integration |
| Phase 6 — Locator Map Wizard | 🔲 | Workflow shortcut; editors can create locator maps manually today |
| Multiple Data Input Methods | 🔲 | Google Sheets connector (existing), CSV paste into editor, CSV file upload, image/PDF upload with AI-assisted data extraction (OCR → editable table) |
| Sprint 5 — Region Choropleth Layer | 🔲 | Gradient fills for county regions, auto-toggle region layer, design controls |
| Sprint 6 — Vector Tile Labels & Local Data | 🔲 | Client-side vector labels, local CO data cache, tile caching (includes full vector label layer) |
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

## Sprint 10 — CO150 Production Features

### P1 — Smart City Label Repositioning

**Goal**: CityLayer labels intelligently reposition away from dense point clusters (and each other) with smooth animation and leader-line connectors. Raster LabelLayer is turned OFF for CO150-style maps — CityLayer is the sole label source.

**Behavior**: On `moveend`/`zoomend` (debounced 100ms), compute screen-space bounding boxes for all visible data points and city labels using `map.latLngToContainerPoint()`. For each city label, if overlap is detected, try candidate positions in order: right → left → above → below → diagonals (12px padding buffer). Pick first clear position, animate label (~200ms CSS transition). Draw a thin dashed leader line back to the city dot using the existing `ConnectorStyle` system. Larger cities take priority; if all positions overlap, fall back to reduced opacity at natural position.

**Always-on** when CityLayer is active. No new DesignState params.

**Files**: `src/components/layers/CityLayer.tsx`, `src/components/MapView.tsx`

---

### P2 — Active/Upcoming Data Status

**Goal**: Weekly-batch publishing for CO150. A `status` column controls whether data points are fully interactive ("active") or faded + non-interactive ("upcoming").

**Column role**: New `"status"` value for `ColumnRole`. Recognized cell values: `"active"` (default when missing/empty) or `"upcoming"`.

**Rendering**:
- Upcoming points render at `upcomingOpacity` (default 0.3) with grayscale filter, `pointer-events: none` — no click, no popup
- Upcoming points excluded from auto-rotate rotation
- Upcoming points excluded from filtered set when a category is active

**Category buttons** (sidebar-filter layout):
- All upcoming → button gets disabled/faded style
- Mixed (some active, some upcoming) → button shows active count badge: "Dining (3/8)"
- All active → normal display

**New DesignState params**: `showUpcoming: boolean` (default `true`), `upcomingOpacity: number` (default `0.3`)

**New types**: `PointStatus = "active" | "upcoming"`, `status?: PointStatus` on `PointData`

**Files**: `src/types.ts`, `src/config.ts`, `src/lib/starterData.ts`, `src/pages/MapEditorPage.tsx`, `src/components/MapView.tsx`, `src/components/MarkerIcon.tsx`, `src/components/SidebarFilterLayout.tsx`, `src/components/DataTable.tsx`, `src/components/DesignSidebar.tsx`, `src/hooks/useAutoRotate.ts`, `src/components/DataSidebar.tsx`

---

### P3 — Dot → Marker on Category Filter

**Goal**: When a user clicks a sidebar category button, filtered points auto-upgrade from simple dots to full shaped markers (icon, shape, connector) for better visibility.

**Behavior**: Automatic when `embedLayout === "sidebar-filter"` and a category is active. Reverts to dots when "All" is selected. Uses existing 300ms CSS transitions for smooth morph. No new DesignState params.

**Files**: `src/components/MapView.tsx`, `src/components/SidebarFilterLayout.tsx`

---

### P4 — Responsive Sidebar Filter

**Goal**: Make the sidebar-filter template fully responsive with selectable mobile layout modes and touch-friendly interactivity.

**Mobile layout modes** (`sfMobileLayout`):
- `"drawer"` (default) — Sidebar slides in from left as overlay; toggle button fixed in corner; swipe-to-dismiss
- `"below"` — Category buttons as horizontal strip below the map (full-width)
- `"hidden"` — No category UI on mobile; auto-rotate only

**Touch interactivity**: Swipe left/right to advance/go back through categories; tap to pause auto-rotate. FloatingPointCard renders as bottom sheet on small screens.

**New DesignState param**: `sfMobileLayout: "drawer" | "below" | "hidden"` (default `"drawer"`)

**Files**: `src/types.ts`, `src/config.ts`, `src/components/SidebarFilterLayout.tsx`, `src/components/DesignSidebar.tsx`, `src/components/FloatingPointCard.tsx`

---

### P5 — Instructional Toast Messages

**Goal**: Show device-aware instructional toasts on first embed load. Editable in DesignSidebar.

**Behavior**:
- Detects device type via `matchMedia("(pointer: coarse)")`
- Desktop defaults: "Use arrow keys to navigate between points", "Click a category to filter"
- Mobile defaults: "Pinch to zoom · Swipe to explore", "Tap a category to filter"
- Staggered display (1s, 3.5s), auto-dismiss after 5s
- `localStorage` key `co-map-toast-{id}` prevents re-showing on return visits
- Toasts inherit map `fontFamily` from DesignState

**Library**: `sonner` (lightweight, accessible, no heavy dependencies)

**New DesignState params**: `showInstructionalToasts: boolean`, `toastMessagesDesktop: string[]`, `toastMessagesMobile: string[]`

**New file**: `src/components/InstructionalToasts.tsx`

**Files**: `src/types.ts`, `src/config.ts`, `src/pages/EmbedPage.tsx`, `src/components/DesignSidebar.tsx`

---

### P6 — Accessibility & ARIA

**Goal**: Comprehensive screen-reader support across all embed-facing components. WCAG AA target.

**Key changes**:
- `SidebarFilterLayout`: `role="toolbar"` on button container, `aria-pressed` on category buttons, `aria-live="polite"` region for filtered count announcements
- `FloatingPointCard`: `role="dialog"`, `aria-label="{point title}"`, focus trap when open, Escape to close
- `MapView`: `aria-label="Interactive map of Colorado"` on container, live region for point count changes
- `DataTable`: `<th scope="col">`, `role="grid"` for interactive table
- `AutoRotateDemo`: `aria-live="polite"` for category change announcements, `aria-label` on pause/resume
- Category buttons: `aria-pressed`, `aria-disabled` for upcoming-only categories (from P2)
- Skip-to-content link for keyboard users
- Focus rings: visible `focus-visible:ring-2` on all interactive elements
- Color contrast audit on category buttons (WCAG AA 4.5:1)
- Sonner toasts (P5) provide `aria-live` automatically

**Lighthouse target**: ≥ 90 on embed page

**Files**: `src/components/SidebarFilterLayout.tsx`, `src/components/MapView.tsx`, `src/components/FloatingPointCard.tsx`, `src/components/DataTable.tsx`, `src/components/AutoRotateDemo.tsx`, `src/styles/index.css`

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
