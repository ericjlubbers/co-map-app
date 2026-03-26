import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDesign } from "../context/DesignContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import MapView from "./MapView";
import DataTable from "./DataTable";
import FilterBar from "./FilterBar";
import DesignSidebar from "./DesignSidebar";
import CustomizeSidebar from "./CustomizeSidebar";
import AutoRotateDemo from "./AutoRotateDemo";
import DrawingToolbar from "./DrawingToolbar";
import DrawnFeatureForm from "./DrawnFeatureForm";
import DrawnFeaturesTable from "./DrawnFeaturesTable";
import PreviewModal from "./PreviewModal";
import SidebarFilterLayout from "./SidebarFilterLayout";
import {
  emptyCollection,
  createPointFeature,
  createLineFeature,
  createPolygonFeature,
  addFeature,
  updateFeature,
  deleteFeature,
  defaultProps,
} from "../lib/drawing";
import type {
  DrawingMode,
  DrawnFeatureCollection,
  DrawnFeatureProperties,
  EditorMode,
  PointData,
  ViewCuration,
  SelectedElement,
  PrimaryElement,
  PublicationBounds,
} from "../types";
import type { StarterType } from "../lib/starterData";
import type { LatLng } from "leaflet";

interface MapEditorContentProps {
  embedMode?: boolean;
  /** Activates auto-rotate demo mode (embed `?demo=1`) */
  demoMode?: boolean;
  mapId?: string;
  /** Points derived from dataConfig.points (persisted) */
  points?: PointData[];
  onLoadStarter?: (type: StarterType) => void;
  onClearPoints?: () => void;
  initialDrawnFeatures?: DrawnFeatureCollection;
  onDrawnFeaturesChange?: (features: DrawnFeatureCollection) => void;
  /** View curation state */
  viewCuration?: ViewCuration | null;
  /** Whether the view is currently locked */
  viewLocked?: boolean;
  /** Called when a feature should be hidden */
  onHideFeature?: (id: string) => void;
  /** Ref callback to expose the Leaflet map instance */
  onMapRef?: (map: import("leaflet").Map | null) => void;
  /** Current editor mode */
  editorMode?: EditorMode;
  /** Primary elements array */
  primaryElements?: PrimaryElement[];
  /** Add a primary element */
  onAddPrimaryElement?: (element: PrimaryElement) => void;
  /** Remove a primary element */
  onRemovePrimaryElement?: (elementId: string) => void;
  /** Update a primary element (style overrides, label position, etc.) */
  onUpdatePrimaryElement?: (elementId: string, updates: Partial<PrimaryElement>) => void;
  /** Publication bounds for crop rectangle */
  publicationBounds?: PublicationBounds;
  /** Update publication bounds */
  onUpdatePublicationBounds?: (bounds: PublicationBounds | undefined) => void;
  /** Capture current view as desktop or mobile bounds */
  onSetBoundsFromView?: (target: "desktop" | "mobile") => void;
}

type DataTab = "points" | "drawn";

