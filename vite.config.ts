import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/naics-api': {
        target: 'https://api.naics.us',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/naics-api/, ''),
      },
      '/census-geo-api': {
        target: 'https://geocoding.geo.census.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/census-geo-api/, ''),
      },
      '/census-naics-api': {
        target: 'https://www.census.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/census-naics-api/, ''),
      },
      '/fcc-api': {
        target: 'https://geo.fcc.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fcc-api/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
