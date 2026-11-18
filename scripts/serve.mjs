import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const options = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!['--port', '--base'].includes(key) || !value || options.has(key)) throw new Error(`Invalid preview option: ${key}`);
  options.set(key, value);
}

const port = Number(options.get('--port') ?? 4173);
const base = options.get('--base') ?? '/';
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port.');
if (!/^\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*$/.test(base)) throw new Error('Preview base must start and end with a slash.');

const root = await realpath(fileURLToPath(new URL('../dist/', import.meta.url))).catch(error => {
  if (error.code === 'ENOENT') throw new Error('Run npm run build before previewing the collection.');
  throw error;
});
await stat(path.join(root, 'index.html'));

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }

    const relative = pathname.slice(base.length);
    const withIndex = pathname.endsWith('/') ? `${relative}index.html` : relative;
    const filename = await realpath(path.resolve(root, withIndex));
    if (!filename.startsWith(root + path.sep) || !Object.hasOwn(mime, path.extname(filename)) || !(await stat(filename)).isFile()) {
      response.writeHead(404).end();
      return;
    }

    const data = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(filename)],
      'Content-Length': data.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (error instanceof URIError) response.writeHead(400).end();
    else if (['ENOENT', 'ENOTDIR'].includes(error.code)) response.writeHead(404).end();
    else {
      console.error(`Preview request failed: ${error.code ?? error.name}`);
      response.writeHead(500).end();
    }
  }
});

server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Collection preview: http://127.0.0.1:${port}${base}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
