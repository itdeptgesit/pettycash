import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
// @ts-ignore
import googleApi from './lib/googleApi.js';

function googleApiPlugin(): Plugin {
  return {
    name: 'google-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const url = new URL(req.url, 'http://localhost');
          const path = url.pathname;

          if (path === '/api/status' && req.method === 'GET') {
            res.end(
              JSON.stringify({
                ok: true,
                spreadsheetId: googleApi.SPREADSHEET_ID,
                folderId: googleApi.DRIVE_FOLDER_ID,
                serviceEmail: googleApi.serviceEmail(),
              })
            );
            return;
          }

          if (path.startsWith('/api/drive-image/') && req.method === 'GET') {
            const fileId = path.split('/api/drive-image/')[1].split('?')[0];
            try {
              const { buffer, contentType } = await googleApi.getDriveFileBuffer(fileId);
              res.setHeader('Content-Type', contentType);
              res.setHeader('Cache-Control', 'public, max-age=86400');
              res.end(buffer);
            } catch (err: any) {
              res.statusCode = 404;
              res.end(JSON.stringify({ ok: false, error: err.message }));
            }
            return;
          }

          if (path === '/api/transactions') {
            if (req.method === 'GET') {
              const txs = await googleApi.getTransactions();
              res.end(JSON.stringify({ ok: true, transactions: txs }));
              return;
            }
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (c: any) => (body += c));
              req.on('end', async () => {
                try {
                  const p = JSON.parse(body || '{}');
                  const tx = await googleApi.addTransaction(p.tx || {}, p.bukti || null);
                  res.end(JSON.stringify({ ok: true, tx }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: err.message }));
                }
              });
              return;
            }
            if (req.method === 'PUT') {
              let body = '';
              req.on('data', (c: any) => (body += c));
              req.on('end', async () => {
                try {
                  const p = JSON.parse(body || '{}');
                  const updated = await googleApi.updateTransaction(p.tx || {}, p.bukti || null);
                  if (!updated) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ ok: false, error: 'Transaksi tidak ditemukan' }));
                    return;
                  }
                  res.end(JSON.stringify({ ok: true, tx: updated }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: err.message }));
                }
              });
              return;
            }
            if (req.method === 'DELETE') {
              const dibuat = url.searchParams.get('dibuat');
              const queryObj = Object.fromEntries(url.searchParams.entries());
              if (!dibuat && !queryObj.id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'Parameter dibuat atau id diperlukan' }));
                return;
              }
              const removed = await googleApi.deleteTransaction(dibuat, queryObj);
              if (!removed) {
                res.statusCode = 404;
                res.end(JSON.stringify({ ok: false, error: 'Transaksi tidak ditemukan di Sheet' }));
                return;
              }
              res.end(JSON.stringify({ ok: true }));
              return;
            }
          }

          if (path === '/api/settings') {
            if (req.method === 'GET') {
              const st = await googleApi.getSettings();
              res.end(JSON.stringify({ ok: true, ...st }));
              return;
            }
            if (req.method === 'PUT') {
              let body = '';
              req.on('data', (c: any) => (body += c));
              req.on('end', async () => {
                try {
                  const p = JSON.parse(body || '{}');
                  if (typeof p.bulan === 'string') {
                    await googleApi.saveSaldoBulan(p.bulan, p.saldoBulan);
                  } else {
                    await googleApi.saveSettings(p.saldoAwal, p.tanggalSaldoAwal);
                  }
                  res.end(JSON.stringify({ ok: true }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: err.message }));
                }
              });
              return;
            }
          }

          if (path === '/api/keluarga') {
            if (req.method === 'GET') {
              const items = await googleApi.getKeluarga();
              res.end(JSON.stringify({ ok: true, items }));
              return;
            }
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (c: any) => (body += c));
              req.on('end', async () => {
                try {
                  const p = JSON.parse(body || '{}');
                  const item = await googleApi.addKeluarga(p.item || {}, p.bukti || null);
                  res.end(JSON.stringify({ ok: true, item }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: err.message }));
                }
              });
              return;
            }
            if (req.method === 'PUT') {
              let body = '';
              req.on('data', (c: any) => (body += c));
              req.on('end', async () => {
                try {
                  const p = JSON.parse(body || '{}');
                  const item = await googleApi.updateKeluarga(p.item || {}, p.bukti || null);
                  res.end(JSON.stringify({ ok: true, item }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: err.message }));
                }
              });
              return;
            }
            if (req.method === 'DELETE') {
              const dibuat = url.searchParams.get('dibuat');
              const queryObj = Object.fromEntries(url.searchParams.entries());
              if (!dibuat && !queryObj.id && !queryObj.no) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'Parameter dibuat atau id diperlukan' }));
                return;
              }
              const removed = await googleApi.deleteKeluarga(dibuat, queryObj);
              if (!removed) {
                res.statusCode = 404;
                res.end(JSON.stringify({ ok: false, error: 'Catatan keluarga tidak ditemukan di Sheet' }));
                return;
              }
              res.end(JSON.stringify({ ok: true }));
              return;
            }
          }

          if (path === '/api/sync-bulk' && req.method === 'POST') {
            let body = '';
            req.on('data', (c: any) => (body += c));
            req.on('end', async () => {
              try {
                const p = JSON.parse(body || '{}');
                const count = await googleApi.syncBulk(p.items || []);
                res.end(JSON.stringify({ ok: true, count }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: err.message }));
              }
            });
            return;
          }

          next();
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), viteSingleFile(), googleApiPlugin()],
    build: {
      target: 'esnext',
    },
  };
});

