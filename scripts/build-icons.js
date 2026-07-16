'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Icons=require('../assets/app-icons.js');

const root=path.resolve(__dirname,'..');
const packageRoot=path.resolve(path.dirname(require.resolve('@phosphor-icons/core')),'..');
const packageMetadata=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8'));
const outputDir=path.join(root,'assets','icons');
const physicalIcons=[...new Set(Object.values(Icons.ICON_MAP).map(item=>item.icon))].sort();
const weights=['duotone','regular'];

function symbolFor(icon,weight){
  const suffix=weight==='duotone'?'-duotone':'';
  const source=path.join(packageRoot,'assets',weight,`${icon}${suffix}.svg`);
  if(!fs.existsSync(source)) throw new Error(`Ícone Phosphor ausente: ${weight}/${icon}`);
  const svg=fs.readFileSync(source,'utf8');
  const viewBox=svg.match(/viewBox="([^"]+)"/)?.[1]||'0 0 256 256';
  const body=svg.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/s,'').trim();
  return `<symbol id="ph-${icon}-${weight}" viewBox="${viewBox}" fill="currentColor">${body}</symbol>`;
}

fs.mkdirSync(outputDir,{recursive:true});
const symbols=weights.flatMap(weight=>physicalIcons.map(icon=>symbolFor(icon,weight)));
const sprite=`<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none">${symbols.join('')}</svg>\n`;
fs.writeFileSync(path.join(outputDir,'phosphor-sprite.svg'),sprite);
const metadata={package:'@phosphor-icons/core',version:packageMetadata.version,source:'https://github.com/phosphor-icons/phosphor-core',license:'MIT',weights,icons:physicalIcons,generatedAt:new Date().toISOString()};
fs.writeFileSync(path.join(outputDir,'phosphor-attribution.json'),`${JSON.stringify(metadata,null,2)}\n`);
fs.copyFileSync(path.join(packageRoot,'LICENSE'),path.join(outputDir,'PHOSPHOR-LICENSE.txt'));
console.log(`Sprite Phosphor gerado: ${physicalIcons.length} ícones × ${weights.length} pesos.`);
