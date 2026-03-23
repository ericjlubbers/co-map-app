import { useState, useRef, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { loadFaIconNames, getFaIconNames } from "../lib/faIcons";

interface Props {
  value: string;
  onChange: (iconName: string) => void;
  onClose: () => void;
  /** Which edge to anchor the dropdown to. Default "left". */
  align?: "left" | "right";
}

/** Maximum results shown in the dropdown */
const MAX_RESULTS = 80;

export default function IconPicker({ value, onChange, onClose, align = "left" }: Props) {
  const [query, setQuery] = useState(value);
  const [iconNames, setIconNames] = useState<string[]>(getFaIconNames);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    // Load icon library (no-op if already loaded)
    loadFaIconNames().then(setIconNames);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return iconNames.slice(0, MAX_RESULTS);
    return iconNames.filter((n) => n.includes(q)).slice(0, MAX_RESULTS);
  }, [query, iconNames]);

  const handleSelect = (name: string) => {
    onChange(name);
    onClose();
  };

  return (
    <div ref={containerRef} className={`absolute top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
      {/* Search input */}
      <div className="border-b border-gray-100 p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length > 0) {
              handleSelect(filtered[0]);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Search icons…"
          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
        />
      </div>

      {/* Results grid */}
      <div className="max-h-56 overflow-y-auto p-1.5">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-gray-400">No matching icons</p>
        ) : (
          <div className="grid grid-cols-4 gap-0.5">
            {filtered.map((name) => (
              <button
                key={name}
                onClick={() => handleSelect(name)}
                className={`flex flex-col items-center gap-0.5 rounded p-1.5 text-center transition-colors hover:bg-blue-50 ${
                  name === value ? "bg-blue-100 text-blue-700" : "text-gray-600"
                }`}
                title={name}
              >
                <FontAwesomeIcon icon={name as never} className="text-base" />
                <span className="w-full truncate text-[8px] leading-tight">{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
