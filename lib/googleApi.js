// lib/googleApi.js - Backend terpadu Google Sheets API v4 & Google Drive API v3
// Berjalan di Node.js Serverless runtime (Vercel) menggunakan built-in crypto & fetch.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1hR86L_IvJwemOlbf4QIsHtwc-d5jnm8cTMwSHvRJqLU';
let DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1mpWB3Uz1nyQyMIAooSF_cZfCU24t-Pbm';

let credsCache = null;
function getCreds() {
  if (credsCache) return credsCache;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    credsCache = typeof process.env.GOOGLE_SERVICE_ACCOUNT_KEY === 'string'
      ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      : process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    return credsCache;
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credsCache = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return credsCache;
  }
  // Fallback lokal (jika ada file json kredensial di project)
  const fallbackFiles = [
    path.join(__dirname, '..', 'service-account.json'),
    path.join(__dirname, '..', 'sumber-react', 'pettycash-513910-444a1e09baaf.json'),
  ];
  for (const f of fallbackFiles) {
    if (fs.existsSync(f)) {
      credsCache = JSON.parse(fs.readFileSync(f, 'utf8'));
      return credsCache;
    }
  }
  throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable belum terpasang di Vercel.');
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 60) {
    return cachedToken;
  }
  const creds = getCreds();
  if (!creds.client_email || !creds.private_key) {
    throw new Error('Service Account credentials tidak lengkap');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const signingInput = b64url(Buffer.from(JSON.stringify(header))) + '.' + b64url(Buffer.from(JSON.stringify(payload)));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const sig = sign.sign(creds.private_key);
  const jwt = signingInput + '.' + b64url(sig);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error('Gagal mendapatkan token Google OAuth: ' + (data.error_description || JSON.stringify(data)));
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600);
  return cachedToken;
}

// ---------- Helper Berkas Drive ----------
function idBerkasDrive(val) {
  if (!val) return null;
  const str = String(val).trim();
  const m = str.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) || str.match(/id=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{20,}$/.test(str)) return str;
  return null;
}

async function buangBerkasDrive(buktiUrlOrId) {
  const id = idBerkasDrive(buktiUrlOrId);
  if (!id) return;
  try {
    const token = await getAccessToken();
    await fetch('https://www.googleapis.com/drive/v3/files/' + id, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
  } catch (e) {
    // Abaikan jika berkas tidak ditemukan atau sudah dibuang
  }
}

async function uploadToDrive(fileName, mimeType, base64Content) {
  const token = await getAccessToken();
  const metadata = {
    name: fileName,
    parents: [DRIVE_FOLDER_ID],
  };

  const boundary = '-------' + Date.now();
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelim = '\r\n--' + boundary + '--';

  const body = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + `Content-Type: ${mimeType || 'image/jpeg'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
    Buffer.from(base64Content, 'base64'),
    Buffer.from(closeDelim),
  ]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });

  const resData = await res.json();
  if (!res.ok || !resData.id) {
    throw new Error('Gagal upload ke Google Drive: ' + (resData.error ? resData.error.message : JSON.stringify(resData)));
  }

  // Set izin public reader agar thumbnail dan view link bisa dibuka
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${resData.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  } catch (e) {
    /* abaikan jika restricted domain */
  }

  return {
    id: resData.id,
    name: resData.name || fileName,
    viewUrl: `https://drive.google.com/file/d/${resData.id}/view`,
    thumbUrl: `https://lh3.googleusercontent.com/d/${resData.id}=w1200`,
  };
}

