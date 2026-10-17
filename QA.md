# Hasil uji coba IPB LEAP

Tanggal: 17 Oktober 2026. Lingkup: frontend pratinjau dengan data contoh. Pengujian dilakukan pada situs publik untuk menemukan masalah, lalu pada versi perbaikan lokal sebelum publikasi. Ini belum merupakan uji penerimaan sistem operasional.

## Alur yang lulus pada versi perbaikan

| Alur | Hasil |
| --- | --- |
| Masuk/Daftar dan pemilihan peran | Tab dan pilihan peran membuka halaman yang sesuai. Form akun tetap belum aktif. |
| Enam peran | Mentee, Asmen, Mentor, Pengurus, Bendahara, dan Super Admin menampilkan identitas serta pengaturan profil contoh yang sesuai. |
| Progres mentee | Klik pertama membuka formulir; isian kosong ditolak; tiga isian lengkap dapat menjalankan simulasi. |
| Penilaian | Skor berubah mengikuti indikator; komentar kurang dari 20 karakter ditolak; formulir dan komentar terkunci setelah simulasi dikirim. |
| Sesi mentoring | Kehadiran dapat diubah; tindak lanjut dapat ditambah; topik kosong ditolak; ringkasan simulasi dapat dibuka. |
| Chat | Pesan kosong tidak dikirim; pesan berisi teks dapat dikirim melalui Enter dalam simulasi. |
| Kelola event | Judul kosong dan tanggal selesai yang mendahului tanggal mulai ditolak; pratinjau mengikuti tanggal dan kuota yang dipilih; tombol penerbitan dapat dijangkau. |
| Pengumuman | Judul kosong dan jadwal yang sudah lewat ditolak; jadwal valid menambahkan contoh riwayat. Tidak ada pesan nyata yang dikirim. |
| Keuangan | Filter transaksi berfungsi; nominal nol ditolak; transaksi contoh memakai akun kas serta tanggal yang dipilih dan muncul di tabel. |
| Pencarian | Halaman ditemukan menurut kata pencarian; pencarian tanpa hasil menampilkan pesan yang jelas. |
| Tambah cepat | Menampilkan pilihan menurut peran; pilihan progres mentee langsung membuka formulir progres. |
| Menu ponsel | Dapat dibuka, dipakai, dan ditutup dengan Escape. |
| Tampilan ponsel | Beranda mentee, event, chat, keuangan, dan pengaturan tidak lagi melebar keluar viewport 390 px. |
| Admin | Tab pengguna dan audit dapat dibuka. Ini belum menguji hak akses server. |
| Seluruh halaman | 18 halaman utama berhasil dimuat setelah perubahan runtime; tidak ada error JavaScript yang tercatat dalam pemeriksaan browser lokal. |
| Skrip | 19 skrip komponen dan 3 skrip bersama lolos pemeriksaan sintaks. |

## Perbaikan dari temuan uji coba

- Menghapus pemuatan ulang template yang dapat membatalkan interaksi awal.
- Menambahkan validasi progres, komentar, sesi, event, pengumuman, dan nominal transaksi.
- Memperbaiki sinkronisasi input tanggal/waktu dan akun kas yang sebelumnya berbeda dari data yang dicatat.
- Menolak pesan chat kosong dan mendukung Enter.
- Menghubungkan pencarian serta tambah cepat; tombol fitur yang belum terhubung sekarang memberi penjelasan.
- Memperbaiki identitas profil tiap peran dan tampilan awal mentor.
- Memperbaiki panel panjang yang menutupi tombol dan elemen yang melebar pada ponsel.
- Memperjelas hasil simulasi agar tidak mengesankan data sudah dikirim ke peserta atau disimpan permanen.
- Memberi versi pada aset bersama agar pembaruan tidak bercampur dengan skrip lama yang tersimpan di browser.

## Belum dapat dinyatakan lulus untuk penggunaan peserta

- Login, pendaftaran, OTP, pemulihan akun, dan sesi pengguna sebenarnya.
- Otorisasi peran pada server dan pembatasan akses data antar pengguna.
- Penyimpanan bersama/permanen, perpindahan data antar modul, serta pemulihan data setelah halaman ditutup.
- Pengiriman chat, email, push notification, dan penjadwalan nyata.
- Integrasi Drive/Sheets/Calendar, pembacaan RAB sebenarnya, ekspor dokumen, unggahan ke penyimpanan server, serta QR presensi yang valid.
- Audit log server, transaksi keuangan operasional, pencadangan, dan pemulihan sistem.

Hasil saat ini: frontend dapat dipakai untuk meninjau desain dan mencoba alur dengan data contoh. Penggunaan oleh peserta masih memerlukan sistem akun, basis data, integrasi, dan uji lanjutan dengan akun nyata per peran.


## Pemeriksaan mobile tambahan

19 halaman diperiksa pada lebar viewport 360, 390, dan 430 piksel (57 kombinasi). Setelah perbaikan, tidak ada halaman yang melebar melebihi viewport. Pemeriksaan ini menggunakan simulasi ukuran browser, bukan perangkat fisik.

Kontrol kalender, pencarian file, dan impor event dapat membungkus ke baris berikutnya. Kalender HP membuka Agenda lebih dulu, menempatkan jadwal di atas filter kalender, dan menampilkan nama kalender di baris terpisah. Tombol tampilan kalender dan file manager diperbesar. Menu HP dan tombol List file manager berhasil dicoba. Animasi yang sempat membuat kartu melebar di layar kecil dinonaktifkan pada tampilan HP.
