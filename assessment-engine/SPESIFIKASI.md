# Modul Penilaian IPB LEAP — Cohort 1

Paket rancangan dan kode inti • 23 Oktober 2026 • November 2026–November 2027.

**Keputusan pengguna:** PostgreSQL + TypeScript; setiap komponen P1–P4 dibulatkan dahulu, kemudian dijumlahkan. Contoh wajib menghasilkan **67, Perlu dukungan**. Paket ini tidak mengubah situs ipbleap.com dan belum merupakan aplikasi siap produksi. Asumsi sementara ditandai **Axx** dan dikumpulkan di bagian 7.

## 1. Struktur database

DDL lengkap, termasuk seluruh kolom, tipe, PK, FK, enum, indeks, dan CHECK: [database/schema.sql](database/schema.sql). Nama schema: `leap_assessment`. UUID dibuat server; tanggal saja memakai `date`, waktu kejadian memakai `timestamptz`, angka pengukuran dalam objek JSON yang tervalidasi, nilai kalkulasi memakai `numeric`, pilihan tetap memakai enum/teks berkatalog. Semua data operasional terikat cohort.

### 1.1 Identitas, kelompok, periode, aturan

| Tabel | Kolom pokok dan tipe | Relasi / kegunaan |
|---|---|---|
| cohorts | id uuid; name text; starts_on/ends_on date; timezone text | Cohort 1: Nov 2026–Nov 2027; Asia/Jakarta. |
| users | id uuid; external_auth_id, display_name, email text; active boolean | Akun dari penyedia login; tidak menyimpan sandi. |
| cohort_roles | cohort_id/user_id uuid; role enum; admin_functions text[] | 1 role per akun per cohort (A01); fungsi Program/L&C Lead/Tim Penilaian berada di dalam Admin. |
| fields | id/cohort_id uuid; name text | Bidang untuk filter Admin; tidak dibuat-buat isinya. |
| groups | id/cohort_id uuid; name text | 20 kelompok rencana awal; jumlah bukan batas permanen. |
| group_assignments | id/cohort_id/group_id/user_id uuid; role enum; valid_from/until timestamptz | Riwayat penugasan; 5 mentee + 1 Asmen + 1 SM saat kelompok diaktifkan. SM dapat menangani beberapa kelompok. |
| mentee_profiles | cohort_id/mentee_id/field_id uuid | Mentee mempunyai satu bidang utama sementara (A01). |
| rule_versions | id/cohort_id uuid; version int; effective_at timestamptz; created_by uuid; rounding_policy text; poc_lock_deadline timestamptz; checkin_total/minimum dan mentoring_total/minimum int; thresholds jsonb | Default 22/18 dan 11/9. Perubahan Admin membuat versi baru, tidak menimpa nilai historis. |
| holidays | cohort_id uuid; date date; label text | Hari libur yang disahkan Admin untuk tenggat 2 hari kerja. |
| semesters | id/cohort_id uuid; name text; starts_on/ends_on date | Rentang semester perlu diputuskan; dipakai untuk cek akses SM. |
| review_periods | id/cohort_id/rule_version_id uuid; code enum; due_at/cutoff_at timestamptz | FEB, MAY, AUG, NOV 2027; tanggal tepat ditetapkan Admin. |

Bentuk awal `thresholds`:

```json
{
  "menteeCategories": {"excellentMin":85,"goodMin":70,"supportMin":50},
  "asmenHeldRatio":0.9,
  "asmenCompleteNotesRatio":0.9,
  "asmenSummaryRatio":0.9,
  "surveyMinimum":3.0,
  "statusCalendarDays":2,
  "redBusinessDays":2,
  "reviewGradingCalendarDays":7,
  "riskPlanCalendarDays":7,
  "smHeldNumerator":10,
  "smHeldDenominator":11
}
```

Ini penyimpanan konfigurasi; kode inti pada paket ini mengimplementasikan angka awal yang diminta. Endpoint pengaturan dan pemuatan versi aturan ke engine belum dibuat. Jangan mengubah JSON saja lalu menganggap kalkulasi kode otomatis mengikuti. Poin Green/Yellow/Red, empat komponen, dan skala bukti bukan angka yang bebas diedit tanpa perubahan kebijakan.

### 1.2 Jadwal, POC, lima form, bukti

| Tabel | Kolom pokok dan tipe | Relasi / kegunaan |
|---|---|---|
| sessions | id/cohort_id/group_id/review_id uuid; kind enum; sequence_no int; scheduled_at/actual_at/form_due_at timestamptz; status text | Check-in, mentoring, Review, Showcase. Nomor urut menjaga urutan asli meski sesi ditunda. |
| session_changes | id/session_id/changed_by uuid; old/new_scheduled_at/changed_at timestamptz; change_type/reason/evidence_url text | Riwayat penundaan; jadwal lama tidak hilang. |
| attendance | cohort_id/session_id/user_id uuid; attended boolean; evidence_url text; recorded_at timestamptz; recorded_by uuid | Data kelulusan dan kinerja staf; **tidak menjadi poin mentee**. |
| poc_contracts | id/cohort_id/mentee_id uuid; version int; state text; created_at/locked_at timestamptz; locked_by uuid | POC 1–3 KPI; SM mengunci; versi lama tetap tersimpan. |
| kpis | id/cohort_id/poc_id uuid; position smallint; title/unit/direction text; baseline/target/level_thresholds jsonb | Baseline, target dan empat batas capaian; arah INCREASE/DECREASE/MILESTONE. |
| dropdown_options | id/cohort_id uuid; field_key/code/label/instruction text; active boolean | Pilihan yang tidak termasuk enum; label dan petunjuk per opsi. Kode opsi yang sudah dipakai tidak diubah/dihapus; penggantian dibuat sebagai kode baru dan opsi lama dinonaktifkan. |
| checkin_forms | id/cohort_id/session_id/mentee_id uuid; activity/result/learning/obstacle/next_action_code text; next_due_at timestamptz; reason text; state enum; submitted_at timestamptz | Lima pertanyaan mentee, dengan hasil/bukti dan langkah/tenggat sebagai bagian pertanyaan majemuk. |
| checkin_statuses | checkin_id/cohort_id/previous_checkin_id/assessed_by uuid; requested/effective enum; improvement_since_previous/automatic_red/assessment_complete boolean; correction_action_code/reason/evidence_url text; correction_due_at/assessed_at timestamptz | Memisahkan usulan Asmen dan status otomatis. Satu status aktif per check-in; perubahan masuk audit. |
| mentoring_forms | id/cohort_id/session_id/mentee_id uuid; priority/insight/decision/action/evidence_brought_code text; action_due_at/submitted_at/confirmed_at timestamptz; confirmed_by uuid; reason text; state enum | Enam isian mentee, konfirmasi SM. |
| evidence | id/cohort_id/mentee_id/kpi_id/checkin_id/mentoring_id uuid; url text; proposed/confirmed_strength enum; source enum; verification enum; accessible boolean; access_checked_at/verified_at/uploaded_at timestamptz; verified_by uuid; reason text | Satu bukti bisa dipakai ulang lewat relasi Review/kepemimpinan; P4 mengambil yang terkuat per KPI. |
| evidence_verification_history | id/evidence_id/checked_by uuid; checked_at timestamptz; verification/strength enum; accessible boolean; reason text | Mentee mengusulkan tag; keputusan Asmen dan perubahan tag tidak menghapus riwayat. |
| review_submissions | id/cohort_id/review_id/mentee_id/poc_id uuid; state enum; submitted/checked/published_at timestamptz; checked_by/published_by uuid | Satu form per mentee per Review; terikat versi POC. |
| review_kpi_results | id/cohort_id/submission_id/kpi_id uuid; actual_result jsonb; actual_band_code/reason text; requested/effective_level enum; graded_by uuid; graded_at timestamptz; auto_no_evidence boolean | Level dipilih penilai, kecuali otomatis Not Achieved jika tidak ada link. |
| review_evidence | cohort_id/result_id/evidence_id uuid | Banyak bukti untuk satu hasil KPI; semua harus milik mentee/KPI yang sama. |
| leadership_assessments | id/cohort_id/review_id/mentee_id/assessed_by uuid; state enum; assessed_at timestamptz | Hanya MAY dan NOV; FEB kosong; AUG menunjuk hasil MAY. |
| leadership_items | assessment_id/cohort_id/evidence_id uuid; competency enum; level smallint; mentee_reason/reason text | Enam baris unik; level 1–4, bukti dan alasan wajib sebelum publikasi. |
| mentoring_summaries | id/cohort_id/session_id/asmen_id uuid; uploaded_at timestamptz; url text | Memeriksa ringkasan diunggah sebelum mentoring. |
| access_logs | id/cohort_id/mentee_id/sm_id/semester_id/mentoring_id uuid; kind/evidence_url/reason text; provided_at timestamptz | Akses NETWORK/PARTNER/MATERIAL per mentee per semester. |
| surveys | id/cohort_id/review_id/mentee_id/asmen_assignment_id/sm_assignment_id uuid; asmen_score/sm_score smallint; comment text; submitted_at timestamptz | Satu survei per mentee/Review; penugasan staf dipotret saat survei. |
| role_violation_reports | id/cohort_id/subject_id/reported_by uuid; kind/reason/evidence_url/resolution text; reported_at/resolved_at timestamptz | Laporan perubahan target, menilai strategi, mengambil keputusan atas nama mentee. |

