import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('@tiptap') || id.includes('lowlight') || id.includes('prosemirror')) {
            return 'vendor-editor'
          }
          if (id.includes('framer-motion') || id.includes('@dnd-kit') || id.includes('lucide-react')) {
            return 'vendor-ui'
          }
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdf'
          }
          if (id.includes('node_modules/mammoth') || id.includes('node_modules/docx')) {
            return 'vendor-docx'
          }
          if (id.includes('node_modules/zustand') || id.includes('node_modules/dexie')) {
            return 'vendor-state'
          }
        },
      },
    },
  },
})
