import { Tx } from './types';
import { SEED } from './seed';

// Local storage keys
const LS_TX = 'pc_txs_v1';
const LS_MODE_LOCAL = 'pc_mode_local';

export interface GoogleConfig {
  clientId: string;
  spreadsheetId: string;
  folderId: string;
  sheetName: string;
}

export const DEFAULT_SHEET_NAME = 'Transaksi';

// Ekstraksi ID dari URL Spreadsheet jika pengguna menempelkan link lengkap
export function bersihkanSpreadsheetId(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

// Ekstraksi ID dari URL Folder Google Drive jika pengguna menempelkan link lengkap
export function bersihkanFolderId(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

export function getGoogleConfig(): GoogleConfig {
  return {
    clientId: 'service_account',
    spreadsheetId: '1hR86L_IvJwemOlbf4QIsHtwc-d5jnm8cTMwSHvRJqLU',
    folderId: '1mpWB3Uz1nyQyMIAooSF_cZfCU24t-Pbm',
    sheetName: DEFAULT_SHEET_NAME,
  };
}

export function setGoogleConfig(_cfg: Partial<GoogleConfig>) {}
export function getGoogleAccessToken(): string | null {
  return 'service_account';
}
export function getGoogleUserEmail(): string {
  return 'pettycash-service@pettycash-513910.iam.gserviceaccount.com';
}
export function logoutGoogle() {
  localStorage.setItem(LS_MODE_LOCAL, 'true');
}
export function isGoogleConfigured(): boolean {
  return true;
}
export function modeGoogle(): boolean {
  return localStorage.getItem(LS_MODE_LOCAL) !== 'true';
}
export function loginGoogle(): Promise<{ token: string; email: string }> {
  localStorage.removeItem(LS_MODE_LOCAL);
  return Promise.resolve({
    token: 'service_account',
    email: 'pettycash-service@pettycash-513910.iam.gserviceaccount.com',
  });
}

// Ambil seluruh data transaksi langsung dari Google Sheets API v4 via backend lokal
export async function fetchGoogle(): Promise<Tx[]> {
  const res = await fetch('/api/transactions');
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Gagal membaca transaksi dari Google Sheets API');
  return data.transactions as Tx[];
}

export interface BuktiFile {
  nama: string;
  mime: string;
  base64: string;
  dataUrl: string;
}

// Tambah satu transaksi baru ke Google Sheets & Drive via backend lokal
export async function addGoogle(tx: Tx, bukti: BuktiFile | null): Promise<Tx> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx, bukti }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Gagal menyimpan transaksi ke Google Sheets API');
  return data.tx as Tx;
}

// Ekspor / migrasi data massal ke Google Sheets via backend lokal
export async function bulkAddGoogle(items: Tx[]): Promise<number> {
  const res = await fetch('/api/sync-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Gagal sinkronisasi data lokal ke Google Sheets API');
  return data.count as number;
}

// Uji koneksi langsung ke Google Sheets API
export async function testGoogleConnection(): Promise<{ ok: boolean; count: number; email: string; msg: string }> {
  const resStatus = await fetch('/api/status');
  const dataStatus = await resStatus.json();
  if (!dataStatus.ok) throw new Error('API server tidak merespons');

  const resTx = await fetch('/api/transactions');
  const dataTx = await resTx.json();
  if (!dataTx.ok) throw new Error(dataTx.error || 'Gagal mengakses Google Sheets');

  const count = dataTx.transactions?.length || 0;
  return {
    ok: true,
    count,
    email: dataStatus.serviceEmail || 'Service Account',
    msg: `Koneksi Google Sheets API v4 & Drive API v3 resmi berhasil! Terbaca ${count} transaksi dari tab "${DEFAULT_SHEET_NAME}".`,
  };
}

// Manajemen data penyimpanan lokal (fallback demo / offline)
export function loadLocal(): Tx[] {
  try {
    const raw = localStorage.getItem(LS_TX);
    if (raw) return JSON.parse(raw) as Tx[];
  } catch {
    // Abaikan galat parse
  }
  localStorage.setItem(LS_TX, JSON.stringify(SEED));
  return [...SEED];
}

export function saveLocal(txs: Tx[]) {
  try {
    localStorage.setItem(LS_TX, JSON.stringify(txs));
  } catch {
    // Penyimpanan penuh
  }
}

// Kompres gambar bukti pengeluaran: max dimension 1100px, JPEG 0.82
export function prosesBerkas(file: File): Promise<BuktiFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!file.type.startsWith('image/')) {
        resolve({
          nama: file.name,
          mime: file.type || 'application/octet-stream',
          base64: dataUrl.split(',')[1] || '',
          dataUrl,
        });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const skala = Math.min(1, 1100 / Math.max(img.width, img.height));
        const w = Math.round(img.width * skala);
        const h = Math.round(img.height * skala);
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const out = cv.toDataURL('image/jpeg', 0.82);
        resolve({
          nama: file.name.replace(/\.[^.]+$/, '') + '.jpg',
          mime: 'image/jpeg',
          base64: out.split(',')[1] || '',
          dataUrl: out,
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
