import { test } from 'node:test';
import assert from 'node:assert/strict';
import { competencies, scoreMentee, scoreStaff, scoreAsmen, scoreSeniorMentor, classify } from '../src/scoring.ts';
import type { Evidence, LeadershipAssessment, MenteeInput } from '../src/scoring.ts';
const evidence = (strength: Evidence['strength']): Evidence => ({ url: 'https://example.org/bukti', strength, source: 'Pihak ketiga', verified: true });
const leadership = (period: 'MAY' | 'NOV' = 'MAY', levels = [2,3,2,2,3,3]): LeadershipAssessment => ({ period,
 items: competencies.map((competency, i) => ({ competency, level: levels[i], evidenceUrl: 'https://example.org/kepemimpinan', reason: 'Perilaku tampak pada hasil kerja kelompok.' })) });
function sample(): MenteeInput {
 return { review: 'MAY', checkins: ['Green','Green','Yellow','Green','Green','Yellow','Green','Green','Red','Green'],
 kpis: [{ id: 'A', achievement: 'Achieving', evidence: [evidence('Outcome')] },
 { id: 'B', achievement: 'Progressing', evidence: [evidence('Mutu')] }], leadership: leadership() };
}
const error = (code: string) => (e: unknown) => (e as {code?: string}).code === code;
test('contoh wajib: 19 + 16 + 16 + 16 = 67, Perlu dukungan', () => {
 const result = scoreMentee(sample());
 assert.deepEqual(result.components, { p1: 19, p2: 16, p3: 16, p4: 16 });
 assert.equal(result.score, 67); assert.equal(result.category, 'Perlu dukungan');
 assert.equal(result.color, 'yellow');
 assert.equal(Math.round(result.raw.p1 + result.raw.p2 + result.raw.p3! + result.raw.p4), 66);
});
test('Februari tidak memakai P3; bulatkan komponen lalu normalisasi', () => {
 const input = sample(); input.review = 'FEB'; delete input.leadership;
 const result = scoreMentee(input); assert.equal(result.score, 68); assert.equal(result.components.p3, null);
});
test('Agustus memakai Mei, bukan nilai November yang juga dikirim', () => {
 const input = sample(); input.review = 'AUG'; input.mayLeadership = leadership(); input.leadership = leadership('NOV', [4,4,4,4,4,4]);
 const result = scoreMentee(input); assert.equal(result.score, 67); assert.equal(result.leadershipSource, 'MAY');
});
test('Agustus tanpa hasil Mei ditahan, bukan memakai nol', () => {
 const input = sample(); input.review = 'AUG'; assert.throws(() => scoreMentee(input), error('INCOMPLETE_LEADERSHIP'));
});
test('November menolak nilai Mei sebagai nilai akhir', () => {
 const input = sample(); input.review = 'NOV'; assert.throws(() => scoreMentee(input), error('INCOMPLETE_LEADERSHIP'));
});
test('tanpa tautan: Achieving otomatis Not Achieved', () => {
 const input = sample(); input.kpis[0].evidence = [];
 const result = scoreMentee(input); assert.equal(result.components.p2, 6); assert.equal(result.components.p4, 6);
 assert.match(result.warnings[0], /Not Achieved/);
});
for (const achievement of ['Achieving', 'Exceeding'] as const) {
 test(`${achievement} dengan bukti Mutu ditolak`, () => {
  const input = sample(); input.kpis[0].achievement = achievement; input.kpis[0].evidence = [evidence('Mutu')];
  assert.throws(() => scoreMentee(input), error('OUTCOME_REQUIRED'));
 });
}
test('Outcome yang belum diverifikasi tidak membuka Achieving', () => {
 const input = sample(); input.kpis[0].evidence[0].verified = false;
 assert.throws(() => scoreMentee(input), error('OUTCOME_REQUIRED'));
});
test('P4 memilih bukti terkuat per KPI, tidak menjumlahkan tautan', () => {
 const input = sample(); input.kpis[0].evidence = [evidence('Aktivitas'), evidence('Output'), evidence('Keberlanjutan'), evidence('Outcome')];
 const result = scoreMentee(input); assert.equal(result.components.p4, 19);
});
test('P4 mengabaikan tag yang menunggu verifikasi dan memberi peringatan', () => {
 const input = sample(); input.kpis[1].evidence.push({ ...evidence('Keberlanjutan'), verified: false });
 const result = scoreMentee(input); assert.equal(result.components.p4, 16); assert.match(result.warnings[0], /menunggu verifikasi/);
});
test('tautan javascript ditolak', () => {
 const input = sample(); input.kpis[0].evidence[0].url = 'javascript:alert(1)';
 assert.throws(() => scoreMentee(input), error('EVIDENCE_URL'));
});
test('tidak ada check-in adalah belum lengkap', () => {
 const input = sample(); input.checkins = []; assert.throws(() => scoreMentee(input), error('INCOMPLETE_CHECKINS'));
});
test('POC tidak boleh 0 atau 4 KPI', () => {
 const input = sample(); input.kpis = []; assert.throws(() => scoreMentee(input), error('KPI_COUNT'));
 input.kpis = [0,1,2,3].map(i => ({ id: String(i), achievement: 'Not Achieved', evidence: [] }));
 assert.throws(() => scoreMentee(input), error('KPI_COUNT'));
});
test('KPI duplikat ditolak', () => {
 const input = sample(); input.kpis[1].id = 'A'; assert.throws(() => scoreMentee(input), error('KPI_ID'));
});
test('kepemimpinan wajib tepat enam kompetensi unik', () => {
 const input = sample(); input.leadership!.items.pop(); assert.throws(() => scoreMentee(input), error('INCOMPLETE_LEADERSHIP'));
 const other = sample(); other.leadership!.items[1].competency = 'Mengenal diri'; assert.throws(() => scoreMentee(other), error('COMPETENCY'));
});
test('kepemimpinan wajib alasan, tautan, dan level 1–4', () => {
 for (const bad of ['reason', 'url', 'level']) {
  const input = sample(); const item = input.leadership!.items[0];
  if (bad === 'reason') item.reason = ' ';
  if (bad === 'url') item.evidenceUrl = '';
  if (bad === 'level') item.level = 0;
  assert.throws(() => scoreMentee(input));
 }
});
test('skor maksimum tepat 100, baik empat komponen maupun Februari', () => {
 const input: MenteeInput = { review: 'MAY', checkins: ['Green'], kpis: [{ id: 'A', achievement: 'Exceeding', evidence: [evidence('Keberlanjutan')] }], leadership: leadership('MAY', [4,4,4,4,4,4]) };
 assert.equal(scoreMentee(input).score, 100); input.review = 'FEB'; assert.equal(scoreMentee(input).score, 100);
});
test('batas kategori 49/50, 69/70, 84/85', () => {
 for (const [score, category] of [[0,'Berisiko'],[49,'Berisiko'],[50,'Perlu dukungan'],[69,'Perlu dukungan'],[70,'Baik'],[84,'Baik'],[85,'Unggul'],[100,'Unggul']] as const) assert.equal(classify(score).category, category);
 assert.throws(() => classify(101));
});
test('tujuh ceklis staf dan kategori berdasarkan jumlah, bukan pembulatan', () => {
 for (const [passed, category] of [[7,'Baik'],[6,'Perlu perbaikan'],[5,'Perlu perbaikan'],[4,'Perlu bantuan L&C Lead'],[0,'Perlu bantuan L&C Lead']] as const) {
  const result = scoreStaff(Array.from({ length: 7 }, (_, i) => i < passed));
  assert.equal(result.score, passed / 7 * 100); assert.equal(result.category, category);
 }
});
test('survei/ceklis yang belum tersedia tidak dianggap gagal', () => {
 assert.equal(scoreStaff([true,true,true,true,true,true,null]).score, null);
 assert.throws(() => scoreStaff([true]));
});
test('Asmen ambang 90% dan survei 3,0 tepat termasuk terpenuhi', () => {
 const result = scoreAsmen({ checkinsHeld: { numerator: 9, denominator: 10 }, statusTimely: true, redEscalatedTimely: true,
 completeNotes: { numerator: 9, denominator: 10 }, summariesBeforeMentoring: { numerator: 9, denominator: 10 }, noRoleViolationReport: true, surveyAverage: 3 });
 assert.equal(result.score, 100);
});
test('Asmen tanpa jadwal jatuh tempo belum dapat dinilai', () => {
 const result = scoreAsmen({ checkinsHeld: { numerator: 0, denominator: 0 }, statusTimely: true, redEscalatedTimely: true,
 completeNotes: null, summariesBeforeMentoring: null, noRoleViolationReport: true, surveyAverage: null });
 assert.equal(result.score, null);
});
test('SM 10/11 terpenuhi; proporsional 4/5 belum terpenuhi', () => {
 const metrics = { mentoringHeld: { numerator: 10, denominator: 11 }, noConsecutivePostponements: true, allPocLockedOnTime: true,
 allReviewsGradedWithin7Days: true, accessForEveryMenteePerSemester: true, noDecisionOnBehalfReport: true, surveyAverage: 3 };
 assert.equal(scoreSeniorMentor(metrics).score, 100);
 metrics.mentoringHeld = { numerator: 4, denominator: 5 }; assert.equal(scoreSeniorMentor(metrics).passed, 6);
});
