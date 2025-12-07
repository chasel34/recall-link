import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    main: {
        build: {
            outDir: 'dist/main',
            rollupOptions: {
                input: {
                    index: 'src/main/index.ts',
                },
            },
        },
    },
    preload: {
        build: {
            outDir: 'dist/preload',
            rollupOptions: {
                input: {
                    index: 'src/preload/index.ts',
                },
            },
        },
    },
    renderer: {
        root: 'src/renderer',
        build: {
            outDir: 'dist/renderer',
            rollupOptions: {
                input: 'src/renderer/index.html',
            },
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src/renderer'),
            },
        },
        plugins: [react()],
    },
});
