# Next Steps

Source of truth for planned features and improvements.

## Feature Ideas

### A. Design Management

| # | Feature | Description | Effort | Priority |
|---|---------|-------------|--------|----------|
| A1 | Clone/Duplicate Design | Duplicate the current design to create variants without rebuilding from scratch. | Low | High |
| A2 | Ship Templates / Presets | Start from pre-filled templates (e.g. "Light Corvette"). Bundled or user-created. | Medium | Medium |
| A3 | Design Comparison | Side-by-side stat comparison of two saved designs. | Medium | Medium |
| A4 | Ship Library / Gallery | Browse and search all saved designs with thumbnail cards showing key stats. | High | Low |
| A5 | Auto-save / Crash Recovery | Periodic auto-save to temp location. Offer recovery on relaunch after crash. | Low | High |

### B. In-Builder Helpers

| # | Feature | Description | Effort | Priority |
|---|---------|-------------|--------|----------|
| B6 | Budget Visualization | Persistent mini chart (bar/donut) showing HP and Power allocation by category. | Medium | High |
| B7 | "What Fits?" Filter | Toggle on step tables that grays out items exceeding remaining HP or Power. | Medium | High |
| B8 | Clickable Alert Chips | Clicking the HP/Power chip in the app bar navigates to the relevant step. | Low | High |
| B9 | Per-Step Notes | Small text field on each step for design rationale. Exported in PDF. | Low | Medium |
| B10 | Cost Breakdown Chart | Pie or bar chart of cost by category for campaign budgeting. | Medium | Medium |

### C. Export & Sharing

| # | Feature | Description | Effort | Priority |
|---|---------|-------------|--------|----------|
| C11 | Compact Combat Reference Sheet | 1-page PDF optimized for the game table: weapons, defenses, damage track, fire arcs, key stats. | Medium | High |
| C12 | Copy Stats to Clipboard | One-click formatted text (Markdown/BBCode) for forums, Discord, campaign docs. | Low | High |
| C13 | Fleet Roster PDF | Select multiple .warship.json files → combined PDF with one page per ship. | High | Low |
| C14 | Export Fire Diagram as Image | Save the fire arc SVG/PNG separately for campaign docs or VTTs. | Low | Medium |

### D. Validation & Intelligence

| # | Feature | Description | Effort | Priority |
|---|---------|-------------|--------|----------|
| D15 | Fire Control ↔ Weapon Linking Validation | Warn if weapons lack matching fire control, or fire controls have no linked weapons. | Medium | Medium |
| D16 | Sensor Control Validation | Same for sensor control ↔ sensor pairings. | Medium | Medium |
| D17 | Design Efficiency Rating | Derived metrics: power utilization %, HP utilization %, weapon-to-hull ratio, defense coverage %. | Medium | Low |

### E. Advanced / Campaign Features

| # | Feature | Description | Effort | Priority |
|---|---------|-------------|--------|----------|
| E18 | Fleet Cost Calculator | Define fleet composition with quantities → total cost and crew requirements. | Medium | Low |
| E19 | Structured Ship Description Fields | Optional metadata: faction, role, commissioning date, classification, manufacturer. Keep freeform lore too. | Low | Medium |
| E20 | Combat Quick-Reference Calculator | Input attack roll → look up which weapons hit at which range band per fire arc. | High | Low |
| E21 | Ordnance Design Sharing | Export/import ordnance designs independently from ship files for reuse across ships. | Low | Medium |
| E22 | Dark Theme | MUI supports it natively. Useful for game sessions. | Low | High |

### F. Onboarding & Help

| # | Feature | Description | Effort | Priority |
|---|---------|-------------|--------|----------|
| F23 | Interactive Tutorial / First-Run Wizard | Walk new users through building their first ship. | High | Low |
| F24 | Keyboard Shortcuts Reference | Dialog listing all available shortcuts (Ctrl+S, Ctrl+Z/Y, Damage Zones keys). | Low | High |
| F25 | Contextual Rule Tooltips | Hover over a system to see relevant rule excerpt from the rules/ folder. | High | Low |

## Recommended Priority Bundles

### Quick Wins (high value, low effort)
- A5: Auto-save / Crash Recovery
- B8: Clickable Alert Chips
- C12: Copy Stats to Clipboard
- E22: Dark Theme
- F24: Keyboard Shortcuts Reference

### Medium Effort, High Impact
- A1: Clone/Duplicate Design
- B6: Budget Visualization
- B7: "What Fits?" Filter
- C11: Compact Combat Reference Sheet

### Long-Term Differentiators
- A3: Design Comparison
- A4: Ship Library / Gallery
- E18: Fleet Cost Calculator

## Code Quality Improvements

_To be filled in after code audit._

## UI/UX Improvements

_To be filled in after UI/UX audit._
