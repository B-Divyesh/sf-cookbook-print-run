import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const dist = resolve('dist');
const root = `${dist}${sep}`;
let serveUpdatedWorker = false;

const mimeTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function fileFor(pathname) {
  const clean = normalize(pathname.replace(/^\/+/, ''));
  const candidate = resolve(join(dist, clean));
  if (candidate !== dist && !candidate.startsWith(root)) return null;
  return candidate;
}

async function workerSource() {
  const source = await readFile(join(dist, 'sw.js'), 'utf8');
  if (!serveUpdatedWorker) return source;
  return source.replace(/^const CACHE = ("[^"]+");/m, (_match, cacheName) => `const CACHE = ${JSON.stringify(`${JSON.parse(cacheName)}-update`)};`);
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__test__/activate-worker-update') {
    serveUpdatedWorker = true;
    response.writeHead(204, { 'Cache-Control': 'no-store' });
    response.end();
    return;
  }
  // Azure consumes this control file; it is deliberately absent from the live origin.
  if (pathname === '/staticwebapp.config.json') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  let file = fileFor(pathname);
  let statusCode = 200;
  try {
    if (!file || (await stat(file)).isDirectory()) throw new Error('history fallback');
  } catch {
    file = join(dist, 'index.html');
    if (!['/', '/demo', '/privacy', '/terms'].includes(pathname)) statusCode = 404;
  }
  try {
    const body = file.endsWith(`${sep}sw.js`) ? await workerSource() : await readFile(file);
    response.writeHead(statusCode, {
      'Cache-Control': file.endsWith(`${sep}sw.js`) ? 'no-cache' : 'no-store',
      'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not start production-shaped test server');
process.env.AUDIT_URL = `http://127.0.0.1:${address.port}`;
process.env.EXPECT_AZURE_DEPLOYMENT_CONTROL_404 = 'true';
process.env.TEST_SERVICE_WORKER_UPDATE = 'true';

try {
  await import('./browser-audit.mjs');
} finally {
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}
