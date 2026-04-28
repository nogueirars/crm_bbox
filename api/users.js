const https = require('https');

const API_URL = 'https://api.bbox.club/api/crm/users/';
const API_KEY = process.env.BBOX_API_KEY || 'acedcd4608e7512cae2290fc8231768a030a01a8d9ac7869f84b3d76ac5fe130';

let cachedData = null;
let cacheTime = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

function fetchFromAPI() {
  return new Promise((resolve, reject) => {
    const req = https.get(API_URL, {
      headers: { 'accept': '*/*', 'x-api-key': API_KEY }
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const now = Date.now();
    if (!cachedData || !cacheTime || (now - cacheTime) > CACHE_TTL) {
      cachedData = await fetchFromAPI();
      cacheTime = now;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).end(JSON.stringify(cachedData));
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
