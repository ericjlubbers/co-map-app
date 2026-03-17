/**
 * Google Sheets integration helpers.
 *
 * Supports two URL patterns from Google Sheets:
 *   - Published-to-web CSV:   https://docs.google.com/spreadsheets/d/{id}/pub?output=csv
 *   - Standard edit URL:      https://docs.google.com/spreadsheets/d/{id}/edit#gid=0
 *
 * Standard edit URLs are converted to the CSV export URL automatically.
 */

import type { DataRow } from "../types";

// ── URL helpers ─────────────────────────────────────────────

/**
 * Extract the spreadsheet ID from any Google Sheets URL.
 * Returns null if the URL isn't a recognisable Google Sheets link.
 */
export function extractSheetId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== "google.com" && !parsed.hostname.endsWith(".google.com")) return null;
    // Path format: /spreadsheets/d/{id}/...
    const match = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract the gid (sheet tab) from a Google Sheets URL, if present.
 * Defaults to "0" (first sheet).
 */
function extractGid(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const queryGid = parsed.searchParams.get("gid");
    if (queryGid) return queryGid;
    const hashGid = parsed.hash.replace("#gid=", "");
    return hashGid || "0";
  } catch {
    return "0";
  }
}

/**
 * Convert any Google Sheets URL to its published CSV export URL.
 * If the URL is already a /pub?output=csv URL it is returned as-is.
 */
export function toCsvUrl(url: string): string | null {
  const id = extractSheetId(url);
  if (!id) return null;
  const gid = extractGid(url);
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

// ── CSV parser ───────────────────────────────────────────────

/**
 * Parse a raw CSV string into a header array and rows array.
 * Handles quoted fields with embedded commas and newlines.
 */
export function parseCsv(csv: string): { columns: string[]; rows: DataRow[] } {
  const lines = splitCsvLines(csv);
  if (lines.length === 0) return { columns: [], rows: [] };

  const columns = parseCsvRow(lines[0]);
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    if (cells.length === 0 || cells.every((c) => c === "")) continue; // skip blank rows
    const row: DataRow = {};
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? "";
    });
    rows.push(row);
  }

  return { columns, rows };
}

/** Split CSV text into logical lines, respecting quoted fields */
function splitCsvLines(csv: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === "\r" || ch === "\n") && !inQuotes) {
      // End of line
      if (ch === "\r" && csv[i + 1] === "\n") i++; // CRLF
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  return lines;
}

/** Parse a single CSV row into cell values */
function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

// ── Fetch ─────────────────────────────────────────────────────

/**
 * Fetch a Google Sheet as CSV and return parsed columns + rows.
 * Throws on network or parse errors.
 */
export async function fetchSheetCsv(
  sheetUrl: string
): Promise<{ columns: string[]; rows: DataRow[] }> {
  const csvUrl = toCsvUrl(sheetUrl);
  if (!csvUrl) throw new Error("Not a valid Google Sheets URL");

  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch sheet: ${res.status} ${res.statusText}. Make sure the sheet is published to the web (File → Share → Publish to web).`
    );
  }

  const text = await res.text();
  return parseCsv(text);
}

// ── Change-diff summary ───────────────────────────────────────

/**
 * A summary of row-level differences between two snapshots of sheet data,
 * keyed by the first column's value in each row.
 */
export interface SheetDiff {
  /** Rows present in newRows but not in oldRows */
  added: number;
  /** Rows present in oldRows but not in newRows */
  removed: number;
  /** Rows whose key exists in both snapshots but whose content differs */
  changed: number;
}

/**
 * Produce a simple diff summary between the existing rows and
 * freshly-fetched rows, keyed by the first column value.
 */
export function diffRows(
  oldRows: DataRow[],
  newRows: DataRow[]
): SheetDiff {
  if (oldRows.length === 0) return { added: newRows.length, removed: 0, changed: 0 };

  const firstCol = Object.keys(oldRows[0] ?? newRows[0] ?? {})[0];
  if (!firstCol) return { added: 0, removed: 0, changed: 0 };

  const oldMap = new Map(oldRows.map((r) => [r[firstCol], r]));
  const newMap = new Map(newRows.map((r) => [r[firstCol], r]));

  let added = 0;
  let removed = 0;
  let changed = 0;

  for (const [key, newRow] of newMap) {
    if (!oldMap.has(key)) {
      added++;
    } else {
      const oldRow = oldMap.get(key)!;
      if (JSON.stringify(oldRow) !== JSON.stringify(newRow)) changed++;
    }
  }

  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) removed++;
  }

  return { added, removed, changed };
}
