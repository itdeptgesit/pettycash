/*************************************************
 * Petty Cash — Backend Google (Apps Script)
 * Data tersimpan di Google Sheets, bukti di Google Drive.
 *
 * Cara pasang ringkas:
 * 1. Buat Google Sheets baru (kosong), beri nama misalnya "Petty Cash".
 * 2. Menu Extensions > Apps Script, hapus isi editor, tempel seluruh berkas ini.
 * 3. Ganti nilai TOKEN_RAHASIA di bawah dengan kata sandi buatanmu sendiri.
 * 4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 5. Salin URL Web App, tempel di aplikasi (tombol Pengaturan Google) + token yang sama.
 *
 * Script ini membuat sendiri sheet "Transaksi" dan folder Drive "Petty Cash Bukti".
 *************************************************/

const TOKEN_RAHASIA = 'GANTI-DENGAN-TOKENMU';
const NAMA_SHEET = 'Transaksi';
const NAMA_FOLDER = 'Petty Cash Bukti';
const HEADER = ['Tanggal', 'Deskripsi', 'Jenis', 'Sumber', 'Nominal', 'Keterangan', 'BuktiNama', 'BuktiId', 'Dibuat'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(NAMA_SHEET);
  if (!sh) {
    sh = ss.insertSheet(NAMA_SHEET);
    sh.appendRow(HEADER);
  }
  return sh;
}

function folder_() {
  let parentFolder;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ssFile = DriveApp.getFileById(ss.getId());
    const parents = ssFile.getParents();
    parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  } catch (e) {
    parentFolder = DriveApp.getRootFolder();
  }

  const it = parentFolder.getFoldersByName(NAMA_FOLDER);
  if (it.hasNext()) return it.next();

  const f = parentFolder.createFolder(NAMA_FOLDER);
  try {
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) { /* abaikan jika dibatasi kebijakan workspace */ }
  return f;
}

function cekToken_(token) {
  const t = String(token || '').trim();
  if (t !== TOKEN_RAHASIA) {
    throw new Error('Token keamanan tidak sesuai. Masukkan token: ' + TOKEN_RAHASIA);
  }
}

function barisKeTx_(row, i) {
  const buktiId = row[7] || '';
  return {
    id: 'g' + (i + 2),
    tanggal: row[0] instanceof Date
      ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(row[0]),
    deskripsi: String(row[1] || ''),
    jenis: String(row[2] || 'out'),
    sumber: row[3] ? String(row[3]) : null,
    nominal: Number(row[4] || 0),
    keterangan: String(row[5] || ''),
    buktiNama: row[6] ? String(row[6]) : null,
    buktiUrl: buktiId ? 'https://drive.google.com/file/d/' + buktiId + '/view' : null,
    dibuat: Number(row[8] || i + 2),
  };
}

function doGet(e) {
  try {
    cekToken_((e.parameter && e.parameter.token) || '');
    const sh = sheet_();
    const values = sh.getDataRange().getValues();
    const txs = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === '' && values[i][4] === '') continue;
      txs.push(barisKeTx_(values[i], i - 1));
    }
    return keluaran_({ ok: true, transactions: txs });
  } catch (err) {
    return keluaran_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    cekToken_(body.token || '');

    if (body.action === 'bulk_add') {
      const items = body.items || [];
      const rows = items.map(function(t) {
        return [
          t.tanggal || '',
          t.deskripsi || '',
          t.jenis || 'out',
          t.sumber || '',
          Number(t.nominal || 0),
          t.keterangan || '',
          t.buktiNama || '',
          t.buktiUrl ? (String(t.buktiUrl).match(/\/d\/([^/]+)/) || [])[1] || '' : '',
          t.dibuat || Date.now(),
        ];
      });
      if (rows.length > 0) {
        sheet_().getRange(sheet_().getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
      }
      return keluaran_({ ok: true, count: rows.length });
    }

    if (body.action !== 'add') throw new Error('Aksi tidak dikenal: ' + body.action);
    const tx = body.tx || {};

    let buktiId = '';
    let buktiNama = '';
    if (body.bukti && body.bukti.base64) {
      const bytes = Utilities.base64Decode(body.bukti.base64);
      const blob = Utilities.newBlob(bytes, body.bukti.mime || 'image/jpeg', body.bukti.nama || 'bukti.jpg');
      const file = folder_().createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) { /* abaikan */ }
      buktiId = file.getId();
      buktiNama = body.bukti.nama || file.getName();
    }

    const dibuat = Date.now();
    const driveUrl = buktiId ? 'https://drive.google.com/file/d/' + buktiId + '/view' : '';
    const linkFormula = (buktiId && buktiNama)
      ? '=HYPERLINK("' + driveUrl + '", "' + buktiNama.replace(/"/g, '""') + '")'
      : (buktiNama || '');

    sheet_().appendRow([
      tx.tanggal || '', tx.deskripsi || '', tx.jenis || 'out', tx.sumber || '',
      Number(tx.nominal || 0), tx.keterangan || '', linkFormula, buktiId, dibuat,
    ]);

    return keluaran_({
      ok: true,
      tx: {
        id: 'g' + dibuat, tanggal: tx.tanggal, deskripsi: tx.deskripsi, jenis: tx.jenis,
        sumber: tx.sumber || null, nominal: Number(tx.nominal || 0), keterangan: tx.keterangan || '',
        buktiNama: buktiNama || null,
        buktiUrl: buktiId ? 'https://drive.google.com/file/d/' + buktiId + '/view' : null,
        dibuat: dibuat,
      },
    });
  } catch (err) {
    return keluaran_({ ok: false, error: String(err && err.message || err) });
  }
}

function keluaran_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
