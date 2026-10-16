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
- GitHub Pages menyatakan **DNS check successful**.
- Deployment Pages berhasil.
- HTTP domain utama mengembalikan 200 dari GitHub dan HTML cocok dengan sumber asli.

- Tampilan halaman berhasil dibuka di Safari.
- HTTPS: sertifikat otomatis GitHub masih dalam proses penerbitan pada pemeriksaan 16 Oktober 2026, 20.29 WIB.

Jika browser masih menampilkan halaman lama, tunggu cache DNS diperbarui; nameserver dan resolver publik sudah menunjuk GitHub Pages. Jangan mengubah record kembali ke alamat bawaan.
