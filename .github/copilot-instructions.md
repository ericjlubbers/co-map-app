# Copilot Instructions — CO Map App

## Project
Internal mapping platform for The Colorado Sun. React 19 + Vite + Leaflet frontend, Cloudflare Workers + D1 backend.

## Coding Conventions
- TypeScript strict mode. No `any` unless absolutely necessary.
- React functional components only. Hooks for state/effects.
- Tailwind v4 for styling — utility classes, no CSS modules.
- FontAwesome for icons (`@fortawesome/react-fontawesome`).
- Hono framework for worker routes.
- Design state managed via DesignContext with auto-save debounce.

## File Organization
- Pages in `src/pages/`, components in `src/components/`, layers in `src/components/layers/`.
- One component per file, PascalCase filenames.
- Shared types in `src/types.ts`. Worker types in `worker/src/types.ts`.
- API calls through `src/lib/api.ts`.

## Important Patterns
- Overpass data: Always use statewide CO_BBOX constant. Never bbox-scoped API calls.
- Layer components follow sub-layer pattern (see RoadLayer for reference).
- Data persistence through `data_config` JSON field on map records.
- Design params auto-save to API with 1000ms debounce — don't add manual save buttons.

## Testing / Verification
- `npx tsc --noEmit` for frontend type checking.
- `cd worker && npx tsc --noEmit` for worker type checking.
- `npx vite build` to verify production build.
- Always check for TypeScript errors after edits.

## Active Work
Sprint 8 Customize Mode — see ROADMAP.md for full spec. Check repo memory for architecture details.