Objek `baseline`, `target`, dan `actual_result`: `{ "kind":"NUMBER", "value":20, "unit":"orang" }` atau `{ "kind":"MILESTONE", "code":"...", "label":"..." }`. Contoh ini hanya bentuk data, bukan target program. Empat kunci `level_thresholds` wajib ada: `Exceeding`, `Achieving`, `Progressing`, `Not Achieved`, masing-masing berisi kriteria terstruktur dan penjelasan satu kalimat. Jangan memakai satu urutan angka untuk semua KPI: penurunan waktu proses dan kenaikan jumlah penerima manfaat mempunyai arah berbeda. SM tetap menetapkan level berdasarkan hasil dan bukti.

### 1.3 Skor, kelulusan, eskalasi, notifikasi, audit

| Tabel | Kolom pokok dan tipe | Relasi / kegunaan |
|---|---|---|
| staff_assessments | id/cohort_id/review_id/staff_id/rule_version_id uuid; role enum; passed smallint; score numeric; category text; state enum; calculated_at timestamptz | Penilaian staf tiap Review. |
| staff_checklist_items | assessment_id uuid; item_no smallint; met boolean nullable; numerator/denominator int; evidence_url/reason text; source_records jsonb | Tujuh ceklis dengan jejak bukti per item; null = belum dapat dinilai. |
| score_snapshots | id/cohort_id/submission_id/rule_version_id/leadership_source_id/published_by uuid; version int; p1–p4_raw numeric; p1–p4 smallint; total smallint; category/color text; inputs jsonb; published_at timestamptz | Menyimpan nilai mentah, hasil pembulatan, sumber nilai Mei, aturan dan masukan yang dipakai. |
| escalations | id/cohort_id/source_checkin_id/source_snapshot_id/source_session_id uuid; kind enum; dedupe_key text; created/due/acknowledged/resolved_at timestamptz; status/resolution_url text | Tepat satu sumber; dedupe_key menghindari tugas ganda ketika worker mengulang. |
| escalation_assignees | escalation_id/user_id uuid; is_owner boolean | Penerima dan pemilik tindak lanjut merupakan akun nyata hasil penugasan, bukan hanya string role. |
| improvement_plans | id/escalation_id uuid; action_code/reason/evidence_url text; due_at/asmen_confirmed_at/sm_confirmed_at/completed_at timestamptz | Skor <50 memerlukan rencana yang dikonfirmasi Asmen dan SM. |
| final_portfolios | cohort_id/mentee_id uuid; url text; uploaded_at timestamptz | Bukti unggah portofolio akhir. |
| graduation_snapshots | id/cohort_id/mentee_id/rule_version_id uuid; checks/source_records jsonb; status text; evaluated_at timestamptz; final_data_closed boolean | Enam syarat; tanpa komponen skor. |
| notification_outbox | id/cohort_id/recipient_id uuid; template_key/dedupe_key/channel/status/last_error text; cc_user_ids uuid[]; payload jsonb; scheduled_at/sent_at timestamptz; attempts int | Worker mengirim dari antrean; ada retry dan pembatalan jadwal. |
| audit_log | id/cohort_id/actor_id/entity_id/request_id uuid; action/entity_type text; before/after_value jsonb; occurred_at timestamptz | Append-only lewat layanan; akses audit dibatasi Admin. |

### 1.4 Relasi, transaksi, hak akses

```text
Cohort → kelompok → riwayat penugasan → mentee, Asmen, SM
Mentee → versi POC → 1–3 KPI → bukti
Kelompok → sesi → form/kehadiran/perubahan jadwal
Review → pengajuan mentee → hasil per KPI → relasi bukti
Review MAY/NOV → penilaian kepemimpinan → enam kompetensi → bukti
Review → ceklis Asmen/SM; Review mentee → snapshot skor → tindak lanjut
Mentee + kehadiran + Review + POC + portofolio → snapshot kelulusan
Perubahan bisnis → audit + outbox dalam transaksi yang sama
```

**Validasi lintas-tabel yang wajib ada pada layanan server sebelum produksi:**

1. Role penugasan harus sama dengan role akun cohort. Kelompok aktif tepat 5 mentee/1 Asmen/1 SM; riwayat penugasan tidak tumpang tindih. Simpan kelompok draft sampai lengkap.
2. Pemilik KPI/POC/bukti/form harus mentee yang sama, satu cohort, satu versi POC; jangan menerima ID dari browser tanpa memeriksanya. FK cohort saja belum membuktikan kepemilikan.
3. Kind sesi harus sesuai jenis form; Review dan tanggal cutoff benar; staf harus ditugaskan pada saat kegiatan.
4. Kunci POC dalam satu transaksi dengan lock baris, cek 1–3 KPI, baseline/target dan empat batas lengkap. Asmen tidak bisa mengubahnya. Setelah terkunci, perubahan hanya melalui versi baru dengan alasan dan persetujuan kebijakan (A16).
5. Publikasi Review harus memuat semua KPI dan penilaian yang diperlukan. Kepemimpinan tepat enam kompetensi unik; Mei dinilai SM, November Tim Penilaian. Agustus menunjuk hasil Mei yang sah.
6. Mengubah check-in lama menghitung ulang rantai Yellow sesudahnya dan membuat versi snapshot baru; jangan menghapus jejak nilai yang sudah terbit. Audit dan outbox atomik dengan perubahan sumber.
7. Normalisasi dan otorisasi dilakukan di server. `can()` pada kode adalah aturan inti yang dapat diuji; bukan sistem login maupun RLS yang sudah terpasang. Kueri daftar memakai filter cohort/pemilik/penugasan sebelum pagination, ekspor, atau agregasi.
8. Role aplikasi database tidak boleh owner/superuser. Browser tidak mengakses database langsung. Bila memakai RLS, buat kebijakan dari identitas server tepercaya; DDL ini belum memasangnya. Hindari bocornya survei lewat dashboard staf.
9. Snapshot, audit, dan versi aturan yang dipakai bersifat tetap; koreksi menghasilkan versi baru. Penghapusan master yang masih dipakai ditolak FK, bukan cascade.
10. Cek URL hanya format dan akses nyata sesuai izin. Jangan mengunduh URL sembarang dari server tanpa pembatasan jaringan privat/redirect; bukti boleh privat dengan akses diberikan kepada penilai. Tidak perlu dipublikasikan ke internet.

