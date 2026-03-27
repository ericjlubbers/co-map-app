import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CircleMarker, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useDesign } from "../../context/DesignContext";
import { COLORADO_CITIES, formatElevation } from "../../lib/vectorTiles";
import type { CityFeature } from "../../lib/vectorTiles";
import type { EditorMode, PointData, SelectedElement } from "../../types";

// ── Per-feature style override ───────────────────────────────────────────────
interface CityStyleOverride {
  color?: string;
  fontSize?: number;
  visible?: boolean;
  offsetX?: number;   // per-label pixel offset (positive = right)
  offsetY?: number;   // per-label pixel offset (positive = down)
  bgColor?: string;
  bgOpacity?: number;
}

// ── Minimal HTML escaping to prevent XSS in DivIcon labels ──────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Create a DivIcon for a city/peak label ───────────────────────────────────
function makeCityIcon(
  city: CityFeature,
  color: string,
  fontSize: number,
  override: CityStyleOverride | undefined,
  useMetric: boolean,
  selected: boolean,
  fontFamily: string,
  bgColor: string,
  bgOpacity: number,
  paddingH: number,
  paddingV: number,
  borderRadius: number,
  shadow: boolean,
  iconAnchorX: number,
  iconAnchorY: number,
): L.DivIcon {
  const displayColor = override?.color ?? color;
  const displaySize = override?.fontSize ?? fontSize;
  const isPeak = city.type === "peak";
  const elevStr = escapeHtml(formatElevation(city.elevation_m, useMetric));
  const name = escapeHtml(city.name);
  const safeFont = escapeHtml(fontFamily);

  // Convert hex + opacity to rgba
  const r = parseInt(bgColor.slice(1, 3), 16);
  const g = parseInt(bgColor.slice(3, 5), 16);
  const b = parseInt(bgColor.slice(5, 7), 16);
  const bgRgba = `rgba(${r},${g},${b},${bgOpacity})`;

  const label = isPeak
    ? `<span style="font-size:${displaySize - 1}px;color:#6b7280">▲ ${name}</span><br/><span style="font-size:${displaySize - 2}px;color:#9ca3af">${elevStr}</span>`
    : `<span style="font-size:${displaySize}px;color:${displayColor};font-weight:600">${name}</span>`;

  return L.divIcon({
    className: "",
    html: `<div style="
      white-space:nowrap;
      background:${bgRgba};
      border:${selected ? `2px solid ${displayColor}` : "1px solid rgba(0,0,0,0.15)"};
      border-radius:${borderRadius}px;
      padding:${paddingV}px ${paddingH}px;
      pointer-events:auto;
      box-shadow:${shadow ? "0 1px 3px rgba(0,0,0,0.15)" : "none"};
      font-family:'${safeFont}',sans-serif;
      line-height:1.3;
    ">${label}</div>`,
    iconAnchor: [iconAnchorX, iconAnchorY],
    iconSize: undefined,
  });
}

// ── Collision detection: pixel overlap helper ────────────────────────────────
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  pad = 6
): boolean {
  return (
    Math.abs(ax - bx) < (aw + bw) / 2 + pad &&
    Math.abs(ay - by) < (ah + bh) / 2 + pad
  );
}

// ── Build offset record with optional jointed elbow ──────────────────────────
function buildOffset(
  cx: number,
  cy: number,
  base: L.Point,
  newLatLng: L.LatLng,
  map: L.Map,
  connectorStyle: "straight" | "jointed",
): { lat: number; lng: number; elbowLat?: number; elbowLng?: number } {
  if (connectorStyle === "jointed") {
    const adx = Math.abs(cx - base.x);
    const ady = Math.abs(cy - base.y);
    const elbowPx = adx >= ady ? L.point(base.x, cy) : L.point(cx, base.y);
    const elbowLatLng = map.containerPointToLatLng(elbowPx);
    return { lat: newLatLng.lat, lng: newLatLng.lng, elbowLat: elbowLatLng.lat, elbowLng: elbowLatLng.lng };
  }
  return { lat: newLatLng.lat, lng: newLatLng.lng };
}

// ── Tier-0 city IDs: always visible at state-level zoom ─────────────────────
// These are the 9 named cities that must appear at zoom 6–8
const TIER0_CITY_IDS = new Set([
  "denver",
  "colorado-springs",
  "pueblo",
  "fort-collins",
  "grand-junction",
  "durango",
  "steamboat-springs",
  "greeley",
  "trinidad",
]);

