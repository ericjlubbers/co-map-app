import L from "leaflet";
import type { ClusterStyle } from "../types";
import { getCategoryInfo, CLUSTER_STYLE } from "../config";
import { getFaIconSvg } from "../lib/faIcons";

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
function createDonutIcon(cluster: L.MarkerCluster, resolveColor: (cat: string) => string): L.DivIcon {
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
    const color = resolveColor(cat);
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
      segments += `<circle cx="${r}" cy="${r}" r="${(r + innerR) / 2}" fill="none" stroke="${color}" stroke-width="${ringWidth}" />`;
    } else {
      segments += `<path d="M${x1},${y1} L${ox1},${oy1} A${r},${r} 0 ${largeArc},1 ${ox2},${oy2} L${x2},${y2} A${innerR},${innerR} 0 ${largeArc},0 ${x1},${y1}" fill="${color}" />`;
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
function createGradientIcon(cluster: L.MarkerCluster, resolveColor: (cat: string) => string): L.DivIcon {
  const counts = getCategoryCounts(cluster);
  const total = cluster.getChildCount();
  const size = total < 10 ? 44 : total < 50 ? 52 : 60;

  // Dominant category color
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const color = resolveColor(dominant[0]);

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cg-${total}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25" />
          <stop offset="70%" stop-color="${color}" stop-opacity="0.5" />
          <stop offset="100%" stop-color="${color}" stop-opacity="0.8" />
        </radialGradient>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="url(#cg-${total})" stroke="${color}" stroke-width="2" />
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

// ── Ring-style cluster icon ─────────────────────────────────
function createRingIcon(
  cluster: L.MarkerCluster,
  resolveColor: (cat: string) => string,
  iconMap?: Record<string, string>,
): L.DivIcon {
  const counts = getCategoryCounts(cluster);
  const total = cluster.getChildCount();
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // Build a list of icons to show (one per category, capped at 8)
  const maxIcons = Math.min(entries.length, 8);
  const iconEntries = entries.slice(0, maxIcons);

  const size = Math.max(64, 48 + maxIcons * 3);
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size / 2 - 8; // radius for icon placement
  const iconSize = 10;
  const innerR = ringR - iconSize - 2;

  let icons = "";
  for (let i = 0; i < iconEntries.length; i++) {
    const [cat] = iconEntries[i];
    const color = resolveColor(cat);
    const angle = (i / iconEntries.length) * 2 * Math.PI - Math.PI / 2;
    const ix = cx + ringR * Math.cos(angle);
    const iy = cy + ringR * Math.sin(angle);

    const catIconName = iconMap?.[cat] || getCategoryInfo(cat).icon;
    const svgData = getFaIconSvg(catIconName);

    if (svgData) {
      // Render the FA icon scaled into a small circle
      const [, , w, h] = svgData.viewBox.split(" ").map(Number);
      const scale = iconSize / Math.max(w, h);
      icons += `<g transform="translate(${ix},${iy})">
        <circle r="${iconSize / 2 + 3}" fill="white" stroke="${color}" stroke-width="1.5" />
        <g transform="translate(${-w * scale / 2},${-h * scale / 2}) scale(${scale})">
          <path d="${svgData.pathData}" fill="${color}" />
        </g>
      </g>`;
    } else {
      // Fallback: colored dot
      icons += `<circle cx="${ix}" cy="${iy}" r="4" fill="${color}" stroke="white" stroke-width="1" />`;
    }
  }

  // Thin ring connecting the icons
  const ringSvg = `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="3 2" />`;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${ringSvg}
      <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="white" stroke="#d1d5db" stroke-width="1" />
      <text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="central"
            font-family="'Libre Franklin', sans-serif" font-weight="600"
            font-size="${total > 99 ? 11 : 13}" fill="#374151">${total}</text>
      ${icons}
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
  style?: ClusterStyle,
  colorMap?: Record<string, string>,
  iconMap?: Record<string, string>,
): L.DivIcon {
  const s = style ?? CLUSTER_STYLE;
  const resolver = (cat: string) => colorMap?.[cat] || getCategoryInfo(cat).color;
  switch (s) {
    case "gradient":
      return createGradientIcon(cluster, resolver);
    case "minimal":
      return createMinimalIcon(cluster);
    case "ring":
      return createRingIcon(cluster, resolver, iconMap);
    case "donut":
    default:
      return createDonutIcon(cluster, resolver);
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
