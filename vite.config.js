import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/dyndnsupdater/', // production server path (lowercase, case-sensitive)
  resolve: {
    alias: {
      // Path aliases for cleaner imports
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  server: {
    proxy: {
      // Proxy for DynDNS update requests
      '/nic/update': {
        target: 'http://members.dyndns.org',
        changeOrigin: true,
      },
    },
  },
});