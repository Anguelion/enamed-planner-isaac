'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const source=path.join(root,'index.html');
const target=path.resolve(process.argv[2] || path.join(root,'..','ENAMED','enamed_planner.html'));

if(!fs.existsSync(source)) throw new Error(`Entrada canônica não encontrada: ${source}`);
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.copyFileSync(source,target);

const canonical=fs.readFileSync(source);
const generated=fs.readFileSync(target);
if(!canonical.equals(generated)) throw new Error('A cópia offline divergiu de index.html.');
console.log(`Entrada offline sincronizada: ${target}`);
