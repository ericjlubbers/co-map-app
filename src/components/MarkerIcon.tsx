import L from "leaflet";
import { getCategoryInfo } from "../config";
import { getFaIconSvg } from "../lib/faIcons";
import type { MarkerShape, MarkerConnector, MarkerPadding } from "../types";

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

// ── Shape geometry definitions ──────────────────────────────

interface ShapeGeometry {
  /** SVG path for the shape body (without connector) */
  bodyPath: string;
  /** viewBox for the shape body alone */
  bodyWidth: number;
  bodyHeight: number;
  /** Center of the shape body for icon placement */
  iconCenterX: number;
  iconCenterY: number;
}

function getShapeGeometry(shape: MarkerShape): ShapeGeometry {
  switch (shape) {
    case "pin":
      return {
        bodyPath: "M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z",
        bodyWidth: 40,
        bodyHeight: 52,
        iconCenterX: 20,
        iconCenterY: 18,
      };
    case "rounded-square":
      return {
        bodyPath: "M8 0h24a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8z",
        bodyWidth: 40,
        bodyHeight: 40,
        iconCenterX: 20,
        iconCenterY: 20,
      };
    case "circle":
      return {
        bodyPath: "M20 0a20 20 0 1 0 0 40 20 20 0 1 0 0-40z",
        bodyWidth: 40,
        bodyHeight: 40,
        iconCenterX: 20,
        iconCenterY: 20,
      };
    case "stadium":
      return {
        bodyPath: "M16 0h24a16 16 0 0 1 0 32H16a16 16 0 0 1 0-32z",
        bodyWidth: 56,
        bodyHeight: 32,
        iconCenterX: 28,
        iconCenterY: 16,
      };
    case "soft-diamond":
      return {
        bodyPath: "M20 0L38.5 18.5a5 5 0 0 1 0 7L20 44 1.5 25.5a5 5 0 0 1 0-7L20 0z",
        bodyWidth: 40,
        bodyHeight: 44,
        iconCenterX: 20,
        iconCenterY: 22,
      };
    case "shield":
      return {
        bodyPath: "M4 0h32a4 4 0 0 1 4 4v20c0 6-8 14-20 20C8 38 0 30 0 24V4a4 4 0 0 1 4-4z",
        bodyWidth: 40,
        bodyHeight: 44,
        iconCenterX: 20,
        iconCenterY: 18,
      };
  }
}

// ── Icon padding scale factors ──────────────────────────────

const PADDING_SCALES: Record<MarkerPadding, number> = {
  compact: 0.70,
  normal: 0.60,
  spacious: 0.48,
};

// ── Build complete SVG with connector ───────────────────────

interface MarkerSvgResult {
  svg: string;
  totalWidth: number;
  totalHeight: number;
  anchorX: number;
  anchorY: number;
}

