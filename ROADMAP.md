# CO Map App — Production Roadmap

Transform the current single-map static prototype into a multi-map platform backed by Cloudflare Workers + D1, with a Flourish-style data editor, accordion design sidebar, multiple feature layers, drawing tools, iframe embedding, and edge caching. Internal team auth only; all published maps are public.

## Status Summary (updated 2026-03-17)

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Database & Management | ✅ Complete | Merged to main |
| 2 — Accordion Design Sidebar | ✅ Complete | Merged to main |
| 3 — Map Layers & Base Styling | ✅ Complete | Merged (PR #8). Post-merge fixes: label font, Overpass 504/429, sub-toggles |
| 4 — Data Tab | ✅ Complete | Merged (PR #12). Fixes: row ID consistency, debounced saves |
| 5 — Drawing & Sketching Tools | ✅ Complete | Merged (PR #9). Manual conflict resolution with Phases 3+4 |
| 6 — Locator Map Wizard | 🔲 Not started | Depends on Phases 3+5 |
| 7 — Embed & Edge Caching | 🔄 PR #11 open | Copilot-generated, not yet reviewed |
| 8 — View-Scoped Label Curation | 🔲 Not started | Roadmap only |

### Post-merge refinements applied to main (2026-03-17):
- **Label font fix**: CityLayer now applies `design.labelFont` to DivIcon styles
- **Overpass API reliability**: timeout 60→120s, retry with backoff on 429/504
- **On-demand sub-toggles**: Roads split into Motorways/Trunk/Primary pills; Waterways split into Rivers/Streams pills; Cities split into Cities/Peaks pills. All default to off — no Overpass calls fire until user explicitly enables a pill
- **Future refinement**: Multi-select/marquee tool for batch-styling road/waterway segments (noted for Phase 3 polish pass)

---

## Phase 1 — Maps Database & Management Interface

**Goal**: Replace the single hardcoded map with a persistent multi-map system. Editors can create, save, open, duplicate, archive, and delete maps from an index page.

### 1A: Backend — Cloudflare Workers + D1

1. Scaffold a `worker/` directory at repo root with Wrangler config, Worker entry point (Hono), and D1 schema migrations
2. D1 `maps` table: `id` (nanoid), `title`, `description`, `status` (draft/published/archived), `design_state` (JSON), `data_config` (JSON), `created_at`, `updated_at`
3. CRUD API routes: list, create, read, update, delete (soft), duplicate
4. Auth: shared API key via `Authorization: Bearer <token>` (Cloudflare secret). Protects all write endpoints; reads for published maps are public
5. Wire `useLocationData` hook to fetch data from the API per map id, replacing static `seedLocations`
6. Adapt `DesignContext` to load/save state from API instead of (only) URL params — keep URL params as fallback/override

### 1B: Frontend — Index / Management Page

7. Add `react-router-dom` for client-side routing: `/` (index), `/maps/:id` (editor), `/embed/:id` (embed view)
8. Index page: grid of saved maps with title, status badge, last-updated date. Actions: Open, Duplicate, Archive, Delete. "New Map" button creates via API and navigates to editor
9. Embed route renders `MapView` only — no toolbar, no FilterBar, no DataTable. 100vw × 100vh
10. Copyable iframe embed snippet generated in the editor UI

### Relevant Files

- New: `worker/` (wrangler.toml, src/index.ts, schema.sql), `src/pages/` (IndexPage, MapEditorPage, EmbedPage), `src/lib/api.ts`
- Modify: `src/App.tsx`, `src/hooks/useLocationData.ts`, `src/context/DesignContext.tsx`, `vite.config.ts`

### Verification

- Create a map from index page → confirm it exists in D1
- Open map → design controls work, save persists across reload
- Duplicate → new map with same config, different id
- Archive → map disappears from default index view
- `/embed/:id` renders map-only with no UI chrome
- Unauthenticated writes return 401

---

## Phase 2 — Accordion Design Sidebar

**Goal**: Replace the top-mounted `DesignToolbar` with a Flourish-style collapsible accordion sidebar (~320px, right side). This becomes the home for all current and future design controls.

> Promoted ahead of the Data Tab because Phases 3–6 all add controls that live in this sidebar. Building the container first avoids rework.

1. New `DesignSidebar.tsx` with accordion sections: Projection, Regions layer, Points layer, Globe & graticule layers, Controls, Popups & panels, Search box, Legend, Zoom, Number styles, Layout, Header, Footer, Accessibility
2. Migrate all controls from current `DesignToolbar` into corresponding sections
3. Toggle via gear icon button + retain `Cmd+Shift+D` shortcut
4. Responsive: slide-over drawer on narrow viewports
5. Delete `DesignToolbar.tsx` once complete
6. Set **Voyager** as the default tile preset

### Relevant Files

- New: `src/components/DesignSidebar.tsx`, `AccordionSection.tsx`
- Modify: `src/context/DesignContext.tsx`, MapEditorPage
- Delete: `src/components/DesignToolbar.tsx`

### Verification

- All existing design controls accessible in the sidebar
- Voyager loads as default tile layer
- Live map updates on every setting change (same as current)
- Accordion sections expand/collapse correctly
- Sidebar toggles via button and keyboard shortcut
- Mobile: renders as drawer without breaking the map

---

## Phase 3 — Map Layers & Base Styling

**Goal**: Add configurable vector feature layers (roads, waterways, cities) and a proper label system with custom font support. Fix existing label issues.

### 3A: Label System

1. Separate label layers from base tiles — labels render as their own overlay so they always appear on top of other features
2. Non-labeled base tile options (unlabeled Voyager, unlabeled positron, etc.) to avoid label collision when using custom label layers
3. Custom font support for labels (load from Google Fonts or local @font-face)
4. **Bug fix**: Peak labels display meters vs. feet — fix to show feet (with optional metric toggle in sidebar)

### 3B: Feature Layers

5. **Road layer**: pull road geometries from vector tiles (OpenMapTiles / Protomaps), allow selecting individual road objects/segments to apply custom styles (color, weight, dash pattern)
6. **Waterway layer**: same select-and-style pattern for rivers, streams, lakes
7. **City layer**: city points/labels with per-object styling (icon, font size, visibility toggle)
8. Each feature layer gets its own accordion section in the design sidebar with: visibility toggle, default style, selected-object style overrides

### Relevant Files

- New: `src/components/layers/LabelLayer.tsx`, `RoadLayer.tsx`, `WaterwayLayer.tsx`, `CityLayer.tsx`
- New: `src/lib/vectorTiles.ts` — vector tile source management
- Modify: `src/components/MapView.tsx` — integrate new layers
- Modify: `src/components/DesignSidebar.tsx` — add Road, Waterway, City, Labels accordion sections
- Modify: `src/context/DesignContext.tsx` — add layer visibility/style state

### Verification

- Toggle road layer on → roads appear with default style
- Click a road segment → style panel opens, change color → only that segment updates
- Switch to non-labeled base → custom label layer renders on top with chosen font
- Peak labels show feet by default, meters when toggled
- Waterway and city layers follow same select-and-style pattern

---

## Phase 4 — Data Tab (Flourish-style Editor)

**Goal**: Add a "Data" tab in the editor. Editors view/edit tabular data, assign columns to visualization roles, and connect a public Google Sheet.

### 4A: Data Tab UI

1. Tab bar in editor: **Preview** | **Data**
2. Sub-tabs within Data: **Regions** | **Points** (matching layer types)
3. Spreadsheet-style table component with `@tanstack/react-virtual` for virtualization — editable cells, add/delete rows, paste from clipboard, column context menus
4. Right sidebar with "Select columns to visualise" panel — draggable column assignments for Geometry, Name, Label, Value, Group, Metadata
5. Persist table data + column mappings in the map's `data_config` JSON

### 4B: Google Sheets Connection

6. User pastes a public Google Sheets URL → fetch published CSV (no auth needed, CORS-friendly)
7. "Refresh from Google Sheets" button with change-diff summary before applying
8. Last-synced timestamp and connection status indicator

### 4C: Future (out of scope now)

- CSV file upload
- Direct API/JSON endpoint import

### Relevant Files

- New: `src/components/DataEditor.tsx`, `DataSidebar.tsx`, `DataTabBar.tsx`, `src/lib/googleSheets.ts`
- Modify: `src/types.ts`, MapEditorPage, worker API

### Verification

- Open Data tab → see editable table with current map data
- Edit a cell → switch to Preview → change reflected on map
- Assign "Value" column → regions show choropleth coloring
- Paste Google Sheets URL → data populates
- "Refresh" pulls updated data with change summary
- Add/delete rows → save → reload → data persists

---

## Phase 5 — Drawing & Sketching Tools

**Goal**: Let editors draw directly on the map — drop points, draw lines/routes, and sketch region polygons. Drawn features are saved as part of the map's data.

1. Drawing toolbar overlay on the map (left side or top) with mode buttons: **Point** | **Line** | **Polygon** | **Select** | **Delete**
2. **Drop point**: click map to place a marker, popup form to set label + category + metadata
3. **Draw line**: click to place vertices, double-click to finish. Popup to set label, style (color, weight, dash), and metadata. Snapping to existing features optional
4. **Sketch region**: click to place polygon vertices, double-click to close. Fill color, stroke, opacity controls. Can represent custom zones, coverage areas, etc.
5. All drawn features stored as GeoJSON in the map's `data_config`, rendered as dedicated overlay layers
6. Select tool: click drawn features to edit vertices (drag), update properties, or delete
7. Integrate with Data Tab — drawn features appear as rows in a **Drawn** sub-tab, editable from either the map or the table

### Relevant Files

- New: `src/components/DrawingToolbar.tsx`, `src/components/layers/DrawnFeaturesLayer.tsx`
- New: `src/lib/drawing.ts` — GeoJSON feature CRUD helpers
- Modify: `src/components/MapView.tsx` — drawing interaction handlers
- Modify: `src/types.ts` — DrawnFeature, DrawingMode types
- Modify: worker API — persist drawn features in data_config

### Verification

- Select Point mode → click map → marker appears, popup form works
- Select Line mode → click vertices → double-click to finish → line renders with chosen style
- Select Polygon mode → sketch a region → fills with chosen color
- Select tool → drag a vertex → geometry updates live
- Delete tool → click a feature → removed from map and data
- Switch to Data tab → drawn features visible as table rows
- Save → reload → all drawn features persist

---

## Phase 6 — Locator Map Wizard & Map Templates

**Goal**: Guided multi-step workflow for creating simple locator maps, plus a template system for quick-start map creation.

### 6A: Locator Map Wizard

1. "New Locator Map" option on the index page → launches a step-by-step wizard:
   - **Step 1 — Location**: Search for or click to place the target location on the map. Geocoding via Nominatim (free, no API key)
   - **Step 2 — Framing**: Set zoom level and map bounds. Option to add a Colorado inset showing where the zoomed area sits within the state
   - **Step 3 — Labels & Style**: Add location label, choose font, set base tile style, toggle feature layers (roads, waterways). Minimal by default
   - **Step 4 — Finish**: Preview the final locator map, set title, save. Opens in the full editor for further refinement
2. Locator maps use the same `maps` table — just a pre-configured starting point. No separate data model needed

### 6B: Map Templates

3. Template system: save any map as a template (copies `design_state` + `data_config` structure, strips actual data)
4. "New from Template" option on the index page with template gallery
5. Built-in starter templates: Default (current), Locator, Choropleth, Point Cluster

### Relevant Files

- New: `src/components/LocatorWizard.tsx` (multi-step form)
- New: `src/pages/NewMapPage.tsx` — "New Map" flow with template selection + wizard entry points
- Modify: `src/pages/IndexPage.tsx` — "New Locator Map" and "New from Template" buttons
- Modify: worker API — template CRUD, `POST /api/maps` accepts `template_id`

### Verification

- Click "New Locator Map" → wizard launches
- Complete all 4 steps → locator map created and opens in editor
- Edit the locator map with full editor tools (it's a normal map)
- Save a map as template → appears in template gallery
- Create new map from template → inherits design but not data

---

## Phase 7 — Embed Enhancements & Edge Caching

**Goal**: Polish the embed experience with an interactive category demo mode and add Cloudflare edge caching for instant loads.

### 7A: Auto-Rotate Category Demo

1. Embed query param `?demo=1` activates auto-rotate mode
2. On load, map cycles through categories one at a time (e.g., Arts & Culture → Businesses → Hikes) — filtering the visible markers to spotlight each category
3. Smooth transitions: fly to a representative cluster, show category name overlay, pause 4–5 seconds, fade to next
4. Pauses auto-rotate when user interacts (click, scroll, touch). Resumes after 10s of inactivity, or stays paused with a "Resume" button
5. Prevents the overwhelming clustered view on first load — eases viewers into the data
6. Category rotation order and timing configurable in the design sidebar

### 7B: Cloudflare Edge Caching

7. Cache published map JSON via Worker Cache API (`s-maxage=86400`)
8. Auto-purge cache on `PUT /api/maps/:id`
9. "Publish" action in editor: sets status=published, purges cache, shows "Live" badge with public/embed URL
10. Embed route served with inlined or cached-fetch map JSON + minimal JS bundle
11. Optional: KV tier for highest-traffic maps
12. Vite assets served with content-hash filenames and long-lived cache headers

### Relevant Files

- New: `src/components/AutoRotateDemo.tsx` — category cycling logic + UI overlay
- Modify: `src/pages/EmbedPage.tsx` — `?demo=1` param handling
- Modify: `src/components/DesignSidebar.tsx` — demo config section (category order, timing)
- Modify: `worker/src/index.ts` — Cache API logic, purge on write
- Modify: `src/pages/MapEditorPage.tsx` — "Publish" button, "Live" badge

### Verification

- Load embed with `?demo=1` → categories cycle with smooth transitions
- Click/scroll during demo → rotation pauses
- "Resume" button → rotation restarts
- Second load of published embed → `cf-cache-status: HIT`
- Edit + save → next load shows updated data
- TTFB < 100ms for cached loads

---

## Phase 8 — View-Scoped Label Curation

**Goal**: Add a locked-view mode where editors can curate which labels, road segments, and feature objects are visible at a specific zoom/bounds. This enables precise "what you see is what you get" label curation for publication-quality maps.

1. "Lock view" toggle in the editor — freezes the current zoom level and map bounds
2. When locked, all Overpass/feature layer pills become interactive curation tools: toggling a pill fetches data for that specific view extent (not statewide), dramatically reducing API load
3. Per-feature visibility toggles: click any road, waterway, city label, or peak to show/hide it in the locked view
4. View-scoped label overrides saved in `data_config.viewLabels` — a map of `{ zoom, bounds, hiddenFeatureIds[], styleOverrides[] }`
5. Multiple locked views can be saved per map (e.g., statewide overview + Denver metro detail)
6. On published/embed render, the active view's curation rules apply — hidden features are suppressed, style overrides are applied
7. Multi-select / marquee tool for batch styling: lasso-select multiple road segments or waterway pieces to apply style changes (color, weight, visibility) in bulk

### Relevant Files

- New: `src/components/ViewLocker.tsx` — lock/unlock UI, view extent management
- Modify: `src/components/DesignSidebar.tsx` — locked-view section, per-view saved configurations
- Modify: `src/components/layers/RoadLayer.tsx`, `WaterwayLayer.tsx`, `CityLayer.tsx` — filter by view-scoped curation rules
- Modify: `src/lib/vectorTiles.ts` — accept bbox parameter for view-scoped Overpass queries
- Modify: `src/types.ts` — ViewCuration, ViewLabel types

### Verification

- Lock view at Denver metro zoom → toggle Motorways pill → only roads in visible extent are fetched
- Click a road segment → "Hide" button → segment disappears, saved to view config
- Unlock view → all features visible again (curation only applies when locked)
- Publish map → embed respects the locked view's curation rules
- Multi-select tool → lasso 5 waterway segments → change color → all 5 update

---

## Phase Dependencies

```
Phase 1 (Database + Management)        ✅
    │
    ├── Phase 2 (Design Sidebar)       ✅
    │       │
    │       ├── Phase 3 (Map Layers)   ✅ + post-merge fixes
    │       │
    │       └── Phase 5 (Drawing)      ✅
    │
    ├── Phase 4 (Data Tab)             ✅
    │
    ├── Phase 6 (Locator Wizard)       🔲 depends on 3+5
    │
    ├── Phase 7 (Embed + Caching)      🔄 PR #11 open
    │
    └── Phase 8 (View Label Curation)  🔲 depends on 3
```

**Remaining execution order**:
- **Phase 7** → review PR #11 next (Copilot-generated, needs merge conflict resolution + review)
- **Phase 8** → after Phase 7 (view-scoped curation builds on feature layers)
- **Phase 6** → can proceed in parallel with Phase 8 (locator wizard uses existing features)

---

## Decisions

| Decision | Choice |
|----------|--------|
| Backend | Cloudflare Workers + D1 |
| Auth | Shared API key, internal team |
| Embed | iframe |
| Default tile | Voyager |
| Data sources (now) | Google Sheets (public CSV) + manual entry |
| Data sources (later) | CSV upload, API/JSON endpoints |
| Sheets sync | Manual refresh button |
| Visibility | All published maps public |
| Vector tiles | OpenMapTiles / Protomaps (for road/waterway/city layers) |
| Label fonts | Google Fonts + local @font-face |
| Locator maps | Wizard-style multi-step creation |
| Auto-rotate demo | Viewer-facing on embed (`?demo=1`) |
| Hosting domain | TBD |
