import { Container, Typography, Box, Paper } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <RocketLaunchIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h1" gutterBottom>
          Alternity Warship Generator
        </Typography>
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Welcome to the Alternity Warship Generator. Start building your warship!
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
