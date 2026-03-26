import { useState, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes, faPlus, faTrash, faRoad, faWater, faCity, faTree, faTint,
  faBolt, faSun, faAdjust, faPalette, faUndo,
  faSearch, faDesktop, faMobileAlt, faCrosshairs, faBan, faExclamationTriangle, faCheck,
  faTriangleExclamation, faLock, faLockOpen, faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import ColorPicker from "./ColorPicker";
import { useDesign } from "../context/DesignContext";
import { searchCachedFeatures, checkBoundsStatus, getCombinedBounds } from "../lib/vectorTiles";
import type { SelectedElement, PrimaryElement, PrimaryElementSourceType, StyleOverrides, ConnectorStyle, PublicationBounds } from "../types";

interface CustomizeSidebarProps {
  onClose: () => void;
  selectedElement: SelectedElement | null;
  primaryElements: PrimaryElement[];
  onAddToPrimary: () => void;
  onRemoveFromPrimary: (elementId: string) => void;
  onSelectElement: (element: SelectedElement | null) => void;
  onUpdatePrimaryElement?: (elementId: string, updates: Partial<PrimaryElement>) => void;
  publicationBounds?: PublicationBounds;
  onSetBoundsFromView?: (target: "desktop" | "mobile") => void;
  onUpdatePublicationBounds?: (bounds: PublicationBounds | undefined) => void;
  onFlyTo?: (lat: number, lng: number, zoom?: number) => void;
  onQuickAddPrimary?: (element: SelectedElement) => void;
  viewLocked?: boolean;
  onLockView?: () => void;
  onUnlockView?: () => void;
  onClearCuration?: () => void;
}

const SOURCE_TYPE_LABELS: Record<PrimaryElementSourceType, string> = {
  road: "Road",
  waterway: "Waterway",
  city: "City",
  park: "Park",
  lake: "Lake",
};

const SOURCE_TYPE_ICONS: Record<PrimaryElementSourceType, typeof faRoad> = {
  road: faRoad,
  waterway: faWater,
  city: faCity,
  park: faTree,
  lake: faTint,
};

const SOURCE_TYPE_COLORS: Record<PrimaryElementSourceType, string> = {
  road: "bg-gray-100 text-gray-700",
  waterway: "bg-blue-50 text-blue-700",
  city: "bg-amber-50 text-amber-700",
  park: "bg-green-50 text-green-700",
  lake: "bg-cyan-50 text-cyan-700",
};

export default function CustomizeSidebar({
  onClose,
  selectedElement,
  primaryElements,
  onAddToPrimary,
  onRemoveFromPrimary,
  onSelectElement,
  onUpdatePrimaryElement,
  publicationBounds,
  onSetBoundsFromView,
  onUpdatePublicationBounds,
  onFlyTo,
  onQuickAddPrimary,
  viewLocked,
  onLockView,
  onUnlockView,
  onClearCuration,
}: CustomizeSidebarProps) {
  // Check if selected element is already a primary element
  const selectedIsPrimary = useMemo(() => {
    if (!selectedElement) return null;
    return primaryElements.find((pe) =>
      pe.sourceIds.length === selectedElement.sourceIds.length &&
      pe.sourceIds.every((id) => selectedElement.sourceIds.includes(id))
    ) ?? null;
  }, [selectedElement, primaryElements]);

  const { design, set } = useDesign();
  const [layersExpanded, setLayersExpanded] = useState(false);

  const isShape = selectedIsPrimary && selectedIsPrimary.sourceType !== "city";
  const isCity = selectedIsPrimary?.sourceType === "city";
  const overrides = selectedIsPrimary?.styleOverrides ?? {};
  const connector = selectedIsPrimary?.connectorStyle ?? {};
  const hasLabelPosition = !!selectedIsPrimary?.labelPosition;

  // Helpers to update style overrides and connector style
  const setOverride = useCallback(
    (key: keyof StyleOverrides, value: string | number) => {
      if (!selectedIsPrimary || !onUpdatePrimaryElement) return;
      onUpdatePrimaryElement(selectedIsPrimary.id, {
        styleOverrides: { ...selectedIsPrimary.styleOverrides, [key]: value },
      });
    },
    [selectedIsPrimary, onUpdatePrimaryElement],
  );

  const setConnector = useCallback(
    (key: keyof ConnectorStyle, value: string | number) => {
      if (!selectedIsPrimary || !onUpdatePrimaryElement) return;
      onUpdatePrimaryElement(selectedIsPrimary.id, {
        connectorStyle: { ...selectedIsPrimary.connectorStyle, [key]: value },
      });
    },
    [selectedIsPrimary, onUpdatePrimaryElement],
  );

  const applyPreset = useCallback(
    (preset: StyleOverrides) => {
      if (!selectedIsPrimary || !onUpdatePrimaryElement) return;
      onUpdatePrimaryElement(selectedIsPrimary.id, {
        styleOverrides: { ...selectedIsPrimary.styleOverrides, ...preset },
      });
    },
    [selectedIsPrimary, onUpdatePrimaryElement],
  );

  const resetStyles = useCallback(() => {
    if (!selectedIsPrimary || !onUpdatePrimaryElement) return;
    onUpdatePrimaryElement(selectedIsPrimary.id, { styleOverrides: undefined });
  }, [selectedIsPrimary, onUpdatePrimaryElement]);

  const resetLabelPosition = useCallback(() => {
    if (!selectedIsPrimary || !onUpdatePrimaryElement) return;
    onUpdatePrimaryElement(selectedIsPrimary.id, {
      labelPosition: undefined,
      connectorStyle: undefined,
    });
  }, [selectedIsPrimary, onUpdatePrimaryElement]);

  // Group primary elements by source type
  const grouped = useMemo(() => {
    const groups: Partial<Record<PrimaryElementSourceType, PrimaryElement[]>> = {};
    for (const el of primaryElements) {
      if (!groups[el.sourceType]) groups[el.sourceType] = [];
      groups[el.sourceType]!.push(el);
    }
    return groups;
  }, [primaryElements]);

  const groupOrder: PrimaryElementSourceType[] = ["road", "city", "waterway", "park", "lake"];

  // ── Quicksearch state ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<Set<PrimaryElementSourceType>>(
    () => new Set<PrimaryElementSourceType>(["road", "city", "waterway", "park", "lake"]),
  );

  const toggleSearchFilter = useCallback((type: PrimaryElementSourceType) => {
    setSearchFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const searchResults = useMemo(
    () => searchCachedFeatures(searchQuery, searchFilters),
    [searchQuery, searchFilters],
  );

  // ── Bounds status computations ─────────────────────────────
  const combinedBounds = useMemo(
    () => getCombinedBounds(publicationBounds),
    [publicationBounds],
  );

  const elementBoundsStatus = useMemo(() => {
    if (!combinedBounds) return new Map<string, "in" | "partial" | "out">();
    const map = new Map<string, "in" | "partial" | "out">();
    for (const el of primaryElements) {
      map.set(el.id, checkBoundsStatus(el.geometry, combinedBounds));
    }
    return map;
  }, [primaryElements, combinedBounds]);

  const outOfBoundsCount = useMemo(() => {
    let count = 0;
    for (const status of elementBoundsStatus.values()) {
      if (status === "out") count++;
    }
    return count;
  }, [elementBoundsStatus]);

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Customize</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <FontAwesomeIcon icon={faTimes} className="text-xs" />
        </button>
      </div>

      {/* Under Development banner */}
      <div className="mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
        <div className="flex items-center gap-2 text-amber-800">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-sm" />
          <span className="text-xs font-semibold">Under Development</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
          These features are under active development and may change. Use the Settings tab for production-ready map controls.
        </p>
      </div>

      {/* Lock View controls */}
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Lock View</p>
        <div className="flex items-center gap-1.5">
          {viewLocked ? (
            <>
              <button
                onClick={onUnlockView}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <FontAwesomeIcon icon={faLock} className="text-[10px]" />
                View Locked
              </button>
              <button
                onClick={onClearCuration}
                className="rounded-md px-2 py-1.5 text-[10px] text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
              >
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={onLockView}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <FontAwesomeIcon icon={faLockOpen} className="text-[10px]" />
              Lock View
            </button>
          )}
        </div>
      </div>

      {/* Map Layers (moved from Settings) */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setLayersExpanded(!layersExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hover:bg-gray-50 transition-colors"
        >
          Map Layers
          <FontAwesomeIcon
            icon={faChevronRight}
            className={`text-[10px] text-gray-400 transition-transform ${layersExpanded ? "rotate-90" : ""}`}
          />
        </button>
        {layersExpanded && (
          <div className="px-4 pb-3 space-y-4">
            {/* Roads */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Show Roads</span>
                <LayerToggle checked={design.showRoads} onChange={(v) => set("showRoads", v)} />
              </div>
              {design.showRoads && (
                <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    <TogglePill label="Motorways" checked={design.showMotorways} onChange={(v) => set("showMotorways", v)} />
                    <TogglePill label="Trunk" checked={design.showTrunkRoads} onChange={(v) => set("showTrunkRoads", v)} />
                    <TogglePill label="Primary" checked={design.showPrimaryRoads} onChange={(v) => set("showPrimaryRoads", v)} />
                    <TogglePill label="Secondary" checked={design.showSecondaryRoads} onChange={(v) => set("showSecondaryRoads", v)} />
                    <TogglePill label="Tertiary" checked={design.showTertiaryRoads} onChange={(v) => set("showTertiaryRoads", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Color</span>
                    <ColorPicker value={design.roadColor} onChange={(v) => set("roadColor", v)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Weight</span>
                    <input type="range" min={1} max={8} step={0.5} value={design.roadWeight} onChange={(e) => set("roadWeight", parseFloat(e.target.value))} className="h-1 w-20 accent-blue-500" />
                    <span className="w-10 text-right text-[10px] text-gray-400">{design.roadWeight}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Opacity</span>
                    <input type="range" min={0.1} max={1} step={0.1} value={design.roadOpacity} onChange={(e) => set("roadOpacity", parseFloat(e.target.value))} className="h-1 w-20 accent-blue-500" />
                    <span className="w-10 text-right text-[10px] text-gray-400">{design.roadOpacity.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
            {/* Waterways */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Show Waterways</span>
                <LayerToggle checked={design.showWaterways} onChange={(v) => set("showWaterways", v)} />
              </div>
              {design.showWaterways && (
                <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    <TogglePill label="Rivers" checked={design.showRivers} onChange={(v) => set("showRivers", v)} />
                    <TogglePill label="Streams" checked={design.showStreams} onChange={(v) => set("showStreams", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Color</span>
                    <ColorPicker value={design.waterwayColor} onChange={(v) => set("waterwayColor", v)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Weight</span>
                    <input type="range" min={1} max={8} step={0.5} value={design.waterwayWeight} onChange={(e) => set("waterwayWeight", parseFloat(e.target.value))} className="h-1 w-20 accent-blue-500" />
                    <span className="w-10 text-right text-[10px] text-gray-400">{design.waterwayWeight}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Opacity</span>
                    <input type="range" min={0.1} max={1} step={0.1} value={design.waterwayOpacity} onChange={(e) => set("waterwayOpacity", parseFloat(e.target.value))} className="h-1 w-20 accent-blue-500" />
                    <span className="w-10 text-right text-[10px] text-gray-400">{design.waterwayOpacity.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
            {/* Parks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Show Parks</span>
                <LayerToggle checked={design.showParks} onChange={(v) => set("showParks", v)} />
              </div>
              {design.showParks && (
                <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Color</span>
                    <ColorPicker value={design.parkColor} onChange={(v) => set("parkColor", v)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Opacity</span>
                    <input type="range" min={0.1} max={0.8} step={0.05} value={design.parkOpacity} onChange={(e) => set("parkOpacity", parseFloat(e.target.value))} className="h-1 w-20 accent-blue-500" />
                    <span className="w-10 text-right text-[10px] text-gray-400">{design.parkOpacity.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            {/* Lakes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Show Lakes</span>
                <LayerToggle checked={design.showLakes} onChange={(v) => set("showLakes", v)} />
              </div>
              {design.showLakes && (
                <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Color</span>
                    <ColorPicker value={design.lakeColor} onChange={(v) => set("lakeColor", v)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Opacity</span>
                    <input type="range" min={0.1} max={0.8} step={0.05} value={design.lakeOpacity} onChange={(e) => set("lakeOpacity", parseFloat(e.target.value))} className="h-1 w-20 accent-blue-500" />
                    <span className="w-10 text-right text-[10px] text-gray-400">{design.lakeOpacity.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Style Controls — shows selected element info + style editors */}
      <div className="border-b border-gray-100 px-4 py-4 overflow-y-auto max-h-[55vh]">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Style Controls</p>
        {selectedElement ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_TYPE_COLORS[selectedElement.sourceType]}`}>
                <FontAwesomeIcon icon={SOURCE_TYPE_ICONS[selectedElement.sourceType]} className="text-[9px]" />
                {SOURCE_TYPE_LABELS[selectedElement.sourceType]}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800">{selectedElement.name}</p>
            <p className="text-[11px] text-gray-500">
              {selectedElement.sourceIds.length > 1
                ? `${selectedElement.sourceIds.length} connected segments`
                : selectedElement.sourceIds[0]}
            </p>
            {selectedIsPrimary ? (
              <>
                <button
                  onClick={() => onRemoveFromPrimary(selectedIsPrimary.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                  Remove from Primary
                </button>

                {/* ── Style Presets ─────────────────────────────── */}
                <div className="pt-2">
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Presets</p>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => applyPreset(
                        isCity
                          ? { fontColor: "#dc2626", fontSize: 16, bgOpacity: 1 }
                          : { color: "#dc2626", weight: (overrides.weight ?? 3) + 2, opacity: 1 },
                      )}
                      className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <FontAwesomeIcon icon={faBolt} className="text-[9px]" />
                      Highlight
                    </button>
                    <button
                      onClick={() => applyPreset(
                        isCity
                          ? { fontColor: "#f59e0b", bgColor: "#fffbeb", bgOpacity: 0.95 }
                          : { color: "#f59e0b", weight: (overrides.weight ?? 3) + 3, opacity: 0.9 },
                      )}
                      className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <FontAwesomeIcon icon={faSun} className="text-[9px]" />
                      Glow
                    </button>
                    <button
                      onClick={() => applyPreset(
                        isCity
                          ? { fontColor: "#9ca3af", fontSize: 11, bgOpacity: 0.5 }
                          : { opacity: 0.35, weight: Math.max(1, (overrides.weight ?? 3) - 1) },
                      )}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <FontAwesomeIcon icon={faAdjust} className="text-[9px]" />
                      Subdued
                    </button>
                    <button
                      onClick={() => applyPreset(
                        isCity
                          ? { fontColor: "#2563eb" }
                          : { color: "#2563eb" },
                      )}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPalette} className="text-[9px]" />
                      Color
                    </button>
                    {selectedIsPrimary.styleOverrides && Object.keys(selectedIsPrimary.styleOverrides).length > 0 && (
                      <button
                        onClick={resetStyles}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <FontAwesomeIcon icon={faUndo} className="text-[9px]" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Shape style controls ─────────────────────── */}
                {isShape && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-medium text-gray-500">Shape Styling</p>
                    <StyleRow label="Color">
                      <ColorPicker
                        value={overrides.color ?? "#666666"}
                        onChange={(c) => setOverride("color", c)}
                      />
                    </StyleRow>
                    <StyleRow label="Weight">
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={0.5}
                        value={overrides.weight ?? 3}
                        onChange={(e) => setOverride("weight", parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <span className="ml-1 w-6 text-right text-[10px] text-gray-400">{overrides.weight ?? 3}</span>
                    </StyleRow>
                    <StyleRow label="Opacity">
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={overrides.opacity ?? 1}
                        onChange={(e) => setOverride("opacity", parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <span className="ml-1 w-6 text-right text-[10px] text-gray-400">{Math.round((overrides.opacity ?? 1) * 100)}%</span>
                    </StyleRow>
                    <StyleRow label="Dash">
                      <select
                        value={overrides.dashArray ?? ""}
                        onChange={(e) => setOverride("dashArray", e.target.value)}
                        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700"
                      >
                        <option value="">Solid</option>
                        <option value="5,5">Dashed</option>
                        <option value="2,4">Dotted</option>
                        <option value="10,5,2,5">Dash-Dot</option>
                      </select>
                    </StyleRow>
                    {(selectedIsPrimary.sourceType === "park" || selectedIsPrimary.sourceType === "lake") && (
                      <>
                        <StyleRow label="Fill">
                          <ColorPicker
                            value={overrides.fillColor ?? overrides.color ?? "#666666"}
                            onChange={(c) => setOverride("fillColor", c)}
                          />
                        </StyleRow>
                        <StyleRow label="Fill Opacity">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={overrides.fillOpacity ?? 0.3}
                            onChange={(e) => setOverride("fillOpacity", parseFloat(e.target.value))}
                            className="w-full accent-blue-600"
                          />
                          <span className="ml-1 w-6 text-right text-[10px] text-gray-400">{Math.round((overrides.fillOpacity ?? 0.3) * 100)}%</span>
                        </StyleRow>
                      </>
                    )}
                  </div>
                )}

                {/* ── City/label style controls ────────────────── */}
                {isCity && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-medium text-gray-500">Label Styling</p>
                    <StyleRow label="Color">
                      <ColorPicker
                        value={overrides.fontColor ?? "#333333"}
                        onChange={(c) => setOverride("fontColor", c)}
                      />
                    </StyleRow>
                    <StyleRow label="Size">
                      <input
                        type="range"
                        min={8}
                        max={24}
                        step={1}
                        value={overrides.fontSize ?? 13}
                        onChange={(e) => setOverride("fontSize", parseInt(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <span className="ml-1 w-6 text-right text-[10px] text-gray-400">{overrides.fontSize ?? 13}px</span>
                    </StyleRow>
                    <StyleRow label="Background">
                      <ColorPicker
                        value={overrides.bgColor ?? "#ffffff"}
                        onChange={(c) => setOverride("bgColor", c)}
                      />
                    </StyleRow>
                    <StyleRow label="Bg Opacity">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={overrides.bgOpacity ?? 0.85}
                        onChange={(e) => setOverride("bgOpacity", parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <span className="ml-1 w-6 text-right text-[10px] text-gray-400">{Math.round((overrides.bgOpacity ?? 0.85) * 100)}%</span>
                    </StyleRow>
                  </div>
                )}

                {/* ── Label position / connector ───────────────── */}
                {isCity && hasLabelPosition && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-gray-500">Connector Line</p>
                      <button
                        onClick={resetLabelPosition}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Reset position
                      </button>
                    </div>
                    <StyleRow label="Color">
                      <ColorPicker
                        value={connector.color ?? "#94a3b8"}
                        onChange={(c) => setConnector("color", c)}
                      />
                    </StyleRow>
                    <StyleRow label="Weight">
                      <input
                        type="range"
                        min={0.5}
                        max={4}
                        step={0.5}
                        value={connector.weight ?? 1}
                        onChange={(e) => setConnector("weight", parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <span className="ml-1 w-6 text-right text-[10px] text-gray-400">{connector.weight ?? 1}</span>
                    </StyleRow>
                    <StyleRow label="Opacity">
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={connector.opacity ?? 0.6}
                        onChange={(e) => setConnector("opacity", parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <span className="ml-1 w-6 text-right text-[10px] text-gray-400">{Math.round((connector.opacity ?? 0.6) * 100)}%</span>
                    </StyleRow>
                    <StyleRow label="Dash">
                      <select
                        value={connector.dashArray ?? ""}
                        onChange={(e) => setConnector("dashArray", e.target.value)}
                        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700"
                      >
                        <option value="">Solid</option>
                        <option value="4,4">Dashed</option>
                        <option value="2,3">Dotted</option>
                      </select>
                    </StyleRow>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={onAddToPrimary}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                Add to Primary
              </button>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-400">Select an element on the map to see style options.</p>
        )}
      </div>

      {/* Quicksearch */}
      <div className="border-b border-gray-100 px-4 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          <FontAwesomeIcon icon={faSearch} className="mr-1" />
          Quicksearch
        </p>
        <div className="mt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features…"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        {/* Layer filter checkboxes */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {(["road", "city", "waterway", "park", "lake"] as const).map((type) => (
            <label key={type} className="inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={searchFilters.has(type)}
                onChange={() => toggleSearchFilter(type)}
                className="h-3 w-3 rounded border-gray-300 text-blue-600"
              />
              {SOURCE_TYPE_LABELS[type]}s
            </label>
          ))}
        </div>
        {/* Search results */}
        {searchQuery.trim() && (
          <div className="mt-2 max-h-48 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">No features found.</p>
            ) : (
              <div className="space-y-0.5">
                {searchResults.map((result, i) => (
                  <div
                    key={`${result.sourceType}-${result.sourceIds[0]}-${i}`}
                    className="group flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer hover:bg-gray-50 text-gray-700"
                    onClick={() => {
                      onSelectElement({
                        sourceType: result.sourceType,
                        sourceIds: result.sourceIds,
                        name: result.name,
                        geometry: result.geometry,
                        properties: result.properties,
                      });
                      onFlyTo?.(result.lat, result.lng, 12);
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${SOURCE_TYPE_COLORS[result.sourceType]}`}>
                        <FontAwesomeIcon icon={SOURCE_TYPE_ICONS[result.sourceType]} className="text-[8px]" />
                      </span>
                      <span className="truncate">{result.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAddPrimary?.({
                          sourceType: result.sourceType,
                          sourceIds: result.sourceIds,
                          name: result.name,
                          geometry: result.geometry,
                          properties: result.properties,
                        });
                      }}
                      className="ml-1 shrink-0 rounded p-0.5 text-gray-300 opacity-0 hover:text-blue-500 group-hover:opacity-100 transition-all"
                      title="Add to primary elements"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publication Bounds */}
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Publication Bounds</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-600">
              <FontAwesomeIcon icon={faDesktop} className="mr-1 text-blue-500 text-[10px]" />
              Desktop
              {publicationBounds?.desktop && (
                <span className="ml-1 text-[9px] text-gray-400">✓</span>
              )}
            </span>
            <button
              onClick={() => onSetBoundsFromView?.("desktop")}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
            >
              <FontAwesomeIcon icon={faCrosshairs} className="mr-0.5" />
              {publicationBounds?.desktop ? "Update" : "Set from View"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-600">
              <FontAwesomeIcon icon={faMobileAlt} className="mr-1 text-pink-500 text-[10px]" />
              Mobile
              {publicationBounds?.mobile && (
                <span className="ml-1 text-[9px] text-gray-400">✓</span>
              )}
            </span>
            <button
              onClick={() => onSetBoundsFromView?.("mobile")}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
            >
              <FontAwesomeIcon icon={faCrosshairs} className="mr-0.5" />
              {publicationBounds?.mobile ? "Update" : "Set from View"}
            </button>
          </div>
          {(publicationBounds?.desktop || publicationBounds?.mobile) && (
            <button
              onClick={() => onUpdatePublicationBounds?.(undefined)}
              className="mt-1 text-[10px] text-red-500 hover:text-red-700"
            >
              Clear Bounds
            </button>
          )}
        </div>
      </div>

      {/* Primary Elements list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Primary Elements
          {primaryElements.length > 0 && (
            <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
              {primaryElements.length}
            </span>
          )}
        </p>
        {/* Remove all out-of-bounds shortcut */}
        {outOfBoundsCount > 0 && (
          <button
            onClick={() => {
              for (const el of primaryElements) {
                if (elementBoundsStatus.get(el.id) === "out") {
                  onRemoveFromPrimary(el.id);
                }
              }
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <FontAwesomeIcon icon={faBan} className="text-[10px]" />
            Remove {outOfBoundsCount} out-of-bounds
          </button>
        )}
        {primaryElements.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">
            No primary elements yet. Select elements on the map and promote them to build your composition.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {groupOrder.map((sourceType) => {
              const items = grouped[sourceType];
              if (!items || items.length === 0) return null;
              return (
                <div key={sourceType}>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <FontAwesomeIcon icon={SOURCE_TYPE_ICONS[sourceType]} className="text-[10px]" />
                    {SOURCE_TYPE_LABELS[sourceType]}s
                    <span className="text-gray-400">({items.length})</span>
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {items.map((el) => {
                      const isSelected =
                        selectedElement &&
                        selectedElement.sourceIds.length === el.sourceIds.length &&
                        selectedElement.sourceIds.every((id) => el.sourceIds.includes(id));
                      const boundsStatus = elementBoundsStatus.get(el.id);
                      return (
                        <div
                          key={el.id}
                          className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            onSelectElement({
                              sourceType: el.sourceType,
                              sourceIds: el.sourceIds,
                              name: el.name,
                              geometry: el.geometry,
                              properties: el.properties,
                            });
                          }}
                        >
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="truncate">{el.name}</span>
                            {boundsStatus === "in" && (
                              <FontAwesomeIcon icon={faCheck} className="shrink-0 text-[9px] text-green-500" title="In bounds" />
                            )}
                            {boundsStatus === "partial" && (
                              <FontAwesomeIcon icon={faExclamationTriangle} className="shrink-0 text-[9px] text-amber-500" title="Partially out of bounds" />
                            )}
                            {boundsStatus === "out" && (
                              <FontAwesomeIcon icon={faBan} className="shrink-0 text-[9px] text-red-400" title="Out of bounds" />
                            )}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFromPrimary(el.id);
                            }}
                            className="ml-1 shrink-0 rounded p-0.5 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100 transition-all"
                            title="Remove from primary"
                          >
                            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact label + control row for style editors */
function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-gray-500">{label}</span>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

function LayerToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function TogglePill({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
        checked
          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
          : "bg-gray-100 text-gray-400 ring-1 ring-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
