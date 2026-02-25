import { useState, useCallback } from 'react';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  action?: { label: string; onClick: () => void };
}

export type ShowNotificationFn = (
  message: string,
  severity: 'success' | 'error' | 'warning' | 'info',
  action?: { label: string; onClick: () => void },
) => void;

/**
 * Manages snackbar notification state and display helpers.
 */
export function useNotification() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showNotification: ShowNotificationFn = useCallback((message, severity, action) => {
    setSnackbar({ open: true, message, severity, action });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  return { snackbar, showNotification, handleCloseSnackbar };
}
