import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
  useMapEvents,
  Polyline,
  Polygon,
  CircleMarker,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import type { PointData, DrawingMode, DrawnFeatureCollection, ViewCuration } from "../types";
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
import DrawnFeaturesLayer from "./layers/DrawnFeaturesLayer";
import LabelLayer from "./layers/LabelLayer";
import RoadLayer from "./layers/RoadLayer";
import WaterwayLayer from "./layers/WaterwayLayer";
import CityLayer from "./layers/CityLayer";
import type { Map as LeafletMap, LatLng } from "leaflet";

/** Milliseconds to wait after a click before treating it as a single-click
 *  (rather than the first click of a double-click gesture). */
const CLICK_DEBOUNCE_MS = 220;

interface Props {
  points: PointData[];
  selectedId: string | null;
  onSelectPoint: (id: string | null) => void;
  /** Drawing mode (null = view only) */
  drawingMode?: DrawingMode | null;
  /** Collection of drawn features to render */
  drawnFeatures?: DrawnFeatureCollection;
  /** Called when the user finishes drawing a feature */
  onDrawingComplete?: (type: "point" | "line" | "polygon", latlngs: LatLng[]) => void;
  /** Called when user clicks a drawn feature in select mode */
  onSelectFeature?: (id: string) => void;
  /** Called when user clicks a drawn feature in delete mode */
  onDeleteFeature?: (id: string) => void;
  /** ID of the currently selected drawn feature */
  selectedFeatureId?: string | null;
  /** View curation state (locked view, hidden features) */
  viewCuration?: ViewCuration | null;
  /** Whether the view is currently locked */
  viewLocked?: boolean;
  /** Called when a feature should be hidden */
  onHideFeature?: (id: string) => void;
  /** Ref callback to expose the Leaflet map instance */
  onMapRef?: (map: LeafletMap | null) => void;
}

// ── FlyToSelected ────────────────────────────────────────────
function FlyToSelected({
  point,
  mapRef,
  onMapRef,
}: {
  point: PointData | null;
  mapRef: React.RefObject<LeafletMap | null>;
  onMapRef?: (map: LeafletMap | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (mapRef.current === null) {
      mapRef.current = map;
      onMapRef?.(map);
    }
  }, [map, mapRef, onMapRef]);

  useEffect(() => {
    if (point) {
      map.flyTo([point.lat, point.lng], 13, { duration: 0.8 });
    }
  }, [point, map]);

  return null;
}

// ── DrawingInteraction ───────────────────────────────────────
interface DrawingInteractionProps {
  drawingMode: DrawingMode | null;
  onDrawingComplete: (type: "point" | "line" | "polygon", latlngs: LatLng[]) => void;
  pendingVertices: LatLng[];
  setPendingVertices: React.Dispatch<React.SetStateAction<LatLng[]>>;
}

function DrawingInteraction({
  drawingMode,
  onDrawingComplete,
  pendingVertices,
  setPendingVertices,
}: DrawingInteractionProps) {
  const map = useMap();
  const verticesRef = useRef<LatLng[]>([]);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    verticesRef.current = pendingVertices;
  }, [pendingVertices]);

  // Enable/disable double-click zoom based on drawing mode
  useEffect(() => {
    if (drawingMode === "line" || drawingMode === "polygon") {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      verticesRef.current = [];
      setPendingVertices([]);
    }
  }, [drawingMode, map, setPendingVertices]);

  useMapEvents({
    click(e) {
      if (!drawingMode || drawingMode === "select" || drawingMode === "delete") return;

      if (drawingMode === "point") {
        onDrawingComplete("point", [e.latlng]);
        return;
      }

      // line / polygon: debounce to distinguish single-click from first click of a dblclick
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        // Second click of a dblclick pair — ignore it
        return;
      }
      const latlng = e.latlng;
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        const updated = [...verticesRef.current, latlng];
        verticesRef.current = updated;
        setPendingVertices(updated);
      }, CLICK_DEBOUNCE_MS);
    },
    dblclick() {
      if (drawingMode !== "line" && drawingMode !== "polygon") return;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const verts = verticesRef.current;
      verticesRef.current = [];
      setPendingVertices([]);
      if (drawingMode === "line" && verts.length >= 2) {
        onDrawingComplete("line", verts);
      } else if (drawingMode === "polygon" && verts.length >= 3) {
        onDrawingComplete("polygon", verts);
      }
    },
  });

  return null;
}

// ── DrawingPreview (in-progress drawing) ────────────────────
function DrawingPreview({
  drawingMode,
  pendingVertices,
}: {
  drawingMode: DrawingMode | null;
  pendingVertices: LatLng[];
}) {
  if (pendingVertices.length === 0) return null;

  const positions = pendingVertices.map((v) => [v.lat, v.lng] as [number, number]);

  if (drawingMode === "line" && positions.length >= 2) {
    return (
      <Polyline
        positions={positions}
        pathOptions={{ color: "#ef4444", weight: 2, dashArray: "6,4", opacity: 0.8 }}
        interactive={false}
      />
    );
  }

  if (drawingMode === "polygon" && positions.length >= 2) {
    return (
      <Polygon
        positions={positions}
        pathOptions={{
          color: "#3b82f6",
          weight: 2,
          dashArray: "6,4",
          fillOpacity: 0.1,
          opacity: 0.8,
        }}
        interactive={false}
      />
    );
  }

  // Vertex dots for the first point
  return (
    <>
      {positions.map(([lat, lng], i) => (
        <CircleMarker
          key={i}
          center={[lat, lng]}
          radius={4}
          pathOptions={{ color: "#3b82f6", fillColor: "#fff", fillOpacity: 1, weight: 2 }}
          interactive={false}
        />
      ))}
    </>
  );
}

