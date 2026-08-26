(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ENAMED_PLANNER_UX=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const TIME_ZONE='America/Fortaleza';
  const ROUTE_TABS=new Set(['painel','radar-saude','cronograma','pendencias','aulas','questoes','analise','flashcards','materiais','simulados','prescricao','areas','historico','feynman','importar-questoes','ferramentas','caderno-erros','ecg','radiografia','semiologia','anatomia']);
  const ROUTE_ALIASES={dashboard:'painel',missao:'cronograma',videos:'aulas'};

  function safeDecode(value=''){
    try{return decodeURIComponent(value);}catch(error){return String(value);}
  }
  function safeEncode(value=''){return encodeURIComponent(String(value));}
  function parseRoute(hash=''){
    const parts=String(hash||'').replace(/^#\/?/,'').split('/').filter(Boolean).map(safeDecode);
    if(!parts.length) return {tab:''};
    const requested=ROUTE_ALIASES[parts[0]]||parts[0];
    if(requested==='questoes') return {tab:'questoes',questionId:parts[1]||''};
    if(requested==='aulas') return {tab:'aulas',videoId:parts[1]||''};
    if(requested==='simulados'&&parts[2]==='tentativas') return {tab:'simulados',simulationId:parts[1]||'',attemptId:parts[3]||'',questionIndex:Math.max(0,Number(parts[5])||0)};
    return {tab:ROUTE_TABS.has(requested)?requested:'painel'};
  }
  function buildRoute(route={}){
    const tab=ROUTE_TABS.has(route.tab)?route.tab:'painel';
    if(tab==='questoes'&&route.questionId) return `#/questoes/${safeEncode(route.questionId)}`;
    if(tab==='aulas'&&route.videoId) return `#/videos/${safeEncode(route.videoId)}`;
    if(tab==='simulados'&&route.attemptId) return `#/simulados/${safeEncode(route.simulationId||'gerado')}/tentativas/${safeEncode(route.attemptId)}/questao/${Math.max(0,Number(route.questionIndex)||0)}`;
    return `#/${tab}`;
  }
  function localDateKey(value=new Date(),timeZone=TIME_ZONE){
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const pick=type=>parts.find(part=>part.type===type)?.value||'';
    return `${pick('year')}-${pick('month')}-${pick('day')}`;
  }
  function addDays(dateKey,days){
    const [year,month,day]=String(dateKey||'').split('-').map(Number);
    if(!year||!month||!day) return '';
    const date=new Date(Date.UTC(year,month-1,day+Number(days||0),12));
    return date.toISOString().slice(0,10);
  }
  function weekdayFor(dateKey){
    const [year,month,day]=String(dateKey||'').split('-').map(Number);
    if(!year||!month||!day) return -1;
    return new Date(Date.UTC(year,month-1,day,12)).getUTCDay();
  }
  function occurrenceKey(templateId,date){return `task-occurrence:${templateId}:${date}`;}
  function taskUpdatedTime(task={}){
    return Date.parse(task.updatedAt||task.deletedAt||task.completedAt||task.createdAt||'')||0;
  }
  function compactOccurrences(occurrences=[]){
    const byKey=new Map();
    (Array.isArray(occurrences)?occurrences:[]).forEach(item=>{
      if(!item) return;
      const key=item.occurrenceKey||`${item.templateId||item.id||''}:${item.date||''}:${String(item.text||'').trim().toLowerCase()}`;
      const previous=byKey.get(key);
      if(!previous||taskUpdatedTime(item)>=taskUpdatedTime(previous)) byKey.set(key,{...item});
    });
    return [...byKey.values()];
  }
  function scheduledForDate(template,date){
    if(!template||template.active===false||!date) return false;
    const start=template.startDate||template.createdDate||date;
    if(date<start) return false;
    if(template.recurrence==='daily') return true;
    if(template.recurrence==='weekdays') return (template.weekdays||[]).map(Number).includes(weekdayFor(date));
    return date===(template.date||start);
  }
  function ensureOccurrences(templates=[],occurrences=[],date,now=new Date().toISOString()){
    const result=compactOccurrences(occurrences);
    const keys=new Set(result.map(item=>item.occurrenceKey).filter(Boolean));
    templates.filter(template=>scheduledForDate(template,date)).forEach(template=>{
      const key=occurrenceKey(template.id,date);
      if(keys.has(key)) return;
      result.push({
        id:`occ-${template.id}-${date}`,
        templateId:template.id,
        occurrenceKey:key,
        date,
        text:template.text,
        time:template.time || '',
        done:false,
        status:'pending',
        priority:Number(template.priority)||0,
        order:Number(template.order)||1,
        createdAt:now,
        completedAt:'',
        updatedAt:now,
        postponedFrom:'',
        postponedTo:''
      });
      keys.add(key);
    });
    return result;
  }
  function deleteOccurrence(occurrences=[],taskId,now=new Date().toISOString()){
    const source=(Array.isArray(occurrences)?occurrences:[]).find(item=>String(item?.id||'')===String(taskId||''));
    if(!source) return compactOccurrences(occurrences);
    const sourceText=String(source.text||'').trim().toLowerCase();
    const matches=item=>String(item?.id||'')===String(taskId||'')||
      (source.occurrenceKey&&item?.occurrenceKey===source.occurrenceKey)||
      (source.templateId&&item?.templateId===source.templateId&&item?.date===source.date&&String(item?.text||'').trim().toLowerCase()===sourceText);
    return compactOccurrences((Array.isArray(occurrences)?occurrences:[]).map(item=>{
      if(!matches(item)) return {...item};
      return {
        ...item,
        done:false,
        status:'deleted',
        deletedAt:now,
        updatedAt:now
      };
    }));
  }
  function postponeOccurrence(occurrences=[],taskId,nextDate,now=new Date().toISOString()){
    const result=occurrences.map(item=>({...item}));
    const source=result.find(item=>item.id===taskId);
    if(!source||!nextDate) return result;
    source.status='postponed';
    source.postponedTo=nextDate;
    source.updatedAt=now;
    const key=occurrenceKey(source.templateId,nextDate);
    const existing=result.find(item=>item.occurrenceKey===key);
    if(existing) {
      existing.postponedFrom=source.date;
      existing.updatedAt=now;
      return result;
    }
    result.push({
      ...source,
      id:`occ-${source.templateId}-${nextDate}`,
      occurrenceKey:key,
      date:nextDate,
      done:false,
      status:'pending',
      completedAt:'',
      postponedFrom:source.date,
      postponedTo:'',
      createdAt:now,
      updatedAt:now
    });
    return result;
  }
  function normalizeVideoProgress(existing={},fallback={}){
    return {
      videoId:String(existing.videoId||fallback.videoId||''),
      currentTime:Math.max(0,Number(existing.currentTime??fallback.currentTime)||0),
      duration:Math.max(0,Number(existing.duration??fallback.duration)||0),
      playbackRate:Math.min(4,Math.max(.25,Number(existing.playbackRate??fallback.playbackRate)||1)),
      updatedAt:existing.updatedAt||fallback.updatedAt||'',
      completed:Boolean(existing.completed??fallback.completed),
      lessonId:String(existing.lessonId||fallback.lessonId||''),
      scheduleId:String(existing.scheduleId||fallback.scheduleId||''),
      block:Number(existing.block??fallback.block)||0
    };
  }
  function resumeTime(progress={},nearEndSeconds=15){
    const current=Math.max(0,Number(progress.currentTime)||0);
    const duration=Math.max(0,Number(progress.duration)||0);
    if(progress.completed&&duration>0&&current>=Math.max(0,duration-nearEndSeconds)) return 0;
    return duration>0?Math.min(current,Math.max(0,duration-.1)):current;
  }

  function removeSimulationRecord(simuladoRuns=[],simulados=[],runId=''){
    const id=String(runId||'');
    return {
      simuladoRuns:(Array.isArray(simuladoRuns)?simuladoRuns:[]).filter(run=>String(run?.id||'')!==id),
      simulados:(Array.isArray(simulados)?simulados:[]).filter(sim=>String(sim?.id||'')!==`auto-${id}`)
    };
  }

  function validateQuestionRecord(question={}){
    const options=Object.entries(question.options||{})
      .map(([letter,text])=>[String(letter||'').trim().toUpperCase(),String(text||'').trim()])
      .filter(([letter,text])=>letter&&text);
    const letters=options.map(([letter])=>letter);
    const answer=String(question.answer||'').trim().toUpperCase();
    const reasons=[];
    if(!String(question.stem||'').trim()) reasons.push('Enunciado ausente.');
    if(options.length<2) reasons.push(`Apenas ${options.length} alternativa${options.length===1?'':'s'} válida${options.length===1?'':'s'}.`);
    if(!answer){
      if(!question.answerPending) reasons.push('Gabarito ausente.');
    } else if(!letters.includes(answer)) reasons.push(`O gabarito ${answer} não corresponde a uma alternativa válida.`);
    return {valid:reasons.length===0,reasons,answer,optionLetters:letters,optionCount:options.length};
  }

  function questionProgressTimestamp(progress){
    if(!progress) return 0;
    return Date.parse(progress.updatedAt||progress.answerKeyIssueAt||progress.answeredAt||'')||0;
  }

  function mergeQuestionProgressRecord(remoteItem,localItem,preferLocal=false){
    if(!remoteItem) return localItem?structuredClone(localItem):null;
    if(!localItem) return structuredClone(remoteItem);
    const remoteTime=questionProgressTimestamp(remoteItem);
    const localTime=questionProgressTimestamp(localItem);
    const localIsLatest=localTime>remoteTime||(localTime===remoteTime&&preferLocal);
    const latest=localIsLatest?localItem:remoteItem;
    const older=localIsLatest?remoteItem:localItem;
    return {
      ...older,
      ...latest,
      attempts:Math.max(Number(remoteItem.attempts)||0,Number(localItem.attempts)||0),
      secondsSpent:Math.max(Number(remoteItem.secondsSpent)||0,Number(localItem.secondsSpent)||0)
    };
  }

  function stableTextHash(value=''){
    let hash=2166136261;
    for(const char of String(value)){
      hash^=char.codePointAt(0);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36);
  }

  function ensureUniqueRecordIds(records=[]){
    const used=new Set();
    return records.map((record,index)=>{
      const base=String(record?.id||`question-${index+1}`);
      if(!used.has(base)){
        used.add(base);
        return record;
      }
      const hash=stableTextHash(`${record?.collectionBlock||''}|${record?.number||''}|${record?.stem||''}`);
      let candidate=`${base}-dup-${hash}`;
      let suffix=2;
      while(used.has(candidate)) candidate=`${base}-dup-${hash}-${suffix++}`;
      used.add(candidate);
      return {...record,id:candidate,duplicateSourceId:base};
    });
  }

  return {TIME_ZONE,parseRoute,buildRoute,localDateKey,addDays,weekdayFor,occurrenceKey,compactOccurrences,scheduledForDate,ensureOccurrences,deleteOccurrence,postponeOccurrence,normalizeVideoProgress,resumeTime,removeSimulationRecord,validateQuestionRecord,questionProgressTimestamp,mergeQuestionProgressRecord,ensureUniqueRecordIds};
});
