import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addBusinessDays, resolveCheckin, scoreFollowup, mentoringDelay, evaluateGraduation, can } from '../src/workflows.ts';
import type { CheckinStatusInput, GraduationInput, ResourceScope } from '../src/workflows.ts';
function checkin(): CheckinStatusInput {
 return { id: 'c2', occurredAt: '2027-02-12T09:00:00+07:00', assessedAt: '2027-02-12T10:00:00+07:00',
 requested: 'Yellow', evidenceUrl: 'https://example.org/checkin', reason: 'Hasil belum sesuai rencana.',
 correction: { action: 'Lengkapi bukti', dueAt: '2027-02-15T10:00:00+07:00' },
 previous: { id: 'c1', occurredAt: '2027-01-29T09:00:00+07:00', effective: 'Yellow' }, improvementSincePrevious: false };
}
test('dua Yellow tanpa perbaikan: check-in kedua jadi Red, eskalasi SM+Admin', () => {
 const result = resolveCheckin(checkin()); assert.equal(result.effective, 'Red'); assert.equal(result.automaticRed, true);
 assert.deepEqual(result.escalation?.recipients, ['SM','Admin']);
 assert.equal(result.escalation?.dueAt, '2027-02-16T03:00:00.000Z');
 assert.equal(result.escalation?.key, 'checkin:c2:red');
});
test('dua Yellow dengan perbaikan tetap Yellow', () => {
 const input = checkin(); input.improvementSincePrevious = true;
 assert.equal(resolveCheckin(input).effective, 'Yellow'); assert.equal(resolveCheckin(input).escalation, null);
});
test('Yellow ketiga tanpa perbaikan tetap Red berdasarkan usulan asli sebelumnya', () => {
 const input = checkin(); input.previous!.effective = 'Red'; input.previous!.requested = 'Yellow';
 assert.equal(resolveCheckin(input).effective, 'Red');
});
test('Asmen wajib menentukan apakah ada perbaikan pada Yellow kedua', () => {
 const input = checkin(); delete input.improvementSincePrevious; assert.throws(() => resolveCheckin(input));
});
test('Yellow yang diselingi Green tidak menjadi Red', () => {
 const input = checkin(); input.previous!.effective = 'Green'; assert.equal(resolveCheckin(input).effective, 'Yellow');
});
test('Yellow wajib langkah dan tenggat perbaikan', () => {
 const input = checkin(); delete input.correction; assert.throws(() => resolveCheckin(input));
});
test('urutan check-in tidak boleh terbalik', () => {
 const input = checkin(); input.previous!.occurredAt = '2027-02-13T09:00:00+07:00'; assert.throws(() => resolveCheckin(input));
});
test('Green tanpa bukti ditolak; Red tetap dieskalasi sambil melengkapi bukti', () => {
 const input = checkin(); delete input.evidenceUrl; input.requested = 'Green'; assert.throws(() => resolveCheckin(input));
 input.requested = 'Red'; const result = resolveCheckin(input); assert.ok(result.escalation); assert.equal(result.assessmentComplete, false);
});
test('dua hari kerja melewati akhir pekan dan hari libur', () => {
 assert.equal(addBusinessDays('2027-02-12T10:00:00+07:00', 2, ['2027-02-15']), '2027-02-17T03:00:00.000Z');
});
test('hari kerja mengikuti tanggal Jakarta walaupun UTC masih hari sebelumnya', () => {
 assert.equal(addBusinessDays('2027-02-11T18:00:00Z', 2), '2027-02-15T18:00:00.000Z');
});
test('waktu tanpa zona ditolak', () => { assert.throws(() => addBusinessDays('2027-02-12T10:00:00', 2)); });
test('skor 49: rencana bersama dalam 7 hari kalender; 50 dan 69: agenda mentoring', () => {
 const result = scoreFollowup({ snapshotId: 'r1', score: 49, publishedAt: '2027-02-12T10:00:00+07:00' });
 assert.equal(result.escalation?.dueAt, '2027-02-19T03:00:00.000Z'); assert.deepEqual(result.owners, ['Asmen','SM']);
 for (const score of [50,69]) assert.equal(scoreFollowup({ snapshotId: 'r1', score, publishedAt: '2027-02-12T10:00:00+07:00' }).type, 'MENTORING_AGENDA');
 assert.equal(scoreFollowup({ snapshotId: 'r1', score: 70, publishedAt: '2027-02-12T10:00:00+07:00' }).type, 'NONE');
});
test('dua sesi mentoring berurutan tertunda: eskalasi hanya L&C Lead', () => {
 const result = mentoringDelay({ sessionId: 'm2', currentPostponed: true, previousScheduledSessionPostponed: true });
 assert.deepEqual(result?.recipients, ['Admin:L&C Lead']); assert.equal(result?.dueAt, null);
 assert.equal(mentoringDelay({ sessionId: 'm2', currentPostponed: true, previousScheduledSessionPostponed: false }), null);
});
function graduate(): GraduationInput {
 return { asOf: '2027-11-30T23:59:59+07:00', finalDataClosed: true, pocLockedAt: '2027-01-31T23:59:59+07:00',
 completeReviews: ['FEB','MAY','AUG','NOV'], portfolioUrl: 'https://example.org/portfolio', showcaseAttended: true, mentoringAttended: 9, checkinsAttended: 18 };
}
test('lulus tepat di batas 9/11 dan 18/22; skor bukan input kelulusan', () => {
 assert.equal(evaluateGraduation(graduate()).status, 'Lulus');
});
test('POC terkunci 1 Februari gagal, meski seluruh syarat lain terpenuhi', () => {
 const input = graduate(); input.pocLockedAt = '2027-02-01T00:00:00+07:00'; assert.equal(evaluateGraduation(input).checks.pocLockedOnTime, false);
});
test('tiga Review bukan empat; pengulangan Review ditolak', () => {
 const input = graduate(); input.completeReviews.pop(); assert.equal(evaluateGraduation(input).status, 'Belum memenuhi');
 input.completeReviews.push('FEB'); assert.throws(() => evaluateGraduation(input));
});
test('setiap syarat kelulusan wajib dipenuhi', () => {
 for (const key of ['portfolio','showcase','mentoring','checkin']) {
  const input = graduate();
  if (key === 'portfolio') input.portfolioUrl = null;
  if (key === 'showcase') input.showcaseAttended = false;
  if (key === 'mentoring') input.mentoringAttended = 8;
  if (key === 'checkin') input.checkinsAttended = 17;
  assert.equal(evaluateGraduation(input).status, 'Belum memenuhi');
 }
});
test('ambang kehadiran Admin bisa berubah dan harus valid', () => {
 const input = graduate(); input.config = { mentoringTotal: 11, mentoringMinimum: 10, checkinTotal: 22, checkinMinimum: 18 };
 assert.equal(evaluateGraduation(input).status, 'Belum memenuhi'); input.config.mentoringMinimum = 12; assert.throws(() => evaluateGraduation(input));
});
test('data yang belum jatuh tempo tidak langsung menggagalkan kelulusan', () => {
 const input = graduate(); input.asOf = '2027-01-01T00:00:00+07:00'; input.finalDataClosed = false; input.pocLockedAt = null;
 input.completeReviews = []; input.portfolioUrl = null; input.showcaseAttended = null; input.mentoringAttended = 0; input.checkinsAttended = 0;
 assert.equal(evaluateGraduation(input).status, 'Menunggu data');
});
const scope: ResourceScope = { menteeId: 'p', assignedAsmenId: 'a', assignedSmId: 's', review: 'MAY', pocLocked: true };
test('mentee hanya data sendiri; tidak boleh menetapkan status/level/target terkunci', () => {
 assert.equal(can({ id: 'p', role: 'Mentee' }, 'READ', scope), true);
 for (const action of ['SET_STATUS','GRADE_OUTCOME','EDIT_POC'] as const) assert.equal(can({ id: 'p', role: 'Mentee' }, action, scope), false);
 assert.equal(can({ id: 'other', role: 'Mentee' }, 'READ', scope), false);
});
test('Asmen dibatasi kelompok dan tidak boleh menilai capaian atau mengubah target', () => {
 assert.equal(can({ id: 'a', role: 'Asmen' }, 'SET_STATUS', scope), true);
 assert.equal(can({ id: 'other', role: 'Asmen' }, 'READ', scope), false);
 assert.equal(can({ id: 'a', role: 'Asmen' }, 'GRADE_OUTCOME', scope), false);
 assert.equal(can({ id: 'a', role: 'Asmen' }, 'EDIT_POC', scope), false);
});
test('SM menilai Feb–Agu dan kepemimpinan Mei; November milik Admin', () => {
 assert.equal(can({ id: 's', role: 'SM' }, 'GRADE_OUTCOME', scope), true);
 assert.equal(can({ id: 's', role: 'SM' }, 'GRADE_LEADERSHIP', scope), true);
 assert.equal(can({ id: 's', role: 'SM' }, 'GRADE_OUTCOME', { ...scope, review: 'NOV' }), false);
 assert.equal(can({ id: 'other', role: 'SM' }, 'LOCK_POC', scope), false);
});
test('Tim Penilaian adalah fungsi Admin yang boleh menetapkan kepemimpinan November', () => {
 assert.equal(can({ id: 'admin', role: 'Admin', adminFunctions: ['Tim Penilaian'] }, 'GRADE_LEADERSHIP', { ...scope, review: 'NOV' }), true);
 assert.equal(can({ id: 'admin', role: 'Admin', adminFunctions: ['Program'] }, 'GRADE_LEADERSHIP', { ...scope, review: 'NOV' }), false);
});