function buildMarkerSvg(
  shape: MarkerShape,
  connector: MarkerConnector,
  padding: MarkerPadding,
  pinColor: string,
  iconPath: string,
  iconViewBox: string,
  size: number,
  isSelected: boolean,
  dimmed: boolean,
  dimOpacity: number,
): MarkerSvgResult {
  const geo = getShapeGeometry(shape);
  const iconScale = PADDING_SCALES[padding];

  // Pin shape has built-in stem — skip adding a connector stem for it
  const pinHasBuiltInStem = shape === "pin";

  // Connector geometry
  const stemHeight = 12;
  const dotRadius = 3;
  const dotLineHeight = 10;

  let totalWidth = geo.bodyWidth;
  let totalHeight = geo.bodyHeight;
  let bodyOffsetY = 0;
  let connectorSvg = "";
  let anchorX = geo.bodyWidth / 2;
  let anchorY = geo.bodyHeight;

  if (connector === "stem" && !pinHasBuiltInStem) {
    totalHeight = geo.bodyHeight + stemHeight;
    const cx = geo.bodyWidth / 2;
    connectorSvg = `<polygon points="${cx - 6},${geo.bodyHeight - 1} ${cx + 6},${geo.bodyHeight - 1} ${cx},${totalHeight}" fill="${pinColor}" />`;
    anchorY = totalHeight;
  } else if (connector === "dot") {
    totalHeight = geo.bodyHeight + dotLineHeight;
    const cx = geo.bodyWidth / 2;
    if (pinHasBuiltInStem) {
      // Pin already extends to a point — put dot at the tip
      totalHeight = geo.bodyHeight + dotLineHeight - 4;
      connectorSvg = `
        <line x1="${cx}" y1="${geo.bodyHeight - 4}" x2="${cx}" y2="${totalHeight - dotRadius}" stroke="${pinColor}" stroke-width="2" />
        <circle cx="${cx}" cy="${totalHeight - dotRadius}" r="${dotRadius}" fill="${pinColor}" />`;
      anchorY = totalHeight;
    } else {
      connectorSvg = `
        <line x1="${cx}" y1="${geo.bodyHeight}" x2="${cx}" y2="${totalHeight - dotRadius}" stroke="${pinColor}" stroke-width="2" />
        <circle cx="${cx}" cy="${totalHeight - dotRadius}" r="${dotRadius}" fill="${pinColor}" />`;
      anchorY = totalHeight;
    }
  } else if (connector === "none") {
    if (pinHasBuiltInStem) {
      // Use the circle portion of the pin (top 40px only)
      anchorY = geo.bodyHeight;
    } else {
      anchorY = geo.bodyHeight;
    }
  }

  // Scale to desired size
  const scaleX = size / totalWidth;
  const scaleY = (size * (totalHeight / totalWidth)) / totalHeight;
  const scale = Math.min(scaleX, scaleY);

  const renderWidth = totalWidth * scale;
  const renderHeight = totalHeight * scale;

  // Icon positioning within the shape body
  const minDim = Math.min(geo.bodyWidth, geo.bodyHeight);
  const iconSize = minDim * iconScale;
  const iconX = geo.iconCenterX - iconSize / 2;
  const iconY = geo.iconCenterY - iconSize / 2 + bodyOffsetY;

  const filterStyle = dimmed ? "" : "filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));";
  const opacityStyle = dimmed ? `opacity: ${dimOpacity};` : "";
  const transitionStyle = "transition: opacity 300ms ease, transform 300ms ease;";
  const transformStyle = isSelected ? " transform: scale(1.15);" : "";

  const svg = `
    <svg width="${renderWidth}" height="${renderHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg"
         style="${filterStyle}${opacityStyle}${transitionStyle}${transformStyle}">
      <path d="${geo.bodyPath}" fill="${pinColor}" />
      ${connectorSvg}
      <svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="${iconViewBox}">
        <path d="${iconPath}" fill="white" />
      </svg>
    </svg>`;

  return {
    svg,
    totalWidth: renderWidth,
    totalHeight: renderHeight,
    anchorX: renderWidth / 2,
    anchorY: (anchorY / totalHeight) * renderHeight,
  };
}

export function createMarkerIcon(
  category: string,
  isSelected = false,
  baseSize = 34,
  colorOverride?: string,
  iconOverride?: string,
  dimmed?: boolean,
  dimOpacity?: number,
  shape: MarkerShape = "pin",
  connector: MarkerConnector = "stem",
  padding: MarkerPadding = "normal",
): L.DivIcon {
  const info = getCategoryInfo(category);
  const dimScale = dimmed ? 0.85 : 1;
  const size = (isSelected ? baseSize * 1.24 : baseSize) * dimScale;
  const pinColor = colorOverride || info.color;
  const iconName = iconOverride || info.icon;

  const iconPath = getPathData(iconName);
  const viewBox = getViewBox(iconName);

  const result = buildMarkerSvg(
    shape,
    connector,
    padding,
    pinColor,
    iconPath,
    viewBox,
    size,
    isSelected,
    !!dimmed,
    dimOpacity ?? 0.3,
  );

  return L.divIcon({
    html: result.svg,
    className: "",
    iconSize: L.point(result.totalWidth, result.totalHeight),
    iconAnchor: L.point(result.anchorX, result.anchorY),
    popupAnchor: L.point(0, -result.anchorY + 4),
  });
}

/**
 * Creates a simple circular dot icon (no icon, no stem).
 * Used in "dot mode" for unselected/unhighlighted markers.
 */
export function createDotIcon(
  color: string,
  size: number,
  dimmed?: boolean,
  dimOpacity?: number,
): L.DivIcon {
  const r = size / 2;
  const opacity = dimmed ? (dimOpacity ?? 0.3) : 1;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${color}" stroke="white" stroke-width="1" opacity="${opacity}" />
  </svg>`;
  return L.divIcon({
    html: `<div class="dot-marker" style="transition: all 300ms ease;">${svg}</div>`,
    className: "",
    iconSize: L.point(size, size),
    iconAnchor: L.point(r, r),
    popupAnchor: L.point(0, -r),
  });
}
