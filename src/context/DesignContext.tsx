import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { DesignState, ClusterStyle, FontFamily, TilePreset } from "../types";
import { DEFAULT_DESIGN } from "../config";

// ── URL param keys ──────────────────────────────────────────
const PARAM_MAP: Record<keyof DesignState, string> = {
  fontFamily: "font",
  clusterStyle: "clusters",
  tilePreset: "tiles",
  mapTableRatio: "ratio",
  mobileMapHeight: "mapH",
  borderRadius: "radius",
  panelBg: "panelBg",
  pageBg: "pageBg",
  textColor: "textColor",
  textMuted: "textMuted",
  showLabels: "labels",
  showBorder: "border",
  markerSize: "marker",
  showCountyLines: "county",
  countyLineColor: "countyColor",
  countyLineWeight: "countyW",
  countyLineOpacity: "countyOp",
  showStateBorder: "stateBorder",
  stateBorderColor: "stateColor",
  stateBorderWeight: "stateW",
  showOutsideFade: "fade",
  outsideFadeOpacity: "fadeOp",
  demoIntervalMs: "demoMs",
};

// ── Font shorthand mapping ──────────────────────────────────
const FONT_SHORTHAND: Record<string, FontFamily> = {
  "libre-franklin": "Libre Franklin",
  "atkinson": "Atkinson Hyperlegible",
  "jakarta": "Plus Jakarta Sans",
};
const FONT_TO_SHORT: Record<FontFamily, string> = {
  "Libre Franklin": "libre-franklin",
  "Atkinson Hyperlegible": "atkinson",
  "Plus Jakarta Sans": "jakarta",
};

// ── Parse design state from URL search params ───────────────
function parseFromURL(): Partial<DesignState> {
  const params = new URLSearchParams(window.location.search);
  const partial: Partial<DesignState> = {};

  const font = params.get(PARAM_MAP.fontFamily);
  if (font && FONT_SHORTHAND[font]) partial.fontFamily = FONT_SHORTHAND[font];

  const clusters = params.get(PARAM_MAP.clusterStyle);
  if (clusters && ["donut", "gradient", "minimal"].includes(clusters))
    partial.clusterStyle = clusters as ClusterStyle;

  const tiles = params.get(PARAM_MAP.tilePreset);
  const VALID_TILES: string[] = [
    "carto-light", "carto-dark", "carto-voyager", "osm-standard",
    "stadia-watercolor", "stadia-toner", "stadia-toner-lite",
    "stadia-smooth", "stadia-outdoors", "stadia-terrain",
  ];
  if (tiles && VALID_TILES.includes(tiles))
    partial.tilePreset = tiles as TilePreset;

  const ratio = params.get(PARAM_MAP.mapTableRatio);
  if (ratio) partial.mapTableRatio = ratio.replace(/_/g, " ");

  const mapH = params.get(PARAM_MAP.mobileMapHeight);
  if (mapH) partial.mobileMapHeight = mapH;

  const radius = params.get(PARAM_MAP.borderRadius);
  if (radius) partial.borderRadius = radius;

  const panelBg = params.get(PARAM_MAP.panelBg);
  if (panelBg) partial.panelBg = `#${panelBg}`;

  const pageBg = params.get(PARAM_MAP.pageBg);
  if (pageBg) partial.pageBg = `#${pageBg}`;

  const textColor = params.get(PARAM_MAP.textColor);
  if (textColor) partial.textColor = `#${textColor}`;

  const textMuted = params.get(PARAM_MAP.textMuted);
  if (textMuted) partial.textMuted = `#${textMuted}`;

  const showLabels = params.get(PARAM_MAP.showLabels);
  if (showLabels) partial.showLabels = showLabels === "1";

  const showBorder = params.get(PARAM_MAP.showBorder);
  if (showBorder) partial.showBorder = showBorder === "1";

  const markerSize = params.get(PARAM_MAP.markerSize);
  if (markerSize) partial.markerSize = parseInt(markerSize, 10);

  const showCounty = params.get(PARAM_MAP.showCountyLines);
  if (showCounty) partial.showCountyLines = showCounty === "1";

  const countyColor = params.get(PARAM_MAP.countyLineColor);
  if (countyColor) partial.countyLineColor = `#${countyColor}`;

  const countyW = params.get(PARAM_MAP.countyLineWeight);
  if (countyW) partial.countyLineWeight = parseFloat(countyW);

  const countyOp = params.get(PARAM_MAP.countyLineOpacity);
  if (countyOp) partial.countyLineOpacity = parseFloat(countyOp);

  const showState = params.get(PARAM_MAP.showStateBorder);
  if (showState) partial.showStateBorder = showState === "1";

  const stateColor = params.get(PARAM_MAP.stateBorderColor);
  if (stateColor) partial.stateBorderColor = `#${stateColor}`;

  const stateW = params.get(PARAM_MAP.stateBorderWeight);
  if (stateW) partial.stateBorderWeight = parseFloat(stateW);

  const showFade = params.get(PARAM_MAP.showOutsideFade);
  if (showFade) partial.showOutsideFade = showFade === "1";

  const fadeOp = params.get(PARAM_MAP.outsideFadeOpacity);
  if (fadeOp) partial.outsideFadeOpacity = parseFloat(fadeOp);

  const demoMs = params.get(PARAM_MAP.demoIntervalMs);
  if (demoMs) partial.demoIntervalMs = parseInt(demoMs, 10);

  return partial;
}

