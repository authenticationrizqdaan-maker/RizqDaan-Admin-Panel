
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.IS_ADMIN_APP': JSON.stringify(process.env.IS_ADMIN_APP || 'false')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
