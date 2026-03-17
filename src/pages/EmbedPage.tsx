import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMap, type MapDetail } from "../lib/api";
import { DesignProvider } from "../context/DesignContext";
import MapEditorContent from "../components/MapEditorContent";

/**
 * Embed page — renders just the map with no editor chrome.
 * Loaded via /embed/:id
 */
export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [mapData, setMapData] = useState<MapDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getMap(id)
      .then(setMapData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load map"));
  }, [id]);

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
        <MapEditorContent embedMode />
      </div>
    </DesignProvider>
  );
}
