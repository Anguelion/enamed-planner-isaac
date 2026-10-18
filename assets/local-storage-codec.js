(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('fflate'));
  else root.PlannerStorage=factory(root.fflate);
})(typeof globalThis!=='undefined'?globalThis:this,function(zip){
  'use strict';
  const FORMAT='soqueromed-gzip-v1',THRESHOLD=1024*1024;
  function checksum(text){let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);return (value>>>0).toString(16);}
  function encode(text,{force=false}={}){
    if(typeof text!=='string')throw new TypeError('Conteúdo inválido para salvar.');
    if(!force&&text.length<THRESHOLD)return text;
    const bytes=zip.gzipSync(zip.strToU8(text),{level:1,mtime:0});
    let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    const envelope=JSON.stringify({format:FORMAT,length:text.length,checksum:checksum(text),data:btoa(binary)});
    return envelope.length<text.length?envelope:text;
  }
  function parse(raw){
    const value=JSON.parse(raw);
    if(value?.format!==FORMAT)return value;
    const bytes=Uint8Array.from(atob(value.data),char=>char.charCodeAt(0));
    const text=zip.strFromU8(zip.gunzipSync(bytes));
    if(text.length!==value.length||checksum(text)!==value.checksum)throw new Error('A cópia local não passou na verificação de integridade.');
    return JSON.parse(text);
  }
  function repack(storage,key){
    const raw=storage.getItem(key);if(!raw)return false;
    // Validar antes de alterar: uma cópia danificada deve permanecer intacta.
    const value=parse(raw);
    const packed=encode(JSON.stringify(value),{force:true});
    if(packed===raw)return false;
    storage.setItem(key,packed);return true;
  }
  return {encode,parse,repack,FORMAT};
});
