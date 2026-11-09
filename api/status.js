const googleApi = require('../lib/googleApi');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    return res.status(200).json({
      ok: true,
      spreadsheetId: googleApi.SPREADSHEET_ID,
      folderId: googleApi.DRIVE_FOLDER_ID,
      serviceEmail: googleApi.serviceEmail(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

