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
import type { DesignState, FontFamily, ClusterStyle, ClusterPlugin, PlacementStrategy, TilePreset, SfBtnPreset, SfBtnFillMode, DemoRotationMode, DemoRotationOrder, MarkerShape, MarkerConnector, MarkerPadding, CardConnectorPreset } from "../types";
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
  { value: "ring", label: "Ring" },
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

const MARKER_SHAPES: { value: MarkerShape; label: string }[] = [
  { value: "pin", label: "Pin" },
  { value: "rounded-square", label: "Rounded Square" },
  { value: "circle", label: "Circle" },
  { value: "stadium", label: "Stadium" },
  { value: "soft-diamond", label: "Diamond" },
  { value: "shield", label: "Shield" },
];

const MARKER_CONNECTORS: { value: MarkerConnector; label: string }[] = [
  { value: "stem", label: "Stem" },
  { value: "dot", label: "Dot" },
  { value: "none", label: "None" },
];

const MARKER_PADDINGS: { value: MarkerPadding; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "spacious", label: "Spacious" },
];

const CARD_CONNECTOR_PRESETS: { value: CardConnectorPreset; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "retro-3d", label: "Retro 3D" },
];

const CLUSTER_PLUGINS: { value: ClusterPlugin; label: string }[] = [
  { value: "react-leaflet-cluster", label: "React Cluster" },
  { value: "leaflet-markercluster", label: "Native Cluster" },
  { value: "none", label: "None (no clustering)" },
];

const PLACEMENT_STRATEGIES: { value: PlacementStrategy; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "clock", label: "Clock" },
  { value: "concentric", label: "Concentric" },
  { value: "spiral", label: "Spiral" },
  { value: "one-circle", label: "One Circle" },
];

