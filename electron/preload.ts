import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

type MenuAction =
  | 'shortcuts'
  | 'emergency'
  | 'new-record'
  | 'new-appointment'
  | 'find'
  | 'settings';

/**
 * Minimal, safe bridge. `popupMenu` lets the renderer's styled menu-bar
 * buttons trigger the real Electron submenus (the OS menu bar is hidden), and
 * `onMenuAction` delivers native menu / accelerator actions (Ctrl+Shift+E,
 * Help → Keyboard Shortcuts, File → New record) to the renderer. The renderer
 * feature-detects `window.careconnect`, which is absent in a plain browser.
 */
contextBridge.exposeInMainWorld('careconnect', {
  platform: process.platform,
  version: process.versions.electron,
  popupMenu: (id: string, x: number, y: number) =>
    ipcRenderer.send('menu:popup', { id, x, y }),
  onMenuAction: (callback: (action: MenuAction) => void) => {
    const handler = (_event: IpcRendererEvent, action: MenuAction) => callback(action);
    ipcRenderer.on('menu:action', handler);
    return () => ipcRenderer.removeListener('menu:action', handler);
  },
});
