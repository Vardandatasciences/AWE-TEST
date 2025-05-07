import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true,
    proxy: {
      // Proxy API requests to your backend server
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Add direct endpoint proxying for your existing routes
      '/groups': 'http://localhost:5000',
      '/message_descriptions': 'http://localhost:5000',
      '/messages': 'http://localhost:5000',
      '/add_message': 'http://localhost:5000',
      '/schedule_message': 'http://localhost:5000',
      '/custom_message': 'http://localhost:5000',
      '/recent_messages': 'http://localhost:5000',
      '/actors': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      },
      '/customers': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  // Configure to use public directory as is
  publicDir: 'public',
  build: {
    outDir: 'build',
  },
  // Add esbuild configuration to handle JSX in .js files
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis'
  }
}); 