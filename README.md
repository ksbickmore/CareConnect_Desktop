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
| **Dashboard** | Greeting, **live** stat cards (meds taken, latest pain/sleep), a **two-tap** "Next Medication" banner, and live Today's Schedule and Messages widgets. |
| **Medications** | Two-column master–detail. Grouped Today / Completed list with an All/Due/Taken filter and Up/Down arrow-key navigation. Detail panel with a **two-tap** "Confirm taken", Snooze, and a Voice note recorder. "Add medication" opens a focus-trapped dialog (voice-dictated name). |
| **Schedule** | Day/Week/Month calendar of appointments. Click a block to open a detail dialog with a **two-tap** "Set reminder". "New appointment" opens an add dialog (title dictation + date/time). |
| **Messages** | Split-pane chat: keyboard-navigable conversation list + thread with a voice-first composer (dictate or type) and a "read aloud" (text-to-speech) button on incoming messages. |
| **Health Log** | Big `[ − ] value [ + ]` step controls for pain/sleep (no sliders), mood chips, voice/manual note entry, a paginated "Recent Entries" history, and "Export log" to a text file. |
| **Emergency (SOS)** | Two oversized stacked targets (911 + primary caregiver), each armed with a **two-tap** sequence and a keyboard-focused countdown cancel bar before "connecting". Reachable from the sidebar and the global `Ctrl+Shift+E` shortcut. |
| **Profile** | Account details and the app's **Sign Out** action; reached from the sidebar profile chip. |

### Accessibility features (per [`docs/`](docs))

- **Voice-first (C1):** a persistent voice command bar (docked below every
  screen) toggles a **continuous listening session** with `Ctrl+Space` from
  anywhere — including inside modal dialogs. Utterances dispatch through
  contextual commands (dialog, then screen, then global), then navigation
  keywords, then a visible-button-name fallback, then dictation into a focused
  dialog text field. The bar executes screen actions (e.g. "next medication",
  "confirm taken" → "confirm", "add medication" → "name aspirin" → "save"),
  fills dialog forms by field name or focus walking, and falls back to
  pressing visible buttons by name. Say **"what can I say"** for available
  commands and **"stop listening"** to end the session. Dictation fields and
  the command bar use a **fully local Whisper speech-to-text engine**
  (transformers.js running `whisper-base.en` in a Web Worker — no cloud calls,
  works offline). Voice degrades gracefully to keyboard/typed entry when
  unavailable.
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

The first `npm start` / `npm run package` also populates `models/`
(git-ignored) via `scripts/fetch-models.mjs`: it downloads the quantized
`whisper-base.en` speech model (~80 MB) from the Hugging Face hub once and
copies the matching onnxruntime-web WASM runtime out of `node_modules`.
After that everything runs fully offline. Run `npm run models` to refresh
it manually (required after upgrading `@huggingface/transformers`, so the
WASM runtime stays version-matched).

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

## Testing

The renderer is tested with **Jest** + **React Testing Library**
(`jest-environment-jsdom`, `ts-jest`). Coverage is enforced at **≥ 60%
statements/lines** via `coverageThreshold` (currently ~85% statements).

```powershell
npm test               # run the full suite
npm run test:watch     # watch mode
npm run test:coverage  # run with coverage (report in coverage/lcov-report/)
```

What's covered:

- **Keyboard navigation (integration):**
  [`AppShell.test.tsx`](src/components/AppShell.test.tsx) mounts the real
  route tree in a `MemoryRouter` and drives the global shortcuts — `1`–`5`
  navigation, `F1`/`?` overlay toggle, `Ctrl+Shift+E` (including while
  typing), `Ctrl+Space` voice bar, typing/modifier suppression, focus moving
  to each page's `<h1>`, and the native menu-action bridge.
- **Components:** Dialog focus trap (Tab wrap, Esc, focus restore),
  TwoTapConfirm (arm/confirm/auto-disarm/blur, fake timers), MenuBar
  (keyboard activation + `popupMenu` bridge), StepControl (spinbutton
  semantics, arrow keys, clamping).
- **Screens:** Login, Dashboard (voice command wiring against a scriptable
  fake of the speech module), Medications (arrow-key ledger, filters,
  two-tap taken, add-dialog validation), Emergency (two-tap + 5s countdown
  with fake timers), Health Log (steppers, mood chips, save, export),
  Messages (search, send, read-aloud via a `speechSynthesis` mock).
- **Units:** formatters, voice-command parser, `localStorage` persistence,
  `Async`/`guard` wrapper, repositories, and all Zustand stores (with
  injected test repositories).
- **Voice commands:** unit suites in [`src/lib/voice/`](src/lib/voice/)
  (matcher, registry, DOM actions) plus per-screen voice integration tests
  (Dashboard, Medications, Schedule, Messages, Health Log, Emergency) and
  AppShell/Dialog/TwoTapConfirm voice wiring.

Test plumbing lives in [`src/test-utils/`](src/test-utils): a global setup
file (jsdom gap-fills for `speechSynthesis`/`URL.createObjectURL`, per-test
store + `localStorage` resets), an opt-in mock for the `window.careconnect`
preload bridge, and a scriptable fake of the speech module
(`fake-speech.ts`) for voice-flow tests. Electron's main/preload processes are
outside Jest's scope (they need the Electron runtime); their renderer-side
consumers are tested against the mocked bridge.

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
| `Ctrl+Space` | Toggle continuous voice commands (works on any screen and in dialogs) |
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
  App.tsx            HashRouter + AppRoutes (route tree; loads async stores)
  test-utils/        Jest setup (setup-tests.ts), render helpers, opt-in mocks
  theme/tokens.css   Design tokens (color/spacing/radius) from Figma
  index.css          Global styles, DM Sans, focus rings
  models/types.ts    Shared data models (ported from mobile)
  lib/               format helpers, voice-commands, speech/ (local Whisper
                     engine: mic capture + VAD + Web Worker transcriber)
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

- **Routing:** `HashRouter`, so routes resolve without a server — packaged
  builds are served over the custom `app://` protocol.
- **State:** Zustand stores and repositories are ported nearly verbatim from
  the mobile app (no React Native dependencies). Each repository hydrates from
  `localStorage` on first use and persists on every mutation, so added meds,
  appointments, health-log entries, contacts, and sent messages survive
  restarts. Clearing the app's `localStorage` resets everything to seed data.
- **Voice:** speech-to-text is a **local Whisper engine**
  (`src/lib/speech/whisper/`): `getUserMedia` → 16 kHz AudioWorklet capture →
  RMS-energy VAD segmentation → transformers.js `whisper-base.en` (quantized
  ONNX) decoding in a Web Worker. The rest of the app depends only on the
  `useSpeechRecognition` hook, and everything degrades safely when speech is
  unavailable. The packaged renderer is served over a custom `app://`
  protocol (instead of `file://`) with cross-origin-isolation headers so the
  worker can fetch the model and run multi-threaded WASM; the same
  `/models/` route is provided by Vite middleware in dev.
- **Fonts:** DM Sans is bundled via `@fontsource/dm-sans` (works offline).
- **Icons:** `lucide-react`.
