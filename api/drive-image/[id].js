const googleApi = require('../../lib/googleApi');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Parameter id diperlukan' });
  }

  try {
    const { buffer, contentType } = await googleApi.getDriveFileBuffer(id);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
};

