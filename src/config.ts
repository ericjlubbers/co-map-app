import type { ClusterStyle, FontFamily, CategoryInfo, TilePreset, DesignState } from "./types";

// ── Font Configuration ──────────────────────────────────────────────
// Change this one value to swap the entire app's font:
export const FONT_FAMILY: FontFamily = "Libre Franklin";
// Alternatives: "Atkinson Hyperlegible" | "Plus Jakarta Sans"

// ── Cluster Style ───────────────────────────────────────────────────
// "donut" = pie-ring showing category proportions (default)
// "gradient" = cluster color based on dominant category
// "minimal" = clean monochrome circles
export const CLUSTER_STYLE: ClusterStyle = "donut";

// ── Map Defaults ────────────────────────────────────────────────────
export const MAP_CENTER: [number, number] = [39.0, -105.5];
export const MAP_ZOOM = 7;
export const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [36.5, -109.5],
  [41.5, -101.5],
];
// "carto-voyager" = colorful, label-rich basemap (default)
// "stadia-watercolor" = Stamen Watercolor via Stadia Maps
export const TILE_PRESET: TilePreset = "carto-voyager";

const STADIA_API_KEY = import.meta.env.VITE_STADIA_API_KEY ?? "";
const stadiaQ = STADIA_API_KEY ? `?api_key=${STADIA_API_KEY}` : "";

export interface TileConfig {
  url: string;
  attribution: string;
  maxZoom?: number;
  /** Optional labels-only overlay URL for tiles that lack labels */
  labelsUrl?: string;
}

