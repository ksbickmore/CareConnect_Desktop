import { defineConfig } from 'vite';
import type { ConfigEnv, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { pluginExposeRenderer } from './vite.base.config';

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
    },
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
      preserveSymlinks: true,
    },
    plugins: [pluginExposeRenderer(name), react()],
    clearScreen: false,
  } as UserConfig;
});
