import { useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import type { PointData } from "../types";
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_MAX_BOUNDS,
  TILE_CONFIG,
  CLUSTER_SETTINGS,
} from "../config";
import { createMarkerIcon } from "./MarkerIcon";
import { createClusterIcon } from "./ClusterIcon";
import PointPopup from "./PointPopup";
import type { Map as LeafletMap } from "leaflet";

interface Props {
  points: PointData[];
  selectedId: string | null;
  onSelectPoint: (id: string | null) => void;
}

// Helper component to fly to a selected point
function FlyToSelected({
  point,
  mapRef,
}: {
  point: PointData | null;
  mapRef: React.RefObject<LeafletMap | null>;
}) {
  const map = useMap();

  useEffect(() => {
    if (mapRef.current === null) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  useEffect(() => {
    if (point) {
      map.flyTo([point.lat, point.lng], 13, { duration: 0.8 });
    }
  }, [point, map]);

  return null;
}

export default function MapView({ points, selectedId, onSelectPoint }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedId) ?? null,
    [points, selectedId]
  );

  // Open popup on selected marker after fly-to
  useEffect(() => {
    if (selectedId && markerRefs.current[selectedId]) {
      const timer = setTimeout(() => {
        markerRefs.current[selectedId]?.openPopup();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [selectedId]);

  const handleMarkerRef = useCallback(
    (id: string) => (ref: L.Marker | null) => {
      if (ref) {
        markerRefs.current[id] = ref;
      }
    },
    []
  );

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      maxBounds={MAP_MAX_BOUNDS}
      maxBoundsViscosity={0.8}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer url={TILE_CONFIG.url} attribution={TILE_CONFIG.attribution} maxZoom={TILE_CONFIG.maxZoom} />
      <FlyToSelected point={selectedPoint} mapRef={mapRef} />

      <MarkerClusterGroup
        iconCreateFunction={createClusterIcon}
        maxClusterRadius={CLUSTER_SETTINGS.maxClusterRadius}
        disableClusteringAtZoom={CLUSTER_SETTINGS.disableClusteringAtZoom}
        animate={CLUSTER_SETTINGS.animate}
        spiderfyDistanceMultiplier={CLUSTER_SETTINGS.spiderfyDistanceMultiplier}
        chunkedLoading={CLUSTER_SETTINGS.chunkedLoading}
        zoomToBoundsOnClick={CLUSTER_SETTINGS.zoomToBoundsOnClick}
        showCoverageOnHover={CLUSTER_SETTINGS.showCoverageOnHover}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={createMarkerIcon(point.category, point.id === selectedId)}
            category={point.category}
            ref={handleMarkerRef(point.id)}
            eventHandlers={{
              click: () => onSelectPoint(point.id),
            }}
          >
            <Popup>
              <PointPopup point={point} />
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
