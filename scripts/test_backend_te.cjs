const http = require('http');

const devRegex = /[\u0904-\u0939\u0958-\u0961]/;

function testPost(port, path, body) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ path, status: res.statusCode, data }));
    });
    req.on('error', err => resolve({ path, error: err.message }));
    req.write(postData);
    req.end();
  });
}

(async () => {
  const tests = [
    // Health report
    {
      port: 8003,
      path: '/api/health/report',
      body: {
        crop: 'paddy',
        sowing_date: '2026-09-22',
        state: 'Tamil Nadu',
        district: 'Thiruvallur',
        language: 'te'
      }
    },
    // Recommend compare
    {
      port: 8003,
      path: '/api/recommend/compare',
      body: {
        state: 'Tamil Nadu',
        district: 'Thiruvallur',
        season: 'Kharif',
        soil_type: 'Clay loam',
        irrigation_source: 'Borewell',
        water_availability: 'Moderate',
        investment_budget_inr: 75000,
        language: 'te'
      }
    },
    // Loss assess
    {
      port: 8003,
      path: '/api/loss/assess',
      body: {
        state: 'Tamil Nadu',
        district: 'Thiruvallur',
        crop: 'Paddy',
        season: 'Kharif',
        incident_type: 'Inundation',
        damage_percentage: 50,
        holding_acres: 2.5,
        language: 'te'
      }
    },
    // Lac forecast
    {
      port: 8003,
      path: '/api/lac/forecast',
      body: {
        state: 'Tamil Nadu',
        district: 'Thiruvallur',
        host_tree: 'Ber',
        tree_count: 50,
        strain: 'Rangeeni',
        season: 'Katki',
        language: 'te'
      }
    }
  ];

  for (const t of tests) {
    const res = await testPost(t.port, t.path, t.body);
    if (res.data) {
      const hasDev = devRegex.test(res.data);
      console.log(`Endpoint [${t.path}]: status=${res.status}, hasHindiDevanagari=${hasDev}`);
      if (hasDev) {
        const matches = res.data.match(/[\u0904-\u0939\u0958-\u0961\s]{4,}/g);
        console.log('   Hindi text found:', matches ? matches.slice(0, 5) : []);
      }
    } else {
      console.log(`Endpoint [${t.path}]: error=${res.error}`);
    }
  }
})();
