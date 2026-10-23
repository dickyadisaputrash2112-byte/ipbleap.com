import { scoreMentee, scoreAsmen, scoreSeniorMentor, competencies, validUrl, requireRule } from './scoring.js';
import { resolveCheckin, scoreFollowup, evaluateGraduation, can, mentoringDelay } from './workflows.js';
export const version = '20261023-assessment1';
export const periods = { FEB:'Februari', MAY:'Mei', AUG:'Agustus', NOV:'November' };
export const periodDates = { FEB:'2027-02-28', MAY:'2027-05-31', AUG:'2027-08-31', NOV:'2027-11-30' };
export const roleNames = { Mentee:'Mentee', Asmen:'Asisten Mentor', SM:'Senior Mentor', Admin:'Admin' };
export const demoUrl = 'https://example.org/bukti-contoh';
export function initialState() {
 const members = Array.from({length:10},(_,i)=>({ id:`m${i+1}`, name:`Mentee Contoh ${String(i+1).padStart(2,'0')}`, group:i<5?'Kelompok 01':'Kelompok 02', field:i%2?'Lingkungan':'Pendidikan' }));
 const records = {};
 for(const [i, member] of members.entries()) {
  const sampleStatuses = i===0?['Green','Green','Yellow','Green','Green','Yellow','Green','Green','Red','Green']:Array.from({length:10},(_,j)=>i%5===1?(j%2?'Red':'Yellow'):i%5===2?'Green':j%3?'Green':'Yellow');
  records[member.id] = {
   checkins:sampleStatuses.map((s,j)=>({ id:`${member.id}-c${j+1}`, requested:s, effective:s, reason:'Catatan proses contoh; belum merupakan bukti peserta nyata.', evidenceUrl:demoUrl, assessmentComplete:true,
    occurredAt:new Date(Date.UTC(2027,0,8+j*14,2)).toISOString(), assessedAt:new Date(Date.UTC(2027,0,8+j*14,3)).toISOString(), automaticRed:false })),
   kpis:[{id:'A', title:'Penerima manfaat mengalami perubahan', unit:'orang', baseline:0, target:20, actual:20, achievement:'Achieving',
    evidence:[{url:demoUrl,strength:'Outcome',source:'Pihak ketiga',verified:true}], reason:'Contoh hasil terukur yang perlu diganti dengan bukti uji.'},
    {id:'B',title:'Penerima manfaat menyelesaikan pendampingan',unit:'orang',baseline:0,target:20,actual:12,achievement:'Progressing',
    evidence:[{url:demoUrl,strength:'Mutu',source:'Laporan diri',verified:true}],reason:'Contoh kemajuan yang masih perlu ditingkatkan.'}],
   grades:{}, kpiResults:{}, leadership:{ MAY:{period:'MAY',items:competencies.map((competency,j)=>({competency,level:[2,3,2,2,3,3][j],evidenceUrl:demoUrl,reason:'Perilaku pada kompetensi ini ditunjukkan dalam contoh kegiatan.'}))}},
   leadershipDrafts:{}, forms:{}, reviewChecks:{}, completeReviews:['FEB','MAY'],
   pocLockedAt:'2027-01-31T10:00:00+07:00', portfolioUrl:null, showcaseAttended:null,
   mentoringAttended:5, checkinsAttended:10, surveys:{}, published:{}, mentoring:[], access:[]
  };
 }
 return {schemaVersion:1, members, records, escalations:[],notifications:[],audit:[],
  config:{mentoringTotal:11,mentoringMinimum:9,checkinTotal:22,checkinMinimum:18},
  staffChecks:{}, holidays:[], simulatedAt:'2027-05-31T10:00:00+07:00'};
}
export function actorFor(role,member) {
 return {id:role==='Mentee'?member.id:role==='Admin'?'admin':`${role}:${member.group}`,role,adminFunctions:role==='Admin'?['Program','L&C Lead','Tim Penilaian']:[]};
}
function scopeFor(member,review,record) { return {menteeId:member.id,assignedAsmenId:`Asmen:${member.group}`,assignedSmId:`SM:${member.group}`,review,pocLocked:Boolean(record.pocLockedAt)}; }
export function assertAccess(state,actor,memberId,action,review='MAY') {
 const member=state.members.find(m=>m.id===memberId); requireRule(member,'MEMBER','Mentee tidak ditemukan.');
 requireRule(can(actor,action,scopeFor(member,review,state.records[memberId])),'FORBIDDEN','Aksi ini hanya untuk peran yang bertugas.');
 return state.records[memberId];
}
export function calculate(state,memberId,period) {
 const record=state.records[memberId];
 const cutoff=new Date(`${periodDates[period]}T23:59:59+07:00`).getTime();
 return scoreMentee({review:period,checkins:record.checkins.filter(c=>new Date(c.occurredAt).getTime()<=cutoff&&c.effective&&c.assessmentComplete).map(c=>c.effective),
  kpis:(record.kpiResults[period]??record.kpis).map(k=>({...k,evidence:[...k.evidence,...record.checkins.filter(c=>new Date(c.occurredAt).getTime()<=cutoff&&c.form?.kpiId===k.id&&c.evidenceUrl).map(c=>({url:c.evidenceUrl,strength:c.verifiedStrength??c.form.strength??'Aktivitas',source:c.form.source??'Laporan diri',verified:c.evidenceVerified===true}))],achievement:record.grades[period]?.[k.id]?.level??k.achievement})),
  leadership:record.leadership[period],mayLeadership:record.leadership.MAY});
}
export function graduation(state,memberId,period) {
 const r=state.records[memberId];
 return evaluateGraduation({asOf:`${periodDates[period]}T23:59:59+07:00`,finalDataClosed:period==='NOV',pocLockedAt:r.pocLockedAt,
 completeReviews:r.completeReviews,portfolioUrl:r.portfolioUrl,showcaseAttended:r.showcaseAttended,
 mentoringAttended:r.mentoringAttended,checkinsAttended:r.checkinsAttended,config:state.config});
}
function audit(state,actor,memberId,action,detail) { state.audit.unshift({id:`a${state.audit.length+1}`,at:state.simulatedAt,actor:actor.role,memberId,action,detail}); }
function notify(state,key,message,recipients,dueAt=null) {
 if(!state.notifications.some(n=>n.key===key))state.notifications.unshift({key,message,recipients,dueAt,status:'SIMULASI — belum dikirim'});
}
function addEscalation(state,escalation,memberId) {
 if(!escalation||state.escalations.some(e=>e.key===escalation.key))return;
 state.escalations.unshift({...escalation,memberId,createdAt:state.simulatedAt,status:'OPEN',plan:null});
 notify(state,escalation.key,escalation.kind==='CHECKIN_RED'?'Check-in Red: SM dan Admin perlu menindaklanjuti.':escalation.kind==='LOW_SCORE'?'Skor berisiko: Asmen dan SM perlu menyusun rencana perbaikan.':'Dua mentoring berurutan tertunda: perlu bantuan L&C Lead.',escalation.recipients,escalation.dueAt);
}
export function submitCheckin(state,actor,memberId,form) {
 const r=assertAccess(state,actor,memberId,'EDIT_OWN_FORM');
 for(const key of ['activity','result','learning','obstacle','action','dueAt'])requireRule(form[key],'REQUIRED','Lengkapi lima pertanyaan dan tenggat.');
 requireRule(!form.evidenceUrl||validUrl(form.evidenceUrl),'EVIDENCE_URL','Tautan bukti harus berupa HTTP/HTTPS.');
 requireRule(form.reason?.trim(),'REASON','Isi satu kalimat alasan.');
 const pending=r.checkins.find(c=>!c.effective);
 requireRule(!pending,'PENDING','Check-in sebelumnya menunggu warna dari Asmen.');
 const id=`${memberId}-c${r.checkins.length+1}`;
 r.checkins.push({id,occurredAt:state.simulatedAt,form:{...form},evidenceUrl:form.evidenceUrl,reason:form.reason,effective:null,requested:null});
 r.forms.checkin={...form,submittedAt:state.simulatedAt,id}; audit(state,actor,memberId,'Kirim check-in',id);
}
export function gradeCheckin(state,actor,memberId,input) {
 const r=assertAccess(state,actor,memberId,'SET_STATUS');
 const current=r.checkins.find(c=>!c.effective||!c.assessmentComplete); requireRule(current,'NO_PENDING','Belum ada check-in menunggu warna; kirim form sebagai Mentee dahulu.');
 const previous=r.checkins.filter(c=>c.effective&&c.id!==current.id&&new Date(c.occurredAt)<new Date(current.occurredAt)).at(-1);
 const result=resolveCheckin({id:current.id,occurredAt:current.occurredAt,assessedAt:state.simulatedAt,requested:input.status,
 evidenceUrl:input.evidenceUrl??current.evidenceUrl,reason:input.reason,correction:{action:current.form.action,dueAt:current.form.dueAt},
 improvementSincePrevious:input.improved,previous,holidays:state.holidays});
 Object.assign(current,result,{assessedAt:state.simulatedAt,reason:input.reason,evidenceUrl:input.evidenceUrl??current.evidenceUrl,evidenceVerified:input.verified===true,verifiedStrength:input.strength??current.form.strength??'Aktivitas'});
 addEscalation(state,result.escalation,memberId); audit(state,actor,memberId,'Tetapkan warna',result.effective); return result;
}
export function submitMentoring(state,actor,memberId,form) {
 const r=assertAccess(state,actor,memberId,'EDIT_OWN_FORM');
 for(const key of ['priority','insight','decision','action','brought','dueAt'])requireRule(form[key],'REQUIRED','Lengkapi catatan mentoring.');
 if(form.brought==='Bukti tersedia')requireRule(validUrl(form.evidenceUrl),'EVIDENCE_URL','Lampirkan link bukti yang dibawa.');
 r.forms.mentoring={...form,submittedAt:state.simulatedAt,confirmed:false}; audit(state,actor,memberId,'Kirim mentoring','Menunggu konfirmasi SM');
}
export function confirmMentoring(state,actor,memberId,input) {
 const r=assertAccess(state,actor,memberId,'READ'); requireRule(actor.role==='SM' || actor.role==='Admin','FORBIDDEN','Konfirmasi hanya oleh SM yang ditugaskan.');
 requireRule(r.forms.mentoring,'NO_FORM','Mentee belum mengirim form mentoring.');
 if(input.access!=='Belum pada sesi ini') {
  requireRule(validUrl(input.url)&&input.reason?.trim(),'ACCESS_EVIDENCE','Akses memerlukan bukti dan satu kalimat alasan.');
  r.access.push({kind:input.access,url:input.url,reason:input.reason,semester:'Semester 1',providedAt:state.simulatedAt});
 }
 r.forms.mentoring.confirmed=input.confirmation==='Sesuai hasil mentoring'; audit(state,actor,memberId,'Konfirmasi mentoring',input.confirmation);
}
export function submitReview(state,actor,memberId,period,results) {
 const r=assertAccess(state,actor,memberId,'EDIT_OWN_FORM',period);
 requireRule(results.length===r.kpis.length,'KPI_COUNT','Isi semua KPI.');
 const normalized=results.map((input,i)=>{
  requireRule(Number.isInteger(input.actual)&&input.actual>=0&&input.actual<=30,'ACTUAL','Pilih hasil aktual pada katalog contoh 0–30.');
  requireRule(input.reason?.trim(),'REASON','Setiap hasil KPI memerlukan satu kalimat alasan.');
  requireRule(!input.url||validUrl(input.url),'EVIDENCE_URL','Tautan bukti harus valid.');
  const k=r.kpis[i], existing=k.evidence.find(e=>e.url===input.url&&e.strength===input.strength&&e.source===input.source);
  return {actual:input.actual,reason:input.reason,evidence:input.url?[{url:input.url,strength:input.strength,source:input.source,verified:Boolean(existing?.verified)}]:[]};
 });
 r.kpiResults[period]=r.kpis.map((k,i)=>({...structuredClone(k),...normalized[i]}));
 r.forms[`review:${period}`]={submittedAt:state.simulatedAt}; r.reviewChecks[period]=false;
 audit(state,actor,memberId,'Kirim Review',period);
}
export function verifyReview(state,actor,memberId,period,inputs) {
 const r=assertAccess(state,actor,memberId,'VERIFY_EVIDENCE',period);
 requireRule(r.forms[`review:${period}`],'NO_FORM','Mentee perlu mengirim Review terlebih dahulu.');
 inputs.forEach((input,i)=>{for(const e of r.kpiResults[period][i].evidence){e.strength=input.strength;e.verified=input.verified;}});
 r.reviewChecks[period]=inputs.every(i=>i.complete); audit(state,actor,memberId,'Periksa Review',r.reviewChecks[period]?'Lengkap':'Perlu dilengkapi');
}
export function gradeReview(state,actor,memberId,period,grades,publish) {
 const r=assertAccess(state,actor,memberId,'GRADE_OUTCOME',period);
 requireRule(r.forms[`review:${period}`]&&r.reviewChecks[period],'REVIEW_UNCHECKED','Review harus dikirim mentee dan diperiksa Asmen.');
 for(const k of r.kpis)requireRule(grades[k.id]?.reason?.trim(),'REASON','Isi satu kalimat alasan setiap level.');
 const previous=r.grades[period]; r.grades[period]=grades;
 let result;
 try {result=calculate(state,memberId,period);}catch(error){if(previous)r.grades[period]=previous;else delete r.grades[period];throw error;}
 if(publish) {
  requireRule(!r.checkins.some(c=>new Date(c.occurredAt).getTime()<=new Date(`${periodDates[period]}T23:59:59+07:00`).getTime()&&(!c.effective||!c.assessmentComplete)),'PENDING_CHECKIN','Lengkapi seluruh status check-in sebelum menerbitkan.');
  const snapshotId=`${memberId}:${period}:${(r.published[period]?.version??0)+1}`;
  r.published[period]={...result,version:(r.published[period]?.version??0)+1,publishedAt:state.simulatedAt};
  r.completeReviews=[...new Set([...r.completeReviews,period])];
  const task=scoreFollowup({snapshotId,score:result.score,publishedAt:state.simulatedAt});
  addEscalation(state,task.escalation,memberId);
  if(task.type==='MENTORING_AGENDA')notify(state,snapshotId,'Skor memerlukan dukungan: bahas khusus pada mentoring berikutnya.',['Mentee','Asmen','SM']);
 }
 audit(state,actor,memberId,publish?'Terbitkan Review':'Simpan penilaian',period); return result;
}
export function submitLeadership(state,actor,memberId,period,items) {
 const r=assertAccess(state,actor,memberId,'EDIT_OWN_FORM',period);
 requireRule(['MAY','NOV'].includes(period),'PERIOD','Kepemimpinan hanya diisi pada Mei/November.');
 requireRule(items.length===6&&items.every((i,j)=>i.competency===competencies[j]&&validUrl(i.evidenceUrl)&&i.reason.trim()),'LEADERSHIP_EVIDENCE','Enam kompetensi memerlukan link dan satu kalimat alasan.');
 r.leadershipDrafts[period]=items; audit(state,actor,memberId,'Kirim bukti kepemimpinan',period);
}
export function gradeLeadership(state,actor,memberId,period,items) {
 const r=assertAccess(state,actor,memberId,'GRADE_LEADERSHIP',period);
 requireRule(items.length===6&&items.every((item,j)=>item.competency===competencies[j]&&Number.isInteger(item.level)&&item.level>=1&&item.level<=4&&validUrl(item.evidenceUrl)&&item.reason.trim()),'LEADERSHIP','Lengkapi enam level, bukti, dan alasan.');
 r.leadership[period]={period,items}; audit(state,actor,memberId,'Nilai kepemimpinan',period);
}
export function submitSurvey(state,actor,memberId,period,form) {
 const r=assertAccess(state,actor,memberId,'EDIT_OWN_FORM',period);
 requireRule([form.asmen,form.sm].every(n=>Number.isInteger(n)&&n>=1&&n<=4),'SURVEY','Nilai survei harus 1–4.');
 r.surveys[period]={...form,submittedAt:state.simulatedAt};audit(state,actor,memberId,'Kirim survei',period);
}
export function staffResult(state,group,role,period) {
 const people=state.members.filter(m=>m.group===group);
 const answers=people.map(p=>state.records[p.id].surveys[period]?.[role==='Asmen'?'asmen':'sm']).filter(n=>n!=null);
 const average=answers.length?answers.reduce((s,n)=>s+n,0)/answers.length:null;
 const manual=state.staffChecks[`${group}:${role}:${period}`]??[true,true,true,true,true,true];
 const result=role==='Asmen'?scoreAsmen({checkinsHeld:{numerator:manual[0]?10:8,denominator:10},statusTimely:manual[1],redEscalatedTimely:manual[2],completeNotes:{numerator:manual[3]?9:8,denominator:10},summariesBeforeMentoring:{numerator:manual[4]?5:4,denominator:5},noRoleViolationReport:manual[5],surveyAverage:average}):
 scoreSeniorMentor({mentoringHeld:{numerator:manual[0]?5:4,denominator:5},noConsecutivePostponements:manual[1],allPocLockedOnTime:manual[2],allReviewsGradedWithin7Days:manual[3],accessForEveryMenteePerSemester:manual[4],noDecisionOnBehalfReport:manual[5],surveyAverage:average});
 return {...result,average,responses:answers.length};
}
export function simulateRed(state,actor,memberId) {
 requireRule(actor.role==='Admin','FORBIDDEN','Skenario uji hanya untuk Admin.');
 const member=state.members.find(m=>m.id===memberId), mentee=actorFor('Mentee',member), asmen=actorFor('Asmen',member);
 const previousTime=state.simulatedAt;
 try {
  for(let i=0;i<2;i++) {
   state.simulatedAt=`2027-06-${i===0?'01':'15'}T10:00:00+07:00`;
   submitCheckin(state,mentee,memberId,{activity:'Melakukan langkah perbaikan',result:'Ada hasil, belum sesuai rencana',learning:'Menemukan cara kerja yang lebih baik',obstacle:'Data atau bukti',action:'Melengkapi bukti',dueAt:'2027-06-30T10:00:00+07:00',evidenceUrl:demoUrl,reason:'Skenario uji dua Yellow tanpa perbaikan.'});
   gradeCheckin(state,asmen,memberId,{status:'Yellow',improved:false,reason:'Perbaikan belum terlihat pada bukti contoh.'});
  }
 }finally{state.simulatedAt=previousTime;}
}
export function updatePlan(state,actor,key,action,reason) {
 const escalation=state.escalations.find(e=>e.key===key); requireRule(escalation,'ESCALATION','Tugas tidak ditemukan.');
 assertAccess(state,actor,escalation.memberId,'READ');
 requireRule(['Asmen','SM'].includes(actor.role),'FORBIDDEN','Rencana dikonfirmasi Asmen dan SM.');
 requireRule(action&&reason.trim(),'PLAN','Isi langkah perbaikan dan satu kalimat alasan.');
 escalation.plan??={action,reason,confirmed:[]};
 requireRule(escalation.plan.action===action&&escalation.plan.reason===reason,'PLAN_CHANGED','Gunakan rencana yang sama untuk konfirmasi bersama.');
 escalation.plan.confirmed=[...new Set([...escalation.plan.confirmed,actor.role])];
 if(escalation.plan.confirmed.includes('Asmen')&&escalation.plan.confirmed.includes('SM'))escalation.status='ACKNOWLEDGED';
 audit(state,actor,escalation.memberId,'Konfirmasi rencana',key);
}
export function updateGraduation(state,actor,memberId,input) {
 requireRule(actor.role==='Admin','FORBIDDEN','Data kelulusan contoh dikelola Admin.');
 const r=state.records[memberId];const candidate={...r,...input};
 evaluateGraduation({asOf:'2027-11-30T23:59:59+07:00',finalDataClosed:true,pocLockedAt:candidate.pocLockedAt,completeReviews:candidate.completeReviews,portfolioUrl:candidate.portfolioUrl,showcaseAttended:candidate.showcaseAttended,mentoringAttended:candidate.mentoringAttended,checkinsAttended:candidate.checkinsAttended,config:state.config});
 Object.assign(r,input);audit(state,actor,memberId,'Ubah data kelulusan contoh','Tidak mengubah skor');
}
export function simulateDelay(state,actor,memberId) {
 requireRule(actor.role==='Admin','FORBIDDEN','Skenario uji hanya untuk Admin.');
 addEscalation(state,mentoringDelay({sessionId:`${memberId}-delay`,currentPostponed:true,previousScheduledSessionPostponed:true}),memberId);
}
export function reminders(state,actor,memberId) {
 requireRule(actor.role==='Admin','FORBIDDEN','Simulasi pengingat hanya untuk Admin.');
 const entries=[['CHECKIN_H2','Check-in dua hari lagi. Siapkan hasil, bukti, dan langkah berikutnya.',['Mentee','Asmen']],['MENTORING_H2','Mentoring dua hari lagi. Siapkan prioritas dan bukti kemajuan.',['Mentee','SM','Asmen']],['ABC_H1','Catatan ABC sesi kemarin belum lengkap. Lengkapi hasil, pembelajaran, dan langkah berikutnya.',['Mentee']],['REVIEW_H7','Review tujuh hari lagi. Siapkan hasil aktual dan bukti setiap KPI.',['Mentee','Asmen','SM']],['FORM_OVERDUE_3','Form terlambat tiga hari. Lengkapi segera; salinan pengingat kepada Asmen.',['Mentee','Asmen (CC)']]];
 for(const [type,message,to] of entries)notify(state,`${type}:${memberId}`,`${memberId}: ${message}`,to);
 audit(state,actor,memberId,'Simulasi pengingat','Pesan contoh tidak dikirim');
}
