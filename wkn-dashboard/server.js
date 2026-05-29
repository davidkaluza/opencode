const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { stringify } = require('csv-stringify/sync');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

function queryOpenFIGI(wkns, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(wkns.map(wkn => ({
      idType: 'ID_WERTPAPIER',
      idValue: wkn.trim()
    })));

    const options = {
      hostname: 'api.openfigi.com',
      path: '/v3/mapping',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'API-KEY': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseFigiResponse(figiData) {
  const results = [];

  if (!figiData || !Array.isArray(figiData)) {
    return results;
  }

  for (const item of figiData) {
    const wkn = item.mappedValue || '';
    const data = item.data || [];

    let name = '', usTicker = '', deTicker = '', eurTicker = '';

    for (const d of data) {
      const ticker = d.ticker || '';
      const exchCode = d.exchCode || '';

      if (!name && d.name) name = d.name;

      if (exchCode === 'US' && !usTicker) usTicker = ticker;
      if (exchCode === 'DE' && !deTicker) deTicker = ticker;
      if (exchCode === 'EU' && !eurTicker) eurTicker = ticker;
      if (exchCode !== 'US' && exchCode !== 'DE' && exchCode !== 'EU' && !eurTicker) eurTicker = ticker;
    }

    results.push({
      wkn,
      name,
      us_ticker: usTicker,
      de_ticker: deTicker,
      eur_ticker: eurTicker
    });
  }

  return results;
}

app.post('/api/query', async (req, res) => {
  try {
    const { wkns, apiKey } = req.body;

    if (!wkns || !Array.isArray(wkns) || wkns.length === 0) {
      return res.status(400).json({ error: 'No WKNs provided' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }

    const figiResponse = await queryOpenFIGI(wkns, apiKey);
    const results = parseFigiResponse(figiResponse);

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const wkns = content.split(/[\r\n,]+/).filter(w => w.trim());

    const figiResponse = await queryOpenFIGI(wkns, apiKey);
    const results = parseFigiResponse(figiResponse);

    fs.unlinkSync(req.file.path);

    res.json({ results });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export', (req, res) => {
  const { data } = req.query;

  if (!data) {
    return res.status(400).json({ error: 'No data provided' });
  }

  try {
    const results = JSON.parse(decodeURIComponent(data));
    const csv = stringify(results, {
      header: true,
      columns: ['wkn', 'name', 'us_ticker', 'de_ticker', 'eur_ticker']
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=wkn_results.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`WKN Dashboard running at http://localhost:${PORT}`);
});