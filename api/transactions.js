const googleApi = require('../lib/googleApi');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET: Ambil semua transaksi
  if (req.method === 'GET') {
    try {
      const txs = await googleApi.getTransactions();
      return res.status(200).json({ ok: true, transactions: txs });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // POST: Tambah transaksi baru (+ bukti jika ada)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const tx = await googleApi.addTransaction(body.tx || {}, body.bukti || null);
      return res.status(200).json({ ok: true, tx });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // PUT: Ubah transaksi di Sheet
  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const updated = await googleApi.updateTransaction(body.tx || {}, body.bukti || null);
      if (!updated) {
        return res.status(404).json({ ok: false, error: 'Transaksi tidak ditemukan di Sheet' });
      }
      return res.status(200).json({ ok: true, tx: updated });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // DELETE: Hapus transaksi dari Sheet & Drive (berdasarkan cap waktu dibuat)
  if (req.method === 'DELETE') {
    try {
      const dibuat = req.query.dibuat;
      if (!dibuat) {
        return res.status(400).json({ ok: false, error: 'Parameter dibuat diperlukan' });
      }
      const removed = await googleApi.deleteTransaction(dibuat);
      if (!removed) {
        return res.status(404).json({ ok: false, error: 'Transaksi tidak ditemukan di Sheet' });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};

