import { defineConfig, mergeConfig } from 'vite';
import type { ConfigEnv, UserConfig } from 'vite';
import { getBuildConfig, builtins, pluginHotRestart } from './vite.base.config';

// Vite config for the Electron preload script.
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;

  const config: UserConfig = {
    build: {
      rollupOptions: {
        external: builtins,
        // Preload may pull in web assets, so use rollupOptions.input here.
        input: forgeConfigSelf.entry!,
        output: {
          format: 'cjs',
          inlineDynamicImports: true,
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
    plugins: [pluginHotRestart('reload')],
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
