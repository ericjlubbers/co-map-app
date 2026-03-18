# CO Map App — Production Roadmap

Internal mapping platform for The Colorado Sun newsroom. Reporters and data visualization staff create maps ranging from simple locator maps to complex choropleth/multi-point visualizations. Maps are embedded in WordPress via iframe. Built with React 19 + Vite + Tailwind v4 + Leaflet, backed by Cloudflare Workers + D1.

**Production target**: `maps.coloradosun.com`

---

## Status Summary (updated 2026-03-18)

### Completed Phases (merged to main)

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Database & Management | ✅ | Workers + D1 backend, CRUD API, index page, routing |
| 2 — Accordion Design Sidebar | ✅ | 20 accordion sections, gear toggle, Cmd+Shift+D |
| 3 — Map Layers & Base Styling | ✅ | Roads/waterways/cities via Overpass, on-demand sub-toggles, label fonts |
| 4 — Data Tab | ✅ | Spreadsheet editor, Google Sheets connection, debounced saves |
| 5 — Drawing & Sketching Tools | ✅ | Point/line/polygon, vertex editing, style controls |
| 7 — Embed & Edge Caching | ✅ | Auto-rotate demo, 24h edge cache, publish flow |

### Production Sprints (new)

| Sprint | Status | Focus |
|--------|--------|-------|
| S1 — Editor UX Polish | 🔲 | Font isolation, sidebar reorg, table toggle, empty-by-default, example data |
| S2 — Responsive Embed | 🔲 | Aspect ratio control, responsive loader script for WordPress |
| S3 — View-Scoped Curation | 🔲 | Lock view, bbox-scoped Overpass, per-feature show/hide |
| S4 — Auth & Deployment | 🔲 | User login, admin panel, Cloudflare Pages, DNS, production config |

### Deferred

| Item | Status | Notes |
|------|--------|-------|
| Phase 6 — Locator Map Wizard | 🔲 | Workflow shortcut; editors can create locator maps manually today |
| Multi-select / marquee tool | 🔲 | Batch-style road/waterway segments; Phase 3 polish |
| CSV file upload | 🔲 | Data import alternative to Google Sheets |
| Sprint 5 — Region Choropleth Layer | 🔲 | Gradient fills for county regions, auto-toggle region layer, design controls |
| Sprint 6 — Vector Tile Labels & Local Data | 🔲 | Client-side vector labels, local CO data cache, tile caching |
| Sprint 7 — Responsive Preview Toolbar | 🔲 | Desktop/mobile/article preview modes in the editor |

### Post-merge refinements (applied to main 2026-03-17)
- Label font fix: CityLayer applies `design.labelFont` to DivIcon styles
- Overpass API reliability: timeout 60→120s, retry with backoff on 429/504
- On-demand sub-toggles: Roads (Motorways/Trunk/Primary), Waterways (Rivers/Streams), Cities (Cities/Peaks) — all default off

---

## Sprint 1 — Editor UX Polish

**Goal**: Make the editor usable for real newsroom workflows — simple locator maps through complex data maps.

### S1.1: Lock App UI to Libre Franklin

The app UI (sidebar, toolbar, tables, buttons) must always use Libre Franklin regardless of the map's selected font. Only the map canvas (labels, popups on the map itself) should use `design.fontFamily` / `design.labelFont`.

1. Remove the `document.body.style.fontFamily` assignment from DesignContext — the body font should always be Libre Franklin via CSS
2. Ensure `design.fontFamily` only applies inside `MapView` and its child layers
3. Verify all layer components (LabelLayer, CityLayer, etc.) still correctly apply the selected label font

### S1.2: Table / FilterBar Toggle

Add a `showDataPanel` toggle so simple locator maps can hide the table/filter UI entirely.

1. Add `showDataPanel: boolean` to `DesignState` (default `true`)
2. Toggle control in the sidebar (under Embed or Layout group)
3. When `false`, the FilterBar and DataTable/DrawnFeaturesTable are hidden in both editor and embed modes
4. Map expands to fill the freed space

### S1.3: Sidebar Reorganization

Reorganize the current flat list of 20 accordion sections into 3 collapsible super-groups:

