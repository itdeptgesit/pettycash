const googleApi = require('../googleApi.cjs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return res.status(200).json({
    ok: true,
    spreadsheetId: googleApi.SPREADSHEET_ID,
    folderId: googleApi.DRIVE_FOLDER_ID,
    serviceEmail: googleApi.serviceEmail,
  });
};
