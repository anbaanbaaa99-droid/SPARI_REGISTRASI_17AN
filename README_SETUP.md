# SPARI HUT RI KE-81 — Versi PRO

Paket ini dibuat untuk arsitektur:

GitHub Pages (frontend peserta + dashboard admin)
→ Google Apps Script Web App (backend)
→ Google Spreadsheet (database)

## Struktur

- `GITHUB_UPLOAD/index.html` — halaman registrasi peserta
- `GITHUB_UPLOAD/admin.html` — dashboard panitia
- `GITHUB_UPLOAD/config.js` — SATU tempat untuk memasukkan URL Apps Script
- `APPS_SCRIPT_BACKEND/Code.gs` — backend Google Apps Script

## Yang diperbaiki dari versi lama

1. Frontend tidak lagi langsung menganggap `fetch()` = registrasi sukses.
   Ia membaca JSON dari backend dan hanya menampilkan sukses bila `ok:true`.
2. Kode registrasi dibuat server-side, bukan `Date.now()` di browser.
3. Ada validasi duplicate ID AEON + lomba.
4. Event dan biaya divalidasi ulang di backend agar tidak bisa dimanipulasi dari browser.
5. Data admin tidak lagi dibuka lewat GET publik.
6. Dashboard memerlukan PIN admin yang diperiksa backend.
7. Dashboard mendukung:
   - statistik peserta
   - jumlah registrasi
   - pembayaran
   - dana terverifikasi
   - pencarian/filter
   - detail tim
   - verifikasi pembayaran
   - hapus registrasi
   - export CSV
   - print
8. Form tim otomatis untuk Futsal, Basket 3x3, dan Badminton Ganda.
9. Mobile responsive dan tidak memakai alert bawaan browser untuk sukses.

## CATATAN DATA SUMBER

Pada formulir gambar awal, nomor 6 dan nomor 7 sama-sama tertulis
`LOMBA NYANYI SINGLE (FREE)`. Versi web ini menggabungkannya menjadi satu
pilihan `Lomba Nyanyi Single` agar peserta tidak melihat pilihan duplikat.

Jika lomba nomor 7 sebenarnya lomba berbeda, ubah daftar event pada:
- `GITHUB_UPLOAD/index.html` (EVENTS + option)
- `APPS_SCRIPT_BACKEND/Code.gs` (EVENTS)

Untuk `Estafet Bola Menggunakan Stik Balon`, formulir sumber menyebut TIM
tetapi tidak mencantumkan jumlah anggota. Karena itu versi web tidak memaksakan
jumlah minimum/maksimum tertentu; panitia bisa menambahkan anggota sesuai aturan.

# SETUP BACKEND

## 1. Buat Google Spreadsheet

Boleh spreadsheet kosong. Tidak perlu membuat header manual.

Salin ID spreadsheet dari URL:

`https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/edit`

## 2. Buka Extensions → Apps Script

Hapus isi `Code.gs`, lalu copy seluruh isi:

`APPS_SCRIPT_BACKEND/Code.gs`

Ganti:

`const SHEET_ID = "GANTI_DENGAN_ID_GOOGLE_SHEET";`

dan ubah PIN:

`const ADMIN_PIN = "1708";`

Gunakan PIN yang tidak mudah ditebak.

## 3. Jalankan setupSheet()

Di editor Apps Script pilih fungsi `setupSheet` → Run.

Izinkan akses Google jika diminta.

Fungsi ini otomatis membuat Sheet `Peserta`, header, freeze baris pertama,
dan formatting header.

## 4. Deploy Web App

Apps Script:
Deploy → New deployment → Web app

- Execute as: Me
- Who has access: Anyone

Klik Deploy dan salin URL yang berakhiran `/exec`.

PENTING:
Gunakan URL `/exec`, BUKAN `/dev`.

Jika kemudian `Code.gs` diubah:
Deploy → Manage deployments → Edit → New version → Deploy.

Kalau tidak membuat versi deployment baru, GitHub masih berbicara dengan kode lama.

# SETUP FRONTEND GITHUB

## 5. Edit config.js

Buka:

`GITHUB_UPLOAD/config.js`

Ganti:

`API_URL: "PASTE_URL_APPS_SCRIPT_DI_SINI"`

menjadi URL `/exec` milikmu.

Cukup satu kali. `index.html` dan `admin.html` menggunakan config yang sama.

## 6. Upload ke ROOT repository GitHub

Upload HANYA isi folder `GITHUB_UPLOAD`:

- index.html
- admin.html
- config.js

Struktur GitHub harus:

repo/
├── index.html
├── admin.html
└── config.js

JANGAN upload folder `GITHUB_UPLOAD` sebagai folder jika GitHub Pages memakai `/root`.
JANGAN upload `Code.gs` ke repository publik karena backend dan PIN admin tidak perlu dipublikasikan.

## 7. GitHub Pages

Repository → Settings → Pages

Source:
- Deploy from a branch
- Branch: main
- Folder: /root

Tunggu deployment selesai.

Halaman peserta:
`https://USERNAME.github.io/NAMA-REPO/`

Dashboard:
`https://USERNAME.github.io/NAMA-REPO/admin.html`

# ALUR STATUS PEMBAYARAN

Lomba berbayar:
- registrasi masuk → `Belum Bayar`
- panitia cek transfer
- dashboard → `Verifikasi bayar`
- status menjadi `Sudah Bayar`

Lomba gratis:
- otomatis `Gratis`
- tidak dapat diubah menjadi `Sudah Bayar`

Rekening yang tampil di frontend:
CIMB
707503937600
a.n Ahmad Faiz

# TEST WAJIB SEBELUM LINK DISEBAR

1. Buka halaman peserta.
2. Daftarkan satu akun dummy.
3. Pastikan modal menampilkan kode `SPARI81-...`.
4. Buka Google Sheet dan cek baris masuk.
5. Buka `admin.html`.
6. Masukkan PIN admin.
7. Pastikan data tampil.
8. Klik verifikasi bayar untuk lomba berbayar.
9. Refresh Google Sheet dan dashboard.
10. Uji dari HP agar layout tidak overflow.

# CATATAN KEAMANAN

Google Sheet jangan dibagikan sebagai "Anyone with the link can edit".
Frontend tidak membutuhkan akses langsung ke Spreadsheet.
Hanya Apps Script yang berkomunikasi dengan Sheet.

PIN admin tidak ditulis di `admin.html`; ia diketik panitia dan diverifikasi backend.
Untuk acara internal skala kecil ini sudah jauh lebih baik dibanding dashboard GET publik.
