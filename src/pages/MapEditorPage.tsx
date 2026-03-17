import { useState, useEffect } from "react";
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

export default function MapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mapData, setMapData] = useState<MapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const fetchMap = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMap(id);
      setMapData(data);
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

  const embedUrl = `${window.location.origin}/embed/${id}`;
  const demoEmbedUrl = `${embedUrl}?demo=1`;
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border:0" allowfullscreen></iframe>`;

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
              <FontAwesomeIcon icon={faArrowLeft} />
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
        {showEmbedCode && (
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Embed code (paste into WordPress)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={embedCode}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-mono text-gray-700"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(embedCode)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Demo embed (auto-rotates categories)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`<iframe src="${demoEmbedUrl}" width="100%" height="600" frameborder="0" style="border:0" allowfullscreen></iframe>`}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-mono text-gray-700"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`<iframe src="${demoEmbedUrl}" width="100%" height="600" frameborder="0" style="border:0" allowfullscreen></iframe>`)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map editor content */}
        <div className="min-h-0 flex-1">
          <MapEditorContent />
        </div>
      </div>
    </DesignProvider>
  );
}
