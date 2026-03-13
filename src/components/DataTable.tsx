import { useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapMarkerAlt,
  faArrowUpRightFromSquare,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import type { PointData } from "../types";
import { getCategoryInfo } from "../config";

interface Props {
  points: PointData[];
  selectedId: string | null;
  onSelectPoint: (id: string) => void;
}

export default function DataTable({ points, selectedId, onSelectPoint }: Props) {
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

  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        No locations match your filters.
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-3 w-14"></th>
            <th className="px-4 py-3">Name</th>
            <th className="hidden px-4 py-3 md:table-cell">Category</th>
            <th className="hidden px-4 py-3 lg:table-cell">Address</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {points.map((point) => {
            const isSelected = point.id === selectedId;
            const catInfo = getCategoryInfo(point.category);
            return (
              <tr
                key={point.id}
                ref={setRowRef(point.id)}
                onClick={() => onSelectPoint(point.id)}
                className={`cursor-pointer transition-colors hover:bg-gray-50
                  ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-300" : ""}`}
              >
                {/* Thumbnail */}
                <td className="px-4 py-3">
                  <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={point.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<span class="flex h-full w-full items-center justify-center text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="h-4 w-4 fill-current"><path d="${faImage.icon[4]}"/></svg></span>`;
                      }}
                    />
                  </div>
                </td>

                {/* Title + mobile category */}
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">
                    {point.title}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 md:hidden">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: catInfo.bgColor,
                        color: catInfo.color,
                      }}
                    >
                      {point.category}
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
                    className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: catInfo.bgColor,
                      color: catInfo.color,
                    }}
                  >
                    {point.category}
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
