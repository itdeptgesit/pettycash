import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
// @ts-ignore
import googleApi from './googleApi.cjs';

function googleApiPlugin(): Plugin {
  const middleware = (req: any, res: any, next: any) => {
    if (!req.url || !req.url.startsWith('/api/')) return next();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      if (req.url === '/api/status' && req.method === 'GET') {
        res.end(
          JSON.stringify({
            ok: true,
            spreadsheetId: googleApi.SPREADSHEET_ID,
            folderId: googleApi.DRIVE_FOLDER_ID,
            serviceEmail: googleApi.serviceEmail,
          })
        );
        return;
      }

      if (req.url.startsWith('/api/drive-image/') && req.method === 'GET') {
        const fileId = req.url.split('/api/drive-image/')[1].split('?')[0];
        googleApi.getDriveFileBuffer(fileId).then(({ buffer, contentType }: any) => {
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(buffer);
        }).catch((err: any) => {
          res.statusCode = 404;
          res.end(JSON.stringify({ ok: false, error: err.message }));
        });
        return;
      }

      if (req.url === '/api/transactions' && req.method === 'GET') {
        googleApi.getTransactions().then((txs: any) => {
          res.end(JSON.stringify({ ok: true, transactions: txs }));
        }).catch((err: any) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err.message }));
        });
        return;
      }

      if (req.url === '/api/transactions' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => (body += chunk));
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const tx = await googleApi.addTransaction(parsed.tx || {}, parsed.bukti || null);
            res.end(JSON.stringify({ ok: true, tx }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
        return;
      }

      if (req.url === '/api/sync-bulk' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => (body += chunk));
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const count = await googleApi.syncBulk(parsed.items || []);
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
  };

  return {
    name: 'google-api-middleware',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), googleApiPlugin()],
  server: { port: 3003 },
  build: { assetsInlineLimit: 100000000, chunkSizeWarningLimit: 4000 },
});
