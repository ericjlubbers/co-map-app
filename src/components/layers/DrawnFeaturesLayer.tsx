import { CircleMarker, Polyline, Polygon, Tooltip } from "react-leaflet";
import type { DrawnFeatureCollection, DrawingMode } from "../../types";

interface DrawnFeaturesLayerProps {
  features: DrawnFeatureCollection;
  drawingMode: DrawingMode | null;
  selectedFeatureId: string | null;
  onSelectFeature: (id: string) => void;
  onDeleteFeature: (id: string) => void;
}

export default function DrawnFeaturesLayer({
  features,
  drawingMode,
  selectedFeatureId,
  onSelectFeature,
  onDeleteFeature,
}: DrawnFeaturesLayerProps) {
  const isInteractive = drawingMode === "select" || drawingMode === "delete";

  const handleClick = (id: string) => {
    if (drawingMode === "delete") {
      onDeleteFeature(id);
    } else if (drawingMode === "select") {
      onSelectFeature(id);
    }
  };

  return (
    <>
      {features.features.map((feature) => {
        const p = feature.properties;
        const isSelected = p.id === selectedFeatureId;
        const cursor = isInteractive ? "pointer" : "default";

        if (feature.geometry.type === "Point") {
          const [lng, lat] = feature.geometry.coordinates;
          return (
            <CircleMarker
              key={p.id}
              center={[lat, lng]}
              radius={8}
              pathOptions={{
                color: isSelected ? "#1d4ed8" : p.color,
                fillColor: isSelected ? "#3b82f6" : p.color,
                fillOpacity: 0.85,
                opacity: p.opacity,
                weight: isSelected ? 3 : 2,
              }}
              interactive={isInteractive}
              eventHandlers={{ click: () => handleClick(p.id) }}
            >
              {feature.properties.label && (
                <Tooltip permanent direction="right" offset={[10, 0]}>
                  <span style={{ cursor }}>{p.label}</span>
                </Tooltip>
              )}
            </CircleMarker>
          );
        }

        if (feature.geometry.type === "LineString") {
          const positions = feature.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng] as [number, number],
          );
          return (
            <Polyline
              key={p.id}
              positions={positions}
              pathOptions={{
                color: isSelected ? "#1d4ed8" : p.color,
                weight: isSelected ? p.weight + 2 : p.weight,
                dashArray: p.dashArray || undefined,
                opacity: p.opacity,
              }}
              interactive={isInteractive}
              eventHandlers={{ click: () => handleClick(p.id) }}
            >
              {p.label && (
                <Tooltip sticky>
                  <span style={{ cursor }}>{p.label}</span>
                </Tooltip>
              )}
            </Polyline>
          );
        }

        if (feature.geometry.type === "Polygon") {
          const positions = feature.geometry.coordinates[0].map(
            ([lng, lat]) => [lat, lng] as [number, number],
          );
          return (
            <Polygon
              key={p.id}
              positions={positions}
              pathOptions={{
                color: isSelected ? "#1d4ed8" : p.color,
                weight: isSelected ? p.weight + 2 : p.weight,
                fillColor: p.fillColor,
                fillOpacity: p.fillOpacity,
                opacity: p.opacity,
              }}
              interactive={isInteractive}
              eventHandlers={{ click: () => handleClick(p.id) }}
            >
              {p.label && (
                <Tooltip sticky>
                  <span style={{ cursor }}>{p.label}</span>
                </Tooltip>
              )}
            </Polygon>
          );
        }

        return null;
      })}
    </>
  );
}
