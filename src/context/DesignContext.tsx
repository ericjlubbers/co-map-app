import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { DesignState, ClusterStyle, ClusterPlugin, PlacementStrategy, FontFamily, TilePreset, SfBtnPreset, SfBtnFillMode, DemoHighlightStyle, DemoRotationMode, DemoRotationOrder, MarkerShape, MarkerConnector, MarkerPadding } from "../types";
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
  showCustomBorder: "customBorder",
  customBorderColor: "cbColor",
  customBorderWidth: "cbWidth",
  customBorderStyle: "cbStyle",
  embedPadding: "ePadding",
  embedMargin: "eMargin",
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
  enableDemoMode: "demoOn",
  demoHighlightStyle: "dhs",
  demoDimOpacity: "ddo",
  demoDimTable: "ddt",
  demoRotationMode: "drm",
  demoRotationOrder: "dro",
  demoPointIntervalMs: "dpi",
  useMetricUnits: "metric",
  showRoads: "roads",
  showMotorways: "motorways",
  showTrunkRoads: "trunks",
  showPrimaryRoads: "primaries",
  showSecondaryRoads: "secondaries",
  showTertiaryRoads: "tertiaries",
  roadColor: "roadColor",
  roadWeight: "roadW",
  roadOpacity: "roadOp",
  roadDashArray: "roadDash",
  showWaterways: "waterways",
  showRivers: "rivers",
  showStreams: "streams",
  waterwayColor: "waterwayColor",
  waterwayWeight: "waterwayW",
  waterwayOpacity: "waterwayOp",
  showParks: "parks",
  parkColor: "parkColor",
  parkOpacity: "parkOp",
  showLakes: "lakes",
  lakeColor: "lakeColor",
  lakeOpacity: "lakeOp",
  showCities: "cities",
  showCityLabels: "cityLabels",
  showPeakLabels: "peakLabels",
  cityFontSize: "citySize",
  cityColor: "cityColor",
  labelFont: "labelFont",
  showDataPanel: "dataPanel",
  pointColor: "ptColor",
  pointColorMode: "ptMode",
  categoryColors: "catColors",
  categoryIcons: "catIcons",
  markerShape: "msh",
  markerConnector: "mco",
  markerPadding: "mpd",
  categoryShapes: "csh",
  embedAspectRatio: "eRatio",
  embedMobileAspectRatio: "eMobileRatio",
  embedHeight: "eHeight",
  embedHeightUnit: "eHeightUnit",
  embedLayout: "eLayout",
  sfSidebarWidth: "sfW",
  sfBtnFontSize: "sfFont",
  sfBtnPadding: "sfPad",
  sfBtnBorderRadius: "sfRad",
  sfBtnGap: "sfGap",
  sfLabelWrap: "sfWrap",
  sfBtnPreset: "sbp",
  sfBtnFillColor: "sbfc",
  sfBtnFillMode: "sbfm",
  flyToZoom: "ftz",
  categoryDisplayMode: "catDisp",
  dotMode: "dotM",
  dotSize: "dotS",
  clusterPlugin: "cpg",
  clusterMaxRadius: "cmr",
  clusterDisableAtZoom: "cdz",
  clusterAnimate: "can",
  clusterSpiderfyOnMaxZoom: "csm",
  clusterShowCoverageOnHover: "csc",
  clusterZoomToBoundsOnClick: "czb",
  clusterPlacementStrategy: "cps",
  clusterPlacementReveal: "cpr",
  clusterShowList: "csl",
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
    "carto-light", "carto-light-nolabels",
    "carto-dark", "carto-dark-nolabels",
    "carto-voyager", "carto-voyager-nolabels",
    "osm-standard",
    "stadia-watercolor",
    "stadia-toner", "stadia-toner-lite", "stadia-toner-nolabels",
    "stadia-smooth", "stadia-outdoors",
    "stadia-terrain", "stadia-terrain-nolabels",
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

  const metric = params.get(PARAM_MAP.useMetricUnits);
  if (metric) partial.useMetricUnits = metric === "1";

  const dhs = params.get(PARAM_MAP.demoHighlightStyle);
  if (dhs && ["filter", "dim"].includes(dhs))
    partial.demoHighlightStyle = dhs as DemoHighlightStyle;
  const ddo = params.get(PARAM_MAP.demoDimOpacity);
  if (ddo) partial.demoDimOpacity = parseFloat(ddo);
  const ddt = params.get(PARAM_MAP.demoDimTable);
  if (ddt) partial.demoDimTable = ddt === "1";

  const drm = params.get(PARAM_MAP.demoRotationMode);
  if (drm && ["by-category", "by-point"].includes(drm))
    partial.demoRotationMode = drm as DemoRotationMode;
  const dro = params.get(PARAM_MAP.demoRotationOrder);
  if (dro && ["sequential", "shuffled"].includes(dro))
    partial.demoRotationOrder = dro as DemoRotationOrder;
  const dpi = params.get(PARAM_MAP.demoPointIntervalMs);
  if (dpi) partial.demoPointIntervalMs = parseInt(dpi, 10);

  const showRoads = params.get(PARAM_MAP.showRoads);
  if (showRoads) partial.showRoads = showRoads === "1";

  const showMotorways = params.get(PARAM_MAP.showMotorways);
  if (showMotorways) partial.showMotorways = showMotorways === "1";
  const showTrunks = params.get(PARAM_MAP.showTrunkRoads);
  if (showTrunks) partial.showTrunkRoads = showTrunks === "1";
  const showPrimaries = params.get(PARAM_MAP.showPrimaryRoads);
  if (showPrimaries) partial.showPrimaryRoads = showPrimaries === "1";
  const showSecondaries = params.get(PARAM_MAP.showSecondaryRoads);
  if (showSecondaries) partial.showSecondaryRoads = showSecondaries === "1";
  const showTertiaries = params.get(PARAM_MAP.showTertiaryRoads);
  if (showTertiaries) partial.showTertiaryRoads = showTertiaries === "1";

  const roadColor = params.get(PARAM_MAP.roadColor);
  if (roadColor) partial.roadColor = `#${roadColor}`;

  const roadW = params.get(PARAM_MAP.roadWeight);
  if (roadW) partial.roadWeight = parseFloat(roadW);

  const roadOp = params.get(PARAM_MAP.roadOpacity);
  if (roadOp) partial.roadOpacity = parseFloat(roadOp);

  const roadDash = params.get(PARAM_MAP.roadDashArray);
  if (roadDash) partial.roadDashArray = roadDash;

  const showWaterways = params.get(PARAM_MAP.showWaterways);
  if (showWaterways) partial.showWaterways = showWaterways === "1";

  const showRivers = params.get(PARAM_MAP.showRivers);
  if (showRivers) partial.showRivers = showRivers === "1";
  const showStreams = params.get(PARAM_MAP.showStreams);
  if (showStreams) partial.showStreams = showStreams === "1";

  const waterwayColor = params.get(PARAM_MAP.waterwayColor);
  if (waterwayColor) partial.waterwayColor = `#${waterwayColor}`;

  const waterwayW = params.get(PARAM_MAP.waterwayWeight);
  if (waterwayW) partial.waterwayWeight = parseFloat(waterwayW);

  const waterwayOp = params.get(PARAM_MAP.waterwayOpacity);
  if (waterwayOp) partial.waterwayOpacity = parseFloat(waterwayOp);

  const showParks = params.get(PARAM_MAP.showParks);
  if (showParks) partial.showParks = showParks === "1";
  const parkColor = params.get(PARAM_MAP.parkColor);
  if (parkColor) partial.parkColor = `#${parkColor}`;
  const parkOp = params.get(PARAM_MAP.parkOpacity);
  if (parkOp) partial.parkOpacity = parseFloat(parkOp);

  const showLakes = params.get(PARAM_MAP.showLakes);
  if (showLakes) partial.showLakes = showLakes === "1";
  const lakeColor = params.get(PARAM_MAP.lakeColor);
  if (lakeColor) partial.lakeColor = `#${lakeColor}`;
  const lakeOp = params.get(PARAM_MAP.lakeOpacity);
  if (lakeOp) partial.lakeOpacity = parseFloat(lakeOp);

  const showCities = params.get(PARAM_MAP.showCities);
  if (showCities) partial.showCities = showCities === "1";

  const showCityLabels = params.get(PARAM_MAP.showCityLabels);
  if (showCityLabels) partial.showCityLabels = showCityLabels === "1";
  const showPeakLabels = params.get(PARAM_MAP.showPeakLabels);
  if (showPeakLabels) partial.showPeakLabels = showPeakLabels === "1";

  const citySize = params.get(PARAM_MAP.cityFontSize);
  if (citySize) partial.cityFontSize = parseInt(citySize, 10);

  const cityColor = params.get(PARAM_MAP.cityColor);
  if (cityColor) partial.cityColor = `#${cityColor}`;

  const labelFont = params.get(PARAM_MAP.labelFont);
  if (labelFont) partial.labelFont = decodeURIComponent(labelFont);

  const dataPanel = params.get(PARAM_MAP.showDataPanel);
  if (dataPanel) partial.showDataPanel = dataPanel === "1";

  const eLayout = params.get(PARAM_MAP.embedLayout);
  if (eLayout && ["standard", "sidebar-filter"].includes(eLayout))
    partial.embedLayout = eLayout as DesignState["embedLayout"];

  const catIcons = params.get(PARAM_MAP.categoryIcons);
  if (catIcons) {
    try { partial.categoryIcons = JSON.parse(decodeURIComponent(catIcons)); } catch { /* ignore */ }
  }

  const SHAPES: MarkerShape[] = ["pin", "rounded-square", "circle", "stadium", "soft-diamond", "shield"];
  const CONNECTORS: MarkerConnector[] = ["stem", "dot", "none"];
  const PADDINGS: MarkerPadding[] = ["compact", "normal", "spacious"];

  const msh = params.get(PARAM_MAP.markerShape);
  if (msh) {
    const idx = parseInt(msh, 10);
    if (idx >= 0 && idx < SHAPES.length) partial.markerShape = SHAPES[idx];
  }
  const mco = params.get(PARAM_MAP.markerConnector);
  if (mco) {
    const idx = parseInt(mco, 10);
    if (idx >= 0 && idx < CONNECTORS.length) partial.markerConnector = CONNECTORS[idx];
  }
  const mpd = params.get(PARAM_MAP.markerPadding);
  if (mpd) {
    const idx = parseInt(mpd, 10);
    if (idx >= 0 && idx < PADDINGS.length) partial.markerPadding = PADDINGS[idx];
  }
  const csh = params.get(PARAM_MAP.categoryShapes);
  if (csh) {
    try { partial.categoryShapes = JSON.parse(decodeURIComponent(csh)); } catch { /* ignore */ }
  }

  const sfW = params.get(PARAM_MAP.sfSidebarWidth);
  if (sfW) partial.sfSidebarWidth = sfW;
  const sfFont = params.get(PARAM_MAP.sfBtnFontSize);
  if (sfFont) partial.sfBtnFontSize = parseInt(sfFont, 10);
  const sfPad = params.get(PARAM_MAP.sfBtnPadding);
  if (sfPad) partial.sfBtnPadding = decodeURIComponent(sfPad);
  const sfRad = params.get(PARAM_MAP.sfBtnBorderRadius);
  if (sfRad) partial.sfBtnBorderRadius = sfRad;
  const sfGap = params.get(PARAM_MAP.sfBtnGap);
  if (sfGap) partial.sfBtnGap = sfGap;
  const sfWrap = params.get(PARAM_MAP.sfLabelWrap);
  if (sfWrap) partial.sfLabelWrap = sfWrap === "1";

  const sbp = params.get(PARAM_MAP.sfBtnPreset);
  const SF_BTN_PRESETS: SfBtnPreset[] = ["filled", "outlined", "ghost", "pill", "minimal"];
  if (sbp) {
    const idx = parseInt(sbp, 10);
    if (idx >= 0 && idx < SF_BTN_PRESETS.length) partial.sfBtnPreset = SF_BTN_PRESETS[idx];
  }
  const sbfc = params.get(PARAM_MAP.sfBtnFillColor);
  if (sbfc) partial.sfBtnFillColor = `#${sbfc}`;
  const sbfm = params.get(PARAM_MAP.sfBtnFillMode);
  if (sbfm && ["single", "by-category"].includes(sbfm))
    partial.sfBtnFillMode = sbfm as SfBtnFillMode;

  const ftz = params.get(PARAM_MAP.flyToZoom);
  if (ftz) partial.flyToZoom = parseInt(ftz, 10);

  const catDisp = params.get(PARAM_MAP.categoryDisplayMode);
  if (catDisp && ["text", "icon", "both"].includes(catDisp))
    partial.categoryDisplayMode = catDisp as DesignState["categoryDisplayMode"];

  const dotM = params.get(PARAM_MAP.dotMode);
  if (dotM) partial.dotMode = dotM === "1";
  const dotS = params.get(PARAM_MAP.dotSize);
  if (dotS) partial.dotSize = parseInt(dotS, 10);

  const CLUSTER_PLUGINS: ClusterPlugin[] = ["react-leaflet-cluster", "leaflet-markercluster", "none"];
  const cpg = params.get(PARAM_MAP.clusterPlugin);
  if (cpg) {
    const idx = parseInt(cpg, 10);
    if (idx >= 0 && idx < CLUSTER_PLUGINS.length) partial.clusterPlugin = CLUSTER_PLUGINS[idx];
  }
  const cmr = params.get(PARAM_MAP.clusterMaxRadius);
  if (cmr) partial.clusterMaxRadius = parseInt(cmr, 10);
  const cdz = params.get(PARAM_MAP.clusterDisableAtZoom);
  if (cdz) partial.clusterDisableAtZoom = parseInt(cdz, 10);
  const can = params.get(PARAM_MAP.clusterAnimate);
  if (can) partial.clusterAnimate = can === "1";
  const csm = params.get(PARAM_MAP.clusterSpiderfyOnMaxZoom);
  if (csm) partial.clusterSpiderfyOnMaxZoom = csm === "1";
  const csc = params.get(PARAM_MAP.clusterShowCoverageOnHover);
  if (csc) partial.clusterShowCoverageOnHover = csc === "1";
  const czb = params.get(PARAM_MAP.clusterZoomToBoundsOnClick);
  if (czb) partial.clusterZoomToBoundsOnClick = czb === "1";
  const PLACEMENTS: PlacementStrategy[] = ["default", "clock", "concentric", "spiral", "one-circle"];
  const cps = params.get(PARAM_MAP.clusterPlacementStrategy);
  if (cps) {
    const idx = parseInt(cps, 10);
    if (idx >= 0 && idx < PLACEMENTS.length) partial.clusterPlacementStrategy = PLACEMENTS[idx];
  }
  const cpr = params.get(PARAM_MAP.clusterPlacementReveal);
  if (cpr) partial.clusterPlacementReveal = cpr === "1";
  const csl = params.get(PARAM_MAP.clusterShowList);
  if (csl) partial.clusterShowList = csl === "1";

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
  if (state.demoHighlightStyle !== DEFAULT_DESIGN.demoHighlightStyle)
    params.set(PARAM_MAP.demoHighlightStyle, state.demoHighlightStyle);
  if (state.demoDimOpacity !== DEFAULT_DESIGN.demoDimOpacity)
    params.set(PARAM_MAP.demoDimOpacity, String(state.demoDimOpacity));
  if (state.demoDimTable !== DEFAULT_DESIGN.demoDimTable)
    params.set(PARAM_MAP.demoDimTable, state.demoDimTable ? "1" : "0");
  if (state.demoRotationMode !== DEFAULT_DESIGN.demoRotationMode)
    params.set(PARAM_MAP.demoRotationMode, state.demoRotationMode);
  if (state.demoRotationOrder !== DEFAULT_DESIGN.demoRotationOrder)
    params.set(PARAM_MAP.demoRotationOrder, state.demoRotationOrder);
  if (state.demoPointIntervalMs !== DEFAULT_DESIGN.demoPointIntervalMs)
    params.set(PARAM_MAP.demoPointIntervalMs, String(state.demoPointIntervalMs));

  if (state.useMetricUnits !== DEFAULT_DESIGN.useMetricUnits)
    params.set(PARAM_MAP.useMetricUnits, state.useMetricUnits ? "1" : "0");

  if (state.showRoads !== DEFAULT_DESIGN.showRoads)
    params.set(PARAM_MAP.showRoads, state.showRoads ? "1" : "0");
  if (state.showMotorways !== DEFAULT_DESIGN.showMotorways)
    params.set(PARAM_MAP.showMotorways, state.showMotorways ? "1" : "0");
  if (state.showTrunkRoads !== DEFAULT_DESIGN.showTrunkRoads)
    params.set(PARAM_MAP.showTrunkRoads, state.showTrunkRoads ? "1" : "0");
  if (state.showPrimaryRoads !== DEFAULT_DESIGN.showPrimaryRoads)
    params.set(PARAM_MAP.showPrimaryRoads, state.showPrimaryRoads ? "1" : "0");
  if (state.showSecondaryRoads !== DEFAULT_DESIGN.showSecondaryRoads)
    params.set(PARAM_MAP.showSecondaryRoads, state.showSecondaryRoads ? "1" : "0");
  if (state.showTertiaryRoads !== DEFAULT_DESIGN.showTertiaryRoads)
    params.set(PARAM_MAP.showTertiaryRoads, state.showTertiaryRoads ? "1" : "0");
  if (state.roadColor !== DEFAULT_DESIGN.roadColor)
    params.set(PARAM_MAP.roadColor, state.roadColor.replace("#", ""));
  if (state.roadWeight !== DEFAULT_DESIGN.roadWeight)
    params.set(PARAM_MAP.roadWeight, String(state.roadWeight));
  if (state.roadOpacity !== DEFAULT_DESIGN.roadOpacity)
    params.set(PARAM_MAP.roadOpacity, String(state.roadOpacity));
  if (state.roadDashArray !== DEFAULT_DESIGN.roadDashArray)
    params.set(PARAM_MAP.roadDashArray, state.roadDashArray);

  if (state.showWaterways !== DEFAULT_DESIGN.showWaterways)
    params.set(PARAM_MAP.showWaterways, state.showWaterways ? "1" : "0");
  if (state.showRivers !== DEFAULT_DESIGN.showRivers)
    params.set(PARAM_MAP.showRivers, state.showRivers ? "1" : "0");
  if (state.showStreams !== DEFAULT_DESIGN.showStreams)
    params.set(PARAM_MAP.showStreams, state.showStreams ? "1" : "0");
  if (state.waterwayColor !== DEFAULT_DESIGN.waterwayColor)
    params.set(PARAM_MAP.waterwayColor, state.waterwayColor.replace("#", ""));
  if (state.waterwayWeight !== DEFAULT_DESIGN.waterwayWeight)
    params.set(PARAM_MAP.waterwayWeight, String(state.waterwayWeight));
  if (state.waterwayOpacity !== DEFAULT_DESIGN.waterwayOpacity)
    params.set(PARAM_MAP.waterwayOpacity, String(state.waterwayOpacity));

  if (state.showParks !== DEFAULT_DESIGN.showParks)
    params.set(PARAM_MAP.showParks, state.showParks ? "1" : "0");
  if (state.parkColor !== DEFAULT_DESIGN.parkColor)
    params.set(PARAM_MAP.parkColor, state.parkColor.replace("#", ""));
  if (state.parkOpacity !== DEFAULT_DESIGN.parkOpacity)
    params.set(PARAM_MAP.parkOpacity, String(state.parkOpacity));

  if (state.showLakes !== DEFAULT_DESIGN.showLakes)
    params.set(PARAM_MAP.showLakes, state.showLakes ? "1" : "0");
  if (state.lakeColor !== DEFAULT_DESIGN.lakeColor)
    params.set(PARAM_MAP.lakeColor, state.lakeColor.replace("#", ""));
  if (state.lakeOpacity !== DEFAULT_DESIGN.lakeOpacity)
    params.set(PARAM_MAP.lakeOpacity, String(state.lakeOpacity));

  if (state.showCities !== DEFAULT_DESIGN.showCities)
    params.set(PARAM_MAP.showCities, state.showCities ? "1" : "0");
  if (state.showCityLabels !== DEFAULT_DESIGN.showCityLabels)
    params.set(PARAM_MAP.showCityLabels, state.showCityLabels ? "1" : "0");
  if (state.showPeakLabels !== DEFAULT_DESIGN.showPeakLabels)
    params.set(PARAM_MAP.showPeakLabels, state.showPeakLabels ? "1" : "0");
  if (state.cityFontSize !== DEFAULT_DESIGN.cityFontSize)
    params.set(PARAM_MAP.cityFontSize, String(state.cityFontSize));
  if (state.cityColor !== DEFAULT_DESIGN.cityColor)
    params.set(PARAM_MAP.cityColor, state.cityColor.replace("#", ""));
  if (state.labelFont !== DEFAULT_DESIGN.labelFont)
    params.set(PARAM_MAP.labelFont, encodeURIComponent(state.labelFont));

  if (state.showDataPanel !== DEFAULT_DESIGN.showDataPanel)
    params.set(PARAM_MAP.showDataPanel, state.showDataPanel ? "1" : "0");

  if (state.embedLayout !== DEFAULT_DESIGN.embedLayout)
    params.set(PARAM_MAP.embedLayout, state.embedLayout);

  if (Object.keys(state.categoryIcons).length > 0)
    params.set(PARAM_MAP.categoryIcons, encodeURIComponent(JSON.stringify(state.categoryIcons)));

  if (state.markerShape !== DEFAULT_DESIGN.markerShape) {
    const shapeIdx = (["pin", "rounded-square", "circle", "stadium", "soft-diamond", "shield"] as const).indexOf(state.markerShape);
    params.set(PARAM_MAP.markerShape, String(shapeIdx));
  }
  if (state.markerConnector !== DEFAULT_DESIGN.markerConnector) {
    const connIdx = (["stem", "dot", "none"] as const).indexOf(state.markerConnector);
    params.set(PARAM_MAP.markerConnector, String(connIdx));
  }
  if (state.markerPadding !== DEFAULT_DESIGN.markerPadding) {
    const padIdx = (["compact", "normal", "spacious"] as const).indexOf(state.markerPadding);
    params.set(PARAM_MAP.markerPadding, String(padIdx));
  }
  if (Object.keys(state.categoryShapes).length > 0)
    params.set(PARAM_MAP.categoryShapes, encodeURIComponent(JSON.stringify(state.categoryShapes)));

  if (state.sfSidebarWidth !== DEFAULT_DESIGN.sfSidebarWidth)
    params.set(PARAM_MAP.sfSidebarWidth, state.sfSidebarWidth);
  if (state.sfBtnFontSize !== DEFAULT_DESIGN.sfBtnFontSize)
    params.set(PARAM_MAP.sfBtnFontSize, String(state.sfBtnFontSize));
  if (state.sfBtnPadding !== DEFAULT_DESIGN.sfBtnPadding)
    params.set(PARAM_MAP.sfBtnPadding, encodeURIComponent(state.sfBtnPadding));
  if (state.sfBtnBorderRadius !== DEFAULT_DESIGN.sfBtnBorderRadius)
    params.set(PARAM_MAP.sfBtnBorderRadius, state.sfBtnBorderRadius);
  if (state.sfBtnGap !== DEFAULT_DESIGN.sfBtnGap)
    params.set(PARAM_MAP.sfBtnGap, state.sfBtnGap);
  if (state.sfLabelWrap !== DEFAULT_DESIGN.sfLabelWrap)
    params.set(PARAM_MAP.sfLabelWrap, state.sfLabelWrap ? "1" : "0");
  if (state.sfBtnPreset !== DEFAULT_DESIGN.sfBtnPreset) {
    const presetIdx = (["filled", "outlined", "ghost", "pill", "minimal"] as const).indexOf(state.sfBtnPreset);
    params.set(PARAM_MAP.sfBtnPreset, String(presetIdx));
  }
  if (state.sfBtnFillColor !== DEFAULT_DESIGN.sfBtnFillColor)
    params.set(PARAM_MAP.sfBtnFillColor, state.sfBtnFillColor.replace("#", ""));
  if (state.sfBtnFillMode !== DEFAULT_DESIGN.sfBtnFillMode)
    params.set(PARAM_MAP.sfBtnFillMode, state.sfBtnFillMode);

  if (state.flyToZoom !== DEFAULT_DESIGN.flyToZoom)
    params.set(PARAM_MAP.flyToZoom, String(state.flyToZoom));
  if (state.categoryDisplayMode !== DEFAULT_DESIGN.categoryDisplayMode)
    params.set(PARAM_MAP.categoryDisplayMode, state.categoryDisplayMode);

  if (state.dotMode !== DEFAULT_DESIGN.dotMode)
    params.set(PARAM_MAP.dotMode, state.dotMode ? "1" : "0");
  if (state.dotSize !== DEFAULT_DESIGN.dotSize)
    params.set(PARAM_MAP.dotSize, String(state.dotSize));

  if (state.clusterPlugin !== DEFAULT_DESIGN.clusterPlugin) {
    const cpIdx = (["react-leaflet-cluster", "leaflet-markercluster", "none"] as const).indexOf(state.clusterPlugin);
    params.set(PARAM_MAP.clusterPlugin, String(cpIdx));
  }
  if (state.clusterMaxRadius !== DEFAULT_DESIGN.clusterMaxRadius)
    params.set(PARAM_MAP.clusterMaxRadius, String(state.clusterMaxRadius));
  if (state.clusterDisableAtZoom !== DEFAULT_DESIGN.clusterDisableAtZoom)
    params.set(PARAM_MAP.clusterDisableAtZoom, String(state.clusterDisableAtZoom));
  if (state.clusterAnimate !== DEFAULT_DESIGN.clusterAnimate)
    params.set(PARAM_MAP.clusterAnimate, state.clusterAnimate ? "1" : "0");
  if (state.clusterSpiderfyOnMaxZoom !== DEFAULT_DESIGN.clusterSpiderfyOnMaxZoom)
    params.set(PARAM_MAP.clusterSpiderfyOnMaxZoom, state.clusterSpiderfyOnMaxZoom ? "1" : "0");
  if (state.clusterShowCoverageOnHover !== DEFAULT_DESIGN.clusterShowCoverageOnHover)
    params.set(PARAM_MAP.clusterShowCoverageOnHover, state.clusterShowCoverageOnHover ? "1" : "0");
  if (state.clusterZoomToBoundsOnClick !== DEFAULT_DESIGN.clusterZoomToBoundsOnClick)
    params.set(PARAM_MAP.clusterZoomToBoundsOnClick, state.clusterZoomToBoundsOnClick ? "1" : "0");
  if (state.clusterPlacementStrategy !== DEFAULT_DESIGN.clusterPlacementStrategy) {
    const psIdx = (["default", "clock", "concentric", "spiral", "one-circle"] as const).indexOf(state.clusterPlacementStrategy);
    params.set(PARAM_MAP.clusterPlacementStrategy, String(psIdx));
  }
  if (state.clusterPlacementReveal !== DEFAULT_DESIGN.clusterPlacementReveal)
    params.set(PARAM_MAP.clusterPlacementReveal, state.clusterPlacementReveal ? "1" : "0");
  if (state.clusterShowList !== DEFAULT_DESIGN.clusterShowList)
    params.set(PARAM_MAP.clusterShowList, state.clusterShowList ? "1" : "0");

  if (includeDesignMode) params.set("design", "1");

  const qs = params.toString();
  return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
}

// ── Reducer ─────────────────────────────────────────────────
type DesignAction =
  | { type: "SET"; key: keyof DesignState; value: DesignState[keyof DesignState] }
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
  set: <K extends keyof DesignState>(key: K, value: DesignState[K]) => void;
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

    // Map-only font (used by LabelLayer/CityLayer via "inherit" fallback)
    const fontStack = `"${design.fontFamily}", ui-sans-serif, system-ui, sans-serif`;
    root.style.setProperty("--design-font", fontStack);
    // App UI always uses Libre Franklin via CSS --font-sans; do NOT set body font here
  }, [design]);

  const set = useCallback(
    <K extends keyof DesignState>(key: K, value: DesignState[K]) => dispatch({ type: "SET", key, value }),
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
