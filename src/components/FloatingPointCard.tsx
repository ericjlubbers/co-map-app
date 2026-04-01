import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { PointData, CardConnectorPreset } from "../types";
import PointPopup from "./PointPopup";
import { buildFocusEmbedSnippet } from "../lib/embedSnippet";

const DESKTOP_CARD_WIDTH = 280;
const MOBILE_CARD_WIDTH = 220;
const DESKTOP_STEM = 40; // distance from marker center to near card edge
const MOBILE_STEM = 20;
const EDGE_PAD = 8; // min distance from card edge to container edge

interface FloatingPointCardProps {
  point: PointData;
  map: LeafletMap;
  onDismiss?: () => void;
  onZoomIn?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  navLabel?: string;
  transitionSpeed: number;
  preset: CardConnectorPreset;
  connectorColor: string;
  connectorWidth: number;
  connectorDash: boolean;
  faceColor: string;
  faceOpacity: number;
  cardBorderRadius: number;
  cardBgColor: string;
  cardShadow: boolean;
  edgeColor: string;
  edgeWidth: number;
  edgeOpacity: number;
  connectorInset: number;
  /** Map ID — when provided, shows a copy-embed-URL button */
  mapId?: string;
}

interface Layout {
  pointX: number;
  pointY: number;
  cardLeft: number;
  cardTop: number;
  cardHeight: number;
  cardWidth: number;
  placement: "left" | "right" | "above";
}

/**
 * Lighten/darken a hex color by a percentage (-1 to 1).
 * Positive = lighten, negative = darken.
 */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(255 * amount)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * amount)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Absolutely positioned card overlay that renders PointPopup content
 * with a dynamic connector to the marker's exact center.
 *
 * Two presets:
 * - "simple": A straight line from marker center to card edge.
 * - "retro-3d": Four shaded triangular faces (pyramid) connecting
 *   the marker center to each card corner, giving a retro 3D look.
 */
