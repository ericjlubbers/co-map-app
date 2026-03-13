# Colorado Map App

An interactive map of Colorado locations built with React, Leaflet, and Tailwind CSS. Features categorized markers with clustering, filtering, text search, and a synced data table.

Deployed automatically to GitHub Pages on push to `main`.

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

This key is required for the Stadia Watercolor tile layer. For the CARTO light basemap no key is needed.

## Configuration

All map and display options live in `src/config.ts`.

### Tile Presets

Set `TILE_PRESET` to switch the basemap:

| Preset              | Description                           |
| ------------------- | ------------------------------------- |
| `"carto-light"`     | Clean light basemap via CARTO         |
| `"stadia-watercolor"` | Stamen Watercolor via Stadia Maps (default) |

```ts
export const TILE_PRESET: TilePreset = "stadia-watercolor";
```

### Cluster Styles

Set `CLUSTER_STYLE` to change how marker clusters render:

| Style        | Description                                  |
| ------------ | -------------------------------------------- |
| `"donut"`    | Pie-ring showing category proportions (default) |
| `"gradient"` | Color based on dominant category             |
| `"minimal"`  | Clean monochrome circles                     |

```ts
export const CLUSTER_STYLE: ClusterStyle = "donut";
```

### Font Family

Set `FONT_FAMILY` to swap the app-wide typeface:

| Font                       |
| -------------------------- |
| `"Libre Franklin"` (default) |
| `"Atkinson Hyperlegible"`  |
| `"Plus Jakarta Sans"`      |

```ts
export const FONT_FAMILY: FontFamily = "Libre Franklin";
```

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

Pushes to `main` trigger the GitHub Actions workflow at `.github/workflows/deploy.yml`, which builds the app and deploys to GitHub Pages.

The `VITE_STADIA_API_KEY` secret must be added to the repository (**Settings → Secrets and variables → Actions**) for the Stadia tile layer to work in production.

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
  App.tsx              Main app layout (map + table + filters)
  config.ts            All configurable options
  types.ts             Shared TypeScript types
  components/
    MapView.tsx        Leaflet map with clustering
    DataTable.tsx      Searchable/filterable data table
    FilterBar.tsx      Category filter pills
    ClusterIcon.tsx    Custom cluster icon renderer
    MarkerIcon.tsx     Custom marker icon renderer
    PointPopup.tsx     Map popup content
  data/
    seedLocations.ts   Static location dataset
  hooks/
    useLocationData.ts Data-fetching hook
  styles/
    index.css          Global styles / Tailwind entry
```
