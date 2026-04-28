const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8765;
const API_URL = 'https://api.bbox.club/api/crm/users/';
const API_KEY = process.env.BBOX_API_KEY || 'acedcd4608e7512cae2290fc8231768a030a01a8d9ac7869f84b3d76ac5fe130';

// Cache dos dados em memória
let cachedData = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function fetchFromAPI() {
  return new Promise((resolve, reject) => {
    const req = https.get(API_URL, {
      headers: {
        'accept': '*/*',
        'x-api-key': API_KEY
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  // ── CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // ── API proxy endpoint
  if (url === '/api/users') {
    try {
      const now = Date.now();
      if (!cachedData || !cacheTime || (now - cacheTime) > CACHE_TTL) {
        console.log('[server] Buscando dados da API BBOX...');
        cachedData = await fetchFromAPI();
        cacheTime = now;
        console.log(`[server] ${cachedData.items?.length ?? 0} usuários carregados`);
      } else {
        console.log('[server] Retornando cache');
      }
      const json = JSON.stringify(cachedData);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(json);
    } catch(err) {
      console.error('[server] Erro:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── Servir dashboard.html
  const file = path.join(__dirname, 'dashboard.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✓ BBOX CRM Dashboard rodando em: http://localhost:${PORT}\n`);
});