async function getDriveFileBuffer(fileId) {
  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Gagal mengambil berkas drive: ' + res.statusText);
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

// ---------- 1. Transaksi Buku Kas (Tab "Transaksi") ----------
async function getTransactions() {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Transaksi!A1:I10000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal membaca Google Sheets: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  const rows = data.values || [];
  if (rows.length <= 1) return [];

  const txs = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || (!row[0] && !row[1] && !row[4])) continue;

    let buktiId = String(row[7] || '').trim();
    const matchId = buktiId.match(/\/d\/([^/]+)/) || buktiId.match(/id=([^&]+)/);
    if (matchId) buktiId = matchId[1];

    let buktiNama = String(row[6] || '').trim();
    const matchNama = buktiNama.match(/,\s*"([^"]+)"\)/);
    if (matchNama) buktiNama = matchNama[1];

    txs.push({
      id: 'g' + (i + 1),
      tanggal: String(row[0] || ''),
      deskripsi: String(row[1] || ''),
      jenis: String(row[2] || 'out'),
      sumber: row[3] ? String(row[3]) : null,
      nominal: Number(String(row[4] || '0').replace(/[^0-9.-]+/g, '') || 0),
      keterangan: String(row[5] || ''),
      buktiNama: buktiNama || null,
      buktiUrl: buktiId ? `https://drive.google.com/file/d/${buktiId}/view` : null,
      dibuat: Number(row[8] || Date.now()),
    });
  }
  return txs;
}

async function addTransaction(tx, bukti) {
  let buktiId = '';
  let buktiNama = '';
  let driveUrl = '';

  if (bukti && bukti.base64) {
    try {
      const up = await uploadToDrive(bukti.nama || 'bukti.jpg', bukti.mime || 'image/jpeg', bukti.base64);
      buktiId = up.id;
      buktiNama = up.name;
      driveUrl = up.viewUrl;
    } catch (err) {
      console.warn('[Google Drive] Gagal upload bukti, transaksi tetap disimpan:', err.message);
      buktiNama = bukti.nama || '';
    }
  }

  const token = await getAccessToken();
  const dibuat = Date.now();
  const linkFormula = (buktiId && buktiNama && driveUrl)
    ? `=HYPERLINK("${driveUrl}", "${buktiNama.replace(/"/g, '""')}")`
    : (buktiNama || '');

  const rowValues = [
    tx.tanggal || '',
    tx.deskripsi || '',
    tx.jenis || 'out',
    tx.sumber || '',
    Number(tx.nominal || 0),
    tx.keterangan || '',
    linkFormula,
    buktiId,
    dibuat,
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Transaksi!A:I:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowValues] }),
  });

  const appendData = await res.json();
  if (!res.ok) {
    throw new Error('Gagal menambah baris ke Google Sheets: ' + (appendData.error ? appendData.error.message : JSON.stringify(appendData)));
  }

  return {
    id: 'g' + dibuat,
    tanggal: tx.tanggal,
    deskripsi: tx.deskripsi,
    jenis: tx.jenis,
    sumber: tx.sumber || null,
    nominal: Number(tx.nominal || 0),
    keterangan: tx.keterangan || '',
    buktiNama: buktiNama || null,
    buktiUrl: driveUrl || null,
    dibuat,
  };
}

