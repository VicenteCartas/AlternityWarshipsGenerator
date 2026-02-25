import { useEffect } from 'react';
import '../types/electron.d.ts';

export interface ElectronMenuHandlerCallbacks {
  handleNewWarship: () => void;
  handleLoadWarship: () => void;
  handleSaveWarship: () => void;
  handleSaveWarshipAs: () => void;
  loadFromFile: (filePath: string) => Promise<boolean>;
  handleReturnToStart: () => void;
  handleDuplicateDesign: () => void;
  setAboutDialogOpen: (open: boolean) => void;
  setShortcutsDialogOpen: (open: boolean) => void;
}

/**
 * Registers Electron menu event handlers when running inside Electron.
 * Cleans up listeners on unmount or handler change.
 */
export function useElectronMenuHandlers({
  handleNewWarship,
  handleLoadWarship,
  handleSaveWarship,
  handleSaveWarshipAs,
  loadFromFile,
  handleReturnToStart,
  handleDuplicateDesign,
  setAboutDialogOpen,
  setShortcutsDialogOpen,
}: ElectronMenuHandlerCallbacks) {
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onNewWarship(() => {
        handleNewWarship();
      });
      window.electronAPI.onLoadWarship(() => {
        handleLoadWarship();
      });
      window.electronAPI.onSaveWarship(() => {
        handleSaveWarship();
      });
      window.electronAPI.onSaveWarshipAs(() => {
        handleSaveWarshipAs();
      });
      window.electronAPI.onOpenRecent((filePath: string) => {
        loadFromFile(filePath);
      });
      window.electronAPI.onShowAbout(() => {
        setAboutDialogOpen(true);
      });
      window.electronAPI.onShowShortcuts(() => {
        setShortcutsDialogOpen(true);
      });
      window.electronAPI.onReturnToStart(() => {
        handleReturnToStart();
      });
      window.electronAPI.onDuplicateDesign(() => {
        handleDuplicateDesign();
      });

      return () => {
        window.electronAPI?.removeAllListeners('menu-new-warship');
        window.electronAPI?.removeAllListeners('menu-load-warship');
        window.electronAPI?.removeAllListeners('menu-save-warship');
        window.electronAPI?.removeAllListeners('menu-save-warship-as');
        window.electronAPI?.removeAllListeners('menu-open-recent');
        window.electronAPI?.removeAllListeners('menu-show-about');
        window.electronAPI?.removeAllListeners('menu-show-shortcuts');
        window.electronAPI?.removeAllListeners('menu-duplicate-design');
        window.electronAPI?.removeAllListeners('menu-return-to-start');
      };
    }
  }, [handleNewWarship, handleLoadWarship, handleSaveWarship, handleSaveWarshipAs, loadFromFile, handleReturnToStart, handleDuplicateDesign]);
}
