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
  'window.ConsultaClinica = { mount, defaultState, METODOS, __test:{ respostaParaTexto, metodo, doenca, resolveMarca, perguntasDaDoenca, ehItemChecklist, doencaCompativelComMetodo } };'
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

test('todos os protocolos mantêm uma resposta declarada por item do roteiro', () => {
  for(const method of api.METODOS){
    for(const stage of method.etapas){
      assert.equal(stage.resp.length, stage.perguntas.length, `${method.id}/${stage.id} desalinhado`);
    }
  }
});

test('aplicação da doença aparece somente na etapa coerente de cada protocolo', () => {
  const disease = diseases.find(item => item.id === 'sca');
  const calgary = api.METODOS.find(item => item.id === 'calgary');
  assert.equal(api.__test.perguntasDaDoenca(disease, calgary, calgary.etapas[0]).length, 0);
  assert.ok(api.__test.perguntasDaDoenca(disease, calgary, calgary.etapas[1]).length > 0);

  const soap = api.METODOS.find(item => item.id === 'soap');
  const assessment = api.__test.perguntasDaDoenca(disease, soap, soap.etapas[2]);
  assert.ok(assessment.length > 0);
  assert.ok(assessment.every(item => api.__test.ehItemChecklist(item)));

  const sbar = api.METODOS.find(item => item.id === 'sbar');
  assert.ok(sbar.etapas.flatMap(item => Array.from(item.resp)).every(item => item === ''));
});

test('cada protocolo oferece apenas cenários compatíveis quando necessário', () => {
  const emIds = diseases.filter(item => api.__test.doencaCompativelComMetodo(item, 'em')).map(item => item.id).sort();
  assert.deepEqual(Array.from(emIds), ['alcool','dislipidemia','dm2','has','insonia','obesidade','tabagismo']);
  assert.ok(diseases.filter(item => api.__test.doencaCompativelComMetodo(item, 'spikes')).every(item => item.spikes));
  assert.ok(diseases.filter(item => api.__test.doencaCompativelComMetodo(item, 'pediatrica')).every(item => item.area === 'Pediatria'));
});

test('entrevista motivacional responde conforme o comportamento do caso', () => {
  const obesity = diseases.find(item => item.id === 'obesidade');
  const alcohol = diseases.find(item => item.id === 'alcool');
  assert.match(api.__test.resolveMarca(obesity, '@em.comportamento'), /como|belisco|atividade/i);
  assert.doesNotMatch(api.__test.resolveMarca(obesity, '@em.comportamento'), /cigarro|bebo todo dia/i);
  assert.match(api.__test.resolveMarca(alcohol, '@em.subirConfianca'), /seguran|abstin/i);
  assert.match(api.__test.resolveMarca(alcohol, '@em.primeiroPasso'), /avaliação|plano seguro|parar sozinho/i);
});

test('entrevista psiquiátrica diferencia risco suicida de ansiedade sem ideação', () => {
  const suicide = diseases.find(item => item.id === 'risco-suicidio');
  const anxiety = diseases.find(item => item.id === 'ansiedade');
  assert.match(api.__test.resolveMarca(suicide, '@psiq.ideacao'), /matar|todos os dias|forte/i);
  assert.match(api.__test.resolveMarca(suicide, '@psiq.plano'), /remédios|remedios|mãe|mae/i);
  assert.match(api.__test.resolveMarca(anxiety, '@psiq.ideacao'), /não tenho pensado|nao tenho pensado/i);
});

test('paciente virtual informa nome e idade definidos na sessão', () => {
  const disease = diseases.find(item => item.id === 'has');
  const mccp = api.METODOS.find(item => item.id === 'mccp');
  const patient = { nome:'Dona Marlene', idade:'67' };
  assert.match(api.__test.respostaParaTexto(disease, mccp, 'Como você se chama?', patient), /Dona Marlene/);
  assert.match(api.__test.respostaParaTexto(disease, mccp, 'Quantos anos você tem?', patient), /67 anos/);
});
