import { useCallback, useMemo, useEffect } from "react";
import { GeoJSON, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, PathOptions, LeafletMouseEvent } from "leaflet";
import { useDesign } from "../../context/DesignContext";
import type { PrimaryElement, SelectedElement, StyleOverrides } from "../../types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Find the nearest point on a geometry to a reference point */
function nearestPointOnGeometry(
  geometry: GeoJSON.Geometry,
  refLat: number,
  refLng: number,
): [number, number] {
  const coords: [number, number][] = [];
  const extract = (g: GeoJSON.Geometry) => {
    switch (g.type) {
      case "Point":
        coords.push([g.coordinates[1], g.coordinates[0]]);
        break;
      case "MultiPoint":
        for (const c of g.coordinates) coords.push([c[1], c[0]]);
        break;
      case "LineString":
        for (const c of g.coordinates) coords.push([c[1], c[0]]);
        break;
      case "MultiLineString":
        for (const line of g.coordinates)
          for (const c of line) coords.push([c[1], c[0]]);
        break;
      case "Polygon":
        for (const ring of g.coordinates)
          for (const c of ring) coords.push([c[1], c[0]]);
        break;
      case "MultiPolygon":
        for (const poly of g.coordinates)
          for (const ring of poly)
            for (const c of ring) coords.push([c[1], c[0]]);
        break;
      case "GeometryCollection":
        for (const gg of g.geometries) extract(gg);
        break;
    }
  };
  extract(geometry);

  if (coords.length === 0) return [refLat, refLng];

  let best = coords[0];
  let bestDist = (best[0] - refLat) ** 2 + (best[1] - refLng) ** 2;
  for (let i = 1; i < coords.length; i++) {
    const d = (coords[i][0] - refLat) ** 2 + (coords[i][1] - refLng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = coords[i];
    }
  }
  return best;
}

// ── Selection highlight overlay ──────────────────────────────────────────────
function SelectionOverlay({ selectedElement }: { selectedElement: SelectedElement | null }) {
  if (!selectedElement) return null;

  const data: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: selectedElement.geometry,
        properties: {},
      },
    ],
  };

  const style: PathOptions = {
    color: "#3b82f6",
    weight: 5,
    opacity: 0.8,
    fillColor: "#3b82f6",
    fillOpacity: 0.15,
    dashArray: "",
  };

  return (
    <GeoJSON
      key={`selection-${selectedElement.sourceIds.join("-")}`}
      data={data}
      style={style}
      interactive={false}
      pointToLayer={(_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 12,
          color: "#3b82f6",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
        })
      }
    />
  );
}

