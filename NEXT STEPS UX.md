# Next Steps — UI/UX

Source of truth for UI/UX improvements, organized by severity and area.

## Overall Assessment

The app's greatest UX strength is its **remarkably consistent step interaction pattern**: summary chips → installed items → configuration form → selection table. Users learn the model once and apply it across 13 steps. The chip color system (gray=consumption, blue=production, green=positive, red=negative, yellow=warning) is well-applied throughout.

The biggest weaknesses are **discoverability** (powerful features hidden behind plain chips) and **accessibility** (suppressed focus outlines, no ARIA labels, keyboard gaps).

---

## Critical — Accessibility

### U1. Focus Outlines Suppressed on Stepper

Stepper buttons have explicit `outline: 'none'` on both `:focus` and `:focus-visible`. Keyboard users cannot see which step is focused. This is a WCAG violation.

**Fix:** Remove the outline suppression. Style `:focus-visible` with a visible ring instead.

### U2. Missing ARIA Labels Across the App

Almost no ARIA attributes outside of TabPanel. Missing on:
- All IconButtons (Edit, Delete, Duplicate, scroll arrows, sort toggles)
- Filter ToggleButtonGroups
- Clickable Chips in the app bar
- Stepper scroll arrows (ChevronLeft/ChevronRight)

**Fix:** Add `aria-label` to every IconButton and interactive element.

### U3. ArcRadarSelector Not Keyboard Accessible

Weapon firing arcs can only be toggled by mouse click on SVG pie-wedge paths. No keyboard event handlers exist. Keyboard and screen-reader users cannot configure weapon arcs.

**Fix:** Add `tabIndex`, `role="checkbox"`, `aria-label`, and `onKeyDown` (Enter/Space) to each arc path.

### U4. Color as Sole Indicator

Zone fill states, system category colors, and chip status rely on color alone. No shape, icon, or text alternative for color-blind users.

**Fix:** Add icons or text labels alongside color indicators for critical status (e.g., warning icon on red chips, check icon on green).

---

## High — Discoverability

### U5. App Bar Popover Chips Have No Visual Affordance

The HP, Power, and Cost chips are actually interactive buttons that reveal detailed breakdowns and power scenario planning. There is **zero visual hint** they're clickable — no hover cursor, no expand icon, no "click for details" tooltip.

This is the most powerful analysis tool in the app and most users will never discover it.

**Fix:** Add a small expand/dropdown icon to each chip, or add a cursor change on hover, or show a tooltip "Click for breakdown."

### U6. Power Scenario Planning is Buried

The power scenario toggle (combat vs. cruise configuration) is hidden inside the Power chip popover. This is essential for power planning but effectively invisible.

**Fix:** Surface as a visible toggle or mode switch in the AppBar, or at minimum add a hint on the Power chip.

### U7. Damage Diagram Keyboard Shortcuts Hidden

Keyboard shortcuts (1-9 for zones, A for auto-assign, Ctrl+A select all, Esc deselect) are hidden behind a tiny 18px keyboard icon that users must discover first.

**Fix:** Show a brief keyboard hint banner on first visit to the Damage Diagram step. Or make the keyboard icon more prominent with a label like "Shortcuts."

### U8. Fuel Tank Sub-Items Not Explained

Fuel tanks are sub-items of specific power plant/engine installations. The mental model isn't explained anywhere — users must discover that clicking a fuel row under a parent installation is how to add fuel.

**Fix:** Add a small help tooltip or info icon next to fuel sections explaining the relationship.

### U9. Computer Core Prerequisite Not Explained

Control computers, fire controls, and sensor controls don't appear until a computer core is installed. The empty state just says "No core installed" without explaining what to do.

**Fix:** Change empty state to actionable: "Install a computer core in the Cores tab first to unlock control computers."

---

## High — Feedback & Error Prevention

### U10. No Confirmation for Destructive Bulk Operations

"Clear All", "Unassign All", and "Remove" operations are immediate and irreversible at the component level. While global Undo exists, users may not know about it.

**Fix:** Add a confirmation dialog for bulk destructive actions, or at minimum show a Snackbar with an "Undo" action button.

### U11. Missing Empty States in Installed Items

When no items of a type are installed, most steps render nothing (return null) in the installed-items area. Users see the selection table but no guidance.

Gold standard already exists in SensorSelection: "No {category} sensors available at current design constraints."

**Fix:** When installed items are empty, show: "No {category} installed. Select from the table below to add one."

### U12. No Warning When Hull Change Invalidates Build

Changing the hull after significant build progress resets armor and power plants silently. Other installed systems may become invalid (HP overflow, incompatible tech).

**Fix:** Show a confirmation dialog when changing hull: "Changing hull will reset armor and power plants. X other systems may exceed new HP limits."

### U13. No Warning When Removing Systems With Dependencies

Removing a power plant doesn't warn about power deficit. Removing a computer core doesn't warn about orphaned controls.

