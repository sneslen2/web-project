import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the app works when served from a repo subpath
  // (https://<user>.github.io/<repo>/) on GitHub Pages.
  base: './',
  build: {
    // Emit the production build to docs/ so GitHub Pages can serve it
    // from the main branch /docs folder.
    outDir: 'docs',
  },
})