const TILE_PRESETS: Record<TilePreset, TileConfig> = {
  "carto-light": {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  "carto-light-nolabels": {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    labelsUrl: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
  },
  "carto-dark": {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  "carto-dark-nolabels": {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    labelsUrl: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
  },
  "carto-voyager": {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  "carto-voyager-nolabels": {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    labelsUrl: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png",
  },
  "osm-standard": {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  "stadia-watercolor": {
    url: `https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://stamen.com/">Stamen Design</a>',
    maxZoom: 18,
    labelsUrl: `https://tiles.stadiamaps.com/tiles/stamen_terrain_labels/{z}/{x}/{y}{r}.png${stadiaQ}`,
  },
  "stadia-toner": {
    url: `https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://stamen.com/">Stamen Design</a>',
    maxZoom: 18,
  },
  "stadia-toner-lite": {
    url: `https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://stamen.com/">Stamen Design</a>',
    maxZoom: 18,
  },
  "stadia-toner-nolabels": {
    url: `https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://stamen.com/">Stamen Design</a>',
    maxZoom: 18,
    labelsUrl: `https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png${stadiaQ}`,
  },
  "stadia-smooth": {
    url: `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
  "stadia-outdoors": {
    url: `https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
  "stadia-terrain": {
    url: `https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://stamen.com/">Stamen Design</a>',
    maxZoom: 18,
  },
  "stadia-terrain-nolabels": {
    url: `https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}{r}.png${stadiaQ}`,
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &middot; <a href="https://stamen.com/">Stamen Design</a>',
    maxZoom: 18,
    labelsUrl: `https://tiles.stadiamaps.com/tiles/stamen_terrain_labels/{z}/{x}/{y}{r}.png${stadiaQ}`,
  },
};

export const TILE_CONFIG = TILE_PRESETS[TILE_PRESET];

export function getTileConfig(preset: TilePreset) {
  return TILE_PRESETS[preset];
}

// ── Layout & Appearance ─────────────────────────────────────────────
export const LAYOUT = {
  /** CSS grid columns for map vs table on desktop (e.g. "3fr 2fr") */
  mapTableRatio: "3fr 2fr",
  /** Viewport-height % the map gets on mobile (rest goes to table) */
  mobileMapHeight: "60vh",
  /** Breakpoint (px) below which layout stacks vertically */
  mobileBreakpoint: 768,
  /** Global border radius token */
  borderRadius: "12px",
  /** Background for the table / sidebar panel */
  panelBg: "#ffffff",
  /** Background for loading / error screens */
  pageBg: "#f9fafb",
  /** Primary text color */
  textColor: "#1f2937",
  /** Muted / secondary text color */
  textMuted: "#6b7280",
};

// ── Default Design State (used by DesignContext) ────────────────────
export const DEFAULT_DESIGN: DesignState = {
  fontFamily: FONT_FAMILY,
  clusterStyle: CLUSTER_STYLE,
  tilePreset: TILE_PRESET,
  mapTableRatio: LAYOUT.mapTableRatio,
  mobileMapHeight: LAYOUT.mobileMapHeight,
  borderRadius: LAYOUT.borderRadius,
  panelBg: LAYOUT.panelBg,
  pageBg: LAYOUT.pageBg,
  textColor: LAYOUT.textColor,
  textMuted: LAYOUT.textMuted,
  showLabels: true,
  showBorder: false,
  showCustomBorder: false,
  customBorderColor: "#d1d5db",
  customBorderWidth: 2,
  customBorderStyle: "solid",
  embedPadding: 0,
  embedMargin: 0,
  markerSize: 34,
  showCountyLines: false,
  countyLineColor: "#6b7280",
  countyLineWeight: 1,
  countyLineOpacity: 0.5,
  showStateBorder: false,
  stateBorderColor: "#1f2937",
  stateBorderWeight: 3,
  showOutsideFade: false,
  outsideFadeOpacity: 0.3,
  demoIntervalMs: 4500,
  enableDemoMode: false,
  demoHighlightStyle: "dim",
  demoDimOpacity: 0.3,
  demoDimTable: true,
  demoRotationMode: "by-category",
  demoRotationOrder: "sequential",
  demoPointIntervalMs: 6000,
  useMetricUnits: false,
  showRoads: false,
  showMotorways: false,
  showTrunkRoads: false,
  showPrimaryRoads: false,
  showSecondaryRoads: false,
  showTertiaryRoads: false,
  roadColor: "#ef4444",
  roadWeight: 2,
  roadOpacity: 0.8,
  roadDashArray: "",
  showWaterways: false,
  showRivers: false,
  showStreams: false,
  waterwayColor: "#3b82f6",
  waterwayWeight: 2,
  waterwayOpacity: 0.8,
  showParks: false,
  parkColor: "#16a34a",
  parkOpacity: 0.3,
  showLakes: false,
  lakeColor: "#3b82f6",
  lakeOpacity: 0.4,
  showCities: false,
  showCityLabels: false,
  showPeakLabels: false,
  cityFontSize: 12,
  cityColor: "#1f2937",
  labelFont: "inherit",
  pointColor: "#2563eb",
  pointColorMode: "single" as const,
  categoryColors: {} as Record<string, string>,
  categoryIcons: {} as Record<string, string>,
  markerShape: "pin" as const,
  markerConnector: "stem" as const,
  markerPadding: "normal" as const,
  categoryShapes: {} as Record<string, import("./types").MarkerShape>,
  showDataPanel: true,
  embedAspectRatio: "16:9",
  embedMobileAspectRatio: "3:4",
  embedHeight: "600",
  embedHeightUnit: "auto",
  embedLayout: "standard",
  sfSidebarWidth: "200px",
  sfBtnFontSize: 13,
  sfBtnPadding: "8px 10px",
  sfBtnBorderRadius: "8px",
  sfBtnGap: "4px",
  sfLabelWrap: true,
  sfBtnPreset: "filled",
  flyToZoom: 14,
  categoryDisplayMode: "text",
  clusterPlugin: "react-leaflet-cluster",
  clusterMaxRadius: 80,
  clusterDisableAtZoom: 15,
  clusterAnimate: true,
  clusterSpiderfyOnMaxZoom: true,
  clusterShowCoverageOnHover: false,
  clusterZoomToBoundsOnClick: true,
  clusterPlacementStrategy: "default",
  clusterPlacementReveal: true,
  clusterShowList: false,
};

// ── Clustering Settings ─────────────────────────────────────────────
export const CLUSTER_SETTINGS = {
  maxClusterRadius: 50,
  disableClusteringAtZoom: 13,
  animate: true,
  spiderfyDistanceMultiplier: 1.5,
  chunkedLoading: true,
  zoomToBoundsOnClick: true,
  showCoverageOnHover: false,
};

// ── Category → Icon/Color Map ───────────────────────────────────────
// Icons reference Font Awesome solid icon names (without "fa-" prefix)
// Colors are Tailwind-compatible hex values
const CATEGORY_DEFINITIONS: Record<string, CategoryInfo> = {
  "Parks & Recreation": { icon: "tree", color: "#16a34a", bgColor: "#dcfce7" },
  Government: { icon: "landmark", color: "#2563eb", bgColor: "#dbeafe" },
  Education: { icon: "graduation-cap", color: "#9333ea", bgColor: "#f3e8ff" },
  Healthcare: { icon: "heart-pulse", color: "#dc2626", bgColor: "#fee2e2" },
  Dining: { icon: "utensils", color: "#ea580c", bgColor: "#ffedd5" },
  "Arts & Culture": { icon: "palette", color: "#db2777", bgColor: "#fce7f3" },
  Business: { icon: "briefcase", color: "#0891b2", bgColor: "#cffafe" },
  Community: { icon: "people-group", color: "#ca8a04", bgColor: "#fef9c3" },
};

// Fallback palette for categories not in the map above
const FALLBACK_PALETTE: CategoryInfo[] = [
  { icon: "map-pin", color: "#6366f1", bgColor: "#e0e7ff" },
  { icon: "map-pin", color: "#14b8a6", bgColor: "#ccfbf1" },
  { icon: "map-pin", color: "#f43f5e", bgColor: "#ffe4e6" },
  { icon: "map-pin", color: "#8b5cf6", bgColor: "#ede9fe" },
  { icon: "map-pin", color: "#f97316", bgColor: "#fff7ed" },
];

// Deterministic category → info mapping
const dynamicCategoryCache = new Map<string, CategoryInfo>();
let fallbackIndex = 0;

export function getCategoryInfo(category: string): CategoryInfo {
  if (CATEGORY_DEFINITIONS[category]) return CATEGORY_DEFINITIONS[category];
  if (dynamicCategoryCache.has(category))
    return dynamicCategoryCache.get(category)!;
  const info = FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
  fallbackIndex++;
  dynamicCategoryCache.set(category, info);
  return info;
}

export function resetCategoryCache() {
  dynamicCategoryCache.clear();
  fallbackIndex = 0;
}
