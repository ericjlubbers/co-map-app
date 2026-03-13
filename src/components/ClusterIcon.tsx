import L from "leaflet";
import type { PointData, ClusterStyle } from "../types";
import { getCategoryInfo, CLUSTER_STYLE } from "../config";

// Count categories in child markers
function getCategoryCounts(cluster: L.MarkerCluster): Record<string, number> {
  const counts: Record<string, number> = {};
  const markers = cluster.getAllChildMarkers();
  for (const marker of markers) {
    const cat = (marker.options as { category?: string }).category || "Other";
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

// ── Donut-style cluster icon ────────────────────────────────
function createDonutIcon(cluster: L.MarkerCluster): L.DivIcon {
  const counts = getCategoryCounts(cluster);
  const total = cluster.getChildCount();
  const size = total < 10 ? 44 : total < 50 ? 52 : 60;
  const r = size / 2;
  const ringWidth = 5;
  const innerR = r - ringWidth;

  // Build SVG donut segments
  let segments = "";
  let angle = -90; // start at top
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  for (const [cat, count] of entries) {
    const info = getCategoryInfo(cat);
    const sweep = (count / total) * 360;
    const startRad = (angle * Math.PI) / 180;
    const endRad = ((angle + sweep) * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;

    const x1 = r + innerR * Math.cos(startRad);
    const y1 = r + innerR * Math.sin(startRad);
    const x2 = r + innerR * Math.cos(endRad);
    const y2 = r + innerR * Math.sin(endRad);

    const ox1 = r + r * Math.cos(startRad);
    const oy1 = r + r * Math.sin(startRad);
    const ox2 = r + r * Math.cos(endRad);
    const oy2 = r + r * Math.sin(endRad);

    if (entries.length === 1) {
      // Full circle — use two arcs
      segments += `<circle cx="${r}" cy="${r}" r="${(r + innerR) / 2}" fill="none" stroke="${info.color}" stroke-width="${ringWidth}" />`;
    } else {
      segments += `<path d="M${x1},${y1} L${ox1},${oy1} A${r},${r} 0 ${largeArc},1 ${ox2},${oy2} L${x2},${y2} A${innerR},${innerR} 0 ${largeArc},0 ${x1},${y1}" fill="${info.color}" />`;
    }
    angle += sweep;
  }

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${segments}
      <circle cx="${r}" cy="${r}" r="${innerR - 1}" fill="white" />
      <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central"
            font-family="'Libre Franklin', sans-serif" font-weight="600"
            font-size="${total > 99 ? 12 : 14}" fill="#374151">${total}</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "marker-cluster",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

// ── Gradient-style cluster icon ─────────────────────────────
function createGradientIcon(cluster: L.MarkerCluster): L.DivIcon {
  const counts = getCategoryCounts(cluster);
  const total = cluster.getChildCount();
  const size = total < 10 ? 44 : total < 50 ? 52 : 60;

  // Dominant category color
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const info = getCategoryInfo(dominant[0]);

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cg-${total}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${info.color}" stop-opacity="0.25" />
          <stop offset="70%" stop-color="${info.color}" stop-opacity="0.5" />
          <stop offset="100%" stop-color="${info.color}" stop-opacity="0.8" />
        </radialGradient>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="url(#cg-${total})" stroke="${info.color}" stroke-width="2" />
      <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central"
            font-family="'Libre Franklin', sans-serif" font-weight="700"
            font-size="${total > 99 ? 12 : 14}" fill="white">${total}</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "marker-cluster",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

// ── Minimal-style cluster icon ──────────────────────────────
function createMinimalIcon(cluster: L.MarkerCluster): L.DivIcon {
  const total = cluster.getChildCount();
  const size = total < 10 ? 40 : total < 50 ? 48 : 56;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="white" stroke="#9ca3af" stroke-width="2" />
      <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central"
            font-family="'Libre Franklin', sans-serif" font-weight="600"
            font-size="${total > 99 ? 11 : 13}" fill="#374151">${total}</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "marker-cluster",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

// ── Public factory ──────────────────────────────────────────
export function createClusterIcon(
  cluster: L.MarkerCluster,
  style?: ClusterStyle
): L.DivIcon {
  const s = style ?? CLUSTER_STYLE;
  switch (s) {
    case "gradient":
      return createGradientIcon(cluster);
    case "minimal":
      return createMinimalIcon(cluster);
    case "donut":
    default:
      return createDonutIcon(cluster);
  }
}

// Augment Leaflet marker options to carry category
declare module "leaflet" {
  interface MarkerOptions {
    category?: string;
    pointData?: PointData;
  }
  interface MarkerCluster {
    getAllChildMarkers(): L.Marker[];
    getChildCount(): number;
  }
}
