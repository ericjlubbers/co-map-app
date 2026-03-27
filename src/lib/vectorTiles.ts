// ── Vector tile / GeoJSON data utilities ────────────────────────────────────
// Roads and waterways are fetched from the Overpass API (OpenStreetMap).
// Cities and peaks use a bundled static dataset to avoid large API calls.

import type { PrimaryElementSourceType } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Colorado bounding box (slightly padded)
const CO_BBOX = "36.993,-109.045,41.003,-102.052";

// ── Overpass OSM element types ───────────────────────────────────────────────
interface OsmNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OsmWayGeomNode {
  lat: number;
  lon: number;
}

interface OsmWay {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: OsmWayGeomNode[];
}

type OsmElement = OsmNode | OsmWay;

// Tags that indicate a way should be treated as a polygon (area)
const AREA_TAGS = new Set(["leisure", "natural", "boundary", "landuse"]);

// ── Convert Overpass JSON elements to GeoJSON ────────────────────────────────
function osmElementsToGeoJSON(
  elements: OsmElement[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const el of elements) {
    if (el.type === "way" && el.geometry && el.geometry.length > 0) {
      const coords = el.geometry.map((n) => [n.lon, n.lat]);
      const tags = el.tags ?? {};
      const isArea =
        Object.keys(tags).some((k) => AREA_TAGS.has(k)) &&
        coords.length >= 4 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1];

      features.push({
        type: "Feature",
        id: `way/${el.id}`,
        properties: { ...tags, osm_id: el.id, osm_type: "way" },
        geometry: isArea
          ? { type: "Polygon", coordinates: [coords] }
          : { type: "LineString", coordinates: coords },
      });
    } else if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      features.push({
        type: "Feature",
        id: `node/${el.id}`,
        properties: { ...(el.tags ?? {}), osm_id: el.id, osm_type: "node" },
        geometry: {
          type: "Point",
          coordinates: [el.lon, el.lat],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

// ── Session-scoped in-memory cache ──────────────────────────────────────────
const _cache = new Map<string, GeoJSON.FeatureCollection>();

async function overpassFetch(
  query: string,
  cacheKey: string,
  retries = 1
): Promise<GeoJSON.FeatureCollection> {
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Wait before retrying (2s, 4s, …)
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    try {
      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (response.status === 429 || response.status === 504) {
        lastError = new Error(`Overpass API error: ${response.status}`);
        continue; // retry on rate-limit or gateway timeout
      }
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = (await response.json()) as { elements?: OsmElement[] };
      const geojson = osmElementsToGeoJSON(data.elements ?? []);
      _cache.set(cacheKey, geojson);
      return geojson;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === retries) break;
    }
  }
  throw lastError ?? new Error("Overpass API request failed");
}

// ── Public data-fetch functions ──────────────────────────────────────────────

/** Fetch Colorado motorways from Overpass API. */
export async function fetchColoradoMotorways(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
way["highway"="motorway"];
out geom;`;
  return overpassFetch(query, "co-motorways");
}

/** Fetch Colorado trunk roads from Overpass API. */
export async function fetchColoradoTrunkRoads(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
way["highway"="trunk"];
out geom;`;
  return overpassFetch(query, "co-trunk-roads");
}

/** Fetch Colorado primary roads from Overpass API. */
export async function fetchColoradoPrimaryRoads(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
way["highway"="primary"];
out geom;`;
  return overpassFetch(query, "co-primary-roads");
}

/** Fetch Colorado secondary roads from Overpass API. */
export async function fetchColoradoSecondaryRoads(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
way["highway"="secondary"];
out geom;`;
  return overpassFetch(query, "co-secondary-roads");
}

/** Fetch Colorado tertiary roads from Overpass API. */
export async function fetchColoradoTertiaryRoads(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
way["highway"="tertiary"];
out geom;`;
  return overpassFetch(query, "co-tertiary-roads");
}

/** Fetch Colorado parks (leisure=park, boundary=national_park) from Overpass API. */
export async function fetchColoradoParks(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
(
  way["leisure"="park"]["name"];
  relation["leisure"="park"]["name"];
  way["boundary"="national_park"]["name"];
  relation["boundary"="national_park"]["name"];
  way["leisure"="nature_reserve"]["name"];
  relation["leisure"="nature_reserve"]["name"];
);
out geom;`;
  return overpassFetch(query, "co-parks");
}

/** Fetch Colorado lakes (natural=water + water=lake/reservoir) from Overpass API. */
export async function fetchColoradoLakes(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
(
  way["natural"="water"]["water"~"^(lake|reservoir)$"]["name"];
  relation["natural"="water"]["water"~"^(lake|reservoir)$"]["name"];
);
out geom;`;
  return overpassFetch(query, "co-lakes");
}

/** Fetch Colorado rivers from Overpass API. */
export async function fetchColoradoRivers(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
way["waterway"="river"];
out geom;`;
  return overpassFetch(query, "co-rivers");
}

/** Fetch named Colorado streams from Overpass API. */
export async function fetchColoradoStreams(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:120][bbox:${CO_BBOX}];
way["waterway"="stream"]["name"];
out geom;`;
  return overpassFetch(query, "co-streams");
}

// ── Static Colorado cities & peaks dataset ──────────────────────────────────
export interface CityFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Elevation in meters (OSM / Wikipedia source) */
  elevation_m: number;
  population?: number;
  type: "city" | "town" | "peak";
}

export const COLORADO_CITIES: CityFeature[] = [
  // Major cities (elevation in meters)
  { id: "denver", name: "Denver", lat: 39.7392, lng: -104.9903, elevation_m: 1609, population: 715522, type: "city" },
  { id: "colorado-springs", name: "Colorado Springs", lat: 38.8339, lng: -104.8214, elevation_m: 1839, population: 478961, type: "city" },
  { id: "aurora", name: "Aurora", lat: 39.7294, lng: -104.8319, elevation_m: 1674, population: 366623, type: "city" },
  { id: "fort-collins", name: "Fort Collins", lat: 40.5853, lng: -105.0844, elevation_m: 1524, population: 164672, type: "city" },
  { id: "lakewood", name: "Lakewood", lat: 39.7047, lng: -105.0814, elevation_m: 1667, population: 159466, type: "city" },
  { id: "thornton", name: "Thornton", lat: 39.8680, lng: -104.9719, elevation_m: 1625, population: 136208, type: "city" },
  { id: "arvada", name: "Arvada", lat: 39.8028, lng: -105.0875, elevation_m: 1677, population: 118428, type: "city" },
  { id: "westminster", name: "Westminster", lat: 39.8366, lng: -105.0372, elevation_m: 1635, population: 113479, type: "city" },
  { id: "pueblo", name: "Pueblo", lat: 38.2544, lng: -104.6091, elevation_m: 1432, population: 111127, type: "city" },
  { id: "centennial", name: "Centennial", lat: 39.5807, lng: -104.8772, elevation_m: 1696, population: 108418, type: "city" },
  { id: "boulder", name: "Boulder", lat: 40.0150, lng: -105.2705, elevation_m: 1655, population: 105112, type: "city" },
  { id: "greeley", name: "Greeley", lat: 40.4233, lng: -104.7091, elevation_m: 1407, population: 100646, type: "city" },
  { id: "longmont", name: "Longmont", lat: 40.1672, lng: -105.1019, elevation_m: 1508, population: 100407, type: "city" },
  { id: "loveland", name: "Loveland", lat: 40.3978, lng: -105.0750, elevation_m: 1538, population: 78277, type: "city" },
  { id: "durango", name: "Durango", lat: 37.2753, lng: -107.8801, elevation_m: 1996, population: 19071, type: "city" },
  { id: "grand-junction", name: "Grand Junction", lat: 39.0639, lng: -108.5506, elevation_m: 1402, population: 65560, type: "city" },
  { id: "broomfield", name: "Broomfield", lat: 39.9205, lng: -105.0867, elevation_m: 1631, population: 68341, type: "city" },
  { id: "castle-rock", name: "Castle Rock", lat: 39.3722, lng: -104.8561, elevation_m: 1878, population: 71000, type: "city" },
  { id: "parker", name: "Parker", lat: 39.5186, lng: -104.7613, elevation_m: 1843, population: 58512, type: "city" },
  { id: "brighton", name: "Brighton", lat: 39.9853, lng: -104.8178, elevation_m: 1547, population: 40200, type: "city" },
  { id: "sterling", name: "Sterling", lat: 40.6258, lng: -103.2083, elevation_m: 1194, population: 14234, type: "city" },
  { id: "montrose", name: "Montrose", lat: 38.4783, lng: -107.8762, elevation_m: 1771, population: 20073, type: "city" },
  { id: "steamboat-springs", name: "Steamboat Springs", lat: 40.4850, lng: -106.8317, elevation_m: 2080, population: 12088, type: "city" },
  { id: "glenwood-springs", name: "Glenwood Springs", lat: 39.5505, lng: -107.3248, elevation_m: 1757, population: 10135, type: "city" },
  { id: "aspen", name: "Aspen", lat: 39.1911, lng: -106.8175, elevation_m: 2414, population: 7359, type: "city" },
  { id: "telluride", name: "Telluride", lat: 37.9375, lng: -107.8123, elevation_m: 2667, population: 2584, type: "city" },
  { id: "vail", name: "Vail", lat: 39.6433, lng: -106.3744, elevation_m: 2457, population: 5459, type: "city" },
  { id: "breckenridge", name: "Breckenridge", lat: 39.4819, lng: -106.0484, elevation_m: 2926, population: 4540, type: "city" },
  { id: "leadville", name: "Leadville", lat: 39.2508, lng: -106.2925, elevation_m: 3094, population: 2602, type: "city" },
  { id: "salida", name: "Salida", lat: 38.5347, lng: -105.9988, elevation_m: 2235, population: 5236, type: "city" },
  { id: "trinidad", name: "Trinidad", lat: 37.1695, lng: -104.4966, elevation_m: 1836, population: 8444, type: "city" },
  // Notable peaks (elevation in meters)
  { id: "mount-elbert", name: "Mt. Elbert", lat: 39.1178, lng: -106.4453, elevation_m: 4401, type: "peak" },
  { id: "mount-massive", name: "Mt. Massive", lat: 39.1875, lng: -106.4756, elevation_m: 4396, type: "peak" },
  { id: "mount-harvard", name: "Mt. Harvard", lat: 38.9244, lng: -106.3206, elevation_m: 4395, type: "peak" },
  { id: "mount-lincoln", name: "Mt. Lincoln", lat: 39.3514, lng: -106.1114, elevation_m: 4354, type: "peak" },
  { id: "pikes-peak", name: "Pikes Peak", lat: 38.8405, lng: -105.0442, elevation_m: 4302, type: "peak" },
  { id: "mount-evans", name: "Mt. Evans", lat: 39.5883, lng: -105.6436, elevation_m: 4348, type: "peak" },
  { id: "longs-peak", name: "Longs Peak", lat: 40.2550, lng: -105.6150, elevation_m: 4346, type: "peak" },
  { id: "mount-wilson", name: "Mt. Wilson", lat: 37.8397, lng: -107.9914, elevation_m: 4342, type: "peak" },
  { id: "uncompahgre-peak", name: "Uncompahgre Peak", lat: 38.0717, lng: -107.4623, elevation_m: 4361, type: "peak" },
  { id: "crestone-peak", name: "Crestone Peak", lat: 37.9669, lng: -105.5856, elevation_m: 4357, type: "peak" },
];

// ── Elevation unit helpers ───────────────────────────────────────────────────

/** Convert meters to feet. */
export function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

/**
 * Format an elevation value for display.
 * @param elevation_m elevation in meters
 * @param useMetric   true → show meters, false (default) → show feet
 */
export function formatElevation(elevation_m: number, useMetric: boolean): string {
  if (useMetric) {
    return `${elevation_m.toLocaleString()} m`;
  }
  return `${metersToFeet(elevation_m).toLocaleString()} ft`;
}

// ── Quicksearch across cached data (C4) ─────────────────────────────────────

export interface FeatureSearchResult {
  name: string;
  sourceType: PrimaryElementSourceType;
  sourceIds: string[];
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  lat: number;
  lng: number;
}

const CACHE_KEY_SOURCE_TYPE: Record<string, PrimaryElementSourceType> = {
  "co-motorways": "road",
  "co-trunk-roads": "road",
  "co-primary-roads": "road",
  "co-secondary-roads": "road",
  "co-tertiary-roads": "road",
  "co-rivers": "waterway",
  "co-streams": "waterway",
  "co-parks": "park",
  "co-lakes": "lake",
};

function getFeatureCenter(geometry: GeoJSON.Geometry): [number, number] | null {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates[1], geometry.coordinates[0]];
    case "LineString": {
      const mid = Math.floor(geometry.coordinates.length / 2);
      const c = geometry.coordinates[mid];
      return [c[1], c[0]];
    }
    case "Polygon": {
      const ring = geometry.coordinates[0];
      const avgLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const avgLng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      return [avgLat, avgLng];
    }
    case "MultiLineString": {
      const line = geometry.coordinates[0];
      if (!line || line.length === 0) return null;
      const mid = Math.floor(line.length / 2);
      return [line[mid][1], line[mid][0]];
    }
    default:
      return null;
  }
}

/** Search across all cached Overpass data and static cities by name. */
export function searchCachedFeatures(
  query: string,
  layerFilters: Set<PrimaryElementSourceType>,
  maxResults = 50,
): FeatureSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: FeatureSearchResult[] = [];
  const seen = new Set<string>(); // dedup by name:sourceType

  // Search cities/peaks
  if (layerFilters.has("city")) {
    for (const c of COLORADO_CITIES) {
      if (c.name.toLowerCase().includes(q)) {
        const key = `city:${c.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          name: c.name,
          sourceType: "city",
          sourceIds: [c.id],
          geometry: { type: "Point", coordinates: [c.lng, c.lat] },
          properties: { type: c.type, population: c.population, elevation_m: c.elevation_m },
          lat: c.lat,
          lng: c.lng,
        });
        if (results.length >= maxResults) return results;
      }
    }
  }

  // Search cached Overpass features
  for (const [cacheKey, sourceType] of Object.entries(CACHE_KEY_SOURCE_TYPE)) {
    if (!layerFilters.has(sourceType)) continue;
    const fc = _cache.get(cacheKey);
    if (!fc) continue;

    for (const feature of fc.features) {
      const name = (feature.properties?.name ?? feature.properties?.ref ?? "") as string;
      if (!name || !name.toLowerCase().includes(q)) continue;

      const key = `${sourceType}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const center = getFeatureCenter(feature.geometry);
      if (!center) continue;

      results.push({
        name,
        sourceType,
        sourceIds: [String(feature.id ?? "")],
        geometry: feature.geometry,
        properties: (feature.properties ?? {}) as Record<string, unknown>,
        lat: center[0],
        lng: center[1],
      });

      if (results.length >= maxResults) return results;
    }
  }

  return results;
}

// ── Bounds checking utilities (C4) ──────────────────────────────────────────

export type BoundsStatus = "in" | "partial" | "out";

/** Check whether a geometry is fully inside, partially inside, or fully outside a bounding box. */
export function checkBoundsStatus(
  geometry: GeoJSON.Geometry,
  bounds: [[number, number], [number, number]],
): BoundsStatus {
  const [[south, west], [north, east]] = bounds;

  function isIn(lat: number, lng: number): boolean {
    return lat >= south && lat <= north && lng >= west && lng <= east;
  }

  function getCoords(geom: GeoJSON.Geometry): [number, number][] {
    switch (geom.type) {
      case "Point":
        return [[geom.coordinates[1], geom.coordinates[0]]];
      case "LineString":
        return geom.coordinates.map((c) => [c[1], c[0]]);
      case "Polygon":
        return geom.coordinates[0].map((c) => [c[1], c[0]]);
      case "MultiLineString":
        return geom.coordinates.flat().map((c) => [c[1], c[0]]);
      case "MultiPolygon":
        return geom.coordinates.flat(2).map((c) => [c[1], c[0]]);
      default:
        return [];
    }
  }

  const coords = getCoords(geometry);
  if (coords.length === 0) return "out";

  let inCount = 0;
  for (const [lat, lng] of coords) {
    if (isIn(lat, lng)) inCount++;
  }

  if (inCount === coords.length) return "in";
  if (inCount > 0) return "partial";
  return "out";
}

/** Compute the outermost rectangle encompassing both desktop and mobile bounds. */
export function getCombinedBounds(
  pub: { desktop?: [[number, number], [number, number]]; mobile?: [[number, number], [number, number]] } | undefined,
): [[number, number], [number, number]] | null {
  if (!pub) return null;
  if (!pub.desktop && !pub.mobile) return null;
  if (!pub.mobile) return pub.desktop!;
  if (!pub.desktop) return pub.mobile;

  return [
    [Math.min(pub.desktop[0][0], pub.mobile[0][0]), Math.min(pub.desktop[0][1], pub.mobile[0][1])],
    [Math.max(pub.desktop[1][0], pub.mobile[1][0]), Math.max(pub.desktop[1][1], pub.mobile[1][1])],
  ];
}
