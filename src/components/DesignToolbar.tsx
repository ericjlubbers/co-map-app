import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaintBrush,
  faShareNodes,
  faRotateLeft,
  faCheck,
  faChevronDown,
  faChevronUp,
  faLink,
} from "@fortawesome/free-solid-svg-icons";
import { useDesign } from "../context/DesignContext";
import type { FontFamily, ClusterStyle, TilePreset } from "../types";

const FONTS: { value: FontFamily; label: string }[] = [
  { value: "Libre Franklin", label: "Libre Franklin" },
  { value: "Atkinson Hyperlegible", label: "Atkinson Hyperlegible" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
];

const CLUSTER_STYLES: { value: ClusterStyle; label: string }[] = [
  { value: "donut", label: "Donut" },
  { value: "gradient", label: "Gradient" },
  { value: "minimal", label: "Minimal" },
];

const TILE_PRESETS: { value: TilePreset; label: string }[] = [
  { value: "stadia-watercolor", label: "Watercolor" },
  { value: "carto-light", label: "Carto Light" },
  { value: "carto-dark", label: "Carto Dark" },
  { value: "carto-voyager", label: "Carto Voyager" },
  { value: "osm-standard", label: "OpenStreetMap" },
  { value: "stadia-toner", label: "Toner" },
  { value: "stadia-toner-lite", label: "Toner Lite" },
  { value: "stadia-smooth", label: "Alidade Smooth" },
  { value: "stadia-outdoors", label: "Outdoors" },
];

const RATIOS = ["3fr 2fr", "1fr 1fr", "2fr 3fr", "2fr 1fr", "4fr 1fr"];

export default function DesignToolbar() {
  const { design, set, reset, getShareURL } = useDesign();
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState<"view" | "edit" | null>(null);

  const handleCopy = useCallback(
    (mode: "view" | "edit") => {
      const url = getShareURL(mode === "edit");
      navigator.clipboard.writeText(url).then(() => {
        setCopied(mode);
        setTimeout(() => setCopied(null), 2000);
      });
    },
    [getShareURL]
  );

  return (
    <div className="border-b border-gray-200 bg-gray-900 text-white text-xs select-none">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-semibold tracking-wide uppercase text-[11px] hover:text-gray-300 transition"
        >
          <FontAwesomeIcon icon={faPaintBrush} className="text-amber-400" />
          Design Mode
          <FontAwesomeIcon
            icon={expanded ? faChevronUp : faChevronDown}
            className="text-[9px] text-gray-400"
          />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition"
          >
            <FontAwesomeIcon icon={faRotateLeft} />
            Reset
          </button>
          <button
            onClick={() => handleCopy("view")}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium hover:bg-blue-500 transition"
          >
            <FontAwesomeIcon icon={copied === "view" ? faCheck : faShareNodes} />
            {copied === "view" ? "Copied!" : "Share"}
          </button>
          <button
            onClick={() => handleCopy("edit")}
            className="flex items-center gap-1.5 rounded bg-gray-700 px-2.5 py-1 text-[11px] font-medium hover:bg-gray-600 transition"
            title="Copy link with design toolbar visible"
          >
            <FontAwesomeIcon icon={copied === "edit" ? faCheck : faLink} />
            {copied === "edit" ? "Copied!" : "Share + Editor"}
          </button>
        </div>
      </div>

      {/* Controls */}
      {expanded && (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-gray-700 px-4 py-3">
          {/* Font */}
          <ControlGroup label="Font">
            <select
              value={design.fontFamily}
              onChange={(e) => set("fontFamily", e.target.value)}
              className="rounded bg-gray-800 border border-gray-600 px-2 py-1 text-xs text-white"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          {/* Tiles */}
          <ControlGroup label="Tiles">
            <select
              value={design.tilePreset}
              onChange={(e) => set("tilePreset", e.target.value)}
              className="rounded bg-gray-800 border border-gray-600 px-2 py-1 text-xs text-white"
            >
              {TILE_PRESETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          {/* Labels overlay */}
          <ControlGroup label="Labels">
            <ToggleSwitch
              checked={design.showLabels}
              onChange={(v) => set("showLabels", v)}
            />
          </ControlGroup>

          {/* Cluster Style */}
          <ControlGroup label="Clusters">
            <SegmentedControl
              options={CLUSTER_STYLES}
              value={design.clusterStyle}
              onChange={(v) => set("clusterStyle", v)}
            />
          </ControlGroup>

          {/* Ratio */}
          <ControlGroup label="Map / Table">
            <select
              value={design.mapTableRatio}
              onChange={(e) => set("mapTableRatio", e.target.value)}
              className="rounded bg-gray-800 border border-gray-600 px-2 py-1 text-xs text-white"
            >
              {RATIOS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </ControlGroup>

          {/* Border Radius */}
          <ControlGroup label="Radius">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={24}
                value={parseInt(design.borderRadius)}
                onChange={(e) => set("borderRadius", `${e.target.value}px`)}
                className="h-1 w-20 accent-blue-500"
              />
              <span className="w-8 text-right text-gray-400">{design.borderRadius}</span>
            </div>
          </ControlGroup>

          {/* Marker Size */}
          <ControlGroup label="Markers">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={20}
                max={60}
                value={design.markerSize}
                onChange={(e) => set("markerSize", parseInt(e.target.value))}
                className="h-1 w-20 accent-blue-500"
              />
              <span className="w-8 text-right text-gray-400">{design.markerSize}px</span>
            </div>
          </ControlGroup>

          {/* CO150 Border */}
          <ControlGroup label="Border">
            <ToggleSwitch
              checked={design.showBorder}
              onChange={(v) => set("showBorder", v)}
            />
          </ControlGroup>

          {/* Colors */}
          <ControlGroup label="Panel BG">
            <ColorInput
              value={design.panelBg}
              onChange={(v) => set("panelBg", v)}
            />
          </ControlGroup>

          <ControlGroup label="Page BG">
            <ColorInput
              value={design.pageBg}
              onChange={(v) => set("pageBg", v)}
            />
          </ControlGroup>

          <ControlGroup label="Text">
            <ColorInput
              value={design.textColor}
              onChange={(v) => set("textColor", v)}
            />
          </ControlGroup>

          <ControlGroup label="Muted">
            <ColorInput
              value={design.textMuted}
              onChange={(v) => set("textMuted", v)}
            />
          </ControlGroup>
        </div>
      )}
    </div>
  );
}

// ── Small helper components ─────────────────────────────────

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded overflow-hidden border border-gray-600">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-[11px] font-medium transition ${
            value === opt.value
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-gray-600 bg-transparent p-0"
      />
      <span className="text-gray-400">{value}</span>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-600"
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
