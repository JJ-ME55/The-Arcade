import { defineConfig } from 'vite';

export default defineConfig({
  root: 'visual',
  build: {
    outDir: 'dist',     // -> visual/dist
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: false,
  },
  resolve: {
    alias: {
      'three/addons/': 'three/examples/jsm/',
    },
  },
});
