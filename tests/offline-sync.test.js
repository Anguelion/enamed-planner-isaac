'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {gitExecutable,removeStaleGeneratedFiles,resolveInside}=require('../scripts/sync-offline-entry.js');

test('sync offline remove apenas arquivos antigos registrados no manifesto',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'enamed-offline-sync-'));
  try {
    fs.mkdirSync(path.join(root,'assets'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets','old.js'),'antigo');
    fs.writeFileSync(path.join(root,'assets','keep.js'),'atual');
    fs.writeFileSync(path.join(root,'arquivo-pessoal.txt'),'preservar');

    const removed=removeStaleGeneratedFiles(
      root,
      ['assets/old.js','assets/keep.js'],
      ['assets/keep.js'],
    );

    assert.equal(removed,1);
    assert.equal(fs.existsSync(path.join(root,'assets','old.js')),false);
    assert.equal(fs.readFileSync(path.join(root,'assets','keep.js'),'utf8'),'atual');
    assert.equal(fs.readFileSync(path.join(root,'arquivo-pessoal.txt'),'utf8'),'preservar');
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('sync offline rejeita caminhos fora da pasta de destino',()=>{
  const root=path.join(os.tmpdir(),'enamed-offline-root');
  assert.throws(()=>resolveInside(root,'../fora.txt'),/fora do pacote offline/);
});

test('sync offline localiza uma instalação funcional do Git',()=>{
  const executable=gitExecutable();
  assert.ok(executable);
  assert.equal(fs.existsSync(executable)||executable==='git',true);
});
