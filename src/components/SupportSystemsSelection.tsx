import { useState, useMemo, Fragment, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Button,
  IconButton,
  TextField,
  Chip,
  Tabs,
  Tab,
  Stack,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { TabPanel, TruncatedDescription } from './shared';
import { headerCellSx, configFormSx } from '../constants/tableStyles';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack, InstalledQuantityItem } from '../types/common';
import type {
  LifeSupportType,
  AccommodationType,
  StoreSystemType,
  GravitySystemType,
  InstalledLifeSupport,
  InstalledAccommodation,
  InstalledStoreSystem,
  InstalledGravitySystem,
} from '../types/supportSystem';
import {
  getAllLifeSupportTypes,
  getAllAccommodationTypes,
  getAllStoreSystemTypes,
  getAllGravitySystemTypes,
  calculateSupportSystemsStats,
  generateLifeSupportId,
  generateAccommodationId,
  generateStoreSystemId,
  generateGravitySystemId,
  calculateGravitySystemHullPoints,
  calculateGravitySystemCost,
} from '../services/supportSystemService';
import { filterByDesignConstraints } from '../services/utilities';
import { formatCost, getTechTrackName } from '../services/formatters';

// ============== Generic Subsystem Tab Component ==============

/** Common fields shared by LifeSupportType, AccommodationType, and StoreSystemType */
interface BaseSubsystemType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  hullPoints: number;
  powerRequired: number;
  cost: number;
  description: string;
  expandable?: boolean;
  expansionValuePerHp?: number;
  expansionCostPerHp?: number;
}

interface SubsystemTabProps<T extends BaseSubsystemType> {
  installedItems: InstalledQuantityItem<T>[];
  availableTypes: T[];
  onChange: (items: InstalledQuantityItem<T>[]) => void;
  generateId: () => string;
  label: string;
  labelPlural: string;
  tableMinWidth: number;
  renderInstalledChips: (installed: InstalledQuantityItem<T>) => ReactNode;
  renderPreviewExtra: (type: T, quantity: number, extraHp: number) => ReactNode;
  renderExtraHeaders: () => ReactNode;
  renderExtraRowCells: (type: T) => ReactNode;
}

