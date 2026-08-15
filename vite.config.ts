import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "fs"
import { timingSafeEqual } from "crypto"
import { homedir } from "os"
import { execFile } from "child_process"
import { promisify } from "util"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const bootstrapPath = resolve(__dirname, '.queryrecon-local/bootstrap.json')
const localAddresses = ['127.0.0.1', '::1', '::ffff:127.0.0.1']
const execFileAsync = promisify(execFile)

export function mergeLocalEnv(source: string, values: Record<string, string>) {
  const remaining = new Map(Object.entries(values))
  const lines = source.split(/\r?\n/).filter((line, index, all) => line || index < all.length - 1).map(line => {
    const name = line.match(/^([A-Z0-9_]+)=/)?.[1]
    if (!name || !remaining.has(name)) return line
    const value = remaining.get(name)!
    remaining.delete(name)
    return `${name}=${value}`
  })
  for (const [name, value] of remaining) lines.push(`${name}=${value}`)
  return `${lines.join('\n')}\n`
}

export function isValidBedrockConfig(key: string, region: string) {
  return key.length >= 20 && key.length <= 4096 && !/[\r\n\0]/.test(key)
    && region.length <= 64 && /^[a-z]{2}(?:-[a-z0-9]+)+-\d$/.test(region)
}

function hermesEnvPath() {
  const home = process.env.HERMES_HOME || (process.platform === 'win32'
    ? resolve(process.env.LOCALAPPDATA || homedir(), 'hermes')
    : resolve(homedir(), '.hermes'))
  return resolve(home, '.env')
}

async function readJsonBody(req: any) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 8192) throw new Error('Request is too large.')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function localHermesOrigin(value: string) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Hermes must use a localhost endpoint.')
  }
  return url.origin
}

async function restartHermes() {
  if (process.platform === 'win32') {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
      resolve(__dirname, 'scripts/repair-hermes-workspace.ps1'),
    ], { cwd: __dirname, windowsHide: true, timeout: 120_000 })
    return
  }
  await execFileAsync('hermes', ['gateway', 'restart'], { cwd: __dirname, timeout: 120_000 })
}

function oneTimeSetup() {
  return {
    name: 'queryrecon-one-time-setup',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: any, res: any) => void) => void } }) {
      server.middlewares.use('/__queryrecon/bootstrap', (req, res) => {
        const remote = req.socket.remoteAddress || ''
        if (req.method !== 'GET' || !localAddresses.includes(remote) || !existsSync(bootstrapPath)) {
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
      server.middlewares.use('/__queryrecon/hermes/bedrock', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', 'application/json')
        const remote = req.socket.remoteAddress || ''
        if (req.method !== 'POST' || !localAddresses.includes(remote)) {
          res.statusCode = 404
          return res.end(JSON.stringify({ error: 'Not found.' }))
        }

        try {
          const body = await readJsonBody(req)
          const gatewayKey = String(body.gatewayKey || '').trim()
          const bedrockKey = String(body.bedrockKey || '').trim()
          const region = String(body.region || '').trim().toLowerCase()
          const endpoint = localHermesOrigin(String(body.endpoint || ''))
          if (!gatewayKey || !isValidBedrockConfig(bedrockKey, region)) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Enter a valid Hermes key, Bedrock long-term key, and AWS region.' }))
          }

          const health = await fetch(`${endpoint}/health/detailed`, {
            headers: { Authorization: `Bearer ${gatewayKey}` },
            signal: AbortSignal.timeout(5_000),
          })
          if (!health.ok) {
            res.statusCode = 401
            return res.end(JSON.stringify({ error: 'Hermes rejected the gateway API key.' }))
          }

          const envPath = hermesEnvPath()
          mkdirSync(dirname(envPath), { recursive: true })
          const updated = mergeLocalEnv(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '', {
            AWS_BEARER_TOKEN_BEDROCK: bedrockKey,
            AWS_REGION: region,
          })
          const temporaryPath = `${envPath}.queryrecon-tmp`
          writeFileSync(temporaryPath, updated, { encoding: 'utf8', mode: 0o600 })
          renameSync(temporaryPath, envPath)

          try {
            await restartHermes()
          } catch {
            res.statusCode = 500
            return res.end(JSON.stringify({ error: 'Bedrock settings were saved, but Hermes could not restart. Run npm run hermes:repair.' }))
          }
          return res.end(JSON.stringify({ ok: true }))
        } catch {
          res.statusCode = 400
          return res.end(JSON.stringify({ error: 'Could not save Bedrock settings. Check the local endpoint and values.' }))
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
