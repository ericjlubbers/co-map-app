import { useState, useEffect, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import MapView from "./MapView";
import DataTable from "./DataTable";
import PointPopup from "./PointPopup";
import { useDesign } from "../context/DesignContext";
import { getCategoryInfo } from "../config";
import { getFaIconSvg } from "../lib/faIcons";
import type { PointData, ViewCuration, SfBtnPreset } from "../types";
import { useAutoRotate } from "../hooks/useAutoRotate";

// ── Hex → RGB helper for CSS custom property ────────────────
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// ── Button style presets ────────────────────────────────────
function getButtonStyles(
  preset: SfBtnPreset,
  catColor: string,
  isActive: boolean,
  isDemoGlow: boolean,
): { style: React.CSSProperties; className: string } {
  const cls = isDemoGlow ? "sf-glow-active" : "";
  const glowVar = { "--glow-color": hexToRgb(catColor) } as React.CSSProperties;

  switch (preset) {
    case "filled":
      return {
        style: {
          backgroundColor: isActive ? catColor : `${catColor}1f`,
          color: isActive ? "#ffffff" : catColor,
          border: "none",
          ...glowVar,
        },
        className: cls,
      };
    case "outlined":
      return {
        style: {
          backgroundColor: "transparent",
          color: isActive ? catColor : `${catColor}99`,
          border: isActive ? `2px solid ${catColor}` : `1px solid ${catColor}4d`,
          ...glowVar,
        },
        className: cls,
      };
    case "ghost":
      return {
        style: {
          backgroundColor: isActive ? `${catColor}26` : "transparent",
          color: isActive ? catColor : "#6b7280",
          border: "none",
          fontWeight: isActive ? 700 : undefined,
          ...glowVar,
        },
        className: cls,
      };
    case "pill":
      return {
        style: {
          backgroundColor: isActive ? catColor : "#f3f4f6",
          color: isActive ? "#ffffff" : "#4b5563",
          border: "none",
          borderRadius: "9999px",
          ...glowVar,
        },
        className: cls,
      };
    case "minimal":
      return {
        style: {
          backgroundColor: "transparent",
          color: isActive ? catColor : "#9ca3af",
          border: "none",
          borderBottom: isActive ? `2px solid ${catColor}` : "2px solid transparent",
          borderRadius: "0",
          ...glowVar,
        },
        className: cls,
      };
  }
}

interface SidebarFilterLayoutProps {
  points: PointData[];
  demoMode?: boolean;
  viewCuration?: ViewCuration | null;
  viewLocked?: boolean;
  /** When true, fill parent container instead of using fixed vh height */
  fillContainer?: boolean;
}

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

  // ── Auto-rotate demo ───────────────────────────────────────
  const rotation = useAutoRotate({
    categories,
    points,
    enabled: demoMode,
    mode: design.demoRotationMode,
    order: design.demoRotationOrder,
    categoryIntervalMs: design.demoIntervalMs,
    pointIntervalMs: design.demoPointIntervalMs,
    transitionSpeed: design.transitionSpeed,
  });

  // Sync rotation's active category to local state (allows manual override when paused)
  useEffect(() => {
    if (demoMode && rotation.demoState === "running") {
      setActiveCategory(rotation.activeCategory);
    }
  }, [demoMode, rotation.demoState, rotation.activeCategory]);

  const filteredPoints = useMemo(() => {
    if (!activeCategory) return points;
    // In by-point mode, keep all points visible
    if (demoMode && rotation.demoState === "running" && design.demoRotationMode === "by-point") return points;
    return points.filter((p) => p.category === activeCategory);
  }, [points, activeCategory, demoMode, rotation.demoState, design.demoRotationMode]);

  // ── Dim-mode state ──────────────────────────────────────────
  // In by-point mode, don't dim — just select the point and highlight button
  const isDimMode = demoMode && rotation.demoState === "running" && design.demoHighlightStyle === "dim" && design.demoRotationMode !== "by-point";

  const activePointIds = useMemo(() => {
    if (!isDimMode || !activeCategory) return undefined;
    return new Set(points.filter((p) => p.category === activeCategory).map((p) => p.id));
  }, [isDimMode, activeCategory, points]);

  // In dim mode, pass all points to the map; in filter mode, pass filtered
  const mapPoints = isDimMode ? points : filteredPoints;
  const tablePoints = isDimMode ? points : filteredPoints;

  // ── Selection ───────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectPoint = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // When rotation selects a point (by-point mode), sync to selectedId
  useEffect(() => {
    if (demoMode && rotation.demoState === "running" && rotation.activePointId) {
      setSelectedId(rotation.activePointId);
    }
  }, [demoMode, rotation.demoState, rotation.activePointId]);

  // Attach interaction listeners for demo mode
  useEffect(() => {
    if (!demoMode) return;
    const opts: AddEventListenerOptions = { passive: true };
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
  }, [demoMode, rotation.handleInteraction]);

  // When paused, clear active category to show all
  useEffect(() => {
    if (demoMode && rotation.demoState === "paused") {
      setActiveCategory(null);
      setSelectedId(null);
    }
  }, [demoMode, rotation.demoState]);

  // Manual category button click
  const handleCategoryClick = useCallback(
    (category: string | null) => {
      if (demoMode && rotation.demoState === "running") {
        rotation.pause();
      }
      setActiveCategory((prev) => (prev === category ? null : category));
    },
    [demoMode, rotation],
  );

  const demoState = rotation.demoState;

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
            "--glow-color": "31, 41, 55",
          } as React.CSSProperties}
        >
          <FontAwesomeIcon icon={faLayerGroup} className="sf-cat-icon" />
          <span className="sf-cat-label">All</span>
          <span className="sf-cat-count">{points.length}</span>
        </button>

        {categories.map((cat) => {
          const info = getCategoryInfo(cat);
          const catColor = design.categoryColors[cat] || info.color;
          const btnColor = design.sfBtnPreset === "filled" && design.sfBtnFillMode === "single" ? design.sfBtnFillColor : catColor;
          const catIcon = design.categoryIcons[cat] || info.icon;
          const isActive = activeCategory === cat;
          const isDemoGlow = demoMode && demoState === "running" && isActive;
          const isButtonDimmed = isDimMode && activeCategory !== null && !isActive;
          const count = points.filter((p) => p.category === cat).length;
          const btnStyles = getButtonStyles(design.sfBtnPreset, btnColor, isActive, isDemoGlow);
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`sf-cat-btn ${btnStyles.className}`}
              style={{
                ...btnStyles.style,
                ...(isButtonDimmed ? { opacity: 0.4, filter: "grayscale(30%)", transition: "opacity 300ms ease, filter 300ms ease" } : { transition: "opacity 300ms ease, filter 300ms ease" }),
              }}
            >
              <FaIconSvg name={catIcon} className="sf-cat-icon" />
              <span className="sf-cat-label">{cat}</span>
              <span className="sf-cat-count">{count}</span>
            </button>
          );
        })}

        {demoMode && demoState === "paused" && (
          <button
            onClick={(e) => { e.stopPropagation(); rotation.resume(); }}
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
            const btnColor = design.sfBtnPreset === "filled" && design.sfBtnFillMode === "single" ? design.sfBtnFillColor : catColor;
            const catIcon = design.categoryIcons[cat] || info.icon;
            const isActive = activeCategory === cat;
            const isDemoGlow = demoMode && demoState === "running" && isActive;
            const isButtonDimmed = isDimMode && activeCategory !== null && !isActive;
            const btnStyles = getButtonStyles(design.sfBtnPreset, btnColor, isActive, isDemoGlow);
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`sf-mobile-btn ${btnStyles.className}`}
                style={{
                  ...btnStyles.style,
                  borderColor: isActive ? catColor : "transparent",
                  ...(isButtonDimmed ? { opacity: 0.4, filter: "grayscale(30%)", transition: "opacity 300ms ease, filter 300ms ease" } : { transition: "opacity 300ms ease, filter 300ms ease" }),
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
            onClick={(e) => { e.stopPropagation(); rotation.resume(); }}
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
            points={mapPoints}
            selectedId={selectedId}
            onSelectPoint={handleSelectPoint}
            viewCuration={viewCuration}
            viewLocked={viewLocked}
            activePointIds={activePointIds}
            dimActive={isDimMode}
            dimOpacity={design.demoDimOpacity}
            autoRotateActive={demoMode && rotation.demoState === "running"}
          />
        </div>

        {/* Table (desktop only) */}
        {design.showDataPanel && (
          <div className="sf-table">
            <DataTable
              points={tablePoints}
              selectedId={selectedId}
              onSelectPoint={handleSelectPoint}
              activePointIds={activePointIds}
              dimActive={isDimMode && design.demoDimTable}
              dimOpacity={design.demoDimOpacity}
            />
          </div>
        )}
      </div>

      <style>{`
        /* ── Glow animation ── */
        @keyframes sf-glow {
          0%, 100% { box-shadow: 0 0 0 3px rgba(var(--glow-color), 0.35); }
          50% { box-shadow: 0 0 0 6px rgba(var(--glow-color), 0.12); }
        }
        .sf-glow-active {
          animation: sf-glow 1.5s ease-in-out infinite;
        }

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
            flex: ${design.showDataPanel ? '3' : '1'};
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
