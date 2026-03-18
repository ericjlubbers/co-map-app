export interface PointData {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
  description: string;
  address: string;
  url: string;
  lat: number;
  lng: number;
}

// ── Drawing & Sketching ──────────────────────────────────────

export type DrawingMode = 'point' | 'line' | 'polygon' | 'select' | 'delete';

export interface DrawnFeatureProperties {
  id: string;
  label: string;
  featureType: 'point' | 'line' | 'polygon';
  color: string;
  weight: number;
  dashArray: string;
  fillColor: string;
  fillOpacity: number;
  opacity: number;
  description: string;
}

export type DrawnFeature =
  | {
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: DrawnFeatureProperties;
    }
  | {
      type: 'Feature';
      geometry: { type: 'LineString'; coordinates: [number, number][] };
      properties: DrawnFeatureProperties;
    }
  | {
      type: 'Feature';
      geometry: { type: 'Polygon'; coordinates: [number, number][][] };
      properties: DrawnFeatureProperties;
    };

export interface DrawnFeatureCollection {
  type: 'FeatureCollection';
  features: DrawnFeature[];
}

export interface CategoryInfo {
  icon: string;
  color: string;
  bgColor: string;
}

export type ClusterStyle = "donut" | "gradient" | "minimal";
export type FontFamily = "Libre Franklin" | "Atkinson Hyperlegible" | "Plus Jakarta Sans";
export type TilePreset =
  | "carto-light"
  | "carto-light-nolabels"
  | "carto-dark"
  | "carto-dark-nolabels"
  | "carto-voyager"
  | "carto-voyager-nolabels"
  | "osm-standard"
  | "stadia-watercolor"
  | "stadia-toner"
  | "stadia-toner-lite"
  | "stadia-toner-nolabels"
  | "stadia-smooth"
  | "stadia-outdoors"
  | "stadia-terrain"
  | "stadia-terrain-nolabels";

// ── Data Tab Types ──────────────────────────────────────────

/** Roles a column can be assigned to in the data editor */
export type ColumnRole = "geometry" | "name" | "label" | "value" | "group" | "metadata" | "none";

/** Maps a column name to a visualization role */
export type ColumnMappings = Record<string, ColumnRole>;

/** A single data row: keys are column headers, values are cell content */
export type DataRow = Record<string, string>;

/** Layer data (Regions or Points) stored in data_config */
export interface LayerData {
  columns: string[];
  rows: DataRow[];
  columnMappings: ColumnMappings;
  googleSheetsUrl?: string;
  lastSynced?: string; // ISO timestamp
}

/** Top-level data_config object persisted on the map */
export interface DataConfig {
  regions: LayerData;
  points: LayerData;
}

/** Active tabs in the editor */
export type EditorTab = "preview" | "data";
export type DataLayerTab = "regions" | "points";

export interface DesignState {
  fontFamily: FontFamily;
  clusterStyle: ClusterStyle;
  tilePreset: TilePreset;
  mapTableRatio: string;
  mobileMapHeight: string;
  borderRadius: string;
  panelBg: string;
  pageBg: string;
  textColor: string;
  textMuted: string;
  showLabels: boolean;
  showBorder: boolean;
  // Custom border
  showCustomBorder: boolean;
  customBorderColor: string;
  customBorderWidth: number;
  customBorderStyle: string;
  embedPadding: number;
  embedMargin: number;
  markerSize: number;
  // County lines
  showCountyLines: boolean;
  countyLineColor: string;
  countyLineWeight: number;
  countyLineOpacity: number;
  // State border
  showStateBorder: boolean;
  stateBorderColor: string;
  stateBorderWeight: number;
  // Outside-state fade/mask
  showOutsideFade: boolean;
  outsideFadeOpacity: number;
  // Demo auto-rotate
  demoIntervalMs: number;
  enableDemoMode: boolean;
  // Units
  useMetricUnits: boolean;
  // Roads layer
  showRoads: boolean;
  showMotorways: boolean;
  showTrunkRoads: boolean;
  showPrimaryRoads: boolean;
  roadColor: string;
  roadWeight: number;
  roadOpacity: number;
  roadDashArray: string;
  // Waterways layer
  showWaterways: boolean;
  showRivers: boolean;
  showStreams: boolean;
  waterwayColor: string;
  waterwayWeight: number;
  waterwayOpacity: number;
  // Cities layer
  showCities: boolean;
  showCityLabels: boolean;
  showPeakLabels: boolean;
  cityFontSize: number;
  cityColor: string;
  // Labels layer
  labelFont: string;
  // Points layer
  pointColor: string;
  pointColorMode: "single" | "by-category";
  categoryColors: Record<string, string>;
  // Data panel visibility
  showDataPanel: boolean;
  // Embed sizing
  embedAspectRatio: string;
  embedMobileAspectRatio: string;
  embedHeight: string;
  embedHeightUnit: "auto" | "px" | "vh";
}