// ── Deselect on map click / Escape key ───────────────────────────────────────
function DeselectHandler({ onDeselect }: { onDeselect: () => void }) {
  const map = useMap();

  useEffect(() => {
    const handleClick = () => onDeselect();
    map.on("click", handleClick);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDeselect();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      map.off("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [map, onDeselect]);

  return null;
}

// ── Main PrimaryElementsLayer ────────────────────────────────────────────────
export default function PrimaryElementsLayer({
  primaryElements,
  selectedElement,
  onSelectElement,
  onUpdatePrimaryElement,
}: {
  primaryElements: PrimaryElement[];
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
  onUpdatePrimaryElement?: (elementId: string, updates: Partial<PrimaryElement>) => void;
}) {
  const { design } = useDesign();

  const pathElements = useMemo(
    () => primaryElements.filter((el) => el.sourceType !== "city"),
    [primaryElements],
  );
  const cityElements = useMemo(
    () => primaryElements.filter((el) => el.sourceType === "city"),
    [primaryElements],
  );

  // Build GeoJSON for path-based primary elements — include styleOverrides in properties
  const pathData: GeoJSON.FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: pathElements.map((el) => ({
        type: "Feature" as const,
        id: el.id,
        geometry: el.geometry,
        properties: {
          ...el.properties,
          _primaryId: el.id,
          _sourceType: el.sourceType,
          _name: el.name,
          _sourceIds: el.sourceIds,
          _styleOverrides: el.styleOverrides,
        },
      })),
    }),
    [pathElements],
  );

  const getStyle = useCallback(
    (feature?: GeoJSON.Feature): PathOptions => {
      const sourceType = feature?.properties?._sourceType as string;
      const ov = (feature?.properties?._styleOverrides ?? {}) as StyleOverrides;

      let base: PathOptions;
      switch (sourceType) {
        case "road":
          base = {
            color: design.roadColor,
            weight: design.roadWeight + 1,
            opacity: design.roadOpacity,
            dashArray: design.roadDashArray,
          };
          break;
        case "waterway":
          base = {
            color: design.waterwayColor,
            weight: design.waterwayWeight + 1,
            opacity: design.waterwayOpacity,
          };
          break;
        case "park":
          base = {
            color: design.parkColor,
            weight: 1,
            opacity: 0.6,
            fillColor: design.parkColor,
            fillOpacity: design.parkOpacity,
          };
          break;
        case "lake":
          base = {
            color: design.lakeColor,
            weight: 1,
            opacity: 0.6,
            fillColor: design.lakeColor,
            fillOpacity: design.lakeOpacity,
          };
          break;
        default:
          base = { color: "#666", weight: 2, opacity: 0.8 };
      }

      // Apply per-element style overrides
      if (ov.color) base.color = ov.color;
      if (ov.weight !== undefined) base.weight = ov.weight;
      if (ov.opacity !== undefined) base.opacity = ov.opacity;
      if (ov.dashArray !== undefined) base.dashArray = ov.dashArray;
      if (ov.fillColor) base.fillColor = ov.fillColor;
      if (ov.fillOpacity !== undefined) base.fillOpacity = ov.fillOpacity;

      return base;
    },
    [design],
  );

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      layer.on("click", (e: LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const props = feature.properties ?? {};
        onSelectElement({
          sourceType: props._sourceType,
          sourceIds: props._sourceIds,
          name: props._name,
          geometry: feature.geometry,
          properties: props,
        });
      });
      layer.on("mouseover", () => {
        const w = getStyle(feature).weight ?? 2;
        (layer as L.Path).setStyle({ weight: w + 2, opacity: 1 });
      });
      layer.on("mouseout", () => {
        (layer as L.Path).setStyle(getStyle(feature));
      });
    },
    [onSelectElement, getStyle],
  );

  // Stable key for GeoJSON re-mounting — include style override hashes
  const pathKey = useMemo(() => {
    const ovHash = pathElements
      .map((el) => (el.styleOverrides ? JSON.stringify(el.styleOverrides) : ""))
      .join("|");
    return `primary-paths-${pathElements.length}-${design.roadColor}-${design.waterwayColor}-${design.parkColor}-${design.lakeColor}-${ovHash}`;
  }, [pathElements, design.roadColor, design.waterwayColor, design.parkColor, design.lakeColor]);

  const handleDeselect = useCallback(() => onSelectElement(null), [onSelectElement]);

  return (
    <>
      <DeselectHandler onDeselect={handleDeselect} />

      {/* Path-based primary elements */}
      {pathElements.length > 0 && (
        <GeoJSON
          key={pathKey}
          data={pathData}
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      )}

      {/* City primary elements — draggable labels + connector lines */}
      {cityElements.map((el) => {
        const geom = el.geometry as GeoJSON.Point;
        const [lng, lat] = geom.coordinates;
        const ov = el.styleOverrides ?? {};
        const labelPos = el.labelPosition;
        const displayLat = labelPos?.lat ?? lat;
        const displayLng = labelPos?.lng ?? lng;

        const labelFont =
          design.labelFont === "inherit" ? design.fontFamily : design.labelFont;
        const safeFont = escapeHtml(labelFont);
        const safeName = escapeHtml(el.name);

        const fontSize = ov.fontSize ?? design.cityFontSize;
        const fontColor = ov.fontColor ?? design.cityColor;
        const bgColor = ov.bgColor ?? "#ffffff";
        const bgOpacity = ov.bgOpacity ?? 0.85;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            white-space:nowrap;
            background:rgba(${hexToRgb(bgColor)},${bgOpacity});
            border:1px solid ${escapeHtml(fontColor)};
            border-radius:4px;
            padding:2px 5px;
            font-size:${fontSize}px;
            color:${escapeHtml(fontColor)};
            font-weight:600;
            font-family:'${safeFont}',sans-serif;
            pointer-events:auto;
            cursor:grab;
            box-shadow:0 1px 3px rgba(0,0,0,0.15);
          ">${safeName}</div>`,
          iconAnchor: [0, 0],
          iconSize: undefined,
        });

        return (
          <CityLabel
            key={`city-${el.id}-${fontSize}-${fontColor}-${bgColor}-${bgOpacity}-${displayLat}-${displayLng}`}
            el={el}
            icon={icon}
            displayLat={displayLat}
            displayLng={displayLng}
            originLat={lat}
            originLng={lng}
            onSelectElement={onSelectElement}
            onUpdatePrimaryElement={onUpdatePrimaryElement}
          />
        );
      })}

      {/* Selection highlight overlay */}
      <SelectionOverlay selectedElement={selectedElement} />
    </>
  );
}

// ── City label with drag + connector line ────────────────────────────────────
function CityLabel({
  el,
  icon,
  displayLat,
  displayLng,
  originLat,
  originLng,
  onSelectElement,
  onUpdatePrimaryElement,
}: {
  el: PrimaryElement;
  icon: L.DivIcon;
  displayLat: number;
  displayLng: number;
  originLat: number;
  originLng: number;
  onSelectElement: (element: SelectedElement | null) => void;
  onUpdatePrimaryElement?: (elementId: string, updates: Partial<PrimaryElement>) => void;
}) {
  const hasCustomPosition = !!el.labelPosition;
  const connector = el.connectorStyle ?? {};

  // Connector line: from label position to nearest point on source geometry
  const connectorTarget = useMemo(() => {
    if (!hasCustomPosition) return null;
    return nearestPointOnGeometry(el.geometry, displayLat, displayLng);
  }, [hasCustomPosition, el.geometry, displayLat, displayLng]);

  return (
    <>
      {/* Leader line connector (only when label has been repositioned) */}
      {connectorTarget && (
        <Polyline
          positions={[
            [displayLat, displayLng],
            connectorTarget,
          ]}
          pathOptions={{
            color: connector.color ?? "#94a3b8",
            weight: connector.weight ?? 1,
            opacity: connector.opacity ?? 0.6,
            dashArray: connector.dashArray ?? "",
          }}
          interactive={false}
        />
      )}

      <Marker
        position={[displayLat, displayLng]}
        icon={icon}
        draggable
        eventHandlers={{
          click: () => {
            onSelectElement({
              sourceType: "city",
              sourceIds: el.sourceIds,
              name: el.name,
              geometry: el.geometry,
              properties: el.properties,
            });
          },
          dragend: (e) => {
            const marker = e.target as L.Marker;
            const pos = marker.getLatLng();
            onUpdatePrimaryElement?.(el.id, {
              labelPosition: { lat: pos.lat, lng: pos.lng },
            });
          },
        }}
      />
    </>
  );
}

/** Convert hex color to "r,g,b" string for rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
}
