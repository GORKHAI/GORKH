import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const rootDir = dirname(fileURLToPath(import.meta.url));
const checkedInVersion = readFileSync(resolve(rootDir, '../../VERSION'), 'utf8').trim();

if (!checkedInVersion) {
  throw new Error('VERSION file is empty. Desktop builds require a checked-in version.');
}

export default defineConfig(async () => ({
  plugins: [
    react(),
    nodePolyfills({
      include: ['assert', 'buffer', 'crypto', 'events', 'process', 'stream', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  clearScreen: false,
  define: {
    __GORKH_DESKTOP_VERSION__: JSON.stringify(checkedInVersion),
  },
  resolve: {
    alias: {
      vm: resolve(rootDir, 'src/lib/browser-shims/vm.ts'),
      'node:vm': resolve(rootDir, 'src/lib/browser-shims/vm.ts'),
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@cloak.dev') || id.includes('circomlibjs') || id.includes('ffjavascript')) {
            return 'cloak-sdk';
          }
          if (id.includes('@solana')) return 'solana';
          if (id.includes('vite-plugin-node-polyfills') || id.includes('node-stdlib-browser')) {
            return 'node-polyfills';
          }
          if (id.includes('react') || id.includes('scheduler')) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
}));
