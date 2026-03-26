# L3 — Tile Prefetching for Embed Performance

## Goal
Add tile prefetching on embed page load so that tiles for the Colorado region at common zoom levels are pre-cached by the browser, making pan/zoom feel instant to end users.

## Context
- Leaflet caches tiles in browser memory after they're loaded, but doesn't prefetch tiles outside the current viewport
- The embed page (`src/pages/EmbedPage.tsx`) is the primary consumer — editor page is less critical since users pan around naturally
- Colorado's bounding box is defined in `src/config.ts` as `MAP_MAX_BOUNDS: [[36.5, -109.5], [41.5, -101.5]]`
- Tile URLs follow the standard `{z}/{x}/{y}` pattern — we can calculate which tiles cover the CO bbox at each zoom level and preload them via offscreen `<img>` elements
- Current tile presets are in `src/config.ts` `TILE_PRESETS` record, accessed via `getTileConfig(preset)`

## Changes Required

### 1. Create `src/lib/tilePrefetch.ts` (new file)

```typescript
/**
 * Tile prefetching utility — preloads map tiles for a given bounding box
 * at specified zoom levels by creating offscreen Image objects.
 */

/** Convert lat/lng to tile coordinates at a given zoom level */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

/** Get all tile coordinates covering a bounding box at a given zoom level */
function getTilesForBounds(
  south: number, west: number, north: number, east: number, zoom: number
): Array<{ x: number; y: number; z: number }> {
  const topLeft = latLngToTile(north, west, zoom);
  const bottomRight = latLngToTile(south, east, zoom);
  const tiles: Array<{ x: number; y: number; z: number }> = [];
  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}

/** Resolve a tile URL template to a concrete URL */
function resolveTileUrl(template: string, x: number, y: number, z: number): string {
  // Handle {s} subdomain placeholder — pick one deterministically
  const subdomains = ["a", "b", "c"];
  const s = subdomains[(x + y) % subdomains.length];
  return template
    .replace("{s}", s)
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y))
    .replace("{r}", ""); // retina placeholder — empty for standard
}

interface PrefetchOptions {
  /** Tile URL template (e.g., "https://{s}.basemaps.cartocdn.com/.../{z}/{x}/{y}{r}.png") */
  tileUrl: string;
  /** Optional labels tile URL to also prefetch */
  labelsUrl?: string;
  /** Bounding box [south, west, north, east] */
  bounds: [number, number, number, number];
  /** Zoom levels to prefetch (default: [6, 7, 8]) */
  zoomLevels?: number[];
  /** Max concurrent requests (default: 4) */
  concurrency?: number;
}

/**
 * Prefetch tiles for a bounding box at given zoom levels.
 * Uses offscreen Image objects to trigger browser HTTP caching.
 * Non-blocking — failures are silently ignored.
 */
export function prefetchTiles(options: PrefetchOptions): void {
  const {
    tileUrl,
    labelsUrl,
    bounds,
    zoomLevels = [6, 7, 8],
    concurrency = 4,
  } = options;

  // Collect all tile URLs to prefetch
  const urls: string[] = [];
  const [south, west, north, east] = bounds;

  for (const zoom of zoomLevels) {
    const tiles = getTilesForBounds(south, west, north, east, zoom);
    for (const tile of tiles) {
      urls.push(resolveTileUrl(tileUrl, tile.x, tile.y, tile.z));
      if (labelsUrl) {
        urls.push(resolveTileUrl(labelsUrl, tile.x, tile.y, tile.z));
      }
    }
  }

  // Load tiles with limited concurrency using a simple queue
  let index = 0;
  function loadNext() {
    if (index >= urls.length) return;
    const url = urls[index++];
    const img = new Image();
    img.onload = loadNext;
    img.onerror = loadNext; // skip failures, continue prefetching
    img.src = url;
  }

  // Start `concurrency` parallel chains
  const startCount = Math.min(concurrency, urls.length);
  for (let i = 0; i < startCount; i++) {
    loadNext();
  }
}
```

### 2. Update `src/pages/EmbedPage.tsx`

Add a `useEffect` that calls `prefetchTiles` on mount, using the current tile preset config.

```typescript
import { prefetchTiles } from "../lib/tilePrefetch";
import { getTileConfig, MAP_MAX_BOUNDS } from "../config";

// Inside the component, after design state is available:
useEffect(() => {
  const tileConfig = getTileConfig(design.tilePreset);
  prefetchTiles({
    tileUrl: tileConfig.url,
    labelsUrl: design.showLabels ? tileConfig.labelsUrl : undefined,
    bounds: [
      MAP_MAX_BOUNDS[0][0], // south
      MAP_MAX_BOUNDS[0][1], // west
      MAP_MAX_BOUNDS[1][0], // north
      MAP_MAX_BOUNDS[1][1], // east
    ],
    zoomLevels: [6, 7, 8, 9],
    concurrency: 4,
  });
}, [design.tilePreset, design.showLabels]);
```

**Important**: This effect should only run on embed pages. The editor page does NOT need prefetching. Use `requestIdleCallback` (with fallback to `setTimeout`) to defer prefetching until after the initial render is complete, so it doesn't compete with the visible tiles Leaflet is loading:

```typescript
useEffect(() => {
  const tileConfig = getTileConfig(design.tilePreset);
  const doPrefetch = () => {
    prefetchTiles({
      tileUrl: tileConfig.url,
      labelsUrl: design.showLabels ? tileConfig.labelsUrl : undefined,
      bounds: [MAP_MAX_BOUNDS[0][0], MAP_MAX_BOUNDS[0][1], MAP_MAX_BOUNDS[1][0], MAP_MAX_BOUNDS[1][1]],
      zoomLevels: [6, 7, 8, 9],
      concurrency: 4,
    });
  };
  if ("requestIdleCallback" in window) {
    (window as Window).requestIdleCallback(doPrefetch);
  } else {
    setTimeout(doPrefetch, 2000);
  }
}, [design.tilePreset, design.showLabels]);
```

### 3. Optionally increase Leaflet `keepBuffer` in `src/components/MapView.tsx`

Leaflet's `TileLayer` accepts a `keepBuffer` prop (default: 2) that controls how many tiles beyond the viewport are kept loaded. Increasing this to 3 or 4 means more tiles survive pan gestures:

Find where `<TileLayer>` is rendered and add `keepBuffer={4}`.

## Tile Count Estimation
At each zoom level, the number of tiles covering CO:
- z6: ~4 tiles (CO is small at this zoom)
- z7: ~9 tiles
- z8: ~20 tiles
- z9: ~56 tiles

Total: ~89 tiles × 256KB avg = ~22MB. This is acceptable for an embed that will be viewed for an extended period. The tiles are loaded with low priority after the visible viewport tiles.

If 22MB feels heavy, reduce to `zoomLevels: [7, 8]` (~29 tiles, ~7MB).

## Verification
1. `npx tsc --noEmit` — no type errors
2. Load an embed page → open Network tab (DevTools):
   - Visible tiles load first (normal Leaflet behavior)
   - After a brief idle period, additional tile requests appear for surrounding zoom levels
   - Tile responses have `200` or `304` status
3. Pan or zoom slightly → tiles in prefetched area load from disk/memory cache (fast, no network wait)
4. Page load time is NOT noticeably slower (prefetch deferred via `requestIdleCallback`)
5. `npx vite build` — production build succeeds

## After completion
Update ROADMAP.md: change L3 status from 🔲 to ✅.
