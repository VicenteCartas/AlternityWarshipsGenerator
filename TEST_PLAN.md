# Alternity Warships Generator — Comprehensive Test Plan

## 1. Testable Files Overview

| # | File | Lines | Exported Fns | Pure | Impure | Est. Test Cases | Priority |
|---|------|------:|:------------:|:----:|:------:|:---------------:|:--------:|
| 1 | [saveService.ts](src/services/saveService.ts) | 1007 | 5 (+2 internal) | 4 | 1 (dataLoader deps) | **85–100** | **Critical** |
| 2 | [dataLoader.ts](src/services/dataLoader.ts) | 920 | 33 | 0 | 33 (cache/IPC) | **45–55** | **Critical** |
| 3 | [commandControlService.ts](src/services/commandControlService.ts) | 485 | 29 | 26 | 3 (dataLoader) | **70–85** | **Critical** |
| 4 | [weaponService.ts](src/services/weaponService.ts) | 493 | 24 | 20 | 4 (dataLoader) | **65–80** | **Critical** |
| 5 | [damageDiagramService.ts](src/services/damageDiagramService.ts) | 494 | 15 | 12 | 3 (dataLoader) | **55–65** | **Critical** |
| 6 | [ordnanceService.ts](src/services/ordnanceService.ts) | 497 | 28 | 22 | 6 (dataLoader) | **60–70** | **High** |
| 7 | [engineService.ts](src/services/engineService.ts) | 251 | 23 | 19 | 4 (dataLoader) | **50–60** | **High** |
| 8 | [formatters.ts](src/services/formatters.ts) | 256 | 15 (+1 const) | 15 | 0 | **45–55** | **High** |
| 9 | [powerPlantService.ts](src/services/powerPlantService.ts) | 201 | 20 | 16 | 4 (dataLoader) | **45–55** | **High** |
| 10 | [ftlDriveService.ts](src/services/ftlDriveService.ts) | 203 | 18 | 15 | 3 (dataLoader) | **45–55** | **High** |
| 11 | [utilities.ts](src/services/utilities.ts) | 183 | 5 (+1 interface) | 5 | 0 | **35–45** | **High** |
| 12 | [defenseService.ts](src/services/defenseService.ts) | 196 | 12 | 9 | 3 (dataLoader) | **30–40** | **Medium** |
| 13 | [sensorService.ts](src/services/sensorService.ts) | 188 | 14 | 11 | 3 (dataLoader) | **35–45** | **Medium** |
| 14 | [supportSystemService.ts](src/services/supportSystemService.ts) | 238 | 15 | 11 | 4 (dataLoader) | **30–40** | **Medium** |
| 15 | [hangarMiscService.ts](src/services/hangarMiscService.ts) | 224 | 9 | 6 | 3 (dataLoader) | **25–30** | **Medium** |
| 16 | [armorService.ts](src/services/armorService.ts) | 122 | 13 | 10 | 3 (dataLoader) | **30–35** | **Medium** |
| 17 | [modValidationService.ts](src/services/modValidationService.ts) | 117 | 3 | 3 | 0 | **25–30** | **Medium** |
| 18 | [hullService.ts](src/services/hullService.ts) | 50 | 7 | 0 | 7 (dataLoader) | **15–20** | **Low** |
| 19 | [modService.ts](src/services/modService.ts) | 165 | 10 | 0 | 10 (all IPC) | **15–20** | **Low** |
| 20 | [pdfExportService.ts](src/services/pdfExportService.ts) | 1568 | 3 (+internal) | 1 | 2 (jsPDF/DOM) | **15–20** | **Low** |
| 21 | [modEditorSchemas.ts](src/services/modEditorSchemas.ts) | 721 | 2 fn + 4 const | 2 | 0 | **10–12** | **Low** |
| — | **Types / Hooks** | | | | | | |
| 22 | [hull.ts](src/types/hull.ts) (type file) | 112 | 1 | 1 | 0 | **8–10** | **Medium** |
| 23 | [useUndoHistory.ts](src/hooks/useUndoHistory.ts) | 134 | 1 (hook) | 0 | 1 (React hook) | **20–25** | **High** |
| | **TOTALS** | ~8K | **~282** | ~203 | ~79 | **~850–1,000** | |

---

## 2. Top 10 Highest‑Value Test Targets

