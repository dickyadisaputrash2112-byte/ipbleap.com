# Pengirim email akun IPB LEAP

Google Apps Script terpisah dari pendaftaran mentor. Saat Super Admin membuat tautan **aktivasi** atau **reset password** di Kelola Program, browser admin mengirim tautan itu ke script ini, lalu script mengirim email ke pemilik akun dari akun Gmail pemilik script.

## Keamanan

- Script tidak menyimpan password, service key, atau rahasia lain. Kunci Supabase di dalamnya adalah *publishable key* yang memang publik.
- Setiap permintaan membawa token sesi admin. Script memeriksa token itu ke Supabase (`erp_bootstrap`) dan hanya mengirim bila pemanggilnya **Super Admin aktif**.
- Penerima harus email akun yang terdaftar (`erp_management_workspace`), dan tautan harus berformat `https://ipbleap.com/login/#activate=<64 hex>`.
- Batas 60 email per admin per jam. Kuota Gmail biasa sekitar 100 email/hari (Google Workspace sekitar 1.500).

## Pemasangan (sekali)

1. Buka https://script.google.com dengan akun Google yang akan menjadi pengirim → **New project**, beri nama `IPB LEAP Mailer`.
2. Hapus isi `Code.gs`, tempel seluruh isi `mailer-backend/Code.gs`, lalu simpan.
3. Pilih fungsi `authorize` → **Run** → izinkan akses (kirim email dan koneksi eksternal).
4. **Deploy → New deployment** → tipe **Web app**. *Execute as:* **Me**. *Who has access:* **Anyone**. Klik **Deploy**.
5. Salin **Web app URL** (berakhiran `/exec`) dan isi `MAILER_ENDPOINT` di `assets/management/mailer.mjs`.

## Reset mandiri ("Lupa kata sandi?" di halaman login)

Pengguna menulis emailnya sendiri. Script masuk sebagai akun khusus **Bot Reset** (Super Admin), menonaktifkan akun itu sementara, membuat tautan reset, lalu mengirimnya ke email akun tersebut. Setiap 10 menit script memastikan akun yang sudah membuat kata sandi baru aktif kembali di cohort-nya.

1. Di Kelola Program buat akun **Bot Reset** (email bebas, mis. `bot-reset@ipbleap.com`), aktifkan sendiri lewat tautan aktivasinya dengan kata sandi panjang dan acak, lalu beri peran **Super Admin**.
2. Di Apps Script: **Project Settings → Script Properties**, tambahkan `BOT_EMAIL` dan `BOT_PASSWORD` milik akun Bot Reset.
3. Pilih fungsi `installTrigger` → **Run**. Log harus berbunyi "Bot Reset berhasil login…".

Batasan: satu permintaan per email per 15 menit, 40 permintaan per jam. Balasan selalu sama, sehingga tidak membocorkan email mana yang terdaftar. Akun Super Admin tidak dapat di-reset dari sini. Lindungi akun Google pemilik script dengan verifikasi 2 langkah karena script ini memegang kata sandi Bot Reset.

Selama `MAILER_ENDPOINT` kosong, Kelola Program tetap menampilkan tautan untuk dibagikan manual.
Untuk perubahan kode berikutnya: **Deploy → Manage deployments → Edit → Version: New version** agar URL tetap sama.
