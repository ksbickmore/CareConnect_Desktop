import { contextBridge, ipcRenderer } from 'electron';

/**
 * Minimal, safe bridge. `popupMenu` lets the renderer's styled menu-bar
 * buttons trigger the real Electron submenus (the OS menu bar is hidden).
 * The renderer can feature-detect `window.careconnect`, which is absent when
 * the UI runs in a plain browser dev server.
 */
contextBridge.exposeInMainWorld('careconnect', {
  platform: process.platform,
  version: process.versions.electron,
  popupMenu: (id: string, x: number, y: number) =>
    ipcRenderer.send('menu:popup', { id, x, y }),
});
