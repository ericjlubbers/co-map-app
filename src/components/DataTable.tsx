import { useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapMarkerAlt,
  faArrowUpRightFromSquare,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import type { PointData } from "../types";
import { getCategoryInfo } from "../config";
import { useDesign } from "../context/DesignContext";
import { getFaIconSvg } from "../lib/faIcons";

interface Props {
  points: PointData[];
  selectedId: string | null;
  onSelectPoint: (id: string) => void;
  /** IDs of highlighted points (for dim mode) */
  activePointIds?: Set<string>;
  /** Whether row dimming is active */
  dimActive?: boolean;
  /** Opacity for dimmed rows */
  dimOpacity?: number;
}

export default function DataTable({ points, selectedId, onSelectPoint, activePointIds, dimActive, dimOpacity }: Props) {
  const { design } = useDesign();
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Scroll selected row into view
  useEffect(() => {
    if (selectedId && rowRefs.current[selectedId]) {
      rowRefs.current[selectedId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedId]);

  const setRowRef = useCallback(
    (id: string) => (el: HTMLTableRowElement | null) => {
      rowRefs.current[id] = el;
    },
    []
  );

  const renderCatContent = (category: string, catInfo: { icon: string; color: string }) => {
    const iconName = design.categoryIcons[category] || catInfo.icon;
    const mode = design.categoryDisplayMode;
    const svgData = (mode === "icon" || mode === "both") ? getFaIconSvg(iconName) : null;
    return (
      <>
        {svgData && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox={svgData.viewBox} className="h-3 w-3 fill-current" aria-hidden="true">
            <path d={svgData.pathData} />
          </svg>
        )}
        {mode !== "icon" && category}
      </>
    );
  };

  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        No locations match your filters.
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto">
      <table className="w-full text-left text-sm" role="grid" aria-label="Location data">
        <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr role="row">
            <th scope="col" className="px-4 py-3 w-14"></th>
            <th scope="col" className="px-4 py-3">Name</th>
            <th scope="col" className="hidden px-4 py-3 md:table-cell">Category</th>
            <th scope="col" className="hidden px-4 py-3 lg:table-cell">Address</th>
            <th scope="col" className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {points.map((point) => {
            const isSelected = point.id === selectedId;
            const isRowDimmed = dimActive && activePointIds != null && !activePointIds.has(point.id);
            const isUpcoming = point.status === "upcoming";
            const catInfo = getCategoryInfo(point.category);
            return (
              <tr
                role="row"
                aria-selected={isSelected}
                key={point.id}
                ref={setRowRef(point.id)}
                onClick={() => !isUpcoming && onSelectPoint(point.id)}
                className={`transition-colors
                  ${isUpcoming ? "cursor-default opacity-40 grayscale" : "cursor-pointer hover:bg-gray-50"}
                  ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-300" : ""}`}
                style={isRowDimmed ? {
                  opacity: dimOpacity ?? 0.3,
                  filter: "grayscale(20%)",
                  transition: "opacity 300ms ease, filter 300ms ease",
                } : {
                  transition: "opacity 300ms ease, filter 300ms ease",
                }}
              >
                {/* Thumbnail */}
                <td className="px-4 py-3">
                  <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                    {point.imageUrl ? (
                    <img
                      src={point.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      sizes="40px"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<span class="flex h-full w-full items-center justify-center text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="h-4 w-4 fill-current"><path d="${faImage.icon[4]}"/></svg></span>`;
                      }}
                    />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-gray-300">
                        <FontAwesomeIcon icon={faImage} className="text-xs" />
                      </span>
                    )}
                  </div>
                </td>

                {/* Title + mobile category */}
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">
                    {point.title}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 md:hidden">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: catInfo.bgColor,
                        color: catInfo.color,
                      }}
                    >
                      {renderCatContent(point.category, catInfo)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400 lg:hidden">
                    <FontAwesomeIcon
                      icon={faMapMarkerAlt}
                      className="mr-1 text-[10px]"
                    />
                    {point.address}
                  </div>
                </td>

                {/* Category badge (desktop) */}
                <td className="hidden px-4 py-3 md:table-cell">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: catInfo.bgColor,
                      color: catInfo.color,
                    }}
                  >
                    {renderCatContent(point.category, catInfo)}
                  </span>
                </td>

                {/* Address (desktop) */}
                <td className="hidden px-4 py-3 text-xs text-gray-500 lg:table-cell">
                  <FontAwesomeIcon
                    icon={faMapMarkerAlt}
                    className="mr-1 text-[10px] text-gray-400"
                  />
                  {point.address}
                </td>

                {/* Link */}
                <td className="px-4 py-3">
                  {point.url && (
                    <a
                      href={point.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <FontAwesomeIcon
                        icon={faArrowUpRightFromSquare}
                        className="text-xs"
                      />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
