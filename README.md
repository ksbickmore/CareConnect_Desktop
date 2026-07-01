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

All screens are fully functional and wired to live state (Zustand stores +
repositories ported from the mobile app), with data persisted to
`localStorage` so it survives restarts.

| Screen | Notes |
| --- | --- |
| **Login** | Pre-filled demo credentials (`demo@careconnect.app` / `demo1234`). "Sign In" or "Continue as Guest" both enter the app. |
| **Dashboard** | Greeting, **live** stat cards (meds taken, latest pain/sleep), a **two-tap** "Next Medication" banner, live Today's Schedule and Messages widgets, and a persistent voice command bar. |
| **Medications** | Two-column master–detail. Grouped Today / Completed list with an All/Due/Taken filter and Up/Down arrow-key navigation. Detail panel with a **two-tap** "Confirm taken", Snooze, and a Voice note recorder. "Add medication" opens a focus-trapped dialog (voice-dictated name). |
| **Schedule** | Day/Week/Month calendar of appointments. Click a block to open a detail dialog with a **two-tap** "Set reminder". "New appointment" opens an add dialog (title dictation + date/time). |
| **Messages** | Split-pane chat: keyboard-navigable conversation list + thread with a voice-first composer (dictate or type) and a "read aloud" (text-to-speech) button on incoming messages. |
| **Health Log** | Big `[ − ] value [ + ]` step controls for pain/sleep (no sliders), mood chips, voice/manual note entry, a paginated "Recent Entries" history, and "Export log" to a text file. |
| **Emergency (SOS)** | Two oversized stacked targets (911 + primary caregiver), each armed with a **two-tap** sequence and a keyboard-focused countdown cancel bar before "connecting". Reachable from the sidebar and the global `Ctrl+Shift+E` shortcut. |
| **Profile** | Account details and the app's **Sign Out** action; reached from the sidebar profile chip. |

### Accessibility features (per [`docs/`](docs))

- **Voice-first (C1):** the dashboard voice command bar and every dictation
  field use the browser **Web Speech API** (Electron's Chromium). Voice
  degrades gracefully to keyboard/typed entry when unavailable.
- **No sustained gestures (C3):** critical actions (log taken, set reminder,
  emergency call) use an explicit **two-tap confirm**; history uses **manual
  pagination**, never infinite scroll.
- **Screen-reader support:** polite/assertive `aria-live` regions announce
  state changes; dialogs trap focus and restore it to the trigger on close;
  focus moves to each page's `<h1>` on navigation.

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
npm run clean      # remove build output (.vite/ and out/)
```

## Building a release package

Packaging uses Electron Forge **makers**. Output lands in `out/`
(git-ignored).

```powershell
npm run package  # bundle the app to out/CareConnect-win32-x64/ (no installer)
npm run make     # build the Windows distributables (see below)
```

Both `package` and `make` auto-run `npm run clean` first (via the
`prepackage` / `premake` hooks), so every build starts from a clean
`.vite/` and `out/`.

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
| `1` … `5` | Dashboard / Medications / Schedule / Messages / Health Log |
| `Ctrl+N` | New record |
| `Ctrl+Shift+E` | Emergency (SOS) |
| `Ctrl+Space` | Focus / toggle the voice command bar |
| `F1` or `?` | Keyboard shortcut reference |
| `Tab` / `Shift+Tab` | Move focus between controls |
| `Enter` / `Space` | Activate the focused control |
| `Esc` | Close the top dialog / menu |

Number shortcuts and `F1`/`?` are ignored while typing in a text field;
`Ctrl+Shift+E` works everywhere. Press `F1` or `?` any time to see the full
reference overlay.

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

The **File** menu (New Record, Emergency) and **Help** menu (Keyboard
Shortcuts) carry real accelerators; the main process forwards their clicks —
and the `Ctrl+Shift+E` / `Ctrl+N` / `F1` accelerators — to the renderer over a
`menu:action` IPC channel (`window.careconnect.onMenuAction`).

## Project structure

```
electron/            Electron main + preload (CommonJS output)
  main.ts            BrowserWindow, app lifecycle, menu + popup/action IPC
  preload.ts         contextBridge: platform, popupMenu, onMenuAction
src/
  main.tsx           React entry
  App.tsx            HashRouter + routes; loads async stores on startup
  theme/tokens.css   Design tokens (color/spacing/radius) from Figma
  index.css          Global styles, DM Sans, focus rings
  models/types.ts    Shared data models (ported from mobile)
  lib/               format helpers, voice-commands, speech/ (Web Speech API)
  stores/            Zustand stores: auth, medications, appointments, messages,
                     health-log, contacts, voice-notes, announcer, async helper
  data/              Repositories (medications, appointments, health-log,
                     contacts, messages) + localStorage persistence (storage.ts)
  components/        AppShell, MenuBar, Sidebar, Toolbar, Button, StatusBadge,
                     Dialog, TwoTapConfirm, StepControl, PaginatedList,
                     ConnectingOverlay, VoiceInputBar, RecordingRadar,
                     LiveRegion, KeyboardShortcutsOverlay
  screens/           Login, Dashboard, Medications, Appointments (Schedule),
                     Messages, HealthLog, Emergency, Profile
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
- **State:** Zustand stores and repositories are ported nearly verbatim from
  the mobile app (no React Native dependencies). Each repository hydrates from
  `localStorage` on first use and persists on every mutation, so added meds,
  appointments, health-log entries, contacts, and sent messages survive
  restarts. Clearing the app's `localStorage` resets everything to seed data.
- **Voice:** the `src/lib/speech/` wrapper isolates the Web Speech API behind a
  small interface; the rest of the app depends only on the `useSpeechRecognition`
  hook, and everything degrades safely when speech is unavailable.
- **Fonts:** DM Sans is bundled via `@fontsource/dm-sans` (works offline).
- **Icons:** `lucide-react`.
