# Paket Penilaian IPB LEAP

**PostgreSQL + TypeScript • Cohort 1 • 23 Oktober 2026**

Mulai dari [SPESIFIKASI.md](SPESIFIKASI.md), berurutan sesuai permintaan:

1. Struktur database, relasi, validasi dan hak akses.
2. Lima form beserta field, pilihan, petunjuk per pilihan dan validasi.
3. Perhitungan mentee/Asmen/SM dan unit test.
4. Status otomatis, eskalasi dan kelulusan.
5. Wireframe empat dashboard.
6. Pemicu, penerima dan isi notifikasi.
7. Asumsi, benturan aturan, serta keputusan yang masih diperlukan.

Keputusan yang sudah dikunci: PostgreSQL + TypeScript; **bulatkan komponen terlebih dahulu**. Contoh hasil: **19 + 16 + 16 + 16 = 67, Perlu dukungan**.

## Isi paket

| Berkas | Isi |
|---|---|
| [SPESIFIKASI.md](SPESIFIKASI.md) | Dokumen utama tujuh bagian. |
| [database/schema.sql](database/schema.sql) | DDL PostgreSQL, 41 tabel, enum, FK, indeks dan CHECK. |
| [src/scoring.ts](src/scoring.ts) | Skor mentee, kategori, validasi bukti, ceklis dan skor staf. |
| [src/workflows.ts](src/workflows.ts) | Dua Yellow, hari kerja, tugas risiko, penundaan mentoring, kelulusan, aturan akses inti. |
| [test/scoring.test.ts](test/scoring.test.ts) | Uji rumus, pembulatan dan batas data. |
| [test/workflows.test.ts](test/workflows.test.ts) | Uji status, tenggat, eskalasi, kelulusan dan role. |
| [HASIL-UJI.txt](HASIL-UJI.txt) | Hasil eksekusi aktual seluruh unit test. |
| [package.json](package.json) | Perintah pengujian tanpa dependensi tambahan. |

## Menjalankan pengujian

Gunakan Node.js 24.12+ yang mendukung eksekusi TypeScript langsung, lalu dari folder paket:

```sh
npm test
```

Tidak perlu `npm install`. Eksekusi ini tidak melakukan pemeriksaan tipe statis. File TypeScript menggunakan tipe yang bisa dihapus saat runtime dan impor berekstensi `.ts`.

## Status verifikasi

- **47 unit test lulus**, termasuk contoh 67, normalisasi Februari, penggunaan Mei pada Agustus, bukti Outcome, tenggat dengan hari libur, dan batas akses per role.
- Struktur dokumen, tautan internal paket, jumlah tabel dan kemasan diperiksa.
- DDL **belum dieksekusi pada PostgreSQL**; PostgreSQL tidak tersedia di lingkungan pengerjaan. Validasi SQL terhadap mesin database dan uji transaksi/FK harus dilakukan pada database development kosong sebelum migrasi.
- Belum ada pemeriksaan tipe statis, UI, pengukuran waktu form <5 menit, pengujian login/server/RLS, pengiriman notifikasi nyata, atau uji integrasi situs.

## Batas paket dan langkah integrasi

Ini spesifikasi teknis dan implementasi **fungsi inti**, bukan perubahan yang sudah diterapkan di ipbleap.com. Tidak ada data peserta sungguhan, sandi, atau kredensial dalam paket.

1. Sahkan keputusan penting di bagian 7, terutama bukti kosong, hasil aktual, jendela perhitungan, rubrik, semester, dan arti tenggat eskalasi.
2. Jalankan DDL di PostgreSQL development, tambahkan seed jadwal/aturan/dropdown, dan uji constraint serta transaksi lintas-tabel.
3. Buat endpoint dengan login dan scoping penugasan; muat versi aturan dari database. Kode inti memakai angka awal, belum adaptor konfigurasi dinamis. `can()` adalah aturan yang diuji, bukan pengganti pemeriksaan endpoint atau RLS.
4. Hubungkan form/dashboard serta worker outbox; semua perubahan status, eskalasi, audit, dan antrean notifikasi disimpan secara atomik.
5. Uji dengan akun empat role, data contoh, alur koreksi, bukti privat, hari libur, dan layar ponsel; ukur waktu pengisian sebelum menayangkan modul.

Jangan mengirim kredensial database ke browser atau menjalankan DDL ini langsung pada database produksi tanpa proses migrasi dan pemeriksaan terlebih dahulu.
