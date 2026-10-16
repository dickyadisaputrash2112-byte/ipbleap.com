# Domain ipbleap.com

Pengaturan di bawah diterapkan pada 16 Oktober 2026 dengan persetujuan pemilik.

## Hosting

- Repositori: `dickyadisaputrash2112-byte/ipbleap.com` (publik).
- Hosting: GitHub Pages, branch `main`, folder root.
- Custom domain: `ipbleap.com`.
- Nameserver: `ns1.domainesia.net` dan `ns2.domainesia.net`.
- DNS dikelola melalui DomaiNesia.

## Record website

| Tipe | Nama | Nilai | TTL |
| --- | --- | --- | --- |
| A | @ | 185.199.108.153 | 300 |
| A | @ | 185.199.109.153 | 300 |
| A | @ | 185.199.110.153 | 300 |
| A | @ | 185.199.111.153 | 300 |
| CNAME | www | dickyadisaputrash2112-byte.github.io | 300 |

A record bawaan `172.104.187.4` telah diganti. Record MX, mail, dan ftp bawaan tidak diubah.

## Verifikasi

- Dua nameserver DomaiNesia mengembalikan empat alamat GitHub Pages yang benar.
- Resolver publik Cloudflare dan Google mengembalikan record yang benar.
- GitHub Pages sempat menyatakan **DNS check successful**. Pada pemeriksaan ulang masih muncul **NotServedByPagesError**, meskipun seluruh nameserver dan resolver publik yang diuji mengembalikan record yang benar.
- Deployment Pages berhasil.
- HTTP domain utama mengembalikan 200 dari GitHub dan HTML cocok dengan sumber asli.

- Tampilan halaman berhasil dibuka di Safari.
- HTTPS: sertifikat otomatis GitHub masih belum tersedia pada pemeriksaan 16 Oktober 2026, 20.43 WIB. Pengaturan custom domain sudah dilepas lalu dipasang kembali atas persetujuan pemilik untuk memulai ulang proses, sesuai panduan GitHub.

Jika browser masih menampilkan halaman lama, tunggu cache DNS diperbarui; nameserver dan resolver publik sudah menunjuk GitHub Pages. Jangan mengubah record kembali ke alamat bawaan.

## Pemeriksaan tambahan dan pemulihan

- Alamat bawaan `172.104.187.4` sudah tidak ada pada panel maupun DNS publik.
- Tidak ada record AAAA atau CNAME pada apex yang berbenturan.
- Keempat alamat server DNS DomaiNesia mengembalikan empat A record GitHub yang benar.
- HTTP domain utama kembali mengembalikan 200 setelah domain dipasang kembali; www mengalihkan ke domain utama.
- Chrome sempat membaca alamat lama dari cache, sementara Safari berhasil menampilkan halaman.
- TTL bawaan sebelumnya 14400 detik (4 jam), sedangkan TTL website sekarang 300 detik. Pembaruan TTL tidak membatalkan jawaban lama yang sudah tersimpan.
- Enforce HTTPS belum bisa diaktifkan sampai sertifikat selesai diterbitkan. Jangan menganggap HTTPS sudah aktif sebelum diuji kembali.

Panduan pemulihan sertifikat resmi: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https#troubleshooting-certificate-provisioning-certificate-not-yet-created-error
