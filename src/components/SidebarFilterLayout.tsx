import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import MapView from "./MapView";
import DataTable from "./DataTable";
import PointPopup from "./PointPopup";
import { useDesign } from "../context/DesignContext";
import { getCategoryInfo } from "../config";
import { getFaIconSvg } from "../lib/faIcons";
import type { PointData, ViewCuration } from "../types";

interface SidebarFilterLayoutProps {
  points: PointData[];
  demoMode?: boolean;
  viewCuration?: ViewCuration | null;
  viewLocked?: boolean;
  /** When true, fill parent container instead of using fixed vh height */
  fillContainer?: boolean;
}

type DemoState = "running" | "paused";
const AUTO_RESUME_DELAY_MS = 10_000;

/** Render an FA icon as inline SVG using getFaIconSvg */
function FaIconSvg({ name, className }: { name: string; className?: string }) {
  const svg = getFaIconSvg(name);
  if (!svg) return null;
  return (
    <svg
      viewBox={svg.viewBox}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={svg.pathData} />
    </svg>
  );
}

export default function SidebarFilterLayout({
  points,
  demoMode = false,
  viewCuration,
  viewLocked = false,
  fillContainer = false,
}: SidebarFilterLayoutProps) {
  const { design } = useDesign();

  // ── Categories ──────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(points.map((p) => p.category));
    return Array.from(cats).sort();
  }, [points]);

  // ── Filtering ───────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredPoints = useMemo(() => {
    if (!activeCategory) return points;
    return points.filter((p) => p.category === activeCategory);
  }, [points, activeCategory]);

  // ── Selection ───────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectPoint = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // ── Auto-rotate demo ───────────────────────────────────────
  const [demoState, setDemoState] = useState<DemoState>("running");
  const [demoIndex, setDemoIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (resumeTimerRef.current) { clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
  }, []);

  // When demo is running, set the active category from the index
  useEffect(() => {
    if (!demoMode || categories.length === 0) return;
    if (demoState === "running") {
      setActiveCategory(categories[demoIndex % categories.length]);
    }
  }, [demoMode, demoState, demoIndex, categories]);

  // Advance timer
  useEffect(() => {
    if (!demoMode || demoState !== "running" || categories.length === 0) return;
    timerRef.current = setTimeout(() => {
      setDemoIndex((prev) => (prev + 1) % categories.length);
    }, design.demoIntervalMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [demoMode, demoState, demoIndex, design.demoIntervalMs, categories.length]);

  // Pause on user interaction
  const handleInteraction = useCallback(() => {
    if (!demoMode || demoState !== "running") return;
    clearTimers();
    setDemoState("paused");
    setActiveCategory(null); // show all on pause
    resumeTimerRef.current = setTimeout(() => {
      setDemoState("running");
    }, AUTO_RESUME_DELAY_MS);
  }, [demoMode, demoState, clearTimers]);

  useEffect(() => {
    if (!demoMode) return;
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("click", handleInteraction, opts);
    window.addEventListener("touchstart", handleInteraction, opts);
    window.addEventListener("wheel", handleInteraction, opts);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("wheel", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [demoMode, handleInteraction]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Manual category button click
  const handleCategoryClick = useCallback(
    (category: string | null) => {
      // If demo is running, pause it
      if (demoMode && demoState === "running") {
        clearTimers();
        setDemoState("paused");
      }
      // Toggle: if already active, show all
      setActiveCategory((prev) => (prev === category ? null : category));
    },
    [demoMode, demoState, clearTimers],
  );

  const handleResume = useCallback(() => {
    clearTimers();
    setDemoState("running");
  }, [clearTimers]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div
      className="sf-layout"
      style={{
        ...(fillContainer ? { height: '100%' } : {}),
        '--sf-sidebar-w': design.sfSidebarWidth,
        '--sf-btn-font': `${design.sfBtnFontSize}px`,
        '--sf-btn-pad': design.sfBtnPadding,
        '--sf-btn-rad': design.sfBtnBorderRadius,
        '--sf-btn-gap': design.sfBtnGap,
        '--sf-label-wrap': design.sfLabelWrap ? 'normal' : 'nowrap',
      } as React.CSSProperties}
    >
      {/* ── Desktop left sidebar ── */}
      <aside className="sf-sidebar">
        {/* All button */}
        <button
          onClick={() => handleCategoryClick(null)}
          className="sf-cat-btn"
          style={{
            backgroundColor: !activeCategory ? "#1f2937" : "#f3f4f6",
            color: !activeCategory ? "#ffffff" : "#374151",
          }}
        >
          <FontAwesomeIcon icon={faLayerGroup} className="sf-cat-icon" />
          <span className="sf-cat-label">All</span>
          <span className="sf-cat-count">{points.length}</span>
        </button>

        {categories.map((cat) => {
          const info = getCategoryInfo(cat);
          const catColor = design.categoryColors[cat] || info.color;
          const catIcon = design.categoryIcons[cat] || info.icon;
          const isActive = activeCategory === cat;
          const count = points.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className="sf-cat-btn"
              style={{
                backgroundColor: isActive ? catColor : info.bgColor,
                color: isActive ? "#ffffff" : catColor,
              }}
            >
              <FaIconSvg name={catIcon} className="sf-cat-icon" />
              <span className="sf-cat-label">{cat}</span>
              <span className="sf-cat-count">{count}</span>
            </button>
          );
        })}

        {/* Demo resume */}
        {demoMode && demoState === "paused" && (
          <button
            onClick={(e) => { e.stopPropagation(); handleResume(); }}
            className="mt-2 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            Resume tour
          </button>
        )}
      </aside>

      {/* ── Mobile horizontal buttons ── */}
      <div className="sf-mobile-bar">
        <div className="sf-mobile-scroll">
          <button
            onClick={() => handleCategoryClick(null)}
            className="sf-mobile-btn"
            style={{
              backgroundColor: !activeCategory ? "#1f2937" : "#f3f4f6",
              color: !activeCategory ? "#ffffff" : "#374151",
            }}
          >
            All
          </button>
          {categories.map((cat) => {
            const info = getCategoryInfo(cat);
            const catColor = design.categoryColors[cat] || info.color;
            const catIcon = design.categoryIcons[cat] || info.icon;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className="sf-mobile-btn"
                style={{
                  backgroundColor: isActive ? catColor : info.bgColor,
                  color: isActive ? "#ffffff" : catColor,
                  borderColor: isActive ? catColor : "transparent",
                }}
              >
                <FaIconSvg name={catIcon} className="h-3 w-3 shrink-0" />
                <span className="truncate">{cat}</span>
              </button>
            );
          })}
        </div>

        {demoMode && demoState === "paused" && (
          <button
            onClick={(e) => { e.stopPropagation(); handleResume(); }}
            className="ml-1 shrink-0 rounded-full bg-gray-800 px-2.5 py-1 text-[10px] font-medium text-white"
          >
            Resume
          </button>
        )}
      </div>

      {/* ── Right column: map + table ── */}
      <div className="sf-content">
        {/* Map */}
        <div className="sf-map">
          <MapView
            points={filteredPoints}
            selectedId={selectedId}
            onSelectPoint={handleSelectPoint}
            viewCuration={viewCuration}
            viewLocked={viewLocked}
          />
        </div>

        {/* Table (desktop only) */}
        <div className="sf-table">
          <DataTable
            points={filteredPoints}
            selectedId={selectedId}
            onSelectPoint={handleSelectPoint}
          />
        </div>
      </div>

      <style>{`
        /* ── Sidebar-filter layout ── */
        .sf-layout {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 85vh;
          overflow: hidden;
          font-family: inherit;
        }

        /* ── Desktop sidebar (hidden on mobile) ── */
        .sf-sidebar {
          display: none;
        }

        /* ── Mobile horizontal bar ── */
        .sf-mobile-bar {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          overflow: hidden;
          flex-shrink: 0;
        }
        .sf-mobile-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex: 1;
          mask-image: linear-gradient(to right, transparent 0, black 8px, black calc(100% - 24px), transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0, black 8px, black calc(100% - 24px), transparent 100%);
          padding-right: 16px;
        }
        .sf-mobile-scroll::-webkit-scrollbar { display: none; }
        .sf-mobile-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 0.15s, color 0.15s;
        }

        /* ── Content area (map + table) ── */
        .sf-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .sf-map {
          position: relative;
          flex: 1;
          min-height: 0;
        }
        /* Hide table on mobile */
        .sf-table {
          display: none;
        }

        /* ── Desktop (≥768px) ── */
        @media (min-width: 768px) {
          .sf-layout {
            flex-direction: row;
            height: 75vh;
          }
          .sf-sidebar {
            display: flex;
            flex-direction: column;
            width: var(--sf-sidebar-w, 200px);
            flex-shrink: 0;
            gap: var(--sf-btn-gap, 4px);
            padding: 8px;
            background: #ffffff;
            border-right: 1px solid #e5e7eb;
            overflow-y: auto;
            scrollbar-width: thin;
          }
          .sf-mobile-bar {
            display: none;
          }
          .sf-content {
            flex: 1;
          }
          .sf-map {
            flex: 3;
          }
          .sf-table {
            display: flex;
            flex-direction: column;
            flex: 2;
            border-top: 1px solid #e5e7eb;
            overflow: hidden;
          }
        }

        /* ── Category button (desktop sidebar) ── */
        .sf-cat-btn {
          display: flex;
          align-items: center;
          gap: var(--sf-btn-gap, 8px);
          width: 100%;
          padding: var(--sf-btn-pad, 8px 10px);
          border-radius: var(--sf-btn-rad, 8px);
          font-size: var(--sf-btn-font, 13px);
          font-weight: 600;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background-color 0.15s, color 0.15s, transform 0.1s;
          line-height: 1.3;
        }
        .sf-cat-btn:hover {
          filter: brightness(0.95);
        }
        .sf-cat-btn:active {
          transform: scale(0.98);
        }
        .sf-cat-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .sf-cat-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: var(--sf-label-wrap, nowrap);
        }
        .sf-cat-count {
          font-size: 11px;
          opacity: 0.7;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
