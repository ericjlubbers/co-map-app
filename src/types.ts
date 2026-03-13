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
