import { useEffect } from "react";
import { getCategoryInfo } from "../config";
import { useDesign } from "../context/DesignContext";
import { useAutoRotate } from "../hooks/useAutoRotate";
import type { PointData } from "../types";

interface AutoRotateDemoProps {
  /** Ordered list of category names to cycle through */
  categories: string[];
  /** All points (needed for by-point mode) */
  points: PointData[];
  /** Milliseconds each category is shown before advancing */
  intervalMs: number;
  /** Called with a category name to spotlight, or null to show all */
  onCategoryChange: (category: string | null) => void;
  /** Called with a point ID when by-point mode selects a point (or null) */
  onPointChange?: (pointId: string | null) => void;
}

/**
 * AutoRotateDemo — cycles through map categories (or points) one at a time,
 * showing an overlay with the current item name. Pauses on user interaction
 * and provides a "Resume" button. Activated by the `?demo=1` embed query param.
 */
export default function AutoRotateDemo({
  categories,
  points,
  intervalMs,
  onCategoryChange,
  onPointChange,
}: AutoRotateDemoProps) {
  const { design } = useDesign();
  const rotation = useAutoRotate({
    categories,
    points,
    enabled: true,
    mode: design.demoRotationMode,
    order: design.demoRotationOrder,
    categoryIntervalMs: intervalMs,
    pointIntervalMs: design.demoPointIntervalMs,
  });

  // Attach interaction listeners
  useEffect(() => {
    const opts = { passive: true };
    window.addEventListener("click", rotation.handleInteraction, opts);
    window.addEventListener("touchstart", rotation.handleInteraction, opts);
    window.addEventListener("wheel", rotation.handleInteraction, opts);
    window.addEventListener("keydown", rotation.handleInteraction);
    return () => {
      window.removeEventListener("click", rotation.handleInteraction);
      window.removeEventListener("touchstart", rotation.handleInteraction);
      window.removeEventListener("wheel", rotation.handleInteraction);
      window.removeEventListener("keydown", rotation.handleInteraction);
    };
  }, [rotation.handleInteraction]);

  // Notify parent of category changes
  useEffect(() => {
    onCategoryChange(rotation.activeCategory);
  }, [rotation.activeCategory, onCategoryChange]);

  // Notify parent of point changes
  useEffect(() => {
    onPointChange?.(rotation.activePointId);
  }, [rotation.activePointId, onPointChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      onCategoryChange(null);
      onPointChange?.(null);
    };
  }, [onCategoryChange, onPointChange]);

  if (categories.length === 0) return null;

  // Determine what to display in the overlay
  const isPointMode = design.demoRotationMode === "by-point";
  let displayLabel: string;
  let info: { color: string; bgColor: string };

  if (isPointMode && rotation.activePointId) {
    const pt = points.find((p) => p.id === rotation.activePointId);
    displayLabel = pt?.title ?? "";
    info = getCategoryInfo(pt?.category ?? "");
  } else {
    const cat = rotation.activeCategory ?? categories[0];
    displayLabel = cat;
    info = getCategoryInfo(cat);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[1000] flex justify-center px-4">
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl"
        style={{
          backgroundColor: info.bgColor,
          opacity: rotation.visible ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {/* Category dot */}
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: info.color }}
        />
        {/* Item name */}
        <span
          className="text-sm font-semibold max-w-48 truncate"
          style={{ color: info.color }}
        >
          {displayLabel}
        </span>

        {/* Progress indicator */}
        {!isPointMode ? (
          /* Category mode: progress dots */
          <div className="flex items-center gap-1">
            {categories.map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: i === rotation.currentIndex ? info.color : "#d1d5db",
                }}
              />
            ))}
          </div>
        ) : (
          /* Point mode: mini progress bar */
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-16 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: rotation.totalItems > 0
                    ? `${((rotation.currentIndex + 1) / rotation.totalItems) * 100}%`
                    : "0%",
                  backgroundColor: info.color,
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: info.color, opacity: 0.7 }}>
              {rotation.currentIndex + 1}/{rotation.totalItems}
            </span>
          </div>
        )}

        {/* Pause indicator / Resume button */}
        {rotation.demoState === "paused" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              rotation.resume();
            }}
            className="ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: info.color }}
          >
            Resume
          </button>
        ) : (
          <span className="ml-1 text-xs" style={{ color: info.color, opacity: 0.6 }}>
            ▶
          </span>
        )}
      </div>
    </div>
  );
}