async function updateTransaction(tx, bukti) {
  const token = await getAccessToken();
  const urlGet = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Transaksi!A1:I10000`;
  const res = await fetch(urlGet, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal membaca Google Sheets: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  const rows = data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String((rows[i] && rows[i][8]) || '') === String(tx.dibuat)) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex < 0) return null;

  const buktiLama = (rows[rowIndex] && rows[rowIndex][7]) || null;
  let buktiNama = tx.buktiNama || null;
  let buktiId = idBerkasDrive(tx.buktiUrl) || '';
  let driveUrl = tx.buktiUrl || null;

  // Jika ada unggah berkas baru, gunakan uploadToDrive (memperbaiki bug uploadProof)
  if (bukti && bukti.base64) {
    const up = await uploadToDrive(bukti.nama || 'bukti.jpg', bukti.mime || 'image/jpeg', bukti.base64);
    buktiNama = up.name;
    buktiId = up.id;
    driveUrl = up.viewUrl;
  } else if (!tx.buktiUrl) {
    // Pengguna menghapus bukti
    buktiNama = null;
    buktiId = '';
    driveUrl = null;
  }

  const linkFormula = (buktiId && buktiNama && driveUrl)
    ? `=HYPERLINK("${driveUrl}", "${String(buktiNama).replace(/"/g, '""')}")`
    : (buktiNama || '');

  const rowArr = [
    tx.tanggal || '',
    tx.deskripsi || '',
    tx.jenis || 'out',
    tx.sumber || '',
    Number(tx.nominal || 0),
    tx.keterangan || '',
    linkFormula,
    buktiId,
    tx.dibuat,
  ];

  const range = `Transaksi!A${rowIndex + 1}:I${rowIndex + 1}`;
  const resPut = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowArr] }),
  });
  const putData = await resPut.json();
  if (!resPut.ok) {
    throw new Error('Gagal mengubah transaksi di Sheet: ' + (putData.error ? putData.error.message : JSON.stringify(putData)));
  }

  // Jika bukti diganti baru, buang bukti lama ke tempat sampah Drive
  if (bukti && bukti.base64 && buktiLama) {
    const idLama = idBerkasDrive(buktiLama);
    if (idLama && idLama !== buktiId) {
      await buangBerkasDrive(idLama);
    }
  }

  return {
    id: 'g' + (rowIndex + 1),
    tanggal: tx.tanggal,
    deskripsi: tx.deskripsi,
    jenis: tx.jenis,
    sumber: tx.sumber || null,
    nominal: Number(tx.nominal || 0),
    keterangan: tx.keterangan || '',
    buktiNama,
    buktiUrl: driveUrl,
    dibuat: tx.dibuat,
  };
}

async function deleteTransaction(dibuat) {
  const token = await getAccessToken();
  const urlGet = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Transaksi!A1:I10000`;
  const res = await fetch(urlGet, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal membaca Google Sheets: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  const rows = data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String((rows[i] && rows[i][8]) || '') === String(dibuat)) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex < 0) return false;

  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();
  if (!metaRes.ok) {
    throw new Error('Gagal membaca metadata Sheet: ' + (meta.error ? meta.error.message : JSON.stringify(meta)));
  }

  const sheet = (meta.sheets || []).find((sh) => sh.properties && sh.properties.title === 'Transaksi');
  if (!sheet) throw new Error('Tab "Transaksi" tidak ditemukan di spreadsheet');
  const sheetId = sheet.properties.sheetId;

  const resDel = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
        },
      }],
    }),
  });
  const delData = await resDel.json();
  if (!delData.ok && !delData.replies) {
    // Batch update Google Sheets returns {} or replies on success
    if (delData.error) {
      throw new Error('Gagal menghapus baris di Sheet: ' + delData.error.message);
    }
  }

  const buktiLama = (rows[rowIndex] && rows[rowIndex][7]) || null;
  if (buktiLama) await buangBerkasDrive(buktiLama);
  return true;
}

async function syncBulk(items) {
  if (!items || items.length === 0) return 0;
  const token = await getAccessToken();

  const rows = items.map((t) => {
    let bId = idBerkasDrive(t.buktiUrl) || '';
    let bNama = t.buktiNama || '';
    let gCell = (bId && bNama)
      ? `=HYPERLINK("https://drive.google.com/file/d/${bId}/view", "${bNama.replace(/"/g, '""')}")`
      : bNama;

    return [
      t.tanggal || '',
      t.deskripsi || '',
      t.jenis || 'out',
      t.sumber || '',
      Number(t.nominal || 0),
      t.keterangan || '',
      gCell,
      bId,
      t.dibuat || Date.now(),
    ];
  });

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Transaksi!A:I:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal sinkronisasi bulk: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  return rows.length;
}

// ---------- 2. Pengaturan Aplikasi & Saldo Awal (Tab "Pengaturan") ----------
async function getPengaturan() {
  const token = await getAccessToken();
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();
  if (!metaRes.ok) {
    throw new Error('Gagal membaca metadata Sheet: ' + (meta.error ? meta.error.message : JSON.stringify(meta)));
  }

  const ada = (meta.sheets || []).some((sh) => sh.properties && sh.properties.title === 'Pengaturan');
  if (!ada) return { token, ada: false, nilai: {} };

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Pengaturan!A1:B100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal membaca tab Pengaturan: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  const nilai = {};
  (data.values || []).forEach((row) => {
    if (row[0]) nilai[row[0]] = row[1] || '';
  });
  return { token, ada: true, nilai };
}

async function getSettings() {
  const { nilai } = await getPengaturan();
  const saldo = Number(nilai.saldo_awal);
  const saldoPerBulan = {};
  Object.keys(nilai).forEach((kunci) => {
    const m = /^saldo_awal_(\d{4}-\d{2})$/.exec(kunci);
    if (!m) return;
    const mentah = nilai[kunci];
    if (mentah === '' || mentah === undefined || mentah === null) return;
    const v = Number(mentah);
    if (Number.isFinite(v)) saldoPerBulan[m[1]] = v;
  });
  return {
    saldoAwal: nilai.saldo_awal !== undefined && nilai.saldo_awal !== '' && Number.isFinite(saldo) ? saldo : null,
    tanggalSaldoAwal: /^\d{4}-\d{2}-\d{2}$/.test(nilai.tanggal_saldo_awal || '') ? nilai.tanggal_saldo_awal : null,
    saldoPerBulan,
  };
}

async function tulisPengaturan(nilai) {
  const { token, ada } = await getPengaturan();
  if (!ada) {
    const resAdd = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Pengaturan' } } }] }),
    });
    const addData = await resAdd.json();
    if (!resAdd.ok) {
      throw new Error('Gagal membuat tab Pengaturan: ' + (addData.error ? addData.error.message : JSON.stringify(addData)));
    }
  }

  const bersih = (n) => (n === null || n === undefined || n === '' ? null : String(n));
  const baris = [
    ['saldo_awal', bersih(nilai.saldo_awal)],
    ['tanggal_saldo_awal', bersih(nilai.tanggal_saldo_awal)],
  ];
  Object.keys(nilai)
    .filter((k) => /^saldo_awal_\d{4}-\d{2}$/.test(k))
    .sort()
    .forEach((k) => {
      if (nilai[k] !== '' && nilai[k] !== null && nilai[k] !== undefined) {
        baris.push([k, String(nilai[k])]);
      }
    });

  for (let i = 0; i < baris.length; i++) {
    if (baris[i][1] === null) {
      baris[i][1] = '';
      baris[i][0] = 'x_kosong_' + i;
    }
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Pengaturan!A1:B100?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: baris }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal menyimpan pengaturan: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  if (baris.length < 100) {
    const sisa = [];
    for (let i = baris.length; i < 100; i++) sisa.push(['', '']);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Pengaturan!A${baris.length + 1}:B100?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: sisa }),
    });
  }
  return true;
}

async function saveSettings(saldoAwal, tanggalSaldoAwal) {
  const { nilai } = await getPengaturan();
  nilai.saldo_awal = String(saldoAwal);
  nilai.tanggal_saldo_awal = tanggalSaldoAwal;
  return tulisPengaturan(nilai);
}

async function saveSaldoBulan(bulan, nilaiBulan) {
  const { nilai } = await getPengaturan();
  const kunci = 'saldo_awal_' + bulan;
  if (nilaiBulan === null) delete nilai[kunci];
  else nilai[kunci] = String(nilaiBulan);
  return tulisPengaturan(nilai);
}

// ---------- 3. Pengeluaran Keluarga Direksi (Tab "Keluarga") ----------
const NAMA_BULAN_ID = {
  januari: '01', jan: '01',
  februari: '02', feb: '02', pebruari: '02',
  maret: '03', mar: '03',
  april: '04', apr: '04',
  mei: '05', may: '05',
  juni: '06', jun: '06',
  juli: '07', jul: '07',
  agustus: '08', agu: '08', ags: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  oktober: '10', okt: '10', oct: '10',
  november: '11', nov: '11', nopember: '11',
  desember: '12', des: '12', dec: '12',
};

