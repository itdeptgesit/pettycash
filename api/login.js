const auth = require('../lib/auth');

module.exports = async (req, res) => {
  const appPassword = process.env.APP_PASSWORD;

  // Jika APP_PASSWORD tidak disetel di Vercel, redirect langsung ke beranda
  if (!appPassword) {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  if (req.method === 'GET') {
    const cookie = req.headers.cookie || '';
    if (auth.sesiValid(cookie, appPassword)) {
      res.writeHead(302, { Location: '/' });
      return res.end();
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(auth.halamanLogin(false));
  }

  if (req.method === 'POST') {
    let body = req.body;
    let sandi = '';

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        sandi = parsed.sandi || '';
      } catch {
        const params = new URLSearchParams(body);
        sandi = params.get('sandi') || '';
      }
    } else if (body && typeof body === 'object') {
      sandi = body.sandi || '';
    }

    if (sandi === appPassword) {
      const token = auth.buatTokenSesi(appPassword);
      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': `kas_sesi=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
      });
      return res.end();
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(401).send(auth.halamanLogin(true));
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};

