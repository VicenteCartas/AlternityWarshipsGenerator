# Next Steps — UI/UX

Source of truth for UI/UX improvements, organized by severity and area.

## Overall Assessment

The app's greatest UX strength is its **remarkably consistent step interaction pattern**: summary chips → installed items → configuration form → selection table. Users learn the model once and apply it across 13 steps. The chip color system (gray=consumption, blue=production, green=positive, red=negative, yellow=warning) is well-applied throughout.

The biggest weaknesses are **discoverability** (powerful features hidden behind plain chips) and **accessibility** (suppressed focus outlines, no ARIA labels, keyboard gaps).

---

## Critical — Accessibility

### U1. Focus Outlines Suppressed on Stepper ✅ DONE

> **User Review:** Yes, do it

**Completed:** Replaced blanket `outline: 'none'` with a `:focus-visible` ring (2px solid primary color, 2px offset, border-radius).

Stepper buttons had explicit `outline: 'none'` on both `:focus` and `:focus-visible`. Keyboard users could not see which step was focused. This was a WCAG violation.

### U2. Missing ARIA Labels Across the App ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added ~65 `aria-label` attributes across 20 component files. Coverage includes all IconButtons (Edit, Delete, Duplicate, Remove, navigation), all ToggleButtonGroups (filters, mount types, gun configs, design types), clickable Chips in the app bar (HP/Power/Cost breakdown popovers), Switches, and SVG interactive elements (ArcRadarSelector with `role="checkbox"` + `aria-checked`/`aria-disabled`).

### U3. ArcRadarSelector Not Keyboard Accessible

> **User Review:** Nice to have, not priority

Weapon firing arcs can only be toggled by mouse click on SVG pie-wedge paths. No keyboard event handlers exist. Keyboard and screen-reader users cannot configure weapon arcs.

**Fix:** Add `tabIndex`, `role="checkbox"`, `aria-label`, and `onKeyDown` (Enter/Space) to each arc path.

### U4. Color as Sole Indicator

> **User Review:** Yes, do it

Zone fill states, system category colors, and chip status rely on color alone. No shape, icon, or text alternative for color-blind users.

**Fix:** Add icons or text labels alongside color indicators for critical status (e.g., warning icon on red chips, check icon on green).

---

## High — Discoverability

### U5. App Bar Popover Chips Have No Visual Affordance ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added `ArrowDropDownIcon` as a visual dropdown indicator on all three popover chips (HP, Power, Cost) using MUI's `deleteIcon` + `onDelete` pattern. The arrow icon clearly signals that clicking reveals more detail.

### U6. Power Scenario Planning is Buried

> **User Review:** Yes, do it

The power scenario toggle (combat vs. cruise configuration) is hidden inside the Power chip popover. This is essential for power planning but effectively invisible.

**Fix:** Surface as a visible toggle or mode switch in the AppBar, or at minimum add a hint on the Power chip.

### U7. Damage Diagram Keyboard Shortcuts Hidden

> **User Review:** Yes, do it

Keyboard shortcuts (1-9 for zones, A for auto-assign, Ctrl+A select all, Esc deselect) are hidden behind a tiny 18px keyboard icon that users must discover first.

**Fix:** Show a brief keyboard hint banner on first visit to the Damage Diagram step. Or make the keyboard icon more prominent with a label like "Shortcuts."

### U8. Fuel Tank Sub-Items Not Explained ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added `HelpOutlineIcon` with explanatory tooltip next to "Installed Fuel Tanks" headers in both PowerPlantSelection and EngineSelection. Tooltips explain that fuel tanks are linked to specific power plant/engine types and how to add them.

### U9. Computer Core Prerequisite Not Explained ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added an info Alert in the Computers tab when no core is installed: "Install a computer core from the table below to unlock control computers (fire controls, sensor controls)."

---

## High — Feedback & Error Prevention

### U10. No Confirmation for Destructive Bulk Operations

> **User Review:** Yes, do it

"Clear All", "Unassign All", and "Remove" operations are immediate and irreversible at the component level. While global Undo exists, users may not know about it.

**Fix:** Add a confirmation dialog for bulk destructive actions, or at minimum show a Snackbar with an "Undo" action button.

### U11. Missing Empty States in Installed Items ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added empty state Typography messages across 10 components (PowerPlant, Engine, Defense, HangarMisc, CommandControl, Weapon, Sensor, SupportSystems ×3). Each shows "No {category} installed. Select from the table below to add one." instead of rendering nothing.

### U12. No Warning When Hull Change Invalidates Build

> **User Review:** Yes, do it

Changing the hull after significant build progress resets armor and power plants silently. Other installed systems may become invalid (HP overflow, incompatible tech).

**Fix:** Show a confirmation dialog when changing hull: "Changing hull will reset armor and power plants. X other systems may exceed new HP limits."

### U13. No Warning When Removing Systems With Dependencies

> **User Review:** Yes, do it

Removing a power plant doesn't warn about power deficit. Removing a computer core doesn't warn about orphaned controls.

**Fix:** Show dependency warnings before removal: "Removing this power plant will create a power deficit of X."

---

## Medium — Consistency

### U14. Three Different "Add" Interaction Models

> **User Review:** Yes, do it

Steps use three different interaction patterns for adding items:
1. **Click-to-select → Configure form → Add button** (Power Plants, Engines, Weapons, Sensors, C4, etc.) — the dominant pattern
2. **Click-to-toggle** (Armor — clicking a table row directly adds/removes it)
3. **Click-to-install** (some Hangars systems — click installs immediately)

**Fix:** Document the three models in the copilot-instructions. Consider adding a subtle "Click to add" affordance to click-to-toggle rows so they're distinguishable from click-to-select rows.

