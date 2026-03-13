import L from "leaflet";
import { getCategoryInfo } from "../config";
import {
  faTree,
  faLandmark,
  faGraduationCap,
  faHeartPulse,
  faUtensils,
  faPalette,
  faBriefcase,
  faPeopleGroup,
  faMapPin,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const FA_ICONS: Record<string, IconDefinition> = {
  tree: faTree,
  landmark: faLandmark,
  "graduation-cap": faGraduationCap,
  "heart-pulse": faHeartPulse,
  utensils: faUtensils,
  palette: faPalette,
  briefcase: faBriefcase,
  "people-group": faPeopleGroup,
  "map-pin": faMapPin,
};

function getPathData(iconName: string): string {
  const icon = FA_ICONS[iconName] || FA_ICONS["map-pin"];
  // FA icons: [width, height, ligatures, unicode, pathData]
  const pathData = icon.icon[4];
  return typeof pathData === "string" ? pathData : (pathData as string[])[0];
}

function getViewBox(iconName: string): string {
  const icon = FA_ICONS[iconName] || FA_ICONS["map-pin"];
  return `0 0 ${icon.icon[0]} ${icon.icon[1]}`;
}

export function createMarkerIcon(
  category: string,
  isSelected = false,
  baseSize = 34
): L.DivIcon {
  const info = getCategoryInfo(category);
  const size = isSelected ? baseSize * 1.24 : baseSize;
  const pinColor = info.color;

  const iconPath = getPathData(info.icon);
  const viewBox = getViewBox(info.icon);

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