// ── Serialize design state to URL search params ─────────────
function serializeToURL(state: DesignState, includeDesignMode: boolean): string {
  const params = new URLSearchParams();

  // Only include values that differ from defaults
  if (state.fontFamily !== DEFAULT_DESIGN.fontFamily)
    params.set(PARAM_MAP.fontFamily, FONT_TO_SHORT[state.fontFamily]);
  if (state.clusterStyle !== DEFAULT_DESIGN.clusterStyle)
    params.set(PARAM_MAP.clusterStyle, state.clusterStyle);
  if (state.tilePreset !== DEFAULT_DESIGN.tilePreset)
    params.set(PARAM_MAP.tilePreset, state.tilePreset);
  if (state.mapTableRatio !== DEFAULT_DESIGN.mapTableRatio)
    params.set(PARAM_MAP.mapTableRatio, state.mapTableRatio.replace(/ /g, "_"));
  if (state.mobileMapHeight !== DEFAULT_DESIGN.mobileMapHeight)
    params.set(PARAM_MAP.mobileMapHeight, state.mobileMapHeight);
  if (state.borderRadius !== DEFAULT_DESIGN.borderRadius)
    params.set(PARAM_MAP.borderRadius, state.borderRadius);
  if (state.panelBg !== DEFAULT_DESIGN.panelBg)
    params.set(PARAM_MAP.panelBg, state.panelBg.replace("#", ""));
  if (state.pageBg !== DEFAULT_DESIGN.pageBg)
    params.set(PARAM_MAP.pageBg, state.pageBg.replace("#", ""));
  if (state.textColor !== DEFAULT_DESIGN.textColor)
    params.set(PARAM_MAP.textColor, state.textColor.replace("#", ""));
  if (state.textMuted !== DEFAULT_DESIGN.textMuted)
    params.set(PARAM_MAP.textMuted, state.textMuted.replace("#", ""));
  if (state.showLabels !== DEFAULT_DESIGN.showLabels)
    params.set(PARAM_MAP.showLabels, state.showLabels ? "1" : "0");
  if (state.showBorder !== DEFAULT_DESIGN.showBorder)
    params.set(PARAM_MAP.showBorder, state.showBorder ? "1" : "0");
  if (state.markerSize !== DEFAULT_DESIGN.markerSize)
    params.set(PARAM_MAP.markerSize, String(state.markerSize));

  if (state.showCountyLines !== DEFAULT_DESIGN.showCountyLines)
    params.set(PARAM_MAP.showCountyLines, state.showCountyLines ? "1" : "0");
  if (state.countyLineColor !== DEFAULT_DESIGN.countyLineColor)
    params.set(PARAM_MAP.countyLineColor, state.countyLineColor.replace("#", ""));
  if (state.countyLineWeight !== DEFAULT_DESIGN.countyLineWeight)
    params.set(PARAM_MAP.countyLineWeight, String(state.countyLineWeight));
  if (state.countyLineOpacity !== DEFAULT_DESIGN.countyLineOpacity)
    params.set(PARAM_MAP.countyLineOpacity, String(state.countyLineOpacity));

  if (state.showStateBorder !== DEFAULT_DESIGN.showStateBorder)
    params.set(PARAM_MAP.showStateBorder, state.showStateBorder ? "1" : "0");
  if (state.stateBorderColor !== DEFAULT_DESIGN.stateBorderColor)
    params.set(PARAM_MAP.stateBorderColor, state.stateBorderColor.replace("#", ""));
  if (state.stateBorderWeight !== DEFAULT_DESIGN.stateBorderWeight)
    params.set(PARAM_MAP.stateBorderWeight, String(state.stateBorderWeight));

  if (state.showOutsideFade !== DEFAULT_DESIGN.showOutsideFade)
    params.set(PARAM_MAP.showOutsideFade, state.showOutsideFade ? "1" : "0");
  if (state.outsideFadeOpacity !== DEFAULT_DESIGN.outsideFadeOpacity)
    params.set(PARAM_MAP.outsideFadeOpacity, String(state.outsideFadeOpacity));

  if (state.demoIntervalMs !== DEFAULT_DESIGN.demoIntervalMs)
    params.set(PARAM_MAP.demoIntervalMs, String(state.demoIntervalMs));

  if (includeDesignMode) params.set("design", "1");

  const qs = params.toString();
  return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
}