### 1. `deserializeWarship()` + `migrateSaveFile()` — [saveService.ts](src/services/saveService.ts#L359)
**Priority: Critical** — ~640 lines, the single most complex function in the project.  
**Why:** This is the load path for every user's saved `.warship.json` files. A bug here corrupts or loses user data. It handles:
- Version checking and major version incompatibility
- ID migration (weapon renames, accommodation renames)
- Countermeasure quantity normalization
- Type resolution for 15+ subsystem categories (hull, armor, power plants, engines, FTL, life support, accommodations, stores, gravity, defenses, C&C, sensors, hangar/misc, weapons, ordnance, launch systems, damage zones, hit location chart)
- Graceful degradation (warnings vs. hard errors)
- Backward compatibility: old single-armor format → armorLayers array
- Fire control / sensor control cost recalculation after all systems loaded

**Key test scenarios:**
- Round-trip: `serializeWarship(state) → deserializeWarship()` preserves all fields
- Migration from every historical version to current
- Missing hull ID → hard error; missing armor → soft warning
- Legacy `armor` field migrates to `armorLayers[]`
- Weapon ID migrations (`laser-burst` → `laser-mod`, etc.)
- Accommodation ID migrations (`staterooms` → `staterooms-1st-class`)
- Countermeasure quantity migration (raw units → set count)
- Invalid JSON → `jsonToSaveFile()` returns null
- Empty/minimal save file handles all `|| []` defaults
- Station vs warship design type preserved correctly
- `getDefaultFileName()` sanitizes special characters

### 2. `interpolateByPercentage()` — [utilities.ts](src/services/utilities.ts#L53)
**Priority: Critical** — Core math used by engines *and* FTL drives for all rating lookups.  
**Why:** If interpolation is wrong, every ship's acceleration and FTL rating is wrong.

**Key test scenarios:**
- Exact breakpoint values (5%, 10%, 15%, 20%, 30%, 40%, 50%)
- Midpoint between two breakpoints (e.g., 25% between 20% and 30%)
- Below 5% with `interpolate-from-zero` (engines): e.g., 2.5% → half of 5% value
- Below 5% with `null` (FTL): returns null
- At/above 50%: caps at 50% value
- Null values in breakpoints (FTL drives with gaps): skips to lower value
- 0% with `interpolate-from-zero`: returns 0
- Negative percentage: handled gracefully
- Fractional percentages (7.5% between 5% and 10%)

### 3. `calculateWeaponHullPoints()` / `calculateWeaponCost()` / `calculateWeaponPower()` — [weaponService.ts](src/services/weaponService.ts#L181)
**Priority: Critical** — Every weapon installation's HP, cost, and power flows through these.  
**Why:** Compound multiplier logic (mount × gun config × concealment) with `roundToHalf()` rounding. Misrounding accumulates across dozens of weapons.

**Key test scenarios:**
- All 5 mount types × 4 gun configurations × concealed/not = 40 combinations
- `roundToHalf()` edge cases: 1.25→1.0, 1.26→1.5, 2.5→2.5, 3.75→3.5
- Power scales with `actualGunCount`, NOT `effectiveGunCount`
- Concealment multiplier stacks multiplicatively with mount
- Fixed mount: 0.75× both HP and cost
- Turret: 1.25× both HP and cost; triple turret: HP × 1.25 × 2
- Fallback to hardcoded defaults when JSON data not loaded
- Zero base HP/cost → result stays 0

### 4. `calculateCommandControlStats()` — [commandControlService.ts](src/services/commandControlService.ts#L313)
**Priority: Critical** — Aggregates HP, power, and cost for all C4 systems including linked fire/sensor controls.  
**Why:** The most complex stat aggregation: different cost bases (per-station, per-HP, per-linked-system), coverage calculations, computer core requirements.

**Key test scenarios:**
- Coverage‑based systems: `calculateCoverageBasedHullPoints()` with various hull sizes
- Computer core HP: `calculateRequiredComputerCoreHullPoints()` (5% of ship HP, rounding)
- Fire control cost linked to weapon battery HP
- Sensor control cost linked to sensor HP
- Orphaned fire controls / sensor controls detection
- Battery key creation/parsing round-trip
- `batteryHasFireControl()` and `sensorHasSensorControl()` checks
- Empty weapons/sensors list → zero costs
- Multiple C4 systems of same type → quantity multiplication

