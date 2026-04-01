# Colorado Map App

Internal mapping platform for The Colorado Sun. React + Leaflet frontend, Cloudflare Workers + D1 backend. Supports multiple maps per account with per-map design customization, embeddable iframes, auto-rotate category tours, and focus/category embed URLs for deep-linking to individual points or filtered views.

Deployed automatically to Cloudflare Workers on push to `main`.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Leaflet** / **react-leaflet** for the map
- **react-leaflet-cluster** for marker clustering
- **Tailwind CSS v4** for styling
- **Font Awesome** for category icons
- **Hono** for Cloudflare Worker routes
- **Cloudflare D1** (SQLite) for map + user data

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

A live sidebar for adjusting every visual option. Changes auto-save with a 1-second debounce — no manual save button needed.

**Activate:** Click the **Design** button in the editor toolbar.

### Embed Layouts

| Layout | Description |
| --- | --- |
| `standard` | Map + optional data table side-by-side |
| `sidebar-filter` | Category filter sidebar + map — recommended for multi-category maps |

### Sharing & Embeds

- **Embed** button — copies a full `<iframe>` snippet for the map at its current design
- **Focus embed** — copy icon on each row in the data panel copies a snippet zoomed to that single point (1:1 square aspect ratio)
- **Category embed** — hover the category pills in the filter bar to copy a snippet pre-filtered to that category

#### Embed URL Parameters

| Parameter | Description |
| --- | --- |
| `?focus=<pointId>` | Opens the map zoomed to that point, card open, all others dimmed |
| `?category=<name>` | Opens the map pre-filtered to that category |
| `?demo=1` | Starts the auto-rotate category tour immediately |

### Auto-Rotate Tour

Click the **▶** play button to start an automatic category-by-category tour. Any interaction (mouse, touch, scroll, keyboard) permanently stops the tour — there is no auto-resume.

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

Location data is loaded from a Google Sheet (or static seed data for development) via the `useLocationData` hook. The worker stores map configuration and point data in Cloudflare D1.

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
    DesignContext.tsx     Design state provider, auto-save debounce, useDesign() hook
    AuthContext.tsx       Authentication state
  components/
    DesignSidebar.tsx    Accordion design controls sidebar
    MapView.tsx           Leaflet map with clustering, overlays, FloatingPointCard
    FloatingPointCard.tsx Animated card attached to selected marker (includes focus embed copy)
    DataTable.tsx         Synced data table with per-row focus embed copy
    FilterBar.tsx         Category filter pills with per-category embed copy
    SidebarFilterLayout.tsx Sidebar-filter embed layout
    MapEditorContent.tsx  Main editor layout — map + data panel
  lib/
    embedSnippet.ts      Shared iframe snippet generators (focus + category embeds)
    api.ts               All API calls to the worker
  hooks/
    useAutoRotate.ts     Auto-rotate tour logic (stops permanently on any interaction)
  pages/
    MapEditorPage.tsx    Full editor page
    EmbedPage.tsx        Embed-only view (parses ?focus, ?category, ?demo)
  styles/
    index.css            Global styles / Tailwind entry
```
