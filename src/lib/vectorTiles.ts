// ── Vector tile / GeoJSON data utilities ────────────────────────────────────
// Roads and waterways are fetched from the Overpass API (OpenStreetMap).
// Cities and peaks use a bundled static dataset to avoid large API calls.

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

// ── Convert Overpass JSON elements to GeoJSON ────────────────────────────────
function osmElementsToGeoJSON(
  elements: OsmElement[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const el of elements) {
    if (el.type === "way" && el.geometry && el.geometry.length > 0) {
      features.push({
        type: "Feature",
        id: `way/${el.id}`,
        properties: { ...(el.tags ?? {}), osm_id: el.id, osm_type: "way" },
        geometry: {
          type: "LineString",
          coordinates: el.geometry.map((n) => [n.lon, n.lat]),
        },
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
  cacheKey: string
): Promise<GeoJSON.FeatureCollection> {
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = (await response.json()) as { elements?: OsmElement[] };
  const geojson = osmElementsToGeoJSON(data.elements ?? []);
  _cache.set(cacheKey, geojson);
  return geojson;
}

// ── Public data-fetch functions ──────────────────────────────────────────────

/** Fetch major Colorado roads (motorway, trunk, primary) from Overpass API. */
export async function fetchColoradoRoads(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:60][bbox:${CO_BBOX}];
(
  way["highway"="motorway"];
  way["highway"="trunk"];
  way["highway"="primary"];
);
out geom;`;
  return overpassFetch(query, "co-roads");
}

/** Fetch named Colorado waterways (rivers, streams) from Overpass API. */
export async function fetchColoradoWaterways(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:60][bbox:${CO_BBOX}];
(
  way["waterway"="river"];
  way["waterway"="stream"]["name"];
);
out geom;`;
  return overpassFetch(query, "co-waterways");
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
