import { contextBridge } from 'electron';

/**
 * Minimal, safe bridge. Nothing from Node is exposed to the renderer yet;
 * this is a placeholder for future IPC (e.g. real persistence or native
 * notifications). Keeping it here means the renderer can feature-detect
 * `window.careconnect` without us widening the surface prematurely.
 */
contextBridge.exposeInMainWorld('careconnect', {
  platform: process.platform,
  version: process.versions.electron,
});