**Layers** — Projection, Labels, Regions, Points, Roads, Waterways, Cities, Globe & Graticule
**Design** — Layout, Typography, Colors
**Embed** — Demo, Controls (future: Header, Footer, Legend, Accessibility)

1. Create a `SidebarGroup` wrapper component — collapsible header with nested AccordionSections
2. Migrate all existing sections into the 3 groups
3. Remove placeholder "Coming soon" sections that have no controls yet (Search box, Number styles, Zoom) — add them back when implemented
4. Preserved behavior: each AccordionSection still expands/collapses independently within its group

### S1.4: Label Font Consistency

Audit and fix all label rendering paths to correctly use the selected `design.labelFont`.

1. Verify LabelLayer, CityLayer, peak labels all apply `design.labelFont` (not `design.fontFamily`)
2. Ensure dynamically-loaded Google Font stylesheets cover all label rendering contexts
3. Test with each available font — labels should update immediately on font change

### S1.5: Empty-by-Default + Example Data Loader

New maps must start with no data. Provide example datasets for learning/testing.

1. Modify `useLocationData` to read from `data_config.points` stored in the API — if empty/absent, return empty array (not seed data)
2. Remove the hardcoded `seedLocations` fallback from the data loading path
3. Add "Load Example Data" button/dropdown on the Data tab with options:
   - **Category markers** — ~20 representative Colorado locations across 4-5 categories
   - **Single point** — one location (locator map starting point)
   - **Choropleth** — Colorado county-level values (uses existing `coloradoCounties.ts`)
4. Loading example data writes to `data_config.points` via the API (treated as real data from that point)
5. Add "Clear All Data" button to reset to empty

### Relevant Files

- Modify: `src/context/DesignContext.tsx` — remove body font assignment
- Modify: `src/styles/index.css` — set Libre Franklin as root font
- Modify: `src/components/DesignSidebar.tsx` — reorganize into SidebarGroups
- New: `src/components/SidebarGroup.tsx` — collapsible group wrapper
- Modify: `src/components/MapEditorContent.tsx` — showDataPanel toggle
- Modify: `src/hooks/useLocationData.ts` — read from data_config, remove seed fallback
- Modify: `src/components/DataEditor.tsx` or `DataTable.tsx` — example data loader UI
- Modify: `src/types.ts` — add `showDataPanel` to DesignState
- Modify: `src/config.ts` — default value for `showDataPanel`

### Verification

- New map → loads with empty map, no points
- Load "Category markers" example → ~20 points appear with categories
- Load "Single point" → one marker, ideal for locator map
- Load "Choropleth" → county regions with values
- Clear data → back to empty
- App UI always in Libre Franklin regardless of map font setting
- Change map label font → only map labels change, not sidebar/toolbar
- Toggle showDataPanel off → table/filter hidden, map fills space
- Sidebar organized into Layers/Design/Embed groups
- All label types (city names, peaks, custom labels) use selected labelFont

---

## Sprint 2 — Responsive Embed

**Goal**: Embeds maintain chosen aspect ratios in WordPress Custom HTML blocks across all screen sizes.

### S2.1: Aspect Ratio Control

1. Add `embedAspectRatio` to design state — options: 16:9, 4:3, 3:2, 1:1, Custom (w:h input)
2. Ratio picker in the Embed sidebar group
3. Ratio stored in design_state, used by the embed loader script

### S2.2: Embed Loader Script

Lightweight JS script (~1KB) hosted at `maps.coloradosun.com/embed.js` that:

1. Finds all co-map iframes by data attribute
2. Calculates iframe height from container width × aspect ratio
3. Listens for window resize and recalculates
4. Handles postMessage from iframe for dynamic content height (optional)

### S2.3: Updated Embed Code Output

1. Generated embed snippet includes `<script>` tag for the loader + iframe with `data-ratio` attribute
2. Fallback: if script doesn't load, iframe stays at a sensible fixed height (600px)
3. Demo embed snippet also includes the loader

### Relevant Files

- New: `public/embed.js` — responsive iframe loader
- Modify: `src/pages/MapEditorPage.tsx` — updated embed snippet generation
- Modify: `src/components/DesignSidebar.tsx` — ratio picker in Embed group
- Modify: `src/types.ts`, `src/config.ts` — `embedAspectRatio` field

