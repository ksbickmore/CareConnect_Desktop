/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

/** Menu / accelerator actions forwarded from the Electron main process. */
type MenuAction = 'shortcuts' | 'emergency' | 'new-record';

interface CareConnectBridge {
  platform: string;
  version: string;
  /** Pop the named native submenu up at viewport coordinates (x, y). */
  popupMenu(id: string, x: number, y: number): void;
  /** Subscribe to native menu/accelerator actions. Returns an unsubscribe fn. */
  onMenuAction(callback: (action: MenuAction) => void): () => void;
}

interface Window {
  /** Exposed by the Electron preload; undefined in a plain browser. */
  careconnect?: CareConnectBridge;
}
