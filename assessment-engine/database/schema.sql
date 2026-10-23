-- IPB LEAP Cohort 1: rancangan PostgreSQL, bukan migrasi produksi yang sudah diterapkan.
-- UUID dibuat oleh aplikasi. Semua waktu disimpan sebagai timestamptz; tampilan Asia/Jakarta.
BEGIN;
CREATE SCHEMA leap_assessment;
SET LOCAL search_path TO leap_assessment, public;
CREATE TYPE user_role AS ENUM ('Admin', 'SM', 'Asmen', 'Mentee');
CREATE TYPE review_code AS ENUM ('FEB', 'MAY', 'AUG', 'NOV');
CREATE TYPE session_kind AS ENUM ('CHECKIN', 'MENTORING', 'REVIEW', 'SHOWCASE');
CREATE TYPE traffic_status AS ENUM ('Green', 'Yellow', 'Red');
CREATE TYPE achievement_level AS ENUM ('Exceeding', 'Achieving', 'Progressing', 'Not Achieved');
CREATE TYPE evidence_strength AS ENUM ('Aktivitas', 'Output', 'Mutu', 'Outcome', 'Keberlanjutan');
CREATE TYPE evidence_source AS ENUM ('Laporan diri', 'Pihak ketiga');
CREATE TYPE verification_state AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE workflow_state AS ENUM ('DRAFT', 'SUBMITTED', 'CHECKED', 'PUBLISHED');
CREATE TYPE escalation_kind AS ENUM ('CHECKIN_RED', 'LOW_SCORE', 'MENTORING_DELAY');
CREATE TYPE competency_code AS ENUM ('SELF', 'CRITICAL', 'COMMUNICATION', 'COLLABORATION', 'EXECUTION', 'ETHICS');
CREATE TABLE cohorts (
 id uuid PRIMARY KEY, name text NOT NULL, starts_on date NOT NULL, ends_on date NOT NULL,
 timezone text NOT NULL DEFAULT 'Asia/Jakarta', CHECK (ends_on >= starts_on)
);
CREATE TABLE users (
 id uuid PRIMARY KEY, external_auth_id text NOT NULL UNIQUE,
 display_name text NOT NULL, email text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true
);
CREATE TABLE cohort_roles (
 cohort_id uuid NOT NULL REFERENCES cohorts, user_id uuid NOT NULL REFERENCES users,
 role user_role NOT NULL, admin_functions text[] NOT NULL DEFAULT '{}',
 PRIMARY KEY (cohort_id, user_id),
 CHECK (admin_functions <@ ARRAY['Program','L&C Lead','Tim Penilaian']::text[]),
 CHECK (role = 'Admin' OR cardinality(admin_functions) = 0)
);
CREATE TABLE fields (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, name text NOT NULL,
 UNIQUE (cohort_id, name), UNIQUE (id, cohort_id)
);
CREATE TABLE groups (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, name text NOT NULL,
 UNIQUE (cohort_id, name), UNIQUE (id, cohort_id)
);
CREATE TABLE group_assignments (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, group_id uuid NOT NULL, user_id uuid NOT NULL,
 role user_role NOT NULL CHECK (role IN ('SM','Asmen','Mentee')),
 valid_from timestamptz NOT NULL, valid_until timestamptz,
 FOREIGN KEY (group_id, cohort_id) REFERENCES groups(id, cohort_id),
 FOREIGN KEY (cohort_id, user_id) REFERENCES cohort_roles,
 CHECK (valid_until IS NULL OR valid_until > valid_from),
 UNIQUE (id, cohort_id)
);
-- Satu kelompok aktif: tepat 5 mentee, 1 Asmen, 1 SM. Batas lintas-baris dan bentrok
-- rentang penugasan diperiksa transaksi layanan sebelum aktivasi; bukan CHECK palsu.
CREATE UNIQUE INDEX one_active_group_per_mentee ON group_assignments(cohort_id,user_id)
 WHERE role = 'Mentee' AND valid_until IS NULL;
CREATE UNIQUE INDEX one_active_asmen_or_sm_per_group ON group_assignments(group_id,role)
 WHERE role IN ('Asmen','SM') AND valid_until IS NULL;
