// OCR bukti transfer / struk memakai Tesseract.js (berjalan lokal di browser).
// Hasil baca hanya SARAN isian: pengguna selalu mengonfirmasi sebelum menyimpan.
import Tesseract from 'tesseract.js';

export interface HasilBaca {
  nominal: number | null;
  tanggal: string | null; // ISO
  teksMentah: string;
}

const BULAN_ID: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4,
  mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agustus: 8, sep: 9, september: 9,
  okt: 10, oktober: 10, nov: 11, november: 11, des: 12, desember: 12,
};

function parseNominal(teks: string): number | null {
  const bersih = teks.replace(/\s+/g, ' ');
  // Prioritas: angka setelah kata kunci total/jumlah/nominal/transfer
  const kunci = bersih.match(/(?:total|jumlah|nominal|transfer|pembayaran|tagihan)[^0-9]{0,24}(?:rp\.?|idr)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?|[0-9]{4,})/i);
  const kandidat: number[] = [];
  const sumber = kunci ? [kunci[1]] : [];
  const semua = bersih.match(/(?:rp\.?|idr)\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?|[0-9]{4,})/gi) || [];
  for (const s of semua) {
    const m = s.match(/([0-9][0-9.,]*)/);
    if (m) sumber.push(m[1]);
  }
  for (const s of sumber) {
    const n = Number(s.replace(/[.,](?=\d{2}$)/, '').replace(/[.,]/g, ''));
    if (Number.isFinite(n) && n >= 1000) kandidat.push(n);
  }
  if (kunci && kandidat.length) return kandidat[0];
  return kandidat.length ? Math.max(...kandidat) : null;
}

function parseTanggal(teks: string): string | null {
  const t = teks.replace(/\s+/g, ' ');
  let m = t.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  m = t.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  m = t.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const mo = BULAN_ID[m[2].toLowerCase().slice(0, 3)] || BULAN_ID[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

export async function bacaBukti(
  dataUrl: string,
  onProgress?: (persen: number) => void,
): Promise<HasilBaca> {
  const hasil = await Tesseract.recognize(dataUrl, 'ind+eng', {
    logger: (msg: { status: string; progress: number }) => {
      if (msg.status === 'recognizing text' && onProgress) onProgress(Math.round(msg.progress * 100));
    },
  });
  const teksMentah = hasil.data.text || '';
  return { nominal: parseNominal(teksMentah), tanggal: parseTanggal(teksMentah), teksMentah };
}
