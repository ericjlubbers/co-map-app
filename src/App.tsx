import { useState, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import { useLocationData } from "./hooks/useLocationData";
import { DesignProvider, useDesign } from "./context/DesignContext";
import MapView from "./components/MapView";
import DataTable from "./components/DataTable";
import FilterBar from "./components/FilterBar";
import DesignToolbar from "./components/DesignToolbar";

export default function App() {
  return (
    <DesignProvider>
      <AppContent />
    </DesignProvider>
  );
}

function AppContent() {
  const { design, designMode } = useDesign();
  const { data, loading, error, retry } = useLocationData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  const searchTimerRef = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchTimerRef[0]) clearTimeout(searchTimerRef[0]);
      searchTimerRef[0] = setTimeout(() => setDebouncedSearch(query), 300);
    },
    [searchTimerRef]
  );

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = new Set(data.map((p) => p.category));
    return Array.from(cats).sort();
  }, [data]);

  // Filter points
  const filteredPoints = useMemo(() => {
    let result = data;

    // Category filter
    if (activeCategories.size > 0) {
      result = result.filter((p) => activeCategories.has(p.category));
    }

    // Text search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [data, activeCategories, debouncedSearch]);

  const handleToggleCategory = useCallback((category: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleResetCategories = useCallback(() => {
    setActiveCategories(new Set());
  }, []);

  const handleSelectPoint = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            className="mb-3 text-3xl text-blue-500"
          />
          <p className="text-sm font-medium text-gray-500">
            Loading locations…
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="mb-3 text-3xl text-amber-500"
          />
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

  // ── Main layout ────────────────────────────────────────────
  return (
    <div className="flex h-dvh flex-col" style={{ backgroundColor: design.pageBg }}>
      {designMode && <DesignToolbar />}
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
            />
          </div>

          {/* Table panel */}
          <div
            className="flex min-h-0 flex-col overflow-hidden border-t border-gray-200 lg:border-l lg:border-t-0"
            style={{ backgroundColor: design.panelBg }}
          >
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
          </div>
        </div>
      </div>
    </div>
  );
}
