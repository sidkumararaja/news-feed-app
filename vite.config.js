import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev, API requests are proxied to the local serverless emulator
// started by `npm run dev` (see scripts/dev.mjs). On Vercel, /api/* is
// served by the platform's serverless functions instead.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
