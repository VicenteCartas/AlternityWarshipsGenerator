# Roadmap

Unified execution plan across all next-steps documents. Items are sequenced by dependencies, risk, and impact.

**Key principles:**
1. **Test setup first** — verify every change going forward
2. **Refactoring before features** — clean code is easier to extend safely
3. **Quick wins interleaved** — visible user improvements alongside infrastructure
4. **Dependencies respected** — C2 before C1, theme tokens before theme toggle, etc.

**Source key:** CODE = NEXT STEPS CODE.md | UX = NEXT STEPS UX.md | FEATURES = NEXT STEPS FEATURES.md | TESTS = NEXT STEPS TESTS.md

---

## Phase 1: Testing Foundation + Trivial Fixes ✅ COMPLETE
*Goal: Establish test infrastructure, knock out trivial improvements*

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 1 | Vitest setup + config + setup.ts + npm scripts | TESTS | Low | ✅ Done |
| 2 | T10: formatters.ts tests (44 tests) | TESTS | Low | ✅ Done |
| 3 | T5: utilities.ts tests (35 tests) | TESTS | Low | ✅ Done |
| 4 | U1: Fix focus outlines on stepper | UX | Trivial | ✅ Done |
| 5 | U24: ARIA labels on scroll arrows | UX | Trivial | ✅ Done |
| 6 | U23: Step label tooltips | UX | Trivial | ✅ Done |
| 7 | C3: Memoize breakdowns (useMemo) | CODE | Low | ✅ Done |
| 8 | L4: Promote `capitalize` to utilities.ts | CODE | Trivial | ✅ Done |

---

## Phase 2: State Consolidation + Quick Features ✅ COMPLETE
*Goal: Eliminate the 6-place state duplication, ship quick-win features*

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 9 | C2: buildCurrentState/applyState helpers | CODE | Low | ✅ Done |
| 10 | M5: Eliminate pass-through handlers | CODE | Trivial | ✅ Done |
| 11 | M6: Move calculateHullStats to hullService | CODE | Trivial | ✅ Done |
| 12 | M7: Move formatFTLRating to formatters | CODE | Trivial | ✅ Done |
| 13 | L3: Extract StepId/StepDef/ALL_STEPS from App.tsx | CODE | Low | ✅ Done |
| 14 | L2: Replace empty interfaces with type aliases | CODE | Trivial | ✅ Done |
| 15 | F24: Keyboard shortcuts dialog | FEATURES | Low | ✅ Done |
| 16 | A1: Clone/duplicate design | FEATURES | Low | ✅ Done |
| 17 | T23: calculateHullStats tests (10 tests) | TESTS | Low | ✅ Done |
| 18 | T13: armorService tests (35 tests) | TESTS | Low | ✅ Done |

---

## Phase 3: App.tsx Decomposition + Critical Tests ✅ COMPLETE
*Goal: Break the god component, test the most dangerous code paths*

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 19 | H4: Fix stale closure dependency arrays | CODE | Low | ✅ Done |
| 20 | C1: Extract hooks (useWarshipState, useDesignCalculations, useSaveLoad, etc.) | CODE | High | ✅ Done |
| 21 | T1: saveService tests (deserialize + migration, 72 tests) | TESTS | High | ✅ Done |
| 22 | T2: weaponService tests (117 tests) | TESTS | High | ✅ Done |
| 23 | T22: useUndoHistory hook tests (29 tests) | TESTS | Medium | ✅ Done |
| 24 | U2: ARIA labels across app (~65 elements, 20 files) | UX | Medium | ✅ Done |

---

## Phase 4: UX Quick Wins Sprint ✅ COMPLETE
*Goal: Discoverability + error prevention — high user-facing impact*

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 25 | U5: Popover chip visual affordance (ArrowDropDown icon on HP/Power/Cost chips) | UX | Low | ✅ Done |
| 26 | U11: Empty state messages in all steps (10 components) | UX | Low | ✅ Done |
| 27 | U15: Weapon tab empty messages (4 grids) | UX | Trivial | ✅ Done |
| 28 | U16: Fix summary tab order (Issues tab always visible, fixed indices) | UX | Low | ✅ Done |
| 29 | U9: Computer core prerequisite guidance (Alert in Computers tab) | UX | Trivial | ✅ Done |
| 30 | U8: Fuel tank relationship tooltip (HelpOutline icon on both fuel sections) | UX | Trivial | ✅ Done |
| 31 | U17: Overall progress indicator (N/M count in stepper) | UX | Low | ✅ Done |

