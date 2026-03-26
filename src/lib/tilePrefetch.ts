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
  const subdomains = ["a", "b", "c"];
  const s = subdomains[(x + y) % subdomains.length];
  return template
    .replace("{s}", s)
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y))
    .replace("{r}", "");
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

  let index = 0;
  function loadNext() {
    if (index >= urls.length) return;
    const url = urls[index++];
    const img = new Image();
    img.onload = loadNext;
    img.onerror = loadNext;
    img.src = url;
  }

  const startCount = Math.min(concurrency, urls.length);
  for (let i = 0; i < startCount; i++) {
    loadNext();
  }
}
