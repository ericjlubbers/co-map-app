import { findIconDefinition } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";

/** Sorted list of all available FA solid icon names */
export const FA_ICON_NAMES: string[] = (() => {
  const names = new Set<string>();
  for (const key of Object.keys(fas)) {
    const def = (fas as Record<string, { iconName?: string }>)[key];
    if (def?.iconName) names.add(def.iconName);
  }
  return [...names].sort();
})();

/** Get the SVG path data and viewBox for a FA icon by name */
export function getFaIconSvg(iconName: string): { pathData: string; viewBox: string } | null {
  const def = findIconDefinition({ prefix: "fas", iconName: iconName as never });
  if (!def) return null;
  const [width, height, , , pathData] = def.icon;
  return {
    pathData: typeof pathData === "string" ? pathData : (pathData as string[])[0],
    viewBox: `0 0 ${width} ${height}`,
  };
}
