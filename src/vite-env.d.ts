/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

interface CareConnectBridge {
  platform: string;
  version: string;
  /** Pop the named native submenu up at viewport coordinates (x, y). */
  popupMenu(id: string, x: number, y: number): void;
}

interface Window {
  /** Exposed by the Electron preload; undefined in a plain browser. */
  careconnect?: CareConnectBridge;
}
