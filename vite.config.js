import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The entry stylesheet is the single render-blocking resource on the landing
// page and it gates first paint. Nothing in the served HTML needs it — the
// splash screen is fully inline-styled — so it is loaded at preload priority
// instead of blocking. main.jsx will not mount React until it has applied,
// which is what keeps this from turning into a flash of unstyled content.
function asyncEntryStylesheet() {
  return {
    name: 'async-entry-stylesheet',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g,
        (_m, pre, href, post) =>
          `<link rel="preload" as="style"${pre}href="${href}"${post} onload="this.onload=null;this.rel='stylesheet';document.documentElement.dataset.cssReady='1'">` +
          `<noscript><link rel="stylesheet"${pre}href="${href}"${post}></noscript>`,
      )
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    asyncEntryStylesheet(),
  ],
  resolve: {
    dedupe: ['three', 'react', 'react-dom', '@react-three/fiber'],
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    // No manualChunks: the hand-rolled grouping hoisted React into the same
    // chunk as three/r3f, so *every* chunk (even GrainLayer) statically pulled
    // in ~1 MB of 3D code. Automatic splitting keeps everything reachable only
    // through the lazy import() of HeroScene in its own async chunk.
    rollupOptions: {},
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
