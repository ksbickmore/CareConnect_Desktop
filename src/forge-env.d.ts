export {};

declare global {
  // Runtime-key shape used by the Vite base config to derive the magic
  // MAIN_WINDOW_VITE_* constant names per renderer.
  type VitePluginRuntimeKeys = {
    VITE_DEV_SERVER_URL: `${string}_VITE_DEV_SERVER_URL`;
    VITE_NAME: `${string}_VITE_NAME`;
  };

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Process {
      // The Vite plugin tracks the renderer dev servers here.
      viteDevServers: Record<string, import('vite').ViteDevServer>;
    }
  }

  // Injected by @electron-forge/plugin-vite for the `main_window` renderer.
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  const MAIN_WINDOW_VITE_NAME: string;
}

// electron-squirrel-startup ships no types; it default-exports a boolean.
declare module 'electron-squirrel-startup' {
  const started: boolean;
  export default started;
}
