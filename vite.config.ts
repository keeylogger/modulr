import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When deploying to GitHub Pages the app is served from /<repo>/.
// Locally (dev / preview) we serve from root. Override with BASE_PATH if needed.
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/modulr/' : '/');

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
