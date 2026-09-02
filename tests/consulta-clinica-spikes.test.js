'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = {
  window:{},
  localStorage:{ removeItem(){} },
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/consulta-doencas.js'), 'utf8'), context);

let clinicalSource = fs.readFileSync(path.join(root, 'assets/consulta-clinica.js'), 'utf8');
clinicalSource = clinicalSource.replace(
  'window.ConsultaClinica = { mount, defaultState, METODOS };',
  'window.ConsultaClinica = { mount, defaultState, METODOS, __test:{ respostaParaTexto, metodo, doenca } };'
);
vm.runInContext(clinicalSource, context);

const diseases = context.window.CONSULTA_DOENCAS;
const api = context.window.ConsultaClinica;
const spikes = api.METODOS.find(item => item.id === 'spikes');
const badNewsCases = diseases.filter(item => item.spikes);

test('SPIKES mantém seis letras com roteiro próprio e completo', () => {
  assert.deepEqual(Array.from(spikes.etapas, item => item.id), ['sp1','sp2','sp3','sp4','sp5','sp6']);
  assert.ok(spikes.etapas.every(item => item.perguntas.length >= 4));
  assert.match(spikes.etapas[1].titulo, /^P — Perception/);
  assert.match(spikes.etapas[3].titulo, /^K — Knowledge/);
  assert.match(spikes.etapas[4].titulo, /^E — Emotions/);
});

test('há variedade de doenças avançadas preparadas para comunicação', () => {
  assert.ok(badNewsCases.length >= 7);
  for(const id of ['paliativos','ca-pulmao-avancado','ca-pancreas-irressecavel','ic-avancada','dpoc-avancada','ela-progressiva','drc-conservador','demencia-avancada']){
    const disease = diseases.find(item => item.id === id);
    assert.ok(disease?.spikes, `caso SPIKES ausente: ${id}`);
    assert.ok(disease.spikes.noticia.length > 40, `notícia pouco específica: ${id}`);
    for(const etapa of spikes.etapas) assert.ok(disease.spikes.falas[etapa.id]?.length, `${id} sem aplicação em ${etapa.id}`);
  }
});

test('todas as falas sugeridas do SPIKES recebem resposta do paciente', () => {
  const fallbacks = new Set([
    'Isso eu não sei responder, doutor.','Nunca prestei atenção nisso, pra ser sincero.','Hum... não sei dizer, desculpa.',
    'Não me lembro bem disso agora.','Acho que não, mas não tenho certeza.','Essa eu não sei, doutor.',
    'Nunca ninguém me perguntou isso antes.','Não sei te dizer ao certo.','Desculpa, não entendi bem o que o senhor perguntou.',
    'Como assim, doutor? Pode explicar de outro jeito?','Não sei se entendi a pergunta.','Pode repetir? Não peguei direito.'
  ]);
  for(const disease of badNewsCases){
    for(const etapa of spikes.etapas){
      for(const pergunta of etapa.perguntas){
        const answer = api.__test.respostaParaTexto(disease, spikes, pergunta);
        assert.ok(answer && !fallbacks.has(answer), `${disease.id}/${etapa.id} não respondeu: ${pergunta}`);
      }
      for(const fala of disease.spikes.falas[etapa.id]){
        const answer = api.__test.respostaParaTexto(disease, spikes, fala.pergunta);
        assert.ok(answer && !fallbacks.has(answer), `${disease.id}/${etapa.id} não respondeu à aplicação do caso`);
      }
    }
  }
});

test('resposta do caso acompanha a doença e não uma anamnese genérica', () => {
  const disease = diseases.find(item => item.id === 'ca-pulmao-avancado');
  const perception = api.__test.respostaParaTexto(disease, spikes, 'O que você entendeu sobre sua doença até aqui?');
  const news = api.__test.respostaParaTexto(disease, spikes, disease.spikes.noticia);
  assert.match(perception, /quimioterapia|câncer|cancer|metastático/i);
  assert.match(news, /duro|tempo|chora/i);
});
