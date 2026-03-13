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
