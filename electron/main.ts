import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { join } from 'node:path';

const GITHUB_URL = 'https://github.com/ksbickmore/CareConnect_Desktop';

const helpItem: Electron.MenuItemConstructorOptions = {
  label: 'CareConnect on GitHub',
  click: () => void shell.openExternal(GITHUB_URL),
};

/**
 * The renderer renders its own dark menu-bar strip to match the Figma
 * desktop chrome. We still register a real application Menu so standard
 * keyboard shortcuts (copy/paste, devtools, quit) keep working, even
 * though the OS menu bar itself is hidden (see createWindow).
 */
function buildAppMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{ role: 'appMenu' as const }]
      : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'help', submenu: [helpItem] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Top-level submenus, built from their contents directly (not wrapped in a
 * parent label) so the renderer's styled menu-bar buttons can pop the real
 * Electron menu up beneath them via the `menu:popup` IPC channel.
 */
function buildPopupMenus(): Record<string, Electron.Menu> {
  const isMac = process.platform === 'darwin';
  const file: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'close' as const }] : []),
    { role: 'quit' },
  ];
  const edit: Electron.MenuItemConstructorOptions[] = [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'selectAll' },
  ];
  const view: Electron.MenuItemConstructorOptions[] = [
    { role: 'reload' },
    { role: 'forceReload' },
    { role: 'toggleDevTools' },
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  ];
  return {
    file: Menu.buildFromTemplate(file),
    edit: Menu.buildFromTemplate(edit),
    view: Menu.buildFromTemplate(view),
    help: Menu.buildFromTemplate([helpItem]),
  };
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#F1EFE8',
    show: false,
    // Hide the OS menu bar; the renderer draws its own styled strip and
    // pops these menus up via IPC. The application Menu stays registered so
    // accelerators (copy/paste, devtools, quit) keep working.
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);

  win.once('ready-to-show', () => win.show());

  // Open external links in the system browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // electron-vite injects the dev server URL in development; production
  // loads the built renderer from disk.
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  buildAppMenu();

  const popupMenus = buildPopupMenus();
  ipcMain.on('menu:popup', (event, payload: { id: string; x: number; y: number }) => {
    const menu = popupMenus[payload.id];
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!menu || !window) return;
    menu.popup({
      window,
      x: Math.round(payload.x),
      y: Math.round(payload.y),
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
