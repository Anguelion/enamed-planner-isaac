(function(root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.ENAMED_GAMIFICATION = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const VERSION = 'mvp-2';
  const FEATURE_FLAGS = Object.freeze({ relationalSync:false });
  const RANKS = Object.freeze([
    Object.freeze({key:'aldeao',name:'Aldeão',start:0,end:2}),
    Object.freeze({key:'aprendiz',name:'Aprendiz',start:3,end:5}),
    Object.freeze({key:'escudeiro',name:'Escudeiro',start:6,end:8}),
    Object.freeze({key:'soldado',name:'Soldado',start:9,end:11}),
    Object.freeze({key:'cavaleiro',name:'Cavaleiro',start:12,end:14}),
    Object.freeze({key:'capitao',name:'Capitão',start:15,end:17}),
    Object.freeze({key:'barao',name:'Barão',start:18,end:20}),
    Object.freeze({key:'duque',name:'Duque',start:21,end:23}),
    Object.freeze({key:'rei',name:'Rei',start:24,end:26}),
    Object.freeze({key:'imperador',name:'Imperador',start:27,end:30})
  ]);
  const DEFAULT_RULES = Object.freeze({
    version: VERSION,
    question: Object.freeze({ answer:2, correct:3, reviewedError:3, consolidation:1, repeatUnder24h:0.2, repeatUnder7d:0.5 }),
    flashcard: Object.freeze({ dueReview:1 }),
    video: Object.freeze({ xpPerMinute:0.4, completionBonus:5, completionThreshold:0.9 }),
    simulation: Object.freeze({ completionBase:50, xpPerQuestion:0.5, reviewPerError:2, reviewCap:100, bonusCap:300, minQuestions:10, repeatXPMultiplier:0.5, repeatWindowDays:30, maxFragmentsPerSimulation:1, fragmentsPerMedallion:3, globalSubstitutionLimit:3, legacyChestLimit:3 }),
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

  function getRankFromCompletedBlocks(completedBlocks) {
    const normalized=Math.min(30,Math.max(0,Math.floor(number(completedBlocks))));
    const index=Math.max(0,RANKS.findIndex(rank=>normalized>=rank.start && normalized<=rank.end));
    const current=RANKS[index];
    const next=RANKS[index+1] || null;
    const span=next ? next.start-current.start : current.end-current.start;
    const progressed=next ? normalized-current.start : span;
    return {
      key:current.key,
      name:current.name,
      index,
      completedBlocks:normalized,
      currentRangeStart:current.start,
      currentRangeEnd:current.end,
      nextRank:next ? {key:next.key,name:next.name,index:index+1,currentRangeStart:next.start,currentRangeEnd:next.end} : null,
      blocksForNextRank:next ? Math.max(0,next.start-normalized) : 0,
      progressPercent:next ? Math.max(0,Math.min(100,round(progressed/Math.max(1,span)*100))) : 100,
      isMaxRank:!next
    };
  }

  function evaluateRankPromotion(previous={},completedBlocks=0,rankProgress={}) {
    const rank=getRankFromProgress(completedBlocks,rankProgress);
    const source=previous && typeof previous==='object' ? previous : {};
    const initialized=Boolean(source.initialized);
    const shown=new Set(Array.isArray(source.shownRankKeys) ? source.shownRankKeys.map(text).filter(Boolean) : []);
    let promotion=null;
    if(!initialized) shown.add(rank.key);
    else if(rank.index>number(source.lastKnownRankIndex) && !shown.has(rank.key)) {
      promotion=rank;
      shown.add(rank.key);
    }
    return {
      rank,
      promotion,
      state:{initialized:true,lastKnownRankKey:rank.key,lastKnownRankIndex:rank.index,shownRankKeys:[...shown]}
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

  function evaluateFlashcardReviewXP(reviewLog={}) {
    const reviewLogId=text(reviewLog.reviewLogId || reviewLog.id);
    const cardId=text(reviewLog.cardId);
    const rating=Math.floor(number(reviewLog.rating));
    const wasDue=Boolean(reviewLog.wasDue);
    const wasNew=Boolean(reviewLog.wasNew);
    const validRating=rating>=1 && rating<=4;
    const eligible=Boolean(reviewLogId && cardId && validRating && (wasDue || wasNew) && !reviewLog.legacy);
    const reasons=[];
    if(!reviewLogId) reasons.push('missing_review_log_id');
    if(!cardId) reasons.push('missing_card_id');
    if(!validRating) reasons.push('invalid_rating');
    if(!wasDue && !wasNew) reasons.push('not_due_or_new');
    if(reviewLog.legacy) reasons.push('legacy_review');
    return {reviewLogId,cardId,rating,sessionId:text(reviewLog.sessionId),reviewedAt:iso(reviewLog.reviewedAt),wasDue,wasNew,eligible,reasons,eventKey:`flashcard-review:${reviewLogId}`,baseXP:eligible?1:0};
  }

  function awardFlashcardReviewXP(container,reviewLog={},options={}) {
    ensureState(container);
    const evaluation=evaluateFlashcardReviewXP(reviewLog);
    if(!evaluation.eligible) return {evaluation,transaction:null,duplicate:false,awarded:false};
    const result=awardXPIdempotently(container.xpTransactions,{user_id:text(options.userId)||'local',activity_type:'flashcard_review',source_type:'flashcard_review',source_id:evaluation.cardId,source_event_id:evaluation.eventKey,base_xp:evaluation.baseXP,reason:'flashcard_review',occurred_at:evaluation.reviewedAt,metadata:{rating:evaluation.rating,reviewLogId:evaluation.reviewLogId,sessionId:evaluation.sessionId,reviewedAt:evaluation.reviewedAt,wasDue:evaluation.wasDue,wasNew:evaluation.wasNew,legacy:false}},container.rules);
    refreshProfile(container);
    return {evaluation,transaction:result.transaction,duplicate:result.duplicate,awarded:!result.duplicate};
  }

  function calculateBlockXP(input={}, ruleOverrides={}) {
    const rules=mergeRules(ruleOverrides);
    return { baseXP:input.completed ? number(rules.block.completionBonus) : 0 };
  }

  function calculateSimulationBonus(input={}) {
    if(!input.completed || input.abandoned) return {baseXP:0,finalXP:0,completionXP:0,completionBase:0,questionQuantityBonus:0,questionBonus:0,performanceBonus:0,reviewedErrorsBonus:0,reviewBonus:0,cappedValue:0};
    const rules=mergeRules(input.rules || {});
    const total=Math.max(0,number(input.totalQuestions));
    const correct=Math.max(0,Math.min(total,number(input.correctAnswers)));
    const rate=total ? correct/total : 0;
    const performanceBonus=rate>=0.9?50:rate>=0.8?40:rate>=0.7?30:rate>=0.6?20:rate>=0.5?10:0;
    const reviewBonus=Math.min(number(input.reviewBonusCap)||number(rules.simulation.reviewCap),Math.max(0,number(input.reviewedErrors))*number(rules.simulation.reviewPerError));
    const completionBase=number(rules.simulation.completionBase);
    const questionQuantityBonus=number(rules.simulation.xpPerQuestion)*total;
    const cap=number(input.cap)||number(rules.simulation.bonusCap);
    const completionXP=Math.min(cap,completionBase+questionQuantityBonus+performanceBonus);
    const reviewXP=Math.min(reviewBonus,Math.max(0,cap-completionXP));
    const finalXP=round(completionXP+reviewXP);
    return {baseXP:finalXP,finalXP,completionXP:round(completionXP),completionBase:round(completionBase),questionQuantityBonus:round(questionQuantityBonus),questionBonus:round(questionQuantityBonus),performanceBonus:round(performanceBonus),reviewedErrorsBonus:round(reviewXP),reviewBonus:round(reviewXP),cappedValue:finalXP};
  }

  function simulationIdOf(attempt={}) { return text(attempt.simulationId || attempt.importedSimId || attempt.sourceSimulationId || attempt.id || attempt.attemptId); }
  function evaluateSimulationEligibility(simulationAttempt={},container={}) {
    const rules=mergeRules(container?.rules || simulationAttempt.rules || {});
    const attemptId=text(simulationAttempt.attemptId || simulationAttempt.id);
    const simulationId=simulationIdOf(simulationAttempt);
    const results=Array.isArray(simulationAttempt.questionResults) ? simulationAttempt.questionResults : [];
    const totalQuestions=Math.max(0,Math.floor(number(simulationAttempt.totalQuestions ?? simulationAttempt.total ?? results.length)));
    const answeredQuestions=Math.max(0,Math.min(totalQuestions,Math.floor(number(simulationAttempt.answeredQuestions ?? simulationAttempt.answered ?? results.filter(item=>item?.answered !== false && text(item?.selected)).length))));
    const correctAnswers=Math.max(0,Math.min(totalQuestions,Math.floor(number(simulationAttempt.correctAnswers ?? simulationAttempt.correct ?? results.filter(item=>item?.correct).length))));
    const incorrectAnswers=Math.max(0,totalQuestions-correctAnswers);
    const reviewedErrors=Math.max(0,Math.min(incorrectAnswers,Math.floor(number(simulationAttempt.reviewedErrors ?? results.filter(item=>!item?.correct && item?.reviewed).length))));
    const finished=Boolean(simulationAttempt.finished || simulationAttempt.completed || simulationAttempt.finishedAt);
    const abandoned=Boolean(simulationAttempt.abandoned || simulationAttempt.cancelled || simulationAttempt.canceled);
    const fullyReviewed=finished && (incorrectAnswers===0 || reviewedErrors>=incorrectAnswers);
    const reasons=[];
    if(!attemptId) reasons.push('missing_attempt_id');
    if(!simulationId) reasons.push('missing_simulation_id');
    if(abandoned) reasons.push('abandoned');
    if(!finished) reasons.push('not_finished');
    if(totalQuestions<number(rules.simulation.minQuestions)) reasons.push('below_minimum_questions');
    if(answeredQuestions<totalQuestions) reasons.push('incomplete_answers');
    const completionEligible=reasons.length===0;
    const reviewEligible=completionEligible && fullyReviewed;
    const completionEventKey=`simulation-completion:${attemptId}`;
    const completionAlreadyProcessed=Boolean(container?.xpTransactions?.some(item=>item.source_event_id===completionEventKey));
    return {attemptId,simulationId,totalQuestions,answeredQuestions,correctAnswers,incorrectAnswers,reviewedErrors,scorePercent:totalQuestions?round(correctAnswers/totalQuestions*100):0,isFinished:finished,isFullyReviewed:fullyReviewed,isEligibleForCompletionXP:completionEligible,isEligibleForFragment:reviewEligible,isEligibleForElementReward:reviewEligible,ineligibilityReasons:reasons,completionEventKey,completionAlreadyProcessed,finished,abandoned,fullyReviewed,completionEligible,fragmentEligible:reviewEligible,elementRewardEligible:reviewEligible,reasons};
  }

  function ensureRankProgress(container={}) {
    const source=container.rankProgress && typeof container.rankProgress==='object' ? container.rankProgress : {};
    source.fragments=Math.max(0,Math.floor(number(source.fragments)));
    source.simulationMedallions=Math.max(0,Math.floor(number(source.simulationMedallions)));
    source.simulationMedallionsUsed=Math.max(0,Math.floor(number(source.simulationMedallionsUsed)));
    source.globalSubstitutionsUsed=Math.max(0,Math.floor(number(source.globalSubstitutionsUsed)));
    source.fragmentEvents=Array.isArray(source.fragmentEvents)?source.fragmentEvents:[];
    source.medallionEvents=Array.isArray(source.medallionEvents)?source.medallionEvents:[];
    source.promotionHistory=Array.isArray(source.promotionHistory)?source.promotionHistory:[];
    container.rankProgress=source;
    return source;
  }

  function grantSimulationFragment(container,eligibility={},options={}) {
    const rules=mergeRules(container?.rules || options.rules || {});
    const progress=ensureRankProgress(container);
    const attemptId=text(eligibility.attemptId);
    const simulationId=text(eligibility.simulationId);
    const eventKey=`simulation-fragment:${attemptId}`;
    const duplicate=progress.fragmentEvents.find(event=>event.eventKey===eventKey);
    if(duplicate) return {granted:false,duplicate:true,event:duplicate,medallionCreated:false,progress};
    if(!eligibility.isEligibleForFragment || !attemptId || !simulationId) return {granted:false,duplicate:false,reason:'not_eligible',medallionCreated:false,progress};
    const priorForSimulation=progress.fragmentEvents.filter(event=>event.simulationId===simulationId && event.granted!==false).length;
    if(priorForSimulation>=number(rules.simulation.maxFragmentsPerSimulation)) return {granted:false,duplicate:false,reason:'simulation_fragment_limit',medallionCreated:false,progress};
    const event={eventKey,attemptId,simulationId,createdAt:iso(options.now),legacy:Boolean(options.legacy),granted:true};
    progress.fragmentEvents.push(event);
    progress.fragments+=1;
    let medallionCreated=false;
    const needed=Math.max(1,Math.floor(number(rules.simulation.fragmentsPerMedallion)||3));
    if(progress.fragments>=needed) {
      progress.fragments-=needed;
      progress.simulationMedallions+=1;
      medallionCreated=true;
      progress.medallionEvents.push({eventKey:`simulation-medallion:${eventKey}`,sourceFragmentEventKey:eventKey,simulationId,attemptId,createdAt:iso(options.now)});
    }
    return {granted:true,duplicate:false,event,medallionCreated,progress};
  }

  function getRankFromProgress(completedBlocks,rankProgress={}) {
    const academic=getRankFromCompletedBlocks(completedBlocks);
    const promotions=Array.isArray(rankProgress?.promotionHistory)?rankProgress.promotionHistory:[];
    const accelerated=promotions.filter(item=>item?.type==='simulation_substitution' && item?.consumed).sort((a,b)=>number(b.toRankIndex)-number(a.toRankIndex))[0];
    const effectiveIndex=Math.min(RANKS.length-1,Math.max(academic.index,number(accelerated?.toRankIndex)));
    const current=RANKS[effectiveIndex];
    const next=RANKS[effectiveIndex+1] || null;
    return {...academic,key:current.key,name:current.name,index:effectiveIndex,nextRank:next?{key:next.key,name:next.name,index:effectiveIndex+1,currentRangeStart:next.start,currentRangeEnd:next.end}:null,isMaxRank:!next,accelerated:effectiveIndex>academic.index,academicRank:academic};
  }

  function applyRankAcceleration(container,completedBlocks,options={}) {
    const progress=ensureRankProgress(container);
    const rules=mergeRules(container?.rules || options.rules || {});
    const academic=getRankFromCompletedBlocks(completedBlocks);
    const rangeKey=academic.key;
    const existing=progress.promotionHistory.find(item=>item.type==='simulation_substitution' && item.rangeKey===rangeKey && item.consumed);
    if(existing) return {consumed:false,duplicate:true,event:existing,rank:getRankFromProgress(completedBlocks,progress)};
    const available=progress.simulationMedallions-progress.simulationMedallionsUsed;
    const canAdvance=academic.completedBlocks-academic.currentRangeStart>=2 && academic.nextRank && academic.nextRank.key!=='imperador' && available>0 && progress.globalSubstitutionsUsed<number(rules.simulation.globalSubstitutionLimit);
    if(!canAdvance) return {consumed:false,duplicate:false,rank:getRankFromProgress(completedBlocks,progress)};
    const event={eventKey:`rank-substitution:${rangeKey}`,type:'simulation_substitution',rangeKey,fromRankIndex:academic.index,toRankIndex:academic.index+1,completedBlocks:academic.completedBlocks,consumed:true,createdAt:iso(options.now)};
    progress.promotionHistory.push(event);
    progress.simulationMedallionsUsed+=1;
    progress.globalSubstitutionsUsed+=1;
    return {consumed:true,duplicate:false,event,rank:getRankFromProgress(completedBlocks,progress)};
  }

  const ELEMENTS=Object.freeze(['fire','water','earth','air']);
  const ELEMENT_ACTIVITY=Object.freeze({question_answer:'fire',question_error_review:'fire',video_progress:'water',video_completion:'water',material_reading:'earth',reading:'earth',summary:'earth',flashcard_review:'air',flashcard_session:'air'});
  const RARITIES=Object.freeze({common:{label:'Comum',multiplier:1.2,hours:24,elements:1},rare:{label:'Rara',multiplier:1.2,hours:24,elements:2},epic:{label:'Épica',multiplier:1.35,hours:48,elements:1,shield:true},legendary:{label:'Lendária',multiplier:1.5,hours:72,elements:1,title:true}});
  function secureRandom() { if(typeof crypto!=='undefined' && typeof crypto.getRandomValues==='function'){const values=new Uint32Array(1);crypto.getRandomValues(values);return values[0]/4294967296;} throw new Error('RNG criptograficamente seguro indisponível'); }
  function rarityFromRoll(value) { const roll=Math.max(0,Math.min(.999999,number(value))); return roll<.60?'common':roll<.85?'rare':roll<.97?'epic':'legendary'; }
  function ensureElementRewards(container={}) { if(!Array.isArray(container.elementRewards)) container.elementRewards=[]; return container.elementRewards; }
  function createElementReward(container,eligibility={},options={}) {
    const rewards=ensureElementRewards(container);
    const attemptId=text(eligibility.attemptId);
    const eventKey=`simulation-element-reward:${attemptId}`;
    const duplicate=rewards.find(item=>item.eventKey===eventKey);
    if(duplicate) return {created:false,duplicate:true,reward:duplicate};
    if(!eligibility.isEligibleForElementReward || !attemptId || options.legacy) return {created:false,duplicate:false,reason:'not_eligible',reward:null};
    const rng=typeof options.rng==='function'?options.rng:secureRandom;
    const rarity=rarityFromRoll(rng());
    const config=RARITIES[rarity];
    const first=Math.min(ELEMENTS.length-1,Math.floor(rng()*ELEMENTS.length));
    const elements=[ELEMENTS[first]];
    if(config.elements===2) { let second=Math.min(ELEMENTS.length-1,Math.floor(rng()*ELEMENTS.length)); if(second===first) second=(first+1)%ELEMENTS.length; elements.push(ELEMENTS[second]); }
    const generatedAt=iso(options.now);
    const reward={id:id('element'),eventKey,attemptId,simulationId:text(eligibility.simulationId),rarity,rarityLabel:config.label,elements,multiplier:config.multiplier,durationHours:config.hours,status:'sealed',generatedAt,createdAt:generatedAt,openedAt:'',expiresAt:'',shieldAvailable:Boolean(config.shield),temporaryTitle:Boolean(config.title),temporaryFrame:Boolean(config.title),legacy:false};
    rewards.push(reward);
    return {created:true,duplicate:false,reward};
  }
  function openElementReward(container,rewardId,options={}) {
    const reward=ensureElementRewards(container).find(item=>item.id===rewardId || item.eventKey===rewardId);
    if(!reward) return {opened:false,reason:'not_found',reward:null};
    if(reward.openedAt) return {opened:false,duplicate:true,reward};
    const openedAt=iso(options.now);
    reward.openedAt=openedAt;
    reward.expiresAt=new Date(new Date(openedAt).getTime()+number(reward.durationHours)*60*60*1000).toISOString();
    reward.status='active';
    return {opened:true,duplicate:false,reward};
  }
  function getActiveElementMultipliers(containerOrRewards,activityType,now=new Date()) {
    const rewards=Array.isArray(containerOrRewards)?containerOrRewards:ensureElementRewards(containerOrRewards || {});
    const element=ELEMENT_ACTIVITY[text(activityType)] || '';
    const at=new Date(now).getTime();
    rewards.forEach(item=>{if(item.openedAt && item.expiresAt && new Date(item.expiresAt).getTime()<=at) item.status='expired';});
    if(!element) return {element:'',multiplier:1,rewardId:'',rarity:'',activeRewards:[]};
    const active=rewards.filter(item=>item.openedAt && item.expiresAt && new Date(item.openedAt).getTime()<=at && new Date(item.expiresAt).getTime()>at && item.elements?.includes(element));
    const best=active.sort((a,b)=>number(b.multiplier)-number(a.multiplier))[0] || null;
    return {element,multiplier:best?Math.min(1.5,number(best.multiplier)):1,rewardId:best?.id || '',rarity:best?.rarity || '',activeRewards:active};
  }

  function previewLegacySimulationChests(attempts=[],container={},options={}) {
    const limit=Math.max(0,Math.floor(number(options.limit ?? mergeRules(container?.rules || {}).simulation.legacyChestLimit)));
    const existing=new Set((container.legacyChests||[]).map(item=>text(item.attemptId)));
    const candidates=[];
    attempts.forEach(attempt=>{
      const eligibility=evaluateSimulationEligibility(attempt,container);
      if(!eligibility.isEligibleForFragment || !eligibility.attemptId || existing.has(eligibility.attemptId)) return;
      candidates.push({attemptId:eligibility.attemptId,simulationId:eligibility.simulationId,scorePercent:eligibility.scorePercent,reviewedErrors:eligibility.reviewedErrors,eventKey:`legacy-chest:${eligibility.attemptId}`});
    });
    return {candidates:candidates.slice(0,Math.max(0,limit-(container.legacyChests||[]).length)),totalEligible:candidates.length,limit};
  }
  function createLegacyChest(container,attempt={},options={}) {
    if(!Array.isArray(container.legacyChests)) container.legacyChests=[];
    const attemptId=text(attempt.attemptId || attempt.id);
    const existing=container.legacyChests.find(item=>item.attemptId===attemptId);
    if(existing) return {created:false,duplicate:true,chest:existing};
    const limit=Math.max(0,Math.floor(number(options.limit ?? mergeRules(container?.rules || {}).simulation.legacyChestLimit)));
    const eligibility=evaluateSimulationEligibility(attempt,container);
    if(!attemptId || container.legacyChests.length>=limit || !eligibility.isEligibleForFragment || !options.confirmed) return {created:false,duplicate:false,reason:!options.confirmed?'confirmation_required':'limit_or_not_eligible'};
    const chest={id:id('legacy-chest'),eventKey:`legacy-chest:${attemptId}`,attemptId,simulationId:simulationIdOf(attempt),createdAt:iso(options.now),openedAt:'',rewardId:''};
    container.legacyChests.push(chest);
    return {created:true,duplicate:false,chest};
  }
  function openLegacyChest(container,chestId,options={}) {
    const chest=(container.legacyChests||[]).find(item=>item.id===chestId);
    if(!chest) return {opened:false,reason:'not_found'};
    if(chest.openedAt) return {opened:false,duplicate:true,chest,reward:(container.elementRewards||[]).find(item=>item.id===chest.rewardId)};
    const eligibility={attemptId:`legacy-chest-${chest.id}`,simulationId:chest.simulationId,isEligibleForElementReward:true};
    const created=createElementReward(container,eligibility,{...options,legacy:false});
    if(!created.reward) return {opened:false,reason:created.reason};
    created.reward.legacy=true;
    openElementReward(container,created.reward.id,options);
    chest.openedAt=created.reward.openedAt; chest.rewardId=created.reward.id;
    return {opened:true,duplicate:false,chest,reward:created.reward};
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
    ensureRankProgress(container);
    ensureElementRewards(container);
    if(!Array.isArray(container.legacyChests)) container.legacyChests=[];
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
    const structuredFlashcardReviews=state.flashcardSystem?.reviewLogs || [];
    structuredFlashcardReviews.forEach(review => {
      if(!review?.id || !review?.cardId || !review?.reviewedAt) return;
      events.push(makeLegacyEvent({activity_type:'flashcard_review',source_type:'flashcard_review',source_id:review.cardId,source_event_id:`flashcard-review:${review.id}`,base_xp:mergeRules(ruleOverrides).flashcard.dueReview,reason:'flashcard_review',occurred_at:review.reviewedAt,metadata:{rating:number(review.rating),reviewLogId:review.id,sessionId:text(review.sessionId),wasDue:Boolean(review.wasDue),wasNew:Boolean(review.wasNew),legacySource:true}}));
    });
    const structuredTimes=new Set(structuredFlashcardReviews.map(review=>`${text(review.cardId)}|${text(review.reviewedAt)}`));
    (state.flashcardReviewHistory || []).forEach(review => {
      if(!review?.cardId || !review?.reviewedAt) return;
      if(structuredTimes.has(`${text(review.cardId)}|${text(review.reviewedAt)}`)) return;
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
    VERSION,FEATURE_FLAGS,RANKS,DEFAULT_RULES,mergeRules,getRankFromCompletedBlocks,getRankFromProgress,evaluateRankPromotion,applyRankAcceleration,repetitionMultiplier,calculateQuestionXP,calculateVideoXP,evaluateFlashcardReviewXP,awardFlashcardReviewXP,calculateBlockXP,
    calculateSimulationBonus,applyMultiplierCap,transactionKey,awardXPIdempotently,totalXP,calculateLevelFromXP,
    normalizeTransaction,ensureState,ensurePlannerState,refreshProfile,createAutomaticLegacyPreview,createAggregateLegacyPreview,
    summarizePreview,commitLegacyImport,revertLegacyImport,stableHash,evaluateSimulationEligibility,grantSimulationFragment,
    ensureRankProgress,ELEMENTS,ELEMENT_ACTIVITY,RARITIES,rarityFromRoll,createElementReward,openElementReward,getActiveElementMultipliers,
    previewLegacySimulationChests,createLegacyChest,openLegacyChest
  };
});
