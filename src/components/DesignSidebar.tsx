import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateLeft,
  faShareNodes,
  faCheck,
  faLink,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { useDesign } from "../context/DesignContext";
import type { FontFamily, ClusterStyle, TilePreset } from "../types";
import AccordionSection from "./AccordionSection";

// ── Option lists ────────────────────────────────────────────

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
  { value: "carto-voyager", label: "Voyager" },
  { value: "carto-light", label: "Carto Light" },
  { value: "carto-dark", label: "Carto Dark" },
  { value: "osm-standard", label: "OpenStreetMap" },
  { value: "stadia-watercolor", label: "Watercolor" },
  { value: "stadia-toner", label: "Toner" },
  { value: "stadia-toner-lite", label: "Toner Lite" },
  { value: "stadia-smooth", label: "Alidade Smooth" },
  { value: "stadia-outdoors", label: "Outdoors" },
  { value: "stadia-terrain", label: "Terrain" },
];

const RATIOS = ["3fr 2fr", "1fr 1fr", "2fr 3fr", "2fr 1fr", "4fr 1fr"];

// ── Main Component ──────────────────────────────────────────

interface DesignSidebarProps {
  onClose: () => void;
}

export default function DesignSidebar({ onClose }: DesignSidebarProps) {
  const { design, set, reset, getShareURL } = useDesign();
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
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Design</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={reset}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            title="Reset to defaults"
          >
            <FontAwesomeIcon icon={faRotateLeft} />
          </button>
          <button
            onClick={() => handleCopy("view")}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            title="Copy share link"
          >
            <FontAwesomeIcon icon={copied === "view" ? faCheck : faShareNodes} />
          </button>
          <button
            onClick={() => handleCopy("edit")}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            title="Copy link with editor"
          >
            <FontAwesomeIcon icon={copied === "edit" ? faCheck : faLink} />
          </button>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Close sidebar"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      {/* Scrollable accordion sections */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Projection ── */}
        <AccordionSection title="Projection" defaultOpen>
          <div className="space-y-3">
            <Field label="Tile Layer">
              <select
                value={design.tilePreset}
                onChange={(e) => set("tilePreset", e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
              >
                {TILE_PRESETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Labels Overlay">
              <ToggleSwitch
                checked={design.showLabels}
                onChange={(v) => set("showLabels", v)}
              />
            </Field>
          </div>
        </AccordionSection>

        {/* ── Regions Layer ── */}
        <AccordionSection title="Regions layer">
          <div className="space-y-3">
            <Field label="County Lines">
              <ToggleSwitch
                checked={design.showCountyLines}
                onChange={(v) => set("showCountyLines", v)}
              />
            </Field>
            {design.showCountyLines && (
              <>
                <Field label="Line Color">
                  <ColorInput
                    value={design.countyLineColor}
                    onChange={(v) => set("countyLineColor", v)}
                  />
                </Field>
                <Field label="Line Weight">
                  <Slider
                    min={0.5}
                    max={4}
                    step={0.5}
                    value={design.countyLineWeight}
                    onChange={(v) => set("countyLineWeight", v)}
                    suffix=""
                  />
                </Field>
                <Field label="Opacity">
                  <Slider
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={design.countyLineOpacity}
                    onChange={(v) => set("countyLineOpacity", v)}
                    format={(v) => v.toFixed(1)}
                  />
                </Field>
              </>
            )}
          </div>
        </AccordionSection>

        {/* ── Points Layer ── */}
        <AccordionSection title="Points layer">
          <div className="space-y-3">
            <Field label="Cluster Style">
              <SegmentedControl
                options={CLUSTER_STYLES}
                value={design.clusterStyle}
                onChange={(v) => set("clusterStyle", v)}
              />
            </Field>
            <Field label="Marker Size">
              <Slider
                min={20}
                max={60}
                step={1}
                value={design.markerSize}
                onChange={(v) => set("markerSize", v)}
                suffix="px"
              />
            </Field>
          </div>
        </AccordionSection>

        {/* ── Globe & Graticule Layers ── */}
        <AccordionSection title="Globe & graticule layers">
          <div className="space-y-3">
            <Field label="State Border">
              <ToggleSwitch
                checked={design.showStateBorder}
                onChange={(v) => set("showStateBorder", v)}
              />
            </Field>
            {design.showStateBorder && (
              <>
                <Field label="Border Color">
                  <ColorInput
                    value={design.stateBorderColor}
                    onChange={(v) => set("stateBorderColor", v)}
                  />
                </Field>
                <Field label="Border Weight">
                  <Slider
                    min={1}
                    max={8}
                    step={1}
                    value={design.stateBorderWeight}
                    onChange={(v) => set("stateBorderWeight", v)}
                    suffix="px"
                  />
                </Field>
              </>
            )}
            <Field label="Outside Fade">
              <ToggleSwitch
                checked={design.showOutsideFade}
                onChange={(v) => set("showOutsideFade", v)}
              />
            </Field>
            {design.showOutsideFade && (
              <Field label="Fade Opacity">
                <Slider
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={design.outsideFadeOpacity}
                  onChange={(v) => set("outsideFadeOpacity", v)}
                  format={(v) => v.toFixed(2)}
                />
              </Field>
            )}
          </div>
        </AccordionSection>

        {/* ── Layout ── */}
        <AccordionSection title="Layout">
          <div className="space-y-3">
            <Field label="Map / Table Ratio">
              <select
                value={design.mapTableRatio}
                onChange={(e) => set("mapTableRatio", e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
              >
                {RATIOS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Font">
              <select
                value={design.fontFamily}
                onChange={(e) => set("fontFamily", e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Border Radius">
              <Slider
                min={0}
                max={24}
                step={1}
                value={parseInt(design.borderRadius)}
                onChange={(v) => set("borderRadius", `${v}px`)}
                suffix="px"
              />
            </Field>
            <Field label="CO150 Border">
              <ToggleSwitch
                checked={design.showBorder}
                onChange={(v) => set("showBorder", v)}
              />
            </Field>
          </div>
        </AccordionSection>

        {/* ── Colors ── */}
        <AccordionSection title="Colors">
          <div className="space-y-3">
            <Field label="Panel Background">
              <ColorInput
                value={design.panelBg}
                onChange={(v) => set("panelBg", v)}
              />
            </Field>
            <Field label="Page Background">
              <ColorInput
                value={design.pageBg}
                onChange={(v) => set("pageBg", v)}
              />
            </Field>
            <Field label="Text Color">
              <ColorInput
                value={design.textColor}
                onChange={(v) => set("textColor", v)}
              />
            </Field>
            <Field label="Muted Text">
              <ColorInput
                value={design.textMuted}
                onChange={(v) => set("textMuted", v)}
              />
            </Field>
          </div>
        </AccordionSection>

        {/* Placeholder sections for future phases */}
        <AccordionSection title="Controls">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        <AccordionSection title="Popups & panels">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        <AccordionSection title="Search box">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        <AccordionSection title="Legend">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        <AccordionSection title="Zoom">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        <AccordionSection title="Header">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        <AccordionSection title="Footer">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        <AccordionSection title="Accessibility">
          <p className="text-xs text-gray-400 italic">Coming soon</p>
        </AccordionSection>

        {/* ── Demo ── */}
        <AccordionSection title="Demo">
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Add <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">?demo=1</code> to
              the embed URL to activate auto-rotate mode.
            </p>
            <Field label="Rotation Interval">
              <Slider
                min={2000}
                max={10000}
                step={500}
                value={design.demoIntervalMs}
                onChange={(v) => set("demoIntervalMs", v)}
                format={(v) => `${(v / 1000).toFixed(1)}s`}
              />
            </Field>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}

// ── Shared control components ───────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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
    <div className="flex rounded-md overflow-hidden border border-gray-300">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
            value === opt.value
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
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
        className="h-6 w-6 cursor-pointer rounded border border-gray-300 bg-transparent p-0"
      />
      <span className="text-xs text-gray-500 font-mono">{value}</span>
    </div>
  );
}

function Slider({
  min,
  max,
  step,
  value,
  onChange,
  suffix = "",
  format,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  format?: (v: number) => string;
}) {
  const display = format ? format(value) : String(value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-20 accent-blue-500"
      />
      <span className="w-12 text-right text-xs text-gray-500">
        {display}{suffix}
      </span>
    </div>
  );
}