// ── Reducer ─────────────────────────────────────────────────
type DesignAction =
  | { type: "SET"; key: keyof DesignState; value: string | boolean | number }
  | { type: "RESET" };

function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case "SET":
      return { ...state, [action.key]: action.value };
    case "RESET":
      return { ...DEFAULT_DESIGN };
  }
}

// ── Context ─────────────────────────────────────────────────
interface DesignContextValue {
  design: DesignState;
  designMode: boolean;
  set: (key: keyof DesignState, value: string | boolean | number) => void;
  reset: () => void;
  getShareURL: (includeDesignMode?: boolean) => string;
}

const DesignCtx = createContext<DesignContextValue | null>(null);

interface DesignProviderProps {
  children: ReactNode;
  /** Initial design state loaded from the API (overridden by URL params) */
  initialDesignState?: Record<string, unknown>;
  /** Callback to save design state to the API */
  onSave?: (state: Record<string, unknown>) => Promise<void>;
  /** Suppress design mode UI (for embeds) */
  embedMode?: boolean;
}

export function DesignProvider({
  children,
  initialDesignState,
  onSave,
  embedMode = false,
}: DesignProviderProps) {
  const urlOverrides = parseFromURL();
  const initialDesignMode =
    !embedMode && new URLSearchParams(window.location.search).get("design") === "1";

  // Merge: defaults ← API state ← URL overrides
  const [design, dispatch] = useReducer(designReducer, {
    ...DEFAULT_DESIGN,
    ...(initialDesignState as Partial<DesignState>),
    ...urlOverrides,
  });

  const [designMode, setDesignMode] = useReducer(
    (_: boolean, v: boolean) => v,
    initialDesignMode
  );

  // Keyboard shortcut: Ctrl/Cmd + Shift + D
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setDesignMode(!designMode);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [designMode]);

  // Apply CSS custom properties to :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--design-panel-bg", design.panelBg);
    root.style.setProperty("--design-page-bg", design.pageBg);
    root.style.setProperty("--design-text-color", design.textColor);
    root.style.setProperty("--design-text-muted", design.textMuted);
    root.style.setProperty("--design-border-radius", design.borderRadius);

    // Font family on body
    const fontStack = `"${design.fontFamily}", ui-sans-serif, system-ui, sans-serif`;
    root.style.setProperty("--design-font", fontStack);
    document.body.style.fontFamily = fontStack;
  }, [design]);

  const set = useCallback(
    (key: keyof DesignState, value: string | boolean | number) => dispatch({ type: "SET", key, value }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const getShareURL = useCallback(
    (includeDesignMode = false) => serializeToURL(design, includeDesignMode),
    [design]
  );

  // Auto-save to API when design changes (debounced)
  useEffect(() => {
    if (!onSave) return;
    const timer = setTimeout(() => {
      onSave(design as unknown as Record<string, unknown>);
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, onSave]);

  return (
    <DesignCtx.Provider value={{ design, designMode, set, reset, getShareURL }}>
      {children}
    </DesignCtx.Provider>
  );
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignCtx);
  if (!ctx) throw new Error("useDesign must be used within DesignProvider");
  return ctx;
}
