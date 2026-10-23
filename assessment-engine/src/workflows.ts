import { requireRule, validUrl } from './scoring.ts';
import type { Status, Review } from './scoring.ts';

const day = 86_400_000;
function instant(value: string): Date {
  requireRule(/(?:Z|[+-]\d{2}:\d{2})$/.test(value), 'TIMEZONE', 'Waktu harus memuat zona waktu.');
  const parsed = new Date(value);
  requireRule(Number.isFinite(parsed.getTime()), 'DATE', 'Tanggal tidak valid.');
  return parsed;
}
function jakartaDate(date: Date): string {
  return new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}
export function addBusinessDays(value: string, days: number, holidays: string[] = []): string {
  requireRule(Number.isInteger(days) && days >= 0, 'DAYS', 'Jumlah hari kerja harus bilangan bulat nonnegatif.');
  const date = instant(value);
  const blocked = new Set(holidays);
  let added = 0;
  while (added < days) {
    date.setTime(date.getTime() + day);
    const local = new Date(date.getTime() + 7 * 3_600_000);
    if (![0, 6].includes(local.getUTCDay()) && !blocked.has(jakartaDate(date))) added++;
  }
  return date.toISOString();
}
export function addCalendarDays(value: string, days: number): string {
  requireRule(Number.isInteger(days) && days >= 0, 'DAYS', 'Jumlah hari harus bilangan bulat nonnegatif.');
  return new Date(instant(value).getTime() + days * day).toISOString();
}
export interface Escalation {
  key: string; kind: 'CHECKIN_RED' | 'LOW_SCORE' | 'MENTORING_DELAY';
  recipients: string[]; dueAt: string | null; owners: string[];
}
export interface CheckinStatusInput {
  id: string; occurredAt: string; assessedAt: string; requested: Status;
  evidenceUrl?: string; reason: string; correction?: { action: string; dueAt: string };
  improvementSincePrevious?: boolean | null;
  previous?: { id: string; occurredAt: string; effective: Status; requested?: Status };
  holidays?: string[];
}
export function resolveCheckin(input: CheckinStatusInput) {
  requireRule(['Green', 'Yellow', 'Red'].includes(input.requested), 'STATUS', 'Warna tidak valid.');
  requireRule(input.reason.trim(), 'REASON', 'Sertakan satu kalimat alasan.');
  requireRule(instant(input.assessedAt) >= instant(input.occurredAt), 'CHRONOLOGY', 'Status tidak dapat ditetapkan sebelum check-in.');
  const hasEvidence = Boolean(input.evidenceUrl && validUrl(input.evidenceUrl));
  if (input.evidenceUrl) requireRule(hasEvidence, 'EVIDENCE_URL', 'Tautan bukti tidak valid.');
  if (input.requested === 'Green') requireRule(hasEvidence, 'GREEN_EVIDENCE', 'Green memerlukan bukti.');
  if (input.previous) requireRule(input.previous.id !== input.id && instant(input.previous.occurredAt) < instant(input.occurredAt), 'CHRONOLOGY', 'Check-in sebelumnya harus lebih awal.');
  if (input.requested === 'Yellow') {
    requireRule(input.correction?.action.trim() && input.correction.dueAt, 'CORRECTION', 'Yellow memerlukan langkah perbaikan dan tenggat.');
    requireRule(instant(input.correction.dueAt) > instant(input.assessedAt), 'CORRECTION_DUE', 'Tenggat perbaikan harus setelah penilaian.');
  }
  const consecutiveYellow = input.requested === 'Yellow' && (input.previous?.requested ?? input.previous?.effective) === 'Yellow';
  if (consecutiveYellow) requireRule(typeof input.improvementSincePrevious === 'boolean', 'IMPROVEMENT_REQUIRED', 'Asmen perlu mengonfirmasi ada/tidaknya perbaikan.');
  const automaticRed = consecutiveYellow && input.improvementSincePrevious === false;
  const effective: Status = automaticRed ? 'Red' : input.requested;
  const escalation: Escalation | null = effective === 'Red' ? {
    key: `checkin:${input.id}:red`, kind: 'CHECKIN_RED', recipients: ['SM', 'Admin'],
    owners: ['SM', 'Admin'], dueAt: addBusinessDays(input.assessedAt, 2, input.holidays),
  } : null;
  return { requested: input.requested, effective, automaticRed, escalation,
    assessmentComplete: hasEvidence,
    warning: hasEvidence ? null : 'Status dan eskalasi dicatat; penilaian belum lengkap sampai ada tautan bukti/catatan kejadian.' };
}
export function scoreFollowup(input: {
  snapshotId: string; score: number; publishedAt: string; nextMentoringAt?: string;
}) {
  requireRule(Number.isInteger(input.score) && input.score >= 0 && input.score <= 100, 'SCORE_RANGE', 'Skor harus 0–100.');
  instant(input.publishedAt);
  if (input.score < 50) return {
    type: 'IMPROVEMENT_PLAN', owners: ['Asmen', 'SM'],
    escalation: { key: `score:${input.snapshotId}:risk`, kind: 'LOW_SCORE',
      recipients: ['Mentee', 'Asmen', 'SM', 'Admin'], owners: ['Asmen', 'SM'],
      dueAt: addCalendarDays(input.publishedAt, 7) } satisfies Escalation,
  };
  if (input.score < 70) return { type: 'MENTORING_AGENDA', owners: ['Asmen', 'SM'],
    dueAt: input.nextMentoringAt ?? null, escalation: null };
  return { type: 'NONE', owners: [], escalation: null };
}
export function mentoringDelay(input: {
  sessionId: string; currentPostponed: boolean; previousScheduledSessionPostponed: boolean;
}): Escalation | null {
  return input.currentPostponed && input.previousScheduledSessionPostponed ? {
    key: `mentoring:${input.sessionId}:consecutive-delay`, kind: 'MENTORING_DELAY',
    recipients: ['Admin:L&C Lead'], owners: ['Admin:L&C Lead'], dueAt: null,
  } : null;
}
export interface GraduationInput {
  asOf: string; finalDataClosed: boolean; pocLockedAt: string | null;
  completeReviews: Review[]; portfolioUrl: string | null; showcaseAttended: boolean | null;
  mentoringAttended: number; checkinsAttended: number;
  config?: { mentoringTotal: number; mentoringMinimum: number; checkinTotal: number; checkinMinimum: number };
}
export function evaluateGraduation(input: GraduationInput) {
  const config = input.config ?? { mentoringTotal: 11, mentoringMinimum: 9, checkinTotal: 22, checkinMinimum: 18 };
  const asOf = instant(input.asOf);
  const lockDeadline = instant('2027-01-31T23:59:59.999+07:00');
  requireRule(Object.values(config).every(n => Number.isInteger(n) && n >= 0) && config.mentoringTotal > 0 && config.checkinTotal > 0 &&
    config.mentoringMinimum <= config.mentoringTotal && config.checkinMinimum <= config.checkinTotal, 'GRADUATION_CONFIG', 'Ambang kelulusan tidak valid.');
  requireRule(Number.isInteger(input.mentoringAttended) && input.mentoringAttended >= 0 && input.mentoringAttended <= config.mentoringTotal &&
    Number.isInteger(input.checkinsAttended) && input.checkinsAttended >= 0 && input.checkinsAttended <= config.checkinTotal, 'ATTENDANCE', 'Jumlah kehadiran tidak valid.');
  requireRule(input.completeReviews.every(p => ['FEB', 'MAY', 'AUG', 'NOV'].includes(p)) && new Set(input.completeReviews).size === input.completeReviews.length, 'REVIEWS', 'Daftar Review harus unik dan valid.');
  if (input.pocLockedAt) requireRule(instant(input.pocLockedAt) <= asOf, 'CHRONOLOGY', 'Waktu kunci POC tidak boleh di masa depan.');
  if (input.portfolioUrl) requireRule(validUrl(input.portfolioUrl), 'PORTFOLIO_URL', 'Tautan portofolio tidak valid.');
  const pendingOrFalse = input.finalDataClosed ? false : null;
  const checks: Record<string, boolean | null> = {
    pocLockedOnTime: input.pocLockedAt ? instant(input.pocLockedAt) <= lockDeadline : asOf > lockDeadline ? false : null,
    fourReviews: input.completeReviews.length === 4 ? true : pendingOrFalse,
    finalPortfolio: input.portfolioUrl ? true : pendingOrFalse,
    leadershipShowcase: input.showcaseAttended === true ? true : input.showcaseAttended === false ? false : pendingOrFalse,
    mentoringAttendance: input.mentoringAttended >= config.mentoringMinimum ? true : pendingOrFalse,
    checkinAttendance: input.checkinsAttended >= config.checkinMinimum ? true : pendingOrFalse,
  };
  const values = Object.values(checks);
  const status = values.some(v => v === false) ? 'Belum memenuhi' : values.some(v => v === null) ? 'Menunggu data' : 'Lulus';
  return { status, checks, config };
}