CHECK PostgreSQL tidak mengawasi keadaan baris lain; karena itu batas kelompok, kelengkapan enam kompetensi, dan kepemilikan bukti perlu transaksi/trigger, FK yang tepat, serta pengujian integrasi. Rujukan: [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

## 2. Spesifikasi lima form

### 2.1 Ketentuan bersama

- Mentee/sesi/kelompok/Review/versi POC terisi otomatis dan tidak bisa diubah di form.
- Semua jawaban utama memakai dropdown; satu kalimat alasan dan URL adalah teks. Komentar survei mengikuti pengecualian A02. Setiap opsi berikut sudah memiliki petunjuk satu kalimat.
- Opsi ditampilkan dengan nama, bukan kode. Kode disimpan agar penggantian label tidak mengubah data lama. Pilihan KPI mengambil 1–3 KPI milik mentee pada POC yang berlaku: label `{nama KPI}`, petunjuk **“Pilih KPI ini bila kegiatan atau bukti mendukung {nama KPI}.”**
- Bukti lama dapat dipilih: label `{judul/link bukti}`, petunjuk **“Gunakan bukti ini bila masih relevan untuk KPI dan periode ini.”** Opsi **Tambah link baru**: **“Tempel tautan yang dapat dibuka penilai.”** Satu link per item bukti; boleh tambah item, tanpa menggandakan poin P4.
- URL HTTP/HTTPS valid; saat diverifikasi Asmen harus benar-benar dapat dibuka oleh pihak penilai. Tidak mengharuskan akses publik. Kegagalan akses ditandai dan dikembalikan kepada mentee.
- Alasan satu kalimat, tanpa batas karakter baru yang mengubah aturan; validasi isi tidak kosong pada penilaian. Bantuan satu kalimat bersifat panduan, jangan menghitung titik pada singkatan sebagai kesalahan otomatis.
- Tenggat berupa dropdown katalog tanggal/jam. Setiap opsi `{tanggal, jam WIB}` berpetunjuk **“Pilih waktu ini sebagai batas penyelesaian langkah yang kamu sepakati.”** Nilai harus setelah waktu pengisian. Opsi dibuat Admin dari kalender kegiatan; kebutuhan tanggal di luar katalog dibahas A03.
- Form boleh disimpan draft. Publikasi membutuhkan seluruh isian wajib; server menolak perubahan warna/level dari payload mentee. Bukti hanya perlu ditambahkan sekali, lalu dipakai ulang.
- Target <5 menit berlaku untuk waktu pengisian per aktor setelah bukti disiapkan, bukan waktu mengerjakan kegiatan atau memeriksa akses bukti (A04). Ini target yang perlu diuji, belum hasil pengujian pengguna.

### 2.2 Form 1 — Check-in mentee; penetapan warna oleh Asmen

| Pertanyaan / field | Tipe | Pilihan / sumber | Wajib dan validasi |
|---|---|---|---|
| Q1 Apa yang dikerjakan? `activity_code` | Dropdown | Tabel C1; KPI terkait dipilih dari POC. | Wajib; tidak mengganti target POC. |
| Q2 Hasilnya apa? `result_code` + item bukti | Dropdown + URL/pilih bukti | Tabel C2; tag kekuatan dan sumber pada C7/C8. | Hasil wajib; bukti bisa ditambahkan kemudian untuk status bermasalah; aturan penilaian lengkap di A05. |
| Q3 Apa yang dipelajari? `learning_code` | Dropdown | Tabel C3. | Wajib. |
| Q4 Apa hambatannya? `obstacle_code` | Dropdown | Tabel C4. | Wajib, termasuk Tidak ada hambatan. |
| Q5 Langkah berikutnya dan kapan? `next_action_code`, `next_due_at` | Dropdown tindakan + dropdown tanggal | Tabel C5 + katalog waktu. | Wajib; Yellow memerlukan langkah perbaikan yang sesuai masalah. |
| Penjelasan singkat `reason` | Teks satu kalimat | Tanpa opsi. | Isi jika pilihan perlu konteks; bukan esai. |
| Tag setiap bukti | Dua dropdown | C7/C8. | Wajib untuk item bukti; mentee mengusulkan, Asmen memverifikasi. |
| Warna, di panel Asmen | Dropdown | C6. | Wajib setelah pemeriksaan; server menghitung `effective`. |
| Ada perbaikan dari Yellow sebelumnya? | Dropdown | **Ada** — “Pilih bila hasil atau bukti menunjukkan perbaikan sejak check-in sebelumnya.” **Belum ada** — “Pilih bila masalah sebelumnya belum membaik.” | Wajib hanya saat dua usulan Yellow berurutan; bukti/alasan Asmen menyertai keputusan. |
| Langkah perbaikan dan tenggat | Dropdown C5 + tanggal | Ambil jawaban Q5 atau minta mentee merevisi. | Wajib untuk Yellow, termasuk yang otomatis menjadi Red; tidak boleh diisi asal oleh Asmen. |
| Alasan warna dan bukti penilaian | Satu kalimat + URL/pilih bukti | Rujuk hasil atau catatan kejadian. | Wajib untuk penilaian lengkap; Green tidak boleh tanpa bukti. Red tetap dieskalasi saat bukti belum lengkap. |

**C1 — Kegiatan**

| Opsi | Petunjuk |
|---|---|
| Menjalankan langkah POC | Pilih bila kamu mengerjakan langkah yang sudah disepakati dalam POC. |
| Mengumpulkan atau memvalidasi bukti | Pilih bila fokus kegiatanmu memastikan hasil dapat dibuktikan. |
| Melakukan langkah perbaikan | Pilih bila kamu menindaklanjuti hambatan atau hasil check-in sebelumnya. |
| Belum menjalankan langkah | Pilih bila belum ada langkah yang dikerjakan pada periode ini. |

**C2 — Hasil kegiatan**

| Opsi | Petunjuk |
|---|---|
| Hasil sesuai langkah yang direncanakan | Pilih bila hasil langkah periode ini sesuai rencana dan dapat ditunjukkan. |
| Ada hasil, belum sesuai rencana | Pilih bila ada kemajuan tetapi hasil atau waktunya belum sesuai rencana. |
| Ada hasil, bukti belum cukup | Pilih bila hasil sudah ada tetapi tautan atau isi buktinya belum memadai. |
| Belum ada hasil | Pilih bila kegiatan belum menghasilkan perubahan yang dapat ditunjukkan. |

**C3 — Pembelajaran**

| Opsi | Petunjuk |
|---|---|
| Memahami kebutuhan penerima manfaat | Pilih bila kamu mendapat pemahaman baru tentang kebutuhan pihak yang dilayani. |
| Menemukan cara kerja yang lebih baik | Pilih bila kamu belajar memperbaiki cara menjalankan langkah. |
| Memahami kerja sama atau komunikasi | Pilih bila pembelajaranmu berkaitan dengan bekerja bersama orang lain. |
| Memahami diri atau pertimbangan etika | Pilih bila kamu lebih memahami perilaku diri atau dampak keputusanmu. |
| Belum menemukan pembelajaran baru | Pilih bila belum ada pembelajaran baru yang dapat kamu jelaskan. |

**C4 — Hambatan**

| Opsi | Petunjuk |
|---|---|
| Tidak ada hambatan | Pilih bila tidak ada kendala yang memengaruhi langkah saat ini. |
| Waktu atau prioritas | Pilih bila pembagian waktu atau prioritas menghambat pengerjaan. |
| Data atau bukti | Pilih bila data atau bukti yang diperlukan belum tersedia. |
| Akses atau sumber daya | Pilih bila kamu memerlukan jejaring, mitra, materi, atau sumber daya lain. |
| Koordinasi atau keputusan | Pilih bila kemajuan tertahan oleh komunikasi atau keputusan yang belum selesai. |
| Hambatan lain | Pilih bila kendala belum tercakup lalu jelaskan dalam satu kalimat alasan. |

**C5 — Langkah berikutnya / perbaikan**

| Opsi | Petunjuk |
|---|---|
| Menyelesaikan langkah POC berikutnya | Pilih bila langkah berikutnya melanjutkan rencana yang sudah disepakati. |
| Memperbaiki hasil yang belum sesuai | Pilih bila kamu perlu memperbaiki hasil langkah yang sudah dikerjakan. |
| Melengkapi bukti | Pilih bila kamu perlu menambahkan atau memperbaiki bukti hasil. |
| Meminta dukungan atau akses | Pilih bila kamu membutuhkan bantuan agar langkah dapat berjalan. |
| Membahas hambatan dengan SM | Pilih bila hambatan perlu dibahas bersama SM sebelum kamu mengambil keputusan. |

**C6 — Warna Asmen**

| Opsi | Petunjuk |
|---|---|
| Green — 3 | Pilih bila pekerjaan sesuai rencana dan ada bukti. |
| Yellow — 1 | Pilih bila terlambat, hasil kurang, atau bukti belum cukup serta mentee sudah mengisi langkah perbaikan. |
| Red — 0 | Pilih bila pekerjaan berhenti atau salah arah; dua Yellow tanpa perbaikan juga otomatis menjadi Red. |

**C7 — Kekuatan bukti**, dipakai di semua form yang menambah bukti KPI. Contoh makna berikut adalah petunjuk operasional sementara, bukan rubrik KPI baru (A06).

| Opsi | Petunjuk |
|---|---|
| Aktivitas — 0 | Pilih bila bukti baru menunjukkan kegiatan telah dilakukan. |
| Output — 1 | Pilih bila bukti menunjukkan produk atau keluaran kegiatan sudah tersedia. |
| Mutu — 2 | Pilih bila bukti menunjukkan kualitas keluaran menurut ukuran yang jelas. |
| Outcome — 3 | Pilih bila bukti menunjukkan perubahan atau manfaat yang terjadi. |
| Keberlanjutan — 4 | Pilih bila bukti menunjukkan manfaat atau praktik terus berjalan. |

**C8 — Sumber bukti**

| Opsi | Petunjuk |
|---|---|
| Laporan diri | Pilih bila bukti berasal dari catatan atau pernyataanmu sendiri. |
| Pihak ketiga | Pilih bila bukti berasal dari penerima manfaat, mitra, atau pihak lain. |

Panel verifikasi Asmen: **Diterima** — “Pilih bila tautan dapat dibuka dan tag sesuai isinya.” **Perlu perbaikan** — “Pilih bila tautan tidak dapat dibuka atau isi belum mendukung tag.” Status **Menunggu pemeriksaan** diisi sistem, berpetunjuk “Bukti belum diperiksa Asmen dan belum masuk P4.” Asmen dapat mengoreksi tag memakai C7 disertai alasan; sumber tidak menjadi pengali skor.

### 2.3 Form 2 — Mentoring mentee; konfirmasi dan akses oleh SM

| Field | Tipe / wajib | Pilihan dengan petunjuk satu kalimat |
|---|---|---|
| Prioritas | Dropdown; wajib | **Kemajuan KPI** — “Pilih untuk membahas hasil terhadap KPI fokus.” **Hambatan/perbaikan** — “Pilih untuk membahas masalah yang menahan kemajuan.” **Keputusan mentee** — “Pilih untuk menimbang keputusan yang akan kamu ambil sendiri.” **Dukungan/akses** — “Pilih untuk meminta jejaring, mitra, atau materi yang diperlukan.” |
| Pemahaman baru | Dropdown; wajib | **Arah langkah lebih jelas** — “Pilih bila kamu lebih memahami langkah yang perlu dilakukan.” **Ukuran hasil lebih jelas** — “Pilih bila kamu lebih memahami hasil dan bukti yang perlu ditunjukkan.” **Pilihan keputusan lebih jelas** — “Pilih bila kamu lebih memahami pilihan beserta konsekuensinya.” **Belum ada pemahaman baru** — “Pilih bila pembahasan masih perlu dilanjutkan agar lebih jelas.” |
| Keputusan | Dropdown; wajib | **Melanjutkan langkah** — “Pilih bila kamu memutuskan menjalankan langkah yang sudah disepakati.” **Memperbaiki cara kerja** — “Pilih bila kamu memutuskan memperbaiki pelaksanaan tanpa mengubah target.” **Mengumpulkan informasi dahulu** — “Pilih bila kamu belum mengambil keputusan dan masih memerlukan informasi.” **Mengusulkan pembahasan ulang POC** — “Pilih bila kamu ingin membahas perubahan melalui mekanisme resmi tanpa langsung mengubah POC.” |
| Tindakan | Dropdown C5; wajib | Gunakan petunjuk C5; tindakan tetap merupakan keputusan mentee. |
| Bukti yang dibawa | Dropdown + pilih bukti/URL; wajib | **Bukti tersedia** — “Pilih dan lampirkan bukti yang akan dibahas.” **Bukti perlu dilengkapi** — “Pilih bila bukti belum cukup lalu tentukan langkah melengkapinya.” **Belum ada bukti** — “Pilih bila belum ada bukti hasil yang dapat dibawa ke sesi ini.” |
| Tenggat | Dropdown katalog waktu; wajib | Petunjuk setiap opsi mengikuti 2.1. |
| Alasan singkat | Satu kalimat; kondisional | Wajib jika memilih belum ada pemahaman/bukti atau mengusulkan pembahasan ulang POC. |
| Konfirmasi SM | Dropdown; wajib di sisi SM | **Sesuai hasil mentoring** — “Pilih bila catatan mencerminkan pembahasan dan keputusan mentee.” **Perlu diperbaiki mentee** — “Pilih bila catatan belum sesuai lalu jelaskan koreksinya dalam satu kalimat.” |
| Akses diberikan? | Dropdown; wajib di sisi SM | **Ada** — “Pilih bila kamu memberikan akses yang dapat dicatat untuk mentee ini.” **Belum pada sesi ini** — “Pilih bila belum ada akses yang diberikan pada sesi ini.” |
| Jenis akses | Dropdown; wajib bila Ada | **Jejaring** — “Pilih bila mentee dikenalkan kepada orang atau jaringan yang relevan.” **Mitra** — “Pilih bila mentee mendapat akses kepada organisasi atau mitra.” **Materi** — “Pilih bila mentee mendapat materi yang membantu langkahnya.” |
| Bukti akses + alasan | URL + satu kalimat; wajib bila Ada | Catat penerima mentee dan semester otomatis dari sesi; catatan umum kelompok tidak otomatis dihitung sebagai akses semua anggota. |

Validasi: sesi mentoring yang benar, mentee di kelompoknya, satu form per sesi; aksi dan tenggat wajib meski belum ada bukti. Konfirmasi SM tidak mengubah keputusan mentee dan tidak menghasilkan poin kehadiran. Catatan proses mentoring dapat menjadi link penilaian, tanpa mengklaim sebagai bukti Outcome.

### 2.4 Form 3 — Review per KPI

Tampilkan nama KPI, baseline, target, satuan, dan empat batas sebagai data terkunci. Ulangi kartu berikut hanya untuk 1–3 KPI pada POC.

| Field | Tipe | Pilihan / petunjuk | Validasi |
|---|---|---|---|
| Hasil aktual | Dropdown nilai aktual dari katalog KPI | Setiap `{nilai, satuan}`: “Pilih bila bukti periode ini menunjukkan tepat {nilai} {satuan}.” Untuk milestone `{nama tahap}`: “Pilih bila bukti menunjukkan tahap {nama tahap} benar-benar tercapai.” | Menyimpan objek nilai aktual, bukan hanya klaim Achieving. Nilai di luar katalog menahan pengajuan dan meminta Admin menambah opsi berdasarkan bukti; lihat A07. |
| Kondisi terhadap batas KPI | Dropdown dari empat batas POC | Setiap `{nama batas}`: “Pilih bila hasil aktualmu berada pada kriteria {nama batas} yang tertulis dalam POC.” | Laporan mentee, **bukan level akhir**; kriteria harus sesuai arah dan versi KPI. |
| Bukti hasil | Pilih bukti/URL + C7/C8 | Petunjuk 2.1, C7, C8. | Tanpa link otomatis Not Achieved; antarmuka menampilkan akibatnya sebelum kirim. |
| Alasan hasil | Satu kalimat | Tanpa opsi. | Wajib untuk menjelaskan hubungan hasil dengan KPI. |
| Kelengkapan, oleh Asmen | Dropdown | **Lengkap** — “Pilih bila isian dan akses bukti sudah diperiksa.” **Perlu dilengkapi** — “Pilih bila masih ada isian atau akses bukti yang perlu diperbaiki mentee.” | Tidak menetapkan level capaian dan tidak mengubah target. |
| Level capaian, oleh penilai | Dropdown di bawah | Empat level P2. | SM FEB/MAY/AUG; Admin NOV; Achieving/Exceeding dinonaktifkan tanpa bukti terverifikasi minimal Outcome (A06). |
| Alasan level + bukti rujukan | Satu kalimat + pilih bukti | Alasan wajib; bukti mengambil item KPI yang sama. | Pengecualian tanpa bukti dan Not Achieved dijelaskan A05. |

| Level P2 | Petunjuk |
|---|---|
| Exceeding — 4 | Pilih bila hasil memenuhi batas Exceeding pada POC dan bukti minimal Outcome. |
| Achieving — 3 | Pilih bila hasil memenuhi batas Achieving pada POC dan bukti minimal Outcome. |
| Progressing — 2 | Pilih bila hasil memenuhi batas Progressing pada POC dan memiliki link bukti. |
| Not Achieved — 0 | Pilih bila hasil belum memenuhi batas capaian atau sistem menetapkannya karena tidak ada link bukti. |

Selesai Review berarti pengajuan diperiksa dan seluruh KPI dinilai penilai yang berwenang; bukan sekadar membuka atau menyimpan draft (A08). Bukti P4 dibatasi yang relevan dengan KPI dan tersedia sebelum cutoff; aturan cakupan kumulatif masih A09.

### 2.5 Form 4 — Kepemimpinan

Enam kartu tetap: **Mengenal diri, Berpikir kritis, Komunikasi, Kolaborasi, Eksekusi, Etika**. Mentee memilih bukti tiap kompetensi dan alasan satu kalimat. Pada sisi penilai: pilih level, rujuk bukti yang sama, tulis satu kalimat alasan level. Sistem dapat menyalin alasan mentee sebagai bahan, tetapi penilai harus mengonfirmasinya.

| Field | Input / validasi |
|---|---|
| Kompetensi | Otomatis, enam kompetensi unik; tidak dapat ditambah/dihapus. |
| Bukti kompetensi | Pilih bukti lama/URL baru; wajib satu link minimal per kompetensi. |
| Alasan mentee | Satu kalimat yang mengaitkan bukti dengan kompetensi; wajib. |
| Level penilai | Dropdown 1–4; hanya SM Mei atau Admin fungsi Tim Penilaian November. |
| Alasan level | Satu kalimat; wajib per kompetensi dan tidak boleh diganti mentee. |

| Level P3 | Petunjuk sementara A10 |
|---|---|
| 1 — Awal | Pilih bila bukti menunjukkan perilaku awal pada kompetensi ini. |
| 2 — Berkembang | Pilih bila bukti menunjukkan perilaku mulai berkembang pada kompetensi ini. |
| 3 — Konsisten | Pilih bila bukti menunjukkan perilaku dilakukan secara konsisten. |
| 4 — Teladan | Pilih bila bukti menunjukkan perilaku yang dapat diteladani orang lain. |

Rubrik perilaku spesifik untuk masing-masing kompetensi belum diberikan; tidak boleh mengarangnya menjadi aturan final. Mei/November belum dapat dipublikasikan jika salah satu level, bukti atau alasan kosong. Agustus hanya baca hasil Mei; Februari menampilkan “Belum dinilai”, tanpa form kepemimpinan wajib.

### 2.6 Form 5 — Survei mentee

Dua dropdown wajib: penilaian terhadap Asmen dan terhadap SM yang tercatat pada penugasannya. Satu komentar terbuka opsional (A02); hanya satu survei per mentee per Review (A11).

| Opsi untuk masing-masing staf | Petunjuk |
|---|---|
| 1 — Sangat kurang | Pilih bila dukungan yang kamu terima sangat belum memenuhi kebutuhan peran tersebut. |
| 2 — Kurang | Pilih bila dukungan masih perlu banyak perbaikan. |
| 3 — Baik | Pilih bila dukungan sudah memenuhi kebutuhan peran tersebut. |
| 4 — Sangat baik | Pilih bila dukungan sangat membantu sesuai perannya. |

Validasi: nilai bilangan bulat 1–4, dua staf yang benar, tidak menilai diri sendiri. Tidak ada respons = belum dapat dinilai, bukan nilai nol. Nama responden dan komentar mentah hanya Admin; kebijakan anonimitas dan minimum responden perlu diputuskan sebelum produksi (A11).

## 3. Fungsi skor dan unit test

Kode penuh: [src/scoring.ts](src/scoring.ts). Tes: [test/scoring.test.ts](test/scoring.test.ts). Tidak memerlukan paket pihak ketiga. Jalankan `npm test` dari folder paket dengan Node.js 24.12 atau lebih baru yang mendukung eksekusi TypeScript tanpa transpiler. Node menghapus anotasi tipe saat menjalankan kode; ini bukan pemeriksaan tipe statis ([dokumentasi Node.js](https://nodejs.org/docs/latest-v24.x/api/typescript.html)).

### 3.1 Mentee

```text
P1mentah = jumlah(Green×3 + Yellow×1 + Red×0) / (jumlah check-in×3) ×25
P2mentah = jumlah(Exceeding×4 + Achieving×3 + Progressing×2 + NotAchieved×0) / (jumlah KPI×4) ×25
P3mentah = jumlah enam level kepemimpinan /24 ×25
P4mentah = jumlah poin bukti terkuat yang diverifikasi, per KPI / (jumlah KPI×4) ×25
P1–P4 = round masing-masing nilai mentah, setengah dibulatkan ke atas
Skor MAY/NOV = P1 + P2 + P3 + P4
Skor FEB = round((P1 + P2 + P4) ×100/75)                 [A12]
Skor AUG = P1 + P2 + P3 dari MAY + P4
```

Jumlah KPI selalu mencakup semua 1–3 KPI fokus, bukan hanya KPI yang sukses. Tanpa bukti pada suatu KPI → P2 otomatis 0 dan P4 0 untuk KPI itu; penyebut tidak berkurang. Banyak tautan pada satu KPI tidak menggandakan poin. Sumber Laporan diri/Pihak ketiga tidak mempunyai pengali tambahan. Bukti Aktivitas bernilai 0, bukan tidak adanya bukti.

Untuk P1, input kode merupakan status **efektif**, setelah aturan Yellow dijalankan, atas data periode yang sudah dinormalisasi server. Status tidak lengkap atau tidak ada check-in tidak boleh disamarkan menjadi skor final nol. Penilaian kepemimpinan lengkap minimal memberi 6/24×25=6,25 (dibulatkan 6); jangan mengubah level 1 menjadi nol.

Contoh wajib, Review Mei:

| Komponen | Perhitungan mentah | Hasil dibulatkan |
|---|---|---:|
| P1 | (7×3 + 2×1 + 1×0)/30×25 = 19,166666… | 19 |
| P2 | (3+2)/8×25 = 15,625 | 16 |
| P3 | (2+3+2+2+3+3)/24×25 = 15,625 | 16 |
| P4 | (3+2)/8×25 = 15,625 | 16 |
| Total | 19+16+16+16 | **67 — Perlu dukungan** |

Jika hanya total mentah dibulatkan akan menjadi 66; pengguna telah mengunci cara per komponen. Tes memakai dua Yellow yang tidak berdampingan agar agregat contoh tidak diam-diam diubah oleh aturan otomatis. Contoh data ini tidak dimasukkan ke database produksi.

| Skor akhir | Kategori / warna | Tindak lanjut |
|---|---|---|
| 85–100 | Unggul / hijau | Pantau kemajuan. |
| 70–84 | Baik / hijau | Pantau kemajuan. |
| 50–69 | Perlu dukungan / kuning | Masukkan pembahasan khusus ke mentoring berikutnya. |
| 0–49 | Berisiko / merah | Asmen dan SM menyusun rencana perbaikan dalam 7 hari. |

Warna kategori skor dan warna check-in adalah dua data berbeda; jangan otomatis mengubah seluruh check-in menjadi Red karena skor total rendah.

### 3.2 Asmen dan SM

Fungsi `scoreAsmen()` dan `scoreSeniorMentor()` menyusun tujuh ceklis dari metrik, lalu `scoreStaff()` menghitung:

```text
skor = jumlah ceklis true /7 ×100
7 true → Baik; 5–6 true → Perlu perbaikan; 0–4 true → Perlu bantuan L&C Lead
Ada null → Belum lengkap, skor final null, tetap tampilkan jumlah true
```

Skor staf disimpan dengan presisi; tampilan boleh dua desimal, kategori tetap dari jumlah ceklis, bukan angka tampilan. Tidak ada skor hasil mentee dalam input penilaian SM.

**Sumber penghitungan tujuh ceklis Asmen** — untuk rentang penilaian A09:

| No | Ceklis / pembilang dan penyebut atau syarat | Bukti sumber |
|---:|---|---|
| 1 | Sesi check-in terlaksana / sesi check-in terjadwal yang sudah jatuh tempo ≥90%. | sessions + attendance/link kegiatan. |
| 2 | Semua warna diisi ≤2 hari kalender sesudah check-in (A13); status belum diisi setelah batas = tidak terpenuhi. | actual_at dan assessed_at + audit. |
| 3 | Seluruh Red dibuatkan eskalasi ≤2 hari kerja dari Red terdeteksi; tanpa Red = terpenuhi bila data lengkap (A13). | checkin_statuses + escalations.created_at. |
| 4 | Catatan check-in lengkap dan link dapat dibuka / seluruh catatan check-in yang seharusnya tersedia ≥90% (A13). | checkin_forms + evidence/access_checked_at. |
| 5 | Ringkasan diunggah sebelum actual_at mentoring / sesi mentoring terlaksana ≥90%. | mentoring_summaries + sessions. |
| 6 | Tidak ada laporan perubahan target atau menilai isi strategi. | role_violation_reports; penanganan laporan dibatalkan masih A14. |
| 7 | Rata-rata respons survei Asmen ≥3,0/4. | surveys.asmen_score; kosong = null. |

**Sumber penghitungan tujuh ceklis SM**:

| No | Ceklis / syarat | Bukti sumber |
|---:|---|---|
| 1 | Terlaksana/terjadwal jatuh tempo ≥10/11; untuk n sesi, paling sedikit ceil(10n/11) terlaksana (A15). | sessions mentoring dan bukti pelaksanaan. |
| 2 | Tidak ada dua sesi terjadwal berturut-turut yang ditunda; jika ada langsung eskalasi L&C Lead. | sequence_no + session_changes, bukan hanya status jadwal terkini. |
| 3 | Semua mentee binaan mempunyai waktu kunci POC ≤31 Jan 2027. | poc_contracts + riwayat penugasan. |
| 4 | Semua level capaian terisi ≤7 hari kalender sesudah sesi Review (A13). | sessions.actual_at + review_kpi_results.graded_at. |
| 5 | Setiap mentee mempunyai ≥1 catatan akses pada setiap semester yang sudah berakhir (A15). | access_logs + semesters + penugasan. |
| 6 | Tidak ada laporan mengambil keputusan atas nama mentee. | role_violation_reports. |
| 7 | Rata-rata respons survei SM ≥3,0/4. | surveys.sm_score; kosong = null. |

Layanan server perlu mengagregasi metrik dari tabel dengan cutoff, bukan menerima nilai boolean dari mentee/staf. `null` bukan lolos; Admin belum bisa menerbitkan skor staf sampai tujuh ceklis dapat dinilai. Setiap ceklis terbit wajib mempunyai link laporan sumber yang dapat dibuka Admin, termasuk ceklis “tidak ada laporan” yang merujuk hasil pencarian audit pada rentang yang dinilai.

### 3.3 Cakupan pengujian

Laporan eksekusi aktual tersedia di [HASIL-UJI.txt](HASIL-UJI.txt). Meliputi contoh 67, Februari, Agustus memakai Mei, November, batas kategori, bukti Outcome, tidak ada link, bukti terkuat, kelengkapan kompetensi, tujuh ceklis staf, dua Yellow, tenggat hari kerja/libur, skor berisiko, dua mentoring tertunda, syarat kelulusan dan batas role. Ini unit test kode inti, bukan bukti aplikasi, database, login, notifikasi, atau produksi sudah bekerja.

## 4. Logika otomatis, eskalasi, kelulusan

Kode inti: [src/workflows.ts](src/workflows.ts). Fungsi mengembalikan keputusan/tugas; penyimpanan dan pengirim notifikasi belum disambungkan.

### 4.1 Warna check-in dan rantai Yellow

1. Mentee mengirim lima jawaban dan langkah berikutnya; Asmen memeriksa bukti, mengusulkan warna, menulis alasan.
2. Green memerlukan bukti; Yellow memerlukan langkah perbaikan dan tenggat. Red dapat diberikan langsung untuk berhenti/salah arah.
3. Ambil check-in tepat sebelumnya milik mentee menurut jadwal/kejadian, bukan urutan klik penilai. Dua usulan Yellow berturut-turut memerlukan pilihan Asmen apakah ada perbaikan; bukti dan alasan menguatkan pilihan.
4. Jika belum ada perbaikan: simpan requested=Yellow, effective=Red, automatic_red=true, previous_checkin_id. P1 untuk check-in kedua memakai **0**, bukan 1. Jika ada perbaikan: tetap Yellow. Usulan Yellow ketiga tanpa perbaikan tetap memicu Red; status asli sebelumnya disimpan (A17).
5. Dalam transaksi yang sama, buat eskalasi unik `checkin:{id}:red`, penerima SM + Admin; jatuh tempo 2 hari kerja dari deteksi. Worker mengirim segera, bukan menunggu dua hari. Jangan menahan eskalasi hanya karena bukti belum lengkap.
6. Penerima harus mengakui/menindaklanjuti paling lambat due_at menurut kebijakan A18. Audit waktu deteksi, kirim, pengakuan dan penyelesaian disimpan terpisah.
7. Koreksi status lama memerlukan audit, hitung ulang check-in berikutnya, dan versi skor baru. Bila tugas lama sudah terkirim, tandai sumber dikoreksi; jangan menghapus riwayatnya.

Tanggal Jakarta, akhir pekan Sabtu/Minggu, dan kalender libur Admin menentukan hari kerja. Implementasi sementara mempertahankan jam kejadian: Jumat 10.00 → Selasa 10.00; jika Senin libur → Rabu 10.00. Hari deteksi tidak dihitung sebagai hari pertama (A18).

### 4.2 Review dan tindak lanjut skor

- Asmen memeriksa kelengkapan; penilai berwenang menetapkan level. Tanpa link KPI → Not Achieved otomatis, dicatat sebagai alasan sistem; tidak ada pilihan menaikkan level dengan mengganti payload.
- Achieving/Exceeding diblokir sampai ada bukti terverifikasi minimal Outcome. Tidak cukup hanya mengisi tag “Outcome” sendiri.
- Hitung nilai mentah dan nilai bulat; tampilkan pratinjau sebelum publikasi, lalu bekukan snapshot dengan versi aturan dan sumber datanya. Nilai belum lengkap tampil **Belum lengkap**, tanpa kategori final.
- Pada skor 50–69, buat agenda khusus untuk mentoring berikutnya; jika belum ada jadwal, tampilkan kebutuhan penjadwalan di dashboard SM.
- Pada skor <50, buat eskalasi unik `score:{snapshotId}:risk`, notifikasi segera dan rencana perbaikan due=published_at+7 hari kalender (A18). Asmen dan SM harus sama-sama mengonfirmasi rencana. Mentee melihat tindakan dan tenggat.
- Mengulang kalkulasi snapshot yang sama tidak membuat tugas ganda. Snapshot koreksi baru bisa membuat pemberitahuan koreksi, bukan mengirim pesan lama seolah peristiwa baru tanpa konteks.
- Dua sesi mentoring terjadwal berurutan ditunda → eskalasi unik ke **Admin fungsi L&C Lead**. Tenggat penyelesaiannya belum ditentukan, kode mengembalikan null; sistem tidak mengarang SLA.

### 4.3 Kelulusan otomatis, terpisah dari skor

`evaluateGraduation()` memeriksa enam syarat berikut; nilai skor tidak ada dalam parameter.

| Syarat | Kondisi |
|---|---|
| POC tepat waktu | locked_at paling lambat 31 Jan 2027 pukul 23.59.59,999 WIB, inklusif. |
| Empat Review terisi | FEB, MAY, AUG, NOV sudah lengkap menurut A08, bukan empat baris draft atau Review duplikat. |
| Portofolio akhir | URL unggahan akhir valid tersedia. |
| Leadership Showcase | Kehadiran acara Oktober 2027 tercatat dengan bukti. |
| Mentoring | Hadir ≥9 dari 11, atau ambang versi aturan Admin yang berlaku. |
| Check-in | Hadir ≥18 dari 22, atau ambang versi aturan Admin yang berlaku. |

Semua true → **Lulus**. Ada false → **Belum memenuhi**, tampilkan syaratnya. Hanya true/null → **Menunggu data**. Null dipakai untuk kegiatan/data yang belum jatuh tempo, sehingga mentee tidak langsung dianggap gagal pada Januari. Setelah data akhir ditutup Admin, kekurangan data menjadi belum memenuhi. POC terlambat tetap false meski seluruh kehadiran lengkap. Skor 49 tidak otomatis menggagalkan; skor 100 tidak membebaskan syarat.

Kehadiran hanya dari sesi unik yang benar-benar diikuti. Menunda lalu menjadwal ulang sesi yang sama tidak menambah penyebut. Kehadiran sesi pengganti dan perubahan kelompok perlu kebijakan A19. Sertifikat mencatat skor Review akhir November yang disahkan (A20), status kelulusan dihitung terpisah.

### 4.4 Matriks hak akses

| Aksi | Mentee | Asmen | SM | Admin |
|---|---|---|---|---|
| Baca data mentee | Sendiri | Kelompok sendiri | Binaan sendiri | Seluruh cohort |
| Isi lima form mentee | Sendiri | Tidak | Tidak | Koreksi administratif diaudit |
| Ubah baseline/target | Draft sendiri (A16) | Tidak | Tidak atas nama mentee | Melalui kebijakan revisi (A16) |
| Kunci POC | Tidak | Tidak | Binaan sendiri | Pengelolaan administratif diaudit |
| Tetapkan warna | Tidak | Kelompok sendiri | Tidak | Koreksi diaudit |
| Verifikasi tag bukti | Tidak | Kelompok sendiri | Tidak | Koreksi diaudit |
| Level KPI FEB–AUG | Tidak | Tidak | Binaan sendiri | Baca; override perlu kebijakan |
| Level KPI NOV | Tidak | Tidak | Tidak | Ya |
| Kepemimpinan MAY | Tidak | Tidak | Binaan sendiri | Baca; override perlu kebijakan |
| Kepemimpinan NOV | Tidak | Tidak | Tidak | Fungsi Tim Penilaian |
| Konfirmasi mentoring / catat akses | Tidak | Tidak | Binaan sendiri | Koreksi diaudit |
| Lihat skor staf / konfigurasi | Tidak | Tidak | Tidak | Ya |

`can()` mencakup akses baca, edit form, edit draft POC, kunci, status, verifikasi, penilaian, konfigurasi, dan baca skor staf. Konfirmasi mentoring, unggah ringkasan, pengelolaan kehadiran, ekspor, serta override terperinci masih harus dibuat pada endpoint; jangan memakai izin READ sebagai izin menulis. Admin tidak otomatis boleh memberi nilai pada periode SM dalam kode inti. Identitas dan penugasan selalu diperoleh dari server, bukan input browser.

## 5. Wireframe teks empat dashboard

Semua menampilkan cohort, periode, pembaruan terakhir, dan badge **Pratinjau / Terbit / Belum lengkap**. Warna selalu disertai teks. Pada layar sempit, kolom menjadi kartu vertikal; aksi utama tetap terbaca tanpa geser horizontal. Ini rancangan, belum uji tampilan aplikasi.

### 5.1 Mentee — “Apa yang harus saya perbaiki?”

```text
[IPB LEAP] [Cohort 1] [Review: Mei 2027 ▼] [Akun]
Halo, {nama}. Skor terbit: 67/100 · PERLU DUKUNGAN
P1 Proses 19/25 | P2 Target 16/25 | P3 Kepemimpinan 16/25 | P4 Bukti 16/25
[Kenapa skorku demikian?] → rumus, bukti dan alasan penilai

PERLU DILAKUKAN
[1] Lengkapi bukti KPI B → bukti saat ini: Mutu [Buka form]
[2] Selesaikan langkah perbaikan {tanggal} [Lihat kesepakatan]
[3] Bahas kemajuan pada mentoring {tanggal} [Lihat agenda]

FORM SAYA: Check-in {status, tenggat} | Mentoring | Review | Kepemimpinan | Survei
POC terkunci {tanggal} [Lihat target dan empat batas]
KELULUSAN: 4/6 syarat terpenuhi [Lihat enam syarat]
Riwayat skor: Feb / Mei / Agu / Nov — nilai Mei dipakai pada Agu
```

Aksi perbaikan diambil dari bukti/level/check-in aktual; jangan menyuruh “naikkan tag menjadi Outcome” tanpa perubahan yang dapat dibuktikan. Bila tidak ada nilai final, tampilkan alasan kekurangan data, bukan 0/100.

### 5.2 Asmen — “Siapa yang perlu dibantu minggu ini?”

```text
[Kelompok saya] [Minggu/periode ▼] [5 mentee]
PRIORITAS: {n} Red | {n} skor <50 | {n} form terlambat | {n} bukti menunggu
Nama          Skor/label         Check-in     Tindakan dan tenggat
{Mentee A}    42 Berisiko        Red          Rencana bersama SM {due} [Buka]
{Mentee B}    67 Perlu dukungan  Yellow       Periksa langkah perbaikan [Buka]
{Mentee C}    Belum lengkap     Belum dinilai Lengkapi status [Buka]
...
Urutan skor terendah → tertinggi; data belum lengkap diberi antrean sendiri.
[Antrean tetapkan warna] [Verifikasi bukti] [Ringkasan sebelum mentoring]
```

Status Red tetap paling terlihat walau snapshot skor sebelumnya tinggi. Nama/angka di wireframe hanya contoh, bukan data peserta nyata. Asmen tidak melihat tombol ubah target/level capaian atau skor kinerja staf.

### 5.3 SM — “Apa yang harus saya nilai?”

```text
[Kelompok binaan ▼] [Review Mei ▼]
MENUNGGU PENILAIAN: {n} KPI | {n} kepemimpinan | {n} POC perlu dikunci
Mentee / KPI    Hasil aktual    Bukti/tag       Kelengkapan Asmen    [Nilai]
{nama}/KPI A    {nilai/satuan}  Outcome ✓      Lengkap              [Buka]
{nama}/KPI B    {nilai/satuan}  Mutu ✓         Lengkap              [Buka]
Saat menilai: baseline, target, empat batas, bukti, level, satu kalimat alasan

TINDAK LANJUT: Red due {tanggal} | Rencana risiko | Mentoring khusus skor 50–69
MENTORING: [Konfirmasi catatan] [Catat akses per mentee]
November: “Penilaian akhir oleh Admin/Tim Penilaian”; tombol nilai SM tidak tersedia.
```

### 5.4 Admin — seluruh cohort dan tanda merah

```text
[Bidang ▼] [Kelompok ▼] [Review ▼] [Kategori ▼] [Data lengkap/belum lengkap ▼]
Tab [Mentee] [Asmen] [SM] [Eskalasi] [Aturan & kalender]
Mentee: jumlah, sebaran kategori, belum lengkap, syarat kelulusan
Staf: jumlah ceklis /7, skor, kategori, sumber per ceklis
TANDA MERAH:
- Red belum ditindaklanjuti; due {tanggal/jam}
- Rencana skor <50 belum dikonfirmasi Asmen+SM
- Dua mentoring berurutan tertunda → L&C Lead
- POC terlambat / Review belum dinilai / link bukti gagal dibuka
[Detail] [Penanggung jawab] [Riwayat audit] [Terbitkan hasil November]
[Ambang kehadiran] [Tanggal Review] [Hari libur] [Versi aturan]
```

Persentase dashboard memakai penyebut yang jelas dan menampilkan jumlah belum lengkap terpisah. Perubahan konfigurasi menampilkan dampak pada pratinjau dan tanggal berlaku sebelum disimpan; tidak mengubah skor lama tanpa proses koreksi.

## 6. Daftar notifikasi otomatis

Nama, tanggal, kelompok, dan tautan diisi dari server. Nama peserta tidak disebarkan ke penerima di luar penugasan. **H adalah waktu jadwal kegiatan**, H+1 mengacu waktu kegiatan benar-benar terlaksana; jatuh tempo form adalah data tersendiri (A21).

| Kode | Pemicu | Penerima | Pesan singkat |
|---|---|---|---|
| CHECKIN_H2 | scheduled_at−2 hari | Mentee + Asmen kelompok | “Check-in {tanggal} akan tiba. Siapkan hasil, bukti, dan langkah berikutnya.” |
| MENTORING_H2 | scheduled_at−2 hari | Mentee + SM; Asmen menyiapkan ringkasan | “Mentoring {tanggal} akan tiba. Siapkan prioritas dan bukti kemajuan.” |
| ABC_H1 | actual_at+1 hari, form terkait belum lengkap | Mentee; Asmen sebagai pendamping check-in atau SM untuk mentoring | “Catatan ABC sesi {tanggal} belum lengkap. Lengkapi hasil, pembelajaran, dan langkah berikutnya di {tautan}.” |
| REVIEW_H7 | Review.due_at−7 hari | Mentee, Asmen, penilai periode terkait | “Review {periode} tujuh hari lagi. Siapkan hasil aktual dan bukti setiap KPI.” |
| CHECKIN_RED | effective berubah/tercatat Red | SM + Admin; mentee dan Asmen diberi kabar tugasnya | “Status check-in {nama} Red. Tinjau dan tindak lanjuti paling lambat {due}.” |
| SCORE_RISK | snapshot terbit total <50 | Mentee, Asmen, SM, Admin | “Skor {nama} {skor}: Berisiko. Asmen dan SM perlu mengisi rencana perbaikan paling lambat {due}.” |
| ESCALATION_CREATED | Eskalasi lain dibuat | Pemilik dan penerima eskalasi | “Ada eskalasi {jenis} untuk {kelompok/nama}. Buka detail dan tindak lanjutnya di {tautan}.” |
| MENTORING_DELAY | Dua sesi terjadwal berurutan ditunda | Admin fungsi L&C Lead; SM terkait | “Dua mentoring berurutan di {kelompok} tertunda. Mohon bantu penjadwalan dan tindak lanjut.” |
| FORM_OVERDUE_3 | form_due_at+3 hari, belum lengkap | Mentee; salinan Asmen | “Form {jenis} sudah terlambat tiga hari. Lengkapi di {tautan}; Asmen menerima salinan pengingat ini.” |
| SUPPORT_AGENDA | Skor terbit 50–69 | Mentee, Asmen, SM | “Skor {nama} memerlukan dukungan. Bahas langkah perbaikan pada mentoring berikutnya.” |

SUPPORT_AGENDA adalah sarana memenuhi kewajiban pembahasan, bukan SLA baru. CHECKIN_RED/SCORE_RISK/MENTORING_DELAY sudah merupakan pemberitahuan eskalasi: jangan mengirim ESCALATION_CREATED lagi untuk peristiwa yang sama.

Aturan worker: satu kunci `{template}:{sourceId}:{sourceVersion}:{recipient}:{channel}`; klaim baris antrean secara transaksional, kirim, tandai terkirim, ulangi kegagalan dengan batas retry terkonfigurasi. Periksa keadaan terbaru tepat sebelum kirim; batalkan pengingat bila form sudah lengkap, sesi dibatalkan, atau jadwal berubah. H-2 lama dibatalkan ketika jadwal bergeser; riwayat pengiriman tidak dihapus. Pilihan kanal, retry, jam pengiriman dan arti ABC di A21–A22. Pesan CC tidak boleh memperluas akses halaman tujuan.

## 7. Asumsi dan keputusan yang dibutuhkan

### 7.1 Sudah diputuskan pengguna

1. **PostgreSQL + TypeScript** dipakai untuk paket ini.
2. **Bulatkan setiap komponen, lalu jumlahkan**; contoh wajib 67. Nilai mentah tetap disimpan agar perhitungan dapat ditelusuri.
3. Semua angka/poin/syarat awal mengikuti teks: empat komponen 25, 1–3 KPI, enam kompetensi 1–4, 7 ceklis staf, 9/11 mentoring, 18/22 check-in, empat Review, tenggat POC 31 Jan 2027. Perubahan konfigurasi kelak harus eksplisit, bukan asumsi implementasi.

### 7.2 Daftar asumsi sementara, dampak, dan pertanyaan

Semua pilihan di bawah masih perlu disahkan; kode inti menggunakan pilihan sementara jika disebutkan. Paket tidak menyebut pilihan ini sebagai keputusan pengguna.

| ID | Ketidakjelasan / benturan | Pilihan sementara dalam rancangan/kode | Keputusan yang diperlukan |
|---|---|---|---|
| A01 | Multi-role, perpindahan kelompok, dan banyak bidang belum diatur. | Satu role per cohort, satu bidang utama; riwayat penugasan; SM boleh beberapa kelompok. | Bolehkah satu akun mempunyai beberapa role/bidang, dan siapa menyetujui perpindahan? |
| A02 | Semua jawaban dropdown vs survei meminta komentar terbuka. | Komentar survei menjadi pengecualian, opsional, satu kalimat. | Komentar wajib atau opsional, dan boleh lebih dari satu kalimat? |
| A03 | Tenggat perlu tanggal, tetapi jawaban dibatasi dropdown. | Dropdown tanggal/jam yang dikatalogkan Admin. | Boleh memakai pemilih tanggal agar tidak terhambat tanggal yang belum tersedia? |
| A04 | <5 menit belum diuji; enam bukti kepemimpinan dapat memakan waktu. | Reuse bukti, autofill, satu halaman; ukur waktu per aktor setelah bukti siap. | Ukur terhadap seluruh proses atau pengisian saja; siapa peserta uji? |
| A05 | Setiap penilaian wajib link, tetapi KPI tanpa link harus otomatis Not Achieved; Yellow/Red juga dapat timbul karena bukti tidak ada. | P2 tetap otomatis 0 tanpa link, ditandai tanpa bukti; Yellow/Red tetap dicatat/dieskalasi, penilaian P1 belum lengkap sampai link bukti/catatan kejadian tersedia. Kode skor P2 menerapkan pengecualian yang eksplisit ini. | Sahkan pengecualian P2; untuk P1 tanpa bukti, bolehkah link catatan kejadian yang ditulis Asmen menjadi bukti proses? Jangan membuat bukti Outcome palsu. |
| A06 | Apakah tag belum diverifikasi boleh dipakai P2/P4; definisi rinci lima kekuatan belum diberikan. | P4 hanya bukti diterima Asmen; Achieving/Exceeding perlu Outcome terverifikasi. Progressing boleh dengan link, termasuk pending, tetapi peringatan tetap tampil. | Apakah semua level harus menunggu verifikasi; apa kriteria tag yang disepakati per bidang? |
| A07 | Hasil aktual dapat berupa angka/narasi tak terbatas, bertentangan dengan semua-dropdown. | Pilih nilai aktual dari katalog KPI; bila tidak tersedia, jangan mengarang nilai atau menggantinya dengan level, tahan draft dan minta opsi yang benar. JSON mampu menyimpan angka/milestone. | Rekomendasi: izinkan input angka terstruktur khusus hasil aktual; apakah disetujui? Narasi hasil tetap satu kalimat alasan. |
| A08 | “4 Review terisi” belum mendefinisikan lengkap dan siapa yang mengesahkan. | Lengkap = semua KPI dinilai, pemeriksaan Asmen selesai, P3 yang diperlukan tersedia, snapshot terbit. | Apakah pengajuan mentee saja cukup, atau wajib hasil final penilai seperti rancangan? |
| A09 | P1, P4 dan ceklis staf belum jelas kumulatif atau per-kuartal; check-in yang absen/tanpa status belum jelas masuk penyebut P1. | Rancangan kumulatif Januari–cutoff Review; P1 memakai check-in yang memiliki status efektif lengkap, dan menampilkan kekurangan data terpisah; tidak otomatis menghukum absen dengan poin 0. Kode menerima himpunan status yang disiapkan server. | Kunci jendela data; apakah jadwal check-in yang terlewat harus menjadi Red, tidak masuk skor, atau menahan publikasi? Apakah bukti historis masih boleh menjadi bukti terkuat P4 berikutnya? |
| A10 | Rubrik perilaku enam kompetensi belum ada selain nama level. | Hanya nama level dan bantuan umum; tidak mengarang indikator per kompetensi. | Tim Penilaian perlu memasok rubrik level 1–4 untuk masing-masing enam kompetensi. |
| A11 | Waktu survei, anonimitas, minimum responden, dan pergantian staf belum diatur. | Survei per Review; tanpa respons = belum lengkap; komentar dan identitas hanya Admin; respons dikaitkan penugasan saat survei. | Minimum respons, cara agregasi kumulatif/periode, dan informasi apa yang boleh dibaca staf? |
| A12 | Pembulatan komponen sudah dikunci, tetapi pembulatan normalisasi Februari belum eksplisit. | round((roundP1+roundP2+roundP4)×100/75); contoh komponen 19/16/16 menjadi 68. | Sahkan pembulatan akhir Februari ke bilangan bulat seperti ini. |
| A13 | Ceklis staf nomor 2/4 dan kondisi tanpa kejadian belum punya penyebut rinci. “2 hari”/“7 hari” selain Red tidak menyebut hari kerja. | Semua status harus tepat waktu; 2 dan 7 hari kalender; catatan lengkap dibanding seluruh catatan yang seharusnya tersedia; tanpa Red terpenuhi jika data lengkap, tanpa jadwal/survei = null. | Sahkan toleransi semua vs persentase, dasar waktu actual_at, penanganan status belum diisi, serta kondisi tanpa kejadian. |
| A14 | “Tidak ada laporan” belum membedakan laporan masuk, sah, atau dibatalkan. | Sesuai bunyi aturan, laporan tercatat dalam periode mengganggu ceklis, bukan menunggu terbukti; nilai ditahan untuk pemeriksaan bila laporan disengketakan. `scoreAsmen/SM` menerima hasil agregasi yang sudah diputuskan server/Admin. | Apakah yang dihitung laporan masuk atau pelanggaran terkonfirmasi; bagaimana pemulihan nilai jika laporan dibatalkan? |
| A15 | Proporsional 10/11 dan batas semester belum jelas. | ceil(10×jumlah sesi jatuh tempo/11); 4/5 belum memenuhi, 5/5 memenuhi. Akses dituntut untuk semester yang sudah berakhir; semester berjalan ditandai belum jatuh tempo. | Sahkan cara proporsi dan tetapkan rentang dua semester; bagaimana mentee baru/pindahan dihitung? |
| A16 | Revisi target, POC terlambat, dan hak Admin override belum rinci. | Mentee mengisi draft, SM mengunci, Asmen tak dapat mengubah; setelah kunci perlu versi baru dan audit. Kode mengizinkan edit draft, bukan target terkunci oleh mentee. | Siapa menyetujui revisi, apakah batas kelulusan mengikuti kunci pertama, dan kapan Admin boleh override peran penilai? |
| A17 | Yellow berulang, status Red sesudahnya, dan definisi “tanpa perbaikan” belum operasional. | Asmen memilih ada/belum perbaikan berdasar bukti; bandingkan usulan status asli. Yellow ketiga tanpa perbaikan tetap Red; usulan Green/Red eksplisit memutus rangkaian Yellow. | Apakah status harus tetap Red sampai rencana ditutup; apa indikator perbaikan, dan bagaimana sesi kosong di antaranya? |
| A18 | “Eskalasi tenggat 2 hari kerja” bisa berarti batas mengirim atau menindaklanjuti; 7 hari risiko belum menyebut kalender. | Eskalasi dibuat langsung; due untuk pengakuan/tindak lanjut 2 hari kerja; Sabtu/Minggu dan kalender libur Admin dikecualikan, jam tetap. Risiko 7 hari kalender dari publikasi; SM tertunda belum diberi SLA. | Kunci arti selesai/acknowledge, jam akhir vs jam kejadian, kalender libur, dan SLA penundaan mentoring. |
| A19 | Sesi pengganti, cuti, pembatalan, bukti kehadiran dan siapa pencatat belum rinci. | Sesi unik tidak dihitung dua kali; bukti kehadiran wajib; ambang awal tetap 9/11 dan 18/22. | Siapa boleh mencatat kehadiran; apakah pembatalan mengubah total; siapa menutup data akhir? |
| A20 | Skor sertifikat dan finalisasi November belum menyebut apakah memakai nilai November atau rerata. | Gunakan skor November yang disahkan Admin; tidak menghitung rerata baru. | Sahkan skor sertifikat dan siapa penandatangan/penerbit hasil final. |
| A21 | ABC tidak didefinisikan; jam notifikasi dan tenggat form belum ditetapkan. | ABC sementara dianggap catatan hasil–pembelajaran–langkah berikutnya dalam check-in/mentoring; H+1 dari actual_at, H-2 dari scheduled_at, H-7 dari Review.due_at, terlambat dari form_due_at. | Apa kepanjangan/struktur ABC resmi; tanggal Review dan waktu tenggat; notifikasi pada jam kejadian atau jam tertentu? |
| A22 | Kanal, koneksi akun, retry, data pribadi dan penyimpanan bukti belum dipilih. | Desain outbox IN_APP/EMAIL tanpa pengiriman nyata; link bukti diberi akses terbatas; staf tidak melihat komentar mentah survei. | Pilih kanal yang benar-benar tersedia, kebijakan privasi/retensi, penyedia login, batas retry, serta otorisasi integrasinya. |
| A23 | Pengaturan Admin disebut dapat mengubah ambang angka, tetapi belum jelas lingkup dan dampak historis. | Simpan versi aturan; fungsi pada paket ini memakai angka awal. Perubahan ambang perlu adaptor konfigurasi dan tes sebelum aktif. | Ambang apa saja boleh berubah, mulai kapan, dan apakah harus menghitung ulang Review lama? |

**Keputusan paling mendesak sebelum integrasi:** A05 bukti kosong, A07 hasil aktual, A08–A09 definisi lengkap dan jendela data, A10 rubrik, A15 semester, A18 SLA, A21 tanggal/ABC. Rancangan dan unit test dapat ditinjau sekarang; bagian yang belum diputuskan tidak boleh dianggap kebijakan program final.
