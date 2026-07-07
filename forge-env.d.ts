/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
// Pulls in the MAIN_WINDOW_VITE_* magic constants and VitePluginRuntimeKeys
// declared by @electron-forge/plugin-vite, and adds what it leaves out.
// Global declaration file: no imports/exports, or the ambient module
// declaration below stops applying.

declare namespace NodeJS {
  interface Process {
    // The Vite plugin tracks the renderer dev servers here.
    viteDevServers: Record<string, import('vite').ViteDevServer>;
  }
}

// electron-squirrel-startup ships no types; it default-exports a boolean.
declare module 'electron-squirrel-startup' {
  const started: boolean;
  export default started;
}
