import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faRotateRight,
  faArrowLeft,
  faCode,
  faGlobe,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { getMap, updateMap, publishMap, type MapDetail } from "../lib/api";
import { DesignProvider } from "../context/DesignContext";
import MapEditorContent from "../components/MapEditorContent";
import EmbedCodeBanner from "../components/EmbedCodeBanner";
import DataTabBar from "../components/DataTabBar";
import DataEditor from "../components/DataEditor";
import DataSidebar from "../components/DataSidebar";
import { emptyCollection } from "../lib/drawing";
import {
  layerDataToPoints,
  defaultCountyRegions,
  singlePointStarter,
  categorizedPointsStarter,
  colorCodedRegionsStarter,
  type StarterType,
} from "../lib/starterData";
import type {
  DrawnFeatureCollection,
  EditorTab,
  DataLayerTab,
  DataConfig,
  LayerData,
  ColumnMappings,
  DataRow,
} from "../types";
import sunIcon from "../assets/colorado-sun-icon.svg";

/** Debounce delay (ms) before persisting changes to the API. */
const AUTOSAVE_DEBOUNCE_MS = 1000;

// ── Default empty layer ──────────────────────────────────────

function emptyLayer(): LayerData {
  return { columns: [], rows: [], columnMappings: {} };
}

function parseDataConfig(raw: Record<string, unknown>): DataConfig {
  const regions = (raw?.regions as LayerData | undefined);
  const points = (raw?.points as LayerData | undefined);
  return {
    // Pre-populate regions with county data when empty
    regions: (regions && regions.rows.length > 0) ? regions : defaultCountyRegions(),
    points: points ?? emptyLayer(),
  };
}

