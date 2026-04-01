import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  GeoJSON,
  useMap,
  useMapEvents,
  Polyline,
  Polygon,
  CircleMarker,
  Popup,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import NativeMarkerClusterGroup from "./NativeMarkerClusterGroup";
import "leaflet/dist/leaflet.css";
import type { PointData, DrawingMode, DrawnFeatureCollection, ViewCuration, EditorMode, SelectedElement, PrimaryElement, PublicationBounds } from "../types";
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_MAX_BOUNDS,
  CLUSTER_SETTINGS,
  getTileConfig,
} from "../config";
import { useDesign } from "../context/DesignContext";
import { createMarkerIcon, createDotIcon } from "./MarkerIcon";
import { createClusterIcon } from "./ClusterIcon";
import FloatingPointCard from "./FloatingPointCard";
import { COLORADO_COUNTIES } from "../data/coloradoCounties";
import { COLORADO_BORDER, COLORADO_MASK } from "../data/coloradoBorder";
import DrawnFeaturesLayer from "./layers/DrawnFeaturesLayer";
import LabelLayer from "./layers/LabelLayer";
import RoadLayer from "./layers/RoadLayer";
import WaterwayLayer from "./layers/WaterwayLayer";
import CityLayer from "./layers/CityLayer";
import ParkLayer from "./layers/ParkLayer";
import LakeLayer from "./layers/LakeLayer";
import PrimaryElementsLayer from "./layers/PrimaryElementsLayer";
import BoundsOverlay from "./layers/BoundsOverlay";
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
  /** Current editor mode */
  editorMode?: EditorMode;
  /** Called when an element is selected in customize mode */
  onSelectElement?: (element: SelectedElement | null) => void;
  /** Currently selected element */
  selectedElement?: SelectedElement | null;
  /** Primary elements to render */
  primaryElements?: PrimaryElement[];
  /** Update a primary element */
  onUpdatePrimaryElement?: (elementId: string, updates: Partial<PrimaryElement>) => void;
  /** Publication bounds for crop overlay */
  publicationBounds?: PublicationBounds;
  /** Update publication bounds (corner dragging) */
  onUpdatePublicationBounds?: (bounds: PublicationBounds | undefined) => void;
  /** IDs of points currently highlighted (if empty/undefined, all are active) */
  activePointIds?: Set<string>;
  /** Whether dimming is active */
  dimActive?: boolean;
  /** Opacity for dimmed markers */
  dimOpacity?: number;
  /** Zoom into a specific point at flyToZoom */
  onZoomToPoint?: (point: PointData) => void;
  /** Navigate to next/prev point */
  onNavigatePoint?: (direction: "prev" | "next") => void;
  /** Whether auto-rotate is driving selection changes (choreographed transitions) */
  autoRotateActive?: boolean;
  /** Active category filter (from sidebar-filter layout); triggers dot→marker upgrade */
  activeCategory?: string | null;
  /** Incremented when the container is resized — triggers invalidateSize + zoom reset */
  resizeSignal?: number;
  /** Map ID — passed to FloatingPointCard for embed link generation */
  mapId?: string;
}

// ── FitBoundsHandler ─────────────────────────────────────────
// Watches fitBoundsSignal and fits map to Colorado when it changes.
const CO_BOUNDS: [[number, number], [number, number]] = [[36.993, -109.060], [41.003, -102.042]];

function FitBoundsHandler({ signal }: { signal: number }) {
  const map = useMap();
  const isFirstRef = useRef(true);
  useEffect(() => {
    if (isFirstRef.current) { isFirstRef.current = false; return; }
    map.fitBounds(CO_BOUNDS, { padding: [20, 20], animate: true });
  }, [signal, map]);
  return null;
}

// ── MapResizeHandler ──────────────────────────────────────────
// Watches resizeSignal, invalidates tile layout, and resets zoom.
function MapResizeHandler({ resizeSignal, defaultZoom }: { resizeSignal: number; defaultZoom: number }) {
  const map = useMap();
  const isFirstRef = useRef(true);
  useEffect(() => {
    if (isFirstRef.current) { isFirstRef.current = false; return; }
    map.invalidateSize({ animate: false });
    setTimeout(() => map.setZoom(defaultZoom, { animate: false }), 50);
  }, [resizeSignal, map, defaultZoom]);
  return null;
}

