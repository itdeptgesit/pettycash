# Petty Cash Direksi — Full Vercel & React Package

Aplikasi Buku Kas PA Direksi & Pengeluaran Keluarga (The Gesit Companies — Executive Desk) yang terhubung langsung ke **Google Sheets API v4** dan **Google Drive API v3** via Service Account resmi.

Proyek ini telah **disatukan secara utuh** (*unified*) sehingga tidak ada lagi pemisahan antara kode sumber dan bundle. Anda dapat langsung menjalankan secara lokal dengan Vite atau mendeploy ke **Vercel** dengan satu langkah.

---

## Fitur Utama

1. **Buku Kas PA Direksi**:
   - Pencatatan transaksi masuk (`Cash In`) dan keluar (`Cash Out`).
   - Sumber dana dinamis (`JSB`, `SIRCON G71`, `Ibu`, `W Acct`, `CELES`).
   - Unggah bukti nota/kuitansi langsung ke Google Drive dan tercatat dengan formula `=HYPERLINK()` di Google Sheets.
   - Edit transaksi & hapus transaksi (otomatis memindahkan berkas bukti lama ke tempat sampah Drive).
   - Cetak laporan buku kas resmi format A4 Landscape & Cetak Lampiran Bukti Transfer (grid 8 bukti per lembar).
   - OCR otomatis di peramban (Tesseract.js) untuk membaca nominal dan tanggal nota.
2. **Saldo Awal & Override Bulanan**:
   - Pengaturan saldo pembuka global di tab `Pengaturan`.
   - Override saldo awal per bulan (`saldo_awal_YYYY-MM`) untuk siklus kas mandiri.
3. **Pengeluaran Keluarga Direksi**:
   - Tab terpisah untuk pencatatan satu arah biaya keluarga (sekolah, PBB, asuransi, dll.).
   - Tersimpan di tab `Keluarga` pada spreadsheet yang sama dengan bukti transfer ke Drive.
4. **Keamanan & Autentikasi**:
   - Dilindungi kata sandi (`APP_PASSWORD`) dengan sesi login cookie HMAC SHA-256 berlaku 30 hari.
   - Vercel Edge Middleware (`middleware.js`) memproteksi seluruh rute web dan API.

---

## Struktur Proyek Terpadu

```text
pettycash-direksi/
├── api/                       # Vercel Serverless Functions (Node.js runtime)
│   ├── transactions.js        # GET, POST, PUT, DELETE /api/transactions
│   ├── settings.js            # GET, PUT /api/settings
│   ├── keluarga.js            # GET, POST, PUT, DELETE /api/keluarga
│   ├── status.js              # GET /api/status
│   ├── sync-bulk.js           # POST /api/sync-bulk
│   ├── drive-image/[id].js    # GET /api/drive-image/:id
│   ├── login.js               # POST, GET /login
│   └── logout.js              # GET /logout
├── lib/
│   ├── googleApi.js           # Driver backend Google Sheets & Drive API v4/v3
│   └── auth.js                # Helper HMAC cookie sesi & halaman login
├── src/                       # Kode sumber React 19 + TypeScript
│   ├── App.tsx                # Komponen utama (Buku Kas & Pengeluaran Keluarga)
│   ├── types.ts               # Interface TypeScript (Tx, KeluargaItem, dll.)
│   ├── store.ts               # Logika state & komunikasi REST API
│   ├── ocr.ts                 # Integrasi OCR Tesseract.js
│   ├── mockReceipt.ts         # Helper tampilan nota struk
│   ├── seed.ts                # Data awal bawaan
│   └── styles.css             # Desain & tema (Dark/Light mode)
├── public/                    # Aset statis & bundle fallback
│   └── index.html
├── middleware.js              # Vercel Edge Middleware (Auth gate)
├── vercel.json                # Konfigurasi routing Vercel
├── vite.config.ts             # Konfigurasi Vite dev & build
├── tsconfig.json              # Konfigurasi TypeScript
├── package.json               # Dependensi & skrip npm
└── worker/                    # Arsip kode Cloudflare Worker sebelumnya
```

---

## Cara Menjalankan Secara Lokal

1. **Pasang Dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan Dev Server**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:5173` di peramban. Dev server Vite sudah dilengkapi middleware lokal yang otomatis menyimulasikan endpoint `/api/*`.

3. **Build Bundle Produksi**:
   ```bash
   npm run build
   ```
   Hasil build akan dibuat di folder `dist/` (single-file HTML siap pakai).

---

## Deploy ke Vercel

1. **Hubungkan Repositori ke Vercel**:
   - Buat Git repository (misal di GitHub/GitLab) lalu push folder ini.
   - Impor repositori tersebut di dashboard [Vercel](https://vercel.com).
   - *Framework Preset*: Pilih **Vite** (atau biarkan otomatis terdeteksi).

2. **Atur Environment Variables di Vercel**:
   Masuk ke **Project Settings -> Environment Variables** di Vercel, lalu tambahkan:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: Isi JSON service account Google Cloud (seluruh teks dari berkas `.json` service account).
   - `APP_PASSWORD`: Kata sandi untuk masuk ke aplikasi web.
   - *(Opsional)* `SPREADSHEET_ID`: ID Spreadsheet jika ingin menggunakan sheet lain (bawaan: `1hR86L_IvJwemOlbf4QIsHtwc-d5jnm8cTMwSHvRJqLU`).
   - *(Opsional)* `DRIVE_FOLDER_ID`: ID Folder Google Drive (bawaan: `1mpWB3Uz1nyQyMIAooSF_cZfCU24t-Pbm`).

3. **Deploy**:
   Klik **Deploy**. Web dan semua API serverless akan langsung aktif!