### 5. `createDefaultHitLocationChart()` + `canWeaponBeInZone()` — [damageDiagramService.ts](src/services/damageDiagramService.ts#L370)
**Priority: Critical** — Determines combat resolution and damage diagram validity.  
**Why:** Hit location tables define where damage goes in combat; zone-arc validation prevents misplaced weapons. These map directly to printed stat cards.

**Key test scenarios:**
- All ship classes: 2-zone (small craft ≤20 HP), 4-zone (small craft >20 HP / light), 6-zone (medium), 8-zone (heavy), 12/20-zone (super-heavy)
- Default hit location chart covers all die faces (no gaps, no overlaps)
- Zone reordering per attack direction (forward attack → forward zones first)
- `canWeaponBeInZone()`: forward-arc weapons can go in F/FC/FP/FS zones
- Zero-arc weapons only in center zones
- `sortSystemsByDamagePriority()`: weapons before defenses before sensors before command
- Within weapons: light firepower before heavy
- `isDamageDiagramComplete()`: all systems assigned, no zone over limit, no empty zones
- `validateDamageDiagram()`: detects HP overflow and empty zones

### 6. `filterByDesignConstraints()` — [utilities.ts](src/services/utilities.ts#L155)
**Priority: High** — Used by every step to filter available components.  
**Why:** If this is wrong, users see components they shouldn't (or can't see ones they should).

**Key test scenarios:**
- PL filter: items above designPL hidden
- Tech track filter: empty designTechTracks = no restriction (show all)
- Item with no tech requirement always passes
- Item requiring multiple tech tracks: ALL must be present
- Sort by PL when `sort=true` (default), unsorted when `sort=false`
- Empty items array → empty result
- Items at exactly the boundary PL → included

### 7. `calculateOrdnanceStats()` + ordnance design calculations — [ordnanceService.ts](src/services/ordnanceService.ts#L184)
**Priority: High** — Missile/bomb/mine cost, accuracy, and capacity affect launch system balance.

**Key test scenarios:**
- `calculateMissileDesign()`: sum accuracy from propulsion + guidance + warhead; capacity from propulsion size
- `calculateBombDesign()`: no guidance; propulsion from category+size lookup
- `calculateMineDesign()`: no propulsion speed; guidance + warhead
- `calculateLaunchSystemStats()`: HP, power, cost, capacity with extraHp
- `getUsedCapacity()` / `getRemainingCapacity()`: correctly sum loaded ordnance
- `canLoadOrdnance()`: compatible type, enough capacity, size fits
- `addOrdnanceToLoadout()` / `removeOrdnanceFromLoadout()`: immutable updates

### 8. `formatCost()` and related formatters — [formatters.ts](src/services/formatters.ts#L19)
**Priority: High** — Displayed on every screen; wrong formatting confuses users.

**Key test scenarios:**
- `formatCost()`: 0→`-`, 500→`$500`, 1000→`$1 K`, 1500→`$1.5 K`, 1_000_000→`$1 M`, 1_500_000→`$1.5 M`, 1_000_000_000→`$1 B`
- `formatAccuracyModifier()`: 0→`0`, 3→`+3`, -1→`-1`
- `formatTargetModifier()`: singular "step" vs plural "steps"
- `formatAcceleration()`: 0→`-`, PL6 scale suffix, decimal truncation
- `formatSensorRange()`: special range text override
- `formatAreaEffect()`: null→`-`, notes appended
- `getDesignTypeDisplayName()` / `getStationTypeDisplayName()`: all enum values
- `formatCommandControlCost()`: per-station, per-HP, per-linked-system variants

### 9. `useUndoHistory` hook — [useUndoHistory.ts](src/hooks/useUndoHistory.ts#L39)
**Priority: High** — Undo/redo is a core user interaction; subtle bugs lose work.

**Key test scenarios:**
- Push → undo → state returns to previous
- Push → undo → redo → state returns to latest
- Redo branch truncated after new push
- `maxHistory` enforcement: oldest entries trimmed
- Debounce: rapid pushes collapse into one entry
- `pushImmediate`: bypasses debounce
- `clear()`: resets everything, canUndo=false, canRedo=false
- `isRestoring` ref true during undo/redo restore (prevents re-capture)
- Undo at beginning → returns null
- Redo at end → returns null
- `flushPending` before undo: uncommitted state saved first

