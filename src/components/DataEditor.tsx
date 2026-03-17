import { useState, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faEllipsisV,
  faArrowLeft,
  faArrowRight,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import type { DataRow, ColumnRole } from "../types";

// ── Constants ─────────────────────────────────────────────────

const ROW_HEIGHT = 33;
const HEADER_HEIGHT = 36;
const MIN_COL_WIDTH = 100;
const DEFAULT_COL_WIDTH = 160;
const ROW_NUM_WIDTH = 40;

// ── Types ─────────────────────────────────────────────────────

interface DataEditorProps {
  columns: string[];
  rows: DataRow[];
  columnMappings?: Record<string, ColumnRole>;
  onColumnsChange: (columns: string[]) => void;
  onRowsChange: (rows: DataRow[]) => void;
}

interface ContextMenu {
  type: "column";
  colIndex: number;
  x: number;
  y: number;
}

// ── Utility ───────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyRow(columns: string[]): DataRow {
  const row: DataRow = { _rowId: generateId() };
  columns.forEach((c) => { row[c] = ""; });
  return row;
}

// ── Component ─────────────────────────────────────────────────

export default function DataEditor({
  columns,
  rows,
  columnMappings,
  onColumnsChange,
  onRowsChange,
}: DataEditorProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Column widths (resizable)
  const [colWidths, setColWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c, DEFAULT_COL_WIDTH]))
  );

  // Update colWidths when columns change
  useEffect(() => {
    setColWidths((prev) => {
      const next = { ...prev };
      columns.forEach((c) => {
        if (!(c in next)) next[c] = DEFAULT_COL_WIDTH;
      });
      return next;
    });
  }, [columns]);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // ── Cell editing ──────────────────────────────────────────

  const startEdit = useCallback(
    (rowIdx: number, colIdx: number) => {
      const col = columns[colIdx];
      setEditingCell({ row: rowIdx, col: colIdx });
      setEditValue(rows[rowIdx]?.[col] ?? "");
      setTimeout(() => inputRef.current?.select(), 0);
    },
    [columns, rows]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { row: rowIdx, col: colIdx } = editingCell;
    const col = columns[colIdx];
    const updatedRows = rows.map((r, i) =>
      i === rowIdx ? { ...r, [col]: editValue } : r
    );
    onRowsChange(updatedRows);
    setEditingCell(null);
  }, [editingCell, columns, rows, editValue, onRowsChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  // ── Keyboard navigation ───────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!editingCell) return;
      const { row: rowIdx, col: colIdx } = editingCell;

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        commitEdit();
        // Move to next cell
        if (e.key === "Tab") {
          const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1;
          if (nextCol >= 0 && nextCol < columns.length) {
            setSelectedCell({ row: rowIdx, col: nextCol });
            startEdit(rowIdx, nextCol);
          }
        } else {
          const nextRow = rowIdx + 1;
          if (nextRow < rows.length) {
            setSelectedCell({ row: nextRow, col: colIdx });
            startEdit(nextRow, colIdx);
          }
        }
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [editingCell, commitEdit, cancelEdit, columns.length, rows.length, startEdit]
  );

  // ── Clipboard paste ───────────────────────────────────────

  const handleContainerPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (editingCell) return; // let the input handle it
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      const pasteRows = text
        .split(/\r?\n/)
        .map((line) => line.split("\t"));

      // If pasting into an empty sheet, interpret first row as headers
      if (columns.length === 0) {
        const newCols = pasteRows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
        const newRows = pasteRows.slice(1).map((cells) => {
          const row: DataRow = { _rowId: generateId() };
          newCols.forEach((col, i) => { row[col] = cells[i] ?? ""; });
          return row;
        });
        onColumnsChange(newCols);
        onRowsChange(newRows);
        return;
      }

      const startRow = selectedCell?.row ?? rows.length;
      const startCol = selectedCell?.col ?? 0;

      const updatedRows = [...rows];
      pasteRows.forEach((pasteRow, pr) => {
        const targetRowIdx = startRow + pr;
        if (targetRowIdx >= updatedRows.length) {
          updatedRows.push(emptyRow(columns));
        }
        pasteRow.forEach((cell, pc) => {
          const colIdx = startCol + pc;
          if (colIdx < columns.length) {
            updatedRows[targetRowIdx] = {
              ...updatedRows[targetRowIdx],
              [columns[colIdx]]: cell,
            };
          }
        });
      });
      onRowsChange(updatedRows);
    },
    [editingCell, selectedCell, columns, rows, onColumnsChange, onRowsChange]
  );

  // ── Row operations ─────────────────────────────────────────

  const addRow = useCallback(() => {
    onRowsChange([...rows, emptyRow(columns)]);
  }, [rows, columns, onRowsChange]);

  const deleteSelectedRows = useCallback(() => {
    if (selectedRows.size === 0) return;
    onRowsChange(rows.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
  }, [rows, selectedRows, onRowsChange]);

  const toggleRowSelection = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── Column operations ─────────────────────────────────────

  const addColumn = useCallback(() => {
    const name = `Column ${columns.length + 1}`;
    const newCols = [...columns, name];
    onColumnsChange(newCols);
    const newRows = rows.map((r) => ({ ...r, [name]: "" }));
    onRowsChange(newRows);
  }, [columns, rows, onColumnsChange, onRowsChange]);

  const renameColumn = useCallback(
    (oldName: string, newName: string) => {
      if (!newName.trim() || newName === oldName) return;
      const trimmed = newName.trim();
      const newCols = columns.map((c) => (c === oldName ? trimmed : c));
      onColumnsChange(newCols);
      const newRows = rows.map((r) => {
        const { [oldName]: val, ...rest } = r;
        return { ...rest, [trimmed]: val ?? "" };
      });
      onRowsChange(newRows);
    },
    [columns, rows, onColumnsChange, onRowsChange]
  );

  const deleteColumn = useCallback(
    (colName: string) => {
      onColumnsChange(columns.filter((c) => c !== colName));
      onRowsChange(
        rows.map((r) =>
          Object.fromEntries(Object.entries(r).filter(([k]) => k !== colName))
        )
      );
      setContextMenu(null);
    },
    [columns, rows, onColumnsChange, onRowsChange]
  );

  const insertColumnBefore = useCallback(
    (colIdx: number) => {
      const name = `Column ${columns.length + 1}`;
      const newCols = [...columns.slice(0, colIdx), name, ...columns.slice(colIdx)];
      onColumnsChange(newCols);
      const newRows = rows.map((r) => ({ ...r, [name]: "" }));
      onRowsChange(newRows);
      setContextMenu(null);
    },
    [columns, rows, onColumnsChange, onRowsChange]
  );

  const insertColumnAfter = useCallback(
    (colIdx: number) => {
      insertColumnBefore(colIdx + 1);
    },
    [insertColumnBefore]
  );

  // ── Dismiss context menu on outside click ─────────────────

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  // ── Total table width ─────────────────────────────────────

  const totalWidth =
    ROW_NUM_WIDTH +
    columns.reduce((acc, c) => acc + (colWidths[c] ?? DEFAULT_COL_WIDTH), 0) +
    DEFAULT_COL_WIDTH; // extra space for "add column" button

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          Add row
        </button>
        <button
          onClick={addColumn}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          Add column
        </button>
        {selectedRows.size > 0 && (
          <button
            onClick={deleteSelectedRows}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <FontAwesomeIcon icon={faTrash} />
            Delete {selectedRows.size} row{selectedRows.size !== 1 ? "s" : ""}
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {rows.length} row{rows.length !== 1 ? "s" : ""} · {columns.length} column{columns.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onPaste={handleContainerPaste}
        tabIndex={0}
      >
        <div style={{ minWidth: totalWidth }}>
          {/* ── Header row ── */}
          <div
            className="sticky top-0 z-10 flex bg-gray-50 border-b border-gray-200"
            style={{ height: HEADER_HEIGHT }}
          >
            {/* Row number column */}
            <div
              className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-gray-50 text-[10px] text-gray-400"
              style={{ width: ROW_NUM_WIDTH }}
            />

            {/* Column headers */}
            {columns.map((col, colIdx) => {
              const width = colWidths[col] ?? DEFAULT_COL_WIDTH;
              const role = columnMappings?.[col];
              return (
                <div
                  key={col}
                  className="group relative flex shrink-0 items-center border-r border-gray-200 bg-gray-50 px-2"
                  style={{ width }}
                >
                  <HeaderCell
                    col={col}
                    role={role}
                    onRename={(newName) => renameColumn(col, newName)}
                  />
                  {/* Context menu trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ type: "column", colIndex: colIdx, x: e.clientX, y: e.clientY });
                    }}
                    className="ml-auto hidden shrink-0 rounded px-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 group-hover:flex"
                    title="Column options"
                  >
                    <FontAwesomeIcon icon={faEllipsisV} className="text-[10px]" />
                  </button>
                  {/* Resize handle */}
                  <ResizeHandle
                    onResize={(dx) =>
                      setColWidths((prev) => ({
                        ...prev,
                        [col]: Math.max(MIN_COL_WIDTH, (prev[col] ?? DEFAULT_COL_WIDTH) + dx),
                      }))
                    }
                  />
                </div>
              );
            })}

            {/* Add column button */}
            <div className="flex items-center px-2">
              <button
                onClick={addColumn}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                title="Add column"
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              </button>
            </div>
          </div>

          {/* ── Virtualised rows ── */}
          <div
            style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
          >
            {rowVirtualizer.getVirtualItems().map((vRow) => {
              const rowIdx = vRow.index;
              const row = rows[rowIdx];
              const isSelected = selectedRows.has(rowIdx);

              return (
                <div
                  key={vRow.key}
                  className={`absolute left-0 right-0 flex border-b border-gray-100 ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  style={{ top: vRow.start, height: ROW_HEIGHT }}
                >
                  {/* Row number / checkbox */}
                  <div
                    className="flex shrink-0 cursor-pointer items-center justify-center border-r border-gray-100 text-[10px] text-gray-400 hover:bg-blue-50"
                    style={{ width: ROW_NUM_WIDTH }}
                    onClick={() => toggleRowSelection(rowIdx)}
                    title={isSelected ? "Deselect row" : "Select row"}
                  >
                    {isSelected ? (
                      <div className="h-3.5 w-3.5 rounded bg-blue-600" />
                    ) : (
                      rowIdx + 1
                    )}
                  </div>

                  {/* Cells */}
                  {columns.map((col, colIdx) => {
                    const width = colWidths[col] ?? DEFAULT_COL_WIDTH;
                    const isEditing =
                      editingCell?.row === rowIdx && editingCell?.col === colIdx;
                    const isFocused =
                      selectedCell?.row === rowIdx && selectedCell?.col === colIdx;

                    return (
                      <div
                        key={col}
                        className={`shrink-0 border-r border-gray-100 ${
                          isFocused && !isEditing
                            ? "ring-2 ring-inset ring-blue-400"
                            : ""
                        }`}
                        style={{ width, height: ROW_HEIGHT }}
                        onClick={() => {
                          setSelectedCell({ row: rowIdx, col: colIdx });
                          if (!isEditing) startEdit(rowIdx, colIdx);
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className="h-full w-full border-none bg-white px-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                          />
                        ) : (
                          <div className="flex h-full items-center overflow-hidden px-2">
                            <span className="truncate text-xs text-gray-700">
                              {row?.[col] ?? ""}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Empty state / add first row */}
          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="mb-3 text-sm text-gray-400">No data yet</p>
              <p className="mb-4 text-xs text-gray-400">
                Add rows manually, paste from a spreadsheet, or connect a Google Sheet.
              </p>
              <button
                onClick={addRow}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faPlus} />
                Add first row
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Context menu ── */}
      {contextMenu && contextMenu.type === "column" && (
        <ColumnContextMenu
          colName={columns[contextMenu.colIndex]}
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => deleteColumn(columns[contextMenu.colIndex])}
          onInsertBefore={() => insertColumnBefore(contextMenu.colIndex)}
          onInsertAfter={() => insertColumnAfter(contextMenu.colIndex)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

interface HeaderCellProps {
  col: string;
  role?: ColumnRole;
  onRename: (newName: string) => void;
}

function HeaderCell({ col, role, onRename }: HeaderCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(col);

  const roleColors: Record<string, string> = {
    geometry: "bg-purple-100 text-purple-700",
    name: "bg-blue-100 text-blue-700",
    label: "bg-cyan-100 text-cyan-700",
    value: "bg-green-100 text-green-700",
    group: "bg-orange-100 text-orange-700",
    metadata: "bg-gray-100 text-gray-600",
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          onRename(value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onRename(value);
            setEditing(false);
          }
          if (e.key === "Escape") {
            setValue(col);
            setEditing(false);
          }
        }}
        className="w-full bg-white text-xs font-medium text-gray-800 outline-none ring-2 ring-blue-400"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
      <span
        className="truncate text-xs font-semibold text-gray-700 cursor-text"
        onDoubleClick={() => setEditing(true)}
        title={`Double-click to rename. ${role ? `Role: ${role}` : ""}`}
      >
        {col}
      </span>
      {role && role !== "none" && (
        <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${roleColors[role] ?? "bg-gray-100 text-gray-600"}`}>
          {role}
        </span>
      )}
    </div>
  );
}

interface ColumnContextMenuProps {
  colName: string;
  x: number;
  y: number;
  onDelete: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onClose: () => void;
}

function ColumnContextMenu({
  colName,
  x,
  y,
  onDelete,
  onInsertBefore,
  onInsertAfter,
  onClose,
}: ColumnContextMenuProps) {
  return (
    <div
      className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-b border-gray-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {colName}
      </div>
      <MenuItem icon={faArrowLeft} label="Insert column before" onClick={onInsertBefore} />
      <MenuItem icon={faArrowRight} label="Insert column after" onClick={onInsertAfter} />
      <div className="my-1 border-t border-gray-100" />
      <MenuItem icon={faTrash} label="Delete column" onClick={onDelete} danger />
      <div className="my-1 border-t border-gray-100" />
      <MenuItem icon={faTimes} label="Close" onClick={onClose} />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof faPlus;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="w-3 shrink-0" />
      {label}
    </button>
  );
}

interface ResizeHandleProps {
  onResize: (dx: number) => void;
}

function ResizeHandle({ onResize }: ResizeHandleProps) {
  const startX = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;

    const onMouseMove = (ev: MouseEvent) => {
      if (startX.current === null) return;
      const dx = ev.clientX - startX.current;
      startX.current = ev.clientX;
      onResize(dx);
    };

    const onMouseUp = () => {
      startX.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
      onMouseDown={handleMouseDown}
    />
  );
}
