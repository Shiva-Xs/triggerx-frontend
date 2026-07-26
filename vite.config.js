import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    dedupe: ['three', 'react', 'react-dom', '@react-three/fiber'],
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'vendor-three';
          if (id.includes('@react-three') || id.includes('postprocessing')) return 'vendor-r3f';
          if (id.includes('node_modules/react') || id.includes('react-router')) return 'vendor-react';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
