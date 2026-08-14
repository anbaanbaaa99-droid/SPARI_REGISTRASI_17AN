SPARI HUT RI 81 — V8 DARK EDITORIAL
=====================================

DESIGN DIRECTION
- Style A (dark editorial / cinematic) dengan sedikit unsur B (modern independence / merah-putih).
- Terinspirasi bahasa visual website studio modern: tipografi besar, whitespace, editorial grid, motion ringan, tetapi tetap fokus pada registrasi yang cepat.
- Mobile-first: CTA, event cards, form, popup pembayaran, status page, admin, dan scanner tetap responsif.

ASSET YANG DIPAKAI
- assets/media/brand.webp              = logo SPARI + AEON (dioptimalkan dari file yang diberikan)
- assets/media/mall-alam-sutera.webp  = hero AEON Alam Sutera (dioptimalkan ke WebP)
- assets/media/memory-01.webp          = dokumentasi kegiatan
- assets/media/memory-02.webp          = dokumentasi kegiatan
- assets/media/memory-03.webp          = dokumentasi kegiatan

JADWAL YANG SUDAH DIMASUKKAN
1) FUTSAL
   Minggu, 16 Agustus 2026
   Lapangan I  : 23.00–00.00
   Lapangan II : 23.00–01.00

2) PS4 / eFootball
   Senin, 17 Agustus 2026
   Waktu   : 23.00–selesai
   Lokasi  : Meeting Room
   Device  : 2 set PlayStation 4
   Game    : eFootball

3) FUN GAMES — Senin, 24 Agustus 2026
   - Pancingan Kerupuk
   - Balap Karung Pakai Helm
   - Pindahkan Air Pakai Kaki
   - Tarik Tambang
   - Pindahkan Bola Pakai Stik
   Detail waktu dan lokasi: MENYUSUL

DETAIL YANG BELUM ADA
- Basket 3x3: jadwal/lokasi menyusul
- Badminton Ganda: jadwal/lokasi menyusul
- Lomba Nyanyi Single: jadwal/lokasi menyusul
- Detail waktu/lokasi 5 fun games tanggal 24 Agustus: menyusul

NOMOR WHATSAPP PEMBAYARAN
+62 858-1303-5634

CARA UPDATE JADWAL TANPA MENGUBAH LOGIKA UTAMA
Edit file:
  assets/site-data.js

Di file tersebut ada mapping eventMeta per Event ID. Saat jadwal baru tersedia, ubah date/time/place/badge saja.

CARA UPDATE GITHUB PAGES
1. Backup repository lama.
2. Replace isi repository dengan isi folder V8 ini.
3. Pastikan config.js masih berisi URL Apps Script /exec yang benar.
4. Commit + push.
5. Tunggu GitHub Pages selesai deploy.
6. Buka website lalu refresh satu kali. Service Worker V8 akan membersihkan cache V7.

BACKEND
- V8 tidak membutuhkan perubahan struktur Google Sheet.
- Code.gs yang disertakan adalah backend PIC-only dari versi sebelumnya.
- Jika backend Anda saat ini sudah berjalan dengan PIC-only, tidak perlu deploy ulang hanya untuk perubahan desain V8.
- Jika Anda mengganti Code.gs, lakukan Deploy > Manage deployments > Edit > New version > Deploy.

PERFORMANCE
- Tidak menggunakan framework/animation library berat di halaman public.
- Hero dan foto sudah dikompresi ke WebP.
- Foto dokumentasi memakai lazy loading.
- QRCode hanya dimuat ketika benar-benar diperlukan.
- publicConfig memakai cache browser dan backend cache dari versi sebelumnya.
- Chart/scanner tetap lazy-load di halaman panitia.

CATATAN
Jadwal public V8 sekarang dibaca dari assets/site-data.js. Jika jadwal/lokasi baru sudah final, cukup update file tersebut; tidak perlu mengubah logika index.js.
