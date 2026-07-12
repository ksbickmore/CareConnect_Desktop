import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  shell,
} from 'electron';
import { join, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';
import { loadWindowState, trackWindowState } from './window-state';

// Squirrel runs the app with special flags while creating/removing shortcuts
// during install and uninstall; quit immediately in that case.
if (started) {
  app.quit();
}

/**
 * The packaged renderer is served over app:// instead of file:// so that
 * fetch() and dynamic import() work for the local Whisper speech model
 * (file:// blocks both). Must be registered before app is ready.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

/**
 * Cross-origin isolation lets onnxruntime use SharedArrayBuffer and threads,
 * which speeds up Whisper transcription considerably. Everything the app
 * loads is same-origin, so require-corp is safe.
 */
const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  // Required so onnxruntime-web's nested worker scripts (loaded from
  // /models/ort/) pass the require-corp embedding check above.
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

/** Serve a local file, refusing paths that escape the root directory. */
function serveFrom(root: string, urlPath: string): Promise<Response> {
  const filePath = normalize(join(root, decodeURIComponent(urlPath)));
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    return Promise.resolve(new Response('Forbidden', { status: 403 }));
  }
  return net
    .fetch(pathToFileURL(filePath).toString())
    .then(
      (res) =>
        new Response(res.body, {
          status: res.status,
          headers: { ...Object.fromEntries(res.headers), ...ISOLATION_HEADERS },
        }),
    );
}

/**
 * app://bundle/… → built renderer files; app://bundle/models/… → the Whisper
 * model directory shipped via `extraResource` (repo `models/` in dev).
 */
function registerAppProtocol(): void {
  const rendererRoot = join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}`);
  const modelsRoot = app.isPackaged
    ? join(process.resourcesPath, 'models')
    : join(app.getAppPath(), 'models');

  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/models/')) {
      return serveFrom(modelsRoot, pathname.slice('/models'.length));
    }
    return serveFrom(rendererRoot, pathname === '/' ? '/index.html' : pathname);
  });
}

/** Grant only what the renderer legitimately needs (mic for voice input). */
function restrictPermissions(): void {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === 'media' || permission === 'fullscreen');
    },
  );
}

const GITHUB_URL = 'https://github.com/ksbickmore/CareConnect_Desktop';

type MenuAction =
  | 'shortcuts'
  | 'emergency'
  | 'new-record'
  | 'new-appointment'
  | 'find'
  | 'settings';

/** Forward a menu/accelerator action to the focused renderer. */
function sendAction(action: MenuAction): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  win?.webContents.send('menu:action', action);
}

const helpItem: Electron.MenuItemConstructorOptions = {
  label: 'CareConnect on GitHub',
  click: () => void shell.openExternal(GITHUB_URL),
};

const shortcutsItem: Electron.MenuItemConstructorOptions = {
  label: 'Keyboard Shortcuts',
  accelerator: 'F1',
  click: () => sendAction('shortcuts'),
};

const newRecordItem: Electron.MenuItemConstructorOptions = {
  label: 'New Record',
  accelerator: 'CmdOrCtrl+N',
  click: () => sendAction('new-record'),
};

const newAppointmentItem: Electron.MenuItemConstructorOptions = {
  label: 'New Appointment',
  accelerator: 'CmdOrCtrl+Shift+N',
  click: () => sendAction('new-appointment'),
};

const emergencyItem: Electron.MenuItemConstructorOptions = {
  label: 'Emergency (SOS)',
  accelerator: 'CmdOrCtrl+Shift+E',
  click: () => sendAction('emergency'),
};

const findItem: Electron.MenuItemConstructorOptions = {
  label: 'Find',
  accelerator: 'CmdOrCtrl+F',
  click: () => sendAction('find'),
};

const settingsItem: Electron.MenuItemConstructorOptions = {
  label: 'Settings',
  accelerator: 'CmdOrCtrl+,',
  click: () => sendAction('settings'),
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
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        newRecordItem,
        newAppointmentItem,
        { type: 'separator' },
        emergencyItem,
        { type: 'separator' },
        settingsItem,
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        findItem,
        { type: 'separator' },
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    { role: 'viewMenu' },
    { role: 'help', submenu: [shortcutsItem, { type: 'separator' }, helpItem] },
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
    newRecordItem,
    newAppointmentItem,
    emergencyItem,
    { type: 'separator' },
    settingsItem,
    { type: 'separator' },
    ...(isMac ? [{ role: 'close' as const }] : []),
    { role: 'quit' },
  ];
  const edit: Electron.MenuItemConstructorOptions[] = [
    findItem,
    { type: 'separator' },
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
    help: Menu.buildFromTemplate([shortcutsItem, { type: 'separator' }, helpItem]),
  };
}

function createWindow(): void {
  // Restore the bounds from the previous session; sanitized against the
  // current displays so an unplugged monitor can't strand the window.
  const state = loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#F1EFE8',
    show: false,
    // Hide the OS menu bar; the renderer draws its own styled strip and
    // pops these menus up via IPC. The application Menu stays registered so
    // accelerators (copy/paste, devtools, quit) keep working.
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  trackWindowState(win);

  win.once('ready-to-show', () => {
    // Maximize while still hidden so the window doesn't flash at its normal
    // bounds before snapping to maximized.
    if (state.isMaximized) win.maximize();
    win.show();
  });

  // Open external links in the system browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // The Forge Vite plugin injects the dev server URL in development; in
  // production the built renderer is served over app:// (see
  // registerAppProtocol) so the speech model can be fetched.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void win.loadURL('app://bundle/index.html');
  }
}

void app.whenReady().then(() => {
  registerAppProtocol();
  restrictPermissions();
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
