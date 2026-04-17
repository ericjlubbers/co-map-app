import { useState, useRef, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight,
  faSpinner,
  faCheck,
  faExclamationTriangle,
  faTimes,
  faLink,
  faLocationDot,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import type { ColumnRole, ColumnMappings, LayerData, DataRow } from "../types";
import { fetchSheetCsv, diffRows, extractSheetId } from "../lib/googleSheets";
import { geocodeAddresses } from "../lib/api";
import { getCategoryInfo } from "../config";
import { useDesign } from "../context/DesignContext";
import ColorPicker from "./ColorPicker";
import IconPicker from "./IconPicker";

// ── Column role configuration ─────────────────────────────────

const COLUMN_ROLES: { value: ColumnRole; label: string; description: string }[] = [
  { value: "geometry", label: "Lat / Lng", description: "Latitude or longitude column" },
  { value: "name", label: "Name", description: "Primary label / title" },
  { value: "label", label: "Label", description: "Displayed on the map" },
  { value: "value", label: "Value", description: "Numeric value for choropleth" },
  { value: "group", label: "Group", description: "Category or cluster key" },
  { value: "icon", label: "Icon", description: "FontAwesome icon for marker" },
  { value: "image", label: "Image", description: "Image URL for popup & data panel" },
  { value: "address", label: "Address", description: "Street address for geocoding & display" },
  { value: "url", label: "URL", description: "Website link shown in popup" },
  { value: "metadata", label: "Metadata", description: "Extra info, shown in popup" },
  { value: "status", label: "Status", description: "\"active\" or \"upcoming\" — controls visibility & interactivity" },
  { value: "slug", label: "Slug", description: "URL-friendly identifier for embed deep-linking" },
  { value: "none", label: "None", description: "Ignore this column" },
];

// ── Types ─────────────────────────────────────────────────────

interface DataSidebarProps {
  layerData: LayerData;
  onUpdateMappings: (mappings: ColumnMappings) => void;
  onSheetLoaded: (data: Pick<LayerData, "columns" | "rows" | "googleSheetsUrl" | "lastSynced">) => void;
  onRowsChange: (rows: DataRow[]) => void;
  staleColumns?: string[];
  onClearStaleColumns?: () => void;
}

// ── Component ─────────────────────────────────────────────────

export default function DataSidebar({
  layerData,
  onUpdateMappings,
  onSheetLoaded,
  onRowsChange,
  staleColumns = [],
  onClearStaleColumns,
}: DataSidebarProps) {
  const [sheetUrl, setSheetUrl] = useState(layerData.googleSheetsUrl ?? "");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState<string | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Accordion: only one section open at a time
  type Section = "sheets" | "columns" | "geocoding" | "categories";
  const [openSection, setOpenSection] = useState<Section | null>("sheets");
  const toggleSection = useCallback((s: Section) => {
    setOpenSection((prev) => (prev === s ? null : s));
  }, []);

  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(288); // 18rem ≈ w-72
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startW: sidebarWidth };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      // Dragging left border: moving left = wider, moving right = narrower
      const dx = resizeRef.current.startX - ev.clientX;
      setSidebarWidth(Math.max(220, Math.min(500, resizeRef.current.startW + dx)));
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  const isValidSheetUrl = !!extractSheetId(sheetUrl);

  // ── Geocoding helpers ──────────────────────────────────────

  const { columns, rows, columnMappings } = layerData;
  const addressCol = columns.find((c) => columnMappings[c] === "address");
  const geoCols = columns.filter((c) => columnMappings[c] === "geometry");
  let latCol: string | undefined;
  let lngCol: string | undefined;
  for (const col of geoCols) {
    const lower = col.toLowerCase();
    if (lower.includes("lat")) latCol = col;
    else if (lower.includes("lng") || lower.includes("lon")) lngCol = col;
  }

  const needsGeocode = useMemo(() => {
    if (!addressCol || !latCol || !lngCol) return 0;
    return rows.filter((r) => {
      const addr = (r[addressCol] ?? "").trim();
      const lat = (r[latCol!] ?? "").trim();
      const lng = (r[lngCol!] ?? "").trim();
      return addr && (!lat || !lng);
    }).length;
  }, [rows, addressCol, latCol, lngCol]);

  const handleGeocode = async () => {
    if (!addressCol || !latCol || !lngCol) return;
    setGeocoding(true);
    setGeocodeError(null);
    setGeocodeProgress("Collecting addresses…");
    try {
      // Find rows that need geocoding
      const toGeocode: { index: number; address: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const addr = (rows[i][addressCol] ?? "").trim();
        const lat = (rows[i][latCol] ?? "").trim();
        const lng = (rows[i][lngCol] ?? "").trim();
        if (addr && (!lat || !lng)) {
          toGeocode.push({ index: i, address: addr });
        }
      }

      if (toGeocode.length === 0) {
        setGeocodeProgress("All rows already have coordinates.");
        setGeocoding(false);
        return;
      }

      // Batch in chunks of 50 to avoid overloading the API
      const BATCH = 50;
      const updatedRows = [...rows];
      let filled = 0;

      for (let start = 0; start < toGeocode.length; start += BATCH) {
        const batch = toGeocode.slice(start, start + BATCH);
        setGeocodeProgress(`Geocoding ${start + 1}–${Math.min(start + BATCH, toGeocode.length)} of ${toGeocode.length}…`);
        const results = await geocodeAddresses(batch.map((b) => b.address));
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.lat != null && result.lng != null) {
            const rowIdx = batch[j].index;
            updatedRows[rowIdx] = {
              ...updatedRows[rowIdx],
              [latCol]: String(result.lat),
              [lngCol]: String(result.lng),
            };
            filled++;
          }
        }
      }

      onRowsChange(updatedRows);
      setGeocodeProgress(`Done — ${filled} of ${toGeocode.length} addresses geocoded.`);
    } catch (e) {
      setGeocodeError(e instanceof Error ? e.message : "Geocoding failed");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSync = async () => {
    if (!isValidSheetUrl) return;
    setSyncing(true);
    setSyncError(null);
    setDiffSummary(null);
    try {
      const { columns, rows } = await fetchSheetCsv(sheetUrl);
      const diff = diffRows(layerData.rows, rows);
      const parts: string[] = [];
      if (diff.added > 0) parts.push(`+${diff.added} added`);
      if (diff.removed > 0) parts.push(`−${diff.removed} removed`);
      if (diff.changed > 0) parts.push(`~${diff.changed} changed`);
      setDiffSummary(parts.length > 0 ? parts.join(", ") : "No changes");
      onSheetLoaded({ columns, rows, googleSheetsUrl: sheetUrl, lastSynced: new Date().toISOString() });
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleClearSheet = () => {
    setSheetUrl("");
    setSyncError(null);
    setDiffSummary(null);
    onSheetLoaded({ columns: layerData.columns, rows: layerData.rows, googleSheetsUrl: undefined, lastSynced: undefined });
  };

  // ── Category data (lifted here so accordion header can show count) ──
  const { design, set } = useDesign();
  const [iconPickerCat, setIconPickerCat] = useState<string | null>(null);

  const groupCol = columns.find((c) => columnMappings[c] === "group");
  const categories = useMemo(() => {
    if (!groupCol) return [];
    const cats = new Set<string>();
    rows.forEach((r) => {
      const v = (r[groupCol] ?? "").trim();
      if (v) cats.add(v);
    });
    return Array.from(cats).sort();
  }, [groupCol, rows]);

  const showCategories =
    design.pointColorMode === "by-category" && !!groupCol && categories.length > 0;

  // ── Section header helper ──
  const SectionHead = ({ id, label }: { id: Section; label: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex w-full items-center gap-2 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
    >
      <FontAwesomeIcon
        icon={openSection === id ? faChevronDown : faChevronRight}
        className="text-[9px]"
      />
      {label}
    </button>
  );

  return (
    <div className="relative flex h-full shrink-0 flex-col border-l border-gray-200 bg-white text-sm" style={{ width: sidebarWidth }}>
      {/* ── Resize handle ── */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize bg-transparent transition-colors hover:bg-blue-400"
        title="Drag to resize"
      />

      <div className="relative flex-1 overflow-y-auto">
        {/* ── 1. Google Sheets ── */}
        <SectionHead id="sheets" label="Google Sheets" />
        {openSection === "sheets" && (
          <div className="px-4 py-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                <FontAwesomeIcon icon={faLink} className="text-[10px]" />
              </span>
              <input
                ref={inputRef}
                type="url"
                placeholder="Paste Google Sheets URL…"
                value={sheetUrl}
                onChange={(e) => {
                  setSheetUrl(e.target.value);
                  setSyncError(null);
                  setDiffSummary(null);
                }}
                className="w-full rounded-md border border-gray-300 py-1.5 pl-6 pr-7 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
              />
              {sheetUrl && (
                <button
                  onClick={handleClearSheet}
                  className="absolute inset-y-0 right-1.5 flex items-center text-gray-400 hover:text-gray-600"
                  title="Clear"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              )}
            </div>

            {!isValidSheetUrl && sheetUrl && (
              <p className="mt-1 text-[11px] text-amber-600">
                Doesn't look like a valid Google Sheets URL.
              </p>
            )}

            <button
              onClick={handleSync}
              disabled={!isValidSheetUrl || syncing}
              className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isValidSheetUrl && !syncing
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              }`}
            >
              <FontAwesomeIcon icon={syncing ? faSpinner : faRotateRight} spin={syncing} />
              {syncing ? "Syncing…" : "Refresh from Google Sheets"}
            </button>

            {syncError && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 shrink-0" />
                <span>{syncError}</span>
              </div>
            )}

            {diffSummary && !syncError && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-2 text-[11px] text-green-700">
                <FontAwesomeIcon icon={faCheck} />
                <span>{diffSummary}</span>
              </div>
            )}

            {layerData.lastSynced && (
              <p className="mt-2 text-[11px] text-gray-400">
                Last synced:{" "}
                <time dateTime={layerData.lastSynced}>
                  {new Date(layerData.lastSynced).toLocaleString()}
                </time>
              </p>
            )}
          </div>
        )}

        {/* ── 2. Column Roles ── */}
        <SectionHead id="columns" label="Column Roles" />
        {openSection === "columns" && (
          <div>
            {staleColumns.length > 0 && (
              <div className="border-b border-gray-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-1.5 text-[11px] text-amber-700">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {staleColumns.length} mapped column{staleColumns.length !== 1 ? "s" : ""} no longer in sheet:
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {staleColumns.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                    <button
                      onClick={onClearStaleColumns}
                      className="mt-2 rounded bg-amber-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-700"
                    >
                      Clear stale mappings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {layerData.columns.length === 0 ? (
              <p className="px-4 py-6 text-xs text-gray-400 italic">
                No columns yet — add data or connect a Google Sheet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {layerData.columns.map((col) => {
                  const currentRole = layerData.columnMappings[col] ?? "none";
                  return (
                    <li key={col} className="flex items-center justify-between px-4 py-2.5">
                      <span className="max-w-[120px] truncate text-xs font-medium text-gray-700" title={col}>
                        {col}
                      </span>
                      <select
                        value={currentRole}
                        onChange={(e) =>
                          onUpdateMappings({
                            ...layerData.columnMappings,
                            [col]: e.target.value as ColumnRole,
                          })
                        }
                        className="rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700"
                      >
                        {COLUMN_ROLES.map((role) => (
                          <option key={role.value} value={role.value} title={role.description}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── 3. Geocoding (only when address column assigned) ── */}
        {addressCol && (
          <>
            <SectionHead id="geocoding" label="Geocoding" />
            {openSection === "geocoding" && (
              <div className="px-4 py-3">
                {!latCol || !lngCol ? (
                  <p className="text-[11px] text-amber-600">
                    Assign the <strong>Lat / Lng</strong> role to your latitude and longitude columns to enable geocoding.
                  </p>
                ) : (
                  <>
                    <button
                      onClick={handleGeocode}
                      disabled={geocoding || needsGeocode === 0}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        !geocoding && needsGeocode > 0
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "cursor-not-allowed bg-gray-100 text-gray-400"
                      }`}
                    >
                      <FontAwesomeIcon icon={geocoding ? faSpinner : faLocationDot} spin={geocoding} />
                      {geocoding
                        ? "Geocoding…"
                        : needsGeocode > 0
                          ? `Geocode ${needsGeocode} Address${needsGeocode === 1 ? "" : "es"}`
                          : "All Rows Geocoded"}
                    </button>

                    {geocodeProgress && !geocodeError && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-2 text-[11px] text-green-700">
                        <FontAwesomeIcon icon={faCheck} />
                        <span>{geocodeProgress}</span>
                      </div>
                    )}

                    {geocodeError && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 shrink-0" />
                        <span>{geocodeError}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── 4. Category Styles (only when by-category + group col) ── */}
        {showCategories && (
          <>
            <SectionHead id="categories" label={`Category Styles (${categories.length})`} />
            {openSection === "categories" && (
              <div className="space-y-2 px-4 py-3">
                {categories.map((cat) => {
                  const info = getCategoryInfo(cat);
                  const currentColor = design.categoryColors[cat] || info.color;
                  const currentIcon = design.categoryIcons[cat] || info.icon;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-gray-600" title={cat}>
                        {cat}
                      </span>
                      <ColorPicker
                        value={currentColor}
                        onChange={(c) =>
                          set("categoryColors", { ...design.categoryColors, [cat]: c })
                        }
                      />
                      <div className="relative">
                        <button
                          onClick={() => setIconPickerCat(iconPickerCat === cat ? null : cat)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                          title={`Icon: ${currentIcon}`}
                        >
                          <FontAwesomeIcon icon={currentIcon as never} />
                        </button>
                        {iconPickerCat === cat && (
                          <IconPicker
                            value={currentIcon}
                            align="right"
                            onChange={(icon) => {
                              set("categoryIcons", { ...design.categoryIcons, [cat]: icon });
                              setIconPickerCat(null);
                            }}
                            onClose={() => setIconPickerCat(null)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
