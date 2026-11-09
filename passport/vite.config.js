import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3002',
      '/socket.io': { target: 'http://localhost:3002', ws: true },
    },
  },
});
