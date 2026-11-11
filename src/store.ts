import { Tx, KeluargaItem } from './types';
import { SEED, SEED_KELUARGA } from './seed';

// Local storage keys
const LS_TX = 'pc_txs_v1';
const LS_MODE_LOCAL = 'pc_mode_local';
const LS_SALDO_PER_BULAN = 'pc_saldo_per_bulan';
const LS_KELUARGA = 'pc_keluarga_v1';

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

// Helper pembacaan respon API yang aman dari HTML error page
async function parseApiResponse(res: Response, fallbackActionName: string): Promise<any> {
  const ctype = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (ctype.includes('application/json')) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `${fallbackActionName} gagal (status ${res.status})`);
    }
    if (res.status === 404) {
      throw new Error('Layanan backend API belum aktif di hosting ini (404)');
    }
    throw new Error(`Server mengembalikan status HTTP ${res.status}`);
  }
  if (!ctype.includes('application/json')) {
    throw new Error('Respon server bukan format JSON');
  }
  return await res.json();
}

// Ambil seluruh data transaksi langsung dari Google Sheets API v4 via backend
export async function fetchGoogle(): Promise<Tx[]> {
  const res = await fetch('/api/transactions');
  const data = await parseApiResponse(res, 'Membaca transaksi');
  if (!data.ok) throw new Error(data.error || 'Gagal membaca transaksi dari Google Sheets API');
  return data.transactions as Tx[];
}

export interface BuktiFile {
  nama: string;
  mime: string;
  base64: string;
  dataUrl: string;
}

// Tambah satu transaksi baru ke Google Sheets & Drive
export async function addGoogle(tx: Tx, bukti: BuktiFile | null): Promise<Tx> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx, bukti }),
  });
  const data = await parseApiResponse(res, 'Menyimpan transaksi');
  if (!data.ok) throw new Error(data.error || 'Gagal menyimpan transaksi ke Google Sheets API');
  return data.tx as Tx;
}

// Ubah satu transaksi di Google Sheets (baris dicari dari cap waktu 'dibuat')
export async function updateGoogle(tx: Tx, bukti: BuktiFile | null): Promise<Tx> {
  const res = await fetch('/api/transactions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx, bukti }),
  });
  const data = await parseApiResponse(res, 'Mengubah transaksi');
  if (!data.ok) throw new Error(data.error || 'Gagal mengubah transaksi di Google Sheets');
  return data.tx as Tx;
}

// Hapus satu transaksi dari Google Sheets (baris dicari dari cap waktu 'dibuat' / id / detail)
export async function deleteGoogle(tx: Tx): Promise<void> {
  const params = new URLSearchParams();
  params.set('dibuat', String(tx.dibuat));
  if (tx.id) params.set('id', tx.id);
  if (tx.deskripsi) params.set('deskripsi', tx.deskripsi);
  if (tx.nominal) params.set('nominal', String(tx.nominal));
  if (tx.tanggal) params.set('tanggal', tx.tanggal);
  const res = await fetch(`/api/transactions?${params.toString()}`, {
    method: 'DELETE',
  });
  const data = await parseApiResponse(res, 'Menghapus transaksi');
  if (!data.ok) throw new Error(data.error || 'Gagal menghapus transaksi dari Google Sheets');
}

// Ekspor / migrasi data massal ke Google Sheets via backend
export async function bulkAddGoogle(items: Tx[]): Promise<number> {
  const res = await fetch('/api/sync-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const data = await parseApiResponse(res, 'Sinkronisasi data massal');
  if (!data.ok) throw new Error(data.error || 'Gagal sinkronisasi data lokal ke Google Sheets API');
  return data.count as number;
}

// Uji koneksi langsung ke Google Sheets API
export async function testGoogleConnection(): Promise<{ ok: boolean; count: number; email: string; msg: string }> {
  const resStatus = await fetch('/api/status');
  const dataStatus = await parseApiResponse(resStatus, 'Pemeriksaan status server');
  if (!dataStatus.ok) throw new Error('API server tidak merespons');

  const resTx = await fetch('/api/transactions');
  const dataTx = await parseApiResponse(resTx, 'Mengambil data transaksi');
  if (!dataTx.ok) throw new Error(dataTx.error || 'Gagal mengakses Google Sheets');

  const count = dataTx.transactions?.length || 0;
  return {
    ok: true,
    count,
    email: dataStatus.serviceEmail || 'Service Account',
    msg: `Koneksi Google Sheets API v4 & Drive API v3 resmi berhasil! Terbaca ${count} transaksi dari tab "${DEFAULT_SHEET_NAME}".`,
  };
}

// Pengaturan saldo awal dari tab "Pengaturan" di Sheet (mode Google)
export async function fetchSettingsGoogle(): Promise<{
  saldoAwal: number | null;
  tanggalSaldoAwal: string | null;
  saldoPerBulan: Record<string, number>;
}> {
  const res = await fetch('/api/settings');
  const data = await parseApiResponse(res, 'Membaca pengaturan');
  if (!data.ok) throw new Error(data.error || 'Gagal membaca pengaturan dari server');
  return {
    saldoAwal: typeof data.saldoAwal === 'number' ? data.saldoAwal : null,
    tanggalSaldoAwal: typeof data.tanggalSaldoAwal === 'string' ? data.tanggalSaldoAwal : null,
    saldoPerBulan: data.saldoPerBulan && typeof data.saldoPerBulan === 'object' ? data.saldoPerBulan : {},
  };
}

export async function saveSettingsGoogle(saldoAwal: number, tanggalSaldoAwal: string): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saldoAwal, tanggalSaldoAwal }),
  });
  const data = await parseApiResponse(res, 'Menyimpan pengaturan');
  if (!data.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan ke server');
}

