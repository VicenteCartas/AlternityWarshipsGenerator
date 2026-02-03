# Alternity Warships Generator - TODO & Technical Debt

This document tracks technical debt, refactoring opportunities, and planned features.

---

## 1. Code Quality - Duplicated Code

### 1.1 `filterByDesignConstraints` Function (6 services) - ✅ FIXED
**Status:** Fixed - moved to `src/services/utilities.ts`

| Service | Status |
|---------|--------|
| weaponService.ts | ✅ Using shared utility |
| supportSystemService.ts | ✅ Using shared utility |
| sensorService.ts | ✅ Using shared utility |
| hangarMiscService.ts | ✅ Using shared utility |
| defenseService.ts | ✅ Using shared utility |
| commandControlService.ts | ✅ Using shared utility |

**Bug fixed:** Inconsistent tech track filtering (some used `.every()`, some used `.some()`). Now standardized to `.every()` (ALL required techs must be available).

### 1.2 ID Generation Functions (10+ implementations) - ✅ FIXED
**Status:** Fixed - `generateId(prefix)` moved to `src/services/utilities.ts`

| Service | Old Function | Status |
|---------|-------------|--------|
| weaponService.ts | generateWeaponId | ✅ Using shared utility |
| powerPlantService.ts | generateInstallationId | ✅ Using shared utility |
| powerPlantService.ts | generateFuelTankId | ✅ Using shared utility |
| ordnanceService.ts | generateOrdnanceDesignId | ✅ Using shared utility |
| ordnanceService.ts | generateLaunchSystemId | ✅ Using shared utility |
| hangarMiscService.ts | generateHangarMiscId | ✅ Using shared utility |
| ftlDriveService.ts | generateFTLDriveId | ✅ Using shared utility |
| ftlDriveService.ts | generateFTLFuelTankId | ✅ Using shared utility |
| engineService.ts | generateEngineId | ✅ Using shared utility |
| engineService.ts | generateEngineFuelTankId | ✅ Using shared utility |
| sensorService.ts | generateSensorId | ✅ Using shared utility |
| defenseService.ts | generateDefenseId | ✅ Using shared utility |
| commandControlService.ts | generateCommandControlId | ✅ Using shared utility |

### 1.3 TabPanel Component (3 duplicates) - ✅ FIXED
**Status:** Fixed - moved to `src/components/shared/TabPanel.tsx`

| Component | Status |
|-----------|--------|
| SummarySelection.tsx | ✅ Using shared component |
| SupportSystemsSelection.tsx | ✅ Using shared component |
| CommandControlSelection.tsx | ✅ Using shared component |

### 1.4 SHIP_CLASS_ORDER (3 definitions) - ✅ FIXED
**Status:** Fixed - exported from `src/types/common.ts`

| File | Status |
|------|--------|
| hullService.ts | ✅ Using shared constant |
| armorService.ts (2 places) | ✅ Using shared constant |

---

## 2. Code Quality - Hardcoded Logic

### 2.1 Mount Type Modifiers (weaponService.ts) - ✅ FIXED
**Status:** Fixed - moved to `weapons.json` as `mountModifiers` section
- weaponService.ts now loads modifiers from JSON with fallback defaults
- Added `MountModifier` type to weapon.ts

### 2.2 Gun Configuration Modifiers (weaponService.ts) - ✅ FIXED
**Status:** Fixed - moved to `weapons.json` as `gunConfigurations` section
- weaponService.ts now loads configurations from JSON with fallback defaults
- Added `GunConfigModifier` type to weapon.ts

### 2.3 Tracking Table (sensorService.ts) - ✅ FIXED
**Status:** Fixed - moved to `sensors.json` as `trackingTable` section
- sensorService.ts now loads table from JSON with fallback defaults
- Added `TrackingTable` and `ComputerQuality` types to sensor.ts
- dataLoader.ts updated to pass tracking table to sensorService

### 2.4 Firepower Sort Order - ✅ FIXED
**Status:** Fixed - added `FIREPOWER_ORDER` constant to `src/types/common.ts`
- WeaponSelection.tsx now imports from common.ts

---

## 3. Code Quality - Code Smells

### 3.1 Overly Long Components - TODO
**Impact:** High - affects maintainability

| Component | Lines | Recommendation |
|-----------|-------|----------------|
| SummarySelection.tsx | ~1,300 | Split into 4 sub-components (one per tab) |
| EngineSelection.tsx | ~1,000 | Extract fuel tank logic to separate component |
| HangarMiscSelection.tsx | ~980 | Split by tab |
| WeaponSelection.tsx | ~960 | Extract weapon tables to shared component |
| PowerPlantSelection.tsx | ~930 | Extract fuel tank logic |

