import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import { existsSync, readFileSync, unlinkSync } from "fs"
import { timingSafeEqual } from "crypto"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const bootstrapPath = resolve(__dirname, '.queryrecon-local/bootstrap.json')

function oneTimeSetup() {
  return {
    name: 'queryrecon-one-time-setup',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: any, res: any) => void) => void } }) {
      server.middlewares.use('/__queryrecon/bootstrap', (req, res) => {
        const remote = req.socket.remoteAddress || ''
        if (req.method !== 'GET' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) || !existsSync(bootstrapPath)) {
          res.statusCode = 404
          return res.end()
        }
        try {
          const payload = JSON.parse(readFileSync(bootstrapPath, 'utf8'))
          const supplied = Buffer.from(new URL(req.url, 'http://localhost').searchParams.get('token') || '')
          const expected = Buffer.from(String(payload.token || ''))
          if (!supplied.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
            res.statusCode = 403
            return res.end()
          }
          unlinkSync(bootstrapPath)
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        } catch {
          res.statusCode = 500
          res.end()
        }
      })
    },
  }
}

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    open: true,
  },
  plugins: [
    oneTimeSetup(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/zustand') || id.includes('node_modules/dexie')) {
            return 'vendor-store';
          }
        }
      }
    }
  }
})
