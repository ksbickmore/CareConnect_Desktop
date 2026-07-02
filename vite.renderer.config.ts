/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
import { defineConfig } from 'vite';
import type { ConfigEnv, Plugin, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { pluginExposeRenderer } from './vite.base.config';

const MODEL_MIME: Record<string, string> = {
  '.json': 'application/json',
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
};

/**
 * Dev-server twin of the app:// protocol's /models route in electron/main.ts:
 * serves the Whisper model files from ./models (populated by
 * scripts/fetch-models.mjs) so the renderer can fetch `/models/…` in dev.
 */
function pluginServeModels(): Plugin {
  return {
    name: 'careconnect-serve-models',
    configureServer(server) {
      const root = resolve(__dirname, 'models');
      server.middlewares.use('/models', (req, res, next) => {
        const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const filePath = normalize(join(root, urlPath));
        if (!filePath.startsWith(root + sep) || !existsSync(filePath)) {
          next();
          return;
        }
        res.setHeader(
          'Content-Type',
          MODEL_MIME[extname(filePath)] ?? 'application/octet-stream',
        );
        // onnxruntime-web loads these from worker threads with an opaque
        // origin; without CORP the COEP:require-corp isolation blocks the
        // response (net::ERR_BLOCKED_BY_RESPONSE) and model init hangs.
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Content-Length', statSync(filePath).size);
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

// Vite config for the renderer (React app).
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/renderer/${name}`,
      // The AudioWorklet module (pcm-worklet.js?url) must be emitted as a
      // real file: Vite inlines small ?url assets as data: URLs, which the
      // CSP (script-src 'self') blocks, breaking audioWorklet.addModule in
      // packaged builds only.
      assetsInlineLimit: (filePath) =>
        filePath.endsWith('pcm-worklet.js') ? false : undefined,
    },
    server: {
      // Cross-origin isolation enables SharedArrayBuffer so onnxruntime can
      // run Whisper multi-threaded (mirrors the app:// headers in prod).
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // The model binaries are large and fetched/copied at startup — watching
      // them is wasteful and races the fetch script (EBUSY on Windows).
      watch: { ignored: ['**/models/**'] },
    },
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
      preserveSymlinks: true,
    },
    plugins: [pluginExposeRenderer(name), react(), pluginServeModels()],
    clearScreen: false,
  } as UserConfig;
});
