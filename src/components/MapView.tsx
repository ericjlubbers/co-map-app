import { useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import type { PointData } from "../types";
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_MAX_BOUNDS,
  CLUSTER_SETTINGS,
  getTileConfig,
} from "../config";
import { useDesign } from "../context/DesignContext";
import { createMarkerIcon } from "./MarkerIcon";
import { createClusterIcon } from "./ClusterIcon";
import PointPopup from "./PointPopup";
import { COLORADO_COUNTIES } from "../data/coloradoCounties";
import { COLORADO_BORDER, COLORADO_MASK } from "../data/coloradoBorder";
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
  const { design } = useDesign();
  const tileConfig = getTileConfig(design.tilePreset);
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
      <TileLayer key={design.tilePreset} url={tileConfig.url} attribution={tileConfig.attribution} maxZoom={tileConfig.maxZoom} />
      {design.showLabels && tileConfig.labelsUrl && (
        <TileLayer
          key={`${design.tilePreset}-labels`}
          url={tileConfig.labelsUrl}
          maxZoom={tileConfig.maxZoom}
          pane="shadowPane"
        />
      )}

      {/* Outside-state fade mask */}
      {design.showOutsideFade && (
        <GeoJSON
          key={`mask-${design.outsideFadeOpacity}`}
          data={COLORADO_MASK}
          style={{
            fillColor: "#000000",
            fillOpacity: design.outsideFadeOpacity,
            stroke: false,
          }}
        />
      )}

      {/* State border */}
      {design.showStateBorder && (
        <GeoJSON
          key={`state-border-${design.stateBorderColor}-${design.stateBorderWeight}`}
          data={COLORADO_BORDER}
          style={{
            color: design.stateBorderColor,
            weight: design.stateBorderWeight,
            fill: false,
          }}
        />
      )}

      {/* County lines */}
      {design.showCountyLines && (
        <GeoJSON
          key={`counties-${design.countyLineColor}-${design.countyLineWeight}-${design.countyLineOpacity}`}
          data={COLORADO_COUNTIES}
          style={{
            color: design.countyLineColor,
            weight: design.countyLineWeight,
            opacity: design.countyLineOpacity,
            fill: false,
          }}
        />
      )}

      <FlyToSelected point={selectedPoint} mapRef={mapRef} />

      <MarkerClusterGroup
        key={design.clusterStyle}
        iconCreateFunction={(cluster: unknown) =>
          createClusterIcon(cluster as Parameters<typeof createClusterIcon>[0], design.clusterStyle)
        }
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
            icon={createMarkerIcon(point.category, point.id === selectedId, design.markerSize)}
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
