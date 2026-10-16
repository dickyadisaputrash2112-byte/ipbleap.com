# IPB LEAP Workspace

Frontend pratinjau IPB LEAP untuk ipbleap.com, berdasarkan 19 layar desain HTML yang disediakan pemilik. Galeri ekspor telah diubah menjadi halaman web tersendiri dengan navigasi yang terhubung.

Halaman awal menampilkan branding asli IPB LEAP, tab Masuk/Daftar, dan akses pratinjau enam peran. Tampilan program mempertahankan isi dan gaya desain sumber. Raport mentee dipisahkan dari formulir penilaian Asisten Mentor. Menu ponsel dan penanda data contoh tersedia di workspace.

## Batas penggunaan

Ini frontend pratinjau dengan data contoh. Akun, pendaftaran, basis data bersama, kontrol akses, chat antar pengguna, notifikasi, dan integrasi Drive belum terhubung ke layanan operasional. Form masuk sengaja belum aktif. Pilihan peran disimpan untuk pratinjau navigasi saja dan bukan autentikasi atau hak akses.

## Hosting

GitHub Pages, branch `main`, root `/`. `CNAME` menetapkan `ipbleap.com`; `.nojekyll` menyajikan berkas statis secara langsung. DNS dikelola di DomaiNesia. Rincian konfigurasi dan catatan HTTPS ada di DOMAIN.md.

## Pengujian

Halaman awal, tab Daftar, pilihan peran, tautan raport, menu ponsel, serta halaman utama program telah diperiksa melalui browser lokal pada layar desktop dan ponsel. Aset React, runtime desain, font, dan logo disajikan lokal.

Sumber galeri asli tersimpan pada riwayat Git sebelum konversi. Jangan menyimpan kredensial atau data peserta dalam repositori publik ini. Tidak ada lisensi distribusi ulang yang diberikan melalui repositori ini.
