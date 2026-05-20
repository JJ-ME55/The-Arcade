import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react({
      // Lifted game code (src/games/**/*.js) contains JSX in .js files.
      // CRA auto-detects this; Vite + @vitejs/plugin-react does not by
      // default. Including .js in the plugin's match pattern + setting
      // esbuild to treat .js as JSX makes the lift work without
      // renaming every file to .jsx.
      include: ['**/*.{jsx,tsx,js,ts}'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  esbuild: {
    // Tell esbuild to parse .js files in src/ as JSX. Required for the
    // lifted game wrappers (BasketballScreen.js, KeepieUppiesScreen.js,
    // hud.js) that contain JSX without .jsx extension.
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
});
