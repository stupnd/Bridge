import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// App routes, so a static copy of the build can be opened at any of them.
const ROUTES = ['login', 'app', 'app/learn', 'app/glove', 'app/collect', 'app/lab', 'app/profile']

/** Capture builds only: writes dist/<route>/index.html so screenshots can open deep links without a server. */
function spaRouteFiles(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-route-files',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir) },
    closeBundle() {
      const html = fs.readFileSync(path.join(outDir, 'index.html'))
      for (const r of ROUTES) {
        fs.mkdirSync(path.join(outDir, r), { recursive: true })
        fs.writeFileSync(path.join(outDir, r, 'index.html'), html)
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    ...(mode === 'capture' ? [spaRouteFiles()] : []),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
}))
