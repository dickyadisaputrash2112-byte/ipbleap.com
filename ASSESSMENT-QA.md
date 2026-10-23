# Uji coba modul penilaian — 23 Oktober 2026

Status: versi browser-local untuk uji coba pada ipbleap.com; bukan implementasi backend PostgreSQL.

## Hasil kode dan model

- 47 unit test inti + 13 tes alur model situs lulus (60 total).
- Contoh wajib 67 = 19+16+16+16; kategori Perlu dukungan.
- Bukti tanpa link menghasilkan Not Achieved; Achieving/Exceeding memerlukan Outcome terverifikasi.
- Review melewati kiriman Mentee, pemeriksaan Asmen, dan penilaian role yang benar. November memerlukan kepemimpinan Admin/Tim Penilaian.
- Dua Yellow tanpa perbaikan → Red, satu eskalasi unik; rencana risiko memerlukan konfirmasi Asmen dan SM.
- Survei memperbarui rata-rata staf; tanpa respons ditandai belum lengkap.
- Kelulusan terpisah dari skor; empat Review, portofolio, Showcase dan batas kehadiran tetap wajib.
- Data KPI dibedakan per Review dan snapshot terbit tidak ditimpa perubahan draft.
- Check-in setelah cutoff tidak memengaruhi Review sebelumnya.

## Pemeriksaan browser aktual

Safari desktop, pratinjau lokal: halaman terbuka, nilai 67 dan empat komponennya tampil; form check-in terkirim dan masuk antrean Asmen; kiriman masih ada sesudah muat ulang. Pergantian peran menampilkan lima mentee dalam kelompok dengan urutan skor. Perbaikan navigasi memastikan menu tetap dapat dibuka sesudah berganti peran dari hash yang sama.

Pemeriksaan layar sempit dan domain publik dicatat setelah deployment.

## Batas verifikasi

Pengujian kode bukan bukti otorisasi server. Data uji hanya tersimpan di browser, bukan database bersama. Notifikasi belum dikirim. Tenggat form <5 menit, rubrik rinci, perubahan aturan dinamis, validasi DDL pada PostgreSQL, dan integrasi akun belum diuji. Seluruh data contoh ditandai jelas; tidak ada identitas internal peserta.

## Kesesuaian desain

Modul memakai komponen Navbar.dc.html asli dari repository. Palet #32306F/#3157A5/#D4FF3A, Montserrat italic 900, font Plus Jakarta Sans, kartu bersudut 24–28 px, daftar form di kiri, area isian di tengah, dan kartu skor gradasi di kanan mengikuti desain sumber. Logo berwarna menggunakan aset asli 82fd7880f89bd1ce.png pada tema terang agar terlihat; logo putih untuk tema gelap dipertahankan. Tidak ada logo yang digambar ulang.