### U15. Weapon Tabs Missing Empty Messages ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added "No {category} weapons available at current design constraints" empty state messages to all 4 weapon grid functions (beam, projectile, torpedo, special), matching the existing sensor pattern.

### U16. Summary Tab Order Shifts ✅ DONE

> **User Review:** Yes, do it

**Completed:** Issues tab is now always visible with fixed indices (0=Issues, 1=Description, 2=Systems, 3=Fire Diagram, 4=Damage Zones). Issue count shows in tab label when present. Empty state shows "No issues found — design is valid!" with a CheckCircleIcon.

---

## Medium — Information Architecture

### U17. No Overall Progress Indicator ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added a compact "{completed}/{total}" progress counter in the stepper bar, right of the scroll arrows. Step completion logic extracted into a `useMemo` computing a `Map<StepId, boolean>` for reuse.

### U18. Wide Tables Require Excessive Horizontal Scroll

> **User Review:** Nice to have, not priority

Weapon and sensor tables have 12-13 columns, requiring significant horizontal scrolling on non-ultrawide monitors. The sticky first column helps but several columns may be less critical.

**Fix:** Consider collapsible column groups, or a compact/expanded toggle, or moving less-critical columns (description, tech track notes) to a tooltip/expandable row detail.

### U19. Configuration Forms Blend into Selection Tables

> **User Review:** Yes, do it

When a weapon is selected and the configuration form appears, it's in a `Paper variant="outlined"` that looks similar to the selection table just below it. The three content layers (installed items → form → table) within each tab can be hard to parse.

**Fix:** Give the configuration form a distinct visual treatment — stronger border, different background shade, or a floating card appearance.

---

## Low — Polish

### U20. Minimal Theme — No Domain Color Tokens

> **User Review:** Yes, do it

The theme is extremely minimal (dark mode, default MUI palette, single CssBaseline override). Domain-specific colors are hardcoded throughout:
- 14 category colors in DamageDiagramSelection
- Fire arc intensity scales in FireDiagram
- Zone state colors (green/yellow/red)
- Chip status colors

**Fix:** Define theme tokens in `theme.ts` for system category colors, zone states, and resource status. Reference them via `theme.palette.custom.*`.

### U21. Welcome Page Lacks Onboarding for New Users

> **User Review:** Yes, do it

First-time users see only "New Warship/Station" and "Load" buttons with no explanation of what the app does, what the 13 steps are, or how to get started.

**Fix:** Add a brief description: "Design warships and stations for the Alternity RPG using the Warships sourcebook rules." Optionally, a quick-start guide or link to documentation.

### U22. No PDF Export Preview or Progress

> **User Review:** Yes, do it

Users can't see what the PDF will look like before exporting. PDF generation (html2canvas + jsPDF) can be slow with no loading indicator.

**Fix:** Add a loading spinner during PDF generation. Consider a preview thumbnail or at least a description of what each section includes.

### U23. No Step Label Tooltips ✅ DONE

> **User Review:** Yes, do it

**Completed:** Wrapped each `StepButton` in `<Tooltip title={STEP_FULL_NAMES[step.id]} enterDelay={400} arrow>`.

Stepper step labels are truncated at small widths ("C4" for "Command & Control", "Misc" for "Hangars & Miscellaneous") but there was no tooltip showing the full name on hover.

### U24. Stepper Scroll Arrows Missing ARIA Labels ✅ DONE

> **User Review:** Yes, do it

**Completed:** Added `role="button"`, `aria-label`, `tabIndex`, and `onKeyDown` (Enter/Space) handlers to both scroll arrows.

The ChevronLeft/ChevronRight boxes controlling stepper scroll had no accessible names or keyboard support.

### U25. Fixed Width Elements Don't Adapt

> **User Review:** Nice to have, not priority

Several UI elements use fixed pixel widths:
- Damage Diagram pool sidebar: 280px
- Zone overview cards: 300px
- Zone columns: `Math.max(140, 800/N)` — very narrow with 7+ zones

**Fix:** Use relative/flexible widths where possible. Consider a responsive grid for zone cards.

---

## What's Already Good

- **Step interaction pattern consistency** (9/10) — learn once, apply everywhere
- **Chip color system** — well-applied across all steps
- **ArcRadarSelector** — excellent spatial interaction design for firing arcs
- **Damage Diagram drag-and-drop** — best interaction design in the app, with keyboard fallback
- **Non-linear stepper** — users can jump to any step freely
- **Progressive disclosure** — station sub-types, computer control hierarchy, fuel tank sub-items
- **Inline editing** — no navigation away for edits, expandable rows, overlay forms
- **Summary fire diagram** — clear SVG-based spatial visualization
- **Resource chips in app bar** — always-visible HP/Power/Cost tracking

---

## Recommended Priority Order

1. ~~**U1** (focus outlines)~~ ✅ Done
2. **U2** (ARIA labels) — Moderate effort, accessibility critical
3. **U5** (popover affordance) — Low effort, high discoverability impact
4. **U11** (empty states) — Low effort per step, consistency improvement
5. **U10** (destructive action confirmation) — Medium effort, error prevention
6. **U16** (fixed summary tabs) — Low effort, consistency fix
7. **U17** (progress indicator) — Low effort, information architecture
8. **U15** (weapon empty messages) — Trivial, consistency
9. ~~**U23** (step label tooltips)~~ ✅ Done
10. ~~**U24** (ARIA labels on scroll arrows)~~ ✅ Done
11. **U3** (arc selector keyboard) — Medium effort, accessibility
12. **U5–U9** (discoverability cluster) — Work through as a group
13. Everything else in severity order
