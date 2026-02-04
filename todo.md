# Alternity Warships Generator - TODO & Technical Debt

This document tracks technical debt, refactoring opportunities, and planned features.

---

## 4. Code Quality - UI Duplication

### 4.1 Table Header Styling - TODO
**Impact:** Medium
`sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}` appears 100+ times. There IS a `headerCellSx` constant in tableStyles.ts, but it's not consistently used.

**Files not using the constant:**
- SummarySelection.tsx
- WeaponSelection.tsx
- DefenseSelection.tsx
- SensorSelection.tsx
- HangarMiscSelection.tsx

### 4.2 Add/Edit/Remove Handler Pattern - TODO
**Impact:** High
Every selection component repeats the same CRUD handler pattern (~400 lines total duplicated).
**Fix:** Create a custom hook `useInstalledItemsCRUD()`.

### 4.3 Installed Items Display Pattern - TODO
**Impact:** High
Each component has nearly identical "Installed Items" section structure (~300 lines total duplicated).
**Fix:** Create `<InstalledItemsList>` shared component.

### 4.4 Summary Chips Pattern - TODO
**Impact:** Medium
The summary `<Box>` with `<Stack direction="row">` containing `<Chip>` components appears in every selection component (~150 lines total duplicated).
**Fix:** Create `<StatsSummary>` shared component.

---

## 6. Missing Features

### Phase 2: Complete Core Features
- [ ] Add real-time validation for HP/Power budgets
- [ ] Show Area of Effect weapons information

### Phase 3: Quality of Life
- [ ] Ship templates from rulebook
- [ ] Variant cloning (duplicate ship)
- [ ] Component search/filter in tables

### Validation Gaps
| Gap | Impact |
|-----|--------|
| No HP overflow prevention | Users can over-allocate hull points |
| No power budget enforcement | Systems can exceed power generation |
| No crew capacity validation | Life support vs actual crew needs |
| No fuel endurance calculation | Users can't determine operational range |
| No minimum requirements check | Ship may not meet basic requirements |

---

## 7. Test

Use ships from this thread:

https://www.alternityrpg.net/onlineforums/index.php?s=0&showtopic=8562

---

*Last updated: February 2026*
