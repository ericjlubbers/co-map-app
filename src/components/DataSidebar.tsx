import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight,
  faSpinner,
  faCheck,
  faExclamationTriangle,
  faTimes,
  faLink,
} from "@fortawesome/free-solid-svg-icons";
import type { ColumnRole, ColumnMappings, LayerData } from "../types";
import { fetchSheetCsv, diffRows, extractSheetId } from "../lib/googleSheets";

// ── Column role configuration ─────────────────────────────────

const COLUMN_ROLES: { value: ColumnRole; label: string; description: string }[] = [
  { value: "geometry", label: "Geometry", description: "GeoJSON or lat/lng" },
  { value: "name", label: "Name", description: "Primary label / title" },
  { value: "label", label: "Label", description: "Displayed on the map" },
  { value: "value", label: "Value", description: "Numeric value for choropleth" },
  { value: "group", label: "Group", description: "Category or cluster key" },
  { value: "icon", label: "Icon", description: "FontAwesome icon for marker" },
  { value: "image", label: "Image", description: "Image URL for popup & data panel" },
  { value: "metadata", label: "Metadata", description: "Extra info, shown in popup" },
  { value: "none", label: "None", description: "Ignore this column" },
];

// ── Types ─────────────────────────────────────────────────────

interface DataSidebarProps {
  layerData: LayerData;
  onUpdateMappings: (mappings: ColumnMappings) => void;
  onSheetLoaded: (data: Pick<LayerData, "columns" | "rows" | "googleSheetsUrl" | "lastSynced">) => void;
}

// ── Component ─────────────────────────────────────────────────

export default function DataSidebar({
  layerData,
  onUpdateMappings,
  onSheetLoaded,
}: DataSidebarProps) {
  const [sheetUrl, setSheetUrl] = useState(layerData.googleSheetsUrl ?? "");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidSheetUrl = !!extractSheetId(sheetUrl);

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

  return (
    <div className="flex h-full w-72 flex-col border-l border-gray-200 bg-white text-sm">
      {/* ── Column Roles ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Column Roles
          </h3>
        </div>

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

        {/* ── Google Sheets connector ── */}
        <div className="border-t border-gray-200 px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Google Sheets
          </h3>

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
      </div>
    </div>
  );
}
