import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function localSyncPlugin(): Plugin {
  // Vite may be open through both localhost and the LAN address in separate
  // processes. Keep demo attendance shared between those processes.
  const projectKey = createHash('sha256')
    .update(path.resolve(process.cwd()).toLocaleLowerCase())
    .digest('hex');
  const stateDirectory = path.join(os.tmpdir(), 'nest-attendance-local-sync');
  const stateFile = path.join(stateDirectory, `${projectKey}.json`);

  const readSharedState = async () => {
    try {
      return JSON.parse(await readFile(stateFile, 'utf8')) as unknown;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  };

  const writeSharedState = async (state: unknown) => {
    await mkdir(stateDirectory, { recursive: true });
    const temporaryFile = `${stateFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(state), 'utf8');
    await rename(temporaryFile, stateFile);
  };

  return {
    name: 'local-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/network-ip' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ ip: getLocalIp() }));
          return;
        }

        if (req.url === '/api/sync' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          void readSharedState().then((state) => {
            res.end(JSON.stringify(state));
          }).catch(() => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Could not read shared demo state' }));
          });
          return;
        }

        if (req.url === '/api/sync' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            void (async () => {
              try {
                const state = JSON.parse(body) as unknown;
                await writeSharedState(state);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ ok: true }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
              }
            })();
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localSyncPlugin()],
  define: {
    __LAN_IP__: JSON.stringify(getLocalIp()),
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          forms: ['react-hook-form', 'zod'],
          icons: ['@phosphor-icons/react'],
        },
      },
    },
  },
});
