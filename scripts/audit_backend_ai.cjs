// scripts/audit_backend_ai.cjs
const fs = require('fs');

function auditFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log('====================================================');
  console.log('AUDITING FILE:', filePath);
  console.log('====================================================');

  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('@app.') || line.includes('generate_content') || line.includes('generate_content_async') || line.includes('models.generate') || line.includes('client.models')) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

auditFile('backend/health_api.py');
auditFile('backend/voice_api.py');
auditFile('backend/main.py');
auditFile('backend/app.py');

