# Alternity Warships Generator - Copilot Instructions

## Project Overview

Desktop app for generating Warships and Stations/Bases for the **Alternity** sci-fi tabletop RPG, implementing construction rules from the "Warships" sourcebook by Richard Baker. Guides users through a step-by-step building wizard, supporting both ship and station design types.

## Tech Stack

- **Frontend**: React 19 + TypeScript (strict mode)
- **UI Framework**: Material-UI (MUI) v7
- **Build Tool**: Vite
- **Desktop**: Electron (context isolation enabled)
- **Testing**: Vitest + Testing Library (jsdom)
- **PDF Generation**: jsPDF + html2canvas
- **Package Manager**: npm

## Commands

```bash
npm run dev:electron    # Run in development mode (Vite + Electron)
npm run build           # TypeScript check + Vite build
npm run build:electron  # Build React + Electron for production
npm run lint            # ESLint (flat config)
npm run test            # Run all tests (vitest run)
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run dist:win        # Create Windows installer
npm run dist:mac        # Create macOS installer
npm run dist:linux      # Create Linux AppImage
```

## Architecture

### Data Flow

**JSON data files** → `dataLoader.ts` (runtime load via Electron IPC) → **Services** (calculate) → **Hooks** (state + derived) → **Components** (display)

- `src/data/` contains JSON game data files loaded at runtime (not bundled imports)
- `dataLoader.ts` loads data via Electron IPC in production, falls back to bundled imports in dev/web mode
- In production, JSON files are copied to `resources/data/` and are user-editable
- After base data loads, the **mod system** merges enabled mods in priority order (`modService.ts`)
- Save/Load uses Electron IPC for native file dialogs (`saveService.ts`)

### State Management

All design state is managed through custom hooks, not directly in `App.tsx`:

- **`useWarshipState`** — All 27+ design variables, setters, undo/redo, dirty tracking, `buildCurrentState()` / `applyState()` helpers
- **`useDesignCalculations`** — Memoized derived values (HP totals, PP balance, costs, stats) from all installed systems
- **`useSaveLoad`** — Save/load logic via Electron IPC file dialogs
- **`useAutoSave`** — Periodic auto-save to temp location with crash recovery
- **`useUndoHistory`** — Generic undo/redo history stack (used by `useWarshipState`)
- **`useNotification`** — Snackbar notification state management
- **`useStepperScroll`** — Horizontal stepper scroll arrows
- **`useElectronMenuHandlers`** — Electron menu IPC event listeners

`App.tsx` orchestrates these hooks and passes state as props to step components. It manages UI-level state (`AppMode`, active step, dialogs) and renders the appropriate view.

### App Modes

`App.tsx` has five modes (`AppMode`): `'loading'` → `'welcome'` → `'builder'` | `'modManager'` | `'library'`. The welcome page is the entry point; builder is the main wizard; library browses saved designs; modManager edits mods.

### Key Directories

- `src/components/` — One `*Selection.tsx` component per wizard step, plus dialogs and sub-directories:
  - `shared/` — Reusable components: `EditableDataGrid`, `ArcRadarSelector`, `TechTrackCell`, `TruncatedDescription`, `TabPanel`, `StepHeader`, `ResourceBarChip`, `BudgetChart`, `ConfirmDialog`
  - `summary/` — Summary sub-components: `SystemsTab`, `DescriptionTab`, `FireDiagram`, `DamageZonesOverview`
  - `library/` — Ship Library: `ShipLibrary`, `ShipCard` (browse/search saved designs)
- `src/hooks/` — Custom hooks for state management, save/load, undo/redo, auto-save, notifications
- `src/services/` — Business logic: one `*Service.ts` per game subsystem, plus:
  - `formatters.ts` — All display formatting (costs, tech tracks, ship classes, design types, etc.)
  - `dataLoader.ts` — Dual-cache data loading (base + mod-merged) with Electron IPC
  - `saveService.ts` — Serialize/deserialize warship state, save file versioning & migration
  - `ordnanceService.ts` — Ordnance design creation, launch system calculations, export/import
  - `libraryService.ts` — Ship library scanning, filtering, sorting
  - `modService.ts` / `modValidationService.ts` / `modEditorSchemas.ts` — Mod system
  - `pdfExportService.ts` — PDF export (full sheet + compact combat reference)
  - `utilities.ts` — Shared utility functions
- `src/types/` — TypeScript interfaces mirroring Warships rulebook terminology; one file per subsystem, plus `common.ts` for shared types, `electron.d.ts` for IPC API
- `src/data/` — 14 JSON game data files (hulls, armor, weapons, ordnance, etc.)
- `src/constants/` — `tableStyles.ts` (shared table styling), `version.ts` (app version), `steps.ts` (step definitions + `getStepsForDesign()`), `domainColors.ts` (centralized color tokens for budget charts, damage zones, fire arcs)
- `electron/` — `main.ts` (main process), `preload.ts` (IPC bridge)

### Design Types & Dynamic Steps

The app supports two design types (`DesignType`): **warship** and **station**.

When creating a new design, a `DesignTypeDialog` lets users choose the type. Stations have three sub-types (`StationType`):
- **Ground Base** — Surface installation; may have breathable atmosphere and natural gravity (surface environment flags: `surfaceProvidesLifeSupport`, `surfaceProvidesGravity`). No Engines or FTL steps.
- **Outpost** — Sealed structure on hostile surface. Must provide own life support and gravity. No Engines or FTL steps.
- **Space Station** — Orbital/deep-space installation. Engines and FTL become optional steps.

