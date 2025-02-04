import { defineConfig } from 'vite'; // ^4.3.9
import react from '@vitejs/plugin-react'; // ^4.0.0
import path from 'path';
import checker from 'vite-plugin-checker'; // ^0.6.0
import compression from 'vite-plugin-compression'; // ^0.5.1

// Production-grade Vite configuration for React application
export default defineConfig({
  plugins: [
    // React plugin configuration with Fast Refresh and TypeScript optimization
    react({
      fastRefresh: true,
      babel: {
        plugins: [
          ['@babel/plugin-transform-typescript', { isTSX: true }]
        ]
      }
    }),
    // TypeScript type checking during development
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
      },
      overlay: true,
    }),
    // Production asset compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 10KB
      deleteOriginFile: false,
    })
  ],

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    cors: true,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          components: ['@mui/material'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  // Module resolution configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },

  // CSS processing configuration
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "src/styles/variables.scss";',
        javascriptEnabled: true,
      },
    },
    modules: {
      localsConvention: 'camelCase',
    },
    devSourcemap: true,
  },

  // Testing environment configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/'],
    },
  },

  // Dependency optimization settings
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material'],
    exclude: ['@testing-library/react'],
  },

  // Environment variables configuration
  envPrefix: 'VITE_',
  envDir: './env',

  // Preview server configuration for production builds
  preview: {
    port: 3000,
    host: true,
    strictPort: true,
  },

  // Performance optimization settings
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'es2020',
  },
});