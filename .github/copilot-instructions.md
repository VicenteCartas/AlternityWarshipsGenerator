# Alternity Warships Generator - Copilot Instructions

## Project Overview

Desktop app for generating Warships for the **Alternity** sci-fi tabletop RPG, implementing ship construction rules from the "Warships" sourcebook by Richard Baker. Guides users through a step-by-step warship building wizard.

## Tech Stack

- **Frontend**: React 19 + TypeScript (strict mode)
- **UI Framework**: Material-UI (MUI) v7
- **Build Tool**: Vite
- **Desktop**: Electron (context isolation enabled)
- **PDF Generation**: jsPDF + html2canvas
- **Package Manager**: npm

## Commands

```bash
npm run dev:electron    # Run in development mode (Vite + Electron)
npm run build           # TypeScript check + Vite build
npm run build:electron  # Build React + Electron for production
npm run lint            # ESLint (flat config)
npm run dist:win        # Create Windows installer
npm run dist:mac        # Create macOS installer
npm run dist:linux      # Create Linux AppImage
```

There is no test framework configured.

## Architecture

### Data Flow

**JSON data files** → `dataLoader.ts` (runtime load via Electron IPC) → **Services** (calculate) → **Components** (display)

- `src/data/` contains JSON game data files loaded at runtime (not bundled imports)
- `dataLoader.ts` loads data via Electron IPC in production, falls back to bundled imports in dev/web mode
- In production, JSON files are copied to `resources/data/` and are user-editable
- After base data loads, the **mod system** merges enabled mods in priority order (`modService.ts`)
- All app state lives in `App.tsx` and is passed down as props to step components
- Save/Load uses Electron IPC for native file dialogs (`saveService.ts`)

### Key Directories

- `src/components/` — One `*Selection.tsx` component per wizard step, plus dialogs and `shared/` reusable components
- `src/services/` — Business logic: one `*Service.ts` per game subsystem, plus `formatters.ts`, `dataLoader.ts`, `modService.ts`, `pdfExportService.ts`, `saveService.ts`
- `src/types/` — TypeScript interfaces mirroring Warships rulebook terminology; one file per subsystem
- `src/data/` — JSON game data (hulls, armor, weapons, etc.)
- `src/constants/` — `tableStyles.ts` (shared table styling), `version.ts` (app version)
- `electron/` — `main.ts` (main process), `preload.ts` (IPC bridge)

### Mod System

Mods live in `<userData>/mods/<modName>/` with a `mod.json` manifest. Each mod can provide replacement or additive data for any game data file. Key files:
- `src/types/mod.ts` — Mod types (`ModManifest`, `Mod`, `AltmodFile`)
- `src/services/modService.ts` — IPC wrappers for mod management
- `src/services/dataLoader.ts` — Merges mod data after base load
- `src/components/ModManager.tsx` / `ModEditor.tsx` — Mod UI

### Warship Building Steps (in order)

1. Hull (required) → 2. Armor → 3. Power Plant (required) → 4. Engines (required) → 5. FTL Drive → 6. Support Systems → 7. Weapons → 8. Defenses → 9. Command & Control (required) → 10. Sensors (required) → 11. Hangars & Misc → 12. Damage Zones (required) → 13. Summary

### Design Constraints Filtering

The app bar has global design constraints that filter available components across all steps:
- **Progress Level (PL)**: Components with PL higher than the design PL are hidden
- **Tech Tracks**: Only components matching selected tech tracks (or requiring no tech) are shown
- Components receive `designProgressLevel` and `designTechTracks` props

### Key Game Concepts

- **Hull Points (HP)**: Space for installations; each component uses HP
- **Power Points (PP)**: Energy budget; power plants generate, systems consume
- **Progress Level**: Technology era (PL 6=Fusion, 7=Gravity, 8=Energy, 9=Matter)
- **Tech Tracks**: Specialized tech fields (G, D, A, M, F, Q, T, S, P, X, C)
- **Fire Arcs**: forward, starboard, aft, port (and zero-range variants)
- **Ship Classes**: small-craft, light, medium, heavy, super-heavy

## Coding Conventions

- **Line endings**: LF only (enforced via `.gitattributes`)
- **Defensive array access**: Always use `|| []` for arrays that might be undefined/null
- **Calculations in services, not components**: Components handle display only
- **Functional React components** with hooks; no class components
- Step headers use `Typography variant="h6"` with `sx={{ mb: 1 }}` and format `"Step N: Name (Required/Optional)"`

### Avoiding Code Duplication

Before adding a new helper, check if it already exists:

1. **Cost formatting**: Use `formatCost()` from `src/services/formatters.ts`
2. **All UI formatting**: Check `src/services/formatters.ts` first (tech track names, ship classes, etc.)
3. **Data loading**: All services must use `src/services/dataLoader.ts` getters — never import JSON directly
4. **Table styling**: Use `headerCellSx`, `selectableRowSx` etc. from `src/constants/tableStyles.ts`
5. **Shared components**: Check `src/components/shared/` (TechTrackCell, TruncatedDescription, ArcRadarSelector, EditableDataGrid, TabPanel)
6. **ID properties**: Use `id` for unique identifiers in installed items

### Save File Compatibility

This app is released with users who have existing `.warship.json` save files. Any change to the save format (adding/removing/renaming fields in `src/types/saveFile.ts`) **must** include migration logic in `src/services/saveService.ts` so older saves load correctly. `SAVE_FILE_VERSION` is bumped only once per release — multiple format changes within a release share the same version bump.

### Version Management

When releasing, these must ALL be updated in sync:
- `src/constants/version.ts` → `APP_VERSION`
- `electron/main.ts` → `APP_VERSION`
- `package.json` → `version`
- `index.html` → `<title>` tag
- `src/types/saveFile.ts` → `SAVE_FILE_VERSION` (only if save format changes)

## UI Conventions

- **Desktop-first**: Optimize for large screens; maximize screen usage
- **Tables/Grids**: Expand to fill available horizontal space
- **Single scrollbar**: One horizontal scrollbar at container level when content overflows
- **Action columns last**: Place action buttons at rightmost position
- **Sort by Progress Level**: Lowest to highest PL
- **Inline editing only**: Never navigate away for edits — use expandable rows, inline forms, or overlay dialogs

### Chip Color Scheme

**Section Page Chips** (all `outlined` variant):
- Gray (`default`): Consumption — HP used, Power consumed, Cost
- Blue (`primary`): Production — Power generated, Acceleration
- Green (`success`): Positive state (fuel available, at capacity)
- Red (`error`): Missing/negative state
- Yellow (`warning`): Partial state

**App Bar Chips**: Green=passed, Red=critical, Orange=warning, Gray=info

## Data Format Conventions

- JSON files store **raw values only** — no derived/display fields
- All display formatting goes through `src/services/formatters.ts`
- Tech tracks in JSON: `[]`, `["G"]`, `["P", "X"]`

## Reference Material

`Warships.txt` in the project root contains the full Alternity Warships sourcebook text. Use it as the authoritative reference for ship construction rules, hull stats, equipment costs, and game terminology.
