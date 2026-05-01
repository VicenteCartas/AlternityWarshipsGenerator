import { Box } from '@mui/material';
import type { ReactNode } from 'react';

export interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
  id?: string;
}

/**
 * A tab panel component for use with MUI Tabs
 * Renders children only when the tab is active (value === index)
 */
export function TabPanel({ children, value, index, id }: TabPanelProps) {
  const panelId = id || `tabpanel-${index}`;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={panelId}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}
