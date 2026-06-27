# CareConnect Desktop

An Electron desktop implementation of the CareConnect application (carpal
tunnel care focus), ported incrementally from the
[CareConnect Expo mobile app](../careconnect_expo). Built with
**Electron + React + TypeScript + Vite**, using the official
[Electron Forge](https://www.electronforge.io/) toolchain (`@electron-forge/plugin-vite`)
for dev, packaging, and release builds.

The design follows the desktop Figma in [`.figma/`](.figma) and the
accessibility requirements in [`docs/`](docs) — every primary action is
operable by keyboard alone.

## Screens

This phase implements three generally-functional screens:

| Screen | Notes |
| --- | --- |
| **Login** | Pre-filled demo credentials (`demo@careconnect.app` / `demo1234`). "Sign In" or "Continue as Guest" both enter the app. |
| **Dashboard** | Greeting, three stat cards, a **live** "Next Medication" banner (Confirm taken updates state), plus schedule and messages widgets (static mock data). |
| **Medications** | Two-column master–detail. Live medication list grouped into Today / Completed, an All/Due/Taken filter, and a detail panel with schedule, refill, adherence, and prescriber. "Confirm taken" moves a medication to Completed. |

Only **Medications** is wired to live state (a Zustand store + in-memory
repository ported from the mobile app). The dashboard's secondary widgets
render from static mock data.

## Setup

Requires Node.js 18+ and npm.

```powershell
npm install
```

## Running locally

```powershell
npm start        # launch the app with hot reload (electron-forge start)
npm run dev      # alias for npm start
```

Other scripts:

```powershell
npm run typecheck  # tsc --noEmit
```

## Building a release package

Packaging uses Electron Forge **makers**. Output lands in `out/`
(git-ignored).

```powershell
npm run package  # bundle the app to out/CareConnect-win32-x64/ (no installer)
npm run make     # build the Windows distributables (see below)
```

`npm run make` produces, under `out/make/`:

| Maker | Artifact | Notes |
| --- | --- | --- |
| **Squirrel** | `squirrel.windows/x64/CareConnect Setup.exe` | Installs to the user profile (`%LocalAppData%`), no admin prompt, auto-update ready. Also emits `RELEASES` + a `.nupkg` for update feeds. |
| **ZIP** | `zip/win32/x64/CareConnect-win32-x64-1.0.0.zip` | Portable, zipped copy of the packaged app. |

Notes:
- **Icon:** without a custom icon the build ships the default Electron icon.
  Add a 256×256 `.ico` and point `packagerConfig.icon` at it in
  [`forge.config.ts`](forge.config.ts).
- **Code signing:** unsigned Windows builds trigger SmartScreen warnings on
  other machines. Fine for internal/coursework use; configure signing for
  public distribution.
- The packaged binary is hardened via Electron
  [fuses](https://www.electronjs.org/docs/latest/tutorial/fuses) (see the
  `FusesPlugin` block in `forge.config.ts`).

## Keyboard shortcuts

Accessibility is a hard requirement — all nav items and buttons are
focusable with a visible focus ring, and the active nav item exposes
`aria-current`.

| Key | Action |
| --- | --- |
| `1` | Go to Dashboard |
| `2` | Go to Medications |
| `Tab` / `Shift+Tab` | Move focus between controls |
| `Enter` / `Space` | Activate the focused control |

Number shortcuts are ignored while typing in a text field.

## Menu bar

The app shows a **single** menu bar: the styled teal strip rendered by
[`MenuBar.tsx`](src/components/MenuBar.tsx). The OS-level Electron menu bar is
hidden (`autoHideMenuBar`), but a real application `Menu` stays registered so
standard accelerators (copy/paste, devtools, quit) still work.

Each `File / Edit / View / Help` button pops the corresponding native Electron
submenu up beneath itself, over the `menu:popup` IPC channel exposed by the
preload bridge (`window.careconnect.popupMenu`). The buttons are native
`<button>`s, so the menus are fully keyboard-operable: Tab to focus, Enter or
Space to open, arrow keys to navigate, Esc to close.

## Project structure

```
electron/            Electron main + preload (CommonJS output)
  main.ts            BrowserWindow, app lifecycle, menu + popup IPC
  preload.ts         contextBridge: platform + popupMenu over IPC
src/
  main.tsx           React entry
  App.tsx            HashRouter + routes
  theme/tokens.css   Design tokens (color/spacing/radius) from Figma
  index.css          Global styles, DM Sans, focus rings
  models/types.ts    Shared data models (ported from mobile)
  stores/            Zustand stores: auth, medications, async helpers
  data/              In-memory medications repository + dashboard mock data
  components/        AppShell, MenuBar, Sidebar, Toolbar, Button, StatusBadge
  screens/           LoginScreen, DashboardScreen, MedicationsScreen
  forge-env.d.ts     Ambient types for Forge's injected Vite globals
forge.config.ts            Electron Forge config (makers, Vite plugin, fuses)
vite.base.config.ts        Shared Vite helpers (define keys, hot reload)
vite.main.config.ts        Vite config for the main process bundle
vite.preload.config.ts     Vite config for the preload bundle
vite.renderer.config.ts    Vite config for the renderer (React + @ alias)
```

## Tech notes

- **Routing:** `HashRouter`, so routes resolve under `file://` in packaged
  builds.
- **State:** Zustand stores and the in-memory repository are ported nearly
  verbatim from the mobile app (no React Native dependencies).
- **Fonts:** DM Sans is bundled via `@fontsource/dm-sans` (works offline).
- **Icons:** `lucide-react`.