export default function FloatingPointCard({
  point,
  map,
  onDismiss,
  onZoomIn,
  onPrev,
  onNext,
  navLabel,
  transitionSpeed,
  preset,
  connectorColor,
  connectorWidth,
  connectorDash,
  faceColor,
  faceOpacity,
  cardBorderRadius,
  cardBgColor,
  cardShadow,
  edgeColor,
  edgeWidth,
  edgeOpacity,
  connectorInset,
  mapId,
}: FloatingPointCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [visible, setVisible] = useState(false);
  const [measured, setMeasured] = useState(false);
  const cardHeightRef = useRef<number>(0);
  const [embedCopied, setEmbedCopied] = useState(false);

  const handleCopyEmbedUrl = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mapId) return;
    const snippet = buildFocusEmbedSnippet(mapId, point.id, window.location.origin);
    navigator.clipboard.writeText(snippet).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 1800);
    });
  }, [mapId, point.id]);

  // Escape key to dismiss
  useEffect(() => {
    if (!onDismiss) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  // Phase 1: measure the card content off-screen before showing anything
  useEffect(() => {
    setMeasured(false);
    setLayout(null);
    setVisible(false);
    // Wait one frame for the measure div to render content
    const raf = requestAnimationFrame(() => {
      if (measureRef.current) {
        cardHeightRef.current = measureRef.current.offsetHeight;
      }
      setMeasured(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [point.id]);

  const computeLayout = useCallback(() => {
    if (!measured) return;
    const containerSize = map.getSize();
    const px = map.latLngToContainerPoint([point.lat, point.lng]);
    const isMobile = containerSize.x < 400;
    const cardWidth = isMobile ? MOBILE_CARD_WIDTH : DESKTOP_CARD_WIDTH;
    const stemLength = isMobile ? MOBILE_STEM : DESKTOP_STEM;

    const placement: "left" | "right" | "above" = isMobile
      ? "above"
      : px.x > containerSize.x / 2 ? "left" : "right";

    const cardHeight = cardHeightRef.current || 200;

    let cardLeft: number, cardTop: number;
    if (placement === "above") {
      cardLeft = px.x - cardWidth / 2;
      cardTop = Math.max(EDGE_PAD, px.y - cardHeight - stemLength);
    } else {
      cardLeft = placement === "right"
        ? px.x + stemLength
        : px.x - stemLength - cardWidth;
      let ct = px.y - cardHeight / 2;
      ct = Math.max(EDGE_PAD, Math.min(containerSize.y - cardHeight - EDGE_PAD, ct));
      cardTop = ct;
    }

    const clampedLeft = Math.max(
      EDGE_PAD,
      Math.min(containerSize.x - cardWidth - EDGE_PAD, cardLeft),
    );

    setLayout({
      pointX: px.x,
      pointY: px.y,
      cardLeft: clampedLeft,
      cardTop,
      cardHeight,
      cardWidth,
      placement,
    });
  }, [map, point.lat, point.lng, measured]);

  // Phase 2: compute layout once measured, and on map move/zoom
  useEffect(() => {
    if (!measured) return;
    computeLayout();
    map.on("move", computeLayout);
    map.on("zoom", computeLayout);
    return () => {
      map.off("move", computeLayout);
      map.off("zoom", computeLayout);
    };
  }, [map, computeLayout, measured]);

  // Fade in after layout is ready
  useEffect(() => {
    if (!layout) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(raf);
      setVisible(false);
    };
  }, [layout !== null, point.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Card content (shared between measure div and real card)
  const isMobileLayout = map.getSize().x < 400;
  const cardContent = (
    <div className="p-3">
      <PointPopup
        point={point}
        onZoomIn={onZoomIn}
        onPrev={onPrev}
        onNext={onNext}
        navLabel={navLabel}
        compact={isMobileLayout}
      />
      {mapId && (
        <div className="mt-2 border-t border-black/5 pt-2">
          <button
            onClick={handleCopyEmbedUrl}
            className="flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Copy focus embed code"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-3 w-3 fill-current" aria-hidden="true">
              <path d="M384 336H192c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16l140.1 0L400 115.9V320c0 8.8-7.2 16-16 16zM192 384H384c35.3 0 64-28.7 64-64V115.9c0-17-6.7-33.3-18.7-45.3L366.1 18.7C354.1 6.7 337.8 0 320.9 0H192c-35.3 0-64 28.7-64 64V320c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H256c35.3 0 64-28.7 64-64V416H272v32c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V192c0-8.8 7.2-16 16-16H96V128H64z"/>
            </svg>
            {embedCopied ? "Copied!" : "Copy focus embed code"}
          </button>
        </div>
      )}
    </div>
  );

  // Always render the off-screen measure div so we can measure new content
  // before the main card appears
  const measureDiv = !measured && (
    <div
      ref={measureRef}
      aria-hidden
      style={{
        position: "absolute",
        visibility: "hidden",
        width: isMobileLayout ? MOBILE_CARD_WIDTH : DESKTOP_CARD_WIDTH,
        top: -9999,
        left: -9999,
        borderRadius: cardBorderRadius,
      }}
    >
      {cardContent}
    </div>
  );

  if (!layout) return <>{measureDiv}</>;

  // Card corner coordinates
  const cL = layout.cardLeft;
  const cT = layout.cardTop;
  const cR = cL + layout.cardWidth;
  const cB = cT + layout.cardHeight;
  const pX = layout.pointX;
  const pY = layout.pointY;

  // Near card edge midpoint (for simple connector)
  const nearEdgeX = layout.placement === "above"
    ? cL + layout.cardWidth / 2
    : (layout.placement === "right" ? cL : cR);
  const nearEdgeY = layout.placement === "above" ? cB : cT + layout.cardHeight / 2;

  // Transform-origin for card: the marker point relative to the card's top-left
  const originX = pX - cL;
  const originY = pY - cT;

  // Easing — gentle overshoot, comfortable for rapid successive opens
  const ease = `cubic-bezier(0.22, 1.15, 0.55, 1)`;
  const dur = `${transitionSpeed}ms`;

  return (
    <div className="absolute inset-0 z-[1000] pointer-events-none overflow-hidden">
      {/* SVG connector — scales from marker point outward */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{
          transformOrigin: `${pX}px ${pY}px`,
          transform: visible ? "scale(1)" : "scale(0)",
          opacity: visible ? 1 : 0,
          transition: `transform ${dur} ${ease}, opacity ${dur} ease`,
        }}
      >
        {preset === "retro-3d" ? (
          <Retro3DConnector
            pX={pX}
            pY={pY}
            cL={cL}
            cT={cT}
            cR={cR}
            cB={cB}
            placement={layout.placement}
            faceColor={faceColor}
            faceOpacity={faceOpacity}
            edgeColor={edgeColor}
            edgeWidth={edgeWidth}
            edgeOpacity={edgeOpacity}
            connectorInset={connectorInset}
          />
        ) : (
          <SimpleConnector
            pX={pX}
            pY={pY}
            toX={nearEdgeX}
            toY={nearEdgeY}
            color={connectorColor}
            width={connectorWidth}
            dash={connectorDash}
          />
        )}
        {/* Card background rect — scales with the connector so panels
            are never visible without a backing surface */}
        <rect
          x={cL}
          y={cT}
          width={layout.cardWidth}
          height={layout.cardHeight}
          rx={cardBorderRadius}
          ry={cardBorderRadius}
          fill={cardBgColor}
        />
      </svg>

      {/* Card content — fades in after connector has mostly finished growing */}
      <div
        ref={cardRef}
        role="dialog"
        aria-label={`Details: ${point.title}`}
        aria-modal="true"
        className="absolute pointer-events-auto ring-1 ring-black/5"
        style={{
          left: layout.cardLeft,
          top: layout.cardTop,
          width: layout.cardWidth,
          borderRadius: cardBorderRadius,
          backgroundColor: "transparent",
          boxShadow: cardShadow && visible ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" : "none",
          opacity: visible ? 1 : 0,
          transition: visible
            ? `opacity ${Math.round(transitionSpeed * 0.4)}ms ease ${Math.round(transitionSpeed * 0.6)}ms`
            : "opacity 0ms",
          willChange: "opacity",
        }}
      >
        {cardContent}
      </div>
    </div>
  );
}

// ── Simple line connector ──────────────────────────────────

function SimpleConnector({
  pX,
  pY,
  toX,
  toY,
  color,
  width,
  dash,
}: {
  pX: number;
  pY: number;
  toX: number;
  toY: number;
  color: string;
  width: number;
  dash: boolean;
}) {
  return (
    <>
      <line
        x1={pX}
        y1={pY}
        x2={toX}
        y2={toY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash ? `${width * 3} ${width * 2}` : undefined}
      />
      <circle cx={pX} cy={pY} r={width + 1} fill={color} />
    </>
  );
}

// ── Retro 3D pyramid connector ─────────────────────────────

/**
 * Renders four triangular "faces" from the point (apex) to each side
 * of the card (base). Each face gets a different shade to simulate
 * consistent top-down lighting:
 *   top face    = lightest
 *   bottom face = darkest
 *   left face   = mid-light
 *   right face  = mid-dark
 *
 * When placement flips, left/right shade assignments swap so the
 * "light source" stays screen-left.
 */
function Retro3DConnector({
  pX,
  pY,
  cL,
  cT,
  cR,
  cB,
  placement,
  faceColor,
  faceOpacity,
  edgeColor,
  edgeWidth,
  edgeOpacity,
  connectorInset,
}: {
  pX: number;
  pY: number;
  cL: number;
  cT: number;
  cR: number;
  cB: number;
  placement: "left" | "right";
  faceColor: string;
  faceOpacity: number;
  edgeColor: string;
  edgeWidth: number;
  edgeOpacity: number;
  connectorInset: number;
}) {
  // Light source is top-left of screen
  const topShade = adjustColor(faceColor, 0.25);    // lightest
  const bottomShade = adjustColor(faceColor, -0.25); // darkest
  const lightSide = adjustColor(faceColor, 0.10);    // left side = brighter
  const darkSide = adjustColor(faceColor, -0.10);    // right side = darker

  // connectorInset controls where the pyramid meets the card.
  // Negative values extend past the card edge (tuck under rounded corners);
  // zero = flush with card edge; positive = inset from edge.
  const ext = -connectorInset;
  const eL = cL - ext;
  const eR = cR + ext;
  const eT = cT - ext;
  const eB = cB + ext;

  // Top face: point → top-left corner → top-right corner
  const topPoly = `${pX},${pY} ${eL},${eT} ${eR},${eT}`;
  // Bottom face: point → bottom-left corner → bottom-right corner
  const bottomPoly = `${pX},${pY} ${eL},${eB} ${eR},${eB}`;
  // Near face (toward point): point → near-top → near-bottom
  const nearX = placement === "right" ? eL : eR;
  const nearPoly = `${pX},${pY} ${nearX},${eT} ${nearX},${eB}`;
  // Far face (away from point): point → far-top → far-bottom
  const farX = placement === "right" ? eR : eL;
  const farPoly = `${pX},${pY} ${farX},${eT} ${farX},${eB}`;

  // Assign lighting: near face gets light-side shade, far gets dark-side shade
  const nearShade = placement === "right" ? lightSide : darkSide;
  const farShade = placement === "right" ? darkSide : lightSide;

  // Near and far corners for edge lines (use exact card rect, not extended)
  const nX = placement === "right" ? cL : cR;
  const fX = placement === "right" ? cR : cL;

  // Full pyramid silhouette: apex → near-top → far-top → far-bottom → near-bottom
  // Rendered as a solid base fill to seal anti-aliasing gaps between face polygons.
  const silhouette = `${pX},${pY} ${nearX},${eT} ${farX},${eT} ${farX},${eB} ${nearX},${eB}`;

  return (
    <g opacity={faceOpacity}>
      {/* Base fill seals sub-pixel seams between face polygons */}
      <polygon points={silhouette} fill={faceColor} />
      {/* Shaded faces layered on top */}
      <polygon points={farPoly} fill={farShade} />
      <polygon points={topPoly} fill={topShade} />
      <polygon points={bottomPoly} fill={bottomShade} />
      <polygon points={nearPoly} fill={nearShade} />
      {/* Edge lines between faces */}
      {edgeWidth > 0 && edgeOpacity > 0 && (
        <g opacity={edgeOpacity} stroke={edgeColor} strokeWidth={edgeWidth} strokeLinecap="round" fill="none">
          {/* Apex to each card corner */}
          <line x1={pX} y1={pY} x2={nX} y2={cT} />
          <line x1={pX} y1={pY} x2={nX} y2={cB} />
          <line x1={pX} y1={pY} x2={fX} y2={cT} />
          <line x1={pX} y1={pY} x2={fX} y2={cB} />
          {/* Card rect outline */}
          <rect x={cL} y={cT} width={cR - cL} height={cB - cT} />
        </g>
      )}
    </g>
  );
}
