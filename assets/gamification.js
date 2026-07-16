(function(root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.ENAMED_GAMIFICATION = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const VERSION = 'mvp-1';
  const FEATURE_FLAGS = Object.freeze({ relationalSync:false });
  const DEFAULT_RULES = Object.freeze({
    version: VERSION,
    question: Object.freeze({ answer:2, correct:3, reviewedError:3, consolidation:1, repeatUnder24h:0.2, repeatUnder7d:0.5 }),
    flashcard: Object.freeze({ dueReview:1 }),
    video: Object.freeze({ xpPerMinute:0.4, completionBonus:5, completionThreshold:0.9 }),
    simulation: Object.freeze({ completionBase:50, xpPerQuestion:0.5, reviewPerError:2, reviewCap:100, bonusCap:300 }),
    block: Object.freeze({ completionBonus:100 }),
    level: Object.freeze({ firstLevelCost:100, growthPerLevel:20 }),
    multiplierCap:1.5
  });

  function number(value) { const parsed=Number(value); return Number.isFinite(parsed) ? parsed : 0; }
  function round(value, digits=2) { const factor=10 ** digits; return Math.round((number(value)+Number.EPSILON)*factor)/factor; }
  function iso(value) { const date=value ? new Date(value) : new Date(); return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(); }
  function id(prefix='xp') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`; }
  function uuid() {
    if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,character=>{const random=Math.random()*16|0;return (character==='x'?random:(random&3|8)).toString(16);});
  }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function text(value) { return String(value ?? '').trim(); }
  function stableHash(value) {
    const source=typeof value === 'string' ? value : JSON.stringify(value, Object.keys(value || {}).sort());
    let hash=2166136261;
    for(let index=0;index<source.length;index+=1) { hash^=source.charCodeAt(index); hash=Math.imul(hash,16777619); }
    return (hash>>>0).toString(16).padStart(8,'0');
  }

  function mergeRules(overrides={}) {
    return {
      ...DEFAULT_RULES,
      ...overrides,
      question:{...DEFAULT_RULES.question,...(overrides.question || {})},
      flashcard:{...DEFAULT_RULES.flashcard,...(overrides.flashcard || {})},
      video:{...DEFAULT_RULES.video,...(overrides.video || {})},
      simulation:{...DEFAULT_RULES.simulation,...(overrides.simulation || {})},
      block:{...DEFAULT_RULES.block,...(overrides.block || {})},
      level:{...DEFAULT_RULES.level,...(overrides.level || {})}
    };
  }

  function repetitionMultiplier(previousOccurredAt, occurredAt, rules=DEFAULT_RULES) {
    if(!previousOccurredAt) return 1;
    const elapsed=new Date(occurredAt).getTime()-new Date(previousOccurredAt).getTime();
    if(!Number.isFinite(elapsed) || elapsed < 0) return 1;
    if(elapsed < 24*60*60*1000) return number(rules.question.repeatUnder24h) || 0.2;
    if(elapsed < 7*24*60*60*1000) return number(rules.question.repeatUnder7d) || 0.5;
    return 1;
  }

  function calculateQuestionXP(input={}, ruleOverrides={}) {
    const rules=mergeRules(ruleOverrides);
    let base=number(rules.question.answer);
    const breakdown=[{key:'answer',xp:number(rules.question.answer)}];
    if(input.correct) { base+=number(rules.question.correct); breakdown.push({key:'correct',xp:number(rules.question.correct)}); }
    else if(input.reviewedError) { base+=number(rules.question.reviewedError); breakdown.push({key:'reviewed_error',xp:number(rules.question.reviewedError)}); }
    if(input.consolidation) { base+=number(rules.question.consolidation); breakdown.push({key:'consolidation',xp:number(rules.question.consolidation)}); }
    const repeatMultiplier=repetitionMultiplier(input.previousOccurredAt, input.occurredAt || new Date(), rules);
    return { baseXP:round(base), repetitionMultiplier:repeatMultiplier, finalBaseXP:round(base*repeatMultiplier), breakdown };
  }

  function calculateVideoXP(input={}, ruleOverrides={}) {
    const rules=mergeRules(ruleOverrides);
    const seconds=Math.max(0,Math.min(4*60*60,number(input.seconds)));
    const minuteXP=seconds/60*number(rules.video.xpPerMinute);
    const completion=Boolean(input.completed && !input.completionAlreadyAwarded) ? number(rules.video.completionBonus) : 0;
    return { baseXP:round(minuteXP+completion), watchedSeconds:Math.round(seconds), minuteXP:round(minuteXP), completionBonus:round(completion) };
  }

  function calculateBlockXP(input={}, ruleOverrides={}) {
    const rules=mergeRules(ruleOverrides);
    return { baseXP:input.completed ? number(rules.block.completionBonus) : 0 };
  }

  function calculateSimulationBonus(input={}) {
    if(!input.completed || input.abandoned) return {baseXP:0,performanceBonus:0,reviewBonus:0};
    const rules=mergeRules(input.rules || {});
    const total=Math.max(0,number(input.totalQuestions));
    const correct=Math.max(0,Math.min(total,number(input.correctAnswers)));
    const rate=total ? correct/total : 0;
    const performanceBonus=rate>=0.9?50:rate>=0.8?40:rate>=0.7?30:rate>=0.6?20:rate>=0.5?10:0;
    const reviewBonus=Math.min(number(input.reviewBonusCap)||number(rules.simulation.reviewCap),Math.max(0,number(input.reviewedErrors))*number(rules.simulation.reviewPerError));
    return {baseXP:round(Math.min(number(input.cap)||number(rules.simulation.bonusCap),number(rules.simulation.completionBase)+number(rules.simulation.xpPerQuestion)*total+performanceBonus+reviewBonus)),performanceBonus,reviewBonus};
  }

  function applyMultiplierCap(multipliers={}, cap=DEFAULT_RULES.multiplierCap) {
    const element=Math.max(0,number(multipliers.element)||1);
    const streak=Math.max(0,number(multipliers.streak)||1);
    const balance=Math.max(0,number(multipliers.balance)||1);
    const raw=element*streak*balance;
    const final=Math.min(number(cap)||1.5,raw);
    return { element,streak,balance,raw:round(raw,4),final:round(final,4),capped:raw>final };
  }

  function transactionKey(input={}) {
    return [text(input.user_id)||'local',text(input.source_type),text(input.source_id),text(input.reason),text(input.source_event_id)].join('|');
  }

  function normalizeTransaction(input={}) {
    const normalized={...input};
    normalized.activity_type=text(normalized.activity_type || normalized.type);
    normalized.source_type=text(normalized.source_type);
    normalized.source_id=text(normalized.source_id);
    normalized.source_event_id=text(normalized.source_event_id);
    normalized.reason=text(normalized.reason);
    normalized.idempotency_key=text(normalized.idempotency_key || normalized.eventKey) || transactionKey(normalized);
    normalized.eventKey=normalized.idempotency_key;
    normalized.base_xp=round(normalized.base_xp);
    normalized.element_multiplier=number(normalized.element_multiplier) || 1;
    normalized.streak_multiplier=number(normalized.streak_multiplier) || 1;
    normalized.balance_multiplier=number(normalized.balance_multiplier) || 1;
    normalized.final_multiplier=number(normalized.final_multiplier) || 1;
    normalized.final_xp=round(normalized.final_xp ?? normalized.base_xp);
    normalized.metadata=clone(normalized.metadata || {});
    normalized.occurred_at=iso(normalized.occurred_at || normalized.created_at);
    normalized.created_at=iso(normalized.created_at || normalized.occurred_at);
    normalized.import_batch_id=text(normalized.import_batch_id);
    normalized.is_legacy=Boolean(normalized.is_legacy);
    return normalized;
  }

  function awardXPIdempotently(ledger, input={}, ruleOverrides={}) {
    if(!Array.isArray(ledger)) throw new TypeError('ledger deve ser uma lista');
    const required=['activity_type','source_type','source_id','source_event_id','reason'];
    required.forEach(field => { if(!text(input[field])) throw new TypeError(`Campo obrigatório ausente: ${field}`); });
    const key=transactionKey(input);
    const existing=ledger.find(item => item.idempotency_key===key);
    if(existing) return {transaction:existing,duplicate:true};
    const rules=mergeRules(ruleOverrides);
    const multipliers=applyMultiplierCap(input.multipliers,rules.multiplierCap);
    const baseXP=round(input.base_xp);
    const finalXP=round(baseXP*multipliers.final);
    const createdAt=iso(input.created_at);
    const transaction={
      id:text(input.id)||id('xp'), user_id:text(input.user_id)||'local', activity_type:text(input.activity_type),
      source_type:text(input.source_type), source_id:text(input.source_id), source_event_id:text(input.source_event_id),
      idempotency_key:key, eventKey:key, base_xp:baseXP, element_multiplier:multipliers.element, streak_multiplier:multipliers.streak,
      balance_multiplier:multipliers.balance, final_multiplier:multipliers.final, multiplier_capped:multipliers.capped,
      final_xp:finalXP, reason:text(input.reason), metadata:clone(input.metadata || {}), occurred_at:iso(input.occurred_at),
      created_at:createdAt, import_batch_id:text(input.import_batch_id), is_legacy:Boolean(input.is_legacy)
    };
    ledger.push(transaction);
    return {transaction,duplicate:false};
  }

  function totalXP(ledger=[]) { return round(ledger.reduce((sum,item)=>sum+number(item.final_xp),0)); }

  function calculateLevelFromXP(total, ruleOverrides={}) {
    const rules=mergeRules(ruleOverrides);
    const xp=Math.max(0,number(total));
    let level=1;
    let spent=0;
    let cost=number(rules.level.firstLevelCost)||100;
    while(xp-spent>=cost && level<10000) {
      spent+=cost;
      level+=1;
      cost=(number(rules.level.firstLevelCost)||100)+(number(rules.level.growthPerLevel)||20)*(level-1);
    }
    const within=round(xp-spent);
    return {level,totalXP:round(xp),xpWithinLevel:within,xpForNextLevel:round(cost),remainingXP:round(Math.max(0,cost-within)),progress:cost?Math.min(1,within/cost):1};
  }

  function ensureState(container={}) {
    if(!container || typeof container!=='object') container={};
    if(!Array.isArray(container.xpTransactions)) container.xpTransactions=[];
    else container.xpTransactions=container.xpTransactions.map(normalizeTransaction);
    if(!Array.isArray(container.importBatches)) container.importBatches=[];
    if(!container.rules || typeof container.rules!=='object') container.rules=clone(DEFAULT_RULES);
    if(!container.profile || typeof container.profile!=='object') container.profile={};
    container.version=VERSION;
    refreshProfile(container);
    return container;
  }

  function ensurePlannerState(plannerState={}) {
    const state=plannerState && typeof plannerState==='object' ? plannerState : {};
    const created=!state.gamification || typeof state.gamification!=='object';
    state.gamification=ensureState(created ? {} : state.gamification);
    return {state,created};
  }

  function refreshProfile(container) {
    ensureCollections(container);
    const xp=totalXP(container.xpTransactions);
    container.profile.cachedTotalXP=xp;
    container.profile.updatedAt=new Date().toISOString();
    return {...container.profile,...calculateLevelFromXP(xp,container.rules)};
  }
  function ensureCollections(container) {
    if(!Array.isArray(container.xpTransactions)) container.xpTransactions=[];
    if(!Array.isArray(container.importBatches)) container.importBatches=[];
  }

  function makeLegacyEvent(input) {
    const eventKey=[text(input.source_type),text(input.source_id),text(input.reason),text(input.source_event_id)].join('|');
    return {
      activity_type:input.activity_type, source_type:input.source_type, source_id:String(input.source_id),
      source_event_id:String(input.source_event_id), base_xp:round(input.base_xp), reason:input.reason,
      eventKey, metadata:clone(input.metadata || {}), occurred_at:iso(input.occurred_at), is_legacy:true,
      import_batch_id:text(input.import_batch_id)
    };
  }

  function previewCategory(activityType='') {
    const type=text(activityType);
    if(type.startsWith('question_')) return 'questions';
    if(type.startsWith('video_')) return 'videos';
    if(type.startsWith('flashcard_')) return 'flashcards';
    if(type.startsWith('simulation_')) return 'simulations';
    if(type.startsWith('block_')) return 'blocks';
    return 'other';
  }

  function summarizePreview(preview={}) {
    const categories={questions:{count:0,xp:0},videos:{count:0,xp:0},flashcards:{count:0,xp:0},simulations:{count:0,xp:0},blocks:{count:0,xp:0},other:{count:0,xp:0}};
    (preview.events || []).forEach(event=>{
      const bucket=categories[previewCategory(event.activity_type)];
      bucket.count+=1;
      bucket.xp=round(bucket.xp+number(event.base_xp));
    });
    return {events:Object.values(categories).reduce((sum,item)=>sum+item.count,0),xp:round(Object.values(categories).reduce((sum,item)=>sum+item.xp,0)),categories};
  }

  function createAutomaticLegacyPreview(input={}, ruleOverrides={}) {
    const state=input.state || {};
    const events=[];
    Object.entries(state.questionProgress || {}).forEach(([questionId,progress]) => {
      if(!progress?.answeredAt || !progress?.selected) return;
      const reviewedError=!progress.correct && text(progress.postLearning).length>=20;
      const result=calculateQuestionXP({correct:Boolean(progress.correct),reviewedError,occurredAt:progress.answeredAt},ruleOverrides);
      events.push(makeLegacyEvent({activity_type:'question_answer',source_type:'question',source_id:questionId,source_event_id:`answer:${questionId}:${progress.answeredAt}`,base_xp:result.finalBaseXP,reason:'question_answer',occurred_at:progress.answeredAt,metadata:{correct:Boolean(progress.correct),reviewedError,attempts:number(progress.attempts)||1,legacySource:true}}));
    });
    (state.studySessions || []).filter(session=>session?.kind==='video' && number(session.seconds)>0).forEach(session => {
      const result=calculateVideoXP({seconds:session.seconds},ruleOverrides);
      events.push(makeLegacyEvent({activity_type:'video_progress',source_type:'video_session',source_id:session.scheduleId || session.id,source_event_id:session.id,base_xp:result.baseXP,reason:'video_active_minutes',occurred_at:session.savedAt || session.date,metadata:{seconds:Math.round(number(session.seconds)),scheduleId:session.scheduleId || '',legacySource:true}}));
    });
    const excludedVideoIds=new Set(state.videoPlayer?.autoCompletedVideoIds || []);
    Object.entries(state.videoPlayer?.watched || {}).forEach(([videoId,watched]) => {
      if(!watched) return;
      if(excludedVideoIds.has(videoId)) return;
      const watchedAt=state.videoPlayer?.watchedAt?.[videoId];
      events.push(makeLegacyEvent({activity_type:'video_completion',source_type:'video',source_id:videoId,source_event_id:`completion:${videoId}`,base_xp:mergeRules(ruleOverrides).video.completionBonus,reason:'video_completion_90',occurred_at:watchedAt || input.generatedAt,metadata:{dateUnknown:!watchedAt,legacySource:true}}));
    });
    (state.flashcardReviewHistory || []).forEach(review => {
      if(!review?.cardId || !review?.reviewedAt) return;
      events.push(makeLegacyEvent({activity_type:'flashcard_review',source_type:'flashcard',source_id:review.cardId,source_event_id:`review:${review.cardId}:${review.reviewedAt}`,base_xp:mergeRules(ruleOverrides).flashcard.dueReview,reason:'flashcard_due_review',occurred_at:review.reviewedAt,metadata:{legacySource:true}}));
    });
    (state.simulados || []).forEach(simulation => {
      const total=Math.max(0,number(simulation?.total));
      const correct=Math.max(0,number(simulation?.correct));
      if(!total || !correct) return;
      const reviewedErrors=Math.max(0,number(simulation.reviewedErrors));
      const result=calculateSimulationBonus({completed:true,totalQuestions:total,correctAnswers:correct,reviewedErrors,rules:ruleOverrides});
      const occurredAt=simulation.completedAt || simulation.originalDate || simulation.date || input.generatedAt;
      events.push(makeLegacyEvent({activity_type:'simulation_completion',source_type:'simulation',source_id:simulation.id || stableHash(simulation),source_event_id:`simulation:${simulation.id || stableHash(simulation)}:completed`,base_xp:result.baseXP,reason:'simulation_completion',occurred_at:occurredAt,metadata:{totalQuestions:total,correctAnswers:correct,reviewedErrors,completed:true,legacySource:true}}));
    });
    (input.completedBlockIds || []).forEach(blockId => {
      events.push(makeLegacyEvent({activity_type:'block_completion',source_type:'block',source_id:blockId,source_event_id:`block:${blockId}:first-completion`,base_xp:mergeRules(ruleOverrides).block.completionBonus,reason:'block_completion',occurred_at:input.blockDates?.[blockId] || input.generatedAt,metadata:{academicProgress:true,legacySource:true}}));
    });
    return buildPreview('automatic',events,{source:'existing_planner_state'});
  }

  function createAggregateLegacyPreview(input={}, ruleOverrides={}) {
    const rules=mergeRules(ruleOverrides);
    const externalKey=text(input.externalKey)||stableHash({date:input.date,questions:input.questions,correctAnswers:input.correctAnswers,reviewedErrors:input.reviewedErrors,videoMinutes:input.videoMinutes,flashcards:input.flashcards,blocksCompleted:input.blocksCompleted,simulations:input.simulations,notes:input.notes});
    const occurred=input.date || new Date();
    const questions=Math.max(0,Math.floor(number(input.questions)));
    const correct=Math.min(questions,Math.max(0,Math.floor(number(input.correctAnswers))));
    const reviewed=Math.min(Math.max(0,questions-correct),Math.max(0,Math.floor(number(input.reviewedErrors))));
    const videoMinutes=Math.max(0,number(input.videoMinutes));
    const flashcards=Math.max(0,Math.floor(number(input.flashcards)));
    const blocks=Math.max(0,Math.floor(number(input.blocksCompleted)));
    const simulations=Math.max(0,Math.floor(number(input.simulations)));
    const events=[];
    if(questions) events.push(makeLegacyEvent({activity_type:'question_session',source_type:'legacy_aggregate',source_id:externalKey,source_event_id:`aggregate:questions:${externalKey}`,base_xp:questions*rules.question.answer+correct*rules.question.correct+reviewed*rules.question.reviewedError,reason:'legacy_aggregate_questions',occurred_at:occurred,metadata:{questions,correctAnswers:correct,reviewedErrors:reviewed,unknownAnswers:questions-correct}}));
    if(videoMinutes) events.push(makeLegacyEvent({activity_type:'video_progress',source_type:'legacy_aggregate',source_id:externalKey,source_event_id:`aggregate:video:${externalKey}`,base_xp:videoMinutes*rules.video.xpPerMinute,reason:'legacy_aggregate_video',occurred_at:occurred,metadata:{minutes:videoMinutes}}));
    if(flashcards) events.push(makeLegacyEvent({activity_type:'flashcard_session',source_type:'legacy_aggregate',source_id:externalKey,source_event_id:`aggregate:flashcards:${externalKey}`,base_xp:flashcards*rules.flashcard.dueReview,reason:'legacy_aggregate_flashcards',occurred_at:occurred,metadata:{flashcards}}));
    if(blocks) events.push(makeLegacyEvent({activity_type:'block_completion',source_type:'legacy_aggregate',source_id:externalKey,source_event_id:`aggregate:blocks:${externalKey}`,base_xp:blocks*rules.block.completionBonus,reason:'legacy_aggregate_blocks',occurred_at:occurred,metadata:{blocksCompleted:blocks,aggregate:true}}));
    if(simulations) events.push(makeLegacyEvent({activity_type:'simulation_completion',source_type:'legacy_aggregate',source_id:externalKey,source_event_id:`aggregate:simulations:${externalKey}`,base_xp:simulations*rules.simulation.completionBase,reason:'legacy_aggregate_simulations',occurred_at:occurred,metadata:{simulations,detailsUnknown:true}}));
    return buildPreview('aggregate',events,{source:'manual_aggregate',externalKey,notes:text(input.notes)});
  }

  function buildPreview(mode,events,metadata={}) {
    const normalized=events.filter(event=>number(event.base_xp)!==0);
    return {id:id('preview'),mode,events:normalized,totalXP:round(normalized.reduce((sum,event)=>sum+number(event.base_xp),0)),counts:normalized.reduce((acc,event)=>{acc[event.activity_type]=(acc[event.activity_type]||0)+1;return acc;},{}),metadata,createdAt:new Date().toISOString(),fingerprint:stableHash(normalized.map(event=>event.source_event_id).sort().join('|'))};
  }

  function commitLegacyImport(container,preview,options={}) {
    ensureState(container);
    if(!preview?.events?.length) return {batch:null,transactions:[],duplicates:0};
    const existing=container.importBatches.find(batch=>batch.fingerprint===preview.fingerprint);
    if(existing) return {batch:existing,transactions:[],duplicates:preview.events.length,alreadyCommitted:!existing.reverted_at,alreadyReverted:Boolean(existing.reverted_at)};
    const batchId=uuid();
    const batch={id:batchId,user_id:text(options.userId)||'local',status:'committed',source:preview.metadata?.source || preview.mode,preview_json:clone(preview),committed_at:new Date().toISOString(),reverted_at:'',totals_json:{events:preview.events.length,xp:preview.totalXP},fingerprint:preview.fingerprint};
    const transactions=[];
    let duplicates=0;
    preview.events.forEach(event => {
      const result=awardXPIdempotently(container.xpTransactions,{...event,user_id:batch.user_id,import_batch_id:batchId,is_legacy:true},container.rules);
      if(result.duplicate) duplicates+=1; else transactions.push(result.transaction);
    });
    container.importBatches.push(batch);
    refreshProfile(container);
    return {batch,transactions,duplicates,alreadyCommitted:false};
  }

  function revertLegacyImport(container,batchId,options={}) {
    ensureState(container);
    const batch=container.importBatches.find(item=>item.id===batchId);
    if(!batch || batch.reverted_at) return {batch,reversals:[],alreadyReverted:Boolean(batch?.reverted_at)};
    const originals=container.xpTransactions.filter(item=>item.import_batch_id===batchId && item.activity_type!=='import_reversal');
    const reversals=[];
    originals.forEach(original => {
      const result=awardXPIdempotently(container.xpTransactions,{user_id:text(options.userId)||original.user_id||'local',activity_type:'import_reversal',source_type:'import_batch',source_id:batchId,source_event_id:`revert:${original.id}`,base_xp:-number(original.final_xp),reason:'legacy_import_reverted',occurred_at:new Date(),metadata:{reversesTransactionId:original.id,originalFinalXP:original.final_xp,reversalXP:-number(original.final_xp)},import_batch_id:batchId,is_legacy:true},container.rules);
      if(!result.duplicate) reversals.push(result.transaction);
    });
    batch.status='reverted';
    batch.reverted_at=new Date().toISOString();
    refreshProfile(container);
    return {batch,reversals,alreadyReverted:false};
  }

  return {
    VERSION,FEATURE_FLAGS,DEFAULT_RULES,mergeRules,repetitionMultiplier,calculateQuestionXP,calculateVideoXP,calculateBlockXP,
    calculateSimulationBonus,applyMultiplierCap,transactionKey,awardXPIdempotently,totalXP,calculateLevelFromXP,
    normalizeTransaction,ensureState,ensurePlannerState,refreshProfile,createAutomaticLegacyPreview,createAggregateLegacyPreview,
    summarizePreview,commitLegacyImport,revertLegacyImport,stableHash
  };
});
