import { useState } from 'react';
import { Container, Typography, Box, Paper, AppBar, Toolbar, Chip } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { HullSelection } from './components/HullSelection';
import type { Hull } from './types/hull';
import { calculateHullStats } from './types/hull';

function App() {
  const [selectedHull, setSelectedHull] = useState<Hull | null>(null);

  const handleHullSelect = (hull: Hull) => {
    setSelectedHull(hull);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <RocketLaunchIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Alternity Warship Generator
          </Typography>
          {selectedHull && (
            <Chip
              label={`Hull: ${selectedHull.name} (${calculateHullStats(selectedHull).totalHullPoints} HP)`}
              color="primary"
              variant="outlined"
            />
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
        <Paper sx={{ p: 3 }}>
          <HullSelection
            selectedHull={selectedHull}
            onHullSelect={handleHullSelect}
          />
        </Paper>
      </Container>
    </Box>
  );
}

export default App;
