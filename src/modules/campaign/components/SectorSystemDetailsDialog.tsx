import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { GeneratedPlanet, GeneratedStarSystem } from '../types/worldbuilding';

interface SectorSystemDetailsDialogProps {
  open: boolean;
  name: string;
  system: GeneratedStarSystem | null;
  onClose: () => void;
}

function environmentLabel(planet: GeneratedPlanet): string {
  const environmentClass = planet.environment?.environmentClass ?? planet.gmgTranslation?.environmentClass;
  const habitability = planet.science?.habitability;
  if (environmentClass && habitability) return `Class ${environmentClass}; ${habitability}`;
  if (environmentClass) return `Class ${environmentClass}`;
  return habitability ?? 'Not applicable';
}

function lifeLabel(planet: GeneratedPlanet): string {
  if (planet.science) return planet.science.life;
  const lifeSeries = planet.environment?.life.filter((entry) => entry.present).map((entry) => entry.series) ?? [];
  return lifeSeries.length > 0 ? `Series ${lifeSeries.join(', ')}` : 'None';
}

export function SectorSystemDetailsDialog({
  open,
  name,
  system,
  onClose,
}: SectorSystemDetailsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{name} Detailed System</DialogTitle>
      <DialogContent dividers>
        {system && (
          <Stack spacing={2}>
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              <Chip label={system.generationModel === 'science' ? 'Science-informed' : 'GMG Rules'} color="primary" variant="outlined" />
              <Chip label={`${system.starCount} ${system.starCount === 1 ? 'star' : 'stars'}`} variant="outlined" />
              <Chip label={`${system.planets.length} ${system.planets.length === 1 ? 'planet' : 'planets'}`} variant="outlined" />
              <Chip label={`Orbit Track ${system.orbitTrack}`} variant="outlined" />
            </Stack>

            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Stars</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                {system.stars.map((star) => (
                  <Chip key={star.id} label={`${star.role}: ${star.classification}`} size="small" />
                ))}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Planets</Typography>
              {system.planets.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No planets were generated.</Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 680 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Orbit</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Temperature</TableCell>
                        <TableCell align="right">Moons</TableCell>
                        <TableCell>Environment</TableCell>
                        <TableCell>Life</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {system.planets.map((planet) => (
                        <TableRow key={planet.id}>
                          <TableCell>{planet.ring}</TableCell>
                          <TableCell>{planet.type}</TableCell>
                          <TableCell>{planet.temperature}</TableCell>
                          <TableCell align="right">{planet.moons.length}</TableCell>
                          <TableCell>{environmentLabel(planet)}</TableCell>
                          <TableCell>{lifeLabel(planet)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}