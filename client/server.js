import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(currentDir, 'dist');
const port = Number(process.env.PORT) || 4173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const joinedPath = path.join(distDir, requestPath);
  const filePath = joinedPath.startsWith(distDir) && fs.existsSync(joinedPath) && fs.statSync(joinedPath).isFile()
    ? joinedPath
    : path.join(distDir, 'index.html');

  response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    response.statusCode = 500;
    response.end('Server error');
  });
  stream.pipe(response);
}).listen(port, () => {
  console.log(`Web server running on port ${port}`);
});
