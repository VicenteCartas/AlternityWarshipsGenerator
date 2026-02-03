# Alternity Warships Generator - TODO & Technical Debt

This document tracks technical debt, refactoring opportunities, and planned features.

---

## 1. Code Logic Cleanup & Refactoring

### High Priority

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **Cost formatting duplicated 5x** | Inconsistent formats (`$1 M` vs `$1.0M`) | Delete formatters in individual services, use only `formatCost()` from `src/services/formatters.ts` |
| **FTL service bypasses dataLoader** | FTL data can't be externally edited in production | Add `getFTLDrivesData()` getter to dataLoader, update ftlDriveService |
| **ID property naming inconsistent** | `installationId` vs `id` across types | Standardize to `id` everywhere |
| **Percentage interpolation duplicated** | Same algorithm in engine + FTL services (~60 lines) | Extract to shared utility in formatters.ts |

### Medium Priority

| Issue | Recommendation |
|-------|----------------|
| ID generation duplicated 6x | Create `generateId(prefix: string)` utility |
| `SHIP_CLASS_ORDER` defined 3x | Export single constant from common.ts |
| `calculateHullStats` in type file | Move to hullService.ts per project conventions |
| Unused underscore-prefixed params | Either implement validation or remove from signatures |

### ðŸŸ¢ Low Priority - Type Improvements

```typescript
// Create shared base types in common.ts
interface BaseComponent {
  id: string;
  name: string;
  description: string;
}

interface TechComponent extends BaseComponent {
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
}

// Consolidate duplicate rating types
interface PercentageRatings<T = number> {
  at5Percent: T;
  at10Percent: T;
  at15Percent: T;
  at20Percent: T;
  at30Percent: T;
  at40Percent: T;
  at50Percent: T;
}
```

---

## 2. UI Code Cleanup & Unification

### High Priority - Extract Shared Components

| Pattern | Files Affected | Lines Duplicated |
|---------|---------------|------------------|
| Table header cell styling | 6 components | ~60 lines |
| Tech track display with tooltip | 6 components | ~48 lines |
| Installed item row (name + chips + actions) | 6+ components | ~200 lines |
| Add/Edit configuration form | 6 components | ~300 lines |
| Description truncation with tooltip | 5 components | ~75 lines |

**Suggested shared components structure:**
```
src/components/shared/
â”œâ”€â”€ DataTable/
â”‚   â”œâ”€â”€ HeaderCell.tsx          # Bold, nowrap header styling
â”‚   â”œâ”€â”€ TechTrackCell.tsx       # Tech tracks with tooltip
â”‚   â””â”€â”€ TruncatedCell.tsx       # Description with ellipsis
â”œâ”€â”€ ConfigurationForm.tsx       # Add/Edit form wrapper
â”œâ”€â”€ InstalledItemRow.tsx        # Item with chips + edit/delete
â”œâ”€â”€ StatsSummary.tsx            # Summary chips panel
â””â”€â”€ SectionHeader.tsx           # Step title + clear button
```

### Medium Priority - Style Inconsistencies

| Issue | Fix |
|-------|-----|
| TableContainer minWidth varies (650-800 or none) | Standardize to responsive approach |
| Selected row styling repeated 4x | Extract to `selectableRowSx` constant |
| Summary chip patterns vary slightly | Create `StatsSummary` component |

### Quick Wins (Immediate)

1. Create `src/constants/tableStyles.ts`:
```typescript
export const headerCellSx = { fontWeight: 'bold', whiteSpace: 'nowrap' };
export const selectableRowSx = {
  cursor: 'pointer',
  '&.Mui-selected': { backgroundColor: 'action.selected' },
  '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
};
```

---

## 3. Missing Features

### Critical - Incomplete Rulebook Implementation

| Missing Step | Description | Data File Needed |
|--------------|-------------|------------------|
| **Step 13: Summary** | Final stats, fire diagram, damage diagram | N/A |

### High Value - UX Features

| Feature | Description |
|---------|-------------|
| **Print/PDF Export** | Generate printable ship record sheet |
| **Fire Diagram** | Auto-generate weapon arc visual |
| **Damage Diagram** | Hit location/damage track visual |
| **Validation System** | HP/Power budget enforcement with warnings |

### Medium Value - Quality of Life

| Feature | Description |
|---------|-------------|
| Ship Templates | Pre-built example ships from rulebook |
| Variant Cloning | Duplicate ship to create variants |
| Undo/Redo | Undo recent changes |
| Notes Field | Free-text ship description |
| Component Search | Filter/search within tables |
| HP Usage Bar | Visual HP allocation by category |
| Recent Files | Quick access to recent .warship.json |
| Bulk Add/Remove | Add multiple identical components at once |
| Copy to Clipboard | Quick copy of ship stats for forums/chat |
| Cost Breakdown | Expandable cost summary by category |

### Validation Gaps

| Gap | Impact |
|-----|--------|
| No HP overflow prevention | Users can over-allocate hull points |
| No power budget enforcement | Systems can exceed power generation |
| No crew capacity validation | Life support vs actual crew needs |
| No fuel endurance calculation | Users can't determine operational range |
| No minimum requirements check | Ship may not meet basic requirements |

---

## 5. Recommended Action Plan

### Phase 2: Complete Core Features
- [X] Implement Step 7: Weapons
- [X] Implement Step 8: Defenses
- [X] Implement Step 9: Command & Control
- [X] Implement Step 10: Sensors
- [X] Implement Step 11: Hangars
- [X] Implement Step 12: Miscellaneous
- [X] Implement Step 13: Summary page
- [ ] Add real-time validation for HP/Power budgets
- [ ] Show Area of Effect weapons information

### Phase 3: Export & Polish
- [ ] Print/PDF export with ship record sheet
- [ ] Fire diagram generator
- [ ] Damage diagram generator
- [ ] Ship templates from rulebook

### Phase 4: Quality of Life
- [ ] Notes field for ship description
- [ ] Component search/filter
- [ ] Recent files list
- [ ] Variant cloning

---

## 6. Test

Use ships from this thread:

https://www.alternityrpg.net/onlineforums/index.php?s=0&showtopic=8562

---

*Last updated: January 2026*
