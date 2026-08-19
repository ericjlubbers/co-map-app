# Colorado Map App (co-map-app)

## Overview

Internal mapping platform for The Colorado Sun newsroom. Reporters create interactive maps ranging from simple locator maps to complex multi-point visualizations, then embed them in WordPress via iframe. Built with React 19 + Vite + Tailwind v4 + Leaflet on the frontend and Cloudflare Workers + D1 on the backend.

## Tech Stack

- **React 19** + **TypeScript** + **Vite 7** — frontend SPA
- **Leaflet** / **react-leaflet** — interactive map rendering
- **react-leaflet-cluster** / **leaflet.markercluster** — marker clustering
- **Tailwind CSS v4** — styling (via `@tailwindcss/vite` plugin)
- **Font Awesome** — category and UI icons (requires Pro NPM token for pro icons)
- **TanStack Table** + **TanStack Virtual** — data table with virtualized rows
- **react-router-dom** — client-side routing
- **Hono** — Cloudflare Worker API framework
- **Cloudflare D1** (SQLite) — map and user data storage
- **Cloudflare Workers** — unified deployment target (serves both API and static assets)
- **ESLint 9** + **typescript-eslint** — linting

## Build & Develop

### Prerequisites

- Node.js 20+
- npm
- Cloudflare account (for production deploy / local D1)

### Install

```bash
npm install
```

> Font Awesome Pro packages require `FONTAWESOME_NPM_AUTH_TOKEN` in the environment or `.npmrc`.

### Frontend dev server

```bash
npm run dev
```

Starts Vite dev server on port 5173. API requests to `/api/*` are proxied to `http://localhost:8787` (the local Worker).

### Backend (Worker) dev server

```bash
cd worker
npx wrangler d1 migrations apply co-map-db --local   # first time only
npx wrangler dev src/index.ts --port 8787
```

### Type-check

```bash
npx tsc --noEmit
```

### Build

```bash
npm run build
```

Runs `tsc -b` (type-check) then `vite build`. Output goes to `dist/`.

### Preview production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Testing

There is no dedicated test framework configured in this project. Verification is manual:

1. Run `npx tsc --noEmit` — no type errors.
2. Run dev servers (frontend + worker), open a map, verify visual/interactive behavior.
3. For embed testing, use `?focus=<uuid>`, `?category=<name>`, `?demo=1` URL parameters.

## Deployment

### How it works

The app deploys as a **single Cloudflare Worker** that serves both:
- The API (`/api/*` routes handled by Hono)
- The Vite-built frontend static assets (with SPA fallback for client-side routing)

Pushes to `main` trigger the GitHub Actions workflow at `.github/workflows/deploy.yml`, which:
1. Installs frontend deps and builds the Vite app
2. Installs worker deps
3. Deploys to Cloudflare Workers production (`--env production`)

Pull requests deploy to a staging environment (`--env staging`).

### Where

- **Production:** `https://maps.coloradosun.com` (CNAME to Cloudflare Workers domain)
- **Staging:** `co-map-worker-staging` Workers subdomain
- **Worker name:** `co-map-worker`

### Environments (wrangler.toml)

| Environment | Command | D1 Database |
|---|---|---|
| Local/dev | `wrangler dev` | `co-map-db` (local) |
| Staging | `wrangler deploy --env staging` | `co-map-db-staging` |
| Production | `wrangler deploy --env production` | `co-map-db-prod` |

### D1 Migrations

```bash
# Local
cd worker
npx wrangler d1 migrations apply co-map-db --local

# Production
npx wrangler d1 migrations apply co-map-db-prod --remote --env production
```

Migrations are in `worker/migrations/` (0001_initial, 0002_auth, 0003_user_status_and_settings).

### First-time production setup

1. Create the production D1 database: `npx wrangler d1 create co-map-db-prod`
2. Put the returned `database_id` in `worker/wrangler.toml` under `[env.production.d1_databases]`
3. Apply migrations to production
4. Set GitHub Secrets (see below)
5. Push to `main`
6. Create the first admin user via `POST /api/auth/setup` (only works when zero users exist)
7. Add DNS CNAME: `maps.coloradosun.com` -> Workers domain

## Architecture

### Directory Structure

