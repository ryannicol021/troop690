import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-root-images',
      closeBundle() {
        cpSync(
          resolve(__dirname, 'images'),
          resolve(__dirname, 'dist/images'),
          { recursive: true }
        );
      },
    },
  ],
});
