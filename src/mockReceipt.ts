import { Tx } from './types';

export function ambilUrlGambar(url: string | null): string | null {
  if (!url) return null;
  // Jika URL Google Drive /view atau /open, gunakan backend proxy atau direct stream
  const match = url.match(/\/file\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  if (match) {
    const fileId = match[1];
    return `/api/drive-image/${fileId}`;
  }
  return url;
}

export function dapatkanBuktiGambar(tx: Tx): string | null {
  if (tx.buktiUrl) return ambilUrlGambar(tx.buktiUrl);
  if (!tx.buktiNama) return null;

  // Struk m-banking minimalis ramah cetak (hemat tinta printer, tanpa blok warna pekat)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="490" viewBox="0 0 380 490">
  <rect width="100%" height="100%" fill="#ffffff" stroke="#e4e4e7" stroke-width="1"/>
  
  <text x="24" y="32" fill="#27272a" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="0.5">BUKTI TRANSFER ELEKTRONIK</text>
  <text x="356" y="32" text-anchor="end" fill="#71717a" font-family="-apple-system, sans-serif" font-size="11">BERHASIL</text>
  <line x1="24" y1="44" x2="356" y2="44" stroke="#e4e4e7" stroke-width="1"/>
  
  <text x="190" y="85" text-anchor="middle" fill="#71717a" font-family="-apple-system, sans-serif" font-size="11">TOTAL TRANSFER</text>
  <text x="190" y="115" text-anchor="middle" fill="#18181b" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" font-weight="600">Rp ${tx.nominal.toLocaleString('id-ID')}</text>
  <text x="190" y="135" text-anchor="middle" fill="#71717a" font-family="-apple-system, sans-serif" font-size="11">${tx.tanggal} · Transaksi Sukses</text>
  
  <line x1="24" y1="155" x2="356" y2="155" stroke="#f4f4f5" stroke-width="1"/>
  
  <text x="24" y="180" fill="#71717a" font-family="-apple-system, sans-serif" font-size="10.5">Keperluan / Penerima</text>
  <text x="24" y="200" fill="#18181b" font-family="-apple-system, sans-serif" font-size="12.5" font-weight="500">${tx.deskripsi.replace(/&/g, '&amp;').slice(0, 36)}</text>
  
  <line x1="24" y1="218" x2="356" y2="218" stroke="#f4f4f5" stroke-width="1"/>
  
  <text x="24" y="242" fill="#71717a" font-family="-apple-system, sans-serif" font-size="10.5">Sumber Dana Kas</text>
  <text x="24" y="262" fill="#18181b" font-family="-apple-system, sans-serif" font-size="12.5" font-weight="500">${tx.sumber || 'Kas Operasional'}</text>
  
  <line x1="24" y1="280" x2="356" y2="280" stroke="#f4f4f5" stroke-width="1"/>
  
  <text x="24" y="304" fill="#71717a" font-family="-apple-system, sans-serif" font-size="10.5">Nama Berkas Bukti</text>
  <text x="24" y="324" fill="#52525b" font-family="ui-monospace, monospace" font-size="11.5">${tx.buktiNama}</text>
  
  <line x1="24" y1="342" x2="356" y2="342" stroke="#f4f4f5" stroke-width="1"/>
  
  <text x="24" y="366" fill="#71717a" font-family="-apple-system, sans-serif" font-size="10.5">Nomor Referensi</text>
  <text x="24" y="386" fill="#52525b" font-family="ui-monospace, monospace" font-size="11.5">TRX-${tx.id.toUpperCase()}-2026</text>
  
  <line x1="24" y1="410" x2="356" y2="410" stroke="#e4e4e7" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="190" y="440" text-anchor="middle" fill="#71717a" font-family="-apple-system, sans-serif" font-size="10">Arsip Digital Kas Operasional · Lampiran Sah</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