---

## Phase 5: Feature Sprint — Auto-save, Clipboard, Validation ✅ COMPLETE
*Goal: Deliver the approved medium-effort features*

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 32 | A5: Auto-save / Crash Recovery | FEATURES | Low | ✅ Done |
| 33 | C12: Copy Stats to Clipboard | FEATURES | Low | ✅ Done |
| 34 | E19: Structured ship description fields | FEATURES | Low | ✅ Done |
| 35 | D15: Fire control ↔ weapon validation | FEATURES | Medium | ✅ Done |
| 36 | D16: Sensor control validation | FEATURES | Medium | ✅ Done |
| 37 | E22: Light/dark theme toggle | FEATURES | Low | ✅ Done |

---

## Phase 6: Major Component Refactoring + Tests
*Goal: Eliminate large code duplication, test complex services*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 38 | H1: SupportSystems generic SubsystemTab | CODE | High | ✅ Done (~560 lines reduced) |
| 39 | M1: WeaponSelection generic grid | CODE | Medium | ✅ Done (~285 lines reduced) |
| 40 | H2: saveService generic deserialize | CODE | Medium | ✅ Done (~144 lines reduced) |
| 41 | H3: dataLoader getter factory | CODE | Medium | ✅ Done (~238 lines reduced) |
| 42 | T3: damageDiagramService tests | TESTS | High | ✅ Done (51 tests) |
| 43 | T4: ordnanceService tests | TESTS | High | ✅ Done (57 tests) |
| 44 | T6: commandControlService tests | TESTS | High | ✅ Done (65 tests) |
| 45 | T7–T9: engine/powerPlant/defense tests | TESTS | Medium | ✅ Done (126 tests: eng 52 + pp 36 + def 38) |

---

## Phase 7: Error Prevention + Remaining UX
*Goal: Protect users from destructive actions, polish interactions*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 46 | ✅ U10: Confirmation for destructive bulk ops | UX | Medium | Clear All, Unassign All protection |
| 47 | ✅ U12: Hull change invalidation warning | UX | Medium | Prevent silent build reset |
| 48 | ✅ U13: Dependency removal warnings | UX | Medium | Power deficit, orphaned controls |
| 49 | ✅ U6: Surface power scenario toggle | UX | Medium | Essential planning tool exposed |
| 50 | ✅ U7: Damage diagram shortcuts banner | UX | Low | First-visit keyboard hint |
| 51 | ✅ U14: Document "Add" interaction models | UX | Low | Consistency improvement |
| 52 | ✅ U19: Config form visual distinction | UX | Low | Stronger border/background |
| 53 | ✅ U4: Color + icon indicators | UX | Medium | Accessibility — color blind support |

---

## Phase 8: Medium Features + Remaining Code
*Goal: Budget visualization, combat sheet, code cleanup*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 54 | ✅ B6: Budget visualization (HP/Power charts) | FEATURES | Medium | In-builder helper |
| 55 | ✅ C11: Compact combat reference sheet PDF | FEATURES | Medium | 1-page game table handout |
| 56 | ✅ M2: DamageDiagram repetitive collection | CODE | Medium | Data-driven approach |
| 57 | ✅ M3: pdfExportService split into sub-functions | CODE | Medium | Maintainability for C11 |
| 58 | ✅ M4: ordnanceService factory | CODE | Low | 3 create functions → 1 |
| 59 | ✅ L5: Shared SVG path utility | CODE | Trivial | ArcRadarSelector + FireDiagram |
| 60 | ✅ L6: Console logging behind debug flag | CODE | Low | Production hygiene |
| 61 | ✅ L7: Naming inconsistencies | CODE | Trivial | editingid → editingId, etc. |
| 62 | ✅ L8: Remove hardcoded fallback defaults | CODE | Low | Fail visibly on data load error |

---

## Phase 9: Component Tests + Final UX Polish ✅ COMPLETE
*Goal: Comprehensive component test coverage, remaining polish*

