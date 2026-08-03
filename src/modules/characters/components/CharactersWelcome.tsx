import {
  Box, Button, Chip, Container, Divider, Paper, Stack, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { APP_VERSION } from '@shared/constants/version';

interface CharactersWelcomeProps {
  onNewCharacter: () => void;
  onOpenCharacter: () => void;
  onReturnToHub: () => void;
}

export function CharactersWelcome({
  onNewCharacter,
  onOpenCharacter,
  onReturnToHub,
}: CharactersWelcomeProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Button startIcon={<ArrowBackIcon />} onClick={onReturnToHub} sx={{ my: 1 }}>
            Workshop Home
          </Button>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              >
                <PersonAddAlt1Icon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h4" component="h1">Character Creator</Typography>
                <Typography variant="body2" color="text.secondary">
                  Player's Handbook character creation and advancement
                </Typography>
              </Box>
            </Stack>
            <Chip label={`v${APP_VERSION}`} size="small" variant="outlined" sx={{ ml: { sm: 'auto' } }} />
          </Stack>

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack divider={<Divider flexItem />}>
              <Button
                variant="text"
                color="inherit"
                startIcon={<AddIcon color="primary" />}
                onClick={onNewCharacter}
                sx={{ justifyContent: 'flex-start', px: 3, py: 2.25, fontSize: '1rem' }}
              >
                New Character
              </Button>
              <Button
                variant="text"
                color="inherit"
                startIcon={<FolderOpenIcon color="primary" />}
                onClick={onOpenCharacter}
                sx={{ justifyContent: 'flex-start', px: 3, py: 2.25, fontSize: '1rem' }}
              >
                Open Character
              </Button>
            </Stack>
          </Paper>

          <Box>
            <Typography variant="overline" color="text.secondary">Planned</Typography>
            <Paper variant="outlined" sx={{ mt: 0.5, overflow: 'hidden' }}>
              <Stack divider={<Divider flexItem />}>
                <Button
                  disabled
                  startIcon={<CollectionsBookmarkOutlinedIcon />}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 3, py: 2 }}
                >
                  Character Library
                </Button>
                <Button
                  disabled
                  startIcon={<ExtensionOutlinedIcon />}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 3, py: 2 }}
                >
                  Sources &amp; Mods
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}