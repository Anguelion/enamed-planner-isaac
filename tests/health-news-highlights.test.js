const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('as duas experiências do Radar destacam o essencial para lembrar', () => {
  const standalone = read('health-news/index.html');
  const standaloneScript = read('health-news/app.js');
  const standaloneStyles = read('health-news/styles.css');
  const plannerStyles = read('assets/planner-refresh.css');
  assert.match(standalone, /O ESSENCIAL PARA LEMBRAR/);
  assert.match(standaloneScript, /story\.deepDive\?\.examFocus/);
  assert.match(standaloneStyles, /\.memory-highlight/);
  assert.match(plannerStyles, /\.planner-radar-exam[^\n]+#fff3b8/);
});
