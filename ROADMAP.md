# CO Map App — Production Roadmap

Transform the current single-map static prototype into a multi-map platform backed by Cloudflare Workers + D1, with a Flourish-style data editor, accordion design sidebar, iframe embedding, and edge caching. Internal team auth only; all published maps are public. Four phases, each independently deployable.

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

## Phase 2 — Data Tab (Flourish-style Editor)

**Goal**: Add a "Data" tab in the editor. Editors view/edit tabular data, assign columns to visualization roles, and connect a public Google Sheet.

### 2A: Data Tab UI

1. Tab bar in editor: **Preview** | **Data**
2. Sub-tabs within Data: **Regions** | **Points** (matching layer types)
3. Spreadsheet-style table component with `@tanstack/react-virtual` for virtualization — editable cells, add/delete rows, paste from clipboard, column context menus
4. Right sidebar with "Select columns to visualise" panel — draggable column assignments for Geometry, Name, Label, Value, Group, Metadata
5. Persist table data + column mappings in the map's `data_config` JSON

### 2B: Google Sheets Connection

6. User pastes a public Google Sheets URL → fetch published CSV (no auth needed, CORS-friendly)
7. "Refresh from Google Sheets" button with change-diff summary before applying
8. Last-synced timestamp and connection status indicator

### 2C: Future (out of scope now)

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

## Phase 3 — Accordion Design Sidebar

**Goal**: Replace the top-mounted `DesignToolbar` with a Flourish-style collapsible accordion sidebar (~320px, right side).

1. New `DesignSidebar.tsx` with accordion sections: Projection, Regions layer, Points layer, Globe & graticule layers, Controls, Popups & panels, Search box, Legend, Zoom, Number styles, Layout, Header, Footer, Accessibility
2. Migrate all controls from current `DesignToolbar` into corresponding sections
3. Toggle via gear icon button + retain `Cmd+Shift+D` shortcut
4. Responsive: slide-over drawer on narrow viewports
5. Delete `DesignToolbar.tsx` once complete

### Relevant Files

- New: `src/components/DesignSidebar.tsx`, `AccordionSection.tsx`
- Modify: `src/context/DesignContext.tsx`, MapEditorPage
- Delete: `src/components/DesignToolbar.tsx`

### Verification

- All existing design controls accessible in the sidebar
- Live map updates on every setting change (same as current)
- Accordion sections expand/collapse correctly
- Sidebar toggles via button and keyboard shortcut
- Mobile: renders as drawer without breaking the map

---

## Phase 4 — Cloudflare Edge Caching

**Goal**: Published maps load instantly via edge cache. Editors can bust cache on-demand.

1. Cache published map JSON via Worker Cache API (`s-maxage=86400`)
2. Auto-purge cache on `PUT /api/maps/:id`
3. "Publish" action in editor: sets status=published, purges cache, shows "Live" badge with public/embed URL
4. Embed route served with inlined or cached-fetch map JSON + minimal JS bundle
5. Optional: KV tier for highest-traffic maps
6. Vite assets served with content-hash filenames and long-lived cache headers

### Verification

- Second load of published embed → `cf-cache-status: HIT`
- Edit + save → next load shows updated data
- TTFB < 100ms for cached loads

---

## Phase Dependencies

```
Phase 1 (Database + Management)  ← must come first
    ├── Phase 2 (Data Tab)       ← depends on Phase 1 API
    ├── Phase 3 (Design Sidebar) ← UI-only, can overlap with Phase 2
    └── Phase 4 (Caching)        ← depends on Phase 1 Worker
```

Phases 2 and 3 can run **in parallel** once Phase 1 is complete. Phase 4 depends on the Worker from Phase 1 but is otherwise independent.

---

## Decisions

| Decision | Choice |
|----------|--------|
| Backend | Cloudflare Workers + D1 |
| Auth | Shared API key, internal team |
| Embed | iframe |
| Data sources (now) | Google Sheets (public CSV) + manual entry |
| Data sources (later) | CSV upload, API/JSON endpoints |
| Sheets sync | Manual refresh button |
| Visibility | All published maps public |
| Lines layer | Deferred |
| Hosting domain | TBD |
