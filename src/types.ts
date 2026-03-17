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

export interface CategoryInfo {
  icon: string;
  color: string;
  bgColor: string;
}

export type ClusterStyle = "donut" | "gradient" | "minimal";
export type FontFamily = "Libre Franklin" | "Atkinson Hyperlegible" | "Plus Jakarta Sans";
export type TilePreset =
  | "carto-light"
  | "carto-dark"
  | "carto-voyager"
  | "osm-standard"
  | "stadia-watercolor"
  | "stadia-toner"
  | "stadia-toner-lite"
  | "stadia-smooth"
  | "stadia-outdoors"
  | "stadia-terrain";

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
}
