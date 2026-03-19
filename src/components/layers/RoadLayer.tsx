import { useState, useEffect, useCallback, useRef } from "react";
import { GeoJSON, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, PathOptions, LeafletMouseEvent } from "leaflet";
import { useDesign } from "../../context/DesignContext";
import {
  fetchColoradoMotorways,
  fetchColoradoTrunkRoads,
  fetchColoradoPrimaryRoads,
} from "../../lib/vectorTiles";

interface FeatureStyle {
  color: string;
  weight: number;
  opacity: number;
  dashArray: string;
}

const HIGHWAY_WEIGHT: Record<string, number> = {
  motorway: 4,
  trunk: 3,
  primary: 2,
};

// ── Sub-layer for a single road type ──────────────────────────────────────────
function RoadSubLayer({
  enabled,
  fetcher,
  cacheKey,
  roadColor,
  roadWeight,
  roadOpacity,
  roadDashArray,
  styleOverrides,
  onStyleOverride,
  onClearOverride,
  hiddenFeatureIds,
  onHideFeature,
  viewLocked,
}: {
  enabled: boolean;
  fetcher: () => Promise<GeoJSON.FeatureCollection>;
  cacheKey: string;
  roadColor: string;
  roadWeight: number;
  roadOpacity: number;
  roadDashArray: string;
  styleOverrides: Record<string, Partial<FeatureStyle>>;
  onStyleOverride: (id: string, style: Partial<FeatureStyle>) => void;
  onClearOverride: (id: string) => void;
  hiddenFeatureIds?: Set<string>;
  onHideFeature?: (id: string) => void;
  viewLocked?: boolean;
}) {
  const map = useMap();
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [popupLatLng, setPopupLatLng] = useState<[number, number] | null>(null);
  const [editColor, setEditColor] = useState(roadColor);
  const [editWeight, setEditWeight] = useState(roadWeight);
  const [editDash, setEditDash] = useState(roadDashArray);

  // Reset data when fetcher (bbox) changes so it refetches
  const prevFetcherRef = useRef(fetcher);
  useEffect(() => {
    if (prevFetcherRef.current !== fetcher) {
      prevFetcherRef.current = fetcher;
      setData(null);
    }
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;
    if (data) return;
    setLoading(true);
    setError(null);
    fetcher()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [enabled, data, fetcher]);

  const getStyle = useCallback(
    (feature?: GeoJSON.Feature): PathOptions => {
      const id = feature?.id as string | undefined;
      const override = id ? styleOverrides[id] : undefined;
      const highway = (feature?.properties?.highway as string) ?? "";
      const baseWeight = HIGHWAY_WEIGHT[highway] ?? 1;
      return {
        color: override?.color ?? roadColor,
        weight: (override?.weight ?? roadWeight) + (baseWeight - 1),
        opacity: override?.opacity ?? roadOpacity,
        dashArray: override?.dashArray ?? roadDashArray,
      };
    },
    [roadColor, roadWeight, roadOpacity, roadDashArray, styleOverrides],
  );

  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.setStyle((feature) => getStyle(feature as GeoJSON.Feature));
  }, [roadColor, roadWeight, roadOpacity, roadDashArray, styleOverrides, getStyle]);

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const id = feature.id as string;
      layer.on("click", (e: LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const override = styleOverrides[id];
        setEditColor(override?.color ?? roadColor);
        setEditWeight(override?.weight ?? roadWeight);
        setEditDash(override?.dashArray ?? roadDashArray);
        setSelectedFeatureId(id);
        setPopupLatLng([e.latlng.lat, e.latlng.lng]);
      });
      layer.on("mouseover", () => {
        const w = getStyle(feature).weight ?? 2;
        (layer as L.Path).setStyle({ weight: w + 2, opacity: 1 });
      });
      layer.on("mouseout", () => {
        (layer as L.Path).setStyle(getStyle(feature));
      });
    },
    [roadColor, roadWeight, roadDashArray, styleOverrides, getStyle],
  );

  if (!enabled) return null;
  if (loading) return <LoadingNotice map={map} message={`Loading ${cacheKey}…`} />;
  if (error) return <LoadingNotice map={map} message={`${cacheKey} error: ${error}`} />;
  if (!data) return null;

  // Filter out hidden features
  const visibleData = hiddenFeatureIds && hiddenFeatureIds.size > 0
    ? { ...data, features: data.features.filter((f) => !hiddenFeatureIds.has(f.id as string)) }
    : data;

  return (
    <>
      <GeoJSON
        key={`${cacheKey}-${visibleData.features.length}`}
        data={visibleData}
        style={getStyle}
        onEachFeature={onEachFeature}
        ref={(ref) => {
          if (ref) geoJsonRef.current = ref;
        }}
      />
      {selectedFeatureId && popupLatLng && (
        <Popup
          position={popupLatLng}
          eventHandlers={{
            remove: () => {
              setSelectedFeatureId(null);
              setPopupLatLng(null);
            },
          }}
        >
          <div className="space-y-2 text-xs" style={{ minWidth: 180 }}>
            <p className="font-semibold text-gray-800">Road style</p>
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
              <span className="text-gray-600">Weight</span>
              <input
                type="number"
                min={1}
                max={12}
                value={editWeight}
                onChange={(e) => setEditWeight(Number(e.target.value))}
                className="w-16 rounded border border-gray-300 px-1 py-0.5"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-gray-600">Dash</span>
              <input
                type="text"
                placeholder="e.g. 6 3"
                value={editDash}
                onChange={(e) => setEditDash(e.target.value)}
                className="w-16 rounded border border-gray-300 px-1 py-0.5"
              />
            </label>
            <div className="flex gap-1 pt-1">
              <button
                onClick={() => {
                  if (selectedFeatureId) {
                    onStyleOverride(selectedFeatureId, {
                      color: editColor,
                      weight: editWeight,
                      dashArray: editDash,
                    });
                  }
                  setSelectedFeatureId(null);
                  setPopupLatLng(null);
                }}
                className="flex-1 rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  if (selectedFeatureId) onClearOverride(selectedFeatureId);
                  setSelectedFeatureId(null);
                  setPopupLatLng(null);
                }}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
            {viewLocked && onHideFeature && selectedFeatureId && (
              <button
                onClick={() => {
                  onHideFeature(selectedFeatureId);
                  setSelectedFeatureId(null);
                  setPopupLatLng(null);
                }}
                className="w-full rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
              >
                Hide Feature
              </button>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}

// ── Main RoadLayer ──────────────────────────────────────────────────────────
export default function RoadLayer({
  hiddenFeatureIds,
  onHideFeature,
  viewLocked,
  bbox,
}: {
  hiddenFeatureIds?: Set<string>;
  onHideFeature?: (id: string) => void;
  viewLocked?: boolean;
  bbox?: string;
}) {
  const { design } = useDesign();
  const [styleOverrides, setStyleOverrides] = useState<Record<string, Partial<FeatureStyle>>>({});

  const handleOverride = useCallback((id: string, style: Partial<FeatureStyle>) => {
    setStyleOverrides((prev) => ({ ...prev, [id]: style }));
  }, []);

  const handleClear = useCallback((id: string) => {
    setStyleOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Create fetchers that use the scoped bbox when provided
  const motorwayFetcher = useCallback(() => fetchColoradoMotorways(bbox), [bbox]);
  const trunkFetcher = useCallback(() => fetchColoradoTrunkRoads(bbox), [bbox]);
  const primaryFetcher = useCallback(() => fetchColoradoPrimaryRoads(bbox), [bbox]);

  if (!design.showRoads) return null;

  return (
    <>
      <RoadSubLayer
        enabled={design.showMotorways}
        fetcher={motorwayFetcher}
        cacheKey={`motorways${bbox ? `-${bbox}` : ""}`}
        roadColor={design.roadColor}
        roadWeight={design.roadWeight}
        roadOpacity={design.roadOpacity}
        roadDashArray={design.roadDashArray}
        styleOverrides={styleOverrides}
        onStyleOverride={handleOverride}
        onClearOverride={handleClear}
        hiddenFeatureIds={hiddenFeatureIds}
        onHideFeature={onHideFeature}
        viewLocked={viewLocked}
      />
      <RoadSubLayer
        enabled={design.showTrunkRoads}
        fetcher={trunkFetcher}
        cacheKey={`trunk roads${bbox ? `-${bbox}` : ""}`}
        roadColor={design.roadColor}
        roadWeight={design.roadWeight}
        roadOpacity={design.roadOpacity}
        roadDashArray={design.roadDashArray}
        styleOverrides={styleOverrides}
        onStyleOverride={handleOverride}
        onClearOverride={handleClear}
        hiddenFeatureIds={hiddenFeatureIds}
        onHideFeature={onHideFeature}
        viewLocked={viewLocked}
      />
      <RoadSubLayer
        enabled={design.showPrimaryRoads}
        fetcher={primaryFetcher}
        cacheKey={`primary roads${bbox ? `-${bbox}` : ""}`}
        roadColor={design.roadColor}
        roadWeight={design.roadWeight}
        roadOpacity={design.roadOpacity}
        roadDashArray={design.roadDashArray}
        styleOverrides={styleOverrides}
        onStyleOverride={handleOverride}
        onClearOverride={handleClear}
        hiddenFeatureIds={hiddenFeatureIds}
        onHideFeature={onHideFeature}
        viewLocked={viewLocked}
      />
    </>
  );
}

// ── Small helper: shows a status notice as a Leaflet control ────────────────
function LoadingNotice({ map, message }: { map: L.Map; message: string }) {
  useEffect(() => {
    const div = L.DomUtil.create("div");
    div.className =
      "leaflet-control leaflet-bar bg-white text-xs text-gray-600 px-2 py-1 rounded shadow";
    div.textContent = message;

    const ctrl = new L.Control({ position: "bottomleft" });
    ctrl.onAdd = () => div;
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map, message]);

  return null;
}