### 10. `validateArcs()` + `getDefaultArcs()` + `getFreeArcCount()` — [weaponService.ts](src/services/weaponService.ts#L345)
**Priority: High** — Arc validation governs weapon placement legality.

**Key test scenarios:**
- Fixed mounts: exactly 1 arc, no zero arcs
- Turrets: up to 3 standard arcs + 1 zero arc
- Small craft: get all 4 zero arcs for free
- Heavy/super-heavy weapons (M, H, SH firepower): cannot use zero arcs
- Empty arc array → error
- Sponson: 2 standard arcs, no zero arcs for non-qualifying weapons
- Bank mount: beam-only, PL8+ restriction
- Default arcs respect mount type and ship class

---

## 3. Framework Recommendation: Vitest Configuration

### Why Vitest
- **Native Vite integration** — shares your existing `vite.config.ts` transforms (TypeScript, path aliases)
- **Fast** — leverages Vite's ESM module graph; parallel by default
- **Compatible** — Jest-compatible API (`describe`, `it`, `expect`), easy to learn
- **Built-in mocking** — `vi.mock()`, `vi.fn()`, `vi.spyOn()` for dataLoader/IPC stubs

### Recommended Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom for useUndoHistory (needs React hooks)
    environment: 'jsdom',
    globals: true,
    
    // Only test service/utility/type files (not components initially)
    include: [
      'src/services/**/*.test.ts',
      'src/types/**/*.test.ts',
      'src/hooks/**/*.test.ts',
    ],
    
    // Setup file for common mocks
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage config
    coverage: {
      provider: 'v8',
      include: [
        'src/services/**/*.ts',
        'src/types/hull.ts',
        'src/hooks/**/*.ts',
      ],
      exclude: [
        'src/services/pdfExportService.ts', // DOM-heavy, test separately
        'src/services/modService.ts',        // Pure IPC wrapper, mock at boundary
        'src/services/modEditorSchemas.ts',  // Static data, low value
      ],
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 75,
      },
    },
  },
});
```

### Required Packages

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react-hooks
```

### Global Test Setup

```typescript
// src/test/setup.ts
import { vi } from 'vitest';

// ============ dataLoader mock ============
// Every service imports from dataLoader. Mock it globally,
// then override per-test with specific data as needed.
vi.mock('../services/dataLoader', () => ({
  getHullsData: vi.fn(() => []),
  getStationHullsData: vi.fn(() => []),
  getArmorTypesData: vi.fn(() => []),
  getArmorWeightsData: vi.fn(() => []),
  getArmorAllowMultipleLayers: vi.fn(() => false),
  getPowerPlantsData: vi.fn(() => []),
  getFuelTankData: vi.fn(() => ({ id: 'fuel-tank', costPerHullPoint: 1000 })),
  getEnginesData: vi.fn(() => []),
  getFTLDrivesData: vi.fn(() => []),
  getSensorsData: vi.fn(() => []),
  getHangarMiscSystemsData: vi.fn(() => []),
  getLaunchSystemsData: vi.fn(() => []),
  getPropulsionSystemsData: vi.fn(() => []),
  getWarheadsData: vi.fn(() => []),
  getGuidanceSystemsData: vi.fn(() => []),
  getBeamWeaponsData: vi.fn(() => []),
  getProjectileWeaponsData: vi.fn(() => []),
  getTorpedoWeaponsData: vi.fn(() => []),
  getSpecialWeaponsData: vi.fn(() => []),
  getMountModifiersData: vi.fn(() => null),
  getGunConfigurationsData: vi.fn(() => null),
  getConcealmentModifierData: vi.fn(() => null),
  getLifeSupportData: vi.fn(() => []),
  getAccommodationsData: vi.fn(() => []),
  getStoreSystemsData: vi.fn(() => []),
  getGravitySystemsData: vi.fn(() => []),
  getDefenseSystemsData: vi.fn(() => []),
  getCommandControlSystemsData: vi.fn(() => []),
  getTrackingTableData: vi.fn(() => null),
  getDamageDiagramDataGetter: vi.fn(() => null),
  getActiveMods: vi.fn(() => []),
  isDataLoaded: vi.fn(() => true),
}));

// ============ Electron IPC mock ============
// For modService tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    listMods: vi.fn(),
    updateModSettings: vi.fn(),
    createMod: vi.fn(),
    deleteMod: vi.fn(),
    readModFile: vi.fn(),
    saveModFile: vi.fn(),
    exportMod: vi.fn(),
    importMod: vi.fn(),
  },
  writable: true,
});
```

