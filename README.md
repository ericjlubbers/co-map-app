# Colorado Map App

An interactive map of Colorado locations built with React, Leaflet, and Tailwind CSS. Features categorized markers with clustering, filtering, text search, a synced data table, geographic overlays (county boundaries, state border, outside-state fade), and a live **Design Mode** for collaboratively tweaking every visual option.

Deployed automatically to Cloudflare Workers on push to `main`.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Leaflet** / **react-leaflet** for the map
- **react-leaflet-cluster** for marker clustering
- **Tailwind CSS v4** for styling
- **Font Awesome** for category icons

## Getting Started

```bash
npm install
npm run dev
```

### Environment Variables

Create a `.env` file in the project root:

```
VITE_STADIA_API_KEY=your-stadia-api-key
```

This key is required for tile layers served by Stadia Maps (Watercolor, Toner, Alidade Smooth, Outdoors). CARTO and OpenStreetMap presets don't need it.

## Design Mode

A live toolbar for adjusting every visual option without touching code. Changes are reflected instantly.

**Activate:** Add `?design=1` to the URL, or press `Ctrl+Shift+D` (`Cmd` on Mac).

### Controls

| Control            | Options                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| **Tiles**          | 10 basemap presets (see below)                                          |
| **Labels**         | Toggle labels overlay (auto-added for tiles that lack built-in labels)  |
| **Font**           | Libre Franklin, Atkinson Hyperlegible, Plus Jakarta Sans                |
| **Clusters**       | Donut, Gradient, Minimal                                                |
| **Map/Table**      | Grid ratio (3fr 2fr, 1fr 1fr, 2fr 3fr, 2fr 1fr, 4fr 1fr)              |
| **Radius**         | Global border-radius slider (0–24px)                                    |
| **Markers**        | Marker pin size slider (20–60px)                                        |
| **Border**         | Toggle CO150 triple border frame                                        |
| **Colors**         | Panel background, page background, text color, muted text color pickers |
| **Counties**       | Toggle county boundary lines + color, width, opacity controls           |
| **State Border**   | Toggle thick Colorado state border + color and width controls           |
| **Outside Fade**   | Toggle a dark mask outside Colorado + opacity control                   |

### Sharing

- **Share** — copies a URL with your design choices baked in; recipients see the finalized map (no toolbar)
- **Share + Editor** — copies a URL that also shows the toolbar so collaborators can keep tweaking
- **Reset** — returns everything to the defaults from `config.ts`

All state lives in URL search params — no backend or localStorage needed.

## Configuration

Static defaults live in `src/config.ts`. Design Mode overrides these at runtime.

### Tile Presets

| Preset                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `"stadia-watercolor"` | Stamen Watercolor via Stadia Maps **(default)**  |
| `"carto-light"`       | Clean light basemap via CARTO                   |
| `"carto-dark"`        | Dark mode basemap via CARTO                     |
| `"carto-voyager"`     | Colorful detailed basemap via CARTO             |
| `"osm-standard"`      | Classic OpenStreetMap                            |
| `"stadia-toner"`      | High-contrast black & white                     |
| `"stadia-toner-lite"` | Lighter black & white                           |
| `"stadia-smooth"`     | Soft muted tones (Alidade Smooth)               |
| `"stadia-outdoors"`   | Topographic / trails                            |
| `"stadia-terrain"`    | Stamen Terrain with elevation shading           |

Tiles that lack built-in labels (e.g. Watercolor) automatically get a labels overlay from Stadia terrain labels, controllable via the Labels toggle.

### Cluster Styles

| Style        | Description                                  |
| ------------ | -------------------------------------------- |
| `"donut"`    | Pie-ring showing category proportions (default) |
| `"gradient"` | Color based on dominant category             |
| `"minimal"`  | Clean monochrome circles                     |

### Font Family

