import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../assets/assessment/model.js';
import { competencies } from '../assets/assessment/scoring.js';
const setup=()=>{const state=m.initialState(),member=state.members[0];return {state,mentee:m.actorFor('Mentee',member),asmen:m.actorFor('Asmen',member),sm:m.actorFor('SM',member),admin:m.actorFor('Admin',member)};};
function reviewResults(url=m.demoUrl){return [{actual:20,url,strength:'Outcome',source:'Pihak ketiga',reason:'Hasil KPI A didukung bukti contoh.'},{actual:12,url,strength:'Mutu',source:'Laporan diri',reason:'Hasil KPI B masih berkembang.'}];}
const verification=[{complete:true,verified:true,strength:'Outcome'},{complete:true,verified:true,strength:'Mutu'}];
const grades={A:{level:'Achieving',reason:'Hasil mencapai target dengan bukti Outcome.'},B:{level:'Progressing',reason:'Hasil masih dalam batas kemajuan.'}};
test('fixture situs: 10 mentee, dua kelompok berisi lima, contoh utama 67',()=>{
 const {state}=setup();assert.equal(state.members.length,10);assert.equal(state.members.filter(p=>p.group==='Kelompok 01').length,5);
 assert.equal(m.calculate(state,'m1','MAY').score,67);assert.equal(m.calculate(state,'m1','AUG').score,67);
});
test('alur kirim check-in → warna Asmen; mentee ditolak jika menetapkan warna',()=>{
 const {state,mentee,asmen}=setup();m.submitCheckin(state,mentee,'m1',{activity:'Menjalankan langkah POC',result:'Sesuai rencana',learning:'Menemukan cara kerja baru',obstacle:'Tidak ada',action:'Melengkapi bukti',dueAt:'2027-06-07T17:00:00+07:00',evidenceUrl:m.demoUrl,reason:'Langkah periode ini selesai.'});
 assert.equal(state.records.m1.checkins.at(-1).effective,null);
 assert.throws(()=>m.gradeCheckin(state,mentee,'m1',{status:'Green',reason:'Selesai.',improved:true}));
 assert.equal(m.gradeCheckin(state,asmen,'m1',{status:'Green',reason:'Bukti dan hasil sudah diperiksa.',improved:true}).effective,'Green');
 assert.equal(state.records.m1.checkins.length,11);
});
test('Review terpisah per periode dan harus melewati pemeriksaan Asmen',()=>{
 const {state,mentee,asmen,sm}=setup();m.submitReview(state,mentee,'m1','MAY',reviewResults('https://example.org/bukti-baru'));
 assert.equal(state.records.m1.kpiResults.MAY[0].evidence[0].verified,false);
 assert.throws(()=>m.gradeReview(state,sm,'m1','MAY',grades,true));
 m.verifyReview(state,asmen,'m1','MAY',verification);const result=m.gradeReview(state,sm,'m1','MAY',grades,true);
 assert.equal(result.score,67);assert.equal(state.records.m1.published.MAY.score,67);
 m.submitReview(state,mentee,'m1','FEB',reviewResults(''));
 assert.equal(state.records.m1.kpiResults.MAY[0].evidence[0].url,'https://example.org/bukti-baru');
 assert.equal(state.records.m1.published.MAY.score,67);
});
test('skenario dua Yellow situs menciptakan satu Red dan eskalasi unik',()=>{
 const {state,admin}=setup();m.simulateRed(state,admin,'m1');
 assert.equal(state.records.m1.checkins.at(-1).effective,'Red');assert.equal(state.records.m1.checkins.at(-1).automaticRed,true);
 assert.equal(state.escalations.length,1);assert.equal(state.notifications.length,1);assert.equal(state.simulatedAt,'2027-05-31T10:00:00+07:00');
});
test('Review tanpa bukti menghasilkan skor risiko dan rencana perlu dua konfirmasi',()=>{
 const {state,mentee,asmen,sm}=setup();m.submitReview(state,mentee,'m1','MAY',reviewResults(''));
 m.verifyReview(state,asmen,'m1','MAY',verification.map(v=>({...v,verified:false})));
 const result=m.gradeReview(state,sm,'m1','MAY',grades,true);assert.equal(result.score,35);
 const task=state.escalations[0];assert.equal(task.kind,'LOW_SCORE');
 m.updatePlan(state,asmen,task.key,'Melengkapi bukti','Lengkapi bukti hasil sebelum tenggat.');assert.equal(task.status,'OPEN');
 m.updatePlan(state,sm,task.key,'Melengkapi bukti','Lengkapi bukti hasil sebelum tenggat.');assert.equal(task.status,'ACKNOWLEDGED');
});
test('SM tidak dapat menilai November dan Admin menyelesaikan kepemimpinan November',()=>{
 const {state,mentee,asmen,sm,admin}=setup();m.submitReview(state,mentee,'m1','NOV',reviewResults());m.verifyReview(state,asmen,'m1','NOV',verification);
 assert.throws(()=>m.gradeReview(state,sm,'m1','NOV',grades,true));assert.throws(()=>m.gradeReview(state,admin,'m1','NOV',grades,true));
 m.gradeLeadership(state,admin,'m1','NOV',competencies.map((competency,i)=>({competency,level:[2,3,2,2,3,3][i],evidenceUrl:m.demoUrl,reason:'Bukti mendukung level kompetensi ini.'})));
 assert.equal(m.gradeReview(state,admin,'m1','NOV',grades,true).score,67);
});
test('survei mentee memperbarui skor Asmen dan SM; tidak ada respons berarti null',()=>{
 const {state,mentee}=setup();assert.equal(m.staffResult(state,'Kelompok 01','SM','MAY').score,null);
 m.submitSurvey(state,mentee,'m1','MAY',{asmen:3,sm:4,comment:'Dukungan membantu.'});
 assert.equal(m.staffResult(state,'Kelompok 01','Asmen','MAY').score,100);
 assert.equal(m.staffResult(state,'Kelompok 01','SM','MAY').average,4);
});
test('data kelulusan tidak mengubah skor dan masih membutuhkan empat Review',()=>{
 const {state,admin}=setup();const score=m.calculate(state,'m1','MAY').score;
 m.updateGraduation(state,admin,'m1',{mentoringAttended:9,checkinsAttended:18,showcaseAttended:true,portfolioUrl:m.demoUrl});
 assert.equal(m.calculate(state,'m1','MAY').score,score);assert.equal(m.graduation(state,'m1','NOV').status,'Belum memenuhi');
 state.records.m1.completeReviews=['FEB','MAY','AUG','NOV'];assert.equal(m.graduation(state,'m1','NOV').status,'Lulus');
});
test('mentoring dikonfirmasi SM; akses memerlukan bukti dan alasan',()=>{
 const {state,mentee,sm}=setup();m.submitMentoring(state,mentee,'m1',{priority:'Dukungan/akses',insight:'Arah lebih jelas',decision:'Melanjutkan langkah',action:'Meminta dukungan',brought:'Bukti tersedia',evidenceUrl:m.demoUrl,dueAt:'2027-06-07T17:00:00+07:00'});
 assert.throws(()=>m.confirmMentoring(state,sm,'m1',{access:'Jejaring',url:'',reason:'',confirmation:'Sesuai hasil mentoring'}));
 m.confirmMentoring(state,sm,'m1',{access:'Jejaring',url:m.demoUrl,reason:'Akses diberikan untuk membantu pelaksanaan.',confirmation:'Sesuai hasil mentoring'});
 assert.equal(state.records.m1.forms.mentoring.confirmed,true);assert.equal(state.records.m1.access.length,1);
});
test('role dan kelompok membatasi mutasi model; simulasi pengingat tidak menggandakan',()=>{
 const {state,mentee,asmen,admin}=setup();assert.throws(()=>m.assertAccess(state,mentee,'m2','READ'));assert.throws(()=>m.assertAccess(state,asmen,'m6','SET_STATUS'));
 m.reminders(state,admin,'m1');m.reminders(state,admin,'m1');assert.equal(state.notifications.length,5);
 m.simulateDelay(state,admin,'m1');m.simulateDelay(state,admin,'m1');assert.equal(state.escalations.length,1);
 assert.ok(state.notifications.every(n=>n.status.includes('belum dikirim')));
});
test('check-in Juni tidak mengubah skor Review Mei yang sudah lewat cutoff',()=>{
 const {state,admin}=setup();const before=m.calculate(state,'m1','MAY').score;m.simulateRed(state,admin,'m1');
 assert.equal(m.calculate(state,'m1','MAY').score,before);assert.ok(m.calculate(state,'m1','AUG').score<before);
});
test('bukti check-in berkontribusi ke P4 hanya setelah pemeriksaan Asmen',()=>{
 const {state,mentee,asmen}=setup();
 m.submitCheckin(state,mentee,'m1',{activity:'Langkah POC',result:'Ada hasil',learning:'Belajar',obstacle:'Tidak ada',action:'Melengkapi bukti',dueAt:'2027-06-07T17:00:00+07:00',evidenceUrl:'https://example.org/bukti-b',reason:'Perubahan pada KPI B dapat ditunjukkan.',kpiId:'B',strength:'Outcome',source:'Pihak ketiga'});
 assert.equal(m.calculate(state,'m1','MAY').components.p4,16);
 m.gradeCheckin(state,asmen,'m1',{status:'Green',reason:'Bukti mendukung perubahan.',improved:true,verified:true,strength:'Outcome'});
 assert.equal(m.calculate(state,'m1','MAY').components.p4,19);
});
test('Yellow tanpa link tetap dicatat; Asmen bisa melengkapi link tanpa menggandakan check-in',()=>{
 const {state,mentee,asmen}=setup();m.submitCheckin(state,mentee,'m1',{activity:'Langkah POC',result:'Belum ada bukti',learning:'Belajar',obstacle:'Data',action:'Melengkapi bukti',dueAt:'2027-06-07T17:00:00+07:00',evidenceUrl:'',reason:'Bukti perlu dilengkapi.'});
 const result=m.gradeCheckin(state,asmen,'m1',{status:'Yellow',reason:'Bukti belum tersedia.',improved:false});assert.equal(result.assessmentComplete,false);
 m.gradeCheckin(state,asmen,'m1',{status:'Yellow',reason:'Bukti proses telah dilengkapi.',evidenceUrl:m.demoUrl,improved:false});
 assert.equal(state.records.m1.checkins.length,11);assert.equal(state.records.m1.checkins.at(-1).assessmentComplete,true);
});
