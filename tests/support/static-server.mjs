// Minimal static file server for the e2e suite (repo root on port 3000).
//
// Replaces `npx http-server`, which crashes the whole process
// (ERR_HTTP_HEADERS_SENT) when a browser aborts an in-flight video stream —
// the hero video does exactly that whenever a page closes early — taking every
// later test down with ERR_CONNECTION_REFUSED. This reads whole files instead
// of piping streams, and swallows per-request errors.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.argv[2] || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = normalize(join(root, pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    if (!res.headersSent) res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

// A client hanging up mid-response must never take the server down.
server.on('clientError', (_err, socket) => socket.destroy());
process.on('uncaughtException', () => {});

server.listen(port, '127.0.0.1', () => console.log(`static server on http://127.0.0.1:${port}`));