| Font                          |
| ----------------------------- |
| `"Libre Franklin"` (default)  |
| `"Atkinson Hyperlegible"`     |
| `"Plus Jakarta Sans"`         |

### Map Defaults

```ts
export const MAP_CENTER: [number, number] = [39.0, -105.5];
export const MAP_ZOOM = 7;
export const MAP_MAX_BOUNDS = [[36.5, -109.5], [41.5, -101.5]];
```

### Category Icons & Colors

Category appearance is defined in the `CATEGORY_DEFINITIONS` map inside `src/config.ts`. Each entry maps a category name to a Font Awesome icon, primary color, and background color. Categories not explicitly defined receive a fallback icon and color from `FALLBACK_PALETTE`.

## Data Source

Location data is currently loaded from static seed data in `src/data/seedLocations.ts`. The `useLocationData` hook in `src/hooks/useLocationData.ts` abstracts the data source and can be swapped to fetch from a live source (e.g. Google Sheets CSV) without changing any components.

## Deployment

The app deploys as a single **Cloudflare Worker** that serves both the API (`/api/*`) and the Vite-built frontend (with SPA fallback for client-side routing). Pushes to `main` trigger the GitHub Actions workflow at `.github/workflows/deploy.yml`.

### Required GitHub Secrets

| Secret                   | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | Cloudflare API token with Workers + D1 permissions  |
| `CLOUDFLARE_ACCOUNT_ID`  | Your Cloudflare account ID                          |
| `VITE_STADIA_API_KEY`    | API key for Stadia-hosted tile layers               |

### First-Time Production Setup

1. **Create the production D1 database:**
   ```bash
   cd worker
   npx wrangler d1 create co-map-db-prod
   ```
   Copy the returned `database_id` into `worker/wrangler.toml` under `[env.production.d1_databases]`.

2. **Apply migrations to production:**
   ```bash
   npx wrangler d1 migrations apply co-map-db-prod --remote --env production
   ```

3. **Set GitHub Secrets** in the repo: Settings → Secrets and variables → Actions.

4. **Push to `main`** to trigger the first deploy.

5. **Create the first admin user** (one-time only, while zero users exist):
   ```bash
   curl -X POST https://maps.coloradosun.com/api/auth/setup \
     -H 'Content-Type: application/json' \
     -d '{"email":"you@example.com","password":"YourPassword","name":"Your Name"}'
   ```

6. **DNS**: Add a CNAME record `maps.coloradosun.com` → the Workers domain shown in the Cloudflare dashboard. SSL is automatic.

### Local Development

```bash
# Terminal 1: start the API worker
cd worker
npx wrangler d1 migrations apply co-map-db --local   # first time only
npx wrangler dev src/index.ts --port 8787

# Terminal 2: start the Vite dev server (proxies /api → localhost:8787)
npm run dev
```

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start dev server         |
| `npm run build`   | Type-check and build     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

## Project Structure

```
src/
  App.tsx                Main app layout (map + table + filters)
  config.ts              All configurable defaults
  types.ts               Shared TypeScript types
  context/
    DesignContext.tsx     Design state provider, URL serialization, useDesign() hook
  components/
    DesignSidebar.tsx    Accordion design controls sidebar (right panel)
    AccordionSection.tsx Collapsible section used by DesignSidebar
    MapView.tsx           Leaflet map with clustering & labels overlay
    DataTable.tsx         Searchable/filterable data table
    FilterBar.tsx         Category filter pills
    ClusterIcon.tsx       Custom cluster icon renderer
    MarkerIcon.tsx        Custom marker icon renderer
    PointPopup.tsx        Map popup content
  data/
    seedLocations.ts     Static location dataset
    coloradoCounties.ts  64 Colorado county boundary polygons (GeoJSON)
    coloradoBorder.ts    State border polygon + outside-state fade mask
  hooks/
    useLocationData.ts   Data-fetching hook
  styles/
    index.css            Global styles / Tailwind entry
```