export type Role = 'Admin' | 'SM' | 'Asmen' | 'Mentee';
export type Action = 'READ' | 'EDIT_OWN_FORM' | 'SET_STATUS' | 'VERIFY_EVIDENCE' |
  'EDIT_POC' | 'LOCK_POC' | 'GRADE_OUTCOME' | 'GRADE_LEADERSHIP' | 'SET_CONFIG' | 'READ_STAFF_SCORE';
export interface Actor { id: string; role: Role; adminFunctions?: ('Program' | 'L&C Lead' | 'Tim Penilaian')[] }
export interface ResourceScope { menteeId: string; assignedAsmenId: string; assignedSmId: string; review?: Review; pocLocked?: boolean }
export function can(actor: Actor, action: Action, resource: ResourceScope): boolean {
  if (actor.role === 'Admin') {
    if (action === 'GRADE_LEADERSHIP') return resource.review === 'NOV' && Boolean(actor.adminFunctions?.includes('Tim Penilaian'));
    if (action === 'GRADE_OUTCOME') return resource.review === 'NOV';
    return true;
  }
  if (actor.role === 'Mentee') return actor.id === resource.menteeId && (action === 'READ' || action === 'EDIT_OWN_FORM' || (action === 'EDIT_POC' && !resource.pocLocked));
  if (actor.role === 'Asmen') return actor.id === resource.assignedAsmenId && ['READ', 'SET_STATUS', 'VERIFY_EVIDENCE'].includes(action);
  if (actor.role === 'SM') {
    if (actor.id !== resource.assignedSmId) return false;
    if (action === 'READ' || action === 'LOCK_POC') return true;
    if (action === 'GRADE_OUTCOME') return ['FEB', 'MAY', 'AUG'].includes(resource.review ?? '');
    if (action === 'GRADE_LEADERSHIP') return resource.review === 'MAY';
  }
  return false;
}