export default function CityLayer({
  hiddenFeatureIds,
  onHideFeature,
  viewLocked,
  editorMode,
  onSelectElement,
  points = [],
}: {
  hiddenFeatureIds?: Set<string>;
  onHideFeature?: (id: string) => void;
  viewLocked?: boolean;
  editorMode?: EditorMode;
  onSelectElement?: (element: SelectedElement) => void;
  /** Active data points — used for label collision detection */
  points?: PointData[];
}) {
  const { design, set } = useDesign();
  const map = useMap();

  // Track current map zoom for tier-based label filtering
  const [mapZoom, setMapZoom] = useState(() => map.getZoom());
  useMapEvents({
    zoomend: () => setMapZoom(map.getZoom()),
  });

  const [styleOverrides, setStyleOverrides] = useState<
    Record<string, CityStyleOverride>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState(design.cityColor);
  const [editFontSize, setEditFontSize] = useState(design.cityFontSize);
  const [editOffsetX, setEditOffsetX] = useState(0);
  const [editOffsetY, setEditOffsetY] = useState(0);
  const [editBgColor, setEditBgColor] = useState(design.cityLabelBgColor);
  const [editBgOpacity, setEditBgOpacity] = useState(design.cityLabelBgOpacity);

  // ── Label collision offsets (city.id → repositioned LatLng + optional elbow) ─
  const [labelOffsets, setLabelOffsets] = useState<
    Record<string, { lat: number; lng: number; elbowLat?: number; elbowLng?: number }>
  >({});

  const visibleCities = useMemo(() => {
    if (!design.showCities) return [];
    return COLORADO_CITIES.filter((c) => {
      if (hiddenFeatureIds?.has(c.id)) return false;
      if (styleOverrides[c.id]?.visible === false) return false;
      // Zoom-based tier filtering:
      // Peaks only show at zoom ≥ 9
      if (c.type === "peak") {
        if (!design.showPeakLabels) return false;
        if (mapZoom < 9) return false;
        return true;
      }
      // Cities/towns
      if (!design.showCityLabels) return false;
      // At zoom < 9, only show Tier-0 named cities
      if (mapZoom < 9 && !TIER0_CITY_IDS.has(c.id)) return false;
      return true;
    });
  }, [design.showCities, design.showCityLabels, design.showPeakLabels, mapZoom, hiddenFeatureIds, styleOverrides]);

  // Keep a ref to the latest points/cities so event handlers always see fresh data
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const visibleCitiesRef = useRef(visibleCities);
  visibleCitiesRef.current = visibleCities;
  const cityFontSizeRef = useRef(design.cityFontSize);
  cityFontSizeRef.current = design.cityFontSize;
  const cityLabelOffsetRef = useRef(design.cityLabelOffset);
  cityLabelOffsetRef.current = design.cityLabelOffset;
  const cityLabelBaselineXRef = useRef(design.cityLabelBaselineX);
  cityLabelBaselineXRef.current = design.cityLabelBaselineX;
  const cityLabelBaselineYRef = useRef(design.cityLabelBaselineY);
  cityLabelBaselineYRef.current = design.cityLabelBaselineY;
  const cityLabelPaddingHRef = useRef(design.cityLabelPaddingH);
  cityLabelPaddingHRef.current = design.cityLabelPaddingH;
  const cityLabelPaddingVRef = useRef(design.cityLabelPaddingV);
  cityLabelPaddingVRef.current = design.cityLabelPaddingV;
  const cityConnectorStyleRef = useRef(design.cityConnectorStyle);
  cityConnectorStyleRef.current = design.cityConnectorStyle;
  const styleOverridesRef = useRef(styleOverrides);
  styleOverridesRef.current = styleOverrides;

  const computeCollisions = useCallback(() => {
    const cities = visibleCitiesRef.current;
    const pts = pointsRef.current;
    const fontSize = cityFontSizeRef.current;
    const NUDGE = cityLabelOffsetRef.current;
    const globalBX = cityLabelBaselineXRef.current;
    const globalBY = cityLabelBaselineYRef.current;
    const hasGlobalBaseline = globalBX !== 0 || globalBY !== 0;
    const pH = cityLabelPaddingHRef.current;
    const pV = cityLabelPaddingVRef.current;

    // Auto-collision candidates — only used when baseline is (0,0) and no per-label override
    const autoDistance = Math.max(NUDGE, 12);
    const candidates: [number, number][] = [
      [autoDistance, 0],
      [0, -autoDistance],
      [-autoDistance, 0],
      [0, autoDistance],
      [autoDistance, -autoDistance],
      [-autoDistance, -autoDistance],
      [autoDistance, autoDistance],
      [-autoDistance, autoDistance],
      [autoDistance * 1.5, 0],
      [0, -autoDistance * 1.5],
      [-autoDistance * 1.5, 0],
      [0, autoDistance * 1.5],
      [autoDistance * 1.5, -autoDistance * 1.5],
      [-autoDistance * 1.5, -autoDistance * 1.5],
    ];

    // Active (non-upcoming) point pixel positions
    const pointPx = pts
      .filter((p) => p.status !== "upcoming")
      .map((p) => map.latLngToContainerPoint([p.lat, p.lng]));

    // Sort cities: larger cities (higher population) get first pick
    const sorted = [...cities].sort((a, b) => (b.population ?? 0) - (a.population ?? 0));

    const newOffsets: Record<string, { lat: number; lng: number; elbowLat?: number; elbowLng?: number }> = {};
    const placedLabels: Array<{ cx: number; cy: number; w: number; h: number }> = [];

    for (const city of sorted) {
      const base = map.latLngToContainerPoint([city.lat, city.lng]);
      const estW = city.name.length * fontSize * 0.6 + pH * 2 + 14;
      const estH = fontSize * 1.6 + pV * 2 + 6;

      const override = styleOverridesRef.current[city.id];
      const hasPerCityOverride = (override?.offsetX ?? 0) !== 0 || (override?.offsetY ?? 0) !== 0;

      let cx: number;
      let cy: number;

      if (hasPerCityOverride) {
        // Per-label X/Y takes full precedence
        cx = base.x + (override!.offsetX ?? 0);
        cy = base.y + (override!.offsetY ?? 0);
        placedLabels.push({ cx, cy, w: estW, h: estH });
        const newLatLng = map.containerPointToLatLng(L.point(cx, cy));
        newOffsets[city.id] = buildOffset(cx, cy, base, newLatLng, map, cityConnectorStyleRef.current);
      } else if (hasGlobalBaseline) {
        // All cities shifted by global baseline X/Y
        cx = base.x + globalBX;
        cy = base.y + globalBY;
        placedLabels.push({ cx, cy, w: estW, h: estH });
        const newLatLng = map.containerPointToLatLng(L.point(cx, cy));
        newOffsets[city.id] = buildOffset(cx, cy, base, newLatLng, map, cityConnectorStyleRef.current);
      } else {
        // Auto collision detection
        let placed = false;
        for (const [dx, dy] of candidates) {
          cx = base.x + dx;
          cy = base.y + dy;

          let blocked = false;
          for (const pPx of pointPx) {
            if (rectsOverlap(cx, cy, estW, estH, pPx.x, pPx.y, 12, 12)) { blocked = true; break; }
          }
          if (!blocked) {
            for (const pl of placedLabels) {
              if (rectsOverlap(cx, cy, estW, estH, pl.cx, pl.cy, pl.w, pl.h)) { blocked = true; break; }
            }
          }
          if (!blocked) {
            placedLabels.push({ cx, cy, w: estW, h: estH });
            const newLatLng = map.containerPointToLatLng(L.point(cx, cy));
            newOffsets[city.id] = buildOffset(cx, cy, base, newLatLng, map, cityConnectorStyleRef.current);
            placed = true;
            break;
          }
        }
        if (!placed) {
          // Fallback: first candidate regardless of collision
          [cx, cy] = [base.x + candidates[0][0], base.y + candidates[0][1]];
          placedLabels.push({ cx, cy, w: estW, h: estH });
          const newLatLng = map.containerPointToLatLng(L.point(cx, cy));
          newOffsets[city.id] = buildOffset(cx, cy, base, newLatLng, map, cityConnectorStyleRef.current);
        }
      }
    }

    setLabelOffsets(newOffsets);
  }, [map]);

  // Subscribe to map events for collision recomputation
  useEffect(() => {
    computeCollisions();
    map.on("moveend", computeCollisions);
    map.on("zoomend", computeCollisions);
    return () => {
      map.off("moveend", computeCollisions);
      map.off("zoomend", computeCollisions);
    };
  }, [map, computeCollisions]);

  // Recompute when visible input data changes
  useEffect(() => {
    computeCollisions();
  }, [visibleCities, points, styleOverrides, computeCollisions]);

  if (!design.showCities) return null;

  return (
    <>
      {visibleCities.map((city) => {
        const override = styleOverrides[city.id];
        const labelFont = design.labelFont === "inherit" ? design.fontFamily : design.labelFont;
        const estW = city.name.length * design.cityFontSize * 0.6 + design.cityLabelPaddingH * 2 + 14;
        const estH = design.cityFontSize * 1.6 + design.cityLabelPaddingV * 2 + 6;
        // Per-label bg color/opacity overrides (falls back to global design value)
        const effectiveBgColor = override?.bgColor ?? design.cityLabelBgColor;
        const effectiveBgOpacity = override?.bgOpacity !== undefined ? override.bgOpacity : design.cityLabelBgOpacity;
        const icon = makeCityIcon(
          city,
          design.cityColor,
          design.cityFontSize,
          override,
          design.useMetricUnits,
          selectedId === city.id,
          labelFont,
          effectiveBgColor,
          effectiveBgOpacity,
          design.cityLabelPaddingH,
          design.cityLabelPaddingV,
          design.cityLabelBorderRadius,
          design.cityLabelShadow,
          Math.floor(estW / 2),
          Math.floor(estH / 2),
        );

        const offset = labelOffsets[city.id];
        const displayLat = offset ? offset.lat : city.lat;
        const displayLng = offset ? offset.lng : city.lng;

        return (
          <React.Fragment key={city.id}>
            {/* City dot at actual city location — shown whenever a connector is present */}
            {design.cityDotShow && offset && (
              <CircleMarker
                center={[city.lat, city.lng]}
                radius={design.cityDotRadius}
                pathOptions={{
                  fillColor: design.cityConnectorColor,
                  fillOpacity: design.cityConnectorOpacity,
                  color: "none",
                  weight: 0,
                }}
                interactive={false}
              />
            )}
            {/* Leader line from label center to city dot */}
            {offset && (
              <Polyline
                positions={
                  offset.elbowLat !== undefined
                    ? [
                        [displayLat, displayLng],
                        [offset.elbowLat, offset.elbowLng!],
                        [city.lat, city.lng],
                      ]
                    : [
                        [displayLat, displayLng],
                        [city.lat, city.lng],
                      ]
                }
                pathOptions={{
                  color: design.cityConnectorColor,
                  weight: design.cityConnectorWeight,
                  opacity: design.cityConnectorOpacity,
                  dashArray: design.cityConnectorDash === "solid" ? undefined : design.cityConnectorDash === "dashed" ? "6 4" : "1 4",
                }}
                interactive={false}
              />
            )}
            <Marker
              position={[displayLat, displayLng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (editorMode === "customize" && onSelectElement) {
                    onSelectElement({
                      sourceType: "city",
                      sourceIds: [city.id],
                      name: city.name,
                      geometry: { type: "Point", coordinates: [city.lng, city.lat] },
                      properties: {
                        elevation_m: city.elevation_m,
                        population: city.population,
                        type: city.type,
                      },
                    });
                    return;
                  }
                  setSelectedId(city.id);
                  setEditColor(override?.color ?? design.cityColor);
                  setEditFontSize(override?.fontSize ?? design.cityFontSize);
                  setEditOffsetX(override?.offsetX ?? 0);
                  setEditOffsetY(override?.offsetY ?? 0);
                  setEditBgColor(override?.bgColor ?? design.cityLabelBgColor);
                  setEditBgOpacity(override?.bgOpacity !== undefined ? override.bgOpacity : design.cityLabelBgOpacity);
                },
              }}
          >
            <Popup
              eventHandlers={{ remove: () => setSelectedId(null) }}
              minWidth={240}
            >
              <div className="space-y-2 text-xs" style={{ minWidth: 240 }}>
                <p className="font-semibold text-gray-800">
                  {city.type === "peak" ? "⛰ " : "🏙 "}
                  {city.name}
                </p>
                <p className="text-gray-500">
                  Elevation: {formatElevation(city.elevation_m, design.useMetricUnits)}
                  {city.population !== undefined && (
                    <> &bull; Pop. {city.population.toLocaleString()}</>
                  )}
                </p>

                {/* ── Per-label overrides ── */}
                <hr className="border-gray-200" />
                <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400">This label only</p>

                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Text color</span>
                  <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border border-gray-300 p-0" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Font size</span>
                  <input type="number" min={8} max={20} value={editFontSize}
                    onChange={(e) => setEditFontSize(Number(e.target.value))}
                    className="w-14 rounded border border-gray-300 px-1 py-0.5" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Bg color</span>
                  <input type="color" value={editBgColor} onChange={(e) => setEditBgColor(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border border-gray-300 p-0" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Bg opacity</span>
                  <div className="flex items-center gap-1">
                    <input type="range" min={0} max={1} step={0.05} value={editBgOpacity}
                      onChange={(e) => setEditBgOpacity(Number(e.target.value))} className="w-20" />
                    <span className="w-8 text-right text-gray-500">{Math.round(editBgOpacity * 100)}%</span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Offset X</span>
                  <div className="flex items-center gap-1">
                    <input type="range" min={-60} max={60} step={1} value={editOffsetX}
                      onChange={(e) => setEditOffsetX(Number(e.target.value))} className="w-20" />
                    <span className="w-8 text-right text-gray-500">{editOffsetX}px</span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Offset Y</span>
                  <div className="flex items-center gap-1">
                    <input type="range" min={-60} max={60} step={1} value={editOffsetY}
                      onChange={(e) => setEditOffsetY(Number(e.target.value))} className="w-20" />
                    <span className="w-8 text-right text-gray-500">{editOffsetY}px</span>
                  </div>
                </label>

                {/* ── Global label settings ── */}
                <hr className="border-gray-200" />
                <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400">All labels (global)</p>

                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Padding H</span>
                  <div className="flex items-center gap-1">
                    <input type="range" min={0} max={16} step={1} value={design.cityLabelPaddingH}
                      onChange={(e) => set("cityLabelPaddingH", Number(e.target.value))} className="w-20" />
                    <span className="w-8 text-right text-gray-500">{design.cityLabelPaddingH}px</span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Padding V</span>
                  <div className="flex items-center gap-1">
                    <input type="range" min={0} max={10} step={1} value={design.cityLabelPaddingV}
                      onChange={(e) => set("cityLabelPaddingV", Number(e.target.value))} className="w-20" />
                    <span className="w-8 text-right text-gray-500">{design.cityLabelPaddingV}px</span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Corner radius</span>
                  <div className="flex items-center gap-1">
                    <input type="range" min={0} max={12} step={1} value={design.cityLabelBorderRadius}
                      onChange={(e) => set("cityLabelBorderRadius", Number(e.target.value))} className="w-20" />
                    <span className="w-8 text-right text-gray-500">{design.cityLabelBorderRadius}px</span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Shadow</span>
                  <input type="checkbox" checked={design.cityLabelShadow}
                    onChange={(e) => set("cityLabelShadow", e.target.checked)} className="h-4 w-4" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Connector</span>
                  <div className="flex gap-0.5">
                    {(["straight", "jointed"] as const).map((s) => (
                      <button key={s} onClick={() => set("cityConnectorStyle", s)}
                        className={`rounded px-1.5 py-0.5 text-[10px] ${design.cityConnectorStyle === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Line style</span>
                  <div className="flex gap-0.5">
                    {(["solid", "dashed", "dotted"] as const).map((s) => (
                      <button key={s} onClick={() => set("cityConnectorDash", s)}
                        className={`rounded px-1.5 py-0.5 text-[10px] ${design.cityConnectorDash === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </label>

                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => {
                      setStyleOverrides((prev) => ({
                        ...prev,
                        [city.id]: {
                          ...prev[city.id],
                          color: editColor,
                          fontSize: editFontSize,
                          offsetX: editOffsetX,
                          offsetY: editOffsetY,
                          bgColor: editBgColor,
                          bgOpacity: editBgOpacity,
                        },
                      }));
                      setSelectedId(null);
                    }}
                    className="flex-1 rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setStyleOverrides((prev) => {
                        const next = { ...prev };
                        delete next[city.id];
                        return next;
                      });
                      setSelectedId(null);
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      if (viewLocked && onHideFeature) {
                        onHideFeature(city.id);
                      } else {
                        setStyleOverrides((prev) => ({
                          ...prev,
                          [city.id]: { ...prev[city.id], visible: false },
                        }));
                      }
                      setSelectedId(null);
                    }}
                    className="rounded border border-red-200 px-2 py-1 text-red-500 hover:bg-red-50"
                    title="Hide this city"
                  >
                    Hide
                  </button>
                </div>
              </div>
            </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
