import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateLeft,
  faShareNodes,
  faCheck,
  faLink,
  faTimes,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { useDesign } from "../context/DesignContext";
import type { DesignState, FontFamily, ClusterStyle, TilePreset } from "../types";
import AccordionSection from "./AccordionSection";
import SidebarGroup from "./SidebarGroup";
import ColorPicker, { CARBON_CATEGORICAL } from "./ColorPicker";

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
  { value: "carto-voyager-nolabels", label: "Voyager (no labels)" },
  { value: "carto-light", label: "Carto Light" },
  { value: "carto-light-nolabels", label: "Carto Light (no labels)" },
  { value: "carto-dark", label: "Carto Dark" },
  { value: "carto-dark-nolabels", label: "Carto Dark (no labels)" },
  { value: "osm-standard", label: "OpenStreetMap" },
  { value: "stadia-watercolor", label: "Watercolor" },
  { value: "stadia-toner", label: "Toner" },
  { value: "stadia-toner-lite", label: "Toner Lite" },
  { value: "stadia-toner-nolabels", label: "Toner (no labels)" },
  { value: "stadia-smooth", label: "Alidade Smooth" },
  { value: "stadia-outdoors", label: "Outdoors" },
  { value: "stadia-terrain", label: "Terrain" },
  { value: "stadia-terrain-nolabels", label: "Terrain (no labels)" },
];

const RATIOS = ["3fr 2fr", "1fr 1fr", "2fr 3fr", "2fr 1fr", "4fr 1fr"];

const DESKTOP_ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 — Widescreen" },
  { value: "3:2", label: "3:2 — Standard" },
  { value: "4:3", label: "4:3 — Classic" },
  { value: "1:1", label: "1:1 — Square" },
  { value: "2:3", label: "2:3 — Tall" },
];

const MOBILE_ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 — Square" },
  { value: "3:4", label: "3:4 — Compact" },
  { value: "9:16", label: "9:16 — Full Screen" },
  { value: "2:3", label: "2:3 — Tall" },
];