const BTN_PRESETS: { value: SfBtnPreset; label: string }[] = [
  { value: "filled", label: "Filled" },
  { value: "outlined", label: "Outlined" },
  { value: "ghost", label: "Ghost" },
  { value: "pill", label: "Pill" },
  { value: "minimal", label: "Minimal" },
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
              <Field label="Cluster Plugin">
                <select
                  value={design.clusterPlugin}
                  onChange={(e) => set("clusterPlugin", e.target.value as ClusterPlugin)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                >
                  {CLUSTER_PLUGINS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>
              {design.clusterPlugin === "leaflet-markercluster" && (
                <>
                  <Field label="Max Cluster Radius">
                    <Slider
                      min={20}
                      max={150}
                      step={5}
                      value={design.clusterMaxRadius}
                      onChange={(v) => set("clusterMaxRadius", v)}
                      suffix="px"
                    />
                  </Field>
                  <Field label="Disable at Zoom">
                    <Slider
                      min={10}
                      max={18}
                      step={1}
                      value={design.clusterDisableAtZoom}
                      onChange={(v) => set("clusterDisableAtZoom", v)}
                    />
                  </Field>
                  <Field label="Placement Strategy">
                    <select
                      value={design.clusterPlacementStrategy}
                      onChange={(e) => set("clusterPlacementStrategy", e.target.value as PlacementStrategy)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                    >
                      {PLACEMENT_STRATEGIES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Show List on Hover">
                    <ToggleSwitch
                      checked={design.clusterShowList}
                      onChange={(v) => set("clusterShowList", v)}
                    />
                  </Field>
                  <Field label="Animate">
                    <ToggleSwitch
                      checked={design.clusterAnimate}
                      onChange={(v) => set("clusterAnimate", v)}
                    />
                  </Field>
                  <Field label="Zoom to Bounds">
                    <ToggleSwitch
                      checked={design.clusterZoomToBoundsOnClick}
                      onChange={(v) => set("clusterZoomToBoundsOnClick", v)}
                    />
                  </Field>
                  <Field label="Coverage on Hover">
                    <ToggleSwitch
                      checked={design.clusterShowCoverageOnHover}
                      onChange={(v) => set("clusterShowCoverageOnHover", v)}
                    />
                  </Field>
                </>
              )}
              <Field label="Dot Mode">
                <ToggleSwitch
                  checked={design.dotMode}
                  onChange={(v) => set("dotMode", v)}
                />
              </Field>
              {design.dotMode && (
                <Field label="Dot Size">
                  <Slider
                    min={4}
                    max={16}
                    step={1}
                    value={design.dotSize}
                    onChange={(v) => set("dotSize", v)}
                    suffix="px"
                  />
                </Field>
              )}
              <p className="text-[11px] text-gray-400 italic">
                Dot mode shows simple dots for all markers. Selected or highlighted points expand to full markers.
              </p>
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
              <Field label="Marker Shape">
                <select
                  value={design.markerShape}
                  onChange={(e) => set("markerShape", e.target.value as MarkerShape)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                >
                  {MARKER_SHAPES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Connector">
                <SegmentedControl
                  options={MARKER_CONNECTORS}
                  value={design.markerConnector}
                  onChange={(v) => set("markerConnector", v)}
                />
              </Field>
              <Field label="Icon Padding">
                <SegmentedControl
                  options={MARKER_PADDINGS}
                  value={design.markerPadding}
                  onChange={(v) => set("markerPadding", v)}
                />
              </Field>
              {design.pointColorMode === "by-category" && categories.length > 0 && (
                <Field label="Per-Category Shapes">
                  <div className="space-y-1.5">
                    {categories.map((cat) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="flex-1 truncate text-xs text-gray-600">{cat}</span>
                        <select
                          value={design.categoryShapes[cat] || design.markerShape}
                          onChange={(e) => {
                            const val = e.target.value as MarkerShape;
                            const updated = { ...design.categoryShapes };
                            if (val === design.markerShape) {
                              delete updated[cat];
                            } else {
                              updated[cat] = val;
                            }
                            set("categoryShapes", updated);
                          }}
                          className="w-28 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700"
                        >
                          {MARKER_SHAPES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </Field>
              )}
              <Field label="Fly-to Zoom Level">
                <Slider
                  min={8}
                  max={18}
                  step={1}
                  value={design.flyToZoom}
                  onChange={(v) => set("flyToZoom", v)}
                />
              </Field>
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
                <>
                  <Field label="Button Style">
                    <select
                      value={design.sfBtnPreset}
                      onChange={(e) => set("sfBtnPreset", e.target.value as SfBtnPreset)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                    >
                      {BTN_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {design.sfBtnPreset === "filled" && (
                    <>
                      <Field label="Fill Color Mode">
                        <SegmentedControl<SfBtnFillMode>
                          options={[
                            { value: "by-category", label: "By Category" },
                            { value: "single", label: "Single Color" },
                          ]}
                          value={design.sfBtnFillMode}
                          onChange={(v) => set("sfBtnFillMode", v)}
                        />
                      </Field>
                      {design.sfBtnFillMode === "single" && (
                        <Field label="Fill Color">
                          <ColorPicker
                            value={design.sfBtnFillColor}
                            onChange={(v) => set("sfBtnFillColor", v)}
                          />
                        </Field>
                      )}
                    </>
                  )}
                  <Field label="Sidebar Width">
                    <input
                      type="text"
                      value={design.sfSidebarWidth}
                      onChange={(e) => set("sfSidebarWidth", e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                      placeholder="200px"
                    />
                  </Field>
                  <Field label="Button Font Size">
                    <Slider
                      min={10}
                      max={18}
                      step={1}
                      value={design.sfBtnFontSize}
                      onChange={(v) => set("sfBtnFontSize", v)}
                    />
                  </Field>
                  <Field label="Button Padding">
                    <input
                      type="text"
                      value={design.sfBtnPadding}
                      onChange={(e) => set("sfBtnPadding", e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                      placeholder="8px 10px"
                    />
                  </Field>
                  <Field label="Button Border Radius">
                    <input
                      type="text"
                      value={design.sfBtnBorderRadius}
                      onChange={(e) => set("sfBtnBorderRadius", e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                      placeholder="8px"
                    />
                  </Field>
                  <Field label="Button Gap">
                    <input
                      type="text"
                      value={design.sfBtnGap}
                      onChange={(e) => set("sfBtnGap", e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                      placeholder="4px"
                    />
                  </Field>
                  <Field label="Wrap Labels">
                    <ToggleSwitch
                      checked={design.sfLabelWrap}
                      onChange={(v) => set("sfLabelWrap", v)}
                    />
                  </Field>
                </>
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
                <>
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
                <Field label="Category Display">
                  <SegmentedControl
                    options={[
                      { value: "text" as const, label: "Text" },
                      { value: "icon" as const, label: "Icon" },
                      { value: "both" as const, label: "Both" },
                    ]}
                    value={design.categoryDisplayMode}
                    onChange={(v) => set("categoryDisplayMode", v)}
                  />
                </Field>
                </>
              )}
            </div>
          </AccordionSection>

          {/* ── Card ── */}
          <AccordionSection title="Card">
            <div className="space-y-3">
              <Field label="Border Radius">
                <Slider
                  min={0}
                  max={24}
                  step={1}
                  value={design.cardBorderRadius}
                  onChange={(v) => set("cardBorderRadius", v)}
                  suffix="px"
                />
              </Field>
              <Field label="Background">
                <ColorPicker
                  value={design.cardBgColor}
                  onChange={(v) => set("cardBgColor", v)}
                />
              </Field>
              <Field label="Shadow">
                <ToggleSwitch
                  checked={design.cardShadow}
                  onChange={(v) => set("cardShadow", v)}
                />
              </Field>
            </div>
          </AccordionSection>

          {/* ── Card Connector ── */}
          <AccordionSection title="Card Connector">
            <div className="space-y-3">
              <Field label="Style">
                <SegmentedControl
                  options={CARD_CONNECTOR_PRESETS}
                  value={design.cardConnectorPreset}
                  onChange={(v) => set("cardConnectorPreset", v)}
                />
              </Field>
              {design.cardConnectorPreset === "simple" && (
                <>
                  <Field label="Line Color">
                    <ColorPicker
                      value={design.cardConnectorColor}
                      onChange={(v) => set("cardConnectorColor", v)}
                    />
                  </Field>
                  <Field label="Line Width">
                    <Slider
                      min={1}
                      max={6}
                      step={0.5}
                      value={design.cardConnectorWidth}
                      onChange={(v) => set("cardConnectorWidth", v)}
                      suffix="px"
                    />
                  </Field>
                  <Field label="Dashed">
                    <ToggleSwitch
                      checked={design.cardConnectorDash}
                      onChange={(v) => set("cardConnectorDash", v)}
                    />
                  </Field>
                </>
              )}
              {design.cardConnectorPreset === "retro-3d" && (
                <>
                  <Field label="Face Color">
                    <ColorPicker
                      value={design.cardFaceColor}
                      onChange={(v) => set("cardFaceColor", v)}
                    />
                  </Field>
                  <Field label="Face Opacity">
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={design.cardFaceOpacity}
                      onChange={(v) => set("cardFaceOpacity", v)}
                    />
                  </Field>
                  <Field label="Edge Color">
                    <ColorPicker
                      value={design.cardEdgeColor}
                      onChange={(v) => set("cardEdgeColor", v)}
                    />
                  </Field>
                  <Field label="Edge Width">
                    <Slider
                      min={0}
                      max={4}
                      step={0.5}
                      value={design.cardEdgeWidth}
                      onChange={(v) => set("cardEdgeWidth", v)}
                      suffix="px"
                    />
                  </Field>
                  <Field label="Edge Opacity">
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={design.cardEdgeOpacity}
                      onChange={(v) => set("cardEdgeOpacity", v)}
                    />
                  </Field>
                  <Field label="Connector Inset">
                    <Slider
                      min={-12}
                      max={12}
                      step={1}
                      value={design.cardConnectorInset}
                      onChange={(v) => set("cardConnectorInset", v)}
                      suffix="px"
                    />
                  </Field>
                </>
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
                <>
                  <Field label="Rotation Mode">
                    <SegmentedControl<DemoRotationMode>
                      options={[
                        { value: "by-category", label: "By Category" },
                        { value: "by-point", label: "By Point" },
                      ]}
                      value={design.demoRotationMode}
                      onChange={(v) => set("demoRotationMode", v)}
                    />
                  </Field>
                  <Field label="Rotation Order">
                    <SegmentedControl<DemoRotationOrder>
                      options={[
                        { value: "sequential", label: "Sequential" },
                        { value: "shuffled", label: "Shuffled" },
                      ]}
                      value={design.demoRotationOrder}
                      onChange={(v) => set("demoRotationOrder", v)}
                    />
                  </Field>
                  <Field label="Category Interval">
                    <Slider
                      min={2000}
                      max={10000}
                      step={500}
                      value={design.demoIntervalMs}
                      onChange={(v) => set("demoIntervalMs", v)}
                      format={(v) => `${(v / 1000).toFixed(1)}s`}
                    />
                  </Field>
                  {design.demoRotationMode === "by-point" && (
                    <Field label="Point Interval">
                      <Slider
                        min={3000}
                        max={15000}
                        step={500}
                        value={design.demoPointIntervalMs}
                        onChange={(v) => set("demoPointIntervalMs", v)}
                        format={(v) => `${(v / 1000).toFixed(1)}s`}
                      />
                    </Field>
                  )}
                </>
              )}
              {design.enableDemoMode && (
                <>
                  <Field label="Highlight Style">
                    <div className="flex rounded-md border border-gray-300 overflow-hidden text-xs">
                      {(["filter", "dim"] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => set("demoHighlightStyle", style)}
                          className={`flex-1 px-3 py-1.5 font-medium capitalize ${
                            design.demoHighlightStyle === style
                              ? "bg-gray-800 text-white"
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {style === "filter" ? "Filter" : "Dim"}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {design.demoHighlightStyle === "dim" && (
                    <>
                      <Field label="Dim Opacity">
                        <Slider
                          min={0.1}
                          max={0.5}
                          step={0.05}
                          value={design.demoDimOpacity}
                          onChange={(v) => set("demoDimOpacity", v)}
                          format={(v) => v.toFixed(2)}
                        />
                      </Field>
                      <Field label="Dim Table Rows">
                        <ToggleSwitch
                          checked={design.demoDimTable}
                          onChange={(v) => set("demoDimTable", v)}
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
              {design.enableDemoMode && (
                <Field label="Transition Speed">
                  <Slider
                    min={100}
                    max={800}
                    step={50}
                    value={design.transitionSpeed}
                    onChange={(v) => set("transitionSpeed", v)}
                    format={(v) => `${v}ms`}
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
