import { useState, useEffect, useCallback } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { PathOptions, Layer, LeafletMouseEvent } from "leaflet";
import { useDesign } from "../../context/DesignContext";
import { fetchColoradoParks } from "../../lib/vectorTiles";
import { useZoom, LOD_THRESHOLDS } from "../../hooks/useLOD";
import type { EditorMode, SelectedElement } from "../../types";

export default function ParkLayer({
  hiddenFeatureIds,
  editorMode,
  onSelectElement,
}: {
  hiddenFeatureIds?: Set<string>;
  editorMode?: EditorMode;
  onSelectElement?: (element: SelectedElement) => void;
}) {
  const { design } = useDesign();
  const map = useMap();
  const zoom = useZoom();
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!design.showParks) return;
    if (data) return;
    setLoading(true);
    setError(null);
    fetchColoradoParks()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [design.showParks, data]);

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      layer.on("click", (e: LeafletMouseEvent) => {
        if (editorMode !== "customize" || !onSelectElement) return;
        L.DomEvent.stopPropagation(e);
        const id = feature.id as string;
        const name = (feature.properties?.name as string) || id;
        onSelectElement({
          sourceType: "park",
          sourceIds: [id],
          name,
          geometry: feature.geometry,
          properties: (feature.properties ?? {}) as Record<string, unknown>,
        });
      });
      if (editorMode === "customize") {
        layer.on("mouseover", () => {
          (layer as L.Path).setStyle({ weight: 3, fillOpacity: design.parkOpacity + 0.15 });
        });
        layer.on("mouseout", () => {
          (layer as L.Path).setStyle({ weight: 1, fillOpacity: design.parkOpacity });
        });
      }
    },
    [editorMode, onSelectElement, design.parkOpacity],
  );

  if (!design.showParks || zoom < LOD_THRESHOLDS.park) return null;

  if (loading) {
    return <LoadingNotice map={map} message="Loading parks…" />;
  }
  if (error) {
    return <LoadingNotice map={map} message={`Parks error: ${error}`} />;
  }
  if (!data) return null;

  const visibleData = hiddenFeatureIds && hiddenFeatureIds.size > 0
    ? { ...data, features: data.features.filter((f) => !hiddenFeatureIds.has(f.id as string)) }
    : data;

  const style: PathOptions = {
    color: design.parkColor,
    weight: 1,
    opacity: 0.6,
    fillColor: design.parkColor,
    fillOpacity: design.parkOpacity,
  };

  return (
    <GeoJSON
      key={`parks-${design.parkColor}-${design.parkOpacity}-${visibleData.features.length}-${editorMode}`}
      data={visibleData}
      style={style}
      onEachFeature={editorMode === "customize" ? onEachFeature : undefined}
    />
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
