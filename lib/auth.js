// lib/auth.js - Otentikasi aplikasi Petty Cash Direksi
// Menggunakan cookie HMAC SHA-256 yang kompatibel dengan implementasi sebelumnya.

const crypto = require('crypto');

const SESI_MS = 30 * 24 * 60 * 60 * 1000; // Sesi berlaku 30 hari

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tandaTanganSesi(kunci, pesan) {
  const hmac = crypto.createHmac('sha256', kunci);
  hmac.update(pesan);
  return b64url(hmac.digest());
}

function buatTokenSesi(kunci) {
  const exp = String(Date.now() + SESI_MS);
  return exp + '.' + tandaTanganSesi(kunci, exp);
}

function sesiValid(cookieHeader, kunci) {
  if (!cookieHeader || !kunci) return false;
  const m = String(cookieHeader).match(/(?:^|; )kas_sesi=([0-9]+)\.([A-Za-z0-9_-]+)/);
  if (!m) return false;
  const exp = Number(m[1]);
  if (!exp || exp < Date.now()) return false;
  const sigHarapan = tandaTanganSesi(kunci, m[1]);
  const sigDiterima = m[2];
  if (sigHarapan.length !== sigDiterima.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHarapan), Buffer.from(sigDiterima));
  } catch {
    return false;
  }
}

function halamanLogin(salah) {
  const pesanSalah = salah
    ? '<div class="err">Kata sandi salah. Periksa lagi, lalu coba kembali.</div>'
    : '';
  const html = '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Masuk - Petty Cash Direksi</title><style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#f8fafc;color:#09090b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.card{background:#fff;border:1px solid #e4e4e7;border-radius:16px;box-shadow:0 16px 36px -12px rgba(0,0,0,.12);width:100%;max-width:380px;padding:36px 32px 28px}' +
    '.eyebrow{font-size:10.5px;letter-spacing:.14em;font-weight:600;color:#059669;text-transform:uppercase;text-align:center}' +
    'h1{font-size:22px;font-weight:700;letter-spacing:-.02em;text-align:center;margin-top:10px}' +
    '.sub{font-size:13px;color:#71717a;text-align:center;margin-top:8px;line-height:1.5}' +
    '.err{background:#fff1f2;border:1px solid #fecdd3;color:#be123c;font-size:12.5px;border-radius:8px;padding:10px 12px;margin-top:20px;text-align:center}' +
    'form{margin-top:24px}' +
    'label{display:block;font-size:12px;font-weight:600;color:#3f3f46;margin-bottom:8px}' +
    'input{width:100%;font-size:16px;padding:12px 14px;border:1px solid #d4d4d8;border-radius:10px;outline:none}' +
    'input:focus{border-color:#18181b;box-shadow:0 0 0 3px rgba(24,24,27,.12)}' +
    'button{width:100%;margin-top:16px;background:#18181b;color:#fafafa;border:0;font-size:14px;font-weight:600;padding:13px;border-radius:10px;cursor:pointer}' +
    'button:hover{background:#27272a}' +
    '.foot{margin-top:22px;padding-top:16px;border-top:1px solid #f4f4f5;font-size:11.5px;color:#a1a1aa;text-align:center;line-height:1.6}' +
    '</style></head><body><main class="card">' +
    '<div class="eyebrow">The Gesit Companies - Executive Desk</div>' +
    '<h1>Petty Cash Direksi</h1>' +
    '<p class="sub">Area terbatas untuk pengelola kas. Masukkan kata sandi untuk melanjutkan.</p>' +
    '%%SALAH%%' +
    '<form method="POST" action="/login">' +
    '<label for="sandi">Kata Sandi</label>' +
    '<input id="sandi" name="sandi" type="password" autocomplete="current-password" required autofocus>' +
    '<button type="submit">Masuk</button></form>' +
    '<div class="foot">Sesi masuk berlaku 30 hari di perangkat ini.<br>Gunakan tombol Keluar di aplikasi untuk mengakhiri sesi.</div>' +
    '</main></body></html>';
  return html.replace('%%SALAH%%', pesanSalah);
}

module.exports = {
  SESI_MS,
  buatTokenSesi,
  sesiValid,
  halamanLogin,
};