| # | Item | Source | Effort | Status |
|---|------|--------|--------|--------|
| 63 | CT1: EditableDataGrid tests (11 tests) | TESTS | High | ✅ Done |
| 64 | CT2: ArcRadarSelector tests (15 tests) | TESTS | Medium | ✅ Done |
| 65 | CT3–CT8: Integration tests (12 tests) | TESTS | High | ✅ Done |
| 66 | CT9–CT12: Summary sub-component tests (22 tests: shared 15 + summary 7) | TESTS | Medium | ✅ Done |
| 67 | CT13: PdfExportDialog tests (11 tests) | TESTS | Low | ✅ Done |
| 68 | T11–T16: Remaining service tests (173 tests: FTL 44, sensor 30, support 32, hangar 38, modValidation 29) | TESTS | Medium | ✅ Done |
| 69 | T17–T19: Low-priority service tests (modEditorSchemas 218 tests, dataLoader skipped — IPC-bound) | TESTS | Low | ✅ Done |
| 70 | U20: Domain color tokens in `constants/domainColors.ts` | UX | Medium | ✅ Done |
| 71 | U21: Welcome page onboarding (collapsible Getting Started section) | UX | Low | ✅ Done |
| 72 | U22: PDF export progress indicator (LinearProgress + generating message) | UX | Low | ✅ Done |

**Final test count: 1,109 tests across 25 files, all passing.**

---

## Phase 10: Long-Term / Nice-to-Have
*Goal: Backlog items when core is solid*

### Flagship Feature

| # | Item | Description | Source | Effort |
|---|------|-------------|--------|--------|
| 73 | A4: Ship Library / Gallery | Browse and search all saved designs with thumbnail cards showing key stats. | FEATURES | High | ✅ Done (37 tests) |

### Nice-to-Have Features

| # | Code | Item | Description | Effort |
|---|------|------|-------------|--------|
| 74a | A2 | Ship Templates / Presets | Start from pre-filled templates (e.g. "Light Corvette"). Bundled or user-created. | Medium |
| 74b | A3 | Design Comparison | Side-by-side stat comparison of two saved designs. | Medium |
| 74c | B8 | ~~Clickable Alert Chips~~ | Won't Do | — |
| 74d | B9 | ~~Per-Step Notes~~ | Won't Do | — |
| 74e | B10 | Cost Breakdown Chart | Pie or bar chart of cost by category for campaign budgeting. | Medium |
| 74f | C13 | Fleet Roster PDF | Select multiple .warship.json files → combined PDF with one page per ship. | High |
| 74g | C14 | Export Fire Diagram as Image | Save the fire arc SVG/PNG separately for campaign docs or VTTs. | Low |
| 74h | D17 | Design Efficiency Rating | Derived metrics: power utilization %, HP utilization %, weapon-to-hull ratio, defense coverage %. | Medium |
| 74i | E18 | Fleet Cost Calculator | Define fleet composition with quantities → total cost and crew requirements. | Medium |
| 74j | E21 | ~~Ordnance Design Sharing~~ | ✅ Done | — |
| 74k | F23 | ~~Interactive Tutorial / First-Run Wizard~~ | Won't Do | — |
| 74l | F25 | ~~Contextual Rule Tooltips~~ | Won't Do | — |

### Nice-to-Have UX

| # | Code | Item | Description | Effort |
|---|------|------|-------------|--------|
| 75a | U3 | ~~ArcRadarSelector Keyboard Accessible~~ | ✅ Done | — |
| 75b | U18 | Wide Tables Horizontal Scroll | Improve wide table handling — responsive columns, collapsible columns, or sticky first column. | Medium |
| 75c | U25 | ~~Fixed Width Elements Adaptability~~ | Won't Do | — |

---

## Summary

| Phase | Focus | Items | Est. Effort |
|-------|-------|------:|-------------|
| 1 | Test foundation + trivial fixes | 8 | ✅ Complete |
| 2 | State consolidation + quick features | 10 | ✅ Complete |
| 3 | App.tsx decomposition + critical tests | 6 | ✅ Complete |
| 4 | UX quick wins sprint | 7 | ✅ Complete |
| 5 | Feature sprint (auto-save, clipboard, validation) | 6 | ✅ Complete |
| 6 | Major refactoring + tests | 8 | ✅ Complete |
| 7 | Error prevention + remaining UX | 8 | ✅ Complete |
| 8 | Medium features + remaining code | 9 | ✅ Complete |
| 9 | Component tests + final polish | 10 | ✅ Complete |
| 10 | Long-term / nice-to-have | 3+ | Ongoing |
| **Total** | | **~75** | **~28–37 days** |
