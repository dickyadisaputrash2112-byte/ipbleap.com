# LMS ipbleap.com — 3 November 2026

Website publik dan LMS disinkronkan dari versi yang telah direview di `kawanberinovasi-ops/ipb-leap-website` (source main `566adcf2c55f5aa8289a830763a41b1fa81b850c`; tree sama dengan commit sumber pada `lms-release.json`). Hosting tetap GitHub Pages `main` root dan CNAME `ipbleap.com`.

Masuk melalui `/app/index.html`. Modul produksi berada pada `/app/`; halaman lama Program/Kelompok diarahkan ke modul tersebut dengan konteks dan referensi sumber tetap terbawa. `/login/` juga memakai login yang sama, termasuk tautan aktivasi. Sesi GitHub Pages dan domain utama berbeda origin sehingga pengguna perlu masuk satu kali di domain utama.

Pendaftaran mentor `/daftar-mentor/`, backend, konfigurasi aktif, administrasi akun `/erp/sistem/`, peserta/penugasan `/erp/peserta/`, dan keuangan tetap dipertahankan. Tidak ada reset database, pergantian akun, migrasi baru, atau perubahan rumus penilaian. Administrasi lama menggunakan backend dan kunci penyimpanan sesi yang sama dengan LMS; otorisasi tetap diperiksa server. Super Admin tidak otomatis menjadi penilai.

Pembaruan selanjutnya: build proyek sumber, lalu jalankan `python3 tools/sync-lms.py /absolute/path/to/ipb-leap-website` dari checkout repositori domain. Sinkronisasi hanya artefak produksi; prototipe review serta skrip pembuka mode lokal tidak diterbitkan. `store.mjs` tetap diperlukan sebagai model bersama produksi, tetapi mode lokal tidak diaktifkan pada HTML produksi.

Validasi: tes pengalihan mempertahankan konteks/aktivasi dan menolak next eksternal; seluruh impor modul produksi diperiksa; konfigurasi, rumus dan runtime identik dengan sumber. Pendaftaran mentor dan administrasi lama dibandingkan dengan versi sebelum sinkronisasi. Verifikasi deployment dilakukan melalui workflow Pages dan perbandingan respons HTTPS dengan artefak lokal.

Akun terpisah Mentee, Mentor, Asmen, Pengurus ditunda sesuai pilihan pemilik. Pembuatan memakai alur akun yang sudah ada dan memerlukan nama/email sebenarnya, penugasan cohort, serta track/pathway mentee. Tidak ada akun dummy atau email aktivasi otomatis yang dibuat.
