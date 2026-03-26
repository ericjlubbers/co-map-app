# L1 — Label Tile Swap

## Goal
Replace Stamen terrain label overlays with Carto labels-only tiles so that peak elevations are NOT baked into the raster overlay (they show metric). Our CityLayer already renders peaks with imperial feet via the `formatElevation()` function and `useMetricUnits` design param — that's sufficient for peak labels.

## Context
- The Labels Overlay is a raster `TileLayer` rendered by `src/components/layers/LabelLayer.tsx`
- It reads `tileConfig.labelsUrl` from `src/config.ts` via `getTileConfig(design.tilePreset)`
- Three tile presets currently use Stamen terrain/toner label tiles that include metric peak elevations:
  1. `stadia-watercolor` (line ~87): `stamen_terrain_labels` → shows metric peaks
  2. `stadia-toner-nolabels` (line ~106): `stamen_toner_labels` → shows metric peaks
  3. `stadia-terrain-nolabels` (line ~131): `stamen_terrain_labels` → shows metric peaks
- Carto provides labels-only tiles with no elevation data:
  - Light: `https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png`
  - Dark: `https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png`
- Other presets (carto-light-nolabels, carto-dark-nolabels, carto-voyager-nolabels) already use Carto label tiles correctly.

## Changes Required

### `src/config.ts`
1. **`stadia-watercolor`** labelsUrl: change from `stamen_terrain_labels` to Carto `light_only_labels`:
   ```
   labelsUrl: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
   ```
2. **`stadia-toner-nolabels`** labelsUrl: change from `stamen_toner_labels` to Carto `dark_only_labels` (toner is dark-themed):
   ```
   labelsUrl: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
   ```
3. **`stadia-terrain-nolabels`** labelsUrl: change from `stamen_terrain_labels` to Carto `light_only_labels`:
   ```
   labelsUrl: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
   ```

### No other files need changes
- `LabelLayer.tsx` reads `labelsUrl` generically — no changes needed
- `CityLayer.tsx` independently renders peaks with feet — no changes needed
- `DesignSidebar.tsx` Labels section with Elevation Units toggle works independently — no changes needed

## Verification
1. `npx tsc --noEmit` — no type errors
2. Run dev server, create/open a map:
   - Select **Watercolor** tile preset → toggle **Labels Overlay ON** → confirm labels show road/city names without metric peak elevations
   - Toggle **Cities & Peaks ON** → peaks should show elevation in feet (e.g., "14,440 ft")
   - Select **Toner (no labels)** → toggle Labels ON → confirm dark-themed labels, no metric elevations
   - Select **Terrain (no labels)** → toggle Labels ON → confirm labels, no metric elevations
3. Visual check: Carto labels on Watercolor have a clean modern look vs. the vintage tile style. If it looks jarring, consider adding an opacity prop to the label TileLayer (stretch — not required for this phase).

## After completion
Update ROADMAP.md: change L1 status from 🔲 to ✅.
