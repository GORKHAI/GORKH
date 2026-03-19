import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = dirname(fileURLToPath(import.meta.url));
const checkedInVersion = readFileSync(resolve(rootDir, '../../VERSION'), 'utf8').trim();

if (!checkedInVersion) {
  throw new Error('VERSION file is empty. Desktop builds require a checked-in version.');
}

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  define: {
    __GORKH_DESKTOP_VERSION__: JSON.stringify(checkedInVersion),
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
}));