Steps are defined as `StepDef` objects with `StepId` identifiers (not numeric indices). The function `getStepsForDesign()` in `src/constants/steps.ts` filters/adjusts steps based on design type. The `renderStepContent()` switch uses `activeStepId` string matching, and the stepper completion logic uses `step.id`. **Never use hardcoded numeric step indices.**

Station hulls are stored in `hulls.json` under the `stationHulls` key (separate from `hulls` for ships) and loaded via `getStationHullsData()` / `getAllStationHulls()`.

### Building Steps (warship — all 13)

1. Hull (required) → 2. Armor → 3. Power Plant (required) → 4. Engines (required) → 5. FTL Drive → 6. Support Systems → 7. Weapons → 8. Defenses → 9. Sensors (required) → 10. C4 (required) → 11. Hangars & Misc → 12. Damage Zones (required) → 13. Summary

Station step lists vary: ground bases/outposts skip Engines & FTL; space stations keep all steps but Engines becomes optional.

### Ordnance System

The Weapons step includes an Ordnance tab for designing missiles, bombs, and mines:
- `OrdnanceDesignDialog` — Multi-step dialog for creating ordnance (propulsion → warhead → guidance → summary)
- `OrdnanceSelection` — Launch system CRUD + ordnance loading + export/import
- Designs store component IDs only; calculated stats are derived at load time
- Ordnance designs can be exported/imported independently via `.ordnance.json` files for reuse across ships

### Mod System

Mods live in `<userData>/mods/<modName>/` with a `mod.json` manifest. Each mod can provide replacement or additive data for any game data file. Key files:
- `src/types/mod.ts` — Mod types (`ModManifest`, `Mod`, `AltmodFile`)
- `src/services/modService.ts` — IPC wrappers for mod management
- `src/services/modValidationService.ts` — Validates mod data against schemas
- `src/services/modEditorSchemas.ts` — Defines editor column schemas per data file section
- `src/services/dataLoader.ts` — Merges mod data after base load (dual-cache: `pureBaseCache` + mod-merged `cache`)
- `src/components/ModManager.tsx` / `ModEditor.tsx` — Mod UI with `EditableDataGrid`

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
- Step headers use the `StepHeader` shared component from `src/components/shared/`
- **Step identification**: Always use `StepId` strings, never hardcoded numeric indices

### Avoiding Code Duplication

Before adding a new helper, check if it already exists:

1. **Cost formatting**: Use `formatCost()` from `src/services/formatters.ts`
2. **All UI formatting**: Check `src/services/formatters.ts` first (tech track names, ship classes, design types, station types, etc.)
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
- **Surface environment awareness**: When `surfaceProvidesLifeSupport` or `surfaceProvidesGravity` is true, show info banners in Support Systems and adjust chips/validation accordingly (no gravity tab, "Surface Gravity"/"Life Support: Surface" chips)

### Add/Install Interaction Models

Steps use three different patterns for adding items. Follow the existing pattern for each step:

1. **Select → Configure → Add** (dominant pattern): Click a table row to select it, a configuration form appears (quantity, HP allocation, etc.), user clicks "Add" button. Used by: Power Plants, Engines, FTL, Weapons, Sensors, C4, Hangars, Defenses, Support Systems.
2. **Click-to-toggle**: Clicking a table row directly installs/removes the item with no intermediary form. Rows show a circle/check icon to indicate toggle state. Used by: Armor.
3. **Click-to-install**: Clicking a table row immediately installs one unit (some items in Hangars & Misc with `instantAdd: true` behavior).

### Destructive Action Protection

- **Bulk operations** (Clear All, Remove All, Unassign All): Always use `ConfirmDialog` from `src/components/shared/` before executing.
- **Hull change with data**: Show confirmation when armor layers or power plants exist.
- **Dependency removal**: Warn when removing a power plant creates a power deficit, or removing the last computer core orphans fire/sensor controls.

### Chip Color Scheme

**Section Page Chips** (all `outlined` variant):
- Gray (`default`): Consumption — HP used, Power consumed, Cost
- Blue (`primary`): Production — Power generated, Acceleration, station type display
- Green (`success`): Positive state (fuel available, at capacity, gravity available)
- Red (`error`): Missing/negative state
- Yellow (`warning`): Partial state

**App Bar Chips**: Green=passed, Red=critical, Orange=warning, Gray=info

## Data Format Conventions

- JSON files store **raw values only** — no derived/display fields
- All display formatting goes through `src/services/formatters.ts`
- Tech tracks in JSON: `[]`, `["G"]`, `["P", "X"]`
- Hull data: `hulls.json` has two root keys: `hulls` (ships) and `stationHulls` (stations/bases)

## Reference Material

The `rules/` folder contains sourcebook rules text. Use those `.md` files as the authoritative reference for ship/station construction rules, hull stats, equipment costs, and game terminology.

## Post-Implementation Workflow

After completing any feature or task that appears in project tracking files:
1. **Always** update `ROADMAP.md` first to mark the item as done — use `~~strikethrough~~` and add `✅` or `(Done)` per the existing format.
2. Then check **all four** `NEXT STEPS` files — `NEXT STEPS FEATURES.md`, `NEXT STEPS CODE.md`, `NEXT STEPS TESTS.md`, `NEXT STEPS UX.md` — and mark the item as done in whichever files it appears.
3. Do this as part of the implementation — do not wait for the user to ask.
4. Match the existing strikethrough/checkmark conventions used in each file.
