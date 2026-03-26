import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faDesktop, faMobileScreenButton } from "@fortawesome/free-solid-svg-icons";
import { useDesign } from "../context/DesignContext";
import MapView from "./MapView";
import SidebarFilterLayout from "./SidebarFilterLayout";
import AutoRotateDemo from "./AutoRotateDemo";
import type { PointData, ViewCuration } from "../types";
import { useState, useCallback, useMemo } from "react";

/** Parse "16:9" → { w: 16, h: 9 } */
function parseRatio(ratio: string): { w: number; h: number } {
  const [w, h] = ratio.split(":").map(Number);
  return { w: w || 16, h: h || 9 };
}

interface PreviewModalProps {
  points: PointData[];
  viewCuration?: ViewCuration | null;
  viewLocked?: boolean;
  onClose: () => void;
}

/**
 * Full-screen modal overlay that renders the map in its actual embed layout,
 * completely isolated from the editor state. Uses a `key` on the embed
 * container so toggling desktop ↔ mobile fully remounts everything with
 * fresh state. A brief loading stage prevents the opening click from
 * pausing auto-rotate.
 */
export default function PreviewModal({
  points,
  viewCuration,
  viewLocked = false,
  onClose,
}: PreviewModalProps) {
  const { design } = useDesign();
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  // Loading gate: wait one frame so the click that opened the modal
  // doesn't bubble into the auto-rotate interaction listeners.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Compute container dimensions from aspect ratio settings
  const ratio = parseRatio(
    viewport === "desktop" ? design.embedAspectRatio : design.embedMobileAspectRatio,
  );
  const isDesktop = viewport === "desktop";

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between bg-gray-900/90 px-4 py-2">
        <span className="text-xs font-medium text-white/80">
          Embed Preview
        </span>

        {/* Viewport toggle */}
        <div className="flex items-center gap-1 rounded-md bg-white/10 p-0.5">
          <button
            onClick={() => setViewport("desktop")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              isDesktop ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"
            }`}
            title={`Desktop (${design.embedAspectRatio})`}
          >
            <FontAwesomeIcon icon={faDesktop} />
            Desktop
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              !isDesktop ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"
            }`}
            title={`Mobile (${design.embedMobileAspectRatio})`}
          >
            <FontAwesomeIcon icon={faMobileScreenButton} />
            Mobile
          </button>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
        >
          <FontAwesomeIcon icon={faTimes} />
          Close <span className="text-white/40 ml-1">Esc</span>
        </button>
      </div>

      {/* Embed container — keyed by viewport so desktop↔mobile fully remounts */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          key={viewport}
          className="relative overflow-hidden rounded-lg shadow-2xl transition-all duration-300"
          style={{
            width: isDesktop ? "min(90vw, 1200px)" : "min(50vw, 400px)",
            aspectRatio: `${ratio.w} / ${ratio.h}`,
            maxHeight: "80vh",
            backgroundColor: design.pageBg,
            ...(design.showBorder ? {} : design.showCustomBorder ? {
              border: `${design.customBorderWidth}px ${design.customBorderStyle} ${design.customBorderColor}`,
            } : {}),
          }}
        >
          {ready ? (
            <EmbedContent
              points={points}
              viewCuration={viewCuration}
              viewLocked={viewLocked}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inner embed content — extracted so it gets a fresh mount via the `key`
 * on its parent when viewport toggles (and on initial modal open).
 */
function EmbedContent({
  points,
  viewCuration,
  viewLocked,
}: {
  points: PointData[];
  viewCuration?: ViewCuration | null;
  viewLocked: boolean;
}) {
  const { design } = useDesign();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [demoCategoryFilter, setDemoCategoryFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(points.map((p) => p.category));
    return Array.from(cats).sort();
  }, [points]);

  const filteredPoints = useMemo(() => {
    if (demoCategoryFilter !== null) {
      return points.filter((p) => p.category === demoCategoryFilter);
    }
    return points;
  }, [points, demoCategoryFilter]);

  const handleSelectPoint = useCallback((id: string | null) => setSelectedId(id), []);

  if (design.embedLayout === "sidebar-filter") {
    return (
      <SidebarFilterLayout
        points={points}
        demoMode={design.enableDemoMode}
        viewCuration={viewCuration}
        viewLocked={viewLocked}
        fillContainer
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapView
        points={filteredPoints}
        selectedId={selectedId}
        onSelectPoint={handleSelectPoint}
        viewCuration={viewCuration}
        viewLocked={viewLocked}
        autoRotateActive={design.enableDemoMode}
      />
      {design.enableDemoMode && categories.length > 0 && (
        <AutoRotateDemo
          categories={categories}
          points={points}
          intervalMs={design.demoIntervalMs}
          onCategoryChange={setDemoCategoryFilter}
          onPointChange={handleSelectPoint}
        />
      )}
    </div>
  );
}
