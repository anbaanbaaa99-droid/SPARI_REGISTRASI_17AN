SPARI HUT RI 81 — OPTIMIZED V4

Yang diperbaiki:
- UI publik benar-benar responsif untuk HP kecil sampai desktop.
- Kredit CREATED BY FINH tetap besar, tetapi ditempatkan rapi setelah konten.
- Admin tidak kehilangan navigasi di HP; sidebar berubah menjadi navigation strip horizontal.
- Tabel registrasi/admin menjadi kartu di layar kecil.
- Halaman status dan check-in dirapikan untuk layar mobile.
- Toast, modal, tombol, input, QR, scanner, dan safe-area iPhone diperbaiki.
- Input mobile memakai ukuran yang aman agar Safari iPhone tidak auto-zoom.

Optimasi loading:
- QRCode tidak lagi dimuat saat halaman awal; baru dimuat ketika QR benar-benar dibutuhkan.
- Chart.js baru dimuat setelah admin login dan grafik dibutuhkan.
- html5-qrcode baru dimuat setelah panitia login ke scanner.
- Public config disimpan lokal selama 2 menit agar kunjungan berikutnya menampilkan daftar lomba hampir instan, lalu disegarkan dari server.
- Tidak ada request publicConfig kedua setelah registrasi berhasil.
- Service Worker V4 memakai cache static stale-while-revalidate dan cache semua halaman utama.
- Preconnect ke Google Apps Script ditambahkan.
- API diberi timeout dan error message yang lebih jelas.

Optimasi Code.gs:
- Syntax DEFAULT_EVENTS lomba 9/10 diperbaiki (koma yang hilang).
- publicConfig memakai CacheService 30 detik dan otomatis dihapus saat data relevan berubah.
- eventUsage_ hanya membaca kolom Event ID, bukan seluruh 18 kolom registrasi.
- publicStatus/adminLookup membaca satu baris peserta, bukan memetakan seluruh tabel registrasi.
- Pencarian kode registrasi memakai TextFinder.
- Validasi duplikasi peserta tim membaca data event satu kali, bukan berulang untuk setiap anggota.
- Spreadsheet instance dipakai ulang di satu eksekusi Apps Script.

CARA PASANG FRONTEND:
1. Upload/replace index.html, status.html, admin.html, checkin.html, config.js, manifest.webmanifest, sw.js.
2. Replace folder assets dengan isi folder assets pada paket ini.
3. Pastikan struktur tetap:
   /index.html
   /status.html
   /admin.html
   /checkin.html
   /config.js
   /sw.js
   /manifest.webmanifest
   /assets/app.css
   /assets/common.js
   /assets/index.js
   /assets/status.js
   /assets/admin.js
   /assets/checkin.js
   /assets/icon.svg
4. Push ke GitHub Pages.

CARA PASANG BACKEND:
1. Replace isi Code.gs di Apps Script dengan Code.gs dari paket ini.
2. Simpan.
3. Jalankan setupSystem() hanya bila setup sheet belum pernah dilakukan. Jika sheet sudah ada, tidak wajib dijalankan ulang.
4. Deploy > Manage deployments > Edit > New version > Deploy.
5. Gunakan deployment Web App dengan Execute as: Me dan Who has access: Anyone.
6. URL /exec pada config.js sudah dipertahankan dari file yang Anda kirim.

SETELAH UPDATE:
- Lakukan hard refresh sekali (Ctrl+Shift+R), atau tutup-buka tab di HP.
- Karena Service Worker versi dinaikkan ke V4, cache lama akan dibersihkan otomatis setelah SW baru aktif.

CATATAN KEAMANAN:
- Ganti ADMIN_PIN sebelum dipakai produksi apabila PIN saat ini sudah pernah dibagikan.
