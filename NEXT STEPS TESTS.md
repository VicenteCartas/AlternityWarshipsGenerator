# Next Steps — Testing

Source of truth for the testing strategy, priorities, and framework setup.

## Overall Assessment

The codebase is **exceptionally well-suited for testing**:
- ~72% of exported functions are pure (input→output, no side effects)
- Services never mutate parameters — all return new objects
- Clean separation: JSON → dataLoader → services → components
- Zero `any` types means tests can rely on TypeScript for contract verification
- Most "impure" functions only call `dataLoader` getters — easily mocked

**Estimated total:** ~875–1,020 service tests + ~195–250 component tests = **~1,100–1,270 test cases** for comprehensive coverage.

---

## Framework Recommendation ✅ DONE

### Vitest + React Testing Library

**Completed:** Installed all dependencies, created `vitest.config.ts` and `src/test/setup.ts`, added npm scripts (`test`, `test:watch`, `test:coverage`, `test:ui`).

| Tool | Purpose |
|---|---|
| **Vitest** | Test runner (native Vite integration, ESM, fast HMR) |
| **@testing-library/react** | Component tests (user-centric DOM queries) |
| **@testing-library/jest-dom** | Custom matchers (`toBeInTheDocument`, `toHaveTextContent`) |
| **@testing-library/user-event** | Realistic user interactions (click, type, keyboard) |
| **jsdom** | DOM environment for component tests |
| **v8** | Coverage provider (built into Vitest, fast) |
| **msw** (optional) | Mock Service Worker for Electron IPC stubs in integration tests |

