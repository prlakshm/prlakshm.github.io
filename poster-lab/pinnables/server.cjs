const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.css': 'text/css',
};
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (url.pathname === '/') p = path.join(root, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(4517, () => console.log('poster-lab on http://localhost:4517'));
