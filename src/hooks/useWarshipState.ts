import { useCallback, useMemo, useRef, useEffect, useReducer, useState } from 'react';
import type { AppMode } from '../types/common';
import type { Mod } from '../types/mod';
import { useUndoHistory } from './useUndoHistory';
import type { WarshipState } from '../types/warshipState';

// ---------------------------------------------------------------------------
// Internal state type: everything in WarshipState except activeMods,
// which is injected from outside and not managed by this hook.
// ---------------------------------------------------------------------------
type DesignState = Omit<WarshipState, 'activeMods'>;

// ---------------------------------------------------------------------------
// Reducer action types
// ---------------------------------------------------------------------------

/** Type-safe SET_FIELD action: each key of DesignState maps to a correctly-typed payload. */
type SetFieldAction = {
  [K in keyof DesignState]: {
    type: 'SET_FIELD';
    field: K;
    value: DesignState[K] | ((prev: DesignState[K]) => DesignState[K]);
  }
}[keyof DesignState];

type WarshipAction =
  | SetFieldAction
  | { type: 'APPLY_STATE'; payload: DesignState };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function warshipReducer(state: DesignState, action: WarshipAction): DesignState {
  switch (action.type) {
    case 'SET_FIELD': {
      const rawValue = action.value;
      const newValue = typeof rawValue === 'function'
        ? (rawValue as (prev: DesignState[typeof action.field]) => DesignState[typeof action.field])(state[action.field])
        : rawValue;
      // Bail out if reference hasn't changed (avoids unnecessary re-renders)
      if (newValue === state[action.field]) return state;
      return { ...state, [action.field]: newValue };
    }
    case 'APPLY_STATE':
      return action.payload;
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialDesignState: DesignState = {
  designType: 'warship',
  stationType: null,
  surfaceProvidesLifeSupport: false,
  surfaceProvidesGravity: false,
  hull: null,
  armorLayers: [],
  powerPlants: [],
  fuelTanks: [],
  engines: [],
  engineFuelTanks: [],
  ftlDrive: null,
  ftlFuelTanks: [],
  lifeSupport: [],
  accommodations: [],
  storeSystems: [],
  gravitySystems: [],
  weapons: [],
  ordnanceDesigns: [],
  launchSystems: [],
  defenses: [],
  commandControl: [],
  sensors: [],
  hangarMisc: [],
  damageDiagramZones: [],
  hitLocationChart: null,
  shipDescription: {
    lore: '',
    imageData: null,
    imageMimeType: null,
    faction: '',
    role: '',
    commissioningDate: '',
    classification: '',
    manufacturer: '',
  },
  name: 'New Ship',
  createdAt: null,
  designProgressLevel: 9,
  designTechTracks: [],
};

// ---------------------------------------------------------------------------
// Setter factory — creates a dispatch-backed setter with the same signature
// as React.Dispatch<React.SetStateAction<T>> for a given DesignState field.
// ---------------------------------------------------------------------------

function createSetter<K extends keyof DesignState>(
  dispatch: React.Dispatch<WarshipAction>,
  field: K,
): React.Dispatch<React.SetStateAction<DesignState[K]>> {
  return (value: React.SetStateAction<DesignState[K]>) => {
    dispatch({ type: 'SET_FIELD', field, value } as SetFieldAction);
  };
}

/**
 * Manages all warship design state: a single reducer-backed WarshipState object,
 * undo/redo history, state application, and dirty-change tracking.
 *
 * @param mode Current app mode — dirty-check only triggers when mode is 'builder'
 */
export function useWarshipState(mode: AppMode, designActiveMods: Mod[]) {
  const [state, dispatch] = useReducer(warshipReducer, initialDesignState);

  // ---- Unsaved changes tracking (meta-state, not part of design) ----
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const skipDirtyCheckRef = useRef(true);

  // ---- Undo / redo history ----
  const undoHistory = useUndoHistory<WarshipState>(50);

  // ---- Setter functions (stable refs — dispatch never changes) ----
  const setters = useMemo(() => ({
    setDesignType: createSetter(dispatch, 'designType'),
    setStationType: createSetter(dispatch, 'stationType'),
    setSurfaceProvidesLifeSupport: createSetter(dispatch, 'surfaceProvidesLifeSupport'),
    setSurfaceProvidesGravity: createSetter(dispatch, 'surfaceProvidesGravity'),
    setSelectedHull: createSetter(dispatch, 'hull'),
    setArmorLayers: createSetter(dispatch, 'armorLayers'),
    setInstalledPowerPlants: createSetter(dispatch, 'powerPlants'),
    setInstalledFuelTanks: createSetter(dispatch, 'fuelTanks'),
    setInstalledEngines: createSetter(dispatch, 'engines'),
    setInstalledEngineFuelTanks: createSetter(dispatch, 'engineFuelTanks'),
    setInstalledFTLDrive: createSetter(dispatch, 'ftlDrive'),
    setInstalledFTLFuelTanks: createSetter(dispatch, 'ftlFuelTanks'),
    setInstalledLifeSupport: createSetter(dispatch, 'lifeSupport'),
    setInstalledAccommodations: createSetter(dispatch, 'accommodations'),
    setInstalledStoreSystems: createSetter(dispatch, 'storeSystems'),
    setInstalledGravitySystems: createSetter(dispatch, 'gravitySystems'),
    setInstalledWeapons: createSetter(dispatch, 'weapons'),
    setOrdnanceDesigns: createSetter(dispatch, 'ordnanceDesigns'),
    setInstalledLaunchSystems: createSetter(dispatch, 'launchSystems'),
    setInstalledDefenses: createSetter(dispatch, 'defenses'),
    setInstalledCommandControl: createSetter(dispatch, 'commandControl'),
    setInstalledSensors: createSetter(dispatch, 'sensors'),
    setInstalledHangarMisc: createSetter(dispatch, 'hangarMisc'),
    setDamageDiagramZones: createSetter(dispatch, 'damageDiagramZones'),
    setHitLocationChart: createSetter(dispatch, 'hitLocationChart'),
    setShipDescription: createSetter(dispatch, 'shipDescription'),
    setWarshipName: createSetter(dispatch, 'name'),
    setDesignProgressLevel: createSetter(dispatch, 'designProgressLevel'),
    setDesignTechTracks: createSetter(dispatch, 'designTechTracks'),
  }), [dispatch]);

  // ---- State assembly (now trivial — state already IS the object) ----

  const buildCurrentState = useCallback(
    (): WarshipState => ({ ...state, activeMods: designActiveMods }),
    [state, designActiveMods],
  );

  /** Memoized current state object — stable reference when no state has changed. */
  const currentState: WarshipState = useMemo(
    () => ({ ...state, activeMods: designActiveMods }),
    [state, designActiveMods],
  );

  /** Apply a full WarshipState snapshot (used for undo/redo, load, duplication). */
  const applyState = useCallback((newState: WarshipState) => {
    // Strip activeMods (not managed here) before dispatching
    const { activeMods: _, ...designState } = newState;
    void _;
    dispatch({ type: 'APPLY_STATE', payload: designState });
  }, []);

  const handleUndo = useCallback(() => {
    const restored = undoHistory.undo();
    if (restored) applyState(restored);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- undoHistory methods are stable refs
  }, [undoHistory.undo, applyState]);

  const handleRedo = useCallback(() => {
    const restored = undoHistory.redo();
    if (restored) applyState(restored);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- undoHistory methods are stable refs
  }, [undoHistory.redo, applyState]);

  // Track design state changes to detect unsaved modifications + push to undo history
  useEffect(() => {
    if (skipDirtyCheckRef.current) {
      skipDirtyCheckRef.current = false;
      return;
    }
    if (mode === 'builder') {
      setHasUnsavedChanges(true);
      if (!undoHistory.isRestoringRef.current) {
        undoHistory.pushState({ ...state, activeMods: designActiveMods });
      } else {
        undoHistory.isRestoringRef.current = false;
      }
    }
  }, [state, mode, undoHistory, designActiveMods]);

  return {
    // State values (using consumer-expected names)
    designType: state.designType,
    stationType: state.stationType,
    surfaceProvidesLifeSupport: state.surfaceProvidesLifeSupport,
    surfaceProvidesGravity: state.surfaceProvidesGravity,
    selectedHull: state.hull,
    armorLayers: state.armorLayers,
    installedPowerPlants: state.powerPlants,
    installedFuelTanks: state.fuelTanks,
    installedEngines: state.engines,
    installedEngineFuelTanks: state.engineFuelTanks,
    installedFTLDrive: state.ftlDrive,
    installedFTLFuelTanks: state.ftlFuelTanks,
    installedLifeSupport: state.lifeSupport,
    installedAccommodations: state.accommodations,
    installedStoreSystems: state.storeSystems,
    installedGravitySystems: state.gravitySystems,
    installedWeapons: state.weapons,
    ordnanceDesigns: state.ordnanceDesigns,
    installedLaunchSystems: state.launchSystems,
    installedDefenses: state.defenses,
    installedCommandControl: state.commandControl,
    installedSensors: state.sensors,
    installedHangarMisc: state.hangarMisc,
    damageDiagramZones: state.damageDiagramZones,
    hitLocationChart: state.hitLocationChart,
    shipDescription: state.shipDescription,
    warshipName: state.name,
    designProgressLevel: state.designProgressLevel,
    designTechTracks: state.designTechTracks,
    // Setters
    ...setters,
    // Helpers
    buildCurrentState, currentState, applyState,
    handleUndo, handleRedo, undoHistory,
    hasUnsavedChanges, setHasUnsavedChanges, skipDirtyCheckRef,
  };
}
