// googleApi.cjs - Backend resmi Google Sheets API v4 & Google Drive API v3
// Menggunakan Service Account tanpa library eksternal (Node.js built-in crypto & fetch)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_FILE = path.join(__dirname, 'pettycash-513910-444a1e09baaf.json');
let creds = null;
try {
  if (fs.existsSync(KEY_FILE)) {
    creds = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  }
} catch (e) {
  console.error('[Google API] Gagal membaca service account key:', e.message);
}

// Konfigurasi ID Google Spreadsheet & Drive
const SPREADSHEET_ID = '1hR86L_IvJwemOlbf4QIsHtwc-d5jnm8cTMwSHvRJqLU';
let DRIVE_FOLDER_ID = '1mpWB3Uz1nyQyMIAooSF_cZfCU24t-Pbm'; // Dapat diubah ke Shared Drive

function setDriveFolderId(id) {
  if (id) DRIVE_FOLDER_ID = id.trim();
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
  if (!creds || !creds.client_email || !creds.private_key) {
    throw new Error('Service Account credentials tidak ditemukan di ' + KEY_FILE);
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

// 1. Ambil semua transaksi dari Google Sheets
async function getTransactions() {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Transaksi!A1:I500`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

// 2. Upload file ke Google Drive
async function uploadToDrive(fileName, mimeType, base64Content) {
  const token = await getAccessToken();
  const metadata = {
    name: fileName,
    parents: [DRIVE_FOLDER_ID],
  };

  const buffer = Buffer.from(base64Content, 'base64');
  const boundary = '-------' + Date.now();
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelim = '\r\n--' + boundary + '--';

  const body = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + `Content-Type: ${mimeType || 'image/jpeg'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
    Buffer.from(base64Content),
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

  // Set izin anyone with link reader
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${resData.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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

// 3. Ambil buffer file dari Google Drive via Service Account
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

// 4. Tambah transaksi ke Google Sheets & Drive
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
  const linkFormula = (buktiId && buktiNama)
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
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
    dibuat: dibuat,
  };
}

// 4. Batch Sync transaksi lokal ke Google Sheets
async function syncBulk(items) {
  if (!items || items.length === 0) return 0;
  const token = await getAccessToken();

  const rows = items.map((t) => {
    let bId = t.buktiUrl ? (String(t.buktiUrl).match(/\/d\/([^/]+)/) || [])[1] || '' : '';
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
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error('Gagal sinkronisasi bulk: ' + (data.error ? data.error.message : JSON.stringify(data)));
  }

  return rows.length;
}

module.exports = {
  SPREADSHEET_ID,
  DRIVE_FOLDER_ID,
  setDriveFolderId,
  getTransactions,
  addTransaction,
  syncBulk,
  uploadToDrive,
  getAccessToken,
  getDriveFileBuffer,
  serviceEmail: creds ? creds.client_email : '',
};