const LABEL_FONTS: { value: string; label: string }[] = [
  { value: "inherit", label: "Same as map font" },
  { value: "Libre Franklin", label: "Libre Franklin" },
  { value: "Atkinson Hyperlegible", label: "Atkinson Hyperlegible" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
];

const DASH_PATTERNS: { value: string; label: string }[] = [
  { value: "", label: "Solid" },
  { value: "6 3", label: "Dashed" },
  { value: "2 4", label: "Dotted" },
  { value: "10 5 2 5", label: "Dash-dot" },
];

// ── Main Component ──────────────────────────────────────────

interface DesignSidebarProps {
  onClose: () => void;
  /** Distinct categories from current point data, used for by-category color mode */
  categories?: string[];
}

export default function DesignSidebar({ onClose, categories = [] }: DesignSidebarProps) {
  const { design, set, reset, getShareURL } = useDesign();
  const [copied, setCopied] = useState<"view" | "edit" | null>(null);
  const [openGroup, setOpenGroup] = useState<"layers" | "design">("layers");

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
      <div className="flex-1 overflow-y-auto pb-48">

        {/* ════════════ LAYERS ════════════ */}
        <SidebarGroup title="Layers" open={openGroup === "layers"} onToggle={() => setOpenGroup("layers")}>

          {/* ── Tiles ── */}
          <AccordionSection title="Tiles" defaultOpen>
            <div className="space-y-3">
              <Field label="Tile Layer">
                <select
                  value={design.tilePreset}
                  onChange={(e) => set("tilePreset", e.target.value as DesignState["tilePreset"])}
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

          {/* ── Labels Layer ── */}
          <AccordionSection title="Labels">
            <div className="space-y-3">
              <Field label="Label Font">
                <select
                  value={design.labelFont}
                  onChange={(e) => set("labelFont", e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                >
                  {LABEL_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Elevation Units">
                <SegmentedControl
                  options={[
                    { value: "false", label: "Feet" },
                    { value: "true", label: "Meters" },
                  ]}
                  value={String(design.useMetricUnits)}
                  onChange={(v) => set("useMetricUnits", v === "true")}
                />
              </Field>
            </div>
          </AccordionSection>

          {/* ── Regions Layer ── */}
          <AccordionSection title="Regions">
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
                    <ColorPicker
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
          <AccordionSection title="Points">
            <div className="space-y-3">
              <Field label="Color Mode">
                <SegmentedControl
                  options={[
                    { value: "single" as const, label: "Single" },
                    { value: "by-category" as const, label: "By Category" },
                  ]}
                  value={design.pointColorMode}
                  onChange={(v) => {
                    set("pointColorMode", v);
                    // Auto-assign category colors on first switch
                    if (v === "by-category" && categories.length > 0) {
                      const existing = design.categoryColors;
                      const updated = { ...existing };
                      let needsUpdate = false;
                      categories.forEach((cat, i) => {
                        if (!updated[cat]) {
                          updated[cat] = CARBON_CATEGORICAL[i % CARBON_CATEGORICAL.length];
                          needsUpdate = true;
                        }
                      });
                      if (needsUpdate) set("categoryColors", updated);
                    }
                  }}
                />
              </Field>
              {design.pointColorMode === "single" ? (
                <Field label="Point Color">
                  <ColorPicker
                    value={design.pointColor}
                    onChange={(v) => set("pointColor", v)}
                  />
                </Field>
              ) : (
                <CategoryColorList
                  categories={categories}
                  categoryColors={design.categoryColors}
                  onChangeColor={(cat, color) => {
                    set("categoryColors", { ...design.categoryColors, [cat]: color });
                  }}
                />
              )}
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

          {/* ── Roads Layer ── */}
          <AccordionSection title="Roads">
            <div className="space-y-3">
              <Field label="Show Roads">
                <ToggleSwitch
                  checked={design.showRoads}
                  onChange={(v) => set("showRoads", v)}
                />
              </Field>
              {design.showRoads && (
                <>
                  <Field label="Road Types">
                    <div className="flex flex-wrap gap-1">
                      <TogglePill
                        label="Motorways"
                        checked={design.showMotorways}
                        onChange={(v) => set("showMotorways", v)}
                      />
                      <TogglePill
                        label="Trunk"
                        checked={design.showTrunkRoads}
                        onChange={(v) => set("showTrunkRoads", v)}
                      />
                      <TogglePill
                        label="Primary"
                        checked={design.showPrimaryRoads}
                        onChange={(v) => set("showPrimaryRoads", v)}
                      />
                      <TogglePill
                        label="Secondary"
                        checked={design.showSecondaryRoads}
                        onChange={(v) => set("showSecondaryRoads", v)}
                      />
                      <TogglePill
                        label="Tertiary"
                        checked={design.showTertiaryRoads}
                        onChange={(v) => set("showTertiaryRoads", v)}
                      />
                    </div>
                  </Field>
                  <Field label="Color">
                    <ColorPicker
                      value={design.roadColor}
                      onChange={(v) => set("roadColor", v)}
                    />
                  </Field>
                  <Field label="Weight">
                    <Slider
                      min={1}
                      max={8}
                      step={0.5}
                      value={design.roadWeight}
                      onChange={(v) => set("roadWeight", v)}
                      suffix="px"
                    />
                  </Field>
                  <Field label="Opacity">
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={design.roadOpacity}
                      onChange={(v) => set("roadOpacity", v)}
                      format={(v) => v.toFixed(1)}
                    />
                  </Field>
                  <Field label="Dash Pattern">
                    <select
                      value={design.roadDashArray}
                      onChange={(e) => set("roadDashArray", e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                    >
                      {DASH_PATTERNS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="text-[11px] text-gray-400 italic">
                    Click a road on the map to override its style.
                  </p>
                </>
              )}
            </div>
          </AccordionSection>

          {/* ── Waterways Layer ── */}
          <AccordionSection title="Waterways">
            <div className="space-y-3">
              <Field label="Show Waterways">
                <ToggleSwitch
                  checked={design.showWaterways}
                  onChange={(v) => set("showWaterways", v)}
                />
              </Field>
              {design.showWaterways && (
                <>
                  <Field label="Waterway Types">
                    <div className="flex flex-wrap gap-1">
                      <TogglePill
                        label="Rivers"
                        checked={design.showRivers}
                        onChange={(v) => set("showRivers", v)}
                      />
                      <TogglePill
                        label="Streams"
                        checked={design.showStreams}
                        onChange={(v) => set("showStreams", v)}
                      />
                    </div>
                  </Field>
                  <Field label="Color">
                    <ColorPicker
                      value={design.waterwayColor}
                      onChange={(v) => set("waterwayColor", v)}
                    />
                  </Field>
                  <Field label="Weight">
                    <Slider
                      min={1}
                      max={8}
                      step={0.5}
                      value={design.waterwayWeight}
                      onChange={(v) => set("waterwayWeight", v)}
                      suffix="px"
                    />
                  </Field>
                  <Field label="Opacity">
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={design.waterwayOpacity}
                      onChange={(v) => set("waterwayOpacity", v)}
                      format={(v) => v.toFixed(1)}
                    />
                  </Field>
                  <p className="text-[11px] text-gray-400 italic">
                    Click a waterway on the map to override its style.
                  </p>
                </>
              )}
            </div>
          </AccordionSection>

          {/* ── Parks Layer ── */}
          <AccordionSection title="Parks">
            <div className="space-y-3">
              <Field label="Show Parks">
                <ToggleSwitch
                  checked={design.showParks}
                  onChange={(v) => set("showParks", v)}
                />
              </Field>
              {design.showParks && (
                <>
                  <Field label="Color">
                    <ColorPicker
                      value={design.parkColor}
                      onChange={(v) => set("parkColor", v)}
                    />
                  </Field>
                  <Field label="Opacity">
                    <Slider
                      min={0.1}
                      max={0.8}
                      step={0.05}
                      value={design.parkOpacity}
                      onChange={(v) => set("parkOpacity", v)}
                      format={(v) => v.toFixed(2)}
                    />
                  </Field>
                </>
              )}
            </div>
          </AccordionSection>

          {/* ── Lakes Layer ── */}
          <AccordionSection title="Lakes">
            <div className="space-y-3">
              <Field label="Show Lakes">
                <ToggleSwitch
                  checked={design.showLakes}
                  onChange={(v) => set("showLakes", v)}
                />
              </Field>
              {design.showLakes && (
                <>
                  <Field label="Color">
                    <ColorPicker
                      value={design.lakeColor}
                      onChange={(v) => set("lakeColor", v)}
                    />
                  </Field>
                  <Field label="Opacity">
                    <Slider
                      min={0.1}
                      max={0.8}
                      step={0.05}
                      value={design.lakeOpacity}
                      onChange={(v) => set("lakeOpacity", v)}
                      format={(v) => v.toFixed(2)}
                    />
                  </Field>
                </>
              )}
            </div>
          </AccordionSection>

          {/* ── Cities Layer ── */}
          <AccordionSection title="Cities & Peaks">
            <div className="space-y-3">
              <Field label="Show Cities & Peaks">
                <ToggleSwitch
                  checked={design.showCities}
                  onChange={(v) => set("showCities", v)}
                />
              </Field>
              {design.showCities && (
                <>
                  <Field label="Label Types">
                    <div className="flex flex-wrap gap-1">
                      <TogglePill
                        label="Cities"
                        checked={design.showCityLabels}
                        onChange={(v) => set("showCityLabels", v)}
                      />
                      <TogglePill
                        label="Peaks"
                        checked={design.showPeakLabels}
                        onChange={(v) => set("showPeakLabels", v)}
                      />
                    </div>
                  </Field>
                  <Field label="Label Color">
                    <ColorPicker
                      value={design.cityColor}
                      onChange={(v) => set("cityColor", v)}
                    />
                  </Field>
                  <Field label="Font Size">
                    <Slider
                      min={8}
                      max={20}
                      step={1}
                      value={design.cityFontSize}
                      onChange={(v) => set("cityFontSize", v)}
                      suffix="px"
                    />
                  </Field>
                  <p className="text-[11px] text-gray-400 italic">
                    Click a city or peak label to override its style or hide it.
                  </p>
                </>
              )}
            </div>
          </AccordionSection>

          {/* ── State Border ── */}
          <AccordionSection title="State Border">
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
                    <ColorPicker
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

        </SidebarGroup>

        {/* ════════════ DESIGN ════════════ */}
        <SidebarGroup title="Design" open={openGroup === "design"} onToggle={() => setOpenGroup("design")}>

          {/* ── Template ── */}
          <AccordionSection title="Template">
            <div className="space-y-3">
              <Field label="Embed Template">
                <select
                  value={design.embedLayout}
                  onChange={(e) => set("embedLayout", e.target.value as DesignState["embedLayout"])}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                >
                  <option value="standard">Standard (map only)</option>
                  <option value="sidebar-filter">Sidebar Filter</option>
                </select>
              </Field>
              {design.embedLayout === "sidebar-filter" && (
                <p className="text-[11px] text-gray-400 italic">
                  Desktop: category sidebar + map + table. Mobile: horizontal category bar + map.
                </p>
              )}
            </div>
          </AccordionSection>

          {/* ── Data Table ── */}
          <AccordionSection title="Data Table">
            <div className="space-y-3">
              <Field label="Show Data Table">
                <ToggleSwitch
                  checked={design.showDataPanel}
                  onChange={(v) => set("showDataPanel", v)}
                />
              </Field>
              {design.showDataPanel && (
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
              )}
            </div>
          </AccordionSection>

          {/* ── Auto-Rotate ── */}
          <AccordionSection title="Auto-Rotate">
            <div className="space-y-3">
              <Field label="Enable Auto-Rotate">
                <ToggleSwitch
                  checked={design.enableDemoMode}
                  onChange={(v) => set("enableDemoMode", v)}
                />
              </Field>
              <p className="text-[11px] text-gray-400 italic">
                Automatically cycles through each category, spotlighting points one group at a time.
              </p>
              {design.enableDemoMode && (
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
              )}
            </div>
          </AccordionSection>

          {/* ── Typography ── */}
          <AccordionSection title="Typography">
            <div className="space-y-3">
              <Field label="Map Font">
                <select
                  value={design.fontFamily}
                  onChange={(e) => set("fontFamily", e.target.value as DesignState["fontFamily"])}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                >
                  {FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-[11px] text-gray-400 italic">
                Controls the default font for map popups and labels (when label font is set to &ldquo;Same as map font&rdquo;).
              </p>
            </div>
          </AccordionSection>

          {/* ── Colors ── */}
          <AccordionSection title="Colors">
            <div className="space-y-3">
              <Field label="Panel Background">
                <ColorPicker
                  value={design.panelBg}
                  onChange={(v) => set("panelBg", v)}
                />
              </Field>
              <Field label="Page Background">
                <ColorPicker
                  value={design.pageBg}
                  onChange={(v) => set("pageBg", v)}
                />
              </Field>
              <Field label="Text Color">
                <ColorPicker
                  value={design.textColor}
                  onChange={(v) => set("textColor", v)}
                />
              </Field>
              <Field label="Muted Text">
                <ColorPicker
                  value={design.textMuted}
                  onChange={(v) => set("textMuted", v)}
                />
              </Field>
            </div>
          </AccordionSection>

          {/* ── Sizing ── */}
          <AccordionSection title="Sizing">
            <div className="space-y-4">
              {/* Embed Aspect Ratio */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-600">Aspect Ratio</span>
                <AspectRatioSelector
                  desktopValue={design.embedAspectRatio}
                  mobileValue={design.embedMobileAspectRatio}
                  onDesktopChange={(v) => set("embedAspectRatio", v)}
                  onMobileChange={(v) => set("embedMobileAspectRatio", v)}
                />
              </div>

              {/* Embed Height */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-600">Height</span>
                <div className="flex items-center gap-2">
                  {design.embedHeightUnit !== "auto" && (
                    <input
                      type="number"
                      min={100}
                      max={2000}
                      value={design.embedHeight}
                      onChange={(e) => set("embedHeight", e.target.value)}
                      className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700"
                    />
                  )}
                  <select
                    value={design.embedHeightUnit}
                    onChange={(e) => set("embedHeightUnit", e.target.value as DesignState["embedHeightUnit"])}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                  >
                    <option value="auto">Auto (from ratio)</option>
                    <option value="px">px</option>
                    <option value="vh">vh</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-400 italic">
                  {design.embedHeightUnit === "auto"
                    ? "Height calculated from width \u00D7 aspect ratio."
                    : `Fixed height: ${design.embedHeight}${design.embedHeightUnit}.`}
                </p>
              </div>
            </div>
          </AccordionSection>

          {/* ── Frame ── */}
          <AccordionSection title="Frame">
            <div className="space-y-4">
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
              <Field label="Padding">
                <Slider
                  min={0}
                  max={32}
                  step={2}
                  value={design.embedPadding}
                  onChange={(v) => set("embedPadding", v)}
                  suffix="px"
                />
              </Field>
              {design.embedPadding > 0 && (
                <Field label="Padding Color">
                  <ColorPicker
                    value={design.pageBg}
                    onChange={(v) => set("pageBg", v)}
                  />
                </Field>
              )}
              <Field label="Margin">
                <Slider
                  min={0}
                  max={32}
                  step={2}
                  value={design.embedMargin}
                  onChange={(v) => set("embedMargin", v)}
                  suffix="px"
                />
              </Field>

              {/* Border options */}
              <Field label="CO150 Border">
                <ToggleSwitch
                  checked={design.showBorder}
                  onChange={(v) => {
                    set("showBorder", v);
                    if (v) set("showCustomBorder", false);
                  }}
                />
              </Field>
              <Field label="Custom Border">
                <ToggleSwitch
                  checked={design.showCustomBorder}
                  onChange={(v) => {
                    set("showCustomBorder", v);
                    if (v) set("showBorder", false);
                  }}
                />
              </Field>
              {design.showCustomBorder && (
                <>
                  <Field label="Border Style">
                    <select
                      value={design.customBorderStyle}
                      onChange={(e) => set("customBorderStyle", e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="double">Double</option>
                    </select>
                  </Field>
                  <Field label="Border Width">
                    <Slider
                      min={1}
                      max={8}
                      step={1}
                      value={design.customBorderWidth}
                      onChange={(v) => set("customBorderWidth", v)}
                      suffix="px"
                    />
                  </Field>
                  <Field label="Border Color">
                    <ColorPicker
                      value={design.customBorderColor}
                      onChange={(v) => set("customBorderColor", v)}
                    />
                  </Field>
                </>
              )}
            </div>
          </AccordionSection>

        </SidebarGroup>

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

/** Parse "W:H" to a numeric ratio (width / height). Returns 1 for invalid input. */
function parseRatio(ratio: string): number {
  const parts = ratio.split(":");
  if (parts.length !== 2) return 1;
  const w = parseFloat(parts[0]);
  const h = parseFloat(parts[1]);
  if (!w || !h) return 1;
  return w / h;
}

/** Small rectangle preview showing the aspect ratio visually. */
function RatioPreview({ ratio, label, maxW = 48, maxH = 36 }: { ratio: string; label?: string; maxW?: number; maxH?: number }) {
  const r = parseRatio(ratio);
  let w: number, h: number;
  if (r >= 1) {
    w = maxW;
    h = maxW / r;
    if (h > maxH) { h = maxH; w = maxH * r; }
  } else {
    h = maxH;
    w = maxH * r;
    if (w > maxW) { w = maxW; h = maxW / r; }
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="rounded border border-gray-300 bg-blue-50"
        style={{ width: `${w}px`, height: `${h}px` }}
      />
      {label && <span className="text-[9px] text-gray-400">{label}</span>}
    </div>
  );
}

function AspectRatioSelector({
  desktopValue,
  mobileValue,
  onDesktopChange,
  onMobileChange,
}: {
  desktopValue: string;
  mobileValue: string;
  onDesktopChange: (v: string) => void;
  onMobileChange: (v: string) => void;
}) {
  const isDesktopCustom = !DESKTOP_ASPECT_RATIOS.some((o) => o.value === desktopValue);
  const isMobileCustom = !MOBILE_ASPECT_RATIOS.some((o) => o.value === mobileValue);
  const [desktopCustomMode, setDesktopCustomMode] = useState(isDesktopCustom);
  const [mobileCustomMode, setMobileCustomMode] = useState(isMobileCustom);

  return (
    <div className="space-y-2">
      {/* Side-by-side desktop and mobile previews */}
      <div className="flex items-end justify-center gap-4">
        <RatioPreview ratio={desktopValue} label="Desktop" maxW={56} maxH={40} />
        <RatioPreview ratio={mobileValue} label="Mobile" maxW={28} maxH={48} />
      </div>

      {/* Desktop presets */}
      <div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Desktop</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {DESKTOP_ASPECT_RATIOS.map((o) => (
            <button
              key={o.value}
              onClick={() => { setDesktopCustomMode(false); onDesktopChange(o.value); }}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                !desktopCustomMode && desktopValue === o.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {o.value}
            </button>
          ))}
          <button
            onClick={() => setDesktopCustomMode(true)}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
              desktopCustomMode
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Custom
          </button>
          {desktopCustomMode && (
            <input
              type="text"
              value={desktopValue}
              onChange={(e) => onDesktopChange(e.target.value)}
              placeholder="W:H"
              className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
            />
          )}
        </div>
      </div>

      {/* Mobile presets */}
      <div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Mobile</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {MOBILE_ASPECT_RATIOS.map((o) => (
            <button
              key={`m-${o.value}`}
              onClick={() => { setMobileCustomMode(false); onMobileChange(o.value); }}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                !mobileCustomMode && mobileValue === o.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {o.value}
            </button>
          ))}
          <button
            onClick={() => setMobileCustomMode(true)}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
              mobileCustomMode
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Custom
          </button>
          {mobileCustomMode && (
            <input
              type="text"
              value={mobileValue}
              onChange={(e) => onMobileChange(e.target.value)}
              placeholder="W:H"
              className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryColorList({
  categories,
  categoryColors,
  onChangeColor,
}: {
  categories: string[];
  categoryColors: Record<string, string>;
  onChangeColor: (cat: string, color: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) {
    return <p className="text-[11px] text-gray-400 italic">Load point data to see categories.</p>;
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800"
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`text-[9px] transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        Categories ({categories.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5 pl-1">
          {categories.map((cat, i) => {
            const color = categoryColors[cat] || CARBON_CATEGORICAL[i % CARBON_CATEGORICAL.length];
            return (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600 truncate max-w-[120px]">{cat}</span>
                <ColorPicker value={color} onChange={(c) => onChangeColor(cat, c)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
