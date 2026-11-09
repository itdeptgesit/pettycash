const googleApi = require('../lib/googleApi');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET: Baca pengaturan saldo awal dan override per bulan
  if (req.method === 'GET') {
    try {
      const st = await googleApi.getSettings();
      return res.status(200).json({
        ok: true,
        saldoAwal: st.saldoAwal,
        tanggalSaldoAwal: st.tanggalSaldoAwal,
        saldoPerBulan: st.saldoPerBulan,
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // PUT: Simpan pengaturan
  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Bentuk 1: Saldo awal override khusus satu bulan { bulan: 'YYYY-MM', saldoBulan: number | null }
      if (typeof body.bulan === 'string') {
        if (!/^\d{4}-\d{2}$/.test(body.bulan)) {
          return res.status(400).json({ ok: false, error: 'Format bulan tidak valid' });
        }
        if (body.saldoBulan === null) {
          await googleApi.saveSaldoBulan(body.bulan, null);
          return res.status(200).json({ ok: true });
        }
        const nb = Number(body.saldoBulan);
        if (!Number.isFinite(nb)) {
          return res.status(400).json({ ok: false, error: 'Saldo awal bulan tidak valid' });
        }
        await googleApi.saveSaldoBulan(body.bulan, nb);
        return res.status(200).json({ ok: true });
      }

      // Bentuk 2: Saldo awal buku kas global { saldoAwal, tanggalSaldoAwal }
      const n = Number(body.saldoAwal);
      const t = String(body.tanggalSaldoAwal || '');
      if (!Number.isFinite(n) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return res.status(400).json({ ok: false, error: 'Saldo awal atau tanggal tidak valid' });
      }
      await googleApi.saveSettings(n, t);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};

