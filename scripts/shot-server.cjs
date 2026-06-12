// Tiny CORS receiver: the game POSTs a PNG data-URL, we write it to disk. No deps.
// usage: node scripts/shot-server.cjs "C:\\path\\to\\SS"
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(process.cwd(), 'SS');
fs.mkdirSync(OUT, { recursive: true });

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'POST') {
      const url = new URL(req.url, 'http://localhost');
      const name = (url.searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '_');
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const m = body.match(/^data:image\/png;base64,(.+)$/);
        const b64 = m ? m[1] : body;
        try {
          fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(b64, 'base64'));
          console.log('saved', name + '.png');
        } catch (e) {
          console.log('ERR', name, e.message);
        }
        res.writeHead(200);
        res.end('ok');
      });
      return;
    }
    res.writeHead(200);
    res.end('shot-server up');
  })
  .listen(7799, () => console.log('shot-server on :7799 ->', OUT));
