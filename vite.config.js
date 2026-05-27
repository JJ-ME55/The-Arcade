import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: false,
    },
    build: {
        outDir: 'dist',
        target: 'es2020',
        sourcemap: true,
    },
});