### Test File Naming Convention

```
src/services/armorService.ts        → src/services/__tests__/armorService.test.ts
src/services/saveService.ts         → src/services/__tests__/saveService.test.ts
src/types/hull.ts                   → src/types/__tests__/hull.test.ts
src/hooks/useUndoHistory.ts         → src/hooks/__tests__/useUndoHistory.test.ts
```

---

## 4. Estimated Total Test Count

| Category | Files | Est. Test Cases |
|----------|------:|----------------:|
| Save/Load (serialize, deserialize, migration) | 1 | 85–100 |
| Weapon calculations & arc validation | 1 | 65–80 |
| Command & Control (C4) stats | 1 | 70–85 |
| Damage diagram & hit location | 1 | 55–65 |
| Ordnance (missiles, bombs, mines) | 1 | 60–70 |
| Engine calculations | 1 | 50–60 |
| Power plant calculations | 1 | 45–55 |
| FTL drive calculations | 1 | 45–55 |
| Formatting functions | 1 | 45–55 |
| Utility functions (interpolation, filtering) | 1 | 35–45 |
| Defense calculations | 1 | 30–40 |
| Sensor calculations | 1 | 35–45 |
| Armor calculations | 1 | 30–35 |
| Support system calculations | 1 | 30–40 |
| Hangar/misc calculations | 1 | 25–30 |
| Mod validation | 1 | 25–30 |
| Data loader (cache behavior) | 1 | 45–55 |
| Hull stats (types file) | 1 | 8–10 |
| Undo/redo hook | 1 | 20–25 |
| Hull service (thin wrappers) | 1 | 15–20 |
| Mod service (IPC wrappers) | 1 | 15–20 |
| **TOTAL** | **21** | **~875–1,020** |

**Recommended MVP target:** ~400 tests covering the Critical + High priority files first, achieving >80% line coverage on the service layer.

---

## 5. Testing Challenges & Special Considerations

### 5.1 dataLoader Mocking (Highest Impact)

**Every service** calls `dataLoader.ts` getters (e.g., `getBeamWeaponsData()`, `getHullsData()`). The dataLoader has a module-level cache plus IPC calls to Electron.

**Strategy:**
- Mock `dataLoader` at the module level in setup.ts (shown above)
- In each test file, import the mocked functions and override return values:
  ```typescript
  import { getBeamWeaponsData } from '../dataLoader';
  const mockGetBeamWeapons = vi.mocked(getBeamWeaponsData);
  
  beforeEach(() => {
    mockGetBeamWeapons.mockReturnValue([testBeamWeapon]);
  });
  ```
- **Alternative for integration tests:** Load real JSON data files directly and populate the mock with real game data for full-fidelity testing

### 5.2 Electron IPC Stubs

`modService.ts` and save/load dialogs use `window.electronAPI`. In test environment:
- Mock `window.electronAPI` globally (shown in setup)
- For `modService` tests: verify IPC calls are made with correct arguments
- For `dataLoader` tests: mock the IPC path for production data loading

### 5.3 Test Data Fixtures

Create a `src/test/fixtures/` directory with:
- **`testHulls.ts`** — Representative hulls from each ship class (small-craft through super-heavy) and each station type
- **`testWeapons.ts`** — Beam, projectile, torpedo, special weapons at different PL/firepower levels
- **`testSaveFiles.ts`** — Save files at each historical version for migration testing
- **`testOrdnance.ts`** — Propulsion, guidance, warhead combinations

This avoids duplicating fixture data across test files.

### 5.4 `roundToHalf()` is Private

The weapon service's `roundToHalf()` function is not exported. Test it indirectly through `calculateWeaponHullPoints()` and `calculateWeaponCost()` using values known to exercise the rounding boundary (e.g., base HP that produces exactly x.25 or x.75).

### 5.5 ID Generation Non-Determinism