### Verification

- Paste embed code into WordPress Custom HTML block → iframe renders at chosen ratio
- Resize browser → iframe height adjusts to maintain ratio
- Different ratios (16:9 vs 1:1) render correctly
- Works without the script (falls back to 600px)
- Demo embed also responsive

---

## Sprint 3 — View-Scoped Curation (Phase 8 Lite)

**Goal**: Lock a view and curate which features are visible for publication-quality maps. Overpass queries scoped to visible extent instead of statewide.

### S3.1: Lock View Toggle

1. "Lock view" button in the editor toolbar — freezes current zoom level and map bounds
2. Visual indicator (border glow or badge) when view is locked
3. Pan/zoom disabled while locked; unlock to navigate freely again

### S3.2: View-Extent Overpass Queries

1. When view is locked, Overpass sub-toggle pills fetch data only for the visible bounding box
2. Modify `vectorTiles.ts` Overpass query builder to accept optional bbox parameter
3. Dramatically reduces API load and response time vs. statewide queries

### S3.3: Per-Feature Visibility

1. Click any road, waterway, city label, or peak while view is locked → show/hide toggle
2. Hidden features stored in `data_config.viewCuration: { hiddenFeatureIds: string[] }`
3. Curation rules applied on published/embed render — hidden features suppressed

### S3.4: Save & Apply Curation

1. View curation (zoom, bounds, hidden features) saved as part of the map's data_config
2. Published/embed maps load the curated view — same zoom, bounds, and visibility rules
3. Editor can unlock, navigate, re-lock to curate a different view

### Deferred to later

- Multiple saved views per map
- Multi-select / marquee tool for batch styling
- Per-feature style overrides (color, weight) — only show/hide for now

### Relevant Files

- New: `src/components/ViewLocker.tsx` — lock/unlock UI
- Modify: `src/lib/vectorTiles.ts` — bbox parameter for Overpass queries
- Modify: `src/components/layers/RoadLayer.tsx`, `WaterwayLayer.tsx`, `CityLayer.tsx` — filter hidden features
- Modify: `src/types.ts` — `ViewCuration` type
- Modify: `src/pages/EmbedPage.tsx` — apply curation rules on load

### Verification

- Lock view at Denver metro zoom → toggle Motorways → only roads in visible extent fetched
- Click a road → hide → road disappears, saved to config
- Publish map → embed loads at locked zoom/bounds with hidden features suppressed
- Unlock → all features visible again
- Re-lock at different zoom → curate a different set of features

---

## Sprint 4 — Auth & Deployment

**Goal**: Replace shared API key with user login, add admin panel, deploy to `maps.coloradosun.com`.

### S4.1: User Authentication

1. D1 `users` table: `id`, `email`, `password_hash`, `name`, `created_at`, `updated_at`
2. Password hashing via Web Crypto API (PBKDF2 or similar — available in Workers runtime)
3. Login endpoint: `POST /api/auth/login` — validates credentials, returns session token (JWT or opaque token stored in D1)
4. Session middleware: replace Bearer API key check with session token validation on all write endpoints
5. Login page at `/login` — email + password form, redirects to index on success
6. Session stored in httpOnly cookie for security; frontend reads auth state from a `/api/auth/me` endpoint
7. Logout endpoint clears session

### S4.2: Admin Panel

1. Admin route at `/admin` — protected, only accessible to authenticated users
2. **User management**: list users, create new user (email + temporary password), reset password
3. No roles/privileges — all authenticated users have full access
4. Simple table UI consistent with the rest of the app (Libre Franklin, same styling)

### S4.3: Cloudflare Pages + Worker Deployment

1. Cloudflare Pages project for the Vite frontend build
2. Worker deployed with production D1 database (separate from local dev)
3. Production wrangler.toml config: custom route, production D1 binding, CORS for `maps.coloradosun.com`
4. API_KEY env var removed (replaced by user auth); seed an initial admin user via migration or CLI

### S4.4: DNS & Domain

