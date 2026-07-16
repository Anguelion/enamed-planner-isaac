'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Icons=require('../assets/app-icons.js');

const root=path.resolve(__dirname,'..');
const tones=new Set(['fire','water','earth','air','xp','simulation','success','warning','error','neutral']);

test('mapa semântico usa apenas tons e pesos suportados',()=>{
  for(const [name,item] of Object.entries(Icons.ICON_MAP)) {
    assert.ok(tones.has(item.tone),`${name}: tom inválido`);
    assert.ok(['duotone','regular'].includes(item.weight||'duotone'),`${name}: peso inválido`);
  }
});

test('AppIcon distingue ícones decorativos e significativos',()=>{
  const decorative=Icons.AppIcon('video');
  assert.match(decorative,/aria-hidden="true"/);
  assert.match(decorative,/ph-play-circle-duotone/);
  const meaningful=Icons.AppIcon('warning',{label:'Atenção',decorative:false});
  assert.match(meaningful,/role="img"/);
  assert.match(meaningful,/aria-label="Atenção"/);
});

test('sprite local contém todas as variantes do mapa',()=>{
  const sprite=fs.readFileSync(path.join(root,Icons.SPRITE_PATH),'utf8');
  for(const item of Object.values(Icons.ICON_MAP)) {
    assert.ok(sprite.includes(`id="ph-${item.icon}-duotone"`),`${item.icon} duotone ausente`);
    assert.ok(sprite.includes(`id="ph-${item.icon}-regular"`),`${item.icon} regular ausente`);
  }
  assert.doesNotMatch(sprite,/(?:href|src)="https?:\/\//);
});

test('assets RPG são locais, multicoloridos e preservam fills',()=>{
  for(const source of Object.values(Icons.RPG_ASSET_MAP)) {
    assert.doesNotMatch(source,/^https?:/);
    const svg=fs.readFileSync(path.join(root,source),'utf8');
    assert.match(svg,/<svg/);
    assert.match(svg,/fill="#[0-9a-f]{3,8}"/i);
    assert.doesNotMatch(svg,/currentColor/);
  }
});
