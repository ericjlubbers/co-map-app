import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getMap, type MapDetail } from "../lib/api";
import { DesignProvider } from "../context/DesignContext";
import MapEditorContent from "../components/MapEditorContent";
import type { ViewCuration } from "../types";

/**
 * Embed page — renders just the map with no editor chrome.
 * Loaded via /embed/:id
 * Add ?demo=1 to activate auto-rotate category demo mode.
 */
export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const demoOverride = searchParams.get("demo") === "1";
  const [mapData, setMapData] = useState<MapDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getMap(id)
      .then(setMapData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load map"));
  }, [id]);

  // Extract viewCuration from data_config
  const viewCuration = useMemo<ViewCuration | null>(() => {
    if (!mapData?.data_config) return null;
    const raw = mapData.data_config as Record<string, unknown>;
    if (raw.viewCuration && typeof raw.viewCuration === "object") {
      return raw.viewCuration as ViewCuration;
    }
    return null;
  }, [mapData]);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-100">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <DesignProvider initialDesignState={mapData.design_state} embedMode>
      <div className="h-dvh w-dvw">
        <MapEditorContent
          embedMode
          demoMode={demoOverride || !!(mapData.design_state as Record<string, unknown>)?.enableDemoMode}
          viewCuration={viewCuration}
          viewLocked={!!viewCuration}
        />
      </div>
    </DesignProvider>
  );
}