1. CNAME record: `maps.coloradosun.com` → Cloudflare Pages domain
2. Cloudflare handles SSL automatically
3. Worker routes configured for `maps.coloradosun.com/api/*`
4. Update CORS_ORIGIN to `https://maps.coloradosun.com`
5. Embed script URL: `https://maps.coloradosun.com/embed.js`

### S4.5: Production Hardening

1. Error boundary component — catch React crashes with friendly "Something went wrong" UI
2. API error handling — toast notifications for save failures, network errors
3. Loading skeletons for index page, map editor, data tab
4. Rate limiting on auth endpoints (login attempts)

### Relevant Files

- New: `worker/migrations/0002_users.sql` — users table
- New: `src/pages/LoginPage.tsx`, `src/pages/AdminPage.tsx`
- New: `src/components/ErrorBoundary.tsx`
- Modify: `worker/src/index.ts` — auth endpoints, session middleware
- Modify: `worker/src/types.ts` — User type, session types
- Modify: `worker/wrangler.toml` — production config
- Modify: `src/App.tsx` — login route, auth guard
- Modify: `src/lib/api.ts` — switch from Bearer token to cookie-based auth

### Verification

- Navigate to `/` unauthenticated → redirected to `/login`
- Log in with valid credentials → redirected to index, session persists across refresh
- Create new user from `/admin` → new user can log in
- Reset password → old password fails, new password works
- Deployed to `maps.coloradosun.com` → frontend loads, API responds
- Embed at `maps.coloradosun.com/embed/:id` → loads without auth (public)
- SSL working, no mixed content warnings
- API errors show toast notifications, not silent failures

---

## Sprint 5 — Region Choropleth Layer (Deferred)

**Goal**: Turn region/county data into a visual choropleth layer with gradient fills, giving reporters the ability to create data-driven county maps.

### S5.1: Auto-Toggle Region Layer on Data Load

1. When "Color-coded Regions" starter data is loaded (or region data is populated), automatically enable the region layer and expand the Regions design menu
2. Region layer toggle: `showRegions: boolean` in DesignState (default `false`)
3. Loading region data sets `showRegions = true` and opens the Regions accordion

### S5.2: Gradient Fill from Region Values

1. Read the value column from `dataConfig.regions` rows (matched to county GeoJSON features by name)
2. Compute min/max across all region values
3. Generate a linear color gradient between two configurable colors (e.g. light → dark)
4. Fill each county polygon with the interpolated color based on its value
5. County polygons with no matching data row remain unfilled or use a "no data" color

### S5.3: Region Design Controls

1. Add to the Regions accordion in DesignSidebar:
   - **Fill Color Range**: two ColorInput fields (low value color, high value color)
   - **Fill Opacity**: Slider 0.1–1.0
   - **No-Data Color**: ColorInput for counties without values
   - **Show Region Labels**: toggle to display value/name on each county
   - **Legend**: toggle to show a gradient legend bar on the map
2. New DesignState fields: `regionFillLow`, `regionFillHigh`, `regionFillOpacity`, `regionNoDataColor`, `showRegionLabels`, `showRegionLegend`

### S5.4: Region Hover & Popup

1. Hovering a county highlights it (increased opacity or outline)
2. Clicking shows a popup with the county name and data value
3. Popup styled with the map's font and color settings

### Relevant Files

- Modify: `src/components/layers/DrawnFeaturesLayer.tsx` or new `RegionLayer.tsx` — render filled county polygons
- Modify: `src/components/DesignSidebar.tsx` — region design controls in Regions accordion
- Modify: `src/types.ts`, `src/config.ts` — new DesignState fields
- Modify: `src/pages/MapEditorPage.tsx` — auto-toggle region layer on data load
- New: `src/components/RegionLegend.tsx` — gradient legend overlay

### Verification

- Load "Color-coded Regions" starter → region layer turns on, counties fill with gradient
- Adjust fill colors → map updates live
- Counties without data show "no data" color
- Hover county → highlight, click → popup with name and value
- Toggle legend on/off → gradient bar appears/disappears on map

---

## Sprint 6 — Vector Tile Labels & Local Data Infrastructure (Deferred)

**Goal**: Replace raster label overlay tiles with client-rendered vector tile labels for full font/style control, and build a local Colorado data cache for faster, API-independent map creation.