export default function MapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mapData, setMapData] = useState<MapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const drawSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tab state ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<EditorTab>("preview");
  const [activeLayer, setActiveLayer] = useState<DataLayerTab>("points");

  // ── Data config (local copy — saved on changes) ───────────
  const [dataConfig, setDataConfig] = useState<DataConfig>({
    regions: emptyLayer(),
    points: emptyLayer(),
  });

  const fetchMap = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMap(id);
      setMapData(data);
      setDataConfig(parseDataConfig(data.data_config ?? {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load map");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (designState: Record<string, unknown>) => {
    if (!id) return;
    await updateMap(id, { design_state: designState });
  };

  const handlePublish = async () => {
    if (!id || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await publishMap(id);
      setMapData((prev) => prev ? { ...prev, status: 'published' } : prev);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  // ── Persist data_config after each change (debounced) ──────
  const saveDataConfig = useCallback(
    (config: DataConfig) => {
      if (!id) return;
      if (dataSaveTimerRef.current) clearTimeout(dataSaveTimerRef.current);
      dataSaveTimerRef.current = setTimeout(async () => {
        try {
          const data_config = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
          await updateMap(id, { data_config });
        } catch {
          // non-fatal — user can retry
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [id],
  );

  // ── Layer-level updaters ──────────────────────────────────

  const updateLayer = useCallback(
    (layer: DataLayerTab, updater: (prev: LayerData) => LayerData) => {
      setDataConfig((prev) => {
        const next: DataConfig = { ...prev, [layer]: updater(prev[layer]) };
        saveDataConfig(next);
        return next;
      });
    },
    [saveDataConfig],
  );

  const handleColumnsChange = useCallback(
    (cols: string[]) => updateLayer(activeLayer, (l) => ({ ...l, columns: cols })),
    [activeLayer, updateLayer],
  );

  const handleRowsChange = useCallback(
    (rows: DataRow[]) => updateLayer(activeLayer, (l) => ({ ...l, rows })),
    [activeLayer, updateLayer],
  );

  const handleMappingsChange = useCallback(
    (mappings: ColumnMappings) =>
      updateLayer(activeLayer, (l) => ({ ...l, columnMappings: mappings })),
    [activeLayer, updateLayer],
  );

  const handleSheetLoaded = useCallback(
    (data: Pick<LayerData, "columns" | "rows" | "googleSheetsUrl" | "lastSynced">) =>
      updateLayer(activeLayer, (l) => ({ ...l, ...data })),
    [activeLayer, updateLayer],
  );

  // ── Derive map points from dataConfig.points ──────────────
  const mapPoints = useMemo(
    () => layerDataToPoints(dataConfig.points),
    [dataConfig.points],
  );

  // ── Starter data loading ──────────────────────────────────
  const handleLoadStarter = useCallback(
    (type: StarterType) => {
      setDataConfig((prev) => {
        let next: DataConfig;
        if (type === "single-point") {
          next = { ...prev, points: singlePointStarter() };
        } else if (type === "categorized-points") {
          next = { ...prev, points: categorizedPointsStarter() };
        } else {
          // color-coded-regions: populate regions with sample values
          next = { ...prev, regions: colorCodedRegionsStarter() };
        }
        saveDataConfig(next);
        return next;
      });
    },
    [saveDataConfig],
  );

  const handleClearPoints = useCallback(() => {
    updateLayer("points", () => emptyLayer());
  }, [updateLayer]);

  // ── Debounced save for drawn features ──────────────────────
  const handleDrawnFeaturesChange = useCallback(
    (features: DrawnFeatureCollection) => {
      if (!id) return;
      if (drawSaveTimerRef.current) clearTimeout(drawSaveTimerRef.current);
      drawSaveTimerRef.current = setTimeout(async () => {
        try {
          await updateMap(id, {
            data_config: { drawnFeatures: features },
          });
        } catch {
          // Non-blocking — persistence failure is silent
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [id],
  );

  // Parse drawn features from the loaded data_config
  const initialDrawnFeatures = useMemo<DrawnFeatureCollection>(() => {
    if (!mapData?.data_config) return emptyCollection();
    const raw = mapData.data_config as Record<string, unknown>;
    if (raw.drawnFeatures && typeof raw.drawnFeatures === "object") {
      return raw.drawnFeatures as DrawnFeatureCollection;
    }
    return emptyCollection();
  }, [mapData]);

  const embedUrl = `${window.location.origin}/embed/${id}`;

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-blue-500" />
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mb-3 text-3xl text-amber-500" />
          <p className="mb-3 text-sm font-medium text-gray-700">{error ?? "Map not found"}</p>
          <button
            onClick={fetchMap}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faRotateRight} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DesignProvider
      initialDesignState={mapData.design_state}
      onSave={handleSave}
    >
      <div className="flex h-dvh flex-col">
        {/* Editor toolbar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <img src={sunIcon} alt="" className="h-5 w-5" />
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
              Maps
            </button>
            <span className="text-sm font-medium text-gray-900">{mapData.title}</span>
            {/* Live badge */}
            {mapData.status === "published" && (
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Publish button */}
            {mapData.status !== "published" ? (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {publishing ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faGlobe} />
                )}
                Publish
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-emerald-700">
                <FontAwesomeIcon icon={faCheck} />
                Published
              </span>
            )}
            {publishError && (
              <span className="text-xs text-red-500">{publishError}</span>
            )}
            <button
              onClick={() => setShowEmbedCode(!showEmbedCode)}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <FontAwesomeIcon icon={faCode} />
              Embed
            </button>
          </div>
        </header>

        {/* Embed code banner */}
        {showEmbedCode && id && <EmbedCodeBanner mapId={id} />}

        {/* Tab bar: Preview | Data */}
        <DataTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
        />

        {/* Main content — switches between Preview and Data tab */}
        <div className="min-h-0 flex-1">
          {activeTab === "preview" ? (
            <MapEditorContent
              mapId={id}
              points={mapPoints}
              onLoadStarter={handleLoadStarter}
              onClearPoints={handleClearPoints}
              initialDrawnFeatures={initialDrawnFeatures}
              onDrawnFeaturesChange={handleDrawnFeaturesChange}
            />
          ) : (
            /* Data tab: editor + sidebar side-by-side */
            <div className="flex h-full">
              <div className="min-w-0 flex-1 overflow-hidden">
                <DataEditor
                  columns={dataConfig[activeLayer].columns}
                  rows={dataConfig[activeLayer].rows}
                  columnMappings={dataConfig[activeLayer].columnMappings}
                  onColumnsChange={handleColumnsChange}
                  onRowsChange={handleRowsChange}
                />
              </div>
              <DataSidebar
                layerData={dataConfig[activeLayer]}
                onUpdateMappings={handleMappingsChange}
                onSheetLoaded={handleSheetLoaded}
              />
            </div>
          )}
        </div>
      </div>
    </DesignProvider>
  );
}
