import { findIconDefinition, library } from "@fortawesome/fontawesome-svg-core";

// Pro icon packs — loaded via dynamic import for code-splitting.
// The import starts immediately when this module is first imported,
// so icons are registered in the library as soon as the chunk loads.
let _iconNames: string[] = [];

const _ready = (async () => {
  const [{ fas }, { far }] = await Promise.all([
    import("@fortawesome/pro-solid-svg-icons"),
    import("@fortawesome/pro-regular-svg-icons"),
  ]);
  library.add(fas, far);

  const names = new Set<string>();
  for (const pack of [fas, far] as Record<string, { iconName?: string }>[]) {
    for (const key of Object.keys(pack)) {
      const def = pack[key];
      if (def?.iconName) names.add(def.iconName);
    }
  }
  _iconNames = [...names].sort();
})();

/** Wait for icon library to be fully loaded. Resolves instantly after first load. */
export async function loadFaIconNames(): Promise<string[]> {
  await _ready;
  return _iconNames;
}

/** Synchronously get icon names (empty until the library finishes loading) */
export function getFaIconNames(): string[] {
  return _iconNames;
}

/** Get the SVG path data and viewBox for a FA icon by name */
export function getFaIconSvg(iconName: string): { pathData: string; viewBox: string } | null {
  for (const prefix of ["fas", "far"] as const) {
    const def = findIconDefinition({ prefix, iconName: iconName as never });
    if (def) {
      const [width, height, , , pathData] = def.icon;
      return {
        pathData: typeof pathData === "string" ? pathData : (pathData as string[])[0],
        viewBox: `0 0 ${width} ${height}`,
      };
    }
  }
  return null;
}
