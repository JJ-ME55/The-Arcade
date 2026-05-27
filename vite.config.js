import { defineConfig } from 'vite';

export default defineConfig({
  root: 'visual',
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
