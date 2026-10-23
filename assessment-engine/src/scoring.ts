export type Status = 'Green' | 'Yellow' | 'Red';
export type Achievement = 'Exceeding' | 'Achieving' | 'Progressing' | 'Not Achieved';
export type Strength = 'Aktivitas' | 'Output' | 'Mutu' | 'Outcome' | 'Keberlanjutan';
export type Review = 'FEB' | 'MAY' | 'AUG' | 'NOV';
export const strengthPoints: Record<Strength, number> = {
  Aktivitas: 0, Output: 1, Mutu: 2, Outcome: 3, Keberlanjutan: 4,
};
const statusPoints: Record<Status, number> = { Green: 3, Yellow: 1, Red: 0 };
const achievementPoints: Record<Achievement, number> = {
  Exceeding: 4, Achieving: 3, Progressing: 2, 'Not Achieved': 0,
};
export const competencies = ['Mengenal diri', 'Berpikir kritis', 'Komunikasi',
  'Kolaborasi', 'Eksekusi', 'Etika'] as const;
export type Competency = typeof competencies[number];
export interface Evidence {
  url: string;
  strength: Strength;
  source: 'Laporan diri' | 'Pihak ketiga';
  verified: boolean;
}
export interface KpiResult { id: string; achievement: Achievement; evidence: Evidence[] }
export interface LeadershipItem {
  competency: Competency; level: number; evidenceUrl: string; reason: string;
}
export interface LeadershipAssessment { period: 'MAY' | 'NOV'; items: LeadershipItem[] }
export class RuleError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
export function requireRule(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new RuleError(code, message);
}
export function validUrl(value: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}
export function classify(score: number) {
  requireRule(Number.isInteger(score) && score >= 0 && score <= 100, 'SCORE_RANGE', 'Skor harus 0–100.');
  if (score >= 85) return { category: 'Unggul', color: 'green', action: 'Lanjutkan kemajuan.' };
  if (score >= 70) return { category: 'Baik', color: 'green', action: 'Pertahankan hasil dan bukti.' };
  if (score >= 50) return { category: 'Perlu dukungan', color: 'yellow', action: 'Bahas khusus pada mentoring berikutnya.' };
  return { category: 'Berisiko', color: 'red', action: 'Asmen dan SM mengisi rencana perbaikan dalam 7 hari.' };
}
function leadershipPoints(assessment: LeadershipAssessment): number {
  requireRule(assessment.items.length === 6, 'INCOMPLETE_LEADERSHIP', 'Enam kompetensi harus dinilai.');
  const seen = new Set<string>();
  let sum = 0;
  for (const item of assessment.items) {
    requireRule(competencies.includes(item.competency) && !seen.has(item.competency), 'COMPETENCY', 'Kompetensi harus lengkap dan unik.');
    seen.add(item.competency);
    requireRule(Number.isInteger(item.level) && item.level >= 1 && item.level <= 4, 'LEVEL', 'Level harus 1–4.');
    requireRule(validUrl(item.evidenceUrl) && item.reason.trim().length > 0, 'LEADERSHIP_EVIDENCE', 'Setiap level memerlukan tautan bukti dan alasan.');
    sum += item.level;
  }
  return sum / 24 * 25;
}
export interface MenteeInput {
  review: Review;
  checkins: Status[];
  kpis: KpiResult[];
  leadership?: LeadershipAssessment;
  mayLeadership?: LeadershipAssessment;
}
export function scoreMentee(input: MenteeInput) {
  requireRule(['FEB', 'MAY', 'AUG', 'NOV'].includes(input.review), 'REVIEW', 'Periode Review tidak valid.');
  requireRule(input.checkins.length > 0, 'INCOMPLETE_CHECKINS', 'Belum ada status check-in; jangan tampilkan nol sebagai skor final.');
  requireRule(input.checkins.every(s => Object.hasOwn(statusPoints, s)), 'STATUS', 'Status check-in tidak valid.');
  requireRule(input.kpis.length >= 1 && input.kpis.length <= 3, 'KPI_COUNT', 'POC harus memuat 1–3 KPI.');
  requireRule(new Set(input.kpis.map(k => k.id)).size === input.kpis.length && input.kpis.every(k => k.id.trim()), 'KPI_ID', 'ID KPI harus terisi dan unik.');
  const warnings: string[] = [];
  let outcomeSum = 0, evidenceSum = 0;
  for (const kpi of input.kpis) {
    requireRule(Object.hasOwn(achievementPoints, kpi.achievement), 'ACHIEVEMENT', 'Level capaian tidak valid.');
    for (const evidence of kpi.evidence) {
      requireRule(validUrl(evidence.url), 'EVIDENCE_URL', 'Tautan bukti harus berupa HTTP/HTTPS.');
      requireRule(Object.hasOwn(strengthPoints, evidence.strength) && ['Laporan diri', 'Pihak ketiga'].includes(evidence.source), 'EVIDENCE_TAG', 'Tag bukti tidak valid.');
      requireRule(typeof evidence.verified === 'boolean', 'VERIFICATION', 'Status verifikasi bukti wajib ada.');
    }
    const verified = kpi.evidence.filter(e => e.verified);
    const strongest = verified.length ? Math.max(...verified.map(e => strengthPoints[e.strength])) : 0;
    evidenceSum += strongest;
    if (kpi.evidence.some(e => !e.verified)) warnings.push(`${kpi.id}: bukti menunggu verifikasi tidak masuk P4.`);
    if (!kpi.evidence.length) {
      warnings.push(`${kpi.id}: tanpa tautan bukti, capaian otomatis Not Achieved.`);
      continue;
    }
    if (['Achieving', 'Exceeding'].includes(kpi.achievement)) {
      requireRule(verified.some(e => strengthPoints[e.strength] >= 3), 'OUTCOME_REQUIRED', `${kpi.id}: Achieving/Exceeding memerlukan bukti terverifikasi minimal Outcome.`);
    }
    outcomeSum += achievementPoints[kpi.achievement];
  }
  const raw = {
    p1: input.checkins.reduce((sum, status) => sum + statusPoints[status], 0) / (input.checkins.length * 3) * 25,
    p2: outcomeSum / (input.kpis.length * 4) * 25,
    p3: null as number | null,
    p4: evidenceSum / (input.kpis.length * 4) * 25,
  };
  if (input.review !== 'FEB') {
    const assessment = input.review === 'AUG' ? input.mayLeadership : input.leadership;
    const expectedPeriod = input.review === 'NOV' ? 'NOV' : 'MAY';
    requireRule(assessment?.period === expectedPeriod, 'INCOMPLETE_LEADERSHIP', `Review ${input.review} memerlukan penilaian kepemimpinan ${expectedPeriod}.`);
    raw.p3 = leadershipPoints(assessment);
  }
  const components = { p1: Math.round(raw.p1), p2: Math.round(raw.p2),
    p3: raw.p3 === null ? null : Math.round(raw.p3), p4: Math.round(raw.p4) };
  const sum = components.p1 + components.p2 + (components.p3 ?? 0) + components.p4;
  const score = input.review === 'FEB' ? Math.round(sum * 100 / 75) : sum;
  return { score, ...classify(score), components, raw, warnings,
    leadershipSource: input.review === 'FEB' ? null : input.review === 'NOV' ? 'NOV' : 'MAY' };
}

