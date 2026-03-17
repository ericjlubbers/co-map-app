import { useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useDesign } from "../../context/DesignContext";
import { COLORADO_CITIES, formatElevation } from "../../lib/vectorTiles";
import type { CityFeature } from "../../lib/vectorTiles";

// ── Per-feature style override ───────────────────────────────────────────────
interface CityStyleOverride {
  color?: string;
  fontSize?: number;
  visible?: boolean;
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
  fontFamily: string
): L.DivIcon {
  const displayColor = override?.color ?? color;
  const displaySize = override?.fontSize ?? fontSize;
  const isPeak = city.type === "peak";
  const elevStr = escapeHtml(formatElevation(city.elevation_m, useMetric));
  const name = escapeHtml(city.name);
  const safeFont = escapeHtml(fontFamily);

  const label = isPeak
    ? `<span style="font-size:${displaySize - 1}px;color:#6b7280">▲ ${name}</span><br/><span style="font-size:${displaySize - 2}px;color:#9ca3af">${elevStr}</span>`
    : `<span style="font-size:${displaySize}px;color:${displayColor};font-weight:600">${name}</span>`;

  return L.divIcon({
    className: "",
    html: `<div style="
      white-space:nowrap;
      background:rgba(255,255,255,0.85);
      border:${selected ? `2px solid ${displayColor}` : "1px solid rgba(0,0,0,0.15)"};
      border-radius:4px;
      padding:2px 5px;
      pointer-events:auto;
      box-shadow:0 1px 3px rgba(0,0,0,0.15);
      font-family:'${safeFont}',sans-serif;
      line-height:1.3;
    ">${label}</div>`,
    iconAnchor: [0, 0],
    iconSize: undefined,
  });
}

export default function CityLayer() {
  const { design } = useDesign();

  const [styleOverrides, setStyleOverrides] = useState<
    Record<string, CityStyleOverride>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState(design.cityColor);
  const [editFontSize, setEditFontSize] = useState(design.cityFontSize);

  if (!design.showCities) return null;

  const visibleCities = COLORADO_CITIES.filter((c) => {
    if (styleOverrides[c.id]?.visible === false) return false;
    if (c.type === "peak" && !design.showPeakLabels) return false;
    if ((c.type === "city" || c.type === "town") && !design.showCityLabels) return false;
    return true;
  });

  return (
    <>
      {visibleCities.map((city) => {
        const override = styleOverrides[city.id];
        const labelFont = design.labelFont === "inherit" ? design.fontFamily : design.labelFont;
        const icon = makeCityIcon(
          city,
          design.cityColor,
          design.cityFontSize,
          override,
          design.useMetricUnits,
          selectedId === city.id,
          labelFont
        );

        return (
          <Marker
            key={city.id}
            position={[city.lat, city.lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                setSelectedId(city.id);
                setEditColor(override?.color ?? design.cityColor);
                setEditFontSize(override?.fontSize ?? design.cityFontSize);
              },
            }}
          >
            <Popup
              eventHandlers={{ remove: () => setSelectedId(null) }}
            >
              <div className="space-y-2 text-xs" style={{ minWidth: 180 }}>
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
                <hr className="border-gray-200" />
                <p className="text-gray-600 font-medium">Label style</p>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Color</span>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border border-gray-300 p-0"
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Font size</span>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={editFontSize}
                    onChange={(e) => setEditFontSize(Number(e.target.value))}
                    className="w-16 rounded border border-gray-300 px-1 py-0.5"
                  />
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
                      setStyleOverrides((prev) => ({
                        ...prev,
                        [city.id]: { ...prev[city.id], visible: false },
                      }));
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
        );
      })}
    </>
  );
}
