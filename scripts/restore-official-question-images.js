'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const bankRoot = path.join(root, 'question_bank');
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check');

const imageSpecs = [
  { block:1, questionId:'b01-semanais-q80', file:'b01-semanais-q80.png', sourcePage:26 },
  { block:2, questionId:'b02-semanais-q157', file:'b02-semanais-q157.png', sourcePage:48 },
  { block:2, questionId:'b02-semanais-q162', file:'b02-semanais-q162.png', sourcePage:50 },
  { block:9, questionId:'b09-semanais-q117', file:'b09-semanais-q117.png', sourcePage:35 },
  { block:14, questionId:'b14-pals-q14', file:'b14-pals-q14.png', sourcePage:23 },
  { block:14, questionId:'b14-pals-q15', file:'b14-pals-q15.png', sourcePage:23 },
  { block:22, questionId:'b22-q013', file:'b22-q013.png', sourcePage:4 }
].map(spec => ({
  ...spec,
  image:`question_bank/media/official-blocks/${spec.file}`
}));

function loadCollection(block) {
  const file = `bloco_${String(block).padStart(2, '0')}.js`;
  const context = { window:{} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(bankRoot, file), 'utf8'), context, { filename:file });
  return { file, payload:context.window.ENAMED_LOCAL_QUESTION_BANK[String(block)] };
}

function saveCollection(block, file, payload) {
  fs.writeFileSync(path.join(bankRoot, file), `window.ENAMED_LOCAL_QUESTION_BANK = window.ENAMED_LOCAL_QUESTION_BANK || {};\nwindow.ENAMED_LOCAL_QUESTION_BANK[${JSON.stringify(String(block))}] = ${JSON.stringify(payload)};\n`);
  fs.writeFileSync(path.join(bankRoot, file.replace(/\.js$/i, '.json')), `${JSON.stringify(payload, null, 2)}\n`);
}

const changes = [];
const verified = [];
for(const block of [...new Set(imageSpecs.map(spec => spec.block))]) {
  const { file, payload } = loadCollection(block);
  let changedInBlock = false;
  for(const spec of imageSpecs.filter(item => item.block === block)) {
    const mediaPath = path.join(root, ...spec.image.split('/'));
    if(!fs.existsSync(mediaPath)) throw new Error(`Imagem recuperada não encontrada: ${spec.image}`);
    const question = (payload.questions || []).find(item => item.id === spec.questionId);
    if(!question) throw new Error(`Questão não encontrada no bloco ${block}: ${spec.questionId}`);
    const current = Array.isArray(question.images) ? question.images : [];
    if(current.includes(spec.image)) {
      verified.push(spec.questionId);
      continue;
    }
    if(current.length) throw new Error(`A questão ${spec.questionId} já possui outra imagem; revisão manual necessária.`);
    question.images = [spec.image];
    changes.push({ id:spec.questionId, image:spec.image, sourcePage:spec.sourcePage });
    changedInBlock = true;
  }
  if(shouldWrite && changedInBlock) saveCollection(block, file, payload);
}

console.log(JSON.stringify({
  mode:shouldWrite ? 'write' : shouldCheck ? 'check' : 'dry-run',
  suppliedImages:imageSpecs.length,
  changedQuestions:changes.length,
  verifiedQuestions:verified.length,
  changes
}, null, 2));

if(shouldCheck && changes.length) process.exitCode = 1;