export type ChecklistValue = boolean | null;
export function scoreStaff(checklist: ChecklistValue[]) {
  requireRule(checklist.length === 7 && checklist.every(v => v === true || v === false || v === null), 'CHECKLIST', 'Harus ada tujuh ceklis: terpenuhi, tidak terpenuhi, atau belum dapat dinilai.');
  const passed = checklist.filter(v => v === true).length;
  const pending = checklist.filter(v => v === null).length;
  if (pending) return { passed, pending, score: null, category: 'Belum lengkap' };
  return { passed, pending, score: passed / 7 * 100,
    category: passed === 7 ? 'Baik' : passed >= 5 ? 'Perlu perbaikan' : 'Perlu bantuan L&C Lead' };
}
export interface Ratio { numerator: number; denominator: number }
function ratioAtLeast(ratio: Ratio | null, threshold: number): ChecklistValue {
  if (ratio === null) return null;
  requireRule(Number.isInteger(ratio.numerator) && Number.isInteger(ratio.denominator) && ratio.numerator >= 0 && ratio.denominator >= 0 && ratio.numerator <= ratio.denominator,
    'RATIO', 'Pembilang dan penyebut ceklis tidak valid.');
  if (!ratio.denominator) return null;
  return ratio.numerator / ratio.denominator >= threshold;
}
function surveyPass(average: number | null): ChecklistValue {
  if (average === null) return null;
  requireRule(Number.isFinite(average) && average >= 1 && average <= 4, 'SURVEY', 'Rata-rata survei harus 1–4.');
  return average >= 3;
}
export function scoreAsmen(metrics: {
  checkinsHeld: Ratio | null; statusTimely: ChecklistValue; redEscalatedTimely: ChecklistValue;
  completeNotes: Ratio | null; summariesBeforeMentoring: Ratio | null;
  noRoleViolationReport: ChecklistValue; surveyAverage: number | null;
}) {
  const checklist = [ratioAtLeast(metrics.checkinsHeld, .9), metrics.statusTimely,
    metrics.redEscalatedTimely, ratioAtLeast(metrics.completeNotes, .9),
    ratioAtLeast(metrics.summariesBeforeMentoring, .9), metrics.noRoleViolationReport,
    surveyPass(metrics.surveyAverage)];
  return { checklist, ...scoreStaff(checklist) };
}
export function scoreSeniorMentor(metrics: {
  mentoringHeld: Ratio | null; noConsecutivePostponements: ChecklistValue;
  allPocLockedOnTime: ChecklistValue; allReviewsGradedWithin7Days: ChecklistValue;
  accessForEveryMenteePerSemester: ChecklistValue; noDecisionOnBehalfReport: ChecklistValue;
  surveyAverage: number | null;
}) {
  const checklist = [ratioAtLeast(metrics.mentoringHeld, 10 / 11), metrics.noConsecutivePostponements,
    metrics.allPocLockedOnTime, metrics.allReviewsGradedWithin7Days,
    metrics.accessForEveryMenteePerSemester, metrics.noDecisionOnBehalfReport,
    surveyPass(metrics.surveyAverage)];
  return { checklist, ...scoreStaff(checklist) };
}
