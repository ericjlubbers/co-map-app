import { useState, useEffect, useCallback } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { PathOptions, Layer, LeafletMouseEvent } from "leaflet";
import { useDesign } from "../../context/DesignContext";
import { fetchColoradoLakes } from "../../lib/vectorTiles";
import { useZoom, LOD_THRESHOLDS } from "../../hooks/useLOD";
import type { EditorMode, SelectedElement } from "../../types";

export default function LakeLayer({
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
    if (!design.showLakes) return;
    if (data) return;
    setLoading(true);
    setError(null);
    fetchColoradoLakes()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [design.showLakes, data]);

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      layer.on("click", (e: LeafletMouseEvent) => {
        if (editorMode !== "customize" || !onSelectElement) return;
        L.DomEvent.stopPropagation(e);
        const id = feature.id as string;
        const name = (feature.properties?.name as string) || id;
        onSelectElement({
          sourceType: "lake",
          sourceIds: [id],
          name,
          geometry: feature.geometry,
          properties: (feature.properties ?? {}) as Record<string, unknown>,
        });
      });
      if (editorMode === "customize") {
        layer.on("mouseover", () => {
          (layer as L.Path).setStyle({ weight: 3, fillOpacity: design.lakeOpacity + 0.15 });
        });
        layer.on("mouseout", () => {
          (layer as L.Path).setStyle({ weight: 1, fillOpacity: design.lakeOpacity });
        });
      }
    },
    [editorMode, onSelectElement, design.lakeOpacity],
  );

  if (!design.showLakes || zoom < LOD_THRESHOLDS.lake) return null;

  if (loading) {
    return <LoadingNotice map={map} message="Loading lakes…" />;
  }
  if (error) {
    return <LoadingNotice map={map} message={`Lakes error: ${error}`} />;
  }
  if (!data) return null;

  const visibleData = hiddenFeatureIds && hiddenFeatureIds.size > 0
    ? { ...data, features: data.features.filter((f) => !hiddenFeatureIds.has(f.id as string)) }
    : data;

  const style: PathOptions = {
    color: design.lakeColor,
    weight: 1,
    opacity: 0.6,
    fillColor: design.lakeColor,
    fillOpacity: design.lakeOpacity,
  };

  return (
    <GeoJSON
      key={`lakes-${design.lakeColor}-${design.lakeOpacity}-${visibleData.features.length}-${editorMode}`}
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
