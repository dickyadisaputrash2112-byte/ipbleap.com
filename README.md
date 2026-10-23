# IPB LEAP Workspace

Frontend pratinjau IPB LEAP untuk ipbleap.com, berdasarkan 19 layar desain HTML yang disediakan pemilik. Galeri ekspor telah diubah menjadi halaman web tersendiri dengan navigasi yang terhubung.

Halaman awal menampilkan branding asli IPB LEAP, tab Masuk/Daftar, dan akses pratinjau enam peran. Tampilan program mempertahankan isi dan gaya desain sumber. Raport mentee dipisahkan dari formulir penilaian Asisten Mentor. Menu ponsel dan penanda data contoh tersedia di workspace.

## Batas penggunaan

Ini frontend pratinjau dengan data contoh. Akun, pendaftaran, basis data bersama, kontrol akses, chat antar pengguna, notifikasi, dan integrasi Drive belum terhubung ke layanan operasional. Form masuk sengaja belum aktif. Pilihan peran disimpan untuk pratinjau navigasi saja dan bukan autentikasi atau hak akses.

## Hosting

GitHub Pages, branch `main`, root `/`. `CNAME` menetapkan `ipbleap.com`; `.nojekyll` menyajikan berkas statis secara langsung. DNS dikelola di DomaiNesia. Rincian konfigurasi dan catatan HTTPS ada di DOMAIN.md.

## Pengujian

Uji coba mencakup enam peran, 18 halaman utama, validasi formulir, penghitungan skor, kehadiran, chat contoh, transaksi contoh, pencarian, tambah cepat, dan menu ponsel. Temuan dan batas verifikasi dicatat di [QA.md](QA.md). Aset React, runtime desain, font, dan logo disajikan lokal.

Sumber galeri asli tersimpan pada riwayat Git sebelum konversi. Jangan menyimpan kredensial atau data peserta dalam repositori publik ini. Tidak ada lisensi distribusi ulang yang diberikan melalui repositori ini.

## Modul penilaian untuk uji coba — 23 Oktober 2026

Buka [Penilaian & Bukti](Penilaian.dc.html?view=Mentee) dari beranda. Halaman Raport juga membuka modul ini. Lima form sudah dapat dicoba: check-in, mentoring, Review KPI, kepemimpinan, dan survei. Ganti peran simulasi untuk melanjutkan kiriman Mentee → pemeriksaan Asmen → penilaian SM, atau penilaian akhir Admin pada November.

Contoh utama: **67 — Perlu dukungan**, dengan pembulatan komponen 19+16+16+16. Review Agustus memakai kepemimpinan Mei. Dua Yellow tanpa perbaikan membuat Red dan eskalasi. Kelulusan memakai enam syarat yang terpisah dari skor. Admin dapat mencoba tujuh ceklis staf, mengubah ambang kehadiran, melihat antrean notifikasi simulasi, dan mengekspor/reset data uji.

**Batas uji coba:** sepuluh identitas contoh, dua kelompok; isian tersimpan di localStorage browser yang sama. Pemilih peran merupakan simulasi, bukan autentikasi. Belum ada PostgreSQL bersama, login, atau pengiriman email. Enam metrik awal staf memakai skenario contoh, sementara survei memakai isian mentee lokal. Jangan memasukkan data pribadi peserta. Bukti example.org hanya placeholder, bukan bukti yang benar-benar membuktikan Outcome.

Sumber TypeScript dan rancangan 41 tabel berada di `assessment-engine/`; browser memakai JavaScript dari sumber yang sama. Jalankan `npm test` dengan Node 24.12+ untuk 47 unit test inti dan 13 pengujian alur model situs. `npm run build:assessment` menghasilkan ulang `assets/assessment/scoring.js` dan `workflows.js`. Tidak ada dependensi tambahan. DDL PostgreSQL belum dijalankan; fitur operasional lintas pengguna memerlukan backend, otorisasi server, worker, dan uji integrasi tersendiri.
