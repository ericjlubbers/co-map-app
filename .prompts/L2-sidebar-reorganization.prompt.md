# L2 — Sidebar Reorganization & Customize Tab Gating

## Goal
Reorganize the editor UI so reporters see only production-ready features. Move Roads, Waterways, Parks, Lakes layer controls and the Lock View button into the Customize tab behind an "Under Development" banner. Keep Tiles, Labels, Regions, Points, Cities & Peaks, and State Border in the Settings sidebar. The Customize tab remains visible but clearly marked as developmental.

## Context

### Current structure
- **MapEditorPage.tsx** (~L630): Toolbar with Settings | Customize mode toggle buttons + Lock View button (always visible)
- **DesignSidebar.tsx**: Layers group contains accordion sections: Tiles, Labels, Regions, Points, Roads (~L530), Waterways (~L600), Parks (~L660), Lakes (~L690), Cities & Peaks (~L730), State Border (~L780)
- **CustomizeSidebar.tsx**: Contains quicksearch, primary elements list, style controls, publication bounds
- **EditorMode type** (`src/types.ts` L194): `"settings" | "customize"`

### Target structure
**Settings mode (DesignSidebar)** — Layers group keeps:
- Tiles (tile preset + labels overlay toggle)
- Labels (label font + elevation units)
- Regions (county lines)
- Points (color, cluster, marker, fly-to)
- Cities & Peaks (city/peak toggles + styling)
- State Border (border + outside fade)

**Customize mode (CustomizeSidebar)** — adds at top:
- "Under Development" banner with construction icon (🚧 or FontAwesome `faHardHat`/`faTriangleExclamation`) and brief text
- Lock View controls (moved from toolbar)
- Collapsible "Map Layers" section containing: Roads, Waterways, Parks, Lakes toggles and their full sub-controls (moved from DesignSidebar)
- Existing customize features remain below (quicksearch, primary elements, style controls, publication bounds)

**Toolbar changes (MapEditorPage.tsx)**:
- Customize tab button gets a subtle "Dev" badge (small gray/amber pill text)
- Lock View button only visible when `editorMode === "customize"`

## Changes Required

### 1. `src/components/DesignSidebar.tsx`
**Remove** the following accordion sections from the Layers `<SidebarGroup>`:
- Roads section (the `<AccordionSection title="Roads">` block and all its contents)
- Waterways section (the `<AccordionSection title="Waterways">` block)
- Parks section (the `<AccordionSection title="Parks">` block)
- Lakes section (the `<AccordionSection title="Lakes">` block)

The remaining Layers group order should be: Tiles → Labels → Regions → Points → Cities & Peaks → State Border.

**Also remove** any unused imports that were only needed by the removed sections (check for `faRoad`, etc. — but these likely aren't imported here).

### 2. `src/components/CustomizeSidebar.tsx`
**Add at the top of the sidebar content** (after the header, before quicksearch):

```tsx
{/* Under Development banner */}
<div className="mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
  <div className="flex items-center gap-2 text-amber-800">
    <FontAwesomeIcon icon={faTriangleExclamation} className="text-sm" />
    <span className="text-xs font-semibold">Under Development</span>
  </div>
  <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
    These features are under active development and may change. Use the Settings tab for production-ready map controls.
  </p>
</div>
```

**Add a "Map Layers" collapsible section** below the banner containing the moved layer controls. These need access to `useDesign()` — CustomizeSidebar will need to import it. Add a simple accordion or collapsible div with Roads, Waterways, Parks, Lakes toggles and their sub-controls.

The simplest approach: import `useDesign` and the `DesignState` type, then render the same controls that were in DesignSidebar. To avoid code duplication, you can create a simplified version with just the toggle + basic color/weight controls, OR extract the full blocks.

**Add Lock View controls** in the banner area or as a separate section. CustomizeSidebar needs new props:
```tsx
viewLocked?: boolean;
onLockView?: () => void;
onUnlockView?: () => void;
onClearCuration?: () => void;
```

### 3. `src/pages/MapEditorPage.tsx`
**Customize tab button** (~L630): Add a small "Dev" badge:
```tsx
<FontAwesomeIcon icon={faPaintBrush} className="text-[11px]" />
Customize
<span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-600">DEV</span>
```

**Lock View button** (~L735): Wrap in `{editorMode === "customize" && ( ... )}` so it only shows in Customize mode.

**Pass new props** to `CustomizeSidebar` when rendering it from `MapEditorContent`:
- `viewLocked`, `onLockView={handleLockView}`, `onUnlockView={handleUnlockView}`, `onClearCuration={handleClearCuration}`

### 4. `src/components/MapEditorContent.tsx`
Pass the Lock View props through to `CustomizeSidebar` component. MapEditorContent needs to accept and forward:
- `viewLocked`, and the lock/unlock/clear handlers from MapEditorPage

Actually, check how MapEditorContent currently renders CustomizeSidebar — it may already have access to these via props or need new ones threaded through.

### 5. `src/types.ts`
No type changes needed — `EditorMode` already supports `"customize"`.

## Key Implementation Notes
- The moved layer controls (Roads/Waterways/Parks/Lakes) still use `useDesign()` context for their state — this context is available throughout the component tree, so moving the UI controls doesn't affect functionality.
- `design.showRoads`, `design.showWaterways`, etc. remain in `DesignState` and are saved/loaded normally. We're only moving WHERE the toggle UI appears.
- The Customize tab's under-development features (primary elements, quicksearch, publication bounds) should still work exactly as before. This is purely a UI reorganization.
- Lock View state and handlers currently live in `MapEditorPage.tsx` — the handlers just need to be passed down through props to CustomizeSidebar.

## Verification
1. `npx tsc --noEmit` — no type errors
2. Open a map in the editor:
   - **Settings mode**: Layers group shows Tiles, Labels, Regions, Points, Cities & Peaks, State Border only. No Roads/Waterways/Parks/Lakes.
   - **Customize mode**: Banner visible at top with "Under Development" text. Roads/Waterways/Parks/Lakes controls accessible. Lock View controls present. Quicksearch, primary elements, bounds all still functional.
   - Toggle Roads ON in Customize → roads render on map. Switch to Settings → roads still visible (design state persists). Switch back to Customize → Roads toggle still ON.
   - Lock View works from Customize tab.
   - Toolbar shows "DEV" badge on Customize button.
3. Embed page: No visual changes (embeds don't show sidebars).
4. `npx vite build` — production build succeeds.

## After completion
Update ROADMAP.md: change L2 status from 🔲 to ✅.