function SubsystemTab<T extends BaseSubsystemType>({
  installedItems,
  availableTypes,
  onChange,
  generateId,
  label,
  labelPlural,
  tableMinWidth,
  renderInstalledChips,
  renderPreviewExtra,
  renderExtraHeaders,
  renderExtraRowCells,
}: SubsystemTabProps<T>) {
  const [selectedType, setSelectedType] = useState<T | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [extraHp, setExtraHp] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedType(null);
    setQuantity('1');
    setExtraHp(0);
    setEditingId(null);
  };

  const handleSelect = (type: T) => {
    setSelectedType(type);
    setQuantity('1');
    setExtraHp(0);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!selectedType) return;
    const qty = parseInt(quantity, 10) || 1;
    const extra = selectedType.expandable ? extraHp : undefined;

    if (editingId) {
      onChange(
        installedItems.map((item) =>
          item.id === editingId
            ? { ...item, type: selectedType, quantity: qty, extraHp: extra }
            : item
        )
      );
    } else {
      onChange([
        ...installedItems,
        { id: generateId(), type: selectedType, quantity: qty, extraHp: extra },
      ]);
    }
    resetForm();
  };

  const handleEdit = (installed: InstalledQuantityItem<T>) => {
    setSelectedType(installed.type);
    setQuantity(installed.quantity.toString());
    setExtraHp(installed.extraHp || 0);
    setEditingId(installed.id);
  };

  const handleDuplicate = (installed: InstalledQuantityItem<T>) => {
    const duplicate: InstalledQuantityItem<T> = {
      id: generateId(),
      type: installed.type,
      quantity: installed.quantity,
      ...(installed.extraHp ? { extraHp: installed.extraHp } : {}),
    };
    const index = installedItems.findIndex((item) => item.id === installed.id);
    const updated = [...installedItems];
    updated.splice(index + 1, 0, duplicate);
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    onChange(installedItems.filter((item) => item.id !== id));
  };

  const renderFormContent = (isEditing: boolean) => {
    if (!selectedType) return null;
    const qty = parseInt(quantity, 10) || 1;
    const hp = selectedType.hullPoints * qty + (selectedType.expandable ? extraHp : 0);
    const power = selectedType.powerRequired * qty;
    const cost = selectedType.cost * qty + (selectedType.expandable ? extraHp * (selectedType.expansionCostPerHp || 0) : 0);

    return (
      <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        {!isEditing && (
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            Add {selectedType.name}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="Quantity"
            type="number"
            size="small"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ width: 100 }}
          />
          {selectedType.expandable && (
            <TextField
              label="Extra HP"
              type="number"
              size="small"
              value={extraHp}
              onChange={(e) => setExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
              inputProps={{ min: 0 }}
              sx={{ width: 100 }}
            />
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {hp} |{' '}
              Power: {power} |{' '}
              {renderPreviewExtra(selectedType, qty, extraHp)}
              Cost: {formatCost(cost)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={isEditing ? <SaveIcon /> : <AddIcon />}
              >
                {isEditing ? 'Update' : 'Add'}
              </Button>
            </Box>
          </Box>
        </Box>
      </form>
    );
  };

  return (
    <Box>
      {/* Installed items */}
      {installedItems.length > 0 ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed {labelPlural}
          </Typography>
          <Stack spacing={1}>
            {installedItems.map((installed) => {
              const isEditing = editingId === installed.id;
              return (
                <Fragment key={installed.id}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {installed.quantity}x {installed.type.name}{installed.extraHp ? ` (+${installed.extraHp} HP)` : ''}
                  </Typography>
                  <Chip
                    label={`${installed.type.hullPoints * installed.quantity + (installed.extraHp || 0)} HP`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${installed.type.powerRequired * installed.quantity} Power`}
                    size="small"
                    variant="outlined"
                  />
                  {renderInstalledChips(installed)}
                  <Chip
                    label={formatCost(installed.type.cost * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionCostPerHp || 0) : 0))}
                    size="small"
                    variant="outlined"
                  />
                  <IconButton size="small" color="primary" onClick={() => handleEdit(installed)} aria-label={`Edit ${label}`}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDuplicate(installed)} aria-label={`Duplicate ${label}`}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleRemove(installed.id)} aria-label={`Remove ${label}`}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                {/* Inline edit form */}
                {isEditing && selectedType && (
                  <Box sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
                    {renderFormContent(true)}
                  </Box>
                )}
              </Fragment>
            );
          })}
          </Stack>
        </Paper>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1, mb: 2 }}>
          No {label} installed. Select from the table below to add one.
        </Typography>
      )}

      {/* Add new item form - only show when adding (not editing) */}
      {selectedType && !editingId && (
        <Paper variant="outlined" sx={configFormSx}>
          {renderFormContent(false)}
        </Paper>
      )}

      {/* Available types table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: tableMinWidth } }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Name</TableCell>
              <TableCell align="center" sx={headerCellSx}>PL</TableCell>
              <TableCell align="center" sx={headerCellSx}>Tech</TableCell>
              <TableCell align="right" sx={headerCellSx}>HP</TableCell>
              <TableCell align="right" sx={headerCellSx}>Power</TableCell>
              <TableCell align="right" sx={headerCellSx}>Cost</TableCell>
              {renderExtraHeaders()}
              <TableCell sx={headerCellSx}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableTypes.map((type) => (
              <TableRow
                key={type.id}
                hover
                selected={selectedType?.id === type.id}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                onClick={() => handleSelect(type)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                    {type.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">{type.progressLevel}</TableCell>
                <TableCell align="center">
                  {type.techTracks.length > 0 ? (
                    <Tooltip title={type.techTracks.map(getTechTrackName).join(', ')}>
                      <Typography variant="caption">{type.techTracks.join(', ')}</Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="right">{type.hullPoints}</TableCell>
                <TableCell align="right">{type.powerRequired}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCost(type.cost)}</TableCell>
                {renderExtraRowCells(type)}
                <TableCell>
                  <TruncatedDescription text={type.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

interface SupportSystemsSelectionProps {
  hull: Hull;
  installedLifeSupport: InstalledLifeSupport[];
  installedAccommodations: InstalledAccommodation[];
  installedStoreSystems: InstalledStoreSystem[];
  installedGravitySystems: InstalledGravitySystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  surfaceProvidesLifeSupport?: boolean;
  surfaceProvidesGravity?: boolean;
  onLifeSupportChange: (lifeSupport: InstalledLifeSupport[]) => void;
  onAccommodationsChange: (accommodations: InstalledAccommodation[]) => void;
  onStoreSystemsChange: (storeSystems: InstalledStoreSystem[]) => void;
  onGravitySystemsChange: (gravitySystems: InstalledGravitySystem[]) => void;
}

export function SupportSystemsSelection({
  hull,
  installedLifeSupport,
  installedAccommodations,
  installedStoreSystems,
  installedGravitySystems,
  designProgressLevel,
  designTechTracks,
  surfaceProvidesLifeSupport = false,
  surfaceProvidesGravity = false,
  onLifeSupportChange,
  onAccommodationsChange,
  onStoreSystemsChange,
  onGravitySystemsChange,
}: SupportSystemsSelectionProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Get filtered types
  const availableLifeSupport = useMemo(() => {
    return filterByDesignConstraints(getAllLifeSupportTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  const availableAccommodations = useMemo(() => {
    return filterByDesignConstraints(getAllAccommodationTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  const availableStoreSystems = useMemo(() => {
    return filterByDesignConstraints(getAllStoreSystemTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  const availableGravitySystems = useMemo(() => {
    return filterByDesignConstraints(getAllGravitySystemTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  // Calculate stats
  const stats = useMemo(
    () => calculateSupportSystemsStats(
      installedLifeSupport,
      installedAccommodations,
      installedStoreSystems,
      installedGravitySystems,
      designProgressLevel,
      designTechTracks
    ),
    [installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks]
  );

  // ============== Gravity System Handlers ==============

  const handleAddGravitySystem = (gravityType: GravitySystemType) => {
    const hullPoints = calculateGravitySystemHullPoints(gravityType, hull.hullPoints);
    const cost = calculateGravitySystemCost(gravityType, hullPoints);
    
    const newSystem: InstalledGravitySystem = {
      id: generateGravitySystemId(),
      type: gravityType,
      hullPoints,
      cost,
    };
    onGravitySystemsChange([...installedGravitySystems, newSystem]);
  };

  const handleRemoveGravitySystem = (id: string) => {
    onGravitySystemsChange(installedGravitySystems.filter((gs) => gs.id !== id));
  };

  const renderGravityTab = () => {
    // Check if a gravity system is already installed
    const hasInstalledGravitySystem = installedGravitySystems.length > 0;
    
    return (
      <Box>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Artificial Gravity Status
          </Typography>
          {stats.hasArtificialGravity ? (
            <Box>
              <Chip label="Artificial Gravity Available" icon={<CheckCircleIcon />} color="success" sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                At Progress Level {designProgressLevel} with {designTechTracks.length > 0 ? `Tech Tracks: ${designTechTracks.join(', ')}` : 'all tech tracks available'},
                artificial gravity is automatically included in your life support systems at no extra cost.
                This protects crew from deadly accelerations and provides normal gravity throughout the ship.
              </Typography>
            </Box>
          ) : hasInstalledGravitySystem ? (
            <Box>
              <Chip label="Centrifugal Gravity Installed" color="info" sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Your ship uses centrifugal force (spin gravity) to simulate artificial gravity.
              </Typography>
            </Box>
          ) : (
            <Box>
              <Chip label="No Artificial Gravity" icon={<WarningAmberIcon />} color="warning" sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Artificial gravity requires Progress Level 6+ with Gravity (G) technology, or Progress Level 8+ with Energy Transformation (X) technology.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Without artificial gravity, the ship can simulate gravity through constant acceleration (thrust gravity)
                or by installing a spin system.
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Installed Gravity Systems */}
        {installedGravitySystems.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Installed Gravity Systems
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Action</TableCell>
                    <TableCell sx={headerCellSx}>Name</TableCell>
                    <TableCell sx={headerCellSx}>PL</TableCell>
                    <TableCell sx={headerCellSx}>Hull %</TableCell>
                    <TableCell sx={headerCellSx}>HP Used</TableCell>
                    <TableCell sx={headerCellSx}>Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {installedGravitySystems.map((gs) => (
                    <TableRow key={gs.id}>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveGravitySystem(gs.id)}
                          color="error"
                          aria-label="Remove gravity system"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{gs.type.name}</TableCell>
                      <TableCell>{gs.type.progressLevel}</TableCell>
                      <TableCell>{gs.type.hullPercentage}%</TableCell>
                      <TableCell>{gs.hullPoints}</TableCell>
                      <TableCell>{formatCost(gs.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Available Gravity Systems - only show when artificial gravity is NOT available */}
        {!stats.hasArtificialGravity && !hasInstalledGravitySystem && availableGravitySystems.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Available Gravity Systems
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Action</TableCell>
                    <TableCell sx={headerCellSx}>Name</TableCell>
                    <TableCell sx={headerCellSx}>PL</TableCell>
                    <TableCell sx={headerCellSx}>Tech</TableCell>
                    <TableCell sx={headerCellSx}>Hull %</TableCell>
                    <TableCell sx={headerCellSx}>Est. HP</TableCell>
                    <TableCell sx={headerCellSx}>Cost/HP</TableCell>
                    <TableCell sx={headerCellSx}>Est. Cost</TableCell>
                    <TableCell sx={headerCellSx}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableGravitySystems.map((gt) => {
                    const estHP = calculateGravitySystemHullPoints(gt, hull.hullPoints);
                    const estCost = calculateGravitySystemCost(gt, estHP);
                    return (
                      <TableRow key={gt.id} hover>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleAddGravitySystem(gt)}
                            color="primary"
                            aria-label="Add gravity system"
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{gt.name}</TableCell>
                        <TableCell>{gt.progressLevel}</TableCell>
                        <TableCell>
                          {gt.techTracks.length > 0 ? (
                            <Tooltip title={gt.techTracks.map(getTechTrackName).join(', ')}>
                              <span>{gt.techTracks.join(', ')}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{gt.hullPercentage}%</TableCell>
                        <TableCell>{estHP}</TableCell>
                        <TableCell>{formatCost(gt.costPerHullPoint)}</TableCell>
                        <TableCell>{formatCost(estCost)}</TableCell>
                        <TableCell>
                          <TruncatedDescription text={gt.description} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Surface environment info banners */}
      {(surfaceProvidesLifeSupport || surfaceProvidesGravity) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {surfaceProvidesLifeSupport && (
            <Alert severity="info" variant="outlined">
              <strong>Surface provides life support</strong> — This ground base has a breathable atmosphere. Life support systems are optional but can provide backup or sealed areas.
            </Alert>
          )}
          {surfaceProvidesGravity && (
            <Alert severity="info" variant="outlined">
              <strong>Surface provides gravity</strong> — This ground base has natural gravity. Artificial gravity systems are not required.
            </Alert>
          )}
        </Stack>
      )}

      {/* Summary Chips */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`HP: ${stats.totalHullPoints}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Power: ${stats.totalPowerRequired}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Cost: ${formatCost(stats.totalCost)}`}
            color="default"
            variant="outlined"
          />
          {surfaceProvidesLifeSupport ? (
            <Chip
              label="Life Support: Surface"
              icon={<CheckCircleIcon />}
              color="success"
              variant="outlined"
            />
          ) : (
            <Chip
              label={`Life Support: ${stats.totalCoverage}/${hull.hullPoints} HP (${((stats.totalCoverage / hull.hullPoints) * 100).toFixed(0)}%)`}
              color={stats.totalCoverage >= hull.hullPoints ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
          <Chip
            label={`Crew: ${stats.crewCapacity}/${hull.crew} (${((stats.crewCapacity / hull.crew) * 100).toFixed(0)}%)`}
            color={stats.crewCapacity >= hull.crew ? 'success' : 'warning'}
            variant="outlined"
          />
          {stats.troopCapacity > 0 && (
            <Chip
              label={`Troops: ${stats.troopCapacity}`}
              color="primary"
              variant="outlined"
            />
          )}
          {stats.passengerCapacity > 0 && (
            <Chip
              label={`Passengers: ${stats.passengerCapacity}`}
              color="primary"
              variant="outlined"
            />
          )}
          {stats.suspendedCapacity > 0 && (
            <Chip
              label={`Suspended: ${stats.suspendedCapacity}`}
              color="primary"
              variant="outlined"
            />
          )}
          {(() => {
            // Calculate stores per person (only crew and passengers count, not cryo)
            // feedsReduction: "feeds" systems (e.g., hydroponics) where X people count as 1
            // recyclingReduction: "reduces-consumption" systems (e.g., recyclers) reduce consumption to Y%
            const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
            // Cap recycling to not exceed remaining people after feeds
            const remainingAfterFeeds = Math.max(0, activePersons - stats.feedsReduction);
            const cappedRecyclingReduction = Math.min(stats.recyclingReduction, remainingAfterFeeds);
            const effectivePersons = Math.max(1, activePersons - stats.feedsReduction - cappedRecyclingReduction);
            if (activePersons > 0) {
              const totalStoreDays = stats.baseStoreDays + stats.additionalStoresDays;
              const storesPerPerson = Math.floor(totalStoreDays / effectivePersons);
              return (
                <Chip
                  label={`Stores: ${storesPerPerson} days/person`}
                  color="primary"
                  variant="outlined"
                />
              );
            }
            return null;
          })()}
          {!stats.hasArtificialGravity && !stats.hasGravitySystemInstalled && !surfaceProvidesGravity && (
            <Chip
              label="No Gravity"
              icon={<WarningAmberIcon />}
              color="warning"
              variant="outlined"
            />
          )}
          {surfaceProvidesGravity && (
            <Chip
              label="Surface Gravity"
              icon={<CheckCircleIcon />}
              color="success"
              variant="outlined"
            />
          )}
          {!surfaceProvidesGravity && (stats.hasArtificialGravity || stats.hasGravitySystemInstalled) && (
            <Chip
              label="Artificial Gravity"
              icon={<CheckCircleIcon />}
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label={`Life Support (${installedLifeSupport.length})`} />
          <Tab label={`Accommodations (${installedAccommodations.length})`} />
          <Tab label={`Stores (${installedStoreSystems.length})`} />
          {!surfaceProvidesGravity && <Tab label={`Gravity (${installedGravitySystems.length})`} />}
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <SubsystemTab<LifeSupportType>
          installedItems={installedLifeSupport}
          availableTypes={availableLifeSupport}
          onChange={onLifeSupportChange}
          generateId={generateLifeSupportId}
          label="life support"
          labelPlural="Life Support"
          tableMinWidth={700}
          renderInstalledChips={(installed) => {
            const coverage = installed.type.coveragePerHullPoint * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0);
            return (
              <Chip
                label={`Covers ${coverage} HP (${((coverage / hull.hullPoints) * 100).toFixed(0)}%)`}
                size="small"
                color="primary"
                variant="outlined"
              />
            );
          }}
          renderPreviewExtra={(type, qty, extra) => {
            const coverage = type.coveragePerHullPoint * qty + (type.expandable ? extra * (type.expansionValuePerHp || 0) : 0);
            return `Covers: ${coverage} HP (${((coverage / hull.hullPoints) * 100).toFixed(0)}%) | `;
          }}
          renderExtraHeaders={() => (
            <TableCell align="right" sx={headerCellSx}>Covers</TableCell>
          )}
          renderExtraRowCells={(type) => (
            <TableCell align="right">{type.coveragePerHullPoint} HP</TableCell>
          )}
        />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <SubsystemTab<AccommodationType>
          installedItems={installedAccommodations}
          availableTypes={availableAccommodations}
          onChange={onAccommodationsChange}
          generateId={generateAccommodationId}
          label="accommodation"
          labelPlural="Accommodations"
          tableMinWidth={800}
          renderInstalledChips={(installed) => {
            const capacity = installed.type.capacity * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0);
            return (
              <>
                <Chip
                  label={`${capacity} ${installed.type.category}${installed.type.category === 'crew' ? ` (${((capacity / hull.crew) * 100).toFixed(0)}%)` : ''}`}
                  size="small"
                  color={installed.type.category === 'crew' ? 'error' : installed.type.category === 'troop' ? 'error' : installed.type.category === 'passenger' ? 'primary' : 'secondary'}
                  variant="outlined"
                />
                {installed.type.includesAirlock && (
                  <Chip
                    label={`${installed.quantity} airlock${installed.quantity > 1 ? 's' : ''}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </>
            );
          }}
          renderPreviewExtra={(type, qty, extra) => {
            const capacity = type.capacity * qty + (type.expandable ? extra * (type.expansionValuePerHp || 0) : 0);
            return `Capacity: ${capacity}${type.category === 'crew' ? ` (${((capacity / hull.crew) * 100).toFixed(0)}%)` : ''} | `;
          }}
          renderExtraHeaders={() => (
            <>
              <TableCell align="right" sx={headerCellSx}>Capacity</TableCell>
              <TableCell align="center" sx={headerCellSx}>Type</TableCell>
              <TableCell align="center" sx={headerCellSx}>Airlock</TableCell>
            </>
          )}
          renderExtraRowCells={(type) => (
            <>
              <TableCell align="right">{type.capacity}</TableCell>
              <TableCell align="center">
                <Chip
                  label={type.category}
                  size="small"
                  color={type.category === 'crew' ? 'error' : type.category === 'troop' ? 'error' : type.category === 'passenger' ? 'primary' : 'secondary'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                {type.includesAirlock ? (
                  <Chip label="Yes" size="small" color="success" variant="outlined" />
                ) : (
                  <Typography variant="caption" color="text.secondary">-</Typography>
                )}
              </TableCell>
            </>
          )}
        />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <SubsystemTab<StoreSystemType>
          installedItems={installedStoreSystems}
          availableTypes={availableStoreSystems}
          onChange={onStoreSystemsChange}
          generateId={generateStoreSystemId}
          label="store system"
          labelPlural="Store Systems"
          tableMinWidth={700}
          renderInstalledChips={(installed) => {
            const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
            if (installed.type.effect === 'feeds') {
              const feedCount = installed.type.effectValue * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0);
              return (
                <Chip
                  label={`Feeds ${feedCount}${activePersons > 0 ? ` (${((feedCount / activePersons) * 100).toFixed(0)}%)` : ''}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            }
            if (installed.type.effect === 'reduces-consumption') {
              const recycleCount = (installed.type.affectedPeople || 0) * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0);
              return (
                <Chip
                  label={`Recycles for ${recycleCount}${activePersons > 0 ? ` (${((recycleCount / activePersons) * 100).toFixed(0)}%)` : ''}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            }
            if (installed.type.effect === 'adds-stores') {
              const days = installed.type.effectValue * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0);
              return (
                <Chip
                  label={`Stores: +${days.toLocaleString()} days`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            }
            return null;
          }}
          renderPreviewExtra={(type, qty, extra) => {
            const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
            if (type.effect === 'feeds') {
              const feedCount = type.effectValue * qty + (type.expandable ? extra * (type.expansionValuePerHp || 0) : 0);
              return `Feeds ${feedCount}${activePersons > 0 ? ` (${((feedCount / activePersons) * 100).toFixed(0)}%)` : ''} | `;
            }
            if (type.effect === 'reduces-consumption') {
              const recycleCount = (type.affectedPeople || 0) * qty + (type.expandable ? extra * (type.expansionValuePerHp || 0) : 0);
              return `Recycles for ${recycleCount}${activePersons > 0 ? ` (${((recycleCount / activePersons) * 100).toFixed(0)}%)` : ''} | `;
            }
            if (type.effect === 'adds-stores') {
              const days = type.effectValue * qty + (type.expandable ? extra * (type.expansionValuePerHp || 0) : 0);
              return `+${days.toLocaleString()} days | `;
            }
            return '';
          }}
          renderExtraHeaders={() => (
            <TableCell sx={headerCellSx}>Effect</TableCell>
          )}
          renderExtraRowCells={(type) => (
            <TableCell>
              {type.effect === 'feeds' && `Feeds ${type.effectValue}`}
              {type.effect === 'reduces-consumption' && `Recycles for ${type.affectedPeople}`}
              {type.effect === 'adds-stores' && `+${type.effectValue.toLocaleString()} days`}
            </TableCell>
          )}
        />
      </TabPanel>
      {!surfaceProvidesGravity && (
        <TabPanel value={activeTab} index={3}>
          {renderGravityTab()}
        </TabPanel>
      )}
    </Box>
  );
}
