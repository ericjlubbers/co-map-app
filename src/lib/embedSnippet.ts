import type { DesignState } from "../types";

const SCRIPT_PATH = "/embed.js";

/**
 * Build a complete iframe + script embed snippet for a focus (single-point) embed.
 * Always uses a 1:1 square aspect ratio regardless of the map's configured ratios.
 */
export function buildFocusEmbedSnippet(
  mapId: string,
  pointId: string,
  origin: string,
): string {
  const embedUrl = `${origin}/embed/${mapId}?focus=${encodeURIComponent(pointId)}`;
  const scriptUrl = `${origin}${SCRIPT_PATH}`;

  const iframeTag = [
    `<iframe`,
    `  src="${embedUrl}"`,
    `  data-co-map`,
    `  data-ratio-desktop="1:1"`,
    `  data-ratio-mobile="1:1"`,
    `  data-height="600"`,
    `  data-height-unit="auto"`,
    `  width="100%"`,
    `  height="600"`,
    `  frameborder="0"`,
    `  style="border:0;display:block"`,
    `  allowfullscreen`,
    `></iframe>`,
  ].join("\n");

  return `${iframeTag}\n<script src="${scriptUrl}" defer><\/script>`;
}

/**
 * Build a complete iframe + script embed snippet for a category-filtered embed.
 * Uses the map's configured aspect ratios and height settings.
 */
export function buildCategoryEmbedSnippet(
  mapId: string,
  category: string,
  origin: string,
  design: Pick<
    DesignState,
    | "embedAspectRatio"
    | "embedMobileAspectRatio"
    | "embedHeight"
    | "embedHeightUnit"
    | "embedLayout"
  >,
): string {
  const embedUrl = `${origin}/embed/${mapId}?category=${encodeURIComponent(category)}`;
  const scriptUrl = `${origin}${SCRIPT_PATH}`;

  const dataAttrs: string[] = [
    `data-co-map`,
    `data-ratio-desktop="${design.embedAspectRatio}"`,
    `data-ratio-mobile="${design.embedMobileAspectRatio}"`,
    `data-height="${design.embedHeight}"`,
    `data-height-unit="${design.embedHeightUnit}"`,
  ];

  if (design.embedLayout === "sidebar-filter" && design.embedHeightUnit === "vh") {
    dataAttrs.push(`data-vh-desktop="75"`, `data-vh-mobile="85"`);
  }

  const fallbackHeightPx =
    design.embedHeightUnit === "auto"
      ? "600"
      : design.embedHeightUnit === "vh"
        ? String(Math.round((parseFloat(design.embedHeight) / 100) * 800))
        : design.embedHeight;

  const iframeTag = `<iframe src="${embedUrl}" ${dataAttrs.join(" ")} width="100%" height="${fallbackHeightPx}" frameborder="0" style="border:0;display:block" allowfullscreen></iframe>`;

  return `${iframeTag}\n<script src="${scriptUrl}" defer><\/script>`;
}