CREATE TABLE mentee_profiles (
 cohort_id uuid NOT NULL, mentee_id uuid NOT NULL, field_id uuid NOT NULL,
 PRIMARY KEY (cohort_id, mentee_id),
 FOREIGN KEY (cohort_id, mentee_id) REFERENCES cohort_roles,
 FOREIGN KEY (field_id, cohort_id) REFERENCES fields(id, cohort_id)
);
CREATE TABLE rule_versions (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, version integer NOT NULL CHECK (version > 0),
 effective_at timestamptz NOT NULL, created_by uuid NOT NULL REFERENCES users, created_at timestamptz NOT NULL,
 rounding_policy text NOT NULL DEFAULT 'ROUND_COMPONENT_THEN_SUM'
   CHECK (rounding_policy = 'ROUND_COMPONENT_THEN_SUM'),
 poc_lock_deadline timestamptz NOT NULL DEFAULT '2027-01-31 23:59:59.999+07',
 checkin_total integer NOT NULL DEFAULT 22 CHECK (checkin_total > 0),
 checkin_minimum integer NOT NULL DEFAULT 18 CHECK (checkin_minimum >= 0 AND checkin_minimum <= checkin_total),
 mentoring_total integer NOT NULL DEFAULT 11 CHECK (mentoring_total > 0),
 mentoring_minimum integer NOT NULL DEFAULT 9 CHECK (mentoring_minimum >= 0 AND mentoring_minimum <= mentoring_total),
 thresholds jsonb NOT NULL, -- kategori, batas KPI, SLA; bentuk dan default di spesifikasi
 UNIQUE (cohort_id, version), UNIQUE (id, cohort_id)
);
CREATE TABLE holidays (
 cohort_id uuid NOT NULL REFERENCES cohorts, date date NOT NULL, label text NOT NULL,
 PRIMARY KEY (cohort_id,date)
);
CREATE TABLE semesters (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, name text NOT NULL,
 starts_on date NOT NULL, ends_on date NOT NULL CHECK (ends_on >= starts_on), UNIQUE (id,cohort_id)
);
CREATE TABLE review_periods (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, code review_code NOT NULL,
 due_at timestamptz NOT NULL, cutoff_at timestamptz NOT NULL, rule_version_id uuid NOT NULL,
 FOREIGN KEY (rule_version_id,cohort_id) REFERENCES rule_versions(id,cohort_id),
 UNIQUE (cohort_id,code), UNIQUE (id,cohort_id)
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, group_id uuid NOT NULL, kind session_kind NOT NULL,
 sequence_no integer NOT NULL CHECK (sequence_no > 0), scheduled_at timestamptz NOT NULL,
 actual_at timestamptz, form_due_at timestamptz NOT NULL,
 review_id uuid, status text NOT NULL CHECK (status IN ('SCHEDULED','HELD','POSTPONED','CANCELLED')),
 FOREIGN KEY (group_id,cohort_id) REFERENCES groups(id,cohort_id),
 FOREIGN KEY (review_id,cohort_id) REFERENCES review_periods(id,cohort_id),
 CHECK ((kind = 'REVIEW') = (review_id IS NOT NULL)),
 UNIQUE (group_id,kind,sequence_no), UNIQUE (id,cohort_id)
);
CREATE TABLE session_changes (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES sessions, changed_at timestamptz NOT NULL,
 old_scheduled_at timestamptz NOT NULL, new_scheduled_at timestamptz,
 change_type text NOT NULL CHECK (change_type IN ('POSTPONED','RESCHEDULED','CANCELLED')),
 reason text NOT NULL, evidence_url text NOT NULL CHECK (evidence_url ~ '^https?://'),
 changed_by uuid NOT NULL REFERENCES users
);
CREATE TABLE attendance (
 cohort_id uuid NOT NULL, session_id uuid NOT NULL, user_id uuid NOT NULL,
 attended boolean NOT NULL, evidence_url text NOT NULL CHECK (evidence_url ~ '^https?://'),
 recorded_at timestamptz NOT NULL, recorded_by uuid NOT NULL REFERENCES users,
 PRIMARY KEY (session_id,user_id),
 FOREIGN KEY (session_id,cohort_id) REFERENCES sessions(id,cohort_id),
 FOREIGN KEY (cohort_id,user_id) REFERENCES cohort_roles
);
CREATE TABLE poc_contracts (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, mentee_id uuid NOT NULL, version integer NOT NULL CHECK (version > 0),
 state text NOT NULL CHECK (state IN ('DRAFT','LOCKED','SUPERSEDED')),
 created_at timestamptz NOT NULL, locked_at timestamptz, locked_by uuid REFERENCES users,
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 CHECK (state = 'DRAFT' OR (locked_at IS NOT NULL AND locked_by IS NOT NULL)),
 UNIQUE (cohort_id,mentee_id,version), UNIQUE (id,cohort_id)
);
CREATE UNIQUE INDEX one_current_locked_poc ON poc_contracts(cohort_id,mentee_id) WHERE state = 'LOCKED';
CREATE TABLE kpis (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, poc_id uuid NOT NULL, position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
 title text NOT NULL, unit text NOT NULL,
 direction text NOT NULL CHECK (direction IN ('INCREASE','DECREASE','MILESTONE')),
 baseline jsonb NOT NULL, target jsonb NOT NULL,
 level_thresholds jsonb NOT NULL, -- wajib empat kunci Exceeding, Achieving, Progressing, Not Achieved
 FOREIGN KEY (poc_id,cohort_id) REFERENCES poc_contracts(id,cohort_id),
 UNIQUE (poc_id,position), UNIQUE (id,cohort_id)
);
-- Penguncian POC memerlukan transaksi: cek jumlah 1–3, semua empat batas, pemilik,
-- role SM yang ditugaskan, lalu simpan locked_at dan audit; target terkunci tidak ditimpa.
CREATE TABLE dropdown_options (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, field_key text NOT NULL,
 code text NOT NULL, label text NOT NULL, instruction text NOT NULL, active boolean NOT NULL DEFAULT true,
 UNIQUE (cohort_id,field_key,code), UNIQUE (id,cohort_id)
);
CREATE TABLE checkin_forms (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, session_id uuid NOT NULL, mentee_id uuid NOT NULL,
 activity_code text NOT NULL, result_code text NOT NULL, learning_code text NOT NULL,
 obstacle_code text NOT NULL, next_action_code text NOT NULL, next_due_at timestamptz NOT NULL,
 reason text, state workflow_state NOT NULL, submitted_at timestamptz,
 FOREIGN KEY (session_id,cohort_id) REFERENCES sessions(id,cohort_id),
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 UNIQUE (session_id,mentee_id), UNIQUE (id,cohort_id)
);
CREATE TABLE checkin_statuses (
 checkin_id uuid PRIMARY KEY, cohort_id uuid NOT NULL, requested traffic_status NOT NULL, effective traffic_status NOT NULL,
 improvement_since_previous boolean, previous_checkin_id uuid, automatic_red boolean NOT NULL DEFAULT false,
 correction_action_code text, correction_due_at timestamptz, reason text NOT NULL,
 evidence_url text CHECK (evidence_url ~ '^https?://'), assessment_complete boolean NOT NULL DEFAULT false,
 assessed_by uuid NOT NULL REFERENCES users, assessed_at timestamptz NOT NULL,
 FOREIGN KEY (checkin_id,cohort_id) REFERENCES checkin_forms(id,cohort_id),
 FOREIGN KEY (previous_checkin_id,cohort_id) REFERENCES checkin_forms(id,cohort_id),
 CHECK (previous_checkin_id IS NULL OR previous_checkin_id <> checkin_id),
 CHECK (requested <> 'Yellow' OR (correction_action_code IS NOT NULL AND correction_due_at IS NOT NULL)),
 CHECK (effective <> 'Green' OR evidence_url IS NOT NULL),
 CHECK (NOT automatic_red OR (requested = 'Yellow' AND effective = 'Red' AND improvement_since_previous IS FALSE)),
 CHECK (NOT assessment_complete OR evidence_url IS NOT NULL)
);
CREATE TABLE mentoring_forms (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, session_id uuid NOT NULL, mentee_id uuid NOT NULL,
 priority_code text NOT NULL, insight_code text NOT NULL, decision_code text NOT NULL,
 action_code text NOT NULL, evidence_brought_code text NOT NULL, action_due_at timestamptz NOT NULL,
 reason text, state workflow_state NOT NULL, submitted_at timestamptz,
 confirmed_by uuid REFERENCES users, confirmed_at timestamptz,
 FOREIGN KEY (session_id,cohort_id) REFERENCES sessions(id,cohort_id),
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 UNIQUE (session_id,mentee_id), UNIQUE (id,cohort_id)
);
CREATE TABLE evidence (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, mentee_id uuid NOT NULL, kpi_id uuid,
 checkin_id uuid, mentoring_id uuid, url text NOT NULL CHECK (url ~ '^https?://'),
 proposed_strength evidence_strength NOT NULL, confirmed_strength evidence_strength,
 source evidence_source NOT NULL, verification verification_state NOT NULL DEFAULT 'PENDING',
 accessible boolean, access_checked_at timestamptz, verified_by uuid REFERENCES users, verified_at timestamptz,
 uploaded_at timestamptz NOT NULL, reason text,
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 FOREIGN KEY (kpi_id,cohort_id) REFERENCES kpis(id,cohort_id),
 FOREIGN KEY (checkin_id,cohort_id) REFERENCES checkin_forms(id,cohort_id),
 FOREIGN KEY (mentoring_id,cohort_id) REFERENCES mentoring_forms(id,cohort_id),
 CHECK (verification <> 'ACCEPTED' OR (confirmed_strength IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL AND accessible IS TRUE)),
 UNIQUE (id,cohort_id)
);
CREATE TABLE evidence_verification_history (
 id uuid PRIMARY KEY, evidence_id uuid NOT NULL REFERENCES evidence, checked_by uuid NOT NULL REFERENCES users,
 checked_at timestamptz NOT NULL, verification verification_state NOT NULL,
 strength evidence_strength, accessible boolean, reason text NOT NULL
);
CREATE TABLE review_submissions (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, review_id uuid NOT NULL, mentee_id uuid NOT NULL, poc_id uuid NOT NULL,
 state workflow_state NOT NULL, submitted_at timestamptz, checked_by uuid REFERENCES users, checked_at timestamptz,
 published_by uuid REFERENCES users, published_at timestamptz,
 FOREIGN KEY (review_id,cohort_id) REFERENCES review_periods(id,cohort_id),
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 FOREIGN KEY (poc_id,cohort_id) REFERENCES poc_contracts(id,cohort_id),
 UNIQUE (review_id,mentee_id), UNIQUE (id,cohort_id)
);
CREATE TABLE review_kpi_results (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, submission_id uuid NOT NULL, kpi_id uuid NOT NULL,
 actual_result jsonb NOT NULL, actual_band_code text NOT NULL, reason text NOT NULL,
 requested_level achievement_level, effective_level achievement_level,
 graded_by uuid REFERENCES users, graded_at timestamptz, auto_no_evidence boolean NOT NULL DEFAULT false,
 FOREIGN KEY (submission_id,cohort_id) REFERENCES review_submissions(id,cohort_id),
 FOREIGN KEY (kpi_id,cohort_id) REFERENCES kpis(id,cohort_id),
 CHECK (NOT auto_no_evidence OR effective_level = 'Not Achieved'),
 UNIQUE (submission_id,kpi_id), UNIQUE (id,cohort_id)
);
CREATE TABLE review_evidence (
 cohort_id uuid NOT NULL, result_id uuid NOT NULL, evidence_id uuid NOT NULL,
 PRIMARY KEY (result_id,evidence_id),
 FOREIGN KEY (result_id,cohort_id) REFERENCES review_kpi_results(id,cohort_id),
 FOREIGN KEY (evidence_id,cohort_id) REFERENCES evidence(id,cohort_id)
);
CREATE TABLE leadership_assessments (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, review_id uuid NOT NULL, mentee_id uuid NOT NULL,
 state workflow_state NOT NULL, assessed_by uuid REFERENCES users, assessed_at timestamptz,
 FOREIGN KEY (review_id,cohort_id) REFERENCES review_periods(id,cohort_id),
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 UNIQUE (review_id,mentee_id), UNIQUE (id,cohort_id)
);
CREATE TABLE leadership_items (
 assessment_id uuid NOT NULL, cohort_id uuid NOT NULL, competency competency_code NOT NULL,
 evidence_id uuid NOT NULL, mentee_reason text NOT NULL,
 level smallint CHECK (level BETWEEN 1 AND 4), reason text,
 PRIMARY KEY (assessment_id,competency),
 FOREIGN KEY (assessment_id,cohort_id) REFERENCES leadership_assessments(id,cohort_id),
 FOREIGN KEY (evidence_id,cohort_id) REFERENCES evidence(id,cohort_id)
);
CREATE TABLE mentoring_summaries (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, session_id uuid NOT NULL, asmen_id uuid NOT NULL REFERENCES users,
 uploaded_at timestamptz NOT NULL, url text NOT NULL CHECK (url ~ '^https?://'),
 FOREIGN KEY (session_id,cohort_id) REFERENCES sessions(id,cohort_id), UNIQUE (session_id)
);
CREATE TABLE access_logs (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, mentee_id uuid NOT NULL, sm_id uuid NOT NULL REFERENCES users,
 semester_id uuid NOT NULL, mentoring_id uuid, kind text NOT NULL CHECK (kind IN ('NETWORK','PARTNER','MATERIAL')),
 evidence_url text NOT NULL CHECK (evidence_url ~ '^https?://'), reason text NOT NULL, provided_at timestamptz NOT NULL,
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 FOREIGN KEY (semester_id,cohort_id) REFERENCES semesters(id,cohort_id),
 FOREIGN KEY (mentoring_id,cohort_id) REFERENCES mentoring_forms(id,cohort_id)
);
CREATE TABLE surveys (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, review_id uuid NOT NULL, mentee_id uuid NOT NULL,
 asmen_assignment_id uuid NOT NULL, sm_assignment_id uuid NOT NULL,
 asmen_score smallint NOT NULL CHECK (asmen_score BETWEEN 1 AND 4),
 sm_score smallint NOT NULL CHECK (sm_score BETWEEN 1 AND 4), comment text, submitted_at timestamptz NOT NULL,
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 FOREIGN KEY (review_id,cohort_id) REFERENCES review_periods(id,cohort_id),
 FOREIGN KEY (asmen_assignment_id,cohort_id) REFERENCES group_assignments(id,cohort_id),
 FOREIGN KEY (sm_assignment_id,cohort_id) REFERENCES group_assignments(id,cohort_id), UNIQUE (review_id,mentee_id)
);
CREATE TABLE role_violation_reports (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, subject_id uuid NOT NULL REFERENCES users,
 reported_by uuid NOT NULL REFERENCES users, kind text NOT NULL CHECK (kind IN ('CHANGE_TARGET','JUDGE_STRATEGY','DECIDE_FOR_MENTEE')),
 reported_at timestamptz NOT NULL, evidence_url text NOT NULL CHECK (evidence_url ~ '^https?://'),
 reason text NOT NULL, resolution text CHECK (resolution IN ('OPEN','CONFIRMED','DISMISSED')), resolved_at timestamptz
);
CREATE TABLE staff_assessments (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, review_id uuid NOT NULL, staff_id uuid NOT NULL REFERENCES users,
 role user_role NOT NULL CHECK (role IN ('Asmen','SM')), rule_version_id uuid NOT NULL,
 passed smallint CHECK (passed BETWEEN 0 AND 7), score numeric(12,8), category text,
 state workflow_state NOT NULL, calculated_at timestamptz NOT NULL,
 FOREIGN KEY (review_id,cohort_id) REFERENCES review_periods(id,cohort_id),
 FOREIGN KEY (rule_version_id,cohort_id) REFERENCES rule_versions(id,cohort_id),
 UNIQUE (review_id,staff_id), UNIQUE (id,cohort_id)
);
CREATE TABLE staff_checklist_items (
 assessment_id uuid NOT NULL REFERENCES staff_assessments, item_no smallint NOT NULL CHECK (item_no BETWEEN 1 AND 7),
 met boolean, numerator integer, denominator integer, evidence_url text CHECK (evidence_url ~ '^https?://'),
 source_records jsonb NOT NULL, reason text NOT NULL, PRIMARY KEY (assessment_id,item_no)
);
CREATE TABLE score_snapshots (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, submission_id uuid NOT NULL, rule_version_id uuid NOT NULL,
 version integer NOT NULL CHECK (version > 0), p1_raw numeric NOT NULL, p2_raw numeric NOT NULL,
 p3_raw numeric, p4_raw numeric NOT NULL, p1 smallint NOT NULL CHECK (p1 BETWEEN 0 AND 25),
 p2 smallint NOT NULL CHECK (p2 BETWEEN 0 AND 25), p3 smallint CHECK (p3 BETWEEN 0 AND 25),
 p4 smallint NOT NULL CHECK (p4 BETWEEN 0 AND 25), total smallint NOT NULL CHECK (total BETWEEN 0 AND 100),
 category text NOT NULL, color text NOT NULL CHECK (color IN ('green','yellow','red')),
 leadership_source_id uuid, inputs jsonb NOT NULL, published_by uuid NOT NULL REFERENCES users, published_at timestamptz NOT NULL,
 FOREIGN KEY (submission_id,cohort_id) REFERENCES review_submissions(id,cohort_id),
 FOREIGN KEY (rule_version_id,cohort_id) REFERENCES rule_versions(id,cohort_id),
 FOREIGN KEY (leadership_source_id,cohort_id) REFERENCES leadership_assessments(id,cohort_id),
 UNIQUE (submission_id,version)
);
CREATE TABLE escalations (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, kind escalation_kind NOT NULL,
 dedupe_key text NOT NULL UNIQUE, source_checkin_id uuid REFERENCES checkin_forms,
 source_snapshot_id uuid REFERENCES score_snapshots, source_session_id uuid REFERENCES sessions,
 created_at timestamptz NOT NULL, due_at timestamptz, status text NOT NULL CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
 acknowledged_at timestamptz, resolved_at timestamptz, resolution_url text CHECK (resolution_url ~ '^https?://'),
 CHECK (num_nonnulls(source_checkin_id,source_snapshot_id,source_session_id) = 1)
);
CREATE TABLE escalation_assignees (
 escalation_id uuid NOT NULL REFERENCES escalations, user_id uuid NOT NULL REFERENCES users,
 is_owner boolean NOT NULL, PRIMARY KEY (escalation_id,user_id)
);
CREATE TABLE improvement_plans (
 id uuid PRIMARY KEY, escalation_id uuid NOT NULL UNIQUE REFERENCES escalations,
 action_code text NOT NULL, reason text NOT NULL, evidence_url text CHECK (evidence_url ~ '^https?://'),
 due_at timestamptz NOT NULL, asmen_confirmed_at timestamptz, sm_confirmed_at timestamptz,
 completed_at timestamptz
);
CREATE TABLE final_portfolios (
 cohort_id uuid NOT NULL, mentee_id uuid NOT NULL, url text NOT NULL CHECK (url ~ '^https?://'),
 uploaded_at timestamptz NOT NULL, PRIMARY KEY (cohort_id,mentee_id),
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles
);
CREATE TABLE graduation_snapshots (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL, mentee_id uuid NOT NULL, rule_version_id uuid NOT NULL,
 checks jsonb NOT NULL, status text NOT NULL CHECK (status IN ('Lulus','Belum memenuhi','Menunggu data')),
 evaluated_at timestamptz NOT NULL, final_data_closed boolean NOT NULL, source_records jsonb NOT NULL,
 FOREIGN KEY (cohort_id,mentee_id) REFERENCES mentee_profiles,
 FOREIGN KEY (rule_version_id,cohort_id) REFERENCES rule_versions(id,cohort_id)
);
CREATE TABLE notification_outbox (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, template_key text NOT NULL,
 dedupe_key text NOT NULL UNIQUE, recipient_id uuid NOT NULL REFERENCES users,
 cc_user_ids uuid[] NOT NULL DEFAULT '{}', payload jsonb NOT NULL, scheduled_at timestamptz NOT NULL,
 channel text NOT NULL CHECK (channel IN ('IN_APP','EMAIL')), status text NOT NULL CHECK (status IN ('PENDING','SENT','FAILED','CANCELLED')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0), sent_at timestamptz, last_error text
);
CREATE TABLE audit_log (
 id uuid PRIMARY KEY, cohort_id uuid NOT NULL REFERENCES cohorts, actor_id uuid REFERENCES users,
 action text NOT NULL, entity_type text NOT NULL, entity_id uuid NOT NULL,
 before_value jsonb, after_value jsonb, occurred_at timestamptz NOT NULL, request_id uuid NOT NULL
);
CREATE INDEX assignments_lookup ON group_assignments(cohort_id,group_id,role,valid_from);
CREATE INDEX sessions_due ON sessions(cohort_id,scheduled_at);
CREATE INDEX evidence_by_kpi ON evidence(kpi_id,verification);
CREATE INDEX scores_latest ON score_snapshots(submission_id,version DESC);
CREATE INDEX escalation_open ON escalations(cohort_id,due_at) WHERE status <> 'RESOLVED';
CREATE INDEX notification_ready ON notification_outbox(scheduled_at) WHERE status = 'PENDING';
CREATE INDEX audit_entity ON audit_log(entity_type,entity_id,occurred_at);
COMMIT;
-- DDL ini belum mencakup login, endpoint, RLS, worker pengirim, atau pemicu penilaian.
-- Jangan berikan kredensial database ke browser. Jalankan melalui layanan server
-- yang menerapkan scoping, validasi lintas-tabel, audit, dan transaksi di spesifikasi.