### Configuration

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/hooks/**', 'src/components/**'],
      exclude: ['src/data/**', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 85,
      },
    },
  },
});
```

### Global Setup

```ts
// src/test/setup.ts
import '@testing-library/jest-dom';

// Global mock for dataLoader — every service depends on it
vi.mock('../services/dataLoader', () => ({
  // Return test fixtures for each getter
  getBeamWeaponsData: vi.fn(() => []),
  getProjectileWeaponsData: vi.fn(() => []),
  // ... one per getter, populated per-test via mockReturnValue
}));
```

### npm Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

---

## Service Layer Tests

### Priority Tiers

#### Tier 1 — Critical (test first)

| # | File | Lines | Exports | Est. Tests | Why Critical | User Review |
|---|------|------:|--------:|-----------:|---|---|
| T1 | saveService.ts | 990 | 5 | 80–100 | Deserialize/migrate user save files. A bug here = data loss. Must test every version migration path. | ✅ Done (72 tests) |
| T2 | weaponService.ts | 466 | 24 | 70–85 | Compound multiplier logic (mount × config × concealed × quantity). Rounding errors accumulate across all weapons. | ✅ Done (117 tests) |
| T3 | damageDiagramService.ts | 429 | 15 | 60–75 | Zone validation, capacity enforcement, weapon-arc compatibility, hit location chart. Complex rules with many edge cases. | Yes, do it |
| T4 | ordnanceService.ts | 428 | 28 | 65–80 | 3 design calculators (missile/bomb/mine), loadout management, launch system stats. Multi-step formulas. | Yes, do it |
| T5 | utilities.ts | 183 | 6 | 35 | `interpolateByPercentage` is used by every engine/FTL calculation. `filterByDesignConstraints` gates every selection table. `capitalize` promoted from pdfExportService. | ✅ Done (35 tests) |

#### Tier 2 — High Value

| # | File | Lines | Exports | Est. Tests | Why High | User Review |
|---|------|------:|--------:|-----------:|---|---|
| T6 | commandControlService.ts | 485 | 29 | 60–75 | Fire control ↔ weapon battery linking, orphan detection, computer core prerequisites. | Yes, do it |
| T7 | engineService.ts | 251 | 23 | 45–55 | Acceleration interpolation, fuel endurance, percentage bracket allocation, HP validation. | Yes, do it |
| T8 | powerPlantService.ts | 201 | 20 | 40–50 | Power generation, fuel endurance, HP allocation validation. Foundation for all power budgeting. | Yes, do it |
| T9 | defenseService.ts | 196 | 12 | 35–40 | Screen conflict detection, coverage calculation, units-for-full-coverage math. | Yes, do it |
| T10 | formatters.ts | 238 | 15 | 44 | 15 pure formatting functions used across every component. High leverage, trivial to test. | ✅ Done (44 tests) |

#### Tier 3 — Medium Value

| # | File | Lines | Exports | Est. Tests | Notes | User Review |
|---|------|------:|--------:|-----------:|---|---|
| T11 | ftlDriveService.ts | 203 | 18 | 35–45 | Jump distance calculation, hull percentage validation, fuel stats. | Yes, do it |
| T12 | sensorService.ts | 188 | 12 | 30–35 | Tracking capability, coverage calculation, arc coverage. | Yes, do it |
| T13 | armorService.ts | 122 | 13 | 35 | Multi-layer armor HP/cost, layer sorting, hull point allocation. | ✅ Done |
| T14 | supportSystemService.ts | 238 | 15 | 30–35 | Gravity/life support/stores calculations, surface environment awareness. | Yes, do it |
| T15 | hangarMiscService.ts | 224 | 9 | 20–25 | Hangar capacity, misc system HP/cost. | Yes, do it |
| T16 | modValidationService.ts | 105 | 3 | 15–20 | Field validation, row validation, cell error detection. | Yes, do it |

#### Tier 4 — Low Priority

| # | File | Lines | Exports | Est. Tests | Notes | User Review |
|---|------|------:|--------:|-----------:|---|---|
| T17 | hullService.ts | 50 | 7 | 10–12 | Thin wrappers over dataLoader. Test the data-filtering logic. | Yes, do it |
| T18 | modEditorSchemas.ts | 721 | 5 | 8–10 | Static schema definitions. Test `getEditorSection` and `getSectionsForFile` lookups. | Yes, do it |
| T19 | dataLoader.ts | 920 | 36 | 15–20 | Mostly IPC wrappers. Test cache invalidation and mod-merge logic only. | Yes, do it |
| T20 | modService.ts | 151 | 12 | 5–8 | Pure IPC wrappers — better tested at E2E level. | Skip |
| T21 | pdfExportService.ts | 1399 | 2 | 5–8 | DOM-dependent (html2canvas + jsPDF). Visual regression more appropriate. | Skip |

#### Other Testable Units

| # | File | Exports | Est. Tests | Notes | User Review |
|---|------|--------:|-----------:|---|---|
| T22 | useUndoHistory.ts (hook) | 1 | 15–20 | Debounce timing (fake timers), max history cap, undo/redo sequencing, clear, isRestoring flag. | ✅ Done (29 tests) |
| T23 | hullService.ts (`calculateHullStats`) | 1 | 10 | Pure function, moved to hullService per M6. | ✅ Done |

### Service Test Totals

| Tier | Files | Est. Tests | Status |
|------|------:|-----------:|---|
| Critical | 5 | 300–370 | T1 ✅ (72), T2 ✅ (117), T5 ✅ (35) |
| High | 5 | 220–270 | T10 ✅ (44 tests) |
| Medium | 6 | 155–190 | T13 ✅ (35 tests) |
| Low | 3 (of 5) | 33–42 | T20 + T21 skipped |
| Other | 2 | 23–30 | T22 ✅ (29), T23 ✅ (10) |
| **Total** | **21** | **~730–900** | **342 tests done so far** |

---

## Top 10 Highest-Value Test Targets

| # | Function | Service | Why |
|---|----------|---------|-----|
| 1 | `deserializeWarship()` | saveService | Processes every saved file ever opened. Version migration chains (v1→v2→...→current) must be regression-tested. |
| 2 | `interpolateByPercentage()` | utilities | Core math for engine acceleration and FTL ratings. If wrong, every ship's movement stats are wrong. |
| 3 | `calculateWeaponHullPoints()` | weaponService | Compound multiplier: base × mount × config × concealed × quantity, with `roundToHalf`. Errors accumulate. |
| 4 | `validateDamageDiagram()` | damageDiagramService | Enforces zone capacity, weapon-arc compatibility, required systems. Complex multi-rule validation. |
| 5 | `calculateMissileDesign()` | ordnanceService | Multi-step formula: propulsion + guidance + warhead → speed, accuracy, damage, range. |
| 6 | `getWeaponBatteries()` | commandControlService | Groups weapons into batteries for fire control linking. Wrong grouping = wrong combat stats. |
| 7 | `calculateTotalEngineStats()` | engineService | Aggregates engine acceleration with interpolation. Fuel endurance depends on this. |
| 8 | `hasScreenConflict()` | defenseService | Detects overlapping defensive screens. False negative = invalid design passes validation. |
| 9 | `formatCost()` | formatters | Used everywhere. Must handle 0, negatives, millions, fractional costs correctly. |
| 10 | `buildShipArmor()` | armorService | Builds multi-layer armor model. Layer ordering and cumulative HP calculations. |

---

## Component Layer Tests

### Priority Tiers

#### Tier 1 — High-Leverage Shared Components (RTL Unit)

| # | Component | Lines | Est. Tests | Rationale | User Review |
|---|-----------|------:|-----------:|---|---|
| CT1 | EditableDataGrid | 862 | 35–45 | Reused across entire ModEditor for all 14 data sections. Inline editing, undo/redo, add/delete/duplicate/reorder, Tab nav, keyboard shortcuts. | Yes, do it |
| CT2 | ArcRadarSelector | 214 | 15–20 | Custom SVG interactive component. Arc toggling, max arc enforcement, zero-arc gating, click handling. | Yes, do it |

#### Tier 2 — Complex Interaction Flows (RTL Integration)

| # | Component | Lines | Est. Tests | Rationale | User Review |
|---|-----------|------:|-----------:|---|---|
| CT3 | WeaponSelection | 1040 | 25–35 | Full weapon pipeline: select → configure (mount, arcs, qty) → add → edit → remove. 4 weapon tabs + ordnance. | Yes, do it |
| CT4 | DamageDiagramSelection | 1249 | 25–30 | Drag-and-drop pool→zone, zone→zone, multi-select, auto-assign, capacity enforcement, category filter. | Yes, do it |
| CT5 | OrdnanceDesignDialog | 1024 | 15–20 | Multi-step wizard (missile 4 steps, bomb 3, mine 4), constraint filtering, design preview. | Yes, do it |
| CT6 | SummarySelection | 1162 | 15–20 | Validation display, stat aggregation, tab rendering, PDF export trigger, image upload. | Yes, do it |
| CT7 | DesignTypeDialog | 300 | 10–12 | Warship/station toggle, sub-type selection, surface environment checkboxes, mod selection. | Yes, do it |
| CT8 | ArmorSelection | 314 | 10–12 | Weight filter, click-to-toggle selection, multi-layer management, clear/remove actions. | Yes, do it |

#### Tier 3 — Summary Sub-components (RTL + Snapshot)

| # | Component | Lines | Est. Tests | Rationale | User Review |
|---|-----------|------:|-----------:|---|---|
| CT9 | FireDiagram | 333 | 8–10 | SVG arc rendering, weapon count colors, zero-range conditional, weapon detail table. | Yes, do it |
| CT10 | DamageZonesOverview | 144 | 6–8 | Zone cards, over-limit highlighting, empty state. | Yes, do it |
| CT11 | SystemsTab | 460 | 8–10 | All subsystem sections, conditional FTL, correct totals. | Yes, do it |
| CT12 | DescriptionTab | 157 | 5–6 | Image upload validation (type + 5MB limit), image display/removal, lore input. | Yes, do it |

#### Tier 4 — Simple Components (RTL Unit)

| # | Component | Lines | Est. Tests | Rationale | User Review |
|---|-----------|------:|-----------:|---|---|
| CT13 | PdfExportDialog | 163 | 5–6 | Checkbox options, Select All/None, Export callback. | Yes, do it |
| CT14 | AboutDialog | 110 | 2–3 | Version display, links, close. | Skip |
| CT15 | StepHeader | 24 | 3–4 | Step number, name, Required/Optional chip. | Skip |
| CT16 | TruncatedDescription | 37 | 2–3 | Truncation, tooltip, maxLines. | Skip |
| CT17 | TechTrackCell | 26 | 3–4 | Empty→“-”, single code + tooltip, multiple comma-separated. | Skip |
| CT18 | TabPanel | 30 | 2–3 | Conditional rendering, ARIA attributes. | Skip |

### Components NOT Worth Unit Testing

| Component | Lines | Reason |
|-----------|------:|--------|
| HullSelection | 245 | Trivial filtered table. Logic in hullService (tested separately). |
| PowerPlantSelection | 883 | Standard add/remove + slider pattern. Same as 6 other steps. |
| EngineSelection | 986 | Same pattern. Service-layer tests cover calculations. |
| FTLDriveSelection | 861 | Same pattern. |
| SupportSystemsSelection | 1391 | 4 tabs of same pattern. Maybe 5–8 tests later for surface-environment UI. |
| CommandControlSelection | 1081 | Standard pattern. Fire control linking tested at service layer. |
| SensorSelection | 442 | Standard pattern. |
| DefenseSelection | 658 | Standard pattern. |
| HangarMiscSelection | 629 | Standard pattern. |
| OrdnanceSelection | 736 | Covered by OrdnanceDesignDialog + WeaponSelection integration tests. |
| LaunchSystemEditForm | 331 | Sub-form tested as part of OrdnanceSelection flow. |
| ModEditor | 797 | Thin wrapper around tested EditableDataGrid. |
| ModManager | 476 | IPC-heavy. Better suited for E2E tests. |
| WelcomePage | 156 | Static display, no logic. |

### Component Test Totals

| Tier | Components | Est. Tests | User Review |
|------|:----------:|-----------:|---|
| Shared (Tier 1) | 2 | 50–65 | All approved |
| Integration (Tier 2) | 6 | 100–129 | All approved |
| Summary (Tier 3) | 4 | 27–34 | All approved |
| Simple (Tier 4) | 1 (of 6) | 5–6 | CT14–CT18 skipped |
| **Total** | **13** | **~182–234** | |

---

## Testing Challenges & Solutions

| Challenge | Impact | Solution |
|---|---|---|
| Every service imports `dataLoader` | All service tests need mocked data | Global `vi.mock('../services/dataLoader')` in setup file. Per-test: `vi.mocked(getBeamWeaponsData).mockReturnValue(testFixtures)` |
| `roundToHalf()` is private in weaponService | Can't test directly | Test indirectly via `calculateWeaponHullPoints()` with inputs that exercise rounding boundaries |
| `useUndoHistory` debounce (500ms) | Tests need timer control | `vi.useFakeTimers()` + `vi.advanceTimersByTime(500)` |
| DamageDiagram drag-and-drop | RTL doesn't natively support DnD | Use `fireEvent.drag*` sequence or mock the drag handler callbacks directly |
| PDF export (html2canvas + jsPDF) | DOM rendering dependency | Skip unit tests; cover with visual regression (Playwright screenshot comparison) |
| Electron IPC in modService | `window.electronAPI` doesn't exist in test | Mock `window.electronAPI` in setup or use conditional stubs (already has dev-mode fallback) |
| Save file migration chain | Must test v1→v2→...→current cumulatively | Create fixture files for each historical save version. Test `deserializeWarship` with each. |

---

## Recommended Implementation Order

### Phase 1 — Foundation (Week 1)
1. Install Vitest + RTL + jest-dom + user-event
2. Create `vitest.config.ts` and `src/test/setup.ts`
3. Add npm scripts (`test`, `test:watch`, `test:coverage`)
4. Create `src/test/fixtures/` with sample data for each JSON data file
5. Write global `dataLoader` mock
6. **First tests:** `formatters.ts` (15 pure functions, zero dependencies, immediate confidence)
7. **Second tests:** `utilities.ts` (`interpolateByPercentage`, `filterByDesignConstraints`)

### Phase 2 — Critical Services (Weeks 2–3)
8. `saveService.ts` — migration chain + serialize/deserialize round-trip
9. `weaponService.ts` — multiplier combinations, rounding edge cases
10. `damageDiagramService.ts` — zone validation, arc compatibility
11. `ordnanceService.ts` — design calculators, loadout management

### Phase 3 — High-Value Services (Week 4)
12. `commandControlService.ts` — battery grouping, orphan detection
13. `engineService.ts` — acceleration interpolation, fuel endurance
14. `powerPlantService.ts` — power budget, HP allocation
15. `defenseService.ts` — screen conflicts, coverage math

### Phase 4 — Shared Components (Week 5)
16. `EditableDataGrid` — inline editing, keyboard navigation, undo/redo
17. `ArcRadarSelector` — arc toggling, max enforcement
18. Simple shared components (StepHeader, TechTrackCell, TruncatedDescription, TabPanel)

### Phase 5 — Integration Tests (Weeks 6–7)
19. `WeaponSelection` integration flow
20. `DamageDiagramSelection` interaction tests
21. `OrdnanceDesignDialog` wizard flow
22. `DesignTypeDialog`, `ArmorSelection`

### Phase 6 — Remaining & Polish (Week 8)
23. Remaining medium-priority services
24. Summary sub-components
25. `useUndoHistory` hook with fake timers
26. Coverage gap analysis and fill

---

## Coverage Targets

| Metric | Target | Stretch |
|--------|-------:|--------:|
| Service functions | 85% | 95% |
| Service lines | 80% | 90% |
| Component lines | 60% | 75% |
| Overall lines | 70% | 80% |

---

## Grand Total

| Layer | Files | Est. Tests |
|-------|------:|-----------:|
| Services + Hooks + Types | 21 | 730–900 |
| Components | 13 | 182–234 |
| **Total** | **34** | **~910–1,135** |