export async function saveSaldoBulanGoogle(bulan: string, saldoBulan: number | null): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bulan, saldoBulan }),
  });
  const data = await parseApiResponse(res, 'Menyimpan saldo awal bulan');
  if (!data.ok) throw new Error(data.error || 'Gagal menyimpan saldo awal bulan ke server');
}

// Pengaturan saldo awal mode lokal (tersimpan di perangkat ini saja)
export function loadSaldoAwalLocal(): { saldoAwal: number | null; tanggalSaldoAwal: string | null } {
  try {
    const n = localStorage.getItem('pc_saldo_awal');
    const t = localStorage.getItem('pc_tanggal_saldo_awal');
    const parsed = n !== null ? Number(n) : NaN;
    return {
      saldoAwal: Number.isFinite(parsed) ? parsed : null,
      tanggalSaldoAwal: t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null,
    };
  } catch {
    return { saldoAwal: null, tanggalSaldoAwal: null };
  }
}

export function saveSaldoAwalLocal(saldoAwal: number, tanggalSaldoAwal: string): void {
  try {
    localStorage.setItem('pc_saldo_awal', String(saldoAwal));
    localStorage.setItem('pc_tanggal_saldo_awal', tanggalSaldoAwal);
  } catch {
    /* abaikan */
  }
}

export function loadSaldoBulanLocal(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_SALDO_PER_BULAN);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSaldoBulanLocal(data: Record<string, number>): void {
  try {
    localStorage.setItem(LS_SALDO_PER_BULAN, JSON.stringify(data));
  } catch {
    /* abaikan */
  }
}

// ---------- Pengeluaran Keluarga Direksi ----------
export async function fetchKeluargaGoogle(): Promise<KeluargaItem[]> {
  const res = await fetch('/api/keluarga');
  const data = await parseApiResponse(res, 'Membaca data keluarga');
  if (!data.ok) throw new Error(data.error || 'Gagal membaca data keluarga');
  return Array.isArray(data.items) ? data.items : [];
}

export async function addKeluargaGoogle(
  item: { tanggal: string; keterangan: string; jumlah: number },
  bukti: BuktiFile | null
): Promise<KeluargaItem> {
  const res = await fetch('/api/keluarga', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, bukti }),
  });
  const data = await parseApiResponse(res, 'Menambah catatan keluarga');
  if (!data.ok) throw new Error(data.error || 'Gagal menyimpan catatan keluarga');
  const hasil = data.item as KeluargaItem;
  if (bukti && bukti.dataUrl && !hasil.buktiUrl) {
    hasil.buktiUrl = bukti.dataUrl;
    hasil.buktiNama = bukti.nama;
  }
  const lokal = loadKeluargaLocal();
  saveKeluargaLocal([...lokal.filter((it) => it.dibuat !== hasil.dibuat), hasil]);
  return hasil;
}

export async function updateKeluargaGoogle(
  item: KeluargaItem,
  bukti: BuktiFile | null
): Promise<KeluargaItem> {
  const res = await fetch('/api/keluarga', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, bukti }),
  });
  const data = await parseApiResponse(res, 'Mengubah catatan keluarga');
  if (!data.ok) throw new Error(data.error || 'Gagal mengubah catatan keluarga');
  const hasil = data.item as KeluargaItem;
  if (bukti && bukti.dataUrl && !hasil.buktiUrl) {
    hasil.buktiUrl = bukti.dataUrl;
    hasil.buktiNama = bukti.nama;
  }
  const lokal = loadKeluargaLocal();
  saveKeluargaLocal(lokal.map((it) => (it.dibuat === hasil.dibuat || it.id === hasil.id ? hasil : it)));
  return hasil;
}

export async function deleteKeluargaGoogle(dibuat: number, item?: Partial<KeluargaItem>): Promise<void> {
  const params = new URLSearchParams();
  params.set('dibuat', String(dibuat));
  if (item?.id) params.set('id', item.id);
  if (item?.no) params.set('no', item.no);
  if (item?.keterangan) params.set('keterangan', item.keterangan);
  if (item?.tanggal) params.set('tanggal', item.tanggal);
  const res = await fetch(`/api/keluarga?${params.toString()}`, {
    method: 'DELETE',
  });
  const data = await parseApiResponse(res, 'Menghapus catatan keluarga');
  if (!data.ok) throw new Error(data.error || 'Gagal menghapus catatan keluarga');
}

export function loadKeluargaLocal(): KeluargaItem[] {
  try {
    const raw = localStorage.getItem(LS_KELUARGA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as KeluargaItem[];
    }
  } catch {
    /* abaikan */
  }
  try {
    localStorage.setItem(LS_KELUARGA, JSON.stringify(SEED_KELUARGA));
  } catch {}
  return [...SEED_KELUARGA];
}

export function saveKeluargaLocal(items: KeluargaItem[]): void {
  try {
    localStorage.setItem(LS_KELUARGA, JSON.stringify(items));
  } catch {
    /* abaikan */
  }
}

// Transaksi lokal
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
