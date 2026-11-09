const googleApi = require('../lib/googleApi');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET: Ambil seluruh data catatan keluarga
  if (req.method === 'GET') {
    try {
      const items = await googleApi.getKeluarga();
      return res.status(200).json({ ok: true, items });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // POST: Tambah catatan pengeluaran keluarga baru
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const item = body.item || {};
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.tanggal || '')) || !Number.isFinite(Number(item.jumlah))) {
        return res.status(400).json({ ok: false, error: 'Tanggal atau jumlah tidak valid' });
      }
      const baru = await googleApi.addKeluarga(item, body.bukti || null);
      return res.status(200).json({ ok: true, item: baru });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // PUT: Ubah catatan keluarga
  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const item = body.item || {};
      const updated = await googleApi.updateKeluarga(item, body.bukti || null);
      if (!updated) {
        return res.status(404).json({ ok: false, error: 'Catatan keluarga tidak ditemukan di Sheet' });
      }
      return res.status(200).json({ ok: true, item: updated });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // DELETE: Hapus catatan keluarga dari Sheet & buang bukti dari Drive
  if (req.method === 'DELETE') {
    try {
      const dibuat = req.query.dibuat;
      if (!dibuat && !req.query.id && !req.query.no) {
        return res.status(400).json({ ok: false, error: 'Parameter dibuat atau id diperlukan' });
      }
      const removed = await googleApi.deleteKeluarga(dibuat, req.query);
      if (!removed) {
        return res.status(404).json({ ok: false, error: 'Catatan keluarga tidak ditemukan di Sheet' });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};

