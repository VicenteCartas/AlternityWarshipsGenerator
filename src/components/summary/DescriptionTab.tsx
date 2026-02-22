import { useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Card,
  CardMedia,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ShipDescription } from '../../types/summary';

interface DescriptionTabProps {
  warshipName: string;
  shipDescription: ShipDescription;
  onShipDescriptionChange: (description: ShipDescription) => void;
}

export function DescriptionTab({
  warshipName,
  shipDescription,
  onShipDescriptionChange,
}: DescriptionTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoreChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onShipDescriptionChange({
      ...shipDescription,
      lore: event.target.value,
    });
  };

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file is too large. Maximum size is 5MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Extract base64 data (remove the data:image/xxx;base64, prefix for storage)
      const base64Data = result.split(',')[1];
      onShipDescriptionChange({
        ...shipDescription,
        imageData: base64Data,
        imageMimeType: file.type,
      });
    };
    reader.readAsDataURL(file);

    // Reset input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [shipDescription, onShipDescriptionChange]);

  const handleRemoveImage = () => {
    onShipDescriptionChange({
      ...shipDescription,
      imageData: null,
      imageMimeType: null,
    });
  };

  const imageDataUrl = shipDescription.imageData && shipDescription.imageMimeType
    ? `data:${shipDescription.imageMimeType};base64,${shipDescription.imageData}`
    : null;

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* Image upload section */}
      <Box sx={{ minWidth: 300, maxWidth: 400 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Ship Image
        </Typography>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />
        {imageDataUrl ? (
          <Box>
            <Card variant="outlined">
              <CardMedia
                component="img"
                image={imageDataUrl}
                alt={warshipName}
                sx={{ maxHeight: 300, objectFit: 'contain' }}
              />
            </Card>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={handleRemoveImage}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<AddPhotoAlternateIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ width: '100%', height: 150 }}
          >
            Upload Image
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Max 5MB. JPG, PNG, or GIF.
        </Typography>
      </Box>

      {/* Lore/Description section */}
      <Box sx={{ flex: 1, minWidth: 300 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Ship Lore & Description
        </Typography>
        <TextField
          multiline
          rows={12}
          fullWidth
          placeholder="Write the history, purpose, and background of your design..."
          value={shipDescription.lore}
          onChange={handleLoreChange}
          variant="outlined"
        />
      </Box>
    </Box>
  );
}
