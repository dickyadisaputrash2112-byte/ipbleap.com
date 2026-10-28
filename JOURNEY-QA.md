# Validasi integrasi IPB LEAP — 28 Oktober 2026

Sumber awal: commit `9ab13a77e712e692658188fecf24e1e20ae9175a`. Hosting dan DNS dipertahankan. Berkas POC/ABC lokal asli tidak diubah.

## Hasil pemeriksaan sebelum terbit

- 76 pengujian Node lulus (67 pengujian sebelumnya dan 9 pengujian integrasi baru), serta 29 pengujian inti perjalanan POC/ABC/Raport lulus.
- Seluruh logika komponen HTML dan JavaScript yang berubah diperiksa sintaksnya; tidak ada kesalahan.
- Uji browser pada ruang contoh: ABC Expert Visit disimpan sebagai draft belum lengkap, dimuat ulang, dilengkapi/diajukan, diminta perbaikan oleh Asmen, diperbaiki/diajukan ulang oleh mentee, lalu diperiksa. Lima versi refleksi tetap tersedia. Laporan aktual ditambahkan terpisah, Asmen mencatat Selesai, muat ulang mempertahankan 5 versi, 1 laporan, 1 pemeriksaan komitmen.
- Ringkasan update Oktober memilih laporan ABC aktual, mengisi capaian/hambatan/langkah berikutnya, diajukan lokal dan tetap tersedia setelah muat ulang. Rujukan dan snapshot sumber disimpan; ABC asal tidak berubah.
- Raport memuat tiga bagian. Nilai September Nabila 86,4, tren Juli 78–Agustus 82–September 86,4, Mentor 88,0 dan Asmen 84,8 tetap tampil. Pemilih bulan nilai terpisah dari Review POC M3/M6/M9/M12.
- Keenam peran diperiksa pada lebar CSS 360 px; tidak melebar secara horizontal. Bendahara dan Super Admin tidak menampilkan pemilih mentee. Menu ponsel Bendahara tidak memuat POC/ABC/penilaian, termasuk setelah berpindah dari peran lain.
- Beranda Mentee pada 360 px tidak melebar. Animasi rise, dash/speed lines, dan marquee tetap aktif. Definisi animasi asli diuji dengan hash; pengaturan reduced-motion tetap dihormati.
- Login pada 360 px tidak melebar. Speed lines `auth-dash`, kilap `auth-gloss`, serta lapisan blur/glossy aktif. Akun masuk tetap belum aktif dan diberi keterangan jujur.
- Halaman 404 memakai logo/font lokal, gradasi dan motion, tautan absolut ke halaman masuk/Beranda sehingga dapat dipakai dari URL bertingkat.
- Tidak ada error/warning aplikasi pada uji alur utama. Halaman lain mempertahankan isi dan motion, dengan pembaruan menu dan versi cache aset bersama.

## Batas yang tetap berlaku

Semua identitas/peran adalah simulasi dan penyimpanan hanya di browser yang sama. Nilai bulanan contoh belum dihitung dari catatan baru. Tidak ada pengiriman ke akun lain, email, autentikasi, backend penilaian bersama, atau migrasi otomatis dari penyimpanan contoh penilaian lama. Versi penilaian lama tetap tersedia sebagai arsip dan datanya tidak ditimpa. Data localhost/file lokal terpisah dari origin ipbleap.com.

Antrean Asmen/Mentor hanya untuk kelompok simulasi yang dipilih. Kelompok Rajawali mengikuti empat nama pada halaman monitoring asli; Salma merupakan contoh tambahan di Garuda untuk mencoba Bidang kelima.

Pada pemeriksaan domain setelah terbit, cache browser masih menampilkan sebagian menu lama. Rilis kedua menambahkan versi pada impor Navbar dan navigasi HTML internal, lalu memeriksa ulang halaman domain.
