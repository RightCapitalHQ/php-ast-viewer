import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'out/webview',
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'src/webview/app.tsx')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    minify: 'esbuild',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/webview'),
      '@components': path.resolve(__dirname, './src/webview/components'),
      '@utils': path.resolve(__dirname, './src/webview/utils')
    }
  }
});