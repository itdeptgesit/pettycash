# Petty Cash PA Direksi (React)

Aplikasi laporan petty cash untuk Personal Assistant (PA) Direksi: buku kas per sumber dana (`SIRCON G71`, `JSB`, `Ibu`, `W Acct`), saldo berjalan & siklus bulanan, galeri lampiran bukti transfer A4 Landscape (hemat tinta, 8 bukti per lembar), cetak laporan formal Direksi, dan integrasi langsung ke Google Sheets API v4 & Google Drive API v3 resmi tanpa Google Apps Script.

## Menjalankan

```bash
npm install
npm run dev      # mode demo langsung jalan (data contoh + localStorage)
npm run build    # hasil build satu berkas di dist/
```

## Menyambungkan Google (Sheets API & Drive API Resmi)

Aplikasi ini terhubung langsung ke **Google Sheets API v4** dan **Google Drive API v3** menggunakan Google Identity Services (OAuth 2.0 resmi) tanpa perlu memasang skrip Apps Script:

1. Buat project baru di [Google Cloud Console](https://console.cloud.google.com/).
2. Aktifkan **Google Sheets API** dan **Google Drive API** di menu *APIs & Services > Library*.
3. Buat **OAuth client ID** (Application type: *Web application*) di menu *Credentials*. Tambahkan domain Anda ke *Authorized JavaScript origins*.
4. Buat Google Spreadsheet baru (kosong), salin link atau ID-nya.
5. Di aplikasi, klik tombol **Login Google** di toolbar:
   - Tempel **Google Client ID**.
   - Tempel **ID atau Link Google Spreadsheet**.
   - (Opsional) Tempel **ID Folder Google Drive** untuk menyimpan foto bukti transfer.
   - Klik **Login Google** dan izinkan akses.
6. Selesai! Seluruh pencatatan transaksi masuk ke Google Sheet dan foto struk/transfer otomatis tersimpan ke Google Drive Anda secara real-time.