### S6.1: Vector Tile Labels

1. Switch from raster label overlay (CARTO `light_only_labels`, Stadia `stamen_terrain_labels`) to vector tile source (e.g. OpenMapTiles, Protomaps)
2. Render labels client-side using a vector tile library (e.g. `maplibre-gl` layer on top of Leaflet, or Leaflet vector tile plugin)
3. Label fonts now come from `design.labelFont` — full control over typeface, size, color, halo
4. Label density and zoom-level visibility controlled by the design sidebar

### S6.2: Local Colorado Data Cache

1. Build a local data file (GeoJSON or protobuf) containing all Colorado features: roads, waterways, cities, landmarks, peaks
2. Source data from OpenStreetMap (one-time Overpass export) and/or other open sources
3. Store in `public/data/` or serve from the Worker — no per-map Overpass API calls needed
4. Map editor loads features from local cache instantly instead of live Overpass queries
5. Feature data includes: geometry, name, type (motorway/trunk/primary, river/stream, city/peak), and other relevant attributes

### S6.3: Data Freshness Pipeline

1. Scheduled Worker (Cloudflare Cron Trigger) runs periodically (e.g. weekly) to refresh local data from Overpass/OSM
2. Compares diff with existing cache, applies updates
3. Version stamp on the data file — editor checks for updates on load
4. Manual "Refresh data" button in admin panel for on-demand updates

### S6.4: Map Tile Caching

1. Proxy base map tiles through the Cloudflare Worker with edge caching (cf.cacheTtl)
2. Reduces external API calls to tile providers (CARTO, Stadia, etc.)
3. Tiles cached at the edge — subsequent requests served from cache
4. Cache warming: pre-fetch tiles for common Colorado zoom levels and extents
5. Fallback to live tile API if cache miss

### S6.5: Label Style Controls

1. Extended label design controls in the sidebar:
   - Font family (from design.labelFont)
   - Font size per label type (cities, roads, waterways)
   - Text color and halo (outline) color/width
   - Label density / min zoom level
   - Collision detection toggle (prevent label overlap)
2. Labels update instantly on the map as design values change

### Relevant Files

- New: `src/components/layers/VectorLabelLayer.tsx` — client-rendered vector labels
- Modify: `src/components/DesignSidebar.tsx` — extended label controls
- New: `worker/src/data-pipeline.ts` — scheduled Overpass data refresh
- New: `public/data/colorado-features.geojson` or `.pbf` — local feature cache
- Modify: `worker/src/index.ts` — tile proxy endpoint, data cache endpoint
- Modify: `src/lib/vectorTiles.ts` — read from local cache instead of live Overpass
- Modify: `worker/wrangler.toml` — cron trigger for data refresh

### Verification

- Switch label font → map labels re-render in new font instantly
- Change label color/size → live preview on map
- Map loads without any Overpass API calls (features from local cache)
- Tile requests cached at edge — subsequent loads are faster
- Weekly cron updates local data — version bumps reported in admin
- Manual refresh button works for on-demand data updates

---

## Sprint 7 — Responsive Preview Toolbar (Deferred)

**Goal**: Let editors preview exactly how their map embed will look at different screen sizes and in the context of a Colorado Sun article — without leaving the editor.

### S7.1: Preview Mode Toolbar

1. Add a toolbar above the map preview panel with mode buttons: **Desktop**, **Mobile**, **Custom**, **Article**
2. Default mode is "Desktop" — map preview fills the available panel width as it does today
3. Switching modes resizes the preview container to simulate the target viewport
4. Active mode button is visually highlighted; only one mode active at a time

### S7.2: Desktop & Mobile Previews

1. **Desktop**: Preview container uses `design.embedAspectRatio` to set width:height, constrained to the available panel space
2. **Mobile**: Preview container uses `design.embedMobileAspectRatio`, narrowed to simulate a phone-width viewport (e.g. 375px logical width) centered in the panel
3. Both modes apply the corresponding embed height setting (`design.embedHeight` / `design.embedHeightUnit`) when not set to "auto"
4. Container shows a subtle device-frame outline (rounded corners, light border) to reinforce the preview context

### S7.3: Custom Preview

