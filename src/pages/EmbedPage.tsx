import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getMap, type MapDetail } from "../lib/api";
import { DesignProvider, useDesign } from "../context/DesignContext";
import MapEditorContent from "../components/MapEditorContent";
import { layerDataToPoints } from "../lib/starterData";
import { prefetchTiles } from "../lib/tilePrefetch";
import { getTileConfig, MAP_MAX_BOUNDS } from "../config";
import type { ViewCuration, LayerData, PointData } from "../types";

/**
 * Embed page — renders just the map with no editor chrome.
 * Loaded via /embed/:id
 * Add ?demo=1 to activate auto-rotate category demo mode.
 */

function TilePrefetcher() {
  const { design } = useDesign();
  useEffect(() => {
    const tileConfig = getTileConfig(design.tilePreset);
    const doPrefetch = () => {
      prefetchTiles({
        tileUrl: tileConfig.url,
        labelsUrl: design.showLabels ? tileConfig.labelsUrl : undefined,
        bounds: [MAP_MAX_BOUNDS[0][0], MAP_MAX_BOUNDS[0][1], MAP_MAX_BOUNDS[1][0], MAP_MAX_BOUNDS[1][1]],
        zoomLevels: [6, 7, 8, 9],
        concurrency: 4,
      });
    };
    if ("requestIdleCallback" in window) {
      (window as Window).requestIdleCallback(doPrefetch);
    } else {
      setTimeout(doPrefetch, 2000);
    }
  }, [design.tilePreset, design.showLabels]);
  return null;
}

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

  // Extract points from data_config
  const points = useMemo<PointData[]>(() => {
    if (!mapData?.data_config) return [];
    const raw = mapData.data_config as Record<string, unknown>;
    if (raw.points && typeof raw.points === "object") {
      return layerDataToPoints(raw.points as LayerData);
    }
    return [];
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
      <TilePrefetcher />
      <div className="h-dvh w-dvw">
        <MapEditorContent
          embedMode
          demoMode={demoOverride || !!(mapData.design_state as Record<string, unknown>)?.enableDemoMode}
          points={points}
          viewCuration={viewCuration}
          viewLocked={!!viewCuration}
        />
      </div>
    </DesignProvider>
  );
}