// ── Main MapView export ──────────────────────────────────────

// ── ViewLockHandler (disables/enables pan & zoom) ────────────
function ViewLockHandler({ locked }: { locked: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (locked) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [locked, map]);
  return null;
}

const EMPTY_DRAWN: DrawnFeatureCollection = { type: "FeatureCollection", features: [] };

export default function MapView({
  points,
  selectedId,
  onSelectPoint,
  drawingMode = null,
  drawnFeatures,
  onDrawingComplete,
  onSelectFeature,
  onDeleteFeature,
  selectedFeatureId = null,
  viewCuration,
  viewLocked = false,
  onHideFeature,
  onMapRef,
}: Props) {
  const { design } = useDesign();
  const tileConfig = getTileConfig(design.tilePreset);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  const [pendingVertices, setPendingVertices] = useState<LatLng[]>([]);

  // ── View curation computed values ──────────────────────────
  const hiddenFeatureIds = useMemo(
    () => new Set(viewCuration?.hiddenFeatureIds ?? []),
    [viewCuration?.hiddenFeatureIds],
  );

  // Bbox string for scoped Overpass queries (only when view is locked)
  const bbox = useMemo(() => {
    if (!viewLocked || !viewCuration?.bounds) return undefined;
    const [[south, west], [north, east]] = viewCuration.bounds;
    return `${south},${west},${north},${east}`;
  }, [viewLocked, viewCuration?.bounds]);

  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedId) ?? null,
    [points, selectedId],
  );

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
    [],
  );

  const cursorClass =
    drawingMode === "point" || drawingMode === "line" || drawingMode === "polygon"
      ? "[&_.leaflet-container]:cursor-crosshair"
      : drawingMode === "delete"
        ? "[&_.leaflet-container]:cursor-pointer"
        : "";

  return (
    <div className={`h-full w-full ${cursorClass}${viewLocked ? " ring-2 ring-inset ring-amber-400/60" : ""}`}>
      <MapContainer
        center={viewCuration?.center ?? MAP_CENTER}
        zoom={viewCuration?.zoom ?? MAP_ZOOM}
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

        <FlyToSelected point={selectedPoint} mapRef={mapRef} onMapRef={onMapRef} />

        {drawingMode && onDrawingComplete && (
          <DrawingInteraction
            drawingMode={drawingMode}
            onDrawingComplete={onDrawingComplete}
            pendingVertices={pendingVertices}
            setPendingVertices={setPendingVertices}
          />
        )}

        <DrawingPreview drawingMode={drawingMode} pendingVertices={pendingVertices} />

        <DrawnFeaturesLayer
          features={drawnFeatures ?? EMPTY_DRAWN}
          drawingMode={drawingMode}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={onSelectFeature ?? (() => {})}
          onDeleteFeature={onDeleteFeature ?? (() => {})}
        />

        <MarkerClusterGroup
          key={design.clusterStyle}
          iconCreateFunction={(cluster: unknown) =>
            createClusterIcon(
              cluster as Parameters<typeof createClusterIcon>[0],
              design.clusterStyle,
              design.pointColorMode === "by-category" ? design.categoryColors : undefined,
            )
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
              icon={createMarkerIcon(
                point.category,
                point.id === selectedId,
                design.markerSize,
                design.pointColorMode === "by-category"
                  ? design.categoryColors[point.category]
                  : design.pointColor,
                point.icon,
              )}
              category={point.category}
              ref={handleMarkerRef(point.id)}
              eventHandlers={{
                click: () => {
                  // Don't select data points while in an active drawing mode (except select)
                  if (!drawingMode || drawingMode === "select") {
                    onSelectPoint(point.id);
                  }
                },
              }}
            >
              <Popup>
                <PointPopup point={point} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* Feature layers */}
        <RoadLayer
          hiddenFeatureIds={hiddenFeatureIds}
          onHideFeature={onHideFeature}
          viewLocked={viewLocked}
          bbox={bbox}
        />
        <WaterwayLayer
          hiddenFeatureIds={hiddenFeatureIds}
          onHideFeature={onHideFeature}
          viewLocked={viewLocked}
          bbox={bbox}
        />
        <CityLayer
          hiddenFeatureIds={hiddenFeatureIds}
          onHideFeature={onHideFeature}
          viewLocked={viewLocked}
        />

        {/* View lock handler */}
        <ViewLockHandler locked={viewLocked} />

        {/* Label overlay — rendered last so it always appears on top */}
        <LabelLayer />
      </MapContainer>
    </div>
  );
}
