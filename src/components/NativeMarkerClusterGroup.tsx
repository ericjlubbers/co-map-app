import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster.placementstrategies";
import { useMap } from "react-leaflet";
import type { PointData, ClusterStyle, PlacementStrategy } from "../types";
import { createClusterIcon } from "./ClusterIcon";
import { createMarkerIcon } from "./MarkerIcon";
import type { MarkerShape, MarkerConnector, MarkerPadding } from "../types";

interface NativeMarkerClusterGroupProps {
  points: PointData[];
  selectedId: string | null;
  onSelectPoint: (id: string | null) => void;
  drawingMode?: string | null;
  // Cluster options
  clusterStyle: ClusterStyle;
  categoryColors?: Record<string, string>;
  categoryIcons?: Record<string, string>;
  maxClusterRadius: number;
  disableClusteringAtZoom: number;
  animate: boolean;
  spiderfyOnMaxZoom: boolean;
  showCoverageOnHover: boolean;
  zoomToBoundsOnClick: boolean;
  placementStrategy: PlacementStrategy;
  placementReveal: boolean;
  showList: boolean;
  // Marker styling
  markerSize: number;
  pointColor: string;
  pointColorMode: "single" | "by-category";
  markerShape: MarkerShape;
  markerConnector: MarkerConnector;
  markerPadding: MarkerPadding;
  categoryShapes: Record<string, MarkerShape>;
  // Dimming
  activePointIds?: Set<string>;
  dimActive?: boolean;
  dimOpacity?: number;
}

export default function NativeMarkerClusterGroup({
  points,
  selectedId,
  onSelectPoint,
  drawingMode,
  clusterStyle,
  categoryColors,
  categoryIcons,
  maxClusterRadius,
  disableClusteringAtZoom,
  animate,
  spiderfyOnMaxZoom,
  showCoverageOnHover,
  zoomToBoundsOnClick,
  placementStrategy,
  placementReveal,
  showList,
  markerSize,
  pointColor,
  pointColorMode,
  markerShape,
  markerConnector,
  markerPadding,
  categoryShapes,
  activePointIds,
  dimActive,
  dimOpacity,
}: NativeMarkerClusterGroupProps) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const listLoadedRef = useRef(false);

  // Memoize a stable key for the cluster options to know when to rebuild
  const optionsKey = useMemo(
    () =>
      JSON.stringify({
        clusterStyle,
        maxClusterRadius,
        disableClusteringAtZoom,
        animate,
        spiderfyOnMaxZoom,
        showCoverageOnHover,
        zoomToBoundsOnClick,
        placementStrategy,
        placementReveal,
        showList,
      }),
    [
      clusterStyle,
      maxClusterRadius,
      disableClusteringAtZoom,
      animate,
      spiderfyOnMaxZoom,
      showCoverageOnHover,
      zoomToBoundsOnClick,
      placementStrategy,
      placementReveal,
      showList,
    ],
  );

  useEffect(() => {
    if (showList && !listLoadedRef.current) {
      import("leaflet.markercluster.list/dist/leaflet-markercluster-list.src.js");
      listLoadedRef.current = true;
    }
  }, [showList]);

  useEffect(() => {
    const options: L.MarkerClusterGroupOptions & Record<string, unknown> = {
      maxClusterRadius,
      disableClusteringAtZoom,
      animate: placementReveal ? true : animate,
      spiderfyOnMaxZoom,
      showCoverageOnHover,
      zoomToBoundsOnClick,
      chunkedLoading: true,
      spiderfyDistanceMultiplier: 1.5,
      iconCreateFunction: (cluster: L.MarkerCluster) =>
        createClusterIcon(cluster, clusterStyle, categoryColors, categoryIcons),
    };

    // PlacementStrategies options
    if (placementStrategy !== "default") {
      options.elementsPlacementStrategy = placementStrategy;
      options.elementsMultiplier = 1.2;
      options.firstCircleElements = 8;
    }

    // List plugin
    if (showList && listLoadedRef.current) {
      options.sidePanel = { show: "list" };
    }

    const group = L.markerClusterGroup(options);
    groupRef.current = group;

    const markers: L.Marker[] = [];
    for (const point of points) {
      const isDimmed = dimActive && activePointIds != null && !activePointIds.has(point.id);
      const icon = createMarkerIcon(
        point.category,
        point.id === selectedId,
        markerSize,
        pointColorMode === "by-category" ? (categoryColors?.[point.category] ?? pointColor) : pointColor,
        categoryIcons?.[point.category] || point.icon,
        isDimmed,
        dimOpacity,
        categoryShapes[point.category] || markerShape,
        markerConnector,
        markerPadding,
      );

      const marker = L.marker([point.lat, point.lng], {
        icon,
        category: point.category,
        zIndexOffset: isDimmed ? -1000 : 0,
      });

      // Popup with point info
      const popupContent = `<div class="point-popup">
        ${point.imageUrl ? `<img src="${encodeURI(point.imageUrl)}" alt="" style="width:100%;max-height:120px;object-fit:cover;border-radius:4px;margin-bottom:4px" />` : ""}
        <strong>${point.title.replace(/</g, "&lt;")}</strong>
        ${point.category ? `<div style="color:#6b7280;font-size:11px;margin-top:2px">${point.category.replace(/</g, "&lt;")}</div>` : ""}
        ${point.description ? `<div style="margin-top:4px;font-size:12px">${point.description.replace(/</g, "&lt;")}</div>` : ""}
      </div>`;
      marker.bindPopup(popupContent, { maxWidth: 250 });

      marker.on("click", () => {
        if (!drawingMode || drawingMode === "select") {
          onSelectPoint(point.id);
        }
      });

      markers.push(marker);
    }

    group.addLayers(markers);
    map.addLayer(group);

    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    map,
    optionsKey,
    points,
    selectedId,
    categoryColors,
    categoryIcons,
    markerSize,
    pointColor,
    pointColorMode,
    markerShape,
    markerConnector,
    markerPadding,
    categoryShapes,
    activePointIds,
    dimActive,
    dimOpacity,
    drawingMode,
    onSelectPoint,
  ]);

  return null;
}