export default function MapEditorContent({
  embedMode = false,
  demoMode = false,
  points: externalPoints,
  onLoadStarter,
  onClearPoints,
  initialDrawnFeatures,
  onDrawnFeaturesChange,
  viewCuration,
  viewLocked = false,
  onHideFeature,
  onMapRef,
  editorMode = "settings",
  primaryElements = [],
  onAddPrimaryElement,
  onRemovePrimaryElement,
  onUpdatePrimaryElement,
  publicationBounds,
  onUpdatePublicationBounds,
  onSetBoundsFromView,
}: MapEditorContentProps) {
  const { design, designMode } = useDesign();
  const data = externalPoints ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(designMode);

  // ── Local map ref for flyTo ────────────────────────────────
  const localMapRef = useRef<import("leaflet").Map | null>(null);
  const handleMapRefLocal = useCallback(
    (map: import("leaflet").Map | null) => {
      localMapRef.current = map;
      onMapRef?.(map);
    },
    [onMapRef],
  );

  const handleFlyTo = useCallback((lat: number, lng: number, zoom?: number) => {
    localMapRef.current?.flyTo([lat, lng], zoom ?? design.flyToZoom, { duration: 0.8 });
  }, [design.flyToZoom]);

  // ── Selection state for customize mode ─────────────────────
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  const handleSelectElement = useCallback((element: SelectedElement | null) => {
    setSelectedElement(element);
  }, []);

  /** Add an arbitrary element directly as primary (used by quicksearch) */
  const handleQuickAddPrimary = useCallback(
    (element: SelectedElement) => {
      if (!onAddPrimaryElement) return;
      const id = `primary-${element.sourceType}-${element.sourceIds.join("+")}`;
      if (primaryElements.some((el) => el.id === id)) return;
      const pe: PrimaryElement = {
        id,
        sourceType: element.sourceType,
        sourceIds: element.sourceIds,
        name: element.name,
        geometry: element.geometry,
        properties: element.properties,
      };
      onAddPrimaryElement(pe);
    },
    [onAddPrimaryElement, primaryElements],
  );

  const handleAddToPrimary = useCallback(() => {
    if (!selectedElement || !onAddPrimaryElement) return;
    const id = `primary-${selectedElement.sourceType}-${selectedElement.sourceIds.join("+")}`;
    // Don't add if already exists
    if (primaryElements.some((el) => el.id === id)) return;
    const pe: PrimaryElement = {
      id,
      sourceType: selectedElement.sourceType,
      sourceIds: selectedElement.sourceIds,
      name: selectedElement.name,
      geometry: selectedElement.geometry,
      properties: selectedElement.properties,
    };
    onAddPrimaryElement(pe);
    setSelectedElement(null);
  }, [selectedElement, onAddPrimaryElement, primaryElements]);

  const handleRemoveFromPrimary = useCallback(
    (elementId: string) => {
      onRemovePrimaryElement?.(elementId);
      setSelectedElement(null);
    },
    [onRemovePrimaryElement],
  );

  // Clear selection when leaving customize mode
  useEffect(() => {
    if (editorMode !== "customize") setSelectedElement(null);
  }, [editorMode]);

  useEffect(() => {
    setSidebarOpen(designMode);
  }, [designMode]);

  // ── Filtering ──────────────────────────────────────────────
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  // Demo mode: current spotlighted category (null = show all)
  const [demoCategoryFilter, setDemoCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => setDebouncedSearch(query), 300);
    },
    [],
  );

  const categories = useMemo(() => {
    const cats = new Set(data.map((p) => p.category));
    return Array.from(cats).sort();
  }, [data]);

  // ── Preview modal (isolated embed preview) ────────────────
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const filteredPoints = useMemo(() => {
    let result = data;

    // Demo mode overrides manual category filter
    if (demoMode && demoCategoryFilter !== null) {
      return result.filter((p) => p.category === demoCategoryFilter);
    }

    // Category filter
    if (activeCategories.size > 0) {
      result = result.filter((p) => activeCategories.has(p.category));
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [data, activeCategories, debouncedSearch, demoMode, demoCategoryFilter]);

  const handleToggleCategory = useCallback((category: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const handleResetCategories = useCallback(() => setActiveCategories(new Set()), []);
  const handleSelectPoint = useCallback((id: string | null) => setSelectedId(id), []);

  // ── Drawing state ──────────────────────────────────────────
  const [drawingMode, setDrawingMode] = useState<DrawingMode | null>(null);
  const [drawnFeatures, setDrawnFeatures] = useState<DrawnFeatureCollection>(
    initialDrawnFeatures ?? emptyCollection(),
  );
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [dataTab, setDataTab] = useState<DataTab>("points");

  // Feature form state
  interface PendingFeature {
    type: "point" | "line" | "polygon";
    latlngs: LatLng[];
    props: DrawnFeatureProperties;
  }
  const [pendingFeature, setPendingFeature] = useState<PendingFeature | null>(null);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);

  // Sync if parent provides new initial features
  useEffect(() => {
    if (initialDrawnFeatures) {
      setDrawnFeatures(initialDrawnFeatures);
    }
  }, [initialDrawnFeatures]);

  // Notify parent when features change (for persistence)
  const updateFeatures = useCallback(
    (updated: DrawnFeatureCollection) => {
      setDrawnFeatures(updated);
      onDrawnFeaturesChange?.(updated);
    },
    [onDrawnFeaturesChange],
  );

  // Called when MapView finishes a drawing gesture
  const handleDrawingComplete = useCallback(
    (type: "point" | "line" | "polygon", latlngs: LatLng[]) => {
      // Prepare default props and show the form
      const props = defaultProps(type);
      setPendingFeature({ type, latlngs, props });
      // Switch to drawn tab so user sees the result
      setDataTab("drawn");
    },
    [],
  );

  // User saves the form for a new feature
  const handleFormSave = useCallback(
    (updates: Partial<DrawnFeatureProperties>) => {
      if (!pendingFeature) return;
      const { type, latlngs, props } = pendingFeature;
      const merged = { ...props, ...updates };

      let feature;
      if (type === "point") {
        feature = createPointFeature(latlngs[0].lat, latlngs[0].lng, merged);
      } else if (type === "line") {
        const pairs = latlngs.map((ll) => [ll.lat, ll.lng] as [number, number]);
        feature = createLineFeature(pairs, merged);
      } else {
        const pairs = latlngs.map((ll) => [ll.lat, ll.lng] as [number, number]);
        feature = createPolygonFeature(pairs, merged);
      }

      updateFeatures(addFeature(drawnFeatures, feature));
      setSelectedFeatureId(merged.id);
      setPendingFeature(null);
    },
    [pendingFeature, drawnFeatures, updateFeatures],
  );

  // User saves the edit form for an existing feature
  const handleEditSave = useCallback(
    (updates: Partial<DrawnFeatureProperties>) => {
      if (!editingFeatureId) return;
      updateFeatures(updateFeature(drawnFeatures, editingFeatureId, updates));
      setEditingFeatureId(null);
    },
    [editingFeatureId, drawnFeatures, updateFeatures],
  );

  const handleDeleteFeature = useCallback(
    (id: string) => {
      updateFeatures(deleteFeature(drawnFeatures, id));
      if (selectedFeatureId === id) setSelectedFeatureId(null);
    },
    [drawnFeatures, selectedFeatureId, updateFeatures],
  );

  const handleSelectFeature = useCallback((id: string) => {
    setSelectedFeatureId(id);
    setDataTab("drawn");
  }, []);

  const handleEditFeature = useCallback((id: string) => {
    setEditingFeatureId(id);
  }, []);

  // Find props for the feature being edited
  const editingFeature = useMemo(
    () => drawnFeatures.features.find((f) => f.properties.id === editingFeatureId) ?? null,
    [drawnFeatures, editingFeatureId],
  );

  // ── Embed mode: map only ──
  if (embedMode) {
    // Sidebar-filter template: category sidebar + map + table
    if (design.embedLayout === "sidebar-filter") {
      return (
        <SidebarFilterLayout
          points={data}
          demoMode={demoMode}
          viewCuration={viewCuration}
          viewLocked={viewLocked}
        />
      );
    }

    // Standard embed template: map only + optional auto-rotate overlay
    return (
      <div className="relative h-full w-full" style={{ backgroundColor: design.pageBg }}>
        <MapView
          points={filteredPoints}
          selectedId={selectedId}
          onSelectPoint={handleSelectPoint}
          drawnFeatures={drawnFeatures}
          viewCuration={viewCuration}
          viewLocked={viewLocked}
          onHideFeature={onHideFeature}
          onMapRef={handleMapRefLocal}
        />
        {demoMode && categories.length > 0 && (
          <AutoRotateDemo
            categories={categories}
            points={data}
            intervalMs={design.demoIntervalMs}
            onCategoryChange={setDemoCategoryFilter}
            onPointChange={handleSelectPoint}
          />
        )}
      </div>
    );
  }

  // ── Full editor layout ──
  return (
    <div className="flex h-full" style={{ backgroundColor: design.pageBg }}>
      <div className="flex min-w-0 flex-1 flex-col">
        {!embedMode && (
          <div className="absolute right-3 top-14 z-[1000] flex gap-1.5">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Preview embed"
            >
              <FontAwesomeIcon icon={faEye} className="mr-1.5" />
              Preview
            </button>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Open design panel (⌘⇧D)"
              >
                <FontAwesomeIcon icon={faGear} className="mr-1.5" />
                Design
              </button>
            )}
          </div>
        )}
        <div
          className={`${design.showBorder ? "co150" : ""} min-h-0 flex-1`}
          style={{
            ...(design.embedMargin > 0
              ? { margin: `${design.embedMargin}px` }
              : {}),
            ...(design.showCustomBorder && !design.showBorder
              ? {
                  border: `${design.customBorderWidth}px ${design.customBorderStyle} ${design.customBorderColor}`,
                }
              : {}),
            ...(design.embedPadding > 0
              ? { padding: `${design.embedPadding}px`, backgroundColor: design.pageBg }
              : {}),
          }}
        >
          {design.embedLayout === "sidebar-filter" ? (
            <SidebarFilterLayout
              points={data}
              viewCuration={viewCuration}
              viewLocked={viewLocked}
              fillContainer
            />
          ) : (
          <div
            className="design-grid grid h-full"
            style={{
              "--design-map-h": design.mobileMapHeight,
              "--design-cols": design.showDataPanel ? design.mapTableRatio : "1fr",
            } as React.CSSProperties}
          >
            {/* Map panel */}
            <div className="relative min-h-0">
              <MapView
                points={filteredPoints}
                selectedId={selectedId}
                onSelectPoint={handleSelectPoint}
                drawingMode={drawingMode}
                drawnFeatures={drawnFeatures}
                onDrawingComplete={handleDrawingComplete}
                onSelectFeature={handleSelectFeature}
                onDeleteFeature={handleDeleteFeature}
                selectedFeatureId={selectedFeatureId}
                viewCuration={viewCuration}
                viewLocked={viewLocked}
                onHideFeature={onHideFeature}
                onMapRef={handleMapRefLocal}
                editorMode={editorMode}
                onSelectElement={handleSelectElement}
                selectedElement={selectedElement}
                primaryElements={primaryElements}
                onUpdatePrimaryElement={onUpdatePrimaryElement}
                publicationBounds={publicationBounds}
                onUpdatePublicationBounds={onUpdatePublicationBounds}

              />

              {/* Drawing toolbar overlay */}
              <DrawingToolbar
                activeMode={drawingMode}
                onModeChange={setDrawingMode}
              />

              {/* Feature creation form overlay */}
              {pendingFeature && (
                <DrawnFeatureForm
                  mode="create"
                  featureType={pendingFeature.type}
                  initial={pendingFeature.props}
                  onSave={handleFormSave}
                  onCancel={() => setPendingFeature(null)}
                />
              )}

              {/* Feature edit form overlay */}
              {editingFeature && (
                <DrawnFeatureForm
                  mode="edit"
                  featureType={editingFeature.properties.featureType}
                  initial={editingFeature.properties}
                  onSave={handleEditSave}
                  onCancel={() => setEditingFeatureId(null)}
                />
              )}
            </div>

            {/* Table panel */}
            {design.showDataPanel && (
            <div
              className="flex min-h-0 flex-col overflow-hidden border-t border-gray-200 lg:border-l lg:border-t-0"
              style={{ backgroundColor: design.panelBg }}
            >
              {/* Tab bar */}
              <div className="flex border-b border-gray-200 px-4">
                <button
                  onClick={() => setDataTab("points")}
                  className={`mr-1 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors
                    ${dataTab === "points"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Points
                </button>
                <button
                  onClick={() => setDataTab("drawn")}
                  className={`relative border-b-2 px-3 py-2.5 text-xs font-medium transition-colors
                    ${dataTab === "drawn"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Drawn
                  {drawnFeatures.features.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                      {drawnFeatures.features.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab content */}
              {dataTab === "points" ? (
                <>
                  <FilterBar
                    categories={categories}
                    activeCategories={activeCategories}
                    onToggleCategory={handleToggleCategory}
                    onResetCategories={handleResetCategories}
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    resultCount={filteredPoints.length}
                    totalCount={data.length}
                    pointColor={design.pointColor}
                    pointColorMode={design.pointColorMode}
                    categoryColors={design.categoryColors}
                  />
                  {data.length > 0 && onClearPoints && (
                    <div className="flex justify-end px-3 pb-1">
                      <button
                        onClick={onClearPoints}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Clear Point Data
                      </button>
                    </div>
                  )}
                  <div className="min-h-0 flex-1">
                    {data.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                        <p className="text-sm text-gray-500">No point data loaded yet.</p>
                        {onLoadStarter && (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-gray-400">Load starter data:</p>
                            <button
                              onClick={() => onLoadStarter("single-point")}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Single Point
                            </button>
                            <button
                              onClick={() => onLoadStarter("categorized-points")}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Multiple Points with Categories
                            </button>
                            <button
                              onClick={() => onLoadStarter("color-coded-regions")}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Color-coded Regions
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <DataTable
                        points={filteredPoints}
                        selectedId={selectedId}
                        onSelectPoint={handleSelectPoint}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="min-h-0 flex-1">
                  <DrawnFeaturesTable
                    features={drawnFeatures}
                    selectedFeatureId={selectedFeatureId}
                    onSelectFeature={handleSelectFeature}
                    onEditFeature={handleEditFeature}
                    onDeleteFeature={handleDeleteFeature}
                  />
                </div>
              )}
            </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Sidebar — switches based on editor mode */}
      {!embedMode && sidebarOpen && (
        editorMode === "customize" ? (
          <CustomizeSidebar
            onClose={() => setSidebarOpen(false)}
            selectedElement={selectedElement}
            primaryElements={primaryElements}
            onAddToPrimary={handleAddToPrimary}
            onRemoveFromPrimary={handleRemoveFromPrimary}
            onSelectElement={handleSelectElement}
            onUpdatePrimaryElement={onUpdatePrimaryElement}
            publicationBounds={publicationBounds}
            onSetBoundsFromView={onSetBoundsFromView}
            onUpdatePublicationBounds={onUpdatePublicationBounds}
            onFlyTo={handleFlyTo}
            onQuickAddPrimary={handleQuickAddPrimary}
          />
        ) : (
          <DesignSidebar
            onClose={() => setSidebarOpen(false)}
            categories={categories}
          />
        )
      )}
      {/* Preview modal — isolated embed view with demo mode */}
      {showPreviewModal && (
        <PreviewModal
          points={data}
          viewCuration={viewCuration}
          viewLocked={!!viewCuration}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
}
