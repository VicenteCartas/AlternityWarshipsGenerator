# Next Steps

Source of truth for planned features and improvements.

## Feature Ideas

### A. Design Management

| # | Feature | Description | Effort | Priority | User Review |
|---|---------|-------------|--------|----------|-------------|
| A1 | Clone/Duplicate Design | Duplicate the current design to create variants without rebuilding from scratch. | Low | High | Yes, do it |
| A2 | Ship Templates / Presets | Start from pre-filled templates (e.g. "Light Corvette"). Bundled or user-created. | Medium | Medium | Nice to have |
| A3 | Design Comparison | Side-by-side stat comparison of two saved designs. | Medium | Medium | Nice to have |
| A4 | Ship Library / Gallery | Browse and search all saved designs with thumbnail cards showing key stats. | High | Low | Yes, do it |
| A5 | Auto-save / Crash Recovery | Periodic auto-save to temp location. Offer recovery on relaunch after crash. | Low | High | Yes, do it |

### B. In-Builder Helpers

| # | Feature | Description | Effort | Priority | User Review |
|---|---------|-------------|--------|----------|-------------|
| B6 | Budget Visualization | Persistent mini chart (bar/donut) showing HP and Power allocation by category. | Medium | High | Yes, do it |
| B7 | "What Fits?" Filter | Toggle on step tables that grays out items exceeding remaining HP or Power. | Medium | High | Skip |
| B8 | Clickable Alert Chips | Clicking the HP/Power chip in the app bar navigates to the relevant step. | Low | High | Nice to have |
| B9 | Per-Step Notes | Small text field on each step for design rationale. Exported in PDF. | Low | Medium | Nice to have |
| B10 | Cost Breakdown Chart | Pie or bar chart of cost by category for campaign budgeting. | Medium | Medium | Nice to have |

### C. Export & Sharing

| # | Feature | Description | Effort | Priority | User Review |
|---|---------|-------------|--------|----------|-------------|
| C11 | Compact Combat Reference Sheet | 1-page PDF optimized for the game table: weapons, defenses, damage track, fire arcs, key stats. | Medium | High | Yes, do it |
| C12 | Copy Stats to Clipboard | One-click formatted text (Markdown/BBCode) for forums, Discord, campaign docs. | Low | High | Yes, do it |
| C13 | Fleet Roster PDF | Select multiple .warship.json files → combined PDF with one page per ship. | High | Low | Nice to have |
| C14 | Export Fire Diagram as Image | Save the fire arc SVG/PNG separately for campaign docs or VTTs. | Low | Medium | Nice to have |

### D. Validation & Intelligence

| # | Feature | Description | Effort | Priority | User Review |
|---|---------|-------------|--------|----------|-------------|
| D15 | Fire Control ↔ Weapon Linking Validation | Warn if weapons lack matching fire control, or fire controls have no linked weapons. | Medium | Medium | Yes, do it |
| D16 | Sensor Control Validation | Same for sensor control ↔ sensor pairings. | Medium | Medium | Yes, do it |
| D17 | Design Efficiency Rating | Derived metrics: power utilization %, HP utilization %, weapon-to-hull ratio, defense coverage %. | Medium | Low | Nice to have |

### E. Advanced / Campaign Features

| # | Feature | Description | Effort | Priority | User Review |
|---|---------|-------------|--------|----------|-------------|
| E18 | Fleet Cost Calculator | Define fleet composition with quantities → total cost and crew requirements. | Medium | Low | Nice to have |
| E19 | Structured Ship Description Fields | Optional metadata: faction, role, commissioning date, classification, manufacturer. Keep freeform lore too. | Low | Medium | Yes, do it |
| E20 | Combat Quick-Reference Calculator | Input attack roll → look up which weapons hit at which range band per fire arc. | High | Low | Skip |
| E21 | Ordnance Design Sharing | Export/import ordnance designs independently from ship files for reuse across ships. | Low | Medium | Nice to have |
| E22 | Light/Dark Theme Toggle | Add light theme option with toggle or system preference detection. | Low | High | Yes, do it |

### F. Onboarding & Help

| # | Feature | Description | Effort | Priority | User Review |
|---|---------|-------------|--------|----------|-------------|
| F23 | Interactive Tutorial / First-Run Wizard | Walk new users through building their first ship. | High | Low | Nice to have |
| F24 | Keyboard Shortcuts Reference | Dialog listing all available shortcuts (Ctrl+S, Ctrl+Z/Y, Damage Zones keys). | Low | High | Yes, do it |
| F25 | Contextual Rule Tooltips | Hover over a system to see relevant rule excerpt from the rules/ folder. | High | Low | Nice to have |

## Recommended Priority Bundles (User-Reviewed)

### Approved — Quick Wins (low effort, user said "Yes")
- A1: Clone/Duplicate Design
- A5: Auto-save / Crash Recovery
- C12: Copy Stats to Clipboard
- E19: Structured Ship Description Fields
- E22: Light/Dark Theme Toggle
- F24: Keyboard Shortcuts Reference

### Approved — Medium Effort (user said "Yes")
- B6: Budget Visualization
- C11: Compact Combat Reference Sheet
- D15: Fire Control ↔ Weapon Linking Validation
- D16: Sensor Control Validation
- A4: Ship Library / Gallery

### Nice to Have (user interested, not priority)
- A2: Ship Templates / Presets
- A3: Design Comparison
- B8: Clickable Alert Chips
- B9: Per-Step Notes
- B10: Cost Breakdown Chart
- C13: Fleet Roster PDF
- C14: Export Fire Diagram as Image
- D17: Design Efficiency Rating
- E18: Fleet Cost Calculator
- E21: Ordnance Design Sharing
- F23: Interactive Tutorial / First-Run Wizard
- F25: Contextual Rule Tooltips

### Skipped
- B7: "What Fits?" Filter
- E20: Combat Quick-Reference Calculator

## Code Quality Improvements

_To be filled in after code audit._

## UI/UX Improvements

_To be filled in after UI/UX audit._