// ── FlyToSelected ────────────────────────────────────────────
function FlyToSelected({
  mapRef,
  onMapRef,
  zoomTarget,
  flyToZoom,
}: {
  mapRef: React.RefObject<LeafletMap | null>;
  onMapRef?: (map: LeafletMap | null) => void;
  zoomTarget: PointData | null;
  flyToZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (mapRef.current === null) {
      mapRef.current = map;
      onMapRef?.(map);
    }
  }, [map, mapRef, onMapRef]);

  // Only zoom when explicitly requested via the "Zoom In" button
  useEffect(() => {
    if (zoomTarget) {
      map.flyTo([zoomTarget.lat, zoomTarget.lng], flyToZoom, { duration: 0.8 });
    }
  }, [zoomTarget, map, flyToZoom]);

  return null;
}

// ── MapClickDeselect ─────────────────────────────────────────
function MapClickDeselect({
  onSelectPoint,
  drawingMode,
}: {
  onSelectPoint: (id: string | null) => void;
  drawingMode: DrawingMode | null;
}) {
  useMapEvents({
    click: () => {
      if (!drawingMode || drawingMode === "select") {
        onSelectPoint(null);
      }
    },
  });
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
  editorMode,
  onSelectElement,
  selectedElement,
  primaryElements = [],
  onUpdatePrimaryElement,
  publicationBounds,
  onUpdatePublicationBounds,
  activePointIds,
  dimActive,
  dimOpacity: dimOpacityProp,
  onZoomToPoint,
  onNavigatePoint,
  autoRotateActive = false,
  activeCategory,
  resizeSignal = 0,
  mapId,
}: Props) {
  const { design } = useDesign();
  const tileConfig = getTileConfig(design.tilePreset);
  const mapRef = useRef<LeafletMap | null>(null);

  const [pendingVertices, setPendingVertices] = useState<LatLng[]>([]);
  // Explicit zoom target — set only via "Zoom In" button
  const [zoomTarget, setZoomTarget] = useState<PointData | null>(null);

  // ── View curation computed values ──────────────────────────
  const hiddenFeatureIds = useMemo(() => {
    const set = new Set(viewCuration?.hiddenFeatureIds ?? []);
    // Auto-hide: primary element source IDs are hidden on base layers
    for (const el of primaryElements) {
      for (const sid of el.sourceIds) set.add(sid);
    }
    return set;
  }, [viewCuration?.hiddenFeatureIds, primaryElements]);

  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedId) ?? null,
    [points, selectedId],
  );

  // Compute navigation index and label
  const selectedIndex = useMemo(
    () => (selectedId ? points.findIndex((p) => p.id === selectedId) : -1),
    [points, selectedId],
  );
  const navLabel = selectedIndex >= 0 ? `${selectedIndex + 1} of ${points.length}` : undefined;

  const handleZoomIn = useCallback(() => {
    if (selectedPoint) setZoomTarget(selectedPoint);
  }, [selectedPoint]);

  const handlePrev = useCallback(() => {
    if (onNavigatePoint) { onNavigatePoint("prev"); return; }
    if (selectedIndex > 0) onSelectPoint(points[selectedIndex - 1].id);
  }, [onNavigatePoint, selectedIndex, points, onSelectPoint]);

  const handleNext = useCallback(() => {
    if (onNavigatePoint) { onNavigatePoint("next"); return; }
    if (selectedIndex >= 0 && selectedIndex < points.length - 1) onSelectPoint(points[selectedIndex + 1].id);
  }, [onNavigatePoint, selectedIndex, points, onSelectPoint]);

  // Clear zoom target when selection changes
  useEffect(() => { setZoomTarget(null); }, [selectedId]);

  // Track pending popup open timer so we can cancel it immediately on click
  const popupOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use a ref for autoRotateActive so the popup effect only re-fires when
  // selectedId actually changes (not when the auto-rotate flag toggles).
  const autoRotateActiveRef = useRef(autoRotateActive);
  autoRotateActiveRef.current = autoRotateActive;

  // ── Floating card orchestration ──────────────────────────────
  // Instead of Leaflet Popups, we render a custom FloatingPointCard
  // overlay. `cardPoint` is the point currently displayed; choreography
  // delays are handled here via the same timer pattern.
  const [cardPoint, setCardPoint] = useState<PointData | null>(null);
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (popupOpenTimerRef.current) {
      clearTimeout(popupOpenTimerRef.current);
      popupOpenTimerRef.current = null;
    }

    const prevId = prevSelectedRef.current;
    prevSelectedRef.current = selectedId;

    if (!selectedId) {
      setCardPoint(null);
      return;
    }

    const point = points.find((p) => p.id === selectedId) ?? null;
    const isAutoRotating = autoRotateActiveRef.current;

    // Choreography: always hide old card first, then show new card
    // so the scale animation replays consistently.
    // When auto-rotating, useAutoRotate already handles fade-out timing before
    // activePointId changes — so we show the new card immediately to sync with marker.
    if (prevId !== null && prevId !== selectedId) {
      setCardPoint(null); // collapse old card
      const delay = isAutoRotating ? 30 : Math.min(design.transitionSpeed, 250);
      popupOpenTimerRef.current = setTimeout(() => {
        popupOpenTimerRef.current = null;
        setCardPoint(point);
      }, delay);
    } else {
      setCardPoint(point);
    }

    return () => {
      if (popupOpenTimerRef.current) {
        clearTimeout(popupOpenTimerRef.current);
        popupOpenTimerRef.current = null;
      }
    };
  // autoRotateActive intentionally read from ref, not in deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, points, design.transitionSpeed]);

  const cursorClass =
    drawingMode === "point" || drawingMode === "line" || drawingMode === "polygon"
      ? "[&_.leaflet-container]:cursor-crosshair"
      : drawingMode === "delete"
        ? "[&_.leaflet-container]:cursor-pointer"
        : "";

  return (
    <div
      className={`relative h-full w-full ${cursorClass}${viewLocked ? " ring-2 ring-inset ring-amber-400/60" : ""}`}
      style={{ "--transition-speed": `${design.transitionSpeed}ms` } as React.CSSProperties}
    >
      {/* Upcoming tooltip opacity */}
      <style>{`.upcoming-popup .leaflet-popup-content-wrapper { opacity: ${design.upcomingTooltipOpacity}; transition: opacity 0.15s; } .upcoming-popup .leaflet-popup-tip { opacity: ${design.upcomingTooltipOpacity}; }`}</style>
      <MapContainer
        center={viewCuration?.center ?? MAP_CENTER}
        zoom={viewCuration?.zoom ?? (design.mapDefaultZoom ?? MAP_ZOOM)}
        minZoom={design.mapMinZoom}
        maxZoom={design.mapMaxZoom}
        maxBounds={MAP_MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={false}
        aria-label="Interactive map of Colorado"
        role="application"
      >
        <TileLayer key={design.tilePreset} url={tileConfig.url} attribution={tileConfig.attribution} maxZoom={tileConfig.maxZoom} keepBuffer={4} updateWhenIdle={false} />
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

        <FlyToSelected
          mapRef={mapRef}
          onMapRef={onMapRef}
          zoomTarget={zoomTarget}
          flyToZoom={design.flyToZoom}
        />
        <FitBoundsHandler signal={design.fitBoundsSignal} />
        <MapResizeHandler resizeSignal={resizeSignal} defaultZoom={design.mapDefaultZoom} />
        <MapClickDeselect onSelectPoint={onSelectPoint} drawingMode={drawingMode ?? null} />

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

        {design.clusterPlugin === "none" ? (
          // No clustering — render markers directly
          <>
            {points.map((point) => {
              const isUpcoming = point.status === "upcoming";
              if (isUpcoming && !design.showUpcoming) return null;
              const isDimmed = !isUpcoming && dimActive && activePointIds != null && !activePointIds.has(point.id);
              const isHighlighted = !isUpcoming && activePointIds != null && activePointIds.has(point.id);
              const isSelected = !isUpcoming && point.id === selectedId;
              // Only the actively selected point upgrades to full marker (autorotate fix)
              const showDot = design.dotMode && !isSelected && !isHighlighted;
              const pointColor = design.pointColorMode === "by-category"
                ? (design.categoryColors[point.category] ?? design.pointColor)
                : design.pointColor;
              return (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={showDot
                    ? createDotIcon(pointColor, design.dotSize, isDimmed, dimOpacityProp, isUpcoming, design.upcomingOpacity)
                    : createMarkerIcon(
                        point.category,
                        isSelected,
                        design.markerSize,
                        pointColor,
                        design.categoryIcons[point.category] || point.icon,
                        isDimmed,
                        dimOpacityProp,
                        design.categoryShapes[point.category] || design.markerShape,
                        design.markerConnector,
                        design.markerPadding,
                        isUpcoming,
                        design.upcomingOpacity,
                      )
                  }
                  zIndexOffset={isSelected ? 1000 : isUpcoming ? -2000 : isDimmed ? -1000 : 0}
                  eventHandlers={{
                    click: () => {
                      if (isUpcoming) return;
                      if (!drawingMode || drawingMode === "select") {
                        onSelectPoint(point.id);
                      }
                    },
                  }}
                >
                  {isUpcoming && (
                    <Popup autoPan={false} closeButton={false} className="upcoming-popup">
                      <span className="text-xs font-medium text-gray-700">{design.upcomingTooltipText}</span>
                    </Popup>
                  )}
                </Marker>
              );
            })}
          </>
        ) : design.clusterPlugin === "leaflet-markercluster" ? (
          <NativeMarkerClusterGroup
            key={`native-${design.clusterStyle}`}
            points={points}
            selectedId={selectedId}
            onSelectPoint={onSelectPoint}
            drawingMode={drawingMode}
            clusterStyle={design.clusterStyle}
            categoryColors={design.pointColorMode === "by-category" ? design.categoryColors : undefined}
            categoryIcons={Object.keys(design.categoryIcons).length > 0 ? design.categoryIcons : undefined}
            maxClusterRadius={design.clusterMaxRadius}
            disableClusteringAtZoom={design.clusterDisableAtZoom}
            animate={design.clusterAnimate}
            spiderfyOnMaxZoom={design.clusterSpiderfyOnMaxZoom}
            showCoverageOnHover={design.clusterShowCoverageOnHover}
            zoomToBoundsOnClick={design.clusterZoomToBoundsOnClick}
            placementStrategy={design.clusterPlacementStrategy}
            placementReveal={design.clusterPlacementReveal}
            showList={design.clusterShowList}
            markerSize={design.markerSize}
            pointColor={design.pointColor}
            pointColorMode={design.pointColorMode}
            markerShape={design.markerShape}
            markerConnector={design.markerConnector}
            markerPadding={design.markerPadding}
            categoryShapes={design.categoryShapes}
            activePointIds={activePointIds}
            dimActive={dimActive}
            dimOpacity={dimOpacityProp}
            dotMode={design.dotMode}
            dotSize={design.dotSize}
          />
        ) : (
        <MarkerClusterGroup
          key={design.clusterStyle}
          iconCreateFunction={(cluster: unknown) =>
            createClusterIcon(
              cluster as Parameters<typeof createClusterIcon>[0],
              design.clusterStyle,
              design.pointColorMode === "by-category" ? design.categoryColors : undefined,
              Object.keys(design.categoryIcons).length > 0 ? design.categoryIcons : undefined,
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
          {points.map((point) => {
            const isUpcoming = point.status === "upcoming";
            if (isUpcoming && !design.showUpcoming) return null;
            const isDimmed = !isUpcoming && dimActive && activePointIds != null && !activePointIds.has(point.id);
            const isHighlighted = !isUpcoming && activePointIds != null && activePointIds.has(point.id);
            const isSelected = !isUpcoming && point.id === selectedId;
            const showDot = design.dotMode && !isSelected && !isHighlighted;
            const ptColor = design.pointColorMode === "by-category"
              ? design.categoryColors[point.category]
              : design.pointColor;
            return (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={showDot
                ? createDotIcon(ptColor, design.dotSize, isDimmed, dimOpacityProp, isUpcoming, design.upcomingOpacity)
                : createMarkerIcon(
                    point.category,
                    isSelected,
                    design.markerSize,
                    ptColor,
                    design.categoryIcons[point.category] || point.icon,
                    isDimmed,
                    dimOpacityProp,
                    design.categoryShapes[point.category] || design.markerShape,
                    design.markerConnector,
                    design.markerPadding,
                    isUpcoming,
                    design.upcomingOpacity,
                  )
              }
              category={point.category}
              zIndexOffset={isSelected ? 1000 : isUpcoming ? -2000 : isDimmed ? -1000 : 0}
              eventHandlers={{
                click: () => {
                  if (isUpcoming) return;
                  if (!drawingMode || drawingMode === "select") {
                    onSelectPoint(point.id);
                  }
                },
              }}
            >
              {isUpcoming && (
                <Popup autoPan={false} closeButton={false} className="upcoming-popup">
                  <span className="text-xs font-medium text-gray-700">{design.upcomingTooltipText}</span>
                </Popup>
              )}
            </Marker>
            );
          })}
        </MarkerClusterGroup>
        )}

        {/* Feature layers */}
        <RoadLayer
          hiddenFeatureIds={hiddenFeatureIds}
          onHideFeature={onHideFeature}
          viewLocked={viewLocked}
          editorMode={editorMode}
          onSelectElement={onSelectElement}
        />
        <WaterwayLayer
          hiddenFeatureIds={hiddenFeatureIds}
          onHideFeature={onHideFeature}
          viewLocked={viewLocked}
          editorMode={editorMode}
          onSelectElement={onSelectElement}
        />
        <ParkLayer
          hiddenFeatureIds={hiddenFeatureIds}
          editorMode={editorMode}
          onSelectElement={onSelectElement}
        />
        <LakeLayer
          hiddenFeatureIds={hiddenFeatureIds}
          editorMode={editorMode}
          onSelectElement={onSelectElement}
        />
        <CityLayer
          hiddenFeatureIds={hiddenFeatureIds}
          onHideFeature={onHideFeature}
          viewLocked={viewLocked}
          editorMode={editorMode}
          onSelectElement={onSelectElement}
          points={points}
        />

        {/* Primary elements + selection overlay (rendered above base layers) */}
        {editorMode === "customize" && onSelectElement && (
          <PrimaryElementsLayer
            primaryElements={primaryElements}
            selectedElement={selectedElement ?? null}
            onSelectElement={onSelectElement}
            onUpdatePrimaryElement={onUpdatePrimaryElement}
          />
        )}

        {/* Publication bounds overlay (rendered in customize mode) */}
        {editorMode === "customize" && publicationBounds && (
          <BoundsOverlay
            publicationBounds={publicationBounds}
            onUpdatePublicationBounds={onUpdatePublicationBounds}
          />
        )}

        {/* View lock handler */}
        <ViewLockHandler locked={viewLocked} />

        {/* Label overlay — rendered last so it always appears on top */}
        <LabelLayer />
      </MapContainer>

      {/* Floating point card overlay — rendered outside Leaflet */}
      {cardPoint && mapRef.current && (
        <FloatingPointCard
          point={cardPoint}
          map={mapRef.current}
          onDismiss={() => onSelectPoint(null)}
          onZoomIn={onZoomToPoint ? () => onZoomToPoint(cardPoint) : handleZoomIn}
          onPrev={selectedIndex > 0 ? handlePrev : undefined}
          onNext={selectedIndex < points.length - 1 ? handleNext : undefined}
          navLabel={navLabel}
          transitionSpeed={design.transitionSpeed}
          preset={design.cardConnectorPreset}
          connectorColor={design.cardConnectorColor}
          connectorWidth={design.cardConnectorWidth}
          connectorDash={design.cardConnectorDash}
          faceColor={design.cardFaceColor}
          faceOpacity={design.cardFaceOpacity}
          cardBorderRadius={design.cardBorderRadius}
          cardBgColor={design.cardBgColor}
          cardShadow={design.cardShadow}
          edgeColor={design.cardEdgeColor}
          edgeWidth={design.cardEdgeWidth}
          edgeOpacity={design.cardEdgeOpacity}
          connectorInset={design.cardConnectorInset}
          mapId={mapId}
        />
      )}
    </div>
  );
}