function normalisasiTanggal(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const mDmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mDmy) {
    const d = mDmy[1].padStart(2, '0');
    const m = mDmy[2].padStart(2, '0');
    const y = mDmy[3];
    return `${y}-${m}-${d}`;
  }

  const mText = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (mText) {
    const d = mText[1].padStart(2, '0');
    const bName = mText[2].toLowerCase();
    const m = NAMA_BULAN_ID[bName];
    const y = mText[3];
    if (m) return `${y}-${m}-${d}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    try {
      return parsed.toISOString().slice(0, 10);
    } catch {}
  }
  return str;
}

function formatTanggalIndo(isoStr) {
  if (!isoStr) return '';
  const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoStr;
  const blnNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const day = parseInt(m[3], 10);
  const bln = blnNames[parseInt(m[2], 10)] || m[2];
  const year = m[1];
  return `${day} ${bln} ${year}`;
}

function parseNominal(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/[^\d.,-]/g, '');
  if (!str) return 0;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  } else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(/,/g, '.');
  } else {
    str = str.replace(/,/g, '');
  }
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}

function deteksiKolomKeluarga(headerRow) {
  const norm = (headerRow || []).map((h) => String(h || '').trim().toLowerCase());
  let colNo = norm.findIndex((h) => h === 'no' || h === 'nomor');
  let colTanggal = norm.findIndex((h) => h.includes('tanggal') || h.includes('tgl') || h.includes('date'));
  let colKeterangan = norm.findIndex((h) => h.includes('keterangan') || h.includes('uraian') || h.includes('deskripsi'));
  let colJumlah = norm.findIndex((h) => h.includes('jumlah') || h.includes('nominal') || h.includes('amount') || h.includes('pengeluaran'));
  let colBukti = norm.findIndex((h) => h.includes('bukti') || h.includes('lampiran') || h.includes('transfer'));
  let colBuktiId = norm.findIndex((h) => h.includes('buktiid') || h.includes('driveid') || h.includes('id_berkas'));
  let colDibuat = norm.findIndex((h) => h.includes('dibuat') || h.includes('created') || h.includes('timestamp'));

  if (colTanggal === -1) {
    if (colNo !== -1) {
      colTanggal = 1;
      colKeterangan = 2;
      colJumlah = 3;
      colBukti = 4;
      colBuktiId = 5;
      colDibuat = 6;
    } else {
      colTanggal = 0;
      colKeterangan = 1;
      colJumlah = 2;
      colBukti = 3;
      colBuktiId = 4;
      colDibuat = 5;
    }
  }

  return {
    colNo,
    colTanggal,
    colKeterangan: colKeterangan !== -1 ? colKeterangan : colTanggal + 1,
    colJumlah: colJumlah !== -1 ? colJumlah : colTanggal + 2,
    colBukti: colBukti !== -1 ? colBukti : colTanggal + 3,
    colBuktiId: colBuktiId !== -1 ? colBuktiId : (colNo !== -1 ? 5 : 4),
    colDibuat: colDibuat !== -1 ? colDibuat : (colNo !== -1 ? 6 : 5),
    punyaNo: colNo !== -1,
  };
}

async function pastikanTabKeluarga() {
  const token = await getAccessToken();
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();
  if (!metaRes.ok) {
    throw new Error('Gagal membaca metadata Sheet: ' + (meta.error ? meta.error.message : JSON.stringify(meta)));
  }

  const ada = (meta.sheets || []).some((sh) => sh.properties && sh.properties.title === 'Keluarga');
  if (ada) return token;

  const resAdd = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Keluarga' } } }] }),
  });
  const addData = await resAdd.json();
  if (!resAdd.ok) {
    throw new Error('Gagal membuat tab Keluarga: ' + (addData.error ? addData.error.message : JSON.stringify(addData)));
  }

  const resHead = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Keluarga!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [['No', 'Tanggal', 'Keterangan', 'Jumlah', 'Bukti Transfer', 'BuktiId', 'Dibuat']] }),
  });
  const headData = await resHead.json();
  if (!resHead.ok) {
    throw new Error('Gagal menulis judul tab Keluarga: ' + (headData.error ? headData.error.message : JSON.stringify(headData)));
  }
  return token;
}

async function bacaBarisKeluarga() {
  const token = await pastikanTabKeluarga();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Keluarga!A1:Z10000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal membaca tab Keluarga: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }
  return { token, rows: data.values || [] };
}

function barisKeKeluarga(row, i, cols, totalRows) {
  const tanggalMentah = String(row[cols.colTanggal] || '').trim();
  const tanggalIso = normalisasiTanggal(tanggalMentah);
  const keterangan = String(row[cols.colKeterangan] || '').trim();
  const jumlah = parseNominal(row[cols.colJumlah]);

  let buktiNama = '';
  let buktiUrl = null;
  let buktiId = cols.colBuktiId < row.length ? String(row[cols.colBuktiId] || '').trim() : '';

  const buktiCell = String(row[cols.colBukti] || '').trim();
  if (buktiCell) {
    const mDrive = buktiCell.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
    if (mDrive) {
      buktiId = mDrive[1];
    }
    const mHyp = buktiCell.match(/HYPERLINK\("([^"]+)"(?:,\s*"([^"]+)")?\)/i);
    if (mHyp) {
      buktiUrl = mHyp[1];
      buktiNama = mHyp[2] || 'Bukti Transfer';
      const mHypDrive = buktiUrl.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
      if (mHypDrive) buktiId = mHypDrive[1];
    } else if (buktiCell.startsWith('http')) {
      buktiUrl = buktiCell;
      buktiNama = 'Bukti Transfer';
    } else {
      buktiNama = buktiCell;
    }
  }

  if (buktiId && !buktiUrl) {
    buktiUrl = `https://drive.google.com/file/d/${buktiId}/view`;
  }
  if (!buktiNama && buktiUrl) {
    buktiNama = 'Bukti Transfer';
  }

  let dibuat = cols.colDibuat < row.length && row[cols.colDibuat] ? Number(row[cols.colDibuat]) : 0;
  if (!Number.isFinite(dibuat) || dibuat <= 0) {
    const baseTime = tanggalIso ? new Date(tanggalIso).getTime() : Date.now();
    dibuat = (Number.isFinite(baseTime) && baseTime > 0 ? baseTime : 1776384000000) + i;
  }

  const noVal = cols.colNo !== -1 && row[cols.colNo] ? String(row[cols.colNo]).trim() : String(i);

  return {
    id: 'k' + i,
    no: noVal,
    tanggal: tanggalIso,
    tanggalTampil: tanggalMentah || formatTanggalIndo(tanggalIso),
    keterangan,
    jumlah,
    buktiNama: buktiNama || null,
    buktiUrl: buktiUrl || null,
    dibuat,
  };
}

