import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const CACHE_PREFIX = 'dinner-binder-release-';
const LEGACY_CACHE = 'dinner-binder-v1';

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return files.flat();
}

function serviceWorkerPlugin(): Plugin {
  return {
    name: 'dinner-binder-versioned-service-worker',
    apply: 'build',
    async closeBundle() {
      const output = join(process.cwd(), 'dist');
      const files = (await filesIn(output)).filter((file) => !file.endsWith('/sw.js'));
      const hash = createHash('sha256');
      hash.update(process.env.BUILD_ID || new Date().toISOString());
      for (const file of files.sort()) {
        hash.update(relative(output, file));
        hash.update(await readFile(file));
      }
      const cacheName = `${CACHE_PREFIX}${hash.digest('hex').slice(0, 16)}`;
      const shell = ['/', ...files.map((file) => `/${relative(output, file).replaceAll('\\', '/')}`)];
      const source = `const CACHE = ${JSON.stringify(cacheName)};
const SHELL = ${JSON.stringify(shell)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE && (key.startsWith(${JSON.stringify(CACHE_PREFIX)}) || key === ${JSON.stringify(LEGACY_CACHE)})).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      if (event.request.mode === 'navigate') return (await cache.match('/')) || Response.error();
      return Response.error();
    }
  })());
});
`;
      await writeFile(join(output, 'sw.js'), source);
    }
  };
}

export default defineConfig({
  plugins: [serviceWorkerPlugin()]
});
