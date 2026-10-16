# IPB LEAP Management System

Situs referensi desain untuk **ipbleap.com**, diterbitkan melalui GitHub Pages dari branch `main` (folder root).

## Isi situs

`index.html` adalah salinan utuh file “IPB Leap Management System.html” yang disediakan pemilik proyek, berisi 19 layar desain. File sumber dipertahankan tanpa perubahan.

Situs ini merupakan referensi/prototipe. Autentikasi OTP, penyimpanan data bersama, hak akses, integrasi Drive, chat, notifikasi, dan transaksi belum dibangun sebagai layanan operasional. Jangan memasukkan data peserta atau kredensial ke prototipe.

## Hosting dan domain

- Domain: `ipbleap.com`.
- Registrar dan DNS: DomaiNesia.
- Hosting: GitHub Pages.
- Sumber publikasi: branch `main`, `/ (root)`.
- `CNAME` menetapkan domain utama.
- `.nojekyll` membuat HTML disajikan langsung.
- Setiap perubahan pada branch `main` memicu publikasi ulang melalui Pages.
- Rincian record dan verifikasi ada di [DOMAIN.md](DOMAIN.md).

Repositori dibuka ke publik atas persetujuan pemilik pada 16 Oktober 2026.

## Verifikasi berkas

HTML di server telah dibandingkan byte demi byte dengan sumber asli dan cocok.

- Ukuran: 13.657.920 byte.
- SHA-256: `8bc1570a822c9bfb723b851e39d82c0fdd6b1d5e40ecf84b93ddde4f7ec52315`.

## Pengembangan berikutnya

1. Tetapkan prioritas modul dan aturan peran berdasarkan kurikulum yang disahkan.
2. Bangun aplikasi, autentikasi, basis data, dan kontrol akses.
3. Uji dengan data contoh dan akun per peran sebelum digunakan peserta.

Jangan commit token, password, `.env`, data peserta, atau dokumen pribadi. Tidak ada lisensi distribusi ulang yang diberikan melalui repositori ini.
