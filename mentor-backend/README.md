# Pendaftaran Senior Mentor IPB LEAP

Halaman publik: `/daftar-mentor/`. Tampilan memakai logo, font, dan warna asli IPB LEAP. Tombol pendaftaran juga tersedia di tab Daftar pada beranda.

## Kriteria

Sumber: dokumen pengguna `IPB_LEAP 2026 Kriteria Mentor.pptx.pdf` (10 halaman). Seluruh pendaftar adalah alumni IPB, berusia di atas 40 tahun (dioperasionalkan sebagai minimal 41 tahun penuh saat mendaftar, waktu Jakarta), dan memenuhi kriteria track. Atas keputusan pengelola, minimum jabatan dinaikkan menjadi C-Level atau pimpinan tertinggi setara; kesetaraan wajib diverifikasi tim. Senior Manager/Head tidak otomatis memenuhi syarat. Pengalaman profesional 8–10 tahun ditafsirkan sebagai minimum 8 tahun tanpa batas atas. Publikasi Scopus/WoS dan pengalaman mentoring politik lima tahun adalah kriteria yang diutamakan, bukan syarat wajib.

Identitas dan CV adalah input data; kelayakan dan komitmen berupa Setuju/Tidak setuju. Pendaftaran belum merupakan penetapan sebagai mentor. CV hanya satu berkas PDF/DOC/DOCX maksimal 5 MB. Persetujuan pengolahan data diperlukan.

## Penyimpanan

`Code.gs` adalah sumber Google Apps Script. `setup()` membuat spreadsheet dan folder CV privat khusus. ID sumber daya tersimpan di Script Properties; tidak ada kunci atau kredensial pada situs publik. Deployment berjalan sebagai pemilik akun dengan akses kirim publik yang telah disetujui pengelola.

- `doGet?health=1` hanya mengembalikan kesiapan layanan; tidak mengembalikan data pendaftar.
- `doPost` memeriksa ulang semua persyaratan, tanggal lahir, persetujuan, versi, tipe/ukuran/magic bytes CV, serta honeypot.
- Kode menyimpan CV privat, menambahkan tautan ke spreadsheet, dan mengembalikan nomor pendaftaran. Tidak membuat izin berbagi publik untuk CV/spreadsheet.
- Pengiriman ulang ID permintaan yang sama menghasilkan nomor yang sama. Lock mencegah duplikasi bersamaan; ada batas sederhana per email/hari berbasis cache, bukan perlindungan spam menyeluruh.
- Nilai yang berpotensi menjadi formula dinetralkan sebelum masuk Sheet.
- Frontend hanya menampilkan sukses setelah menerima konfirmasi server dengan nonce yang sesuai. Data pribadi tidak disimpan di localStorage.

Untuk perubahan server: perbarui `Code.gs` di proyek Google yang sama, simpan, lalu perbarui deployment yang sama agar alamat endpoint tetap. Perubahan `criteria.mjs` juga harus disalin ke bagian kriteria server dan menaikkan versi pada kedua sisi. Jangan menambahkan handler publik untuk membaca pendaftar.

## Pemeriksaan

`npm test` mencakup modul lama dan enam pengujian pendaftaran baru: batas usia, lima track, kesetaraan jabatan, kriteria diutamakan, persetujuan/CV, validasi server, formula injection, dan pengiriman ulang. Uji browser dan pengiriman nyata dicatat terpisah pada catatan penyerahan.
