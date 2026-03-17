import { useState, useEffect, useCallback, useRef } from "react";
import { GeoJSON, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, PathOptions, LeafletMouseEvent } from "leaflet";
import { useDesign } from "../../context/DesignContext";
import { fetchColoradoWaterways } from "../../lib/vectorTiles";

interface FeatureStyle {
  color: string;
  weight: number;
  opacity: number;
}

const WATERWAY_WEIGHT: Record<string, number> = {
  river: 3,
  stream: 1,
  canal: 2,
};

export default function WaterwayLayer() {
  const { design } = useDesign();
  const map = useMap();

  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [styleOverrides, setStyleOverrides] = useState<Record<string, Partial<FeatureStyle>>>({});
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [popupLatLng, setPopupLatLng] = useState<[number, number] | null>(null);
  const [editColor, setEditColor] = useState(design.waterwayColor);
  const [editWeight, setEditWeight] = useState(design.waterwayWeight);

  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!design.showWaterways) return;
    if (data) return;
    setLoading(true);
    setError(null);
    fetchColoradoWaterways()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [design.showWaterways, data]);

  const getStyle = useCallback(
    (feature?: GeoJSON.Feature): PathOptions => {
      const id = feature?.id as string | undefined;
      const override = id ? styleOverrides[id] : undefined;
      const waterway = (feature?.properties?.waterway as string) ?? "";
      const baseWeight = WATERWAY_WEIGHT[waterway] ?? 1;
      return {
        color: override?.color ?? design.waterwayColor,
        weight: (override?.weight ?? design.waterwayWeight) + (baseWeight - 1),
        opacity: override?.opacity ?? design.waterwayOpacity,
        fillColor: override?.color ?? design.waterwayColor,
        fillOpacity: 0.3,
      };
    },
    [design.waterwayColor, design.waterwayWeight, design.waterwayOpacity, styleOverrides]
  );

  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.setStyle((feature) => getStyle(feature as GeoJSON.Feature));
  }, [design.waterwayColor, design.waterwayWeight, design.waterwayOpacity, styleOverrides, getStyle]);

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const id = feature.id as string;
      layer.on("click", (e: LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const override = styleOverrides[id];
        setEditColor(override?.color ?? design.waterwayColor);
        setEditWeight(override?.weight ?? design.waterwayWeight);
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
    [design.waterwayColor, design.waterwayWeight, styleOverrides, getStyle]
  );

  const applyOverride = useCallback(() => {
    if (!selectedFeatureId) return;
    setStyleOverrides((prev) => ({
      ...prev,
      [selectedFeatureId]: { color: editColor, weight: editWeight },
    }));
    setSelectedFeatureId(null);
    setPopupLatLng(null);
  }, [selectedFeatureId, editColor, editWeight]);

  const clearOverride = useCallback(() => {
    if (!selectedFeatureId) return;
    setStyleOverrides((prev) => {
      const next = { ...prev };
      delete next[selectedFeatureId];
      return next;
    });
    setSelectedFeatureId(null);
    setPopupLatLng(null);
  }, [selectedFeatureId]);

  if (!design.showWaterways) return null;
  if (loading) return <LoadingNotice map={map} message="Loading waterways…" />;
  if (error) return <LoadingNotice map={map} message={`Waterways error: ${error}`} />;
  if (!data) return null;

  return (
    <>
      <GeoJSON
        key={`waterways-${data.features.length}`}
        data={data}
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
            <p className="font-semibold text-gray-800">Waterway style</p>
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
                max={10}
                value={editWeight}
                onChange={(e) => setEditWeight(Number(e.target.value))}
                className="w-16 rounded border border-gray-300 px-1 py-0.5"
              />
            </label>
            <div className="flex gap-1 pt-1">
              <button
                onClick={applyOverride}
                className="flex-1 rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={clearOverride}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}

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
