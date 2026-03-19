import L from "leaflet";
import { getCategoryInfo } from "../config";
import { getFaIconSvg } from "../lib/faIcons";

function getPathData(iconName: string): string {
  const svg = getFaIconSvg(iconName);
  if (svg) return svg.pathData;
  // Fallback to map-pin
  const fallback = getFaIconSvg("map-pin");
  return fallback?.pathData ?? "";
}

function getViewBox(iconName: string): string {
  const svg = getFaIconSvg(iconName);
  if (svg) return svg.viewBox;
  const fallback = getFaIconSvg("map-pin");
  return fallback?.viewBox ?? "0 0 320 512";
}

export function createMarkerIcon(
  category: string,
  isSelected = false,
  baseSize = 34,
  colorOverride?: string,
  iconOverride?: string,
): L.DivIcon {
  const info = getCategoryInfo(category);
  const size = isSelected ? baseSize * 1.24 : baseSize;
  const pinColor = colorOverride || info.color;
  const iconName = iconOverride || info.icon;

  const iconPath = getPathData(iconName);
  const viewBox = getViewBox(iconName);

  // SVG pin with FA icon inside
  const svg = `
    <svg width="${size}" height="${size * 1.3}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"
         style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));${isSelected ? " transform: scale(1.15);" : ""}">
      <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z"
            fill="${pinColor}" />
      <svg x="8" y="6" width="24" height="24" viewBox="${viewBox}">
        <path d="${iconPath}" fill="white" />
      </svg>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: L.point(size, size * 1.3),
    iconAnchor: L.point(size / 2, size * 1.3),
    popupAnchor: L.point(0, -(size * 1.3) + 4),
  });
}