### 3.2 Unused Parameters with Underscores - TODO
**Impact:** Low
Several functions have unused `_hull`, `_designProgressLevel` parameters that were added for future validation.
**Fix:** Either implement validation or remove from signatures.

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

## 5. Code Quality - Type Duplication

### 5.1 WeaponTab Type Duplicates WeaponCategory - TODO
**Impact:** High (exact duplication)
**Issue:** `WeaponTab` in WeaponSelection.tsx is identical to `WeaponCategory` in weapon.ts
```typescript
// weapon.ts
export type WeaponCategory = 'beam' | 'projectile' | 'torpedo' | 'special';
// WeaponSelection.tsx
type WeaponTab = 'beam' | 'projectile' | 'torpedo' | 'special';
```
**Fix:** Remove `WeaponTab` and use `WeaponCategory` directly.

### 5.2 ComputerQuality Type Inconsistency - TODO
**Impact:** Medium
**Issue:** Quality concept defined differently in multiple places:
- `sensorService.ts`: `type ComputerQuality = 'none' | 'Ordinary' | 'Good' | 'Amazing'`
- `commandControl.ts`: inline `quality: 'Ordinary' | 'Good' | 'Amazing'` (no 'none')

**Fix:** Create shared types in `common.ts`:
```typescript
export type QualityLevel = 'Ordinary' | 'Good' | 'Amazing';
export type ComputerQuality = 'none' | QualityLevel;
```

### 5.3 Service-Local Types Should Move to Type Files - TODO
**Impact:** Medium
**Issue:** Public types defined in services instead of type files:

| Type | Current Location | Should Move To |
|------|------------------|----------------|
| `ComputerQuality` | sensorService.ts | sensor.ts or common.ts |
| `DamageZone` | damageDiagramService.ts | damageDiagram.ts |
| `SystemCategory` (if public) | commandControlService.ts | commandControl.ts |

### 5.4 CategoryFilter Pattern Duplicated - TODO
**Impact:** Low
**Issue:** Same filter-with-all pattern implemented separately:
- `HangarMiscSelection.tsx`: `type CategoryFilter = 'all' | HangarMiscCategory`
- `DefenseSelection.tsx`: `type CategoryFilter = 'all' | DefenseCategory`
- `WeaponSelection.tsx`: inline `categoryFilter === 'all'`

**Fix:** Create generic type in `common.ts`:
```typescript
export type FilterWithAll<T extends string> = 'all' | T;
```

### 5.5 Similar Stats Interfaces (Optional Consolidation) - TODO
**Impact:** Low (not blocking, but could improve consistency)
**Issue:** 9+ `*Stats` interfaces share common fields:

| Interface | Has totalHullPoints | Has totalPowerRequired | Has totalCost |
|-----------|---------------------|------------------------|---------------|
| WeaponStats | ✓ | ✓ | ✓ |
| DefenseStats | ✓ | ✓ | ✓ |
| SensorStats | ✓ | ✓ | ✓ |
| CommandControlStats | ✓ | ✓ | ✓ |
| HangarMiscStats | ✓ | ✓ | ✓ |
| SupportSystemsStats | ✓ | ✓ | ✓ |
| OrdnanceStats | ✓ | ✗ | ✓ |
| EngineStats | ✓ | ✗ | ✓ |
| PowerPlantStats | ✓ | ✗ | ✓ |

**Fix (optional):** Create base interface in `common.ts`:
```typescript
export interface BaseSystemStats {
  totalHullPoints: number;
  totalCost: number;
}
export interface PowerConsumingStats extends BaseSystemStats {
  totalPowerRequired: number;
}
```

### 5.6 Similar Installed* Interfaces (Optional Consolidation) - TODO
**Impact:** Low (not blocking)
**Issue:** 10+ `Installed*` interfaces share similar base structure with `id`, `type`, `quantity`, etc.

**Fix (optional):** Create base interfaces in `common.ts`:
```typescript
export interface InstalledItemBase {
  id: string;
}
export interface InstalledQuantityItem<T> extends InstalledItemBase {
  type: T;
  quantity: number;
}
```

---

## 6. Missing Features

### Phase 2: Complete Core Features
- [X] Implement Step 7: Weapons
- [X] Implement Step 8: Defenses
- [X] Implement Step 9: Command & Control
- [X] Implement Step 10: Sensors
- [X] Implement Step 11: Hangars
- [X] Implement Step 12: Miscellaneous
- [X] Implement Step 13: Summary page
- [X] Print/PDF export with ship record sheet
- [X] Recent files list
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