**Fix:** Show dependency warnings before removal: "Removing this power plant will create a power deficit of X."

---

## Medium — Consistency

### U14. Three Different "Add" Interaction Models

Steps use three different interaction patterns for adding items:
1. **Click-to-select → Configure form → Add button** (Power Plants, Engines, Weapons, Sensors, C4, etc.) — the dominant pattern
2. **Click-to-toggle** (Armor — clicking a table row directly adds/removes it)
3. **Click-to-install** (some Hangars systems — click installs immediately)

**Fix:** Document the three models in the copilot-instructions. Consider adding a subtle "Click to add" affordance to click-to-toggle rows so they're distinguishable from click-to-select rows.

### U15. Weapon Tabs Missing Empty Messages

Weapon tabs show empty table bodies with headers but no friendly message when no weapons of that type are available at current design constraints. Other steps (Sensors) handle this well.

**Fix:** Add "No {category} weapons available at current design constraints" to empty weapon tables.

### U16. Summary Tab Order Shifts

The Issues tab only appears conditionally (when issues exist). This shifts other tab indices — "Systems" can be tab 1 or tab 2 depending on whether issues exist. Users who learn tab positions get confused.

**Fix:** Always show the Issues tab. Use a badge count on the tab label. Show "No issues found" as the empty state.

---

## Medium — Information Architecture

### U17. No Overall Progress Indicator

Step icons show individual completion state (check/error/circle) but there's no overall progress indicator. Users can't quickly see "I'm 7/13 steps done."

**Fix:** Add a progress fraction or thin progress bar to the stepper area: "7 of 13 complete" or a colored fill on the stepper track.

### U18. Wide Tables Require Excessive Horizontal Scroll

Weapon and sensor tables have 12-13 columns, requiring significant horizontal scrolling on non-ultrawide monitors. The sticky first column helps but several columns may be less critical.

**Fix:** Consider collapsible column groups, or a compact/expanded toggle, or moving less-critical columns (description, tech track notes) to a tooltip/expandable row detail.

### U19. Configuration Forms Blend into Selection Tables

When a weapon is selected and the configuration form appears, it's in a `Paper variant="outlined"` that looks similar to the selection table just below it. The three content layers (installed items → form → table) within each tab can be hard to parse.

**Fix:** Give the configuration form a distinct visual treatment — stronger border, different background shade, or a floating card appearance.

---

## Low — Polish

### U20. Minimal Theme — No Domain Color Tokens

The theme is extremely minimal (dark mode, default MUI palette, single CssBaseline override). Domain-specific colors are hardcoded throughout:
- 14 category colors in DamageDiagramSelection
- Fire arc intensity scales in FireDiagram
- Zone state colors (green/yellow/red)
- Chip status colors

**Fix:** Define theme tokens in `theme.ts` for system category colors, zone states, and resource status. Reference them via `theme.palette.custom.*`.

### U21. Welcome Page Lacks Onboarding for New Users

First-time users see only "New Warship/Station" and "Load" buttons with no explanation of what the app does, what the 13 steps are, or how to get started.

**Fix:** Add a brief description: "Design warships and stations for the Alternity RPG using the Warships sourcebook rules." Optionally, a quick-start guide or link to documentation.

### U22. No PDF Export Preview or Progress

Users can't see what the PDF will look like before exporting. PDF generation (html2canvas + jsPDF) can be slow with no loading indicator.

**Fix:** Add a loading spinner during PDF generation. Consider a preview thumbnail or at least a description of what each section includes.

### U23. No Step Label Tooltips

Stepper step labels are truncated at small widths ("C4" for "Command & Control", "Misc" for "Hangars & Miscellaneous") but there's no tooltip showing the full name on hover.

**Fix:** Add `Tooltip title={STEP_FULL_NAMES[step.id]}` around each step label.

### U24. Stepper Scroll Arrows Missing ARIA Labels

The ChevronLeft/ChevronRight IconButtons controlling stepper scroll have no accessible names.

**Fix:** Add `aria-label="Scroll steps left"` and `aria-label="Scroll steps right"`.

### U25. Fixed Width Elements Don't Adapt

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

1. **U1** (focus outlines) — Trivial fix, accessibility critical
2. **U2** (ARIA labels) — Moderate effort, accessibility critical
3. **U5** (popover affordance) — Low effort, high discoverability impact
4. **U11** (empty states) — Low effort per step, consistency improvement
5. **U10** (destructive action confirmation) — Medium effort, error prevention
6. **U16** (fixed summary tabs) — Low effort, consistency fix
7. **U17** (progress indicator) — Low effort, information architecture
8. **U15** (weapon empty messages) — Trivial, consistency
9. **U23** (step label tooltips) — Trivial, polish
10. **U3** (arc selector keyboard) — Medium effort, accessibility
11. **U5–U9** (discoverability cluster) — Work through as a group
12. Everything else in severity order