```
co-map-app/
├── src/                        # Frontend (React + Vite)
│   ├── App.tsx                 # Root app layout, routing
│   ├── main.tsx                # React entry point
│   ├── config.ts               # All configurable defaults (tiles, fonts, colors, categories)
│   ├── types.ts                # Shared TypeScript types (DesignState, PointData, etc.)
│   ├── pages/
│   │   ├── IndexPage.tsx       # Map list / dashboard
│   │   ├── MapEditorPage.tsx   # Full map editor
│   │   ├── EmbedPage.tsx       # Embed-only view (parses URL params)
│   │   ├── LoginPage.tsx       # Auth login
│   │   ├── AdminPage.tsx       # User management
│   │   └── SettingsPage.tsx    # App settings
│   ├── components/
│   │   ├── MapView.tsx          # Core Leaflet map with clustering, overlays, layers
│   │   ├── DesignSidebar.tsx    # Settings-mode design controls (accordion)
│   │   ├── CustomizeSidebar.tsx # Customize-mode element selection & styling
│   │   ├── MapEditorContent.tsx # Main editor layout — map + data panel
│   │   ├── DataTable.tsx        # Synced data table with virtualized rows
│   │   ├── FilterBar.tsx        # Category filter pills
│   │   ├── FloatingPointCard.tsx # Animated card attached to selected marker
│   │   ├── SidebarFilterLayout.tsx # Sidebar-filter embed layout
│   │   ├── MarkerIcon.tsx       # Custom marker rendering (shapes, connectors)
│   │   ├── ClusterIcon.tsx      # Cluster icon (donut, gradient, minimal)
│   │   └── layers/              # Individual map layers
│   │       ├── RoadLayer.tsx
│   │       ├── WaterwayLayer.tsx
│   │       ├── CityLayer.tsx
│   │       ├── ParkLayer.tsx
│   │       ├── LakeLayer.tsx
│   │       ├── LabelLayer.tsx
│   │       ├── PrimaryElementsLayer.tsx
│   │       └── BoundsOverlay.tsx
│   ├── context/
│   │   ├── DesignContext.tsx   # Design state provider, auto-save (1s debounce)
│   │   ├── AuthContext.tsx     # Authentication state provider
│   │   └── SettingsContext.tsx # App-wide settings provider
│   ├── hooks/
│   │   ├── useAutoRotate.ts    # Auto-rotate category tour logic
│   │   ├── useLocationData.ts  # Data loading from Google Sheets / seed
│   │   └── useLOD.ts           # Level-of-detail zoom thresholds
│   ├── lib/
│   │   ├── api.ts              # All API calls to the Worker
│   │   ├── embedSnippet.ts     # Iframe snippet generators
│   │   ├── googleSheets.ts     # Google Sheets CSV sync
│   │   ├── faIcons.ts          # Font Awesome icon loading
│   │   ├── tilePrefetch.ts     # Tile prefetching for embed UX
│   │   └── starterData.ts      # Example/seed data
│   ├── data/
│   │   ├── coloradoBorder.ts   # Colorado state boundary GeoJSON
│   │   ├── coloradoCounties.ts # County polygon data
│   │   └── seedLocations.ts    # Dev seed data
│   └── styles/
│       └── index.css           # Global styles / Tailwind entry
├── worker/                     # Backend (Cloudflare Worker + Hono)
│   ├── src/
│   │   ├── index.ts            # Hono app — all API routes, edge caching
│   │   ├── auth.ts             # PBKDF2 password hashing, session management
│   │   ├── types.ts            # Worker-specific types (Env, MapRecord, UserRecord)
│   │   └── schema.sql          # Full DB schema (reference)
│   ├── migrations/             # D1 migration SQL files
│   │   ├── 0001_initial.sql
│   │   ├── 0002_auth.sql
│   │   └── 0003_user_status_and_settings.sql
│   ├── wrangler.toml           # Cloudflare Workers config (dev/staging/production)
│   └── package.json            # Worker dependencies (hono, nanoid, wrangler)
├── .github/workflows/deploy.yml # CI/CD: build + deploy on push to main
├── vite.config.ts              # Vite config (React + Tailwind + API proxy)
├── package.json                # Frontend dependencies and scripts
├── tsconfig.json               # TypeScript project references
├── eslint.config.js            # ESLint flat config
└── ROADMAP.md                  # Development roadmap and sprint status
```

### Key Patterns

- **Two-mode editor:** Settings (DesignSidebar with accordion design controls) | Customize (element-level selection, styling, and primary elements). Publish stays in toolbar as status dropdown / embed code.
- **DesignState:** A large typed object holding all visual/design configuration. Stored as JSON in D1 `design_state` column. Auto-saved with 1-second debounce via `DesignContext`.
- **DataConfig:** Holds point/region layer data, column mappings, Google Sheets sync URL, primary elements, and publication bounds. Stored as JSON in D1 `data_config` column.
- **Edge caching:** Map JSON responses cached at Cloudflare edge for 24h with 1h stale-while-revalidate. Cache purged on map update.
- **SPA fallback:** Worker serves static assets with `not_found_handling = "single-page-application"` so client-side routing works.
- **Session auth:** PBKDF2 password hashing (Web Crypto API), session tokens stored in D1, validated via cookie. First user created via `/api/auth/setup` endpoint (only works when zero users exist).
- **Overpass strategy:** All Overpass queries use statewide `CO_BBOX` constant — data fetched once per feature type, cached in-memory client-side with zoom-based level-of-detail.
- **Primary Elements:** Click-to-select map elements (roads, cities, etc.), promote to a dedicated data layer with per-element style overrides. Geometry is copied (not referenced).

