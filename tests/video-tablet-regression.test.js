'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'assets/planner.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/planner.css'), 'utf8');

test('player de video permanece inline ao alternar modo foco no tablet', () => {
  assert.match(planner, /id="lessonVideo" controls playsinline webkit-playsinline/);
  assert.match(css, /\.video-stage\{[^}]*z-index:auto[^}]*isolation:auto[^}]*aspect-ratio:16\/9[^}]*max-height:/);
  assert.match(css, /\.video-stage \.video-player\{[^}]*z-index:auto[^}]*height:100%[^}]*max-height:none/);
});

test('camadas auxiliares nao cobrem os controles nativos em dispositivos de toque', () => {
  assert.match(css, /@media\(pointer:coarse\)[\s\S]*?\.video-stage\{[^}]*isolation:auto!important[^}]*overflow:visible!important[^}]*contain:none!important/);
  assert.match(css, /@media\(pointer:coarse\)[\s\S]*?\.video-stage \.video-player\{[^}]*position:static!important[^}]*z-index:auto!important/);
  assert.match(css, /@media\(pointer:coarse\)[\s\S]*?\.video-stage \.video-center-play,\.video-stage \.video-clean-frame-toggle\{display:none!important\}/);
  assert.match(css, /\.video-player:-webkit-full-screen/);
});
