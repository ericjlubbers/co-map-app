import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faMagnifyingGlass,
  faXmark,
  faCopy,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useDesign } from "../context/DesignContext";
import { buildCategoryEmbedSnippet } from "../lib/embedSnippet";

interface Props {
  categories: string[];
  activeCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  onResetCategories: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
  totalCount: number;
  /** Single color for all category pills (from design.pointColor) */
  pointColor?: string;
  /** When "by-category", use categoryColors map instead of single pointColor */
  pointColorMode?: "single" | "by-category";
  categoryColors?: Record<string, string>;
  /** Map ID — when provided, shows per-category embed copy buttons */
  mapId?: string;
}

export default function FilterBar({
  categories,
  activeCategories,
  onToggleCategory,
  onResetCategories,
  searchQuery,
  onSearchChange,
  resultCount,
  totalCount,
  pointColor = "#2563eb",
  pointColorMode = "single",
  categoryColors = {},
  mapId,
}: Props) {
  const { design } = useDesign();
  const allActive = activeCategories.size === 0;
  const [copiedCat, setCopiedCat] = useState<string | null>(null);

  const handleCopyCategoryEmbed = useCallback((e: React.MouseEvent, cat: string) => {
    e.stopPropagation();
    if (!mapId) return;
    const snippet = buildCategoryEmbedSnippet(mapId, cat, window.location.origin, design);
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedCat(cat);
      setTimeout(() => setCopiedCat(null), 1800);
    });
  }, [mapId, design]);

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      {/* Search */}
      <div className="relative mb-3">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search locations..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-9 text-sm
                     text-gray-700 placeholder-gray-400 outline-none transition
                     focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FontAwesomeIcon
          icon={faFilter}
          className="mr-1 text-xs text-gray-400"
        />
        <button
          onClick={onResetCategories}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            allActive
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {categories.map((cat) => {
          const isActive = activeCategories.has(cat);
          const color = pointColorMode === "by-category" && categoryColors[cat]
            ? categoryColors[cat]
            : pointColor;
          const isCopied = copiedCat === cat;
          return (
            <div key={cat} className="group flex items-center gap-0.5">
              <button
                onClick={() => onToggleCategory(cat)}
                className="rounded-full px-3 py-1 text-xs font-medium transition"
                style={{
                  backgroundColor: isActive ? color : `${color}18`,
                  color: isActive ? "white" : color,
                }}
              >
                {cat}
              </button>
              {mapId && (
                <button
                  onClick={(e) => handleCopyCategoryEmbed(e, cat)}
                  className={`rounded p-1 text-[10px] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                    isCopied ? "text-green-500" : "text-gray-400 hover:text-blue-500"
                  }`}
                  title={isCopied ? "Copied!" : `Copy embed code for "${cat}"`}
                >
                  <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Result count */}
      <div className="mt-2 text-xs text-gray-400">
        Showing {resultCount} of {totalCount} locations
      </div>
    </div>
  );
}
