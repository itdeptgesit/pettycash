export interface Tx {
  id: string;
  tanggal: string; // ISO yyyy-mm-dd
  deskripsi: string;
  jenis: 'out' | 'in';
  sumber: string | null; // nama kolom sumber dana (cash out & cash in)
  nominal: number;
  keterangan: string;
  buktiNama: string | null;
  buktiUrl: string | null; // dataURL (mode lokal) atau URL Drive (mode Google)
  dibuat: number; // timestamp urutan input
}

export interface KeluargaItem {
  id: string;
  no?: string;
  tanggal: string; // ISO yyyy-mm-dd
  tanggalTampil?: string;
  keterangan: string;
  jumlah: number;
  buktiNama: string | null;
  buktiUrl: string | null;
  dibuat: number;
}

export const SUMBER_DANA = ['JSB', 'SIRCON G71', 'Ibu', 'W Acct', 'CELES'];

// Bulan berjalan dalam format 'YYYY-MM' menurut tanggal lokal perangkat
export const bulanIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const rp = (n: number) => {
  const rounded = Math.round(n);
  if (rounded < 0) {
    return '-Rp' + Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  return 'Rp' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const angka = (n: number) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const formatBulanTahun = (ym: string) => {
  if (!ym || ym === 'all') return 'Semua Periode';
  const [y, m] = ym.split('-').map(Number);
  return `${NAMA_BULAN[(m || 1) - 1]} ${y}`;
};

export const tglIndo = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${BULAN[(m || 1) - 1]} ${y}`;
};

export function terbilang(n: number): string {
  if (n <= 0) return 'Nol rupiah';
  const angkaKata = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function konversi(nom: number): string {
    if (nom < 12) return angkaKata[nom];
    if (nom < 20) return konversi(nom - 10) + ' Belas';
    if (nom < 100) return konversi(Math.floor(nom / 10)) + ' Puluh' + (nom % 10 !== 0 ? ' ' + konversi(nom % 10) : '');
    if (nom < 200) return 'Seratus' + (nom - 100 !== 0 ? ' ' + konversi(nom - 100) : '');
    if (nom < 1000) return konversi(Math.floor(nom / 100)) + ' Ratus' + (nom % 100 !== 0 ? ' ' + konversi(nom % 100) : '');
    if (nom < 2000) return 'Seribu' + (nom - 1000 !== 0 ? ' ' + konversi(nom - 1000) : '');
    if (nom < 1000000) return konversi(Math.floor(nom / 1000)) + ' Ribu' + (nom % 1000 !== 0 ? ' ' + konversi(nom % 1000) : '');
    if (nom < 1000000000) return konversi(Math.floor(nom / 1000000)) + ' Juta' + (nom % 1000000 !== 0 ? ' ' + konversi(nom % 1000000) : '');
    if (nom < 1000000000000) return konversi(Math.floor(nom / 1000000000)) + ' Miliar' + (nom % 1000000000 !== 0 ? ' ' + konversi(nom % 1000000000) : '');
    return String(nom);
  }

  const hasil = konversi(Math.floor(n)).trim();
  return (hasil.charAt(0).toUpperCase() + hasil.slice(1) + ' rupiah').replace(/\s+/g, ' ');
}