1. **Custom**: User enters arbitrary width × height (in px) via two number inputs in the toolbar
2. Preview container resizes to the specified dimensions, centered in the panel
3. Values persist for the session but are not saved to design_state

### S7.4: Article Preview

1. **Article**: Renders the map embedded within a mock Colorado Sun article layout
2. Mock layout includes:
   - A dummy headline and byline in The Sun's typography
   - A column of placeholder body text at The Sun's content width (~680px)
   - The map embed inserted between paragraphs, using the map's `embedAspectRatio` and height settings
   - Sun-style margins, padding, and max-width constraints
3. The article preview scrolls vertically so editors can see the map in context
4. Styles sourced from The Sun's actual CSS where possible (font stacks, line heights, column widths)

### Relevant Files

- New: `src/components/PreviewToolbar.tsx` — mode switcher buttons + custom size inputs
- New: `src/components/ArticlePreview.tsx` — mock Sun article layout with embedded map
- Modify: `src/components/MapEditorContent.tsx` — wrap map panel in preview container that responds to active mode
- Modify: `src/styles/index.css` — article preview typography styles (Sun font stack, column width)

### Verification

- Click "Desktop" → preview shows map at desktop aspect ratio, filling panel width
- Click "Mobile" → preview narrows to phone width, uses mobile aspect ratio
- Click "Custom" → enter 800×450 → preview resizes to exactly those dimensions
- Click "Article" → map appears inside a mock Sun article with headline, body text, and correct column width
- Change embed aspect ratio in sidebar → preview updates immediately in all modes
- Preview modes do not affect saved design state (purely visual)

---

## Deferred: Phase 6 — Locator Map Wizard & Map Templates

**Goal**: Guided multi-step workflow for creating simple locator maps, plus a template system. Deferred because editors can create locator maps manually with the current tools — the wizard is a workflow optimization.

### 6A: Locator Map Wizard

1. "New Locator Map" on index page → step-by-step wizard:
   - Step 1 — Location: search or click to place point (Nominatim geocoding)
   - Step 2 — Framing: zoom level, bounds, optional Colorado inset
   - Step 3 — Labels & Style: location label, font, base tile, feature layers
   - Step 4 — Finish: preview, title, save → opens in full editor

### 6B: Map Templates

2. Save any map as a template (copies design_state + data_config structure, strips data)
3. "New from Template" gallery on index page
4. Built-in starters: Default, Locator, Choropleth, Point Cluster

---

## Sprint Dependencies

```
Completed Phases (1-5, 7)              ✅ all merged to main
    │
    ├── Sprint 1 (Editor UX Polish)    → unblocks usability testing
    │
    ├── Sprint 2 (Responsive Embed)    → unblocks WordPress integration
    │
    ├── Sprint 3 (View Curation)       → unblocks publication-quality maps
    │
    └── Sprint 4 (Auth & Deployment)   → production launch
            │
            ├── Phase 6 (Wizard)       → deferred post-launch optimization
            │
            ├── Sprint 5 (Choropleth)  → deferred; region data + gradient fills
            │
            ├── Sprint 6 (Vector/Local)→ deferred; vector labels + local data cache
            │
            └── Sprint 7 (Preview)     → deferred; responsive preview toolbar
```

Sprints 1–3 can proceed in any order; Sprint 4 depends on S1–S3 being stable. Sprints 5–6 are post-launch enhancements.

---

## Decisions

| Decision | Choice |
|----------|--------|
| Backend | Cloudflare Workers + D1 |
| Auth | User login (email + password), session tokens |
| Admin | User management (create/reset password), no roles |
| Frontend hosting | Cloudflare Pages |
| Production domain | `maps.coloradosun.com` (CNAME → Cloudflare Pages) |
| App UI font | Libre Franklin (always) |
| Map fonts | Google Fonts (Libre Franklin, Atkinson Hyperlegible, Plus Jakarta Sans) |
| Embed | iframe with responsive loader script |
| Default tile | Voyager |
| Data sources | Google Sheets (public CSV) + manual entry + example datasets |
| New map default | Empty (no seed data) |
| Visibility | All published maps public, editor requires login |
| Locator wizard | Deferred post-launch |
