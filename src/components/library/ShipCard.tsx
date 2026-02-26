import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Stack, Typography, Tooltip } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ApartmentIcon from '@mui/icons-material/Apartment';
import type { LibraryEntry } from '../../types/library';
import { getDesignTypeDisplayName, getStationTypeDisplayName, getShipClassDisplayName, PL_NAMES } from '../../services/formatters';
import type { ProgressLevel } from '../../types/common';

interface ShipCardProps {
  entry: LibraryEntry;
  onOpen: (filePath: string) => void;
}

/**
 * Card component displaying a single design in the Ship Library.
 * Shows thumbnail image, name, hull, key design metadata as chips.
 */
export function ShipCard({ entry, onOpen }: ShipCardProps) {
  const isStation = entry.designType === 'station';

  const handleClick = () => {
    onOpen(entry.filePath);
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
        },
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Thumbnail */}
        {entry.imageData && entry.imageMimeType ? (
          <CardMedia
            component="img"
            image={`data:${entry.imageMimeType};base64,${entry.imageData}`}
            alt={entry.name}
            sx={{
              height: 160,
              objectFit: 'contain',
              bgcolor: 'background.default',
              p: 1,
            }}
          />
        ) : (
          <Box
            sx={{
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
            }}
          >
            {isStation ? (
              <ApartmentIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            ) : (
              <RocketLaunchIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            )}
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1, pt: 1.5, pb: 1, '&:last-child': { pb: 1.5 } }}>
          {/* Name */}
          <Tooltip title={entry.name} enterDelay={500}>
            <Typography
              variant="subtitle1"
              component="h3"
              noWrap
              sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.3 }}
            >
              {entry.name}
            </Typography>
          </Tooltip>

          {/* Hull name */}
          {entry.hullName && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
              {entry.hullName}
            </Typography>
          )}

          {/* Metadata chips */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
            {/* Design type */}
            <Chip
              label={isStation && entry.stationType
                ? getStationTypeDisplayName(entry.stationType)
                : getDesignTypeDisplayName(entry.designType)}
              size="small"
              color={isStation ? 'primary' : 'default'}
              variant="outlined"
            />

            {/* Ship class */}
            {entry.shipClass && (
              <Chip
                label={getShipClassDisplayName(entry.shipClass)}
                size="small"
                variant="outlined"
              />
            )}

            {/* Progress level */}
            {entry.designProgressLevel && (
              <Chip
                label={`PL${entry.designProgressLevel}`}
                size="small"
                variant="outlined"
                title={PL_NAMES[entry.designProgressLevel as ProgressLevel] || ''}
              />
            )}
          </Stack>

          {/* Secondary info row */}
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
            {entry.faction && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {entry.faction}
              </Typography>
            )}
            {entry.role && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {entry.role}
              </Typography>
            )}
          </Stack>

          {/* Modified date */}
          {entry.modifiedAt && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              Modified {formatDate(entry.modifiedAt)}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