### API Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/setup` | None (first user only) | Create initial admin |
| POST | `/api/auth/login` | None | Login, returns session cookie |
| POST | `/api/auth/logout` | Session | Logout |
| GET | `/api/auth/me` | Session | Current user info |
| GET | `/api/users` | Admin | List users |
| POST | `/api/users` | Admin | Create user |
| PUT | `/api/users/:id/password` | Admin | Reset password |
| DELETE | `/api/users/:id` | Admin | Delete user |
| PUT | `/api/users/:id/status` | Admin | Archive/activate user |
| GET | `/api/settings` | Session | Get app settings |
| PUT | `/api/settings` | Session | Update app settings |
| GET | `/api/maps` | Session | List maps |
| GET | `/api/maps/:id` | None (published) / Session (draft) | Get map (edge-cached) |
| POST | `/api/maps` | Session | Create map |
| PUT | `/api/maps/:id` | Session | Update map (purges cache) |
| DELETE | `/api/maps/:id` | Session | Delete map |
| POST | `/api/maps/:id/duplicate` | Session | Duplicate map |
| POST | `/api/geocode` | Session | Forward geocode address |

## Environment Variables

### Frontend (.env)

| Variable | Purpose |
|---|---|
| `VITE_STADIA_API_KEY` | API key for Stadia Maps tile layers (Watercolor, Toner, Alidade, Outdoors, Terrain) |

### GitHub Secrets (CI/CD)

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers + D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `VITE_STADIA_API_KEY` | Stadia Maps API key (injected at build time) |
| `FONTAWESOME_NPM_AUTH_TOKEN` | Font Awesome Pro NPM registry auth token |

### Worker Config (wrangler.toml vars)

| Variable | Purpose |
|---|---|
| `CORS_ORIGIN` | Allowed CORS origin (varies by environment) |

## Branch Model

- **`main`** — production branch. Pushes trigger automatic deployment to Cloudflare Workers production.
- **Feature branches** — use `feature/<name>` or `sprint-<N>/<name>` convention. Open PRs against `main`.
- **Pull requests** — PRs to `main` trigger staging deployment for preview.
- **Fork workflow:** `origin` = `ericjlubbers/co-map-app` (fork), `upstream` = `thecoloradosun/co-map-app` (upstream org). Sync from upstream, push to fork, open PRs to upstream.
- **Commit before push:** Always run `npx tsc --noEmit` and `npm run lint` before pushing.

## Conventions

### Coding Style

- **TypeScript everywhere** — strict typing, no `any` unless unavoidable. All types in `src/types.ts`.
- **React functional components** with hooks — no class components.
- **Context + hooks pattern** — global state via React Context providers (`DesignContext`, `AuthContext`, `SettingsContext`), consumed via custom hooks (`useDesign()`, `useAuth()`).
- **Tailwind CSS v4** — utility-first styling. No separate CSS modules. Global styles in `src/styles/index.css`.
- **File naming:** PascalCase for components (`MapView.tsx`, `FloatingPointCard.tsx`), camelCase for utilities/hooks (`useAutoRotate.ts`, `embedSnippet.ts`).
- **Layer components** in `src/components/layers/` — one file per map layer type.
- **Config-driven** — visual defaults in `src/config.ts`, overridden at runtime by DesignState.

### Commit Format

Use **conventional commits**:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code restructuring without behavior change
- `chore:` — tooling, deps, config
- `style:` — formatting, no logic change

Example: `feat: add sidebar-filter mobile drawer layout`

### DesignState Changes

When adding a new design parameter:
1. Add the field to the `DesignState` interface in `src/types.ts`
2. Add a default value in `src/config.ts` (in the `DEFAULT_DESIGN_STATE` object)
3. Add UI control in `DesignSidebar.tsx` (or `CustomizeSidebar.tsx`)
4. The `DesignContext` auto-save handles persistence — no manual save wiring needed

### Worker API Changes

When adding a new API route:
1. Add the route in `worker/src/index.ts` using Hono route methods (app.get, app.post, app.put, app.delete)
2. Use `requireAuth()` middleware for protected routes
3. Use `c.env.DB.prepare()` for D1 queries
4. Purge edge cache via `purgeCachedMap()` if the route modifies map data
5. Add types to `worker/src/types.ts` as needed

### Data Migrations

When changing the DB schema:
1. Create a new migration file in `worker/migrations/` (e.g., `0004_description.sql`)
2. Test locally: `npx wrangler d1 migrations apply co-map-db --local`
3. Apply to production after merge: `npx wrangler d1 migrations apply co-map-db-prod --remote --env production`
