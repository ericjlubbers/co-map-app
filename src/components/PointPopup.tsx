import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDirections, faGlobe, faMagnifyingGlassPlus, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import type { PointData } from "../types";
import { getCategoryInfo } from "../config";
import { useDesign } from "../context/DesignContext";

interface Props {
  point: PointData;
  /** Zoom into this point at the configured flyToZoom level */
  onZoomIn?: () => void;
  /** Navigate to the previous point */
  onPrev?: () => void;
  /** Navigate to the next point */
  onNext?: () => void;
  /** "3 of 150" style label */
  navLabel?: string;
  /** Compact mode for narrow mobile cards */
  compact?: boolean;
}

export default function PointPopup({ point, onZoomIn, onPrev, onNext, navLabel, compact }: Props) {
  const { design } = useDesign();
  const catInfo = getCategoryInfo(point.category);
  const displayColor = design.categoryColors[point.category] || catInfo.color;
  const displayIcon = design.categoryIcons[point.category] || point.icon || catInfo.icon;

  // Keyboard navigation: left/right arrows + Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && onPrev) { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight" && onNext) { e.preventDefault(); onNext(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPrev, onNext]);

  return (
    <div className={compact ? "w-full" : "min-w-[220px] max-w-[280px]"}>
      {/* Thumbnail (from image column or legacy imageUrl) */}
      {point.imageUrl && (
        <div className="mb-2 overflow-hidden rounded-lg">
          <img
            src={point.imageUrl}
            alt={point.title}
            className={`${compact ? "h-24" : "h-32"} w-full object-cover`}
            loading="lazy"
            decoding="async"
            sizes="280px"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Title with optional icon */}
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold leading-tight text-gray-900">
        {displayIcon && (
          <FontAwesomeIcon icon={displayIcon as never} className="shrink-0 text-xs" style={{ color: displayColor }} />
        )}
        {point.title}
      </h3>

      {/* Category badge */}
      <span
        className="mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: catInfo.bgColor, color: displayColor }}
      >
        {point.category}
      </span>

      {/* Description */}
      {point.description && (
        <p className="mb-2 text-xs leading-relaxed text-gray-600">
          {point.description}
        </p>
      )}

      {/* Address */}
      {point.address && (
        <p className="mb-2 text-xs text-gray-500">{point.address}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {point.address && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <FontAwesomeIcon icon={faDirections} className="text-[10px]" />
            Directions
          </a>
        )}
        {point.url && (
          <a
            href={point.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <FontAwesomeIcon icon={faGlobe} className="text-[10px]" />
            Website
          </a>
        )}
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="text-[10px]" />
            Zoom In
          </button>
        )}
      </div>

      {/* Prev / Next navigation */}
      {(onPrev || onNext) && (
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:invisible"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" />
            Prev
          </button>
          {navLabel && (
            <span className="text-[10px] text-gray-400">{navLabel}</span>
          )}
          <button
            onClick={onNext}
            disabled={!onNext}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:invisible"
          >
            Next
            <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
          </button>
        </div>
      )}
    </div>
  );
}
