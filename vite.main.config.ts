import { defineConfig, mergeConfig } from 'vite';
import type { ConfigEnv, UserConfig } from 'vite';
import {
  getBuildConfig,
  getBuildDefine,
  builtins,
  pluginHotRestart,
} from './vite.base.config';

// Vite config for the Electron main process.
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);

  const config: UserConfig = {
    build: {
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => '[name].js',
        formats: ['cjs'],
      },
      rollupOptions: {
        // Externalize only Electron/Node built-ins; bundle JS deps (e.g.
        // electron-squirrel-startup) so the packaged app needs no node_modules.
        external: builtins,
      },
    },
    plugins: [pluginHotRestart('restart')],
    define,
    resolve: {
      // Prefer Node-friendly entry points.
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