function cariIndeksBarisKeluarga(rows, cols, target) {
  const dibuatStr = target && target.dibuat ? String(target.dibuat) : (typeof target === 'string' || typeof target === 'number' ? String(target) : '');
  const idStr = target && target.id ? String(target.id) : '';
  const noStr = target && target.no ? String(target.no) : '';

  // 1. Cocokkan kolom dibuat jika ada
  if (dibuatStr && cols.colDibuat < 100) {
    for (let i = 1; i < rows.length; i++) {
      if (String((rows[i] && rows[i][cols.colDibuat]) || '') === dibuatStr) {
        return i;
      }
    }
  }

  // 2. Cocokkan ID 'k1', 'k2', dll.
  if (idStr && /^k(\d+)$/.test(idStr)) {
    const idx = parseInt(idStr.replace('k', ''), 10);
    if (idx >= 1 && idx < rows.length) {
      return idx;
    }
  }

  // 3. Cocokkan kolom No
  if (noStr && cols.colNo !== -1) {
    for (let i = 1; i < rows.length; i++) {
      if (String((rows[i] && rows[i][cols.colNo]) || '').trim() === noStr) {
        return i;
      }
    }
  }

  // 4. Cocokkan tanggal + keterangan + jumlah
  if (target && typeof target === 'object' && target.keterangan) {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const rowTgl = normalisasiTanggal(row[cols.colTanggal]);
      const rowKet = String(row[cols.colKeterangan] || '').trim();
      const rowJml = parseNominal(row[cols.colJumlah]);
      if (
        rowKet.toLowerCase() === String(target.keterangan || '').trim().toLowerCase() &&
        (rowJml === target.jumlah || !target.jumlah) &&
        (!target.tanggal || rowTgl === target.tanggal)
      ) {
        return i;
      }
    }
  }

  // 5. Fallback angka indeks
  if (dibuatStr && /^\d+$/.test(dibuatStr)) {
    const num = parseInt(dibuatStr, 10);
    if (num >= 1 && num < rows.length) {
      return num;
    }
  }

  return -1;
}

async function getKeluarga() {
  const { rows } = await bacaBarisKeluarga();
  if (rows.length <= 1) return [];

  const cols = deteksiKolomKeluarga(rows[0] || []);
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || (!row[0] && !row[1] && !row[2])) continue;
    items.push(barisKeKeluarga(row, i, cols, rows.length));
  }
  return items;
}

async function addKeluarga(item, bukti) {
  const { token, rows } = await bacaBarisKeluarga();
  const cols = deteksiKolomKeluarga(rows[0] || []);

  let buktiId = '';
  let buktiNama = '';
  if (bukti && bukti.base64) {
    const up = await uploadToDrive(bukti.nama || 'bukti-keluarga.jpg', bukti.mime || 'image/jpeg', bukti.base64);
    buktiId = up.id;
    buktiNama = up.name;
  }

  const dibuat = Date.now();
  const tglIndo = formatTanggalIndo(item.tanggal);
  const nominal = Number(item.jumlah || 0);

  let gCell = buktiNama;
  if (buktiId && buktiNama) {
    gCell = `=HYPERLINK("https://drive.google.com/file/d/${buktiId}/view", "${buktiNama.replace(/"/g, '""')}")`;
  }

  let rowValues;
  if (cols.punyaNo) {
    const nextNo = rows.length;
    rowValues = [
      nextNo,
      tglIndo,
      item.keterangan || '',
      nominal,
      gCell || '',
      buktiId || '',
      dibuat,
    ];
  } else {
    rowValues = [
      item.tanggal || '',
      item.keterangan || '',
      nominal,
      buktiNama || '',
      buktiId || '',
      dibuat,
    ];
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Keluarga!A:G:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowValues] }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal menambah baris Keluarga: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  return {
    id: 'k' + rows.length,
    no: cols.punyaNo ? String(rows.length) : undefined,
    tanggal: item.tanggal || '',
    tanggalTampil: tglIndo,
    keterangan: item.keterangan || '',
    jumlah: nominal,
    buktiNama: buktiNama || null,
    buktiUrl: buktiId ? `https://drive.google.com/file/d/${buktiId}/view` : null,
    dibuat,
  };
}

