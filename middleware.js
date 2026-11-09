import { next } from '@vercel/functions';

const SESI_MS = 30 * 24 * 60 * 60 * 1000;

function b64urlStr(bin) {
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function tandaTanganSesi(kunci, pesan) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(kunci),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(pesan));
  const arr = new Uint8Array(sig);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return b64urlStr(bin);
}

async function buatTokenSesi(kunci) {
  const exp = String(Date.now() + SESI_MS);
  return exp + '.' + (await tandaTanganSesi(kunci, exp));
}

async function sesiValid(request, kunci) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|; )kas_sesi=([0-9]+)\.([A-Za-z0-9_-]+)/);
  if (!m) return false;
  if (Number(m[1]) < Date.now()) return false;
  const sig = await tandaTanganSesi(kunci, m[1]);
  if (sig.length !== m[2].length) return false;
  let beda = 0;
  for (let i = 0; i < sig.length; i++) beda |= sig.charCodeAt(i) ^ m[2].charCodeAt(i);
  return beda === 0;
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

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const appPassword = process.env.APP_PASSWORD;

  // Jika APP_PASSWORD tidak disetel di Vercel, biarkan semua request lewat
  if (!appPassword) {
    return next();
  }

  // Rute login
  if (path === '/login') {
    if (request.method === 'POST') {
      try {
        const formData = await request.formData();
        const sandi = String(formData.get('sandi') || '');
        if (sandi === appPassword) {
          const token = await buatTokenSesi(appPassword);
          return new Response(null, {
            status: 302,
            headers: {
              Location: '/',
              'Set-Cookie': `kas_sesi=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
            },
          });
        }
      } catch (err) {}
      return new Response(halamanLogin(true), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    if (await sesiValid(request, appPassword)) {
      return new Response(null, { status: 302, headers: { Location: '/' } });
    }
    return new Response(halamanLogin(false), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Rute logout
  if (path === '/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': 'kas_sesi=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
      },
    });
  }

  // Verifikasi sesi masuk
  const valid = await sesiValid(request, appPassword);
  if (!valid) {
    if (path.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Sesi berakhir. Silakan masuk lagi.' }),
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    // Abaikan aset statis browser (favicon, css, js, svg) jika ada
    if (path.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/i)) {
      return next();
    }
    // Tampilkan halaman login untuk halaman utama
    return new Response(halamanLogin(false), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return next();
}

