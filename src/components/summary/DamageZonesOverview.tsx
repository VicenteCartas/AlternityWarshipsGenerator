import {
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Hull } from '../../types/hull';
import type { ShipArmor } from '../../types/armor';
import type { DamageZone } from '../../types/damageDiagram';
import { getZoneLimitForHull } from '../../services/damageDiagramService';

interface DamageZonesOverviewProps {
  zones: DamageZone[];
  hull: Hull;
  warshipName: string;
  armorLayers: ShipArmor[];
}

export function DamageZonesOverview({ zones, hull, warshipName, armorLayers }: DamageZonesOverviewProps) {
  const zoneLimit = getZoneLimitForHull(hull.id);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Ship Defense Stats */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Ship Defense
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`Toughness: ${hull.toughness}`} size="small" variant="outlined" />
          <Chip label={`Damage Track: S:${hull.damageTrack.stun} W:${hull.damageTrack.wound} M:${hull.damageTrack.mortal} C:${hull.damageTrack.critical}`} size="small" variant="outlined" />
          {armorLayers.map((layer) => (
            <Box key={layer.weight} sx={{ display: 'contents' }}>
              <Chip label={`Armor: ${layer.weight.charAt(0).toUpperCase() + layer.weight.slice(1)} ${layer.type.name}`} size="small" variant="outlined" color="primary" />
              <Chip label={`LI: ${layer.type.protectionLI}`} size="small" variant="outlined" />
              <Chip label={`HI: ${layer.type.protectionHI}`} size="small" variant="outlined" />
              <Chip label={`En: ${layer.type.protectionEn}`} size="small" variant="outlined" />
            </Box>
          ))}
          {armorLayers.length === 0 && (
            <Chip label="No Armor" icon={<WarningAmberIcon />} size="small" variant="outlined" color="warning" />
          )}
        </Box>
      </Paper>
      
      {zones.length === 0 ? (
        <Alert severity="info">
          No damage zones configured. Go to the Zones step to assign systems to zones.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            The {warshipName || hull.name} has {zones.length} damage zones. Each zone can hold up to {zoneLimit} HP worth of systems.
            When a ship takes damage, systems in the hit zone are damaged from surface (weapons/defenses) to core (command/power).
          </Typography>
      
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {zones.map((zone) => {
              const isOverLimit = zone.totalHullPoints > zone.maxHullPoints;
              const isEmpty = zone.systems.length === 0;
          
              return (
                <Paper 
                  key={zone.code} 
                  sx={{ 
                    p: 2, 
                    width: 300,
                    height: 250,
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: isOverLimit ? 'error.main' : isEmpty ? 'grey.400' : 'success.main',
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Zone {zone.code}
                    </Typography>
                    <Chip 
                      label={`${zone.totalHullPoints}/${zone.maxHullPoints}`} 
                      size="small"
                      color={isOverLimit ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {zone.systems.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No systems assigned
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {zone.systems.map((sys, idx) => (
                          <Typography key={sys.id} variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {idx + 1}. {sys.name} ({sys.hullPoints} HP)
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
