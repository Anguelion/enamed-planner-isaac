const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsonFile = path.join(root, 'health-news', 'data', 'latest.json');
const scriptFile = path.join(root, 'health-news', 'data', 'latest.js');
const issue = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const output = `window.RADAR_SAUDE_ISSUE = ${JSON.stringify(issue, null, 2)};\n`;

fs.writeFileSync(scriptFile, output, 'utf8');
console.log(`Dados locais sincronizados: ${issue.id}.`);
