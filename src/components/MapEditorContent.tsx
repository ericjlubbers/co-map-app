import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDesign } from "../context/DesignContext";
import { useLocationData } from "../hooks/useLocationData";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faRotateRight,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import MapView from "./MapView";
import DataTable from "./DataTable";
import FilterBar from "./FilterBar";
import DesignSidebar from "./DesignSidebar";
import DrawingToolbar from "./DrawingToolbar";
import DrawnFeatureForm from "./DrawnFeatureForm";
import DrawnFeaturesTable from "./DrawnFeaturesTable";
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
} from "../types";
import type { LatLng } from "leaflet";

interface MapEditorContentProps {
  embedMode?: boolean;
  mapId?: string;
  initialDrawnFeatures?: DrawnFeatureCollection;
  onDrawnFeaturesChange?: (features: DrawnFeatureCollection) => void;
}

type DataTab = "points" | "drawn";

export default function MapEditorContent({
  embedMode = false,
  initialDrawnFeatures,
  onDrawnFeaturesChange,
}: MapEditorContentProps) {
  const { design, designMode } = useDesign();
  const { data, loading, error, retry } = useLocationData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(designMode);

  useEffect(() => {
    setSidebarOpen(designMode);
  }, [designMode]);

  // ── Filtering ──────────────────────────────────────────────
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
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

  const filteredPoints = useMemo(() => {
    let result = data;
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
  }, [data, activeCategories, debouncedSearch]);

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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="mb-3 text-3xl text-blue-500" />
          <p className="text-sm font-medium text-gray-500">Loading locations…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mb-3 text-3xl text-amber-500" />
          <p className="mb-3 text-sm font-medium text-gray-700">{error}</p>
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faRotateRight} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Embed mode: map only ──
  if (embedMode) {
    return (
      <div className="h-full w-full" style={{ backgroundColor: design.pageBg }}>
        <MapView
          points={filteredPoints}
          selectedId={selectedId}
          onSelectPoint={handleSelectPoint}
          drawnFeatures={drawnFeatures}
        />
      </div>
    );
  }

  // ── Full editor layout ──
  return (
    <div className="flex h-full" style={{ backgroundColor: design.pageBg }}>
      <div className="flex min-w-0 flex-1 flex-col">
        {!embedMode && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-3 top-14 z-[1000] rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Open design panel (⌘⇧D)"
          >
            <FontAwesomeIcon icon={faGear} className="mr-1.5" />
            Design
          </button>
        )}
        <div className={`${design.showBorder ? "co150" : ""} min-h-0 flex-1`}>
          <div
            className="design-grid grid h-full"
            style={{
              "--design-map-h": design.mobileMapHeight,
              "--design-cols": design.mapTableRatio,
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
                  />
                  <div className="min-h-0 flex-1">
                    <DataTable
                      points={filteredPoints}
                      selectedId={selectedId}
                      onSelectPoint={handleSelectPoint}
                    />
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
          </div>
        </div>
      </div>

      {/* Design sidebar */}
      {!embedMode && sidebarOpen && (
        <DesignSidebar onClose={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
