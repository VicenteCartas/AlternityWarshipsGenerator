# Roadmap

Unified execution plan across all next-steps documents. Items are sequenced by dependencies, risk, and impact.

**Key principles:**
1. **Test setup first** — verify every change going forward
2. **Refactoring before features** — clean code is easier to extend safely
3. **Quick wins interleaved** — visible user improvements alongside infrastructure
4. **Dependencies respected** — C2 before C1, theme tokens before theme toggle, etc.

**Source key:** CODE = NEXT STEPS CODE.md | UX = NEXT STEPS UX.md | FEATURES = NEXT STEPS FEATURES.md | TESTS = NEXT STEPS TESTS.md

---

## Phase 1: Testing Foundation + Trivial Fixes
*Goal: Establish test infrastructure, knock out trivial improvements*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 1 | Vitest setup + config + setup.ts + npm scripts | TESTS | Low | Everything else depends on this |
| 2 | T10: formatters.ts tests | TESTS | Low | Easiest service, builds testing patterns |
| 3 | T5: utilities.ts tests | TESTS | Low | Core math — validates interpolation before engines/FTL |
| 4 | U1: Fix focus outlines on stepper | UX | Trivial | One-line CSS fix, accessibility critical |
| 5 | U24: ARIA labels on scroll arrows | UX | Trivial | Two `aria-label` props |
| 6 | U23: Step label tooltips | UX | Trivial | Wrap in `<Tooltip>` |
| 7 | C3: Memoize breakdowns (useMemo) | CODE | Low | Immediate perf gain, low risk, no API changes |
| 8 | L4: Promote `capitalize` to utilities.ts | CODE | Trivial | Used in 20+ places, unblocks other cleanup |

---

## Phase 2: State Consolidation + Quick Features
*Goal: Eliminate the 6-place state duplication, ship quick-win features*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 9 | C2: buildCurrentState/applyState helpers | CODE | Low | Prerequisite for C1; removes 4 duplication sites |
| 10 | M5: Eliminate pass-through handlers | CODE | Trivial | Consistent prop passing |
| 11 | M6: Move calculateHullStats to hullService | CODE | Trivial | Correct placement |
| 12 | M7: Move formatFTLRating to formatters | CODE | Trivial | Correct placement |
| 13 | L3: Extract StepId/StepDef/ALL_STEPS from App.tsx | CODE | Low | Reduces App.tsx, needed before C1 |
| 14 | L2: Replace empty interfaces with type aliases | CODE | Trivial | Remove eslint-disable comments |
| 15 | F24: Keyboard shortcuts dialog | FEATURES | Low | High user value, standalone |
| 16 | A1: Clone/duplicate design | FEATURES | Low | High user value, uses C2's buildCurrentState |
| 17 | T23: calculateHullStats tests | TESTS | Low | Test before/after the M6 move |
| 18 | T13: armorService tests | TESTS | Low | Small file, quick coverage |

---

## Phase 3: App.tsx Decomposition + Critical Tests
*Goal: Break the god component, test the most dangerous code paths*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 19 | H4: Fix stale closure dependency arrays | CODE | Low | Bug prevention before major refactoring |
| 20 | C1: Extract hooks (useWarshipState, useDesignCalculations, useSaveLoad, etc.) | CODE | High | Biggest maintainability payoff |
| 21 | T1: saveService tests (deserialize + migration) | TESTS | High | Most critical — data loss prevention |
| 22 | T2: weaponService tests | TESTS | High | Compound multiplier rounding |
| 23 | T22: useUndoHistory hook tests | TESTS | Medium | Debounce + state management validation |
| 24 | U2: ARIA labels across app | UX | Medium | Accessibility — touch every interactive element |

---

## Phase 4: UX Quick Wins Sprint
*Goal: Discoverability + error prevention — high user-facing impact*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 25 | U5: Popover chip visual affordance | UX | Low | Most powerful hidden feature exposed |
| 26 | U11: Empty state messages in all steps | UX | Low | Consistency, per-step ~2 min |
| 27 | U15: Weapon tab empty messages | UX | Trivial | Consistency with sensors |
| 28 | U16: Fix summary tab order (always show Issues) | UX | Low | Stops tab positions shifting |
| 29 | U9: Computer core prerequisite guidance | UX | Trivial | Better empty state text |
| 30 | U8: Fuel tank relationship tooltip | UX | Trivial | Help icon + tooltip |
| 31 | U17: Overall progress indicator | UX | Low | "7 of 13 complete" in stepper |

---

## Phase 5: Feature Sprint — Auto-save, Clipboard, Validation
*Goal: Deliver the approved medium-effort features*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 32 | A5: Auto-save / Crash Recovery | FEATURES | Low | Data loss prevention, pairs with save tests |
| 33 | C12: Copy Stats to Clipboard | FEATURES | Low | High user value, standalone |
| 34 | E19: Structured ship description fields | FEATURES | Low | Save format change → bump SAVE_FILE_VERSION |
| 35 | D15: Fire control ↔ weapon validation | FEATURES | Medium | New validation warnings in Summary |
| 36 | D16: Sensor control validation | FEATURES | Medium | Same pattern as D15 |
| 37 | E22: Light/dark theme toggle | FEATURES | Low | Depends on U20 (Phase 9) for ideal impl, but can ship basic version |

---

