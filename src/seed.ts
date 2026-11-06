import { Tx } from './types';

// Data contoh awal Petty Cash (diselaraskan dengan format bukti transfer operasional).
export const SALDO_AWAL = 1800000;
export const TANGGAL_SALDO_AWAL = '2026-09-29';

export const SEED: Tx[] = [
  { id: 's1', tanggal: '2026-09-29', deskripsi: 'Petty Cash Oktober 1', jenis: 'in', sumber: null, nominal: 20000000, keterangan: 'Pengisian awal operasional', buktiNama: 'tf-pettycash-okt1.jpg', buktiUrl: null, dibuat: 1 },
  { id: 's2', tanggal: '2026-09-29', deskripsi: 'karpet meja billiard', jenis: 'out', sumber: 'SIRCON G71', nominal: 3600000, keterangan: 'Transfer ke vendor karpet', buktiNama: 'tf-karpet-billiard.jpg', buktiUrl: null, dibuat: 2 },
  { id: 's3', tanggal: '2026-09-30', deskripsi: 'Aki Alphard', jenis: 'out', sumber: 'JSB', nominal: 2150000, keterangan: 'Penggantian aki toko resmi', buktiNama: 'tf-aki-alphard.jpg', buktiUrl: null, dibuat: 3 },
  { id: 's4', tanggal: '2026-09-30', deskripsi: 'uang parkir arya', jenis: 'out', sumber: 'JSB', nominal: 202500, keterangan: 'Pegangan parkir operasional + admin', buktiNama: null, buktiUrl: null, dibuat: 4 },
  { id: 's5', tanggal: '2026-10-01', deskripsi: 'farm.girl', jenis: 'out', sumber: 'Ibu', nominal: 450000, keterangan: 'Konsumsi meeting team', buktiNama: 'tf-farm-girl.png', buktiUrl: null, dibuat: 5 },
  { id: 's6', tanggal: '2026-10-02', deskripsi: 'ganti bensin avanza', jenis: 'out', sumber: 'SIRCON G71', nominal: 502500, keterangan: 'Isi BBM Pertamax + admin', buktiNama: 'tf-bensin-avanza.jpg', buktiUrl: null, dibuat: 6 },
  { id: 's7', tanggal: '2026-10-02', deskripsi: 'nasi uduk rapat', jenis: 'out', sumber: 'W Acct', nominal: 240000, keterangan: 'Konsumsi sarapan rapat staf', buktiNama: 'tf-nasi-uduk.jpg', buktiUrl: null, dibuat: 7 },
  { id: 's8', tanggal: '2026-10-05', deskripsi: 'Petty Cash Oktober 2', jenis: 'in', sumber: null, nominal: 10000000, keterangan: 'Pengisian kedua kas kecil', buktiNama: 'tf-pettycash-okt2.jpg', buktiUrl: null, dibuat: 8 },
  { id: 's9', tanggal: '2026-10-05', deskripsi: 'cuci mobil avanza', jenis: 'out', sumber: 'SIRCON G71', nominal: 80000, keterangan: 'Salon & cuci hidrolik', buktiNama: 'tf-cuci-avanza.jpg', buktiUrl: null, dibuat: 9 },
  { id: 's10', tanggal: '2026-10-06', deskripsi: 'Aqua galon kantor 5 tabung', jenis: 'out', sumber: 'Ibu', nominal: 110000, keterangan: 'Air minum operasional kantor', buktiNama: 'tf-aqua-galon.jpg', buktiUrl: null, dibuat: 10 },
];