Functions like `generateId()`, `generateWeaponId()`, etc. use `Date.now()` and `Math.random()`. Tests should:
- Use `expect.stringMatching(/^weapon-\d+-[a-z0-9]+$/)` for format validation
- Not assert exact values
- Or mock `Date.now` and `Math.random` for deterministic IDs in snapshot tests

### 5.6 useUndoHistory Requires React Test Environment

The undo/redo hook uses `useRef`, `useState`, and `useCallback`. Testing requires:
- `@testing-library/react-hooks` or `@testing-library/react` with `renderHook()`
- `jsdom` environment (configured in vitest.config.ts)
- `vi.useFakeTimers()` to control the 500ms debounce
- `act()` wrappers around state updates

### 5.7 PDF Export Service — Low ROI for Unit Tests

`pdfExportService.ts` (1568 lines) is the largest file but almost entirely imperative jsPDF drawing calls. Testing strategy:
- **Don't unit test** the PDF rendering internals
- **Do test** `computeShipStats()` (the pure stat aggregation function used before rendering) — extract it or test through the export
- **Visual regression** or snapshot testing of PDF output is more appropriate but complex
- Consider a small integration test that exports a PDF and checks it's a valid PDF (non-zero byte buffer)

### 5.8 Save Migration Versioning Trap

The `migrateSaveFile()` function applies ALL migrations cumulatively regardless of source version. This is correct but means tests must cover:
- Direct v1.0.0 → current migration
- Files already at current version (no migration needed)
- Partially migrated data (e.g., some weapon IDs already renamed)
- The version field update itself

### 5.9 Module-Level Side Effects in damageDiagramService

`damageDiagramService.ts` has a module-level counter `let zoneRefCounter = 0` for `generateZoneSystemRefId()`. Tests running in parallel could see non-deterministic IDs. Mitigation:
- Don't assert exact IDs
- Or ensure tests reset the counter (would require exporting a reset function for testing)

### 5.10 Data-Driven Test Approach

Many calculations follow the same pattern: `(baseValue × multiplier × quantity)`. Consider **parameterized tests** (`it.each` / `describe.each`) for:
- All mount type × gun config combinations
- All armor weight × hull size combinations
- All PL values for filtering
- All tech track combinations

Example:
```typescript
describe.each([
  ['standard', 'single', false, 10, 10],
  ['turret', 'twin', false, 10, 18.5],
  ['fixed', 'triple', true, 10, 11.5],
] as const)('calculateWeaponHullPoints(%s, %s, concealed=%s)', 
  (mount, config, concealed, baseHP, expected) => {
    it(`returns ${expected}`, () => {
      expect(calculateWeaponHullPoints(testWeapon(baseHP), mount, config, concealed))
        .toBe(expected);
    });
});
```

---

## 6. Recommended Implementation Order

### Phase 1 — Foundation (Critical, ~250 tests)
1. `utilities.ts` — `interpolateByPercentage`, `filterByDesignConstraints`, `validateMinSize`, `validateFuelTank`
2. `formatters.ts` — All formatting functions (100% pure, zero mocking needed)
3. `weaponService.ts` — Weapon calculations, arc validation
4. `saveService.ts` — Serialize/deserialize round-trip, migration paths

### Phase 2 — Core Systems (High, ~200 tests)
5. `commandControlService.ts` — C4 stats, battery management, coverage
6. `damageDiagramService.ts` — Zone config, hit locations, validation
7. `engineService.ts` — Engine stats, fuel, acceleration
8. `powerPlantService.ts` — Power generation, fuel endurance
9. `ftlDriveService.ts` — FTL ratings, fixed-size drives, jump distance

### Phase 3 — Secondary Systems (Medium, ~150 tests)
10. `ordnanceService.ts` — Missile/bomb/mine calculations, loadouts
11. `armorService.ts` — Armor HP/cost calculations, multi-layer
12. `defenseService.ts` — Coverage calculations, screen conflicts
13. `sensorService.ts` — Sensor stats, tracking capability
14. `supportSystemService.ts` — Life support, gravity, accommodations
15. `useUndoHistory.ts` — Hook behavior with fake timers

### Phase 4 — Edge Cases & Integration (~100 tests)
16. `hangarMiscService.ts` — Capacity calculations
17. `modValidationService.ts` — Field validation
18. `dataLoader.ts` — Cache behavior, mod merging
19. `hull.ts` (type) — `calculateHullStats`
20. `hullService.ts` — Wrapper correctness