## Phase 6: Major Component Refactoring + Tests
*Goal: Eliminate large code duplication, test complex services*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 38 | H1: SupportSystems generic SubsystemTab | CODE | High | ~800 lines reduced |
| 39 | M1: WeaponSelection generic grid | CODE | Medium | ~300 lines reduced |
| 40 | H2: saveService generic deserialize | CODE | Medium | ~250 lines reduced, simplifies future additions |
| 41 | H3: dataLoader getter factory | CODE | Medium | ~200 lines reduced |
| 42 | T3: damageDiagramService tests | TESTS | High | Zone validation edge cases |
| 43 | T4: ordnanceService tests | TESTS | High | Design calculator formulas |
| 44 | T6: commandControlService tests | TESTS | High | Battery linking, orphan detection |
| 45 | T7–T9: engine/powerPlant/defense tests | TESTS | Medium | Core subsystem calculations |

---

## Phase 7: Error Prevention + Remaining UX
*Goal: Protect users from destructive actions, polish interactions*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 46 | U10: Confirmation for destructive bulk ops | UX | Medium | Clear All, Unassign All protection |
| 47 | U12: Hull change invalidation warning | UX | Medium | Prevent silent build reset |
| 48 | U13: Dependency removal warnings | UX | Medium | Power deficit, orphaned controls |
| 49 | U6: Surface power scenario toggle | UX | Medium | Essential planning tool exposed |
| 50 | U7: Damage diagram shortcuts banner | UX | Low | First-visit keyboard hint |
| 51 | U14: Document "Add" interaction models | UX | Low | Consistency improvement |
| 52 | U19: Config form visual distinction | UX | Low | Stronger border/background |
| 53 | U4: Color + icon indicators | UX | Medium | Accessibility — color blind support |

---

## Phase 8: Medium Features + Remaining Code
*Goal: Budget visualization, combat sheet, code cleanup*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 54 | B6: Budget visualization (HP/Power charts) | FEATURES | Medium | In-builder helper |
| 55 | C11: Compact combat reference sheet PDF | FEATURES | Medium | 1-page game table handout |
| 56 | M2: DamageDiagram repetitive collection | CODE | Medium | Data-driven approach |
| 57 | M3: pdfExportService split into sub-functions | CODE | Medium | Maintainability for C11 |
| 58 | M4: ordnanceService factory | CODE | Low | 3 create functions → 1 |
| 59 | L5: Shared SVG path utility | CODE | Trivial | ArcRadarSelector + FireDiagram |
| 60 | L6: Console logging behind debug flag | CODE | Low | Production hygiene |
| 61 | L7: Naming inconsistencies | CODE | Trivial | editingid → editingId, etc. |
| 62 | L8: Remove hardcoded fallback defaults | CODE | Low | Fail visibly on data load error |

---

## Phase 9: Component Tests + Final UX Polish
*Goal: Comprehensive component test coverage, remaining polish*

| # | Item | Source | Effort | Rationale |
|---|------|--------|--------|-----------|
| 63 | CT1: EditableDataGrid tests | TESTS | High | Most reused component |
| 64 | CT2: ArcRadarSelector tests | TESTS | Medium | SVG interaction |
| 65 | CT3–CT8: Integration tests (Weapon, Damage, Ordnance, Summary, DesignType, Armor) | TESTS | High | Complex interaction flows |
| 66 | CT9–CT12: Summary sub-component tests | TESTS | Medium | Fire diagram, zones overview |
| 67 | CT13: PdfExportDialog tests | TESTS | Low | Checkbox + export callback |
| 68 | T11–T16: Remaining service tests (FTL, sensor, armor, support, hangar, modValidation) | TESTS | Medium | Complete service coverage |
| 69 | T17–T19: Low-priority service tests (hull, schemas, dataLoader) | TESTS | Low | Cache/merge logic |
| 70 | U20: Domain color tokens in theme.ts | UX | Medium | Clean foundation for theming |
| 71 | U21: Welcome page onboarding | UX | Low | Brief description + quick-start |
| 72 | U22: PDF export progress indicator | UX | Low | Loading spinner |

---

## Phase 10: Long-Term / Nice-to-Have
*Goal: Backlog items when core is solid*

| # | Item | Source | Effort |
|---|------|--------|--------|
| 73 | A4: Ship Library / Gallery | FEATURES | High |
| 74 | Nice-to-have features (A2, A3, B8, B9, B10, C13, C14, D17, E18, E21, F23, F25) | FEATURES | Varies |
| 75 | Nice-to-have UX (U3, U18, U25) | UX | Varies |

---

## Summary

| Phase | Focus | Items | Est. Effort |
|-------|-------|------:|-------------|
| 1 | Test foundation + trivial fixes | 8 | 1–2 days |
| 2 | State consolidation + quick features | 10 | 2–3 days |
| 3 | App.tsx decomposition + critical tests | 6 | 4–5 days |
| 4 | UX quick wins sprint | 7 | 1–2 days |
| 5 | Feature sprint (auto-save, clipboard, validation) | 6 | 3–4 days |
| 6 | Major refactoring + tests | 8 | 5–6 days |
| 7 | Error prevention + remaining UX | 8 | 3–4 days |
| 8 | Medium features + remaining code | 9 | 4–5 days |
| 9 | Component tests + final polish | 10 | 5–6 days |
| 10 | Long-term / nice-to-have | 3+ | Ongoing |
| **Total** | | **~75** | **~28–37 days** |