async function updateKeluarga(item, bukti) {
  const { token, rows } = await bacaBarisKeluarga();
  const cols = deteksiKolomKeluarga(rows[0] || []);
  const rowIndex = cariIndeksBarisKeluarga(rows, cols, item);
  if (rowIndex < 0) return null;

  let buktiNama = item.buktiNama || null;
  let buktiId = idBerkasDrive(item.buktiUrl) || '';
  const buktiLamaId = cols.colBuktiId < (rows[rowIndex] || []).length
    ? String(rows[rowIndex][cols.colBuktiId] || '')
    : idBerkasDrive(rows[rowIndex][cols.colBukti]);

  if (bukti && bukti.base64) {
    const up = await uploadToDrive(bukti.nama || 'bukti-keluarga.jpg', bukti.mime || 'image/jpeg', bukti.base64);
    buktiNama = up.name;
    buktiId = up.id;
  }

  let gCell = buktiNama || '';
  if (buktiId && buktiNama) {
    gCell = `=HYPERLINK("https://drive.google.com/file/d/${buktiId}/view", "${buktiNama.replace(/"/g, '""')}")`;
  }

  const tglIndo = formatTanggalIndo(item.tanggal);
  const nominal = Number(item.jumlah || 0);

  let rowArr;
  let range;
  if (cols.punyaNo) {
    const noVal = (rows[rowIndex] && rows[rowIndex][cols.colNo]) || rowIndex;
    rowArr = [
      noVal,
      tglIndo,
      item.keterangan || '',
      nominal,
      gCell,
      buktiId || '',
      item.dibuat || Date.now(),
    ];
    range = `Keluarga!A${rowIndex + 1}:G${rowIndex + 1}`;
  } else {
    rowArr = [
      item.tanggal || '',
      item.keterangan || '',
      nominal,
      buktiNama || '',
      buktiId,
      item.dibuat || Date.now(),
    ];
    range = `Keluarga!A${rowIndex + 1}:F${rowIndex + 1}`;
  }

  const resPut = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowArr] }),
  });
  const putData = await resPut.json();
  if (!resPut.ok) {
    throw new Error('Gagal mengubah baris Keluarga: ' + (putData.error ? putData.error.message : JSON.stringify(putData)));
  }

  if (bukti && bukti.base64 && buktiLamaId && buktiLamaId !== buktiId) {
    await buangBerkasDrive(buktiLamaId);
  }

  return {
    id: 'k' + rowIndex,
    tanggal: item.tanggal || '',
    tanggalTampil: tglIndo,
    keterangan: item.keterangan || '',
    jumlah: nominal,
    buktiNama,
    buktiUrl: buktiId ? `https://drive.google.com/file/d/${buktiId}/view` : null,
    dibuat: item.dibuat,
  };
}

async function deleteKeluarga(dibuat, meta) {
  const { token, rows } = await bacaBarisKeluarga();
  const cols = deteksiKolomKeluarga(rows[0] || []);
  const rowIndex = cariIndeksBarisKeluarga(rows, cols, meta || dibuat);
  if (rowIndex < 0) return false;

  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const metaSheet = await metaRes.json();
  if (!metaRes.ok) {
    throw new Error('Gagal membaca metadata Sheet: ' + (metaSheet.error ? metaSheet.error.message : JSON.stringify(metaSheet)));
  }

  const sheet = (metaSheet.sheets || []).find((sh) => sh.properties && sh.properties.title === 'Keluarga');
  if (!sheet) throw new Error('Tab "Keluarga" tidak ditemukan di spreadsheet');

  const resDel = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
        },
      }],
    }),
  });
  const delData = await resDel.json();
  if (delData.error) {
    throw new Error('Gagal menghapus baris Keluarga: ' + delData.error.message);
  }

  const buktiLamaId = cols.colBuktiId < (rows[rowIndex] || []).length
    ? String(rows[rowIndex][cols.colBuktiId] || '')
    : idBerkasDrive(rows[rowIndex][cols.colBukti]);
  if (buktiLamaId) await buangBerkasDrive(buktiLamaId);
  return true;
}

module.exports = {
  SPREADSHEET_ID,
  DRIVE_FOLDER_ID,
  getAccessToken,
  uploadToDrive,
  getDriveFileBuffer,
  idBerkasDrive,
  buangBerkasDrive,
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  syncBulk,
  getSettings,
  saveSettings,
  saveSaldoBulan,
  getKeluarga,
  addKeluarga,
  updateKeluarga,
  deleteKeluarga,
  serviceEmail: () => {
    try {
      return getCreds().client_email || '';
    } catch {
      return '';
    }
  },
};

