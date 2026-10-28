# ERP IPB LEAP

Project Supabase khusus: `sqtbxflczscxrsvgyepu`, Singapore. Tidak memakai database proyek lain. Semua tabel operasional dimulai kosong. Tidak ada seed peserta atau nilai.

## Penggunaan awal

1. Pemilik membuka tautan aktivasi pribadi pengelola pertama dan membuat kata sandi sendiri.
2. Masuk di `/login/`. Super Admin membuka **Sistem** untuk membuat akun serta cohort nyata.
3. Salin tautan aktivasi setiap akun dan sampaikan secara pribadi. Sistem tidak mengirim email. Aktivasi akun biasa berlaku 14 hari, sekali pakai.
4. Di **Peserta**, daftarkan akun yang sudah aktif ke cohort dan tetapkan Bidang/pathway hasil seleksi.
5. Bentuk kelompok: satu Mentor, satu Asmen, lima mentee dalam Bidang yang sama. Aktifkan setelah lengkap.
6. Tentukan tanggal dan jam WIB untuk 22 check-in serta 11 mentoring M2–M12. Jadwal adalah rencana, bukan bukti kehadiran atau nilai.
7. Mentee mengisi POC/ABC/progres; Asmen memeriksa proses dan bukti; Mentor menyepakati POC dan menilai M3/M6/M9. Tim Program yang diberi penugasan penilaian menetapkan M12.

`admin@ipbleap.com` merupakan identitas akun ERP. Implementasi ini tidak membuat mailbox atau layanan email domain. Pemilik harus menyimpan kata sandinya sendiri. Pemulihan kata sandi melalui email belum diaktifkan. Untuk transfer Super Admin: aktifkan akun pengganti, kemudian cabut peran akun lama; sistem melarang penghapusan Super Admin aktif terakhir.

## Pemisahan akses dan data

Frontend hanya memuat publishable key. `SUPABASE_SERVICE_ROLE_KEY` hanya dibaca Edge Functions dari lingkungan server. Identitas/peran berasal dari Auth dan profil database, bukan parameter URL atau metadata yang ditulis pengguna.

Seluruh tabel publik memakai RLS. Pengguna hanya mendapat SELECT yang dibatasi penugasan; penulisan melalui fungsi yang memeriksa sesi, role, versi, dan sumber. Fungsi berhak tinggi berada di schema privat. RPC layanan tidak dapat dipanggil anon atau authenticated. Super Admin tidak otomatis membaca jawaban atau menjadi penilai.

`erp-records` memverifikasi pengguna, membaca sumber melalui hak pengguna, memvalidasi data dan menghitung nilai di server. Commit database memeriksa sesi, penugasan terbaru, versi cohort dan mentee serta menyimpan versi/pemeriksaan/publikasi tanpa menimpa riwayat. Permintaan menggunakan ID unik. Konflik versi ditolak dan meminta muat ulang.

`erp-account` melakukan aktivasi dengan token acak 256-bit, hash di database, tenggat dan lease transaksi. Token tidak ada dalam repository ini. Pemilik memasukkan kata sandi melalui HTTPS; aplikasi tidak mengirim email otomatis. Fungsi akun menolak pembuatan akun tanpa Super Admin aktif.

## Aturan penilaian v1

P1: Green=3, Yellow=1, Red=0; dibagi poin maksimal seluruh check-in wajib sampai periode, dikali 25. Jadwal/pemeriksaan belum lengkap tidak dianggap nol dan tidak mengecilkan penyebut. Pembatalan perlu alasan.

P2: Not Achieved=0, Progress=2, Achieve=3, Exceed=4. Satu hingga tiga KPI berbobot sama; dibagi nilai maksimal lalu dikali 25. Mentor memilih dan memberi alasan; KPI angka harus sesuai batas yang disepakati. Klaim outcome yang belum terverifikasi harus diputuskan Not Achieved disertai alasan.

P3: enam kompetensi berlevel 1–4; jumlah /24 ×25. Tidak dinilai pada M3. M6 dinilai Mentor. M9 memakai publikasi M6. M12 dinilai Tim Penilaian.

P4: bukti terkuat tiap KPI: aktivitas/belum ada=0, output=1, mutu=2, outcome=3, keberlanjutan=4; dibagi maksimum lalu dikali 25. Bukti harus diperiksa Asmen; jumlah tautan tidak menambah nilai.

M3: `(P1+P2+P4)×100/75`. M6/M9/M12: `P1+P2+P3+P4`. Komponen dan total dibulatkan dua desimal. Tidak ada pemetaan otomatis total ke Green/Yellow/Red, peringkat, sanksi, atau kelulusan. ABC tidak dinilai angka.

## Pemeriksaan

`npm test` mencakup model terdahulu, pendaftaran mentor, kontrak routing/UI terbaru, serta aturan domain ERP. `integration/erp-client/ui-test.mjs` di workspace lokal memeriksa render seluruh peran dan formulir tanpa menyimpan data uji di website.

`integration/erp-release/verify-transaction.sql` di workspace menguji penugasan, 33 jadwal, akses database, draft → pengajuan → perbaikan → pemeriksaan → tindak lanjut, lalu melakukan ROLLBACK. Verifikasi akhir memastikan tabel peserta/catatan dan Auth tetap kosong sebelum aktivasi pemilik.

Pendaftaran mentor publik `/daftar-mentor/` dan backend Google Apps Script-nya tetap terpisah dan tidak diubah. Modul keuangan, chat, dan kegiatan lain belum diaktifkan pada ERP baru; tidak ada data contoh yang dipindahkan. Sumber prototipe lama tetap berada di riwayat Git.
