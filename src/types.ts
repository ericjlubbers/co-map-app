/** Whether a data point is published (active) or upcoming */
export type PointStatus = "active" | "upcoming";

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
  /** FontAwesome icon name override (from "icon" column role) */
  icon?: string;
  /** Publication status — "upcoming" renders faded and non-interactive */
  status?: PointStatus;
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

export type ClusterStyle = "donut" | "gradient" | "minimal" | "ring";
export type ClusterPlugin = "react-leaflet-cluster" | "leaflet-markercluster" | "none";
export type SfBtnFillMode = "single" | "by-category";
export type PlacementStrategy = "default" | "clock" | "concentric" | "spiral" | "one-circle";
export type MarkerShape = "pin" | "rounded-square" | "circle" | "stadium" | "soft-diamond" | "shield";
export type MarkerConnector = "stem" | "dot" | "none";
export type MarkerPadding = "compact" | "normal" | "spacious";
export type SfBtnPreset = "filled" | "outlined" | "ghost" | "pill" | "minimal";
export type SfMobileLayout = "drawer" | "below" | "hidden";
export type SfCategorySortMode = "a-z" | "z-a" | "count" | "custom";
export type DemoHighlightStyle = "filter" | "dim";
export type DemoRotationMode = "by-category" | "by-point";
export type DemoRotationOrder = "sequential" | "shuffled";
export type CardConnectorPreset = "simple" | "retro-3d";
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
export type ColumnRole = "geometry" | "name" | "label" | "value" | "group" | "icon" | "image" | "address" | "url" | "metadata" | "status" | "none";

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

// ── View Curation (Sprint 4) ─────────────────────────────────

/** Locked view + per-feature visibility for publication-quality maps */
export interface ViewCuration {
  /** Locked map center [lat, lng] */
  center: [number, number];
  /** Locked zoom level */
  zoom: number;
  /** Visible bounding box [[south, west], [north, east]] for scoped Overpass queries */
  bounds: [[number, number], [number, number]];
  /** Feature IDs that should be hidden (roads: "way/123", cities: "denver") */
  hiddenFeatureIds: string[];
}

// ── Primary Elements (Sprint 8 C2) ──────────────────────────

export type PrimaryElementSourceType = 'road' | 'waterway' | 'city' | 'park' | 'lake';

/** Style overrides for primary elements (C3) */
export interface StyleOverrides {
  // Shape styling (roads, waterways, parks, lakes)
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
  fillColor?: string;
  fillOpacity?: number;
  // Label/point styling (cities, peaks)
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  bgOpacity?: number;
}

/** Leader line connector style (C3) */
export interface ConnectorStyle {
  color?: string;
  weight?: number;
  dashArray?: string;
  opacity?: number;
}

