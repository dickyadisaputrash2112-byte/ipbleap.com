# Domain ipbleap.com

- Registrar yang dikonfirmasi pemilik: **DomaiNesia**.
- Domain tujuan: **ipbleap.com**.
- Repositori: **dickyadisaputrash2112-byte/ipbleap.com**.
- Hosting: belum dipilih/dihubungkan.
- DNS: belum diubah dalam penyiapan repositori ini.

## Urutan penghubungan

1. Hubungkan repositori ke layanan hosting yang dipilih.
2. Tambahkan domain `ipbleap.com` pada pengaturan hosting tersebut.
3. Salin persis record DNS yang diberikan layanan hosting.
4. Di MyDomaiNesia, buka domain `ipbleap.com` dan DNS Management/Zone Manager.
5. Tambahkan/ubah hanya record yang diperlukan. Pertahankan MX, TXT verifikasi, serta record layanan lain.
6. Tunggu verifikasi DNS dan penerbitan sertifikat, lalu uji domain utama, `www`, dan HTTPS.

Jangan mengarahkan domain sebelum tujuan hosting siap. GitHub menyimpan sumber proyek; situs membutuhkan layanan hosting, misalnya GitHub Pages untuk situs statis atau layanan yang mendukung aplikasi dan autentikasi sesuai kebutuhan.

## Jika nanti memilih GitHub Pages

Pastikan paket dan visibilitas repositori mendukung Pages. Situs Pages dapat diakses publik meskipun sumbernya privat; jangan menayangkan bahan/data internal tanpa meninjau isinya.

GitHub meminta domain ditambahkan pada Settings → Pages terlebih dahulu. Untuk apex domain, dokumentasi GitHub saat ini mencantumkan empat A record berikut:

| Tipe | Nama | Nilai |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | dickyadisaputrash2112-byte.github.io |

Periksa kembali petunjuk resmi saat aktivasi. Record ini hanya digunakan bila GitHub Pages benar-benar menjadi hosting, bukan otomatis untuk Vercel, Cloudflare, atau hosting DomaiNesia.

Rujukan:
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://www.domainesia.com/panduan/cara-setting-dns-dengan-mudah/