/** Transient selection state for customize mode */
export interface SelectedElement {
  sourceType: PrimaryElementSourceType;
  sourceIds: string[];
  name: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

/** A promoted element in the primary elements layer */
export interface PrimaryElement {
  id: string;
  sourceType: PrimaryElementSourceType;
  sourceIds: string[];
  name: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  styleOverrides?: StyleOverrides;
  labelPosition?: { lat: number; lng: number };
  connectorStyle?: ConnectorStyle;
}

/** Publication crop bounds for desktop/mobile (C4) */
export interface PublicationBounds {
  desktop?: [[number, number], [number, number]]; // [[south, west], [north, east]]
  mobile?: [[number, number], [number, number]];
}

/** Top-level data_config object persisted on the map */
export interface DataConfig {
  regions: LayerData;
  points: LayerData;
  viewCuration?: ViewCuration;
  primaryElements?: PrimaryElement[];
  publicationBounds?: PublicationBounds;
}

/** Active tabs in the editor */
export type EditorTab = "layout" | "data";
export type DataLayerTab = "regions" | "points";

/** Editor mode: Settings (design controls) or Customize (element-level editing) */
export type EditorMode = "settings" | "customize";

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
  demoHighlightStyle: DemoHighlightStyle;
  demoDimOpacity: number;
  demoDimTable: boolean;
  demoRotationMode: DemoRotationMode;
  demoRotationOrder: DemoRotationOrder;
  demoPointIntervalMs: number;
  // Units
  useMetricUnits: boolean;
  // Roads layer
  showRoads: boolean;
  showMotorways: boolean;
  showTrunkRoads: boolean;
  showPrimaryRoads: boolean;
  showSecondaryRoads: boolean;
  showTertiaryRoads: boolean;
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
  // Parks layer
  showParks: boolean;
  parkColor: string;
  parkOpacity: number;
  // Lakes layer
  showLakes: boolean;
  lakeColor: string;
  lakeOpacity: number;
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
  categoryIcons: Record<string, string>;
  // Marker shape
  markerShape: MarkerShape;
  markerConnector: MarkerConnector;
  markerPadding: MarkerPadding;
  categoryShapes: Record<string, MarkerShape>;
  // Data panel visibility
  showDataPanel: boolean;
  // Embed sizing
  embedAspectRatio: string;
  embedMobileAspectRatio: string;
  embedHeight: string;
  embedHeightUnit: "auto" | "px" | "vh";
  // Embed layout template
  embedLayout: "standard" | "sidebar-filter";
  // Sidebar-filter styling
  sfSidebarWidth: string;
  sfBtnFontSize: number;
  sfBtnPadding: string;
  sfBtnBorderRadius: string;
  sfBtnGap: string;
  sfLabelWrap: boolean;
  sfBtnPreset: SfBtnPreset;
  sfBtnFillColor: string;
  sfBtnFillMode: SfBtnFillMode;
  sfMobileLayout: SfMobileLayout;
  sfCategorySortMode: SfCategorySortMode;
  sfCategoryCustomOrder: string[];
  // Map interaction
  flyToZoom: number;
  // Category display in data table
  categoryDisplayMode: "text" | "icon" | "both";
  // Cluster plugin
  // Dot mode
  dotMode: boolean;
  dotSize: number;
  // Cluster plugin
  clusterPlugin: ClusterPlugin;
  clusterMaxRadius: number;
  clusterDisableAtZoom: number;
  clusterAnimate: boolean;
  clusterSpiderfyOnMaxZoom: boolean;
  clusterShowCoverageOnHover: boolean;
  clusterZoomToBoundsOnClick: boolean;
  // PlacementStrategies
  clusterPlacementStrategy: PlacementStrategy;
  clusterPlacementReveal: boolean;
  // List plugin
  clusterShowList: boolean;
  // Animation / transition speed (ms)
  transitionSpeed: number;
  // Card connector style
  cardConnectorPreset: CardConnectorPreset;
  cardConnectorColor: string;
  cardConnectorWidth: number;
  cardConnectorDash: boolean;
  cardFaceColor: string;
  cardFaceOpacity: number;
  // Card appearance
  cardBorderRadius: number;
  cardBgColor: string;
  cardShadow: boolean;
  // Card edge lines (retro-3d)
  cardEdgeColor: string;
  cardEdgeWidth: number;
  cardEdgeOpacity: number;
  cardConnectorInset: number;
  // Active/upcoming data status
  showUpcoming: boolean;
  upcomingOpacity: number;
  /** Color used for sidebar buttons when all points in a category are upcoming */
  sfUpcomingColor: string;
  /** Tooltip text shown when an upcoming marker is clicked */
  upcomingTooltipText: string;
  upcomingTooltipOpacity: number;
  // City label styles
  cityLabelBgColor: string;
  cityLabelBgOpacity: number;
  cityLabelPaddingH: number;
  cityLabelPaddingV: number;
  cityConnectorColor: string;
  cityConnectorWeight: number;
  cityConnectorOpacity: number;
  cityConnectorDash: "solid" | "dashed" | "dotted";
  cityLabelOffset: number;
  cityLabelBaselineX: number;
  cityLabelBaselineY: number;
  cityLabelBorderRadius: number;
  cityLabelShadow: boolean;
  cityDotShow: boolean;
  cityDotRadius: number;
  cityConnectorStyle: "straight" | "jointed";
  // Map zoom constraints
  mapMinZoom: number;
  mapMaxZoom: number;
  mapDefaultZoom: number;
  // Transient signals (not serialized)
  fitBoundsSignal: number;
}
