import { useEffect, useMemo, useRef, useState } from 'react';
import { Tx, KeluargaItem, SUMBER_DANA, rp, bulanIni, angka, tglIndo, terbilang, formatBulanTahun } from './types';
import { SALDO_AWAL, TANGGAL_SALDO_AWAL } from './seed';
import {
  getGoogleConfig, setGoogleConfig, getGoogleAccessToken, getGoogleUserEmail,
  loginGoogle, logoutGoogle, isGoogleConfigured, modeGoogle,
  loadLocal, saveLocal, fetchGoogle, addGoogle, deleteGoogle, updateGoogle, bulkAddGoogle, testGoogleConnection,
  prosesBerkas, BuktiFile, bersihkanSpreadsheetId, bersihkanFolderId, DEFAULT_SHEET_NAME,
  fetchSettingsGoogle, saveSettingsGoogle, loadSaldoAwalLocal, saveSaldoAwalLocal,
  saveSaldoBulanGoogle, loadSaldoBulanLocal, saveSaldoBulanLocal,
  fetchKeluargaGoogle, addKeluargaGoogle, updateKeluargaGoogle, deleteKeluargaGoogle, loadKeluargaLocal, saveKeluargaLocal,
} from './store';
import { bacaBukti, HasilBaca } from './ocr';
import { dapatkanBuktiGambar, ambilUrlGambar } from './mockReceipt';

// --- IKON-IKON SVG ---
const IconGoogle = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" style={{ flex: 'none' }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const IconPaperclip = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconArrowDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const IconArrowUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const IconWallet = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
    <path d="M16 3H4a2 2 0 0 0-2 2v2" />
    <circle cx="16" cy="14" r="1" />
  </svg>
);

const IconScale = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18" />
    <path d="M6 8l6-3 6 3" />
    <path d="M6 8l-3 7h6l-3-7z" />
    <path d="M18 8l-3 7h6l-3-7z" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const IconPrinter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IconTable = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const IconBookOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconTrendingUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconTrendingDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

interface BarisHitung {
  tx: Tx;
  saldo: number;
}

export default function App() {
  const [tema, setTema] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('pc_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('pc_theme', tema);
  }, [tema]);

  const toggleTema = () => {
    setTema((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [sidebarBuka, setSidebarBuka] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [lihat, setLihat] = useState<Tx | null>(null);
  const [pengaturan, setPengaturan] = useState(false);
  
  // Modal Transaksi State (Pengisian / Pengeluaran)
  const [modalTransaksi, setModalTransaksi] = useState<{ buka: boolean; jenisAwal: 'out' | 'in'; txEdit?: Tx } | null>(null);

  // Modal Pengeluaran Keluarga State
  const [modalKeluarga, setModalKeluarga] = useState<{ buka: boolean; itemEdit?: KeluargaItem | null } | null>(null);

  // Modal Cetak Bukti (Voucher Kas)
  const [txCetak, setTxCetak] = useState<Tx | null>(null);

  // Search & Filter state
  const [cari, setCari] = useState('');
  const [filterJenis, setFilterJenis] = useState<'all' | 'out' | 'in'>('all');
  const [filterSumber, setFilterSumber] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'proofs'>('table');
  const [mobileViewTab, setMobileViewTab] = useState<'card' | 'table'>('card');
  const [bulanAktif, setBulanAktif] = useState<string>(() => bulanIni());
  const [bulanAktifKeluarga, setBulanAktifKeluarga] = useState<string>('all');

  // Saldo per bulan & Tab aktif ('dashboard' | 'kas' | 'keluarga')
  const [saldoPerBulan, setSaldoPerBulan] = useState<Record<string, number>>(() => loadSaldoBulanLocal());
  const [tabAktif, setTabAktif] = useState<'dashboard' | 'kas' | 'keluarga'>('dashboard');
  const [keluargaList, setKeluargaList] = useState<KeluargaItem[]>(() => loadKeluargaLocal());

  // Saldo awal buku kas — bisa disesuaikan sendiri dari Pengaturan.
  // Mode Google nilainya tersimpan di Sheet (tab Pengaturan) dan berlaku di
  // semua perangkat; mode lokal tersimpan di perangkat ini. Selama belum
  // pernah diatur, berlaku angka bawaan dari seed.
  const [saldoAwalCfg, setSaldoAwalCfg] = useState<{ nominal: number; tanggal: string }>(() => {
    const l = loadSaldoAwalLocal();
    return {
      nominal: l.saldoAwal !== null ? l.saldoAwal : SALDO_AWAL,
      tanggal: l.tanggalSaldoAwal || TANGGAL_SALDO_AWAL,
    };
  });

  const [googleConnected, setGoogleConnected] = useState(() => modeGoogle());
  const [userEmail, setUserEmail] = useState(() => getGoogleUserEmail());

  const muat = async () => {
    setMemuat(true);
    setGalat('');
    const aktif = modeGoogle();
    setGoogleConnected(aktif);
    setUserEmail(getGoogleUserEmail());
    try {
      if (aktif) {
        setTxs(await fetchGoogle());
        try {
          const kItems = await fetchKeluargaGoogle();
          setKeluargaList(kItems.length > 0 ? kItems : loadKeluargaLocal());
        } catch {
          setKeluargaList(loadKeluargaLocal());
        }
        try {
          const st = await fetchSettingsGoogle();
          if (st.saldoAwal !== null || st.tanggalSaldoAwal !== null) {
            setSaldoAwalCfg((prev) => ({
              nominal: st.saldoAwal !== null ? st.saldoAwal : prev.nominal,
              tanggal: st.tanggalSaldoAwal || prev.tanggal,
            }));
          }
          if (st.saldoPerBulan) {
            setSaldoPerBulan(st.saldoPerBulan);
          }
        } catch {
          /* pengaturan gagal dibaca: tetap pakai angka yang berlaku */
        }
      } else {
        setTxs(loadLocal());
        setKeluargaList(loadKeluargaLocal());
      }
    } catch (e: any) {
      const errMsg = (e as Error).message || '';
      if (errMsg.includes('404') || errMsg.includes('belum aktif') || errMsg.includes('belum tersedia')) {
        setGalat('Mode Lokal aktif (Layanan backend Google Sheets belum aktif di hosting ini).');
        setGoogleConnected(false);
      } else if (errMsg.includes('credentials tidak ditemukan')) {
        setGalat('Service Account belum disetel di Vercel (tambahkan variabel GOOGLE_SERVICE_ACCOUNT_KEY di Project Settings). Menampilkan data lokal.');
        setGoogleConnected(false);
      } else {
        setGalat('Gagal membaca Google Sheets: ' + errMsg + ' (menampilkan data lokal).');
        setGoogleConnected(modeGoogle());
      }
      setTxs(loadLocal());
      setKeluargaList(loadKeluargaLocal());
    } finally {
      setMemuat(false);
    }
  };

  const simpanSaldoAwal = async (nominal: number, tanggal: string) => {
    if (modeGoogle()) {
      await saveSettingsGoogle(nominal, tanggal);
    } else {
      saveSaldoAwalLocal(nominal, tanggal);
    }
    setSaldoAwalCfg({ nominal, tanggal });
  };

  const simpanSaldoBulan = async (bulan: string, nominal: number | null) => {
    if (modeGoogle()) {
      await saveSaldoBulanGoogle(bulan, nominal);
    } else {
      const update = { ...loadSaldoBulanLocal() };
      if (nominal === null) delete update[bulan];
      else update[bulan] = nominal;
      saveSaldoBulanLocal(update);
    }
    setSaldoPerBulan((prev) => {
      const copy = { ...prev };
      if (nominal === null) delete copy[bulan];
      else copy[bulan] = nominal;
      return copy;
    });
  };

  useEffect(() => {
    muat();
  }, []);

  const terurut = useMemo(
    () => [...txs].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.dibuat - b.dibuat),
    [txs],
  );

  // Daftar periode bulanan LENGKAP tanpa celah: buku kas berjalan hampir setiap
  // bulan, jadi setiap bulan dari awal buku (saldo awal / transaksi pertama)
  // sampai bulan berjalan selalu bisa dipilih, termasuk bulan yang masih kosong.
  const daftarBulan = useMemo(() => {
    const keAngka = (ym: string) => {
      const [y, m] = ym.split('-').map(Number);
      return y * 12 + (m - 1);
    };
    const keTeks = (n: number) =>
      `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
    let awal = keAngka(bulanIni());
    let akhir = awal;
    const pertimbangkan = (ym: string) => {
      if (!ym) return;
      const n = keAngka(ym);
      if (n < awal) awal = n;
      if (n > akhir) akhir = n;
    };
    if (saldoAwalCfg.tanggal) pertimbangkan(saldoAwalCfg.tanggal.slice(0, 7));
    terurut.forEach((t) => {
      if (t.tanggal) pertimbangkan(t.tanggal.slice(0, 7));
    });
    keluargaList.forEach((k) => {
      if (k.tanggal) pertimbangkan(k.tanggal.slice(0, 7));
    });
    const hasil: string[] = [];
    for (let n = awal; n <= akhir; n++) hasil.push(keTeks(n));
    return hasil;
  }, [terurut, saldoAwalCfg, keluargaList]);

  // Kolom sumber dana: lima sumber bawaan ditambah sumber lain yang muncul
  // dari data (sumber baru dari formulir otomatis menjadi kolom sendiri,
  // termasuk di tabel cetak).
  const kolomSumber = useMemo(() => {
    const ekstra = Array.from(
      new Set(
        terurut
          .map((t) => t.sumber)
          .filter((x): x is string => !!x && !SUMBER_DANA.includes(x)),
      ),
    ).sort();
    return [...SUMBER_DANA, ...ekstra];
  }, [terurut]);

  // Perhitungan Saldo Awal dan Transaksi per Siklus Periode Bulanan (Monthly Rollover)
  const { saldoAwalBulan, tanggalAwalBulan, txsPeriode } = useMemo(() => {
    if (bulanAktif === 'all') {
      return {
        saldoAwalBulan: saldoAwalCfg.nominal,
        tanggalAwalBulan: saldoAwalCfg.tanggal,
        txsPeriode: terurut,
      };
    }

    // Akumulasi saldo awal bulan terpilih dari transaksi bulan-bulan sebelumnya
    let saldoRollover = saldoAwalCfg.nominal;
    terurut.forEach((t) => {
      if (t.tanggal.slice(0, 7) < bulanAktif) {
        saldoRollover += t.jenis === 'in' ? t.nominal : -t.nominal;
      }
    });

    const txsBulan = terurut.filter((t) => t.tanggal.slice(0, 7) === bulanAktif);
    const tanggalAwal = `${bulanAktif}-01`;

    // Override saldo awal jika disetel khusus untuk bulan ini
    if (typeof saldoPerBulan[bulanAktif] === 'number') {
      saldoRollover = saldoPerBulan[bulanAktif];
    }

    return {
      saldoAwalBulan: saldoRollover,
      tanggalAwalBulan: tanggalAwal,
      txsPeriode: txsBulan,
    };
  }, [terurut, bulanAktif, saldoAwalCfg, saldoPerBulan]);

  const baris: BarisHitung[] = useMemo(() => {
    let saldo = saldoAwalBulan;
    return txsPeriode.map((tx) => {
      saldo += tx.jenis === 'in' ? tx.nominal : -tx.nominal;
      return { tx, saldo };
    });
  }, [txsPeriode, saldoAwalBulan]);

  const totalIn = txsPeriode.filter((t) => t.jenis === 'in').reduce((s, t) => s + t.nominal, 0);
  const totalOut = txsPeriode.filter((t) => t.jenis === 'out').reduce((s, t) => s + t.nominal, 0);
  const sisa = saldoAwalBulan + totalIn - totalOut;
  const tanpaBukti = txsPeriode.filter((t) => t.jenis === 'out' && !t.buktiNama).length;

  const rekap = kolomSumber.map((s) => ({
    nama: s,
    total: txsPeriode.filter((t) => t.jenis === 'out' && t.sumber === s).reduce((a, t) => a + t.nominal, 0),
    masuk: txsPeriode.filter((t) => t.jenis === 'in' && t.sumber === s).reduce((a, t) => a + t.nominal, 0),
  }));
  const totalRekap = rekap.reduce((acc, curr) => acc + curr.total, 0) || 1;
  const rekapMax = Math.max(1, ...rekap.map((r) => r.total));
  const pengisian = txsPeriode.filter((t) => t.jenis === 'in');

  const currentIndex = daftarBulan.indexOf(bulanAktif);
  const handlePrevBulan = () => {
    if (bulanAktif === 'all') {
      if (daftarBulan.length > 0) setBulanAktif(daftarBulan[daftarBulan.length - 1]);
      return;
    }
    if (currentIndex > 0) {
      setBulanAktif(daftarBulan[currentIndex - 1]);
    }
  };
  const handleNextBulan = () => {
    if (bulanAktif === 'all') return;
    if (currentIndex >= 0 && currentIndex < daftarBulan.length - 1) {
      setBulanAktif(daftarBulan[currentIndex + 1]);
    }
  };

  const tambah = async (tx: Tx, bukti: BuktiFile | null) => {
    if (modeGoogle()) {
      const simpan = await addGoogle(tx, bukti);
      setTxs((prev) => [...prev, simpan]);
    } else {
      const lokal: Tx = {
        ...tx,
        buktiNama: bukti ? bukti.nama : tx.buktiNama,
        buktiUrl: bukti ? bukti.dataUrl : tx.buktiUrl,
      };
      const baru = [...txs, lokal];
      setTxs(baru);
      saveLocal(baru);
    }
  };

  // Hapus satu catatan kas (di mode Google barisnya ikut terhapus dari Sheet)
  const hapusTx = async (tx: Tx) => {
    const yakin = window.confirm(
      `Hapus catatan "${tx.deskripsi}" (${rp(tx.nominal)})?\n\nTindakan ini tidak bisa dibatalkan${modeGoogle() ? ' dan barisnya akan dihapus juga dari Google Sheet' : ''}.`,
    );
    if (!yakin) return;
    try {
      if (modeGoogle()) {
        await deleteGoogle(tx);
        setTxs(await fetchGoogle());
      } else {
        const next = txs.filter((t) => t.id !== tx.id);
        setTxs(next);
        saveLocal(next);
      }
    } catch (e) {
      alert('Gagal menghapus: ' + (e as Error).message);
    }
  };

  // Ubah catatan yang sudah tersimpan (barisnya ditulis ulang di Sheet)
  const ubah = async (tx: Tx, bukti: BuktiFile | null) => {
    if (modeGoogle()) {
      await updateGoogle(tx, bukti);
      setTxs(await fetchGoogle());
    } else {
      const lokal: Tx = {
        ...tx,
        buktiNama: bukti ? bukti.nama : tx.buktiNama,
        buktiUrl: bukti ? bukti.dataUrl : tx.buktiUrl,
      };
      const baru = txs.map((t) => (t.id === tx.id ? lokal : t));
      setTxs(baru);
      saveLocal(baru);
    }
  };

  // Upload atau ganti bukti gambar untuk transaksi tertentu
  const gantiBukti = async (txId: string, file: File) => {
    try {
      const berkas = await prosesBerkas(file);
      setTxs((prev) => {
        const next = prev.map((t) =>
          t.id === txId ? { ...t, buktiNama: berkas.nama, buktiUrl: berkas.dataUrl } : t,
        );
        if (!modeGoogle()) saveLocal(next);
        return next;
      });
    } catch (e) {
      alert('Gagal memproses berkas: ' + (e as Error).message);
    }
  };

  // Filter transaksi
  const barisTersaring = useMemo(() => {
    return baris.filter((b) => {
      if (filterJenis !== 'all' && b.tx.jenis !== filterJenis) return false;
      if (filterSumber !== 'all' && b.tx.sumber !== filterSumber) return false;
      if (cari.trim()) {
        const q = cari.toLowerCase();
        const matchDesk = b.tx.deskripsi.toLowerCase().includes(q);
        const matchKet = (b.tx.keterangan || '').toLowerCase().includes(q);
        const matchNom = String(b.tx.nominal).includes(q);
        const matchSumber = (b.tx.sumber || '').toLowerCase().includes(q);
        if (!matchDesk && !matchKet && !matchNom && !matchSumber) return false;
      }
      return true;
    });
  }, [baris, filterJenis, filterSumber, cari]);

  // Daftar kartu lampiran bukti transfer (disusun otomatis seperti penataan Excel manual)
  const daftarBukti = useMemo(() => {
    let nomor = 0;
    const list: Array<{ nomor: number; tx: Tx; imgUrl: string | null }> = [];
    barisTersaring.forEach((b) => {
      if (b.tx.jenis === 'out') {
        nomor += 1;
        list.push({
          nomor,
          tx: b.tx,
          imgUrl: dapatkanBuktiGambar(b.tx),
        });
      }
    });
    return list;
  }, [barisTersaring]);

  const adaFilter = cari.trim() !== '' || filterJenis !== 'all' || filterSumber !== 'all';

  const setPagePrintStyle = (rule: string) => {
    let el = document.getElementById('dynamic-page-print');
    if (!el) {
      el = document.createElement('style');
      el.id = 'dynamic-page-print';
      document.head.appendChild(el);
    }
    el.innerHTML = rule;
  };

  const cetakLaporan = () => {
    setPagePrintStyle('@page { size: A4 landscape; margin: 7mm 7mm 6mm 7mm; }');
    document.body.classList.remove('printing-voucher', 'printing-proofs');
    window.print();
    const handleAfter = () => {
      window.removeEventListener('afterprint', handleAfter);
    };
    window.addEventListener('afterprint', handleAfter);
  };

  const cetakLaporanKeluarga = () => {
    setTabAktif('keluarga');
    setPagePrintStyle('@page { size: A4 portrait; margin: 8mm; }');
    document.body.classList.remove('printing-voucher', 'printing-proofs');
    window.print();
    const handleAfter = () => {
      window.removeEventListener('afterprint', handleAfter);
    };
    window.addEventListener('afterprint', handleAfter);
  };

  const cetakLampiranBukti = () => {
    setPagePrintStyle('@page { size: A4 landscape; margin: 5mm 6mm 4mm 6mm; }');
    document.body.classList.remove('printing-voucher');
    document.body.classList.add('printing-proofs');
    window.print();
    const handleAfter = () => {
      document.body.classList.remove('printing-proofs');
      window.removeEventListener('afterprint', handleAfter);
    };
    window.addEventListener('afterprint', handleAfter);
  };

  // Render baris tabel
  const tampil: React.ReactNode[] = [];
  let nomor = 0;
  barisTersaring.forEach((b, i) => {
    const berikut = barisTersaring[i + 1];
    if (b.tx.jenis === 'out') nomor += 1;
    tampil.push(
      <tr key={b.tx.id} className={b.tx.jenis === 'in' ? 'cashin' : ''}>
        <td>{b.tx.jenis === 'out' ? nomor : ''}</td>
        <td className="date">{tglIndo(b.tx.tanggal)}</td>
        <td>
          {b.tx.jenis === 'in' ? (
            <div>
              <span className="in-badge">Cash In</span>
              <b>{b.tx.deskripsi}</b>
            </div>
          ) : (
            b.tx.deskripsi
          )}
        </td>
        {kolomSumber.map((s) => (
          <td key={s} className="num">
            {b.tx.jenis === 'out' && b.tx.sumber === s ? angka(b.tx.nominal) : <span className="empty">-</span>}
          </td>
        ))}
        <td className="num">
          {b.tx.jenis === 'in' ? <b style={{ color: 'var(--accent-in)' }}>{angka(b.tx.nominal)}</b> : <span className="empty">-</span>}
        </td>
        <td className="num"><b>{angka(b.saldo)}</b></td>
        <td>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {b.tx.buktiNama ? (
              <button className="proof" onClick={() => setLihat(b.tx)} title={b.tx.buktiNama}>
                <IconFile />
                {b.tx.buktiNama}
              </button>
            ) : b.tx.jenis === 'out' ? (
              <span className="proof miss">Belum ada bukti</span>
            ) : null}
            <button
              className="btn sm no-print"
              style={{ padding: '3px 7px', minHeight: 24, borderRadius: 6 }}
              title="Cetak Bukti Voucher"
              onClick={() => setTxCetak(b.tx)}
            >
              <IconPrinter />
            </button>
            <button
              className="btn sm no-print"
              style={{ padding: '3px 7px', minHeight: 24, borderRadius: 6 }}
              title="Ubah catatan ini"
              onClick={() => setModalTransaksi({ buka: true, jenisAwal: b.tx.jenis, txEdit: b.tx })}
            >
              <IconEdit />
            </button>
            <button
              className="btn sm no-print"
              style={{ padding: '3px 7px', minHeight: 24, borderRadius: 6, color: '#d64545' }}
              title="Hapus catatan ini"
              onClick={() => hapusTx(b.tx)}
            >
              <IconTrash />
            </button>
          </div>
        </td>
        <td style={{ color: 'var(--muted)' }}>{b.tx.keterangan || '-'}</td>
      </tr>,
    );

    // Saldo checkpoint muncul hanya saat tidak difilter
    if (!adaFilter && berikut && berikut.tx.jenis === 'in') {
      tampil.push(
        <tr key={'cp' + b.tx.id} className="checkpoint">
          <td colSpan={3 + kolomSumber.length} className="lbl">Saldo Checkpoint · {tglIndo(b.tx.tanggal)}</td>
          <td className="num">{angka(b.saldo)}</td>
          <td></td>
          <td></td>
        </tr>,
      );
    }
  });

  return (
    <div className="app-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className={'app-sidebar no-print' + (sidebarBuka ? ' open' : '')}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-emblem">TG</div>
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-corp">The Gesit Companies</div>
              <div className="sidebar-brand-title">Petty Cash Direksi</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-status-chip"
            onClick={() => setPengaturan(true)}
            title="Integrasi Google Sheets & Drive API (Klik untuk Pengaturan)"
          >
            <span className={'badge-dot' + (googleConnected ? ' live' : '')} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {googleConnected ? 'Google Sheets Aktif' : 'Mode Lokal (Tersimpan)'}
            </span>
          </button>
        </div>

        <div className="sidebar-nav-scroll">
          {/* Kelompok Aksi Cepat */}
          <div className="sidebar-actions-group">
            <button
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                if (tabAktif === 'keluarga') {
                  setModalKeluarga({ buka: true, itemEdit: null });
                } else {
                  setModalTransaksi({ buka: true, jenisAwal: 'out' });
                }
                setSidebarBuka(false);
              }}
              title={tabAktif === 'keluarga' ? 'Catat pengeluaran keluarga baru' : 'Catat pengeluaran operasional baru'}
            >
              <IconPlus />
              <span>Catat Pengeluaran</span>
            </button>
            {tabAktif !== 'keluarga' && (
              <button
                className="btn outline-success"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setModalTransaksi({ buka: true, jenisAwal: 'in' });
                  setSidebarBuka(false);
                }}
                title="Tambah pengisian saldo kas"
              >
                <IconArrowDown />
                <span>+ Isi Kas</span>
              </button>
            )}
          </div>

          <div>
            <div className="sidebar-section-label">Menu Utama</div>
            <div className="sidebar-menu">
              <button
                type="button"
                className={'sidebar-item' + (tabAktif === 'dashboard' ? ' active' : '')}
                onClick={() => {
                  setTabAktif('dashboard');
                  setSidebarBuka(false);
                }}
              >
                <div className="sidebar-item-left">
                  <IconDashboard />
                  <span>Dashboard</span>
                </div>
              </button>

              <button
                type="button"
                className={'sidebar-item' + (tabAktif === 'kas' ? ' active' : '')}
                onClick={() => {
                  setTabAktif('kas');
                  setSidebarBuka(false);
                }}
              >
                <div className="sidebar-item-left">
                  <IconBookOpen />
                  <span>Buku Kas</span>
                </div>
                <span className="sidebar-badge">{baris.length}</span>
              </button>

              <button
                type="button"
                className={'sidebar-item' + (tabAktif === 'keluarga' ? ' active' : '')}
                onClick={() => {
                  setTabAktif('keluarga');
                  setSidebarBuka(false);
                }}
              >
                <div className="sidebar-item-left">
                  <IconUsers />
                  <span>Keluarga Direksi</span>
                </div>
                <span className="sidebar-badge">{keluargaList.length}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="sidebar-section-label">Laporan &amp; Cetak</div>
            <div className="sidebar-menu">
              <button
                type="button"
                className="sidebar-item"
                onClick={() => {
                  setSidebarBuka(false);
                  cetakLaporan();
                }}
                title="Cetak Buku Kas Lengkap (Format A4 Landscape)"
              >
                <div className="sidebar-item-left">
                  <IconPrinter />
                  <span>Cetak Buku Kas A4</span>
                </div>
              </button>

              <button
                type="button"
                className="sidebar-item"
                onClick={() => {
                  setSidebarBuka(false);
                  cetakLaporanKeluarga();
                }}
                title="Cetak Laporan Pengeluaran Keluarga Direksi (Format A4 Portrait)"
              >
                <div className="sidebar-item-left">
                  <IconPrinter />
                  <span>Cetak Lap. Keluarga A4</span>
                </div>
              </button>

              <button
                type="button"
                className="sidebar-item"
                onClick={() => {
                  setSidebarBuka(false);
                  cetakLampiranBukti();
                }}
                title="Cetak Lampiran Bukti Transfer (A4 Landscape · 8 bukti per lembar)"
              >
                <div className="sidebar-item-left">
                  <IconGrid />
                  <span>Cetak Bukti Transfer</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="sidebar-section-label">Konfigurasi</div>
            <div className="sidebar-menu">
              <button
                type="button"
                className="sidebar-item"
                onClick={() => {
                  setSidebarBuka(false);
                  setPengaturan(true);
                }}
                title="Pengaturan Integrasi & Saldo Awal"
              >
                <div className="sidebar-item-left">
                  <IconSettings />
                  <span>Pengaturan &amp; Saldo</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">PA</div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div className="sidebar-user-role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>PA Direksi</div>
              <div className="sidebar-user-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>The Gesit Companies</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className="btn ghost icon-only sm"
              onClick={toggleTema}
              title={tema === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              aria-label="Toggle Tema"
            >
              {tema === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <a
              className="btn ghost icon-only sm"
              href="/logout"
              title="Keluar dan kunci aplikasi"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </a>
          </div>
        </div>
      </aside>

      {sidebarBuka && (
        <div
          className="sidebar-backdrop no-print"
          onClick={() => setSidebarBuka(false)}
        />
      )}

      {/* APP MAIN CONTENT */}
      <div className="app-main">
        {/* TOPBAR */}
        <header className="app-topbar no-print">
          <div className="app-topbar-left">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarBuka(!sidebarBuka)}
              title="Buka / Tutup Menu Navigasi"
              aria-label="Toggle Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="app-breadcrumb">
              <span className="no-mobile">The Gesit Companies</span>
              <span className="no-mobile">/</span>
              <span>Executive Desk</span>
              <span>/</span>
              <span className="app-breadcrumb-current">
                {tabAktif === 'dashboard' ? 'Executive Dashboard' : tabAktif === 'kas' ? 'Buku Kas Operasional' : 'Pengeluaran Keluarga Direksi'}
              </span>
            </div>
          </div>

          <div className="app-topbar-right">
            {tabAktif === 'keluarga' ? (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => setModalKeluarga({ buka: true, itemEdit: null })}
                title="Tambah catatan pengeluaran keluarga baru"
              >
                <IconPlus />
                <span>Catat Pengeluaran</span>
              </button>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>Sisa Kas:</span>
                <span style={{ color: sisa >= 0 ? '#10b981' : '#ef4444' }}>{angka(sisa)}</span>
              </div>
            )}

            <button
              className="btn ghost icon-only sm"
              onClick={muat}
              title="Muat Ulang Data Kas"
            >
              <IconRefresh />
            </button>
          </div>
        </header>

        {/* HEADER CETAK RESMI */}
        <div className="print-report-header">
          <div className="print-report-top">
            <div className="print-report-title-block">
              <div className="print-report-org">The Gesit Companies · Executive Desk</div>
              <h1 className="print-report-title">
                {tabAktif === 'keluarga' ? 'Laporan Pengeluaran Keluarga Direksi' : 'Buku Kas Petty Cash Direksi'}
              </h1>
              <div className="print-report-sub">
                Periode:{' '}
                <b>
                  {(tabAktif === 'keluarga' ? bulanAktifKeluarga : bulanAktif) !== 'all'
                    ? formatBulanTahun(tabAktif === 'keluarga' ? bulanAktifKeluarga : bulanAktif)
                    : 'Semua Periode'}
                </b>{' '}
                · {tabAktif === 'keluarga' ? 'Pengeluaran Khusus Keluarga Direksi (Tab: Keluarga)' : 'Basis Kas Riil'}
              </div>
            </div>
            <div className="print-report-meta-block">
              <div>Pengelola: <b>Personal Assistant (PA) Direksi</b></div>
              <div>Mata Uang: <b>IDR (Rupiah)</b></div>
              <div>Tanggal Cetak: <b>{tglIndo(new Date().toISOString().slice(0, 10))}</b></div>
            </div>
          </div>
        </div>

        {/* HEADER CETAK LAMPIRAN BUKTI (HANYA TAMPIL SAAT CETAK LAMPIRAN BUKTI) */}
        <div className="print-proofs-header">
          <h2>Lampiran Bukti Pengeluaran Kas Operasional Direksi (PA Receipts)</h2>
          <div className="print-proofs-meta">
            <span>Periode: {formatBulanTahun(bulanAktif)}</span>
            <span>Dicetak: {tglIndo(new Date().toISOString().slice(0, 10))}</span>
            <span>Format: A4 Landscape (8 Bukti per Lembar) · Total: {daftarBukti.length} Bukti Transfer</span>
          </div>
        </div>

        {/* APP CONTENT CONTAINER */}
        <div className="app-content">

      {/* TAB DASHBOARD EKSEKUTIF */}
      {tabAktif === 'dashboard' && (
        <DashboardExecutive
          sisa={sisa}
          saldoAwalBulan={saldoAwalBulan}
          totalIn={totalIn}
          totalOut={totalOut}
          baris={barisTersaring}
          semuaBaris={baris}
          keluargaList={keluargaList}
          daftarBulan={daftarBulan}
          bulanAktif={bulanAktif}
          setBulanAktif={setBulanAktif}
          formatBulanTahun={formatBulanTahun}
          onIsiKas={() => setModalTransaksi({ buka: true, jenisAwal: 'in' })}
          onCatatPengeluaran={() => setModalTransaksi({ buka: true, jenisAwal: 'out' })}
          onBukaKas={() => setTabAktif('kas')}
          onBukaKeluarga={() => setTabAktif('keluarga')}
          onBukaPengaturan={() => setPengaturan(true)}
          onCetak={cetakLaporan}
          onLihatBukti={(tx) => setLihat(tx)}
          googleConnected={googleConnected}
        />
      )}

      {tabAktif === 'kas' && (
        <>
          {galat && (
            <div className="err">
              <span>{galat}</span>
              <button className="btn sm" onClick={() => setGalat('')}>Tutup</button>
            </div>
          )}

      {/* BILAH NAVIGASI PERIODE BULANAN */}
      <div className="period-bar no-print">
        <div className="period-bar-left">
          <div className="period-badge-tag">
            <IconCalendar />
            <span>Siklus Kas</span>
          </div>

          <div className="period-quick-pills">
            {daftarBulan.map((ym) => (
              <button
                key={ym}
                className={`period-pill ${bulanAktif === ym ? 'active' : ''}`}
                onClick={() => setBulanAktif(ym)}
                title={`Pilih Periode ${formatBulanTahun(ym)}`}
              >
                {formatBulanTahun(ym)}
              </button>
            ))}
            <button
              className={`period-pill ${bulanAktif === 'all' ? 'active' : ''}`}
              onClick={() => setBulanAktif('all')}
              title="Tampilkan Seluruh Transaksi dari Awal"
            >
              Semua Periode
            </button>
          </div>
        </div>

        <div className="period-bar-right">
          <div className="compact-balance-bar">
            <div className="balance-pill">
              <span className="b-label">Saldo Awal</span>
              <span className="b-val">{rp(saldoAwalBulan)}</span>
            </div>
            <div className="balance-pill in">
              <span className="b-label">Cash In</span>
              <span className="b-val in">+{rp(totalIn)}</span>
            </div>
            <div className="balance-pill out">
              <span className="b-label">Cash Out</span>
              <span className="b-val out">-{rp(totalOut)}</span>
            </div>
            <div className="balance-pill highlight">
              <span className="b-label">Sisa Kas</span>
              <span className="b-val highlight">{rp(sisa)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL UTAMA: BUKU KAS & LAMPIRAN BUKTI */}
      <section className="panel">
        <div className="panel-h">
          <div className="panel-tabs-header no-print">
            <button
              className={`panel-header-tab ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Tampilkan Tabel Buku Kas Transaksi"
            >
              <IconTable />
              <span>Buku Kas</span>
              <span className="tab-count">{barisTersaring.length}</span>
            </button>
            <button
              className={`panel-header-tab ${viewMode === 'proofs' ? 'active' : ''}`}
              onClick={() => setViewMode('proofs')}
              title="Tampilkan Galeri Berkas Lampiran Bukti"
            >
              <IconGrid />
              <span>Lampiran Bukti</span>
              <span className="tab-count">{daftarBukti.length}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="hint">
              {viewMode === 'table'
                ? `Menampilkan ${barisTersaring.length} dari ${baris.length} catatan`
                : `${daftarBukti.length} bukti transfer (8 per lembar A4 Landscape)`}
            </span>

            {viewMode === 'proofs' && (
              <button className="btn sm primary no-print" onClick={cetakLampiranBukti} title="Cetak Seluruh Lampiran Bukti (A4 Landscape · 8 per lembar)">
                <IconPrinter /> Cetak Lembar Bukti (A4)
              </button>
            )}
          </div>
        </div>

        {/* TOOLBAR FILTER & CARI */}
        <div className="table-toolbar">
          <div className="search-box">
            <IconSearch />
            <input
              type="text"
              placeholder="Cari deskripsi, keterangan, nominal…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterJenis === 'all' ? 'active' : ''}`}
                onClick={() => setFilterJenis('all')}
              >
                Semua
              </button>
              <button
                className={`filter-tab ${filterJenis === 'out' ? 'active' : ''}`}
                onClick={() => setFilterJenis('out')}
              >
                Cash Out
              </button>
              <button
                className={`filter-tab ${filterJenis === 'in' ? 'active' : ''}`}
                onClick={() => setFilterJenis('in')}
              >
                Cash In
              </button>
            </div>

            <select
              style={{ padding: '5px 10px', fontSize: 12, minHeight: 32 }}
              value={filterSumber}
              onChange={(e) => setFilterSumber(e.target.value)}
              title="Filter per Sumber Dana"
            >
              <option value="all">Semua Sumber Dana</option>
              {kolomSumber.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {adaFilter && (
              <button
                className="btn sm"
                onClick={() => {
                  setCari('');
                  setFilterJenis('all');
                  setFilterSumber('all');
                }}
              >
                Reset Filter
              </button>
            )}

            {/* TOGGLE TAMPILAN KHUSUS LAYAR HP */}
            {viewMode === 'table' && (
              <div className="mobile-view-toggle no-print">
                <button
                  type="button"
                  className={`mobile-view-btn ${mobileViewTab === 'card' ? 'active' : ''}`}
                  onClick={() => setMobileViewTab('card')}
                  title="Tampilan Kartu Ramah HP"
                >
                  Kartu
                </button>
                <button
                  type="button"
                  className={`mobile-view-btn ${mobileViewTab === 'table' ? 'active' : ''}`}
                  onClick={() => setMobileViewTab('table')}
                  title="Tampilan Tabel Lengkap"
                >
                  Tabel Penuh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MODE TABEL BUKU KAS */}
        <div
          className={`tbl-scroll ${mobileViewTab === 'card' ? 'mobile-hide' : ''}`}
          style={{ display: viewMode === 'table' ? 'block' : 'none' }}
        >
          <table>
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: 44 }}>No</th>
                <th rowSpan={2} style={{ width: 105 }}>Tanggal</th>
                <th rowSpan={2}>Deskripsi Transaksi</th>
                <th colSpan={kolomSumber.length} style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  Cash Out (per Sumber Dana)
                </th>
                <th rowSpan={2} className="num" style={{ width: 110 }}>Cash In</th>
                <th rowSpan={2} className="num" style={{ width: 115 }}>Sisa Saldo</th>
                <th rowSpan={2} style={{ width: 125 }}>Bukti</th>
                <th rowSpan={2} style={{ width: 140 }}>Keterangan</th>
              </tr>
              <tr>
                {kolomSumber.map((s) => (
                  <th key={s} className="num" style={{ width: 95 }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!adaFilter && (
                <tr>
                  <td></td>
                  <td className="date">{tglIndo(tanggalAwalBulan)}</td>
                  <td>
                    <b>
                      {bulanAktif !== 'all'
                        ? `Saldo Awal ${formatBulanTahun(bulanAktif)} (Rollover)`
                        : 'Saldo Awal Periode'}
                    </b>
                  </td>
                  {kolomSumber.map((s) => (
                    <td key={s} className="num"><span className="empty">-</span></td>
                  ))}
                  <td className="num"><span className="empty">-</span></td>
                  <td className="num"><b>{angka(saldoAwalBulan)}</b></td>
                  <td></td>
                  <td style={{ color: 'var(--fg-muted)' }}>
                    {bulanAktif !== 'all' ? 'Saldo bawaan bulan sebelumnya' : 'Saldo awal buku'}
                  </td>
                </tr>
              )}

              {memuat ? (
                <tr>
                  <td colSpan={6 + kolomSumber.length}>
                    <div className="loading">
                      <div className="spinner" />
                      <div>Memuat data kas…</div>
                    </div>
                  </td>
                </tr>
              ) : barisTersaring.length === 0 ? (
                <tr>
                  <td colSpan={6 + kolomSumber.length}>
                    {adaFilter ? (
                      <div className="table-empty-state">
                        <div className="empty-state-title">Tidak ada transaksi yang cocok</div>
                        <div className="empty-state-desc">
                          Tidak ditemukan catatan kas yang sesuai dengan kata kunci pencarian atau filter yang Anda pilih.
                        </div>
                        <button
                          type="button"
                          className="btn sm outline-primary"
                          style={{ marginTop: 12 }}
                          onClick={() => {
                            setCari('');
                            setFilterJenis('all');
                            setFilterSumber('all');
                          }}
                        >
                          Reset Filter
                        </button>
                      </div>
                    ) : (
                      <div className="table-empty-state">
                        <div className="empty-state-title">
                          Belum ada transaksi di bulan {bulanAktif !== 'all' ? formatBulanTahun(bulanAktif) : 'periode ini'}
                        </div>
                        <div className="empty-state-desc">
                          {saldoAwalBulan !== 0
                            ? `Saldo berjalan terbawa dari bulan sebelumnya sebesar ${rp(saldoAwalBulan)}. Belum ada mutasi pengeluaran maupun pengisian kas tercatat.`
                            : 'Belum ada mutasi pengeluaran atau pengisian kas yang tercatat untuk periode ini.'}
                        </div>
                        <div style={{ display: 'inline-flex', gap: 8, marginTop: 14 }}>
                          <button
                            type="button"
                            className="btn primary sm"
                            onClick={() => setModalTransaksi({ buka: true, jenisAwal: 'out' })}
                          >
                            <IconPlus /> Catat Pengeluaran
                          </button>
                          <button
                            type="button"
                            className="btn outline-success sm"
                            onClick={() => setModalTransaksi({ buka: true, jenisAwal: 'in' })}
                          >
                            <IconArrowDown /> + Isi Kas
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                tampil
              )}

              {!memuat && !adaFilter && barisTersaring.length > 0 && (
                <tr className="checkpoint">
                  <td colSpan={3 + kolomSumber.length} className="lbl">
                    {bulanAktif !== 'all' ? `Saldo Akhir Kas (${formatBulanTahun(bulanAktif)})` : 'Saldo Akhir Buku Kas'}
                  </td>
                  <td className="num" style={{ color: 'var(--primary)', fontSize: 14 }}>{angka(sisa)}</td>
                  <td></td>
                  <td></td>
                </tr>
              )}

              {!memuat && barisTersaring.length > 0 && (
                <tr className="print-total-row">
                  <td></td>
                  <td></td>
                  <td><b>TOTAL PENGELUARAN &amp; SALDO AKHIR</b></td>
                  {kolomSumber.map((s) => {
                    const totSumber = barisTersaring
                      .filter((b) => b.tx.jenis === 'out' && b.tx.sumber === s)
                      .reduce((sum, b) => sum + b.tx.nominal, 0);
                    return (
                      <td key={s} className="num">
                        <b>{angka(totSumber)}</b>
                      </td>
                    );
                  })}
                  <td className="num">
                    <b style={{ color: 'var(--accent-in)' }}>{angka(totalIn)}</b>
                  </td>
                  <td className="num">
                    <b style={{ color: 'var(--primary)' }}>{angka(sisa)}</b>
                  </td>
                  <td colSpan={2} style={{ fontSize: 10, color: 'var(--fg-muted)' }}>
                    {daftarBukti.length} lampiran bukti terverifikasi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODE DAFTAR KARTU TRANSAKSI KHUSUS MOBILE */}
        <div
          className={`mobile-tx-list no-print ${mobileViewTab === 'table' ? 'mobile-hide' : ''}`}
          style={{ display: viewMode === 'table' ? undefined : 'none' }}
        >
          {!adaFilter && (
            <div className="mobile-rollover-card">
              <div className="m-rollover-header">
                <span className="m-rollover-tag">SALDO AWAL</span>
                <span className="m-rollover-date">{tglIndo(tanggalAwalBulan)}</span>
              </div>
              <div className="m-rollover-body">
                <span className="m-rollover-title">
                  {bulanAktif !== 'all'
                    ? `Saldo Awal ${formatBulanTahun(bulanAktif)} (Rollover)`
                    : 'Saldo Awal Periode'}
                </span>
                <span className="m-rollover-val">{rp(saldoAwalBulan)}</span>
              </div>
              <span className="m-rollover-desc">
                {bulanAktif !== 'all' ? 'Akumulasi saldo kas bawaan bulan sebelumnya' : 'Saldo awal buku kas'}
              </span>
            </div>
          )}

          {memuat ? (
            <div className="loading" style={{ padding: '36px 16px' }}>
              <div className="spinner" />
              <div>Memuat data kas…</div>
            </div>
          ) : barisTersaring.length === 0 ? (
            <div className="mobile-empty-card">
              {adaFilter ? (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                    Tidak ada transaksi yang cocok
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
                    Tidak ditemukan catatan kas yang sesuai dengan filter pencarian.
                  </div>
                  <button
                    type="button"
                    className="btn sm outline-primary"
                    onClick={() => {
                      setCari('');
                      setFilterJenis('all');
                      setFilterSumber('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 4, fontSize: 13.5 }}>
                    Belum ada transaksi di bulan {bulanAktif !== 'all' ? formatBulanTahun(bulanAktif) : 'periode ini'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14, lineHeight: 1.4 }}>
                    {saldoAwalBulan !== 0
                      ? `Saldo berjalan terbawa dari bulan sebelumnya ${rp(saldoAwalBulan)}. Belum ada mutasi baru.`
                      : 'Belum ada mutasi pengeluaran maupun pengisian kas tercatat.'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => setModalTransaksi({ buka: true, jenisAwal: 'out' })}
                    >
                      <IconPlus /> Pengeluaran
                    </button>
                    <button
                      type="button"
                      className="btn outline-success sm"
                      onClick={() => setModalTransaksi({ buka: true, jenisAwal: 'in' })}
                    >
                      <IconArrowDown /> + Isi Kas
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            barisTersaring.map((b) => {
              const isOut = b.tx.jenis === 'out';
              const isIn = b.tx.jenis === 'in';
              const imgUrl = ambilUrlGambar(b.tx.buktiUrl);

              return (
                <div key={b.tx.id} className={`mobile-tx-card ${isOut ? 'out' : 'in'}`}>
                  {/* Top Bar: Tanggal & Badge Sumber Dana */}
                  <div className="m-card-top">
                    <div className="m-card-badges">
                      <span className={`m-badge ${isOut ? 'out' : 'in'}`}>
                        {isOut ? 'Cash Out' : 'Cash In'}
                      </span>
                      {b.tx.sumber && <span className="m-badge-sumber">{b.tx.sumber}</span>}
                    </div>
                    <span className="m-card-date">{tglIndo(b.tx.tanggal)}</span>
                  </div>

                  {/* Body: Deskripsi & Keterangan */}
                  <div className="m-card-body">
                    <div className="m-card-title">{b.tx.deskripsi}</div>
                    {b.tx.keterangan && (
                      <div className="m-card-desc">{b.tx.keterangan}</div>
                    )}
                  </div>

                  {/* Amount & Running Saldo */}
                  <div className="m-card-fin">
                    <div className="m-card-nominal-wrap">
                      <span className="m-card-lbl">Nominal</span>
                      <span className={`m-card-amount ${isIn ? 'in' : 'out'}`}>
                        {isIn ? `+ ${rp(b.tx.nominal)}` : `- ${rp(b.tx.nominal)}`}
                      </span>
                    </div>
                    <div className="m-card-saldo-wrap">
                      <span className="m-card-lbl">Sisa Kas</span>
                      <span className={`m-card-saldo ${b.saldo < 0 ? 'defisit' : ''}`}>{rp(b.saldo)}</span>
                    </div>
                  </div>

                  {/* Actions Bar: Bukti & Cetak Voucher */}
                  <div className="m-card-foot">
                    {b.tx.buktiNama || imgUrl ? (
                      <button
                        type="button"
                        className="btn sm proof-btn"
                        onClick={() => setLihat({ ...b.tx, buktiUrl: imgUrl || b.tx.buktiUrl })}
                        title="Buka Pratinjau Bukti"
                      >
                        <IconFile />
                        <span>Lihat Bukti</span>
                      </button>
                    ) : isOut ? (
                      <span className="m-card-miss-proof">Belum ada bukti</span>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => setTxCetak(b.tx)}
                      title="Cetak Bukti Voucher Kas (BPK)"
                    >
                      <IconPrinter />
                      <span>Cetak Voucher</span>
                    </button>

                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => setModalTransaksi({ buka: true, jenisAwal: b.tx.jenis, txEdit: b.tx })}
                      title="Ubah catatan ini"
                    >
                      <IconEdit />
                      <span>Ubah</span>
                    </button>

                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ color: '#d64545' }}
                      onClick={() => hapusTx(b.tx)}
                      title="Hapus catatan ini"
                    >
                      <IconTrash />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {!memuat && !adaFilter && barisTersaring.length > 0 && (
            <div className={`mobile-checkpoint-card ${sisa < 0 ? 'defisit' : ''}`}>
              <span className="m-cp-label">
                {bulanAktif !== 'all' ? `Saldo Akhir Kas (${formatBulanTahun(bulanAktif)})` : 'Saldo Akhir Buku Kas'}
              </span>
              <span className={`m-cp-val ${sisa < 0 ? 'defisit' : ''}`}>{rp(sisa)}</span>
            </div>
          )}
        </div>

        {/* MODE GALERI LAMPIRAN BUKTI TRANSFER (PENGGANTI EXCEL MANUAL) */}
        <div
          className="proofs-grid"
          style={{ display: viewMode === 'proofs' ? 'grid' : 'none' }}
        >
          {daftarBukti.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>
              Tidak ada bukti pengeluaran yang sesuai dengan filter pencarian.
            </div>
          ) : (
            daftarBukti.map(({ nomor, tx, imgUrl }) => (
              <div key={tx.id} className="proof-card">
                <div className="proof-card-header">
                  <div className="proof-card-num-title">
                    <span className="proof-card-no">{nomor}.</span>
                    <span className="proof-card-title" title={tx.deskripsi}>
                      {tx.deskripsi}
                    </span>
                  </div>
                  <span className={`proof-card-amt ${tx.jenis === 'in' ? 'in' : ''}`}>
                    {rp(tx.nominal)}
                  </span>
                </div>

                <div className="proof-card-meta">
                  <span>{tglIndo(tx.tanggal)}</span>
                  <span>{tx.sumber || 'Kas Operasional'}</span>
                </div>

                {imgUrl ? (
                  <div
                    className="proof-card-img-area"
                    onClick={() => setLihat({ ...tx, buktiUrl: imgUrl })}
                    title="Klik untuk memperbesar bukti"
                  >
                    <img src={imgUrl} alt={tx.deskripsi} className="proof-card-img" />
                  </div>
                ) : (
                  <div className="proof-card-empty-img">
                    <IconFile />
                    <b style={{ fontSize: 11.5 }}>Belum Ada Bukti Transfer</b>
                    <label className="btn sm outline-success no-print" style={{ marginTop: 6, cursor: 'pointer' }}>
                      <IconUpload /> Unggah Bukti
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) gantiBukti(tx.id, e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                )}

                <div className="proof-card-actions no-print">
                  <button
                    className="btn sm ghost"
                    onClick={() => setTxCetak(tx)}
                    title="Cetak Voucher Kas (BPK)"
                  >
                    <IconPrinter /> Voucher
                  </button>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {imgUrl && (
                      <button
                        className="btn sm"
                        onClick={() => setLihat({ ...tx, buktiUrl: imgUrl })}
                        title="Pratinjau Bukti"
                      >
                        Perbesar
                      </button>
                    )}
                    <label className="btn sm ghost icon-only" title="Ganti Berkas Bukti" style={{ cursor: 'pointer' }}>
                      <IconUpload />
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) gantiBukti(tx.id, e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION DUA KOLOM: REKAP & RIWAYAT PENGISIAN */}
      <div className="cols">
        {/* REKAP PER SUMBER DANA */}
        <section className="panel">
          <div className="panel-h">
            <div>
              <h2>Rekap per Sumber Dana</h2>
              <span className="hint">Distribusi total pengeluaran (Cash Out)</span>
            </div>
          </div>
          <div>
            {rekap.map((r) => {
              const persentase = totalRekap > 0 ? Math.round((r.total / totalRekap) * 100) : 0;
              return (
                <div className="rekap-row" key={r.nama}>
                  <span className="nm">
                    {r.nama}
                    {r.masuk > 0 && (
                      <small style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--success)' }}>
                        +{rp(r.masuk)} masuk
                      </small>
                    )}
                  </span>
                  <span className="bar">
                    <i style={{ width: `${(r.total / rekapMax) * 100}%` }} />
                  </span>
                  <span className="pct">{persentase}%</span>
                  <span className="amt">{rp(r.total)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIWAYAT PENGISIAN (CASH IN) */}
        <section className="panel">
          <div className="panel-h">
            <div>
              <h2>Riwayat Pengisian (Cash In)</h2>
              <span className="hint">Pencatatan dana masuk &amp; top-up</span>
            </div>
            <button
              className="btn sm success"
              onClick={() => setModalTransaksi({ buka: true, jenisAwal: 'in' })}
            >
              <IconPlus /> Isi Kas
            </button>
          </div>
          <div>
            {pengisian.map((t) => (
              <div className="refill-row" key={t.id}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.deskripsi}</div>
                  <div className="dt">{tglIndo(t.tanggal)} {t.sumber ? `· ${t.sumber}` : ''} {t.buktiNama ? `· ${t.buktiNama}` : ''}</div>
                </div>
                <span className="amt">+ {rp(t.nominal)}</span>
                <button
                  type="button"
                  className="btn sm no-print"
                  style={{ padding: '3px 7px', minHeight: 24, borderRadius: 6, color: '#d64545' }}
                  title="Hapus catatan pengisian ini"
                  onClick={() => hapusTx(t)}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
            <div className="refill-row">
              <div>
                <div style={{ fontWeight: 600 }}>Saldo Awal {bulanAktif !== 'all' ? formatBulanTahun(bulanAktif) : 'Periode'}</div>
                <div className="dt">{tglIndo(tanggalAwalBulan)}</div>
              </div>
              <span className="amt" style={{ color: 'var(--ink)' }}>{rp(saldoAwalBulan)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER LAPORAN RESMI (A4 LANDSCAPE): REKAPITULASI & PENGESAHAN TANDA TANGAN */}
      <div className="print-footer-layout">
        <div className="print-rekap-box">
          <h3>Rekapitulasi Pengeluaran per Sumber Dana</h3>
          <table className="print-rekap-table">
            <tbody>
              {rekap.map((r) => {
                const persentase = totalRekap > 0 ? Math.round((r.total / totalRekap) * 100) : 0;
                return (
                  <tr key={r.nama}>
                    <td style={{ fontWeight: 600 }}>{r.nama}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{rp(r.total)}</td>
                    <td style={{ textAlign: 'right', color: '#71717a', width: 45 }}>{persentase}%</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ fontWeight: 700 }}>Total Pengeluaran</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{rp(totalOut)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="print-signature-area">
          <div className="print-signature-box">
            <div className="print-sig-role">Dibuat Oleh:</div>
            <div className="print-sig-name">Personal Assistant (PA)</div>
            <div className="print-sig-title">Tgl: {tglIndo(new Date().toISOString().slice(0, 10))}</div>
          </div>
          <div className="print-signature-box">
            <div className="print-sig-role">Diperiksa Oleh:</div>
            <div className="print-sig-name">Finance / Accounting Direksi</div>
            <div className="print-sig-title">Tgl: ...................................</div>
          </div>
          <div className="print-signature-box">
            <div className="print-sig-role">Disetujui Oleh:</div>
            <div className="print-sig-name">Direktur / Direksi</div>
            <div className="print-sig-title">Tgl: ...................................</div>
          </div>
        </div>
      </div>

      <p className="foot-note">
        Lampiran bukti didukung OCR otomatis di peramban sebagai rekomendasi isian. Data kas tersimpan konsisten.
      </p>
      </>
      )}

      {/* TAB KELUARGA DIREKSI */}
      {tabAktif === 'keluarga' && (
        <PengeluaranKeluarga
          daftar={keluargaList}
          daftarBulan={daftarBulan}
          bulanAktif={bulanAktifKeluarga}
          setBulanAktif={setBulanAktifKeluarga}
          formatBulanTahun={formatBulanTahun}
          onMuatUlang={() => muat()}
          onBukaCatat={() => setModalKeluarga({ buka: true, itemEdit: null })}
          onUbah={(item) => setModalKeluarga({ buka: true, itemEdit: item })}
          onCetak={cetakLaporanKeluarga}
        />
      )}
        </div>
      </div>

      {/* POP-UP MODAL TRANSAKSI (PENGISIAN / PENGELUARAN) */}
      {modalTransaksi?.buka && (
        <ModalTransaksi
          jenisAwal={modalTransaksi.jenisAwal}
          txEdit={modalTransaksi.txEdit || null}
          daftarSumber={kolomSumber}
          onTutup={() => setModalTransaksi(null)}
          onSimpan={modalTransaksi.txEdit ? ubah : tambah}
        />
      )}

      {/* POP-UP MODAL PENGELUARAN KELUARGA DIREKSI */}
      {modalKeluarga?.buka && (
        <ModalKeluarga
          itemEdit={modalKeluarga.itemEdit || null}
          onTutup={() => setModalKeluarga(null)}
          onSelesai={() => {
            setModalKeluarga(null);
            muat();
          }}
        />
      )}

      {/* MODAL LIHAT BUKTI */}
      {lihat && (
        <ModalBukti
          tx={lihat}
          onTutup={() => setLihat(null)}
          onCetak={() => {
            const item = lihat;
            setLihat(null);
            setTxCetak(item);
          }}
        />
      )}

      {/* MODAL CETAK BUKTI VOUCHER */}
      {txCetak && (
        <ModalCetakBukti
          tx={txCetak}
          onTutup={() => setTxCetak(null)}
        />
      )}

      {/* MODAL PENGATURAN GOOGLE (SHEETS & DRIVE API) */}
      {pengaturan && (
        <ModalPengaturan
          onTutup={() => setPengaturan(false)}
          onUpdateStatus={() => muat()}
          saldoAwal={saldoAwalCfg.nominal}
          tanggalSaldoAwal={saldoAwalCfg.tanggal}
          onSimpanSaldoAwal={simpanSaldoAwal}
          saldoPerBulan={saldoPerBulan}
          daftarBulan={daftarBulan}
          onSimpanSaldoBulan={simpanSaldoBulan}
        />
      )}
    </div>
  );
}

// --- POP-UP MODAL PENGISIAN & PENCATATAN TRANSAKSI ---
function ModalTransaksi({
  jenisAwal,
  txEdit,
  daftarSumber,
  onTutup,
  onSimpan,
}: {
  jenisAwal: 'out' | 'in';
  txEdit?: Tx | null;
  daftarSumber: string[];
  onTutup: () => void;
  onSimpan: (tx: Tx, bukti: BuktiFile | null) => Promise<void>;
}) {
  const [tanggal, setTanggal] = useState(txEdit ? txEdit.tanggal : new Date().toISOString().slice(0, 10));
  const [jenis, setJenis] = useState<'out' | 'in'>(txEdit ? txEdit.jenis : jenisAwal);
  const [sumber, setSumber] = useState(
    txEdit ? txEdit.sumber || '' : jenisAwal === 'in' ? '' : SUMBER_DANA[0],
  );
  const [sumberBaru, setSumberBaru] = useState('');
  const [deskripsi, setDeskripsi] = useState(txEdit ? txEdit.deskripsi : '');
  const [nominalRaw, setNominalRaw] = useState(txEdit ? String(txEdit.nominal) : '');
  const [keterangan, setKeterangan] = useState(txEdit ? txEdit.keterangan || '' : '');
  const [bukti, setBukti] = useState<BuktiFile | null>(null);

  const [ocrJalan, setOcrJalan] = useState(0);
  const [ocrHasil, setOcrHasil] = useState<HasilBaca | null>(null);
  const [ocrGagal, setOcrGagal] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; tipe: 'success' | 'danger' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const berkasRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTutup]);

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setNominalRaw(val);
  };

  const parsedNominal = nominalRaw ? parseInt(nominalRaw, 10) : 0;

  const pilihBerkas = async (f: File | undefined) => {
    if (!f) return;
    setOcrHasil(null);
    setOcrGagal('');
    setPesan(null);
    try {
      const b = await prosesBerkas(f);
      setBukti(b);

      if (b.mime.startsWith('image/')) {
        setOcrJalan(5);
        try {
          const hasil = await bacaBukti(b.dataUrl, (p) => setOcrJalan(Math.max(5, p)));
          setOcrHasil(hasil);
        } catch {
          setOcrGagal('OCR tidak dapat dijalankan di koneksi saat ini. Kamu tetap bisa mengisi nominal secara manual.');
        } finally {
          setOcrJalan(0);
        }
      }
    } catch {
      setPesan({ teks: 'Gagal memproses berkas gambar.', tipe: 'danger' });
    }
  };

  const hapusBerkas = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBukti(null);
    setOcrHasil(null);
    setOcrGagal('');
    if (berkasRef.current) berkasRef.current.value = '';
  };

  const terapkanOcr = () => {
    if (!ocrHasil) return;
    if (ocrHasil.nominal) setNominalRaw(String(ocrHasil.nominal));
    if (ocrHasil.tanggal) setTanggal(ocrHasil.tanggal);
    setOcrHasil(null);
    setPesan({ teks: 'Data OCR berhasil diterapkan ke formulir.', tipe: 'success' });
  };

  const simpan = async () => {
    if (!deskripsi.trim()) {
      setPesan({ teks: 'Deskripsi transaksi wajib diisi.', tipe: 'danger' });
      return;
    }
    if (!parsedNominal || parsedNominal <= 0) {
      setPesan({ teks: 'Nominal harus lebih dari 0.', tipe: 'danger' });
      return;
    }

    if (sumber === '__baru__' && !sumberBaru.trim()) {
      setPesan({ teks: 'Nama sumber dana baru wajib diisi.', tipe: 'danger' });
      return;
    }
    const sumberDipilih = sumber === '__baru__' ? sumberBaru.trim() : sumber;

    const tx: Tx = {
      id: txEdit ? txEdit.id : 'tx' + Date.now(),
      tanggal,
      deskripsi: deskripsi.trim(),
      jenis,
      sumber:
        jenis === 'out'
          ? sumberDipilih || daftarSumber[0] || SUMBER_DANA[0]
          : sumberDipilih || null,
      nominal: parsedNominal,
      keterangan: keterangan.trim(),
      buktiNama: bukti ? bukti.nama : txEdit ? txEdit.buktiNama : null,
      buktiUrl: bukti ? null : txEdit ? txEdit.buktiUrl : null,
      dibuat: txEdit ? txEdit.dibuat : Date.now(),
    };

    setMenyimpan(true);
    setPesan(null);

    try {
      await onSimpan(tx, bukti);
      onTutup();
    } catch (e) {
      setPesan({ teks: 'Gagal menyimpan: ' + (e as Error).message, tipe: 'danger' });
      setMenyimpan(false);
    }
  };

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !menyimpan) onTutup();
      }}
    >
      <div className="modal">
        <div className="modal-h">
          <div className="modal-h-title">
            <b>{txEdit ? 'Ubah Catatan Kas' : jenis === 'out' ? 'Catat Pengeluaran (Cash Out)' : 'Catat Pengisian Saldo (Cash In)'}</b>
            <span className="modal-sub">Masukkan rincian transaksi kas dan lampiran struk/transfer</span>
          </div>
          <button className="modal-close" onClick={onTutup} aria-label="Tutup" disabled={menyimpan}>
            <IconClose />
          </button>
        </div>

        <div className="modal-body">
          {/* TAB TOGGLE JENIS TRANSAKSI */}
          <div className="type-toggle-group">
            <button
              type="button"
              className={`type-toggle-btn ${jenis === 'out' ? 'active out' : ''}`}
              onClick={() => setJenis('out')}
            >
              <IconArrowUp />
              Pengeluaran (Cash Out)
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${jenis === 'in' ? 'active in' : ''}`}
              onClick={() => setJenis('in')}
            >
              <IconArrowDown />
              Pengisian (Cash In)
            </button>
          </div>

          {/* BARIS TANGGAL & SUMBER DANA */}
          <div className="modal-field-row">
            <div className="field">
              <label>Tanggal Transaksi</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>

            <div className="field">
              <label>{jenis === 'out' ? 'Sumber Dana' : 'Sumber Dana Tujuan'}</label>
              <select
                value={sumber === '__baru__' ? '__baru__' : jenis === 'out' ? (sumber || daftarSumber[0] || SUMBER_DANA[0]) : sumber}
                onChange={(e) => setSumber(e.target.value)}
              >
                {jenis === 'in' && <option value="">Umum (tanpa sumber khusus)</option>}
                {daftarSumber.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="__baru__">+ Sumber dana baru…</option>
              </select>
              {sumber === '__baru__' && (
                <input
                  type="text"
                  style={{ marginTop: 8 }}
                  value={sumberBaru}
                  onChange={(e) => setSumberBaru(e.target.value)}
                  placeholder="Nama sumber dana baru, contoh: Operasional Khusus"
                />
              )}
            </div>
          </div>

          {/* DESKRIPSI */}
          <div className="field">
            <label>
              <span>Deskripsi Transaksi</span>
              <span className="hint-text">Wajib diisi</span>
            </label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder={jenis === 'out' ? 'Contoh: Bensin kendaraan operasional + admin 2.500' : 'Contoh: Petty Cash Bulan Baru / Top Up dari Rekening'}
              autoFocus
            />
          </div>

          {/* NOMINAL DENGAN REALTIME PREVIEW */}
          <div className="field">
            <label>
              <span>Nominal (Rupiah)</span>
              <span className="hint-text">Hanya angka</span>
            </label>
            <div className="nominal-input-wrap">
              <span className="nominal-prefix">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={parsedNominal > 0 ? angka(parsedNominal) : nominalRaw}
                onChange={handleNominalChange}
                placeholder="0"
              />
            </div>
            {parsedNominal > 0 && (
              <div className="nominal-preview">
                Format: {rp(parsedNominal)}
              </div>
            )}
          </div>

          {/* KETERANGAN OPSIONAL */}
          <div className="field">
            <label>
              <span>Keterangan Tambahan</span>
              <span className="hint-text">Opsional</span>
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: No. kuitansi, nama vendor, atau catatan khusus"
            />
          </div>

          {/* BUKTI TRANSFER / STRUK (DRAG & DROP + PREVIEW) */}
          <div className="field">
            <label>
              <span>Lampiran Bukti (Foto Struk / Screenshot TF)</span>
              <span className="hint-text">Otomatis dibaca OCR</span>
            </label>

            {txEdit && txEdit.buktiNama && !bukti && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
                Bukti saat ini: <b>{txEdit.buktiNama}</b>. Pilih berkas baru hanya bila ingin menggantinya.
              </div>
            )}
            {!bukti ? (
              <div
                className={`drop ${isDragging ? 'is-dragging' : ''}`}
                onClick={() => berkasRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  pilihBerkas(e.dataTransfer.files?.[0]);
                }}
              >
                <IconPaperclip />
                <div>
                  <b>Klik atau seret berkas bukti ke sini</b>
                </div>
                <div className="types">Format gambar (JPG, PNG) atau PDF · Max 10MB</div>
              </div>
            ) : (
              <div className="file-preview-card">
                <div className="file-info">
                  {bukti.mime.startsWith('image/') ? (
                    <img src={bukti.dataUrl} alt="Preview Bukti" className="file-thumb" />
                  ) : (
                    <div className="file-icon-wrap"><IconFile /></div>
                  )}
                  <div className="file-details">
                    <div className="file-name">{bukti.nama}</div>
                    <div className="file-meta-sub">Bukti berhasil dilampirkan</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="file-remove-btn"
                  onClick={hapusBerkas}
                  title="Hapus / ganti lampiran"
                >
                  <IconTrash />
                </button>
              </div>
            )}

            <input
              ref={berkasRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => pilihBerkas(e.target.files?.[0])}
            />
          </div>

          {/* OCR RUNNING STATUS */}
          {ocrJalan > 0 && (
            <div className="ocr-box">
              <div className="ocr-box-header">
                <div className="t">
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                  Menganalisis gambar bukti (OCR)... {ocrJalan}%
                </div>
              </div>
              <div className="ocr-progress-bar">
                <i style={{ width: `${ocrJalan}%` }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                Pemindaian berjalan lokal di browser kamu secara aman.
              </div>
            </div>
          )}

          {/* OCR ERROR NOTICE */}
          {ocrGagal && (
            <div className="status-msg danger" style={{ fontSize: 12 }}>
              {ocrGagal}
            </div>
          )}

          {/* OCR RESULT CARD */}
          {ocrHasil && (ocrHasil.nominal || ocrHasil.tanggal) && (
            <div className="ocr-box">
              <div className="t">
                <IconCheck /> Hasil Deteksi OCR Otomatis
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                Periksa kesesuaian data yang terbaca dari foto struk:
              </div>
              <div className="row">
                <span>Nominal Terbaca:</span>
                <b>{ocrHasil.nominal ? rp(ocrHasil.nominal) : 'Tidak terdeteksi'}</b>
              </div>
              <div className="row">
                <span>Tanggal Terbaca:</span>
                <b>{ocrHasil.tanggal ? tglIndo(ocrHasil.tanggal) : 'Tidak terdeteksi'}</b>
              </div>
              <div className="ocr-actions">
                <button type="button" className="btn sm primary" onClick={terapkanOcr}>
                  Terapkan ke Formulir
                </button>
                <button type="button" className="btn sm" onClick={() => setOcrHasil(null)}>
                  Abaikan
                </button>
              </div>
            </div>
          )}

          {/* STATUS / FEEDBACK MESSAGE */}
          {pesan && (
            <div className={`status-msg ${pesan.tipe}`}>
              {pesan.teks}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onTutup} disabled={menyimpan}>
            Batal
          </button>
          <button
            type="button"
            className={`btn ${jenis === 'in' ? 'success' : 'primary'}`}
            disabled={menyimpan || !deskripsi.trim() || !parsedNominal}
            onClick={simpan}
          >
            {menyimpan ? 'Menyimpan…' : txEdit ? 'Simpan Perubahan' : jenis === 'in' ? 'Simpan Pengisian Kas' : 'Simpan Pengeluaran'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MODAL LIHAT BUKTI ---
function ModalBukti({
  tx,
  onTutup,
  onCetak,
}: {
  tx: Tx;
  onTutup: () => void;
  onCetak?: () => void;
}) {
  const bisaGambar =
    tx.buktiUrl &&
    (tx.buktiUrl.startsWith('data:image') ||
      /\.(jpg|jpeg|png)/i.test(tx.buktiUrl) ||
      tx.buktiUrl.includes('drive.google'));

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTutup]);

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-h">
          <div className="modal-h-title">
            <b>Bukti: {tx.deskripsi}</b>
            <span className="modal-sub">
              {tglIndo(tx.tanggal)} · {rp(tx.nominal)} {tx.sumber ? `(${tx.sumber})` : ''}
            </span>
          </div>
          <button className="modal-close" onClick={onTutup} aria-label="Tutup">
            <IconClose />
          </button>
        </div>

        <div className="proof-modal-body">
          {bisaGambar ? (
            <div className="proof-img-container">
              <img src={ambilUrlGambar(tx.buktiUrl) || tx.buktiUrl!} alt={'Bukti ' + tx.deskripsi} />
            </div>
          ) : (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--muted)' }}>
              Pratinjau gambar tidak tersedia untuk berkas ini ({tx.buktiNama || 'tanpa lampiran'}).
            </div>
          )}

          <div className="proof-meta-box">
            <div>
              <b>Berkas:</b> {tx.buktiNama || 'Tidak ada nama berkas'}
            </div>
            {tx.buktiUrl && !tx.buktiUrl.startsWith('data:') && (
              <div>
                <a href={tx.buktiUrl} target="_blank" rel="noreferrer">
                  Buka berkas resolusi penuh di Google Drive &rarr;
                </a>
              </div>
            )}
            {tx.keterangan && (
              <div>
                <b>Keterangan:</b> {tx.keterangan}
              </div>
            )}
          </div>
        </div>

        <div className="modal-foot">
          {onCetak && (
            <button className="btn" onClick={onCetak}>
              <IconPrinter />
              Cetak Voucher &amp; Bukti
            </button>
          )}
          <button className="btn primary" onClick={onTutup}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MODAL CETAK BUKTI VOUCHER RESMI ---
function ModalCetakBukti({ tx, onTutup }: { tx: Tx; onTutup: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTutup]);

  const cetak = () => {
    document.body.classList.add('printing-voucher');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-voucher');
    }, 500);
  };

  const bisaGambar =
    tx.buktiUrl &&
    (tx.buktiUrl.startsWith('data:image') ||
      /\.(jpg|jpeg|png)/i.test(tx.buktiUrl) ||
      tx.buktiUrl.includes('drive.google'));

  const noVoucher = 'VCH-' + tx.id.replace(/^tx/i, '').slice(-6).toUpperCase();

  return (
    <div
      className="overlay voucher-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <div className="modal" style={{ maxWidth: 740 }}>
        <div className="modal-h no-print">
          <div className="modal-h-title">
            <b>Pratinjau Cetak Voucher Kas</b>
            <span className="modal-sub">Format resmi bukti transaksi kas kecil</span>
          </div>
          <button className="modal-close" onClick={onTutup} aria-label="Tutup">
            <IconClose />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px', background: '#f8fafc' }}>
          <div className="voucher-sheet">
            <div className="voucher-header">
              <div>
                <div className="voucher-org">Office of the Board of Directors</div>
                <div className="voucher-title">
                  {tx.jenis === 'out' ? 'BUKTI PENGELUARAN OPERASIONAL DIREKSI' : 'BUKTI PENERIMAAN DANA OPERASIONAL'}
                </div>
              </div>
              <div className="voucher-meta-top">
                <div>No. Voucher: <b>{noVoucher}</b></div>
                <div>Tanggal: <b>{tglIndo(tx.tanggal)}</b></div>
              </div>
            </div>

            <table className="voucher-table">
              <tbody>
                <tr>
                  <td className="lbl">Peruntukan / Keperluan</td>
                  <td><b>{tx.deskripsi}</b></td>
                </tr>
                {tx.jenis === 'out' && (
                  <tr>
                    <td className="lbl">Sumber Dana</td>
                    <td>{tx.sumber || '-'}</td>
                  </tr>
                )}
                <tr>
                  <td className="lbl">Keterangan Tambahan</td>
                  <td>{tx.keterangan || '-'}</td>
                </tr>
                <tr>
                  <td className="lbl">Status Lampiran Bukti</td>
                  <td>{tx.buktiNama ? `Ada (${tx.buktiNama})` : 'Belum dilampirkan'}</td>
                </tr>
              </tbody>
            </table>

            <div className="voucher-amount-box">
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Jumlah Nominal:
              </span>
              <span className="amt-num">{rp(tx.nominal)}</span>
            </div>

            <div className="voucher-terbilang">
              <b>Terbilang:</b> {terbilang(tx.nominal)}
            </div>

            {/* FOTO STRUK JIKA ADA */}
            {bisaGambar && (
              <div className="voucher-attachment">
                <div className="voucher-attachment-title">Lampiran Bukti Transaksi Resmi:</div>
                <img
                  src={ambilUrlGambar(tx.buktiUrl) || tx.buktiUrl!}
                  alt={'Struk ' + tx.deskripsi}
                  className="voucher-attachment-img"
                />
              </div>
            )}

            {/* KOTAK TANDA TANGAN */}
            <div className="voucher-signatures">
              <div className="sig-box">
                <div className="sig-title">{tx.jenis === 'out' ? 'Dibayarkan Oleh' : 'Diterima Oleh'}</div>
                <div className="sig-line" />
                <div className="sig-name">Personal Assistant (PA)</div>
              </div>
              <div className="sig-box">
                <div className="sig-title">{tx.jenis === 'out' ? 'Diterima Oleh' : 'Diserahkan Oleh'}</div>
                <div className="sig-line" />
                <div className="sig-name">Penerima / Vendor</div>
              </div>
              <div className="sig-box">
                <div className="sig-title">Disetujui Oleh</div>
                <div className="sig-line" />
                <div className="sig-name">Direktur / Direksi</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot no-print">
          <button className="btn" onClick={onTutup}>
            Tutup
          </button>
          <button className="btn primary" onClick={cetak}>
            <IconPrinter />
            Cetak Voucher Sekarang (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MODAL PENGATURAN GOOGLE (OFFICIAL SERVICE ACCOUNT API) ---
function ModalPengaturan({
  onTutup,
  onUpdateStatus,
  saldoAwal,
  tanggalSaldoAwal,
  onSimpanSaldoAwal,
  saldoPerBulan,
  daftarBulan,
  onSimpanSaldoBulan,
}: {
  onTutup: () => void;
  onUpdateStatus: () => void;
  saldoAwal: number;
  tanggalSaldoAwal: string;
  onSimpanSaldoAwal: (nominal: number, tanggal: string) => Promise<void>;
  saldoPerBulan: Record<string, number>;
  daftarBulan: string[];
  onSimpanSaldoBulan: (bulan: string, saldoBulan: number | null) => Promise<void>;
}) {
  const cfgAwal = getGoogleConfig();
  const [spreadsheetId] = useState(cfgAwal.spreadsheetId);
  const [folderId] = useState(cfgAwal.folderId);
  const [sheetName] = useState(cfgAwal.sheetName || DEFAULT_SHEET_NAME);
  const [userEmail] = useState(getGoogleUserEmail());

  const [saldoRaw, setSaldoRaw] = useState(String(saldoAwal));
  const [saldoTgl, setSaldoTgl] = useState(tanggalSaldoAwal);
  const [simpanSaldoBerjalan, setSimpanSaldoBerjalan] = useState(false);
  const saldoParsed = saldoRaw ? parseInt(saldoRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;

  const simpanSaldoAwalKlik = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saldoTgl)) {
      setTestResult({ ok: false, msg: 'Tanggal saldo awal tidak valid.' });
      return;
    }
    setSimpanSaldoBerjalan(true);
    try {
      await onSimpanSaldoAwal(saldoParsed, saldoTgl);
      setTestResult({
        ok: true,
        msg: `Saldo awal tersimpan: ${rp(saldoParsed)} per ${tglIndo(saldoTgl)}. Semua periode dihitung ulang dari angka ini.`,
      });
    } catch (err: any) {
      setTestResult({ ok: false, msg: 'Gagal menyimpan saldo awal: ' + (err.message || err) });
    } finally {
      setSimpanSaldoBerjalan(false);
    }
  };

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTutup]);

  const tesKoneksi = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleConnection();
      setTestResult({ ok: true, msg: res.msg });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Gagal terhubung ke Google Sheets API.' });
    } finally {
      setTesting(false);
    }
  };

  const sinkronLokalKeSheets = async () => {
    setSyncing(true);
    setTestResult(null);
    try {
      const txs = loadLocal();
      const count = await bulkAddGoogle(txs);
      setTestResult({
        ok: true,
        msg: `Berhasil mengunggah ${count} data transaksi ke Google Sheets tab "${sheetName || DEFAULT_SHEET_NAME}"!`,
      });
      onUpdateStatus();
    } catch (err: any) {
      setTestResult({ ok: false, msg: 'Gagal mengunggah data: ' + (err.message || err) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-h">
          <div className="modal-h-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconGoogle />
              <b>Integrasi Google Cloud API (Sheets v4 &amp; Drive v3)</b>
            </div>
            <span className="modal-sub">
              Koneksi resmi via Google Service Account · Tanpa Apps Script · Tanpa Login GIS
            </span>
          </div>
          <button className="modal-close" onClick={onTutup} aria-label="Tutup">
            <IconClose />
          </button>
        </div>

        <div className="modal-body">
          {/* KARTU STATUS AKUN GOOGLE */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#16a34a',
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                  Google Service Account Aktif
                </div>
                <div style={{ fontSize: 11.5, color: '#166534', fontFamily: 'var(--font-mono)' }}>
                  {userEmail}
                </div>
              </div>
            </div>
            <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
              Official REST API
            </span>
          </div>

          {/* TARGET LINK SPREADSHEET & DRIVE */}
          <div className="field">
            <label>Google Spreadsheet Terhubung</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-subtle)' }}
              />
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="btn sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                Buka Sheet ↗
              </a>
            </div>
          </div>

          <div className="field">
            <label>Folder Google Drive (Penyimpanan Bukti Struk)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={`https://drive.google.com/drive/folders/${folderId}`}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-subtle)' }}
              />
              <a
                href={`https://drive.google.com/drive/folders/${folderId}`}
                target="_blank"
                rel="noreferrer"
                className="btn sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                Buka Drive ↗
              </a>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Project ID Google Cloud</label>
              <input
                type="text"
                readOnly
                value="pettycash-513910"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-subtle)' }}
              />
            </div>

            <div className="field">
              <label>Nama Tab Spreadsheet</label>
              <input
                type="text"
                readOnly
                value={sheetName}
                style={{ fontSize: 12, background: 'var(--bg-subtle)' }}
              />
            </div>
          </div>

          {/* SALDO AWAL BUKU KAS — BISA DISESUAIKAN SENDIRI */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Saldo Awal Buku Kas</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              Saldo pembuka sebelum transaksi pertama dicatat. Angka ini menjadi dasar perhitungan
              saldo semua periode{modeGoogle() ? ', tersimpan di Google Sheet (tab Pengaturan) sehingga sama di semua perangkat' : ' di perangkat ini'}.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Nominal Saldo Awal (Rupiah)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={saldoParsed > 0 ? angka(saldoParsed) : saldoRaw}
                  onChange={(e) => setSaldoRaw(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                />
                {saldoParsed > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 6 }}>
                    Format: {rp(saldoParsed)}
                  </div>
                )}
              </div>
              <div className="field">
                <label>Tanggal Saldo Awal</label>
                <input type="date" value={saldoTgl} onChange={(e) => setSaldoTgl(e.target.value)} />
              </div>
            </div>
            <button
              type="button"
              className="btn primary sm"
              onClick={simpanSaldoAwalKlik}
              disabled={simpanSaldoBerjalan}
              style={{ marginTop: 4 }}
            >
              {simpanSaldoBerjalan ? 'Menyimpan...' : 'Simpan Saldo Awal'}
            </button>
          </div>

          {/* SALDO AWAL PER BULAN */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Saldo Awal Per Bulan</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              Atur saldo pembuka untuk bulan tertentu. Bulan yang diatur di sini mengabaikan saldo bawaan dari bulan sebelumnya, dan bulan sesudahnya tetap dihitung dari angka ini. Kosongkan lalu simpan untuk menghapus pengaturan bulan itu.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(daftarBulan || []).map((b2) => {
                const ada2 = typeof (saldoPerBulan || {})[b2] === 'number';
                const val2 = ada2 ? String(saldoPerBulan[b2]) : '';
                return (
                  <div key={b2} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 110 }}>{formatBulanTahun(b2)}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      defaultValue={val2 ? angka(Number(val2)) : ''}
                      placeholder="Ikut bawaan"
                      id={'sb-' + b2}
                      style={{ flex: '1 1 130px', fontSize: 16 }}
                    />
                    {ada2 && (
                      <span style={{ fontSize: 11, color: 'var(--accent-in)', fontWeight: 600 }}>
                        Diatur manual
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn sm"
                      onClick={async () => {
                        const el = document.getElementById('sb-' + b2) as HTMLInputElement | null;
                        const mentah = (el ? el.value : '').replace(/[^0-9]/g, '');
                        setSimpanSaldoBerjalan(true);
                        try {
                          if (mentah === '') {
                            await onSimpanSaldoBulan(b2, null);
                            setTestResult({
                              ok: true,
                              msg: `Saldo awal ${formatBulanTahun(b2)} dihapus. Bulan itu kembali mengikuti saldo bawaan bulan sebelumnya.`,
                            });
                          } else {
                            const v = parseInt(mentah, 10) || 0;
                            await onSimpanSaldoBulan(b2, v);
                            setTestResult({
                              ok: true,
                              msg: `Saldo awal ${formatBulanTahun(b2)} tersimpan: ${rp(v)}. Bulan itu dan bulan sesudahnya dihitung ulang dari angka ini.`,
                            });
                          }
                        } catch (err: any) {
                          setTestResult({
                            ok: false,
                            msg: 'Gagal menyimpan saldo awal bulan: ' + (err.message || err),
                          });
                        } finally {
                          setSimpanSaldoBerjalan(false);
                        }
                      }}
                    >
                      Simpan
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {testResult && (
            <div
              style={{
                fontSize: 12,
                padding: '10px 14px',
                borderRadius: 6,
                marginBottom: 12,
                border: testResult.ok ? '1px solid #86efac' : '1px solid #fca5a5',
                background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                color: testResult.ok ? '#166534' : '#991b1b',
                lineHeight: 1.4,
              }}
            >
              <b>{testResult.ok ? '✓ Berhasil: ' : '✕ Perhatian: '}</b>
              {testResult.msg}
            </div>
          )}

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              fontSize: 11.5,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
            }}
          >
            💡 <b>Informasi Integrasi:</b> Sistem langsung terhubung ke Google Sheets API v4 dan Google Drive API v3 resmi via Service Account JSON. Bukti transaksi yang diunggah otomatis tersimpan ke Google Drive dan dicatat ke Google Sheets dengan tautan langsung.
          </div>
        </div>

        <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={tesKoneksi}
              disabled={testing || syncing}
              style={{ fontSize: 12 }}
            >
              {testing ? 'Menguji API...' : 'Uji Koneksi API'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={sinkronLokalKeSheets}
              disabled={syncing || testing}
              title="Unggah semua data transaksi bawaan ke Google Sheets"
              style={{ fontSize: 12 }}
            >
              {syncing ? 'Menyinkronkan...' : 'Upload Data Bawaan ke Sheets'}
            </button>
          </div>
          <div>
            <button className="btn primary" onClick={onTutup}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- KOMPONEN DASHBOARD EKSEKUTIF ---
function DashboardExecutive({
  sisa,
  saldoAwalBulan,
  totalIn,
  totalOut,
  baris,
  semuaBaris,
  keluargaList,
  daftarBulan,
  bulanAktif,
  setBulanAktif,
  formatBulanTahun,
  onIsiKas,
  onCatatPengeluaran,
  onBukaKas,
  onBukaKeluarga,
  onBukaPengaturan,
  onCetak,
  onLihatBukti,
  googleConnected,
}: {
  sisa: number;
  saldoAwalBulan: number;
  totalIn: number;
  totalOut: number;
  baris: BarisHitung[];
  semuaBaris: BarisHitung[];
  keluargaList: KeluargaItem[];
  daftarBulan: string[];
  bulanAktif: string;
  setBulanAktif: (m: string) => void;
  formatBulanTahun: (ym: string) => string;
  onIsiKas: () => void;
  onCatatPengeluaran: () => void;
  onBukaKas: () => void;
  onBukaKeluarga: () => void;
  onBukaPengaturan: () => void;
  onCetak: () => void;
  onLihatBukti: (tx: Tx) => void;
  googleConnected: boolean;
}) {
  const totalKeluarga = keluargaList.reduce((acc, k) => acc + (Number(k.jumlah) || 0), 0);
  const pengeluaranTx = baris.filter((b) => b.tx.jenis === 'out');
  const pemasukanTx = baris.filter((b) => b.tx.jenis === 'in');

  const totalTersedia = saldoAwalBulan + totalIn;
  const utilisasiPersen = totalTersedia > 0 ? Math.min(100, Math.round((totalOut / totalTersedia) * 100)) : 0;
  const sisaPersen = Math.max(0, 100 - utilisasiPersen);

  const rataRataOut = pengeluaranTx.length > 0 ? Math.round(totalOut / pengeluaranTx.length) : 0;
  const txTerbesar = pengeluaranTx.reduce(
    (max, b) => (!max || b.tx.nominal > max.tx.nominal ? b : max),
    null as BarisHitung | null
  );

  // Alokasi Sumber Dana
  const alokasiSumber = SUMBER_DANA.map((sumber) => {
    const total = pengeluaranTx
      .filter((b) => b.tx.sumber === sumber)
      .reduce((acc, b) => acc + b.tx.nominal, 0);
    const persen = totalOut > 0 ? Math.round((total / totalOut) * 100) : 0;
    return { sumber, total, persen };
  }).sort((a, b) => b.total - a.total);

  // 5 Transaksi Terkini
  const txTerkini = [...baris].reverse().slice(0, 5);

  // 4 Catatan Keluarga Terkini
  const keluargaTerkini = [...keluargaList].slice(-4).reverse();

  return (
    <div style={{ width: '100%' }}>
      {/* 1. HERO BANNER & SIKLUS PERIODE */}
      <div className="dash-hero no-print">
        <div className="dash-hero-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 8px',
                borderRadius: 4,
                background: googleConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: googleConnected ? 'var(--accent-in)' : 'var(--amber)',
                border: `1px solid ${googleConnected ? 'var(--accent-in-border)' : 'var(--amber-border)'}`,
              }}
            >
              {googleConnected ? 'Google Sheets Live' : 'Penyimpanan Lokal'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              Siklus Kas: <b>{bulanAktif === 'all' ? 'Semua Periode' : formatBulanTahun(bulanAktif)}</b>
            </span>
          </div>
          <h2>Dashboard Eksekutif Petty Cash</h2>
          <p>
            Ringkasan posisi saldo kas operasional Direksi, perputaran dana, dan rekap beban keluarga.
          </p>
        </div>

        <div className="dash-hero-actions">
          <div className="period-quick-pills">
            {daftarBulan.map((ym) => (
              <button
                key={ym}
                className={`period-pill ${bulanAktif === ym ? 'active' : ''}`}
                onClick={() => setBulanAktif(ym)}
                title={`Pilih Periode ${formatBulanTahun(ym)}`}
              >
                {formatBulanTahun(ym)}
              </button>
            ))}
            <button
              className={`period-pill ${bulanAktif === 'all' ? 'active' : ''}`}
              onClick={() => setBulanAktif('all')}
              title="Tampilkan Seluruh Transaksi"
            >
              Semua Periode
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline-success sm" onClick={onIsiKas} title="Tambah Kas Masuk">
              <IconArrowDown />
              <span>+ Isi Kas</span>
            </button>
            <button className="btn primary sm" onClick={onCatatPengeluaran} title="Catat Pengeluaran Operasional">
              <IconPlus />
              <span>+ Catat Pengeluaran</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRIC CARDS (4 KOLOM) */}
      <div className="dash-kpi-grid">
        {/* CARD 1: SISA KAS */}
        <div className="dash-kpi-card dash-kpi-balance" onClick={onBukaKas} style={{ cursor: 'pointer' }} title="Klik untuk membuka Buku Kas">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Sisa Kas Tersedia</span>
            <div className="dash-kpi-icon">
              <IconWallet />
            </div>
          </div>
          <div className="dash-kpi-val">{rp(sisa)}</div>
          <div className="dash-kpi-sub">
            <span>Saldo Awal: {rp(saldoAwalBulan)}</span>
            <span style={{ color: '#2563eb', fontWeight: 600 }}>Detail Kas →</span>
          </div>
        </div>

        {/* CARD 2: KAS MASUK */}
        <div className="dash-kpi-card dash-kpi-inflow" onClick={onBukaKas} style={{ cursor: 'pointer' }} title="Klik untuk melihat pemasukan">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Total Kas Masuk</span>
            <div className="dash-kpi-icon">
              <IconTrendingUp />
            </div>
          </div>
          <div className="dash-kpi-val">+{rp(totalIn)}</div>
          <div className="dash-kpi-sub">
            <span>{pemasukanTx.length} kali penambahan modal</span>
            <span style={{ color: 'var(--accent-in)', fontWeight: 600 }}>Cash In</span>
          </div>
        </div>

        {/* CARD 3: KAS KELUAR */}
        <div className="dash-kpi-card dash-kpi-outflow" onClick={onBukaKas} style={{ cursor: 'pointer' }} title="Klik untuk melihat pengeluaran">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Total Kas Keluar</span>
            <div className="dash-kpi-icon">
              <IconTrendingDown />
            </div>
          </div>
          <div className="dash-kpi-val">-{rp(totalOut)}</div>
          <div className="dash-kpi-sub">
            <span>{pengeluaranTx.length} transaksi operasional</span>
            <span style={{ color: 'var(--accent-out)', fontWeight: 600 }}>Cash Out</span>
          </div>
        </div>

        {/* CARD 4: BEBAN KELUARGA DIREKSI */}
        <div className="dash-kpi-card dash-kpi-keluarga" onClick={onBukaKeluarga} style={{ cursor: 'pointer' }} title="Klik untuk membuka Rekap Keluarga Direksi">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Beban Keluarga Direksi</span>
            <div className="dash-kpi-icon">
              <IconUsers />
            </div>
          </div>
          <div className="dash-kpi-val" style={{ color: '#8b5cf6' }}>{rp(totalKeluarga)}</div>
          <div className="dash-kpi-sub">
            <span>{keluargaList.length} pos (PBB, Sekolah, dll)</span>
            <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Lihat Rekap →</span>
          </div>
        </div>
      </div>

      {/* 3. WIDGET ANALITIK (2 KOLOM) */}
      <div className="dash-analytics-grid">
        {/* WIDGET KIRI: RASIO ARUS KAS & UTILISASI */}
        <div className="dash-panel">
          <div className="dash-panel-h">
            <div className="dash-panel-title">
              <IconScale />
              <span>Arus Kas & Rasio Penyerapan Anggaran</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              Total Dana: <b>{rp(totalTersedia)}</b>
            </span>
          </div>

          {/* Visual Meter */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--accent-out)', fontWeight: 600 }}>
                Terpakai: {utilisasiPersen}% ({rp(totalOut)})
              </span>
              <span style={{ color: 'var(--accent-in)', fontWeight: 600 }}>
                Tersisa: {sisaPersen}% ({rp(sisa)})
              </span>
            </div>
            <div className="dash-flow-meter">
              <div className="dash-flow-out" style={{ width: `${utilisasiPersen}%` }} title={`Kas Keluar: ${utilisasiPersen}%`} />
              <div className="dash-flow-in" style={{ width: `${sisaPersen}%` }} title={`Sisa Kas: ${sisaPersen}%`} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dash-stat-row">
              <span className="dash-stat-label">Rata-rata per Pengeluaran</span>
              <span className="dash-stat-val">{rp(rataRataOut)}</span>
            </div>
            <div className="dash-stat-row">
              <span className="dash-stat-label">Pengeluaran Terbesar Periode Ini</span>
              <span className="dash-stat-val">
                {txTerbesar ? `${rp(txTerbesar.tx.nominal)} (${txTerbesar.tx.deskripsi})` : '—'}
              </span>
            </div>
            <div className="dash-stat-row">
              <span className="dash-stat-label">Total Transaksi Periode Ini</span>
              <span className="dash-stat-val">{baris.length} catatan</span>
            </div>
            <div className="dash-stat-row">
              <span className="dash-stat-label">Integrasi Tab Sheet Google</span>
              <span className="dash-stat-val" style={{ color: 'var(--accent-in)' }}>
                Transaksi, Pengaturan, &amp; Keluarga
              </span>
            </div>
          </div>
        </div>

        {/* WIDGET KANAN: ALOKASI PENGELUARAN PER SUMBER DANA */}
        <div className="dash-panel">
          <div className="dash-panel-h">
            <div className="dash-panel-title">
              <IconWallet />
              <span>Alokasi Kas Keluar per Sumber Dana</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {SUMBER_DANA.length} Sumber Terdaftar
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {alokasiSumber.map((item) => (
              <div className="dash-source-item" key={item.sumber}>
                <div className="dash-source-header">
                  <span className="dash-source-name">
                    <span className="sumber-pill" style={{ fontSize: 11, padding: '2px 7px' }}>
                      {item.sumber}
                    </span>
                    <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{item.persen}%</span>
                  </span>
                  <span className="dash-source-amount">{rp(item.total)}</span>
                </div>
                <div className="dash-source-track">
                  <div
                    className="dash-source-fill"
                    style={{
                      width: `${item.persen}%`,
                      background:
                        item.sumber === 'SIRCON G71'
                          ? '#2563eb'
                          : item.sumber === 'JSB'
                          ? '#7c3aed'
                          : item.sumber === 'Ibu'
                          ? '#db2777'
                          : item.sumber === 'W Acct'
                          ? '#ea580c'
                          : '#059669',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. FEED AKTIVITAS TERKINI (2 KOLOM) */}
      <div className="dash-analytics-grid">
        {/* FEED 1: 5 TRANSAKSI KAS OPERASIONAL TERKINI */}
        <div className="dash-panel">
          <div className="dash-panel-h">
            <div className="dash-panel-title">
              <IconBookOpen />
              <span>Transaksi Kas Operasional Terkini</span>
            </div>
            <button className="btn sm ghost" onClick={onBukaKas} style={{ fontSize: 12 }}>
              Semua ({semuaBaris.length}) →
            </button>
          </div>

          <div className="dash-activity-list">
            {txTerkini.map((b) => (
              <div
                className="dash-activity-item"
                key={b.tx.id}
                onClick={() => b.tx.buktiUrl && onLihatBukti(b.tx)}
                style={{ cursor: b.tx.buktiUrl ? 'pointer' : 'default' }}
                title={b.tx.buktiUrl ? 'Klik untuk melihat bukti transaksi' : ''}
              >
                <div className="dash-activity-left">
                  <div className={`dash-activity-icon ${b.tx.jenis}`}>
                    {b.tx.jenis === 'in' ? <IconArrowDown /> : <IconArrowUp />}
                  </div>
                  <div className="dash-activity-info">
                    <div className="dash-activity-desc">{b.tx.deskripsi}</div>
                    <div className="dash-activity-date">
                      <span>{tglIndo(b.tx.tanggal)}</span>
                      {b.tx.sumber && <span className="sumber-pill">{b.tx.sumber}</span>}
                      {b.tx.buktiUrl && (
                        <span style={{ color: 'var(--accent-in)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <IconPaperclip /> Bukti
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dash-activity-right">
                  <div className={`dash-activity-amount ${b.tx.jenis}`}>
                    {b.tx.jenis === 'in' ? '+' : '-'}
                    {rp(b.tx.nominal)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                    Sisa: {rp(b.saldo)}
                  </div>
                </div>
              </div>
            ))}

            {txTerkini.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                Belum ada transaksi operasional pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* FEED 2: 4 POS PENGELUARAN KELUARGA TERKINI */}
        <div className="dash-panel">
          <div className="dash-panel-h">
            <div className="dash-panel-title">
              <IconUsers />
              <span>Pengeluaran Keluarga Direksi Terkini</span>
            </div>
            <button className="btn sm ghost" onClick={onBukaKeluarga} style={{ fontSize: 12 }}>
              Semua ({keluargaList.length}) →
            </button>
          </div>

          <div className="dash-activity-list">
            {keluargaTerkini.map((k, ki) => (
              <div
                className="dash-activity-item"
                key={k.id || ki}
                onClick={onBukaKeluarga}
                style={{ cursor: 'pointer' }}
                title="Buka Rekap Keluarga"
              >
                <div className="dash-activity-left">
                  <div
                    className="dash-activity-icon"
                    style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
                  >
                    #{k.no || ki + 1}
                  </div>
                  <div className="dash-activity-info">
                    <div className="dash-activity-desc">{k.keterangan}</div>
                    <div className="dash-activity-date">
                      <span>{k.tanggalTampil || tglIndo(k.tanggal)}</span>
                      {k.buktiUrl && (
                        <span style={{ color: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <IconPaperclip /> Ada Bukti
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dash-activity-right">
                  <div className="dash-activity-amount" style={{ color: '#8b5cf6' }}>
                    {rp(k.jumlah)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Beban Keluarga</div>
                </div>
              </div>
            ))}

            {keluargaTerkini.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                Belum ada catatan keluarga direksi.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- POP-UP MODAL PENGELUARAN KELUARGA DIREKSI ---
function ModalKeluarga({
  itemEdit,
  onTutup,
  onSelesai,
}: {
  itemEdit: KeluargaItem | null;
  onTutup: () => void;
  onSelesai: () => void;
}) {
  const [tanggal, setTanggal] = useState(itemEdit ? itemEdit.tanggal : new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState(itemEdit ? itemEdit.keterangan : '');
  const [jumlahStr, setJumlahStr] = useState(itemEdit ? String(itemEdit.jumlah) : '');
  const [fileBukti, setFileBukti] = useState<File | null>(null);
  const [previewBuktiBaru, setPreviewBuktiBaru] = useState<string | null>(null);
  const [simpanBerjalan, setSimpanBerjalan] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const berkasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !simpanBerjalan) onTutup();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTutup, simpanBerjalan]);

  const parsedJumlah = jumlahStr ? parseInt(jumlahStr.replace(/[^0-9]/g, ''), 10) : 0;

  const pilihBerkas = (f: File | undefined) => {
    if (!f) return;
    setFileBukti(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewBuktiBaru(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setPreviewBuktiBaru(null);
    }
  };

  const hapusBerkas = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileBukti(null);
    setPreviewBuktiBaru(null);
    if (berkasRef.current) berkasRef.current.value = '';
  };

  const simpanKlik = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !keterangan.trim()) {
      setPesan({ ok: false, msg: 'Tanggal dan keterangan pengeluaran wajib diisi.' });
      return;
    }
    if (!parsedJumlah || parsedJumlah <= 0) {
      setPesan({ ok: false, msg: 'Jumlah nominal harus lebih dari 0.' });
      return;
    }

    setSimpanBerjalan(true);
    setPesan(null);
    try {
      let buktiData: BuktiFile | null = null;
      if (fileBukti) {
        buktiData = await prosesBerkas(fileBukti);
      }

      if (itemEdit) {
        if (modeGoogle()) {
          await updateKeluargaGoogle(
            {
              ...itemEdit,
              tanggal,
              keterangan: keterangan.trim(),
              jumlah: parsedJumlah,
            },
            buktiData
          );
        } else {
          const lokal = loadKeluargaLocal();
          const idx = lokal.findIndex((it) => it.dibuat === itemEdit.dibuat || it.id === itemEdit.id);
          if (idx >= 0) {
            lokal[idx] = {
              ...itemEdit,
              tanggal,
              keterangan: keterangan.trim(),
              jumlah: parsedJumlah,
              buktiNama: buktiData ? buktiData.nama : itemEdit.buktiNama,
              buktiUrl: buktiData ? buktiData.dataUrl : itemEdit.buktiUrl,
            };
            saveKeluargaLocal(lokal);
          }
        }
      } else {
        if (modeGoogle()) {
          await addKeluargaGoogle(
            {
              tanggal,
              keterangan: keterangan.trim(),
              jumlah: parsedJumlah,
            },
            buktiData
          );
        } else {
          const lokal = loadKeluargaLocal();
          const nextNo = lokal.length + 1;
          lokal.push({
            id: 'k' + Date.now(),
            no: String(nextNo),
            tanggal,
            keterangan: keterangan.trim(),
            jumlah: parsedJumlah,
            buktiNama: buktiData ? buktiData.nama : null,
            buktiUrl: buktiData ? buktiData.dataUrl : null,
            dibuat: Date.now(),
          });
          saveKeluargaLocal(lokal);
        }
      }

      onSelesai();
    } catch (err: any) {
      setPesan({ ok: false, msg: 'Gagal menyimpan: ' + (err.message || err) });
      setSimpanBerjalan(false);
    }
  };

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !simpanBerjalan) onTutup();
      }}
    >
      <div className="modal" style={{ maxWidth: 540, width: '100%' }}>
        <div className="modal-h">
          <div className="modal-h-title">
            <b>{itemEdit ? 'Ubah Pengeluaran Keluarga' : 'Catat Pengeluaran Keluarga'}</b>
            <span className="modal-sub">
              Tersimpan langsung ke Google Sheets (Tab Sheet: <b>Keluarga</b>)
            </span>
          </div>
          <button className="modal-close" onClick={onTutup} aria-label="Tutup" disabled={simpanBerjalan}>
            <IconClose />
          </button>
        </div>

        <div className="modal-body">
          {pesan && (
            <div
              style={{
                fontSize: 12.5,
                padding: '10px 14px',
                borderRadius: 6,
                marginBottom: 14,
                border: pesan.ok ? '1px solid #86efac' : '1px solid #fca5a5',
                background: pesan.ok ? 'var(--bg-subtle)' : '#fef2f2',
                color: pesan.ok ? 'var(--fg)' : '#991b1b',
                lineHeight: 1.4,
              }}
            >
              {pesan.msg}
            </div>
          )}

          <div className="modal-field-row">
            <div className="field">
              <label>Tanggal Transaksi</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={simpanBerjalan}
              />
            </div>

            <div className="field">
              <label>Jumlah Nominal (Rupiah)</label>
              <input
                type="text"
                inputMode="numeric"
                value={jumlahStr ? angka(Number(jumlahStr.replace(/[^0-9]/g, '')) || 0) : ''}
                onChange={(e) => setJumlahStr(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                disabled={simpanBerjalan}
              />
              {parsedJumlah > 0 && (
                <div className="nominal-preview">
                  Format: {rp(parsedJumlah)}
                </div>
              )}
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Keterangan / Uraian Transaksi</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Sinar Bangsa PBB / Asuransi / SPP Sekolah"
              disabled={simpanBerjalan}
              autoFocus
            />
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>
              <span>Bukti Transfer / Dokumen Pembayaran (Gambar)</span>
              <span className="hint-text">Disimpan ke Google Drive</span>
            </label>

            {itemEdit && itemEdit.buktiNama && !fileBukti && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
                Bukti tersimpan saat ini: <b>{itemEdit.buktiNama}</b>. Unggah berkas baru bila ingin menggantinya.
              </div>
            )}

            {!fileBukti ? (
              <div
                className={`drop ${isDragging ? 'is-dragging' : ''}`}
                onClick={() => berkasRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  pilihBerkas(e.dataTransfer.files?.[0]);
                }}
              >
                <IconPaperclip />
                <div>
                  <b>Klik atau seret berkas bukti transfer ke sini</b>
                </div>
                <div className="types">Format gambar (JPG, PNG, JPEG) · Otomatis dikompres</div>
              </div>
            ) : (
              <div className="file-preview-card">
                <div className="file-info">
                  {previewBuktiBaru ? (
                    <img src={previewBuktiBaru} alt="Preview Bukti" className="file-thumb" />
                  ) : (
                    <div className="file-icon-wrap"><IconFile /></div>
                  )}
                  <div>
                    <div className="file-name">{fileBukti.name}</div>
                    <div className="file-size">{(fileBukti.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-remove-file"
                  onClick={hapusBerkas}
                  title="Hapus berkas ini"
                >
                  <IconClose />
                </button>
              </div>
            )}

            <input
              ref={berkasRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => pilihBerkas(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button
            type="button"
            className="btn"
            onClick={onTutup}
            disabled={simpanBerjalan}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={simpanKlik}
            disabled={simpanBerjalan}
          >
            {simpanBerjalan ? 'Menyimpan ke Sheet...' : itemEdit ? 'Simpan Perubahan' : '+ Simpan Catatan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- KOMPONEN PENGELUARAN KELUARGA DIREKSI ---
function PengeluaranKeluarga({
  daftar,
  daftarBulan,
  bulanAktif,
  setBulanAktif,
  formatBulanTahun,
  onMuatUlang,
  onBukaCatat,
  onUbah,
  onCetak,
}: {
  daftar: KeluargaItem[] | null;
  daftarBulan: string[];
  bulanAktif: string;
  setBulanAktif: (m: string) => void;
  formatBulanTahun: (ym: string) => string;
  onMuatUlang: () => void;
  onBukaCatat: () => void;
  onUbah: (item: KeluargaItem) => void;
  onCetak: () => void;
}) {
  const [cari, setCari] = useState('');
  const [previewBukti, setPreviewBukti] = useState<{ url: string; judul: string } | null>(null);

  const items = daftar && daftar.length > 0 ? daftar : loadKeluargaLocal();
  const itemsUrut = useMemo(() => {
    return [...items].sort((a, b) =>
      a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : a.dibuat - b.dibuat
    );
  }, [items]);

  const totalKeseluruhan = useMemo(() => {
    return itemsUrut.reduce((acc, it) => acc + (Number(it.jumlah) || 0), 0);
  }, [itemsUrut]);

  // Filter data berdasarkan periode bulan yang dipilih
  const itemsPeriode = useMemo(() => {
    if (bulanAktif === 'all') return itemsUrut;
    return itemsUrut.filter((it) => it.tanggal && it.tanggal.startsWith(bulanAktif));
  }, [itemsUrut, bulanAktif]);

  const totalPeriode = useMemo(() => {
    return itemsPeriode.reduce((acc, it) => acc + (Number(it.jumlah) || 0), 0);
  }, [itemsPeriode]);

  // Filter pencarian teks
  const itemsTersaring = useMemo(() => {
    if (!cari.trim()) return itemsPeriode;
    const q = cari.toLowerCase();
    return itemsPeriode.filter((it) => {
      return (
        it.keterangan.toLowerCase().includes(q) ||
        String(it.tanggalTampil || it.tanggal).toLowerCase().includes(q) ||
        String(it.jumlah).includes(q)
      );
    });
  }, [itemsPeriode, cari]);

  const currentIndex = daftarBulan.indexOf(bulanAktif);
  const handlePrevBulan = () => {
    if (bulanAktif === 'all') {
      if (daftarBulan.length > 0) setBulanAktif(daftarBulan[daftarBulan.length - 1]);
      return;
    }
    if (currentIndex > 0) {
      setBulanAktif(daftarBulan[currentIndex - 1]);
    }
  };
  const handleNextBulan = () => {
    if (bulanAktif === 'all') return;
    if (currentIndex >= 0 && currentIndex < daftarBulan.length - 1) {
      setBulanAktif(daftarBulan[currentIndex + 1]);
    }
  };

  const hapusKlik = async (item: KeluargaItem) => {
    if (window.confirm(`Hapus catatan "${item.keterangan}" (${rp(item.jumlah)})?`)) {
      try {
        if (modeGoogle()) {
          await deleteKeluargaGoogle(item.dibuat, item);
        } else {
          const lokal = loadKeluargaLocal().filter((it) => it.dibuat !== item.dibuat && it.id !== item.id);
          saveKeluargaLocal(lokal);
        }
        onMuatUlang();
      } catch (err: any) {
        alert('Gagal menghapus: ' + (err.message || err));
      }
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      {/* HEADER SECTION KELUARGA */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
            Pengeluaran Keluarga Direksi
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--fg-muted)',
              margin: '4px 0 0',
              lineHeight: 1.5,
            }}
          >
            Laporan pengeluaran keluarga direksi (Pajak PBB, sekolah, asuransi, operasional keluarga) · Tab Sheet:{' '}
            <b style={{ color: 'var(--fg)' }}>Keluarga</b>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn"
            onClick={onCetak}
            title="Cetak Laporan Pengeluaran Keluarga (A4 Portrait)"
          >
            <IconPrinter />
            <span>Cetak Laporan</span>
          </button>

          <button
            type="button"
            className="btn primary"
            onClick={onBukaCatat}
            title="Catat pengeluaran keluarga baru (Pop-up Modal)"
          >
            <IconPlus />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* BILAH SIKLUS PERIODE BULANAN (SAMA SEPERTI BUKU KAS) */}
      <div className="period-bar no-print">
        <div className="period-bar-left">
          <div className="period-badge-tag">
            <IconCalendar />
            <span>Siklus Periode</span>
          </div>

          <div className="period-nav-group">
            <button
              type="button"
              className="period-nav-btn"
              onClick={handlePrevBulan}
              disabled={currentIndex === 0}
              title="Bulan Sebelumnya"
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              className="period-nav-btn"
              onClick={handleNextBulan}
              disabled={currentIndex >= daftarBulan.length - 1 || bulanAktif === 'all'}
              title="Bulan Berikutnya"
            >
              <IconChevronRight />
            </button>
          </div>

          <div className="period-quick-pills">
            <button
              type="button"
              className={`period-pill ${bulanAktif === 'all' ? 'active' : ''}`}
              onClick={() => setBulanAktif('all')}
              title="Tampilkan Seluruh Transaksi Pengeluaran Keluarga"
            >
              Semua Periode
            </button>
            {daftarBulan.map((ym) => (
              <button
                key={ym}
                type="button"
                className={`period-pill ${bulanAktif === ym ? 'active' : ''}`}
                onClick={() => setBulanAktif(ym)}
                title={`Pilih Periode ${formatBulanTahun(ym)}`}
              >
                {formatBulanTahun(ym)}
              </button>
            ))}
          </div>
        </div>

        <div className="period-bar-right">
          <div className="compact-balance-bar">
            <div className="balance-pill out">
              <span className="b-label">
                {bulanAktif !== 'all' ? `Bulan ${formatBulanTahun(bulanAktif)}` : 'Periode Terpilih'}
              </span>
              <span className="b-val out">{rp(totalPeriode)}</span>
            </div>
            <div className="balance-pill">
              <span className="b-label">Transaksi</span>
              <span className="b-val">{itemsPeriode.length} Catatan</span>
            </div>
            <div className="balance-pill highlight">
              <span className="b-label">Akumulasi Total</span>
              <span className="b-val highlight">{rp(totalKeseluruhan)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FULL TABLE CARD CONTAINER */}
      <div className="keluarga-card-table">
        {/* TOOLBAR FILTER & SEARCH */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-subtle)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240, maxWidth: 420 }}>
            <div className="search-box" style={{ width: '100%' }}>
              <IconSearch />
              <input
                type="text"
                placeholder="Cari transaksi pengeluaran keluarga..."
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                style={{ width: '100%', height: 34, fontSize: 12.5 }}
              />
            </div>
            {cari && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setCari('')}
                style={{ fontSize: 11, height: 32 }}
              >
                Reset
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'var(--secondary)',
                color: 'var(--fg)',
              }}
            >
              Periode: {bulanAktif !== 'all' ? formatBulanTahun(bulanAktif) : 'Semua Periode'}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontWeight: 500 }}>
              <b>{itemsTersaring.length}</b> dari {itemsPeriode.length} transaksi
            </span>
          </div>
        </div>

        {/* TABEL FULL WIDTH */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="keluarga-table full-table">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ width: 56, textAlign: 'center', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>No</th>
                <th style={{ width: 140, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Tanggal</th>
                <th style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Keterangan / Uraian</th>
                <th style={{ width: 180, textAlign: 'right', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Jumlah (Nominal)</th>
                <th style={{ width: 220, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Bukti Transfer / Dokumen</th>
                <th className="no-print" style={{ width: 140, textAlign: 'center', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {itemsTersaring.map((q, qi) => {
                const driveMatch = q.buktiUrl ? q.buktiUrl.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) : null;
                const driveThumbUrl = driveMatch ? `/api/drive-image/${driveMatch[1]}` : null;
                const displayImgUrl = q.buktiUrl?.startsWith('data:') ? q.buktiUrl : driveThumbUrl;

                return (
                  <tr
                    key={q.id || qi}
                    style={{
                      borderTop: '1px solid var(--border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 500 }}>
                      {q.no || (qi + 1)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {q.tanggalTampil || tglIndo(q.tanggal)}
                    </td>
                    <td style={{ wordBreak: 'break-word', lineHeight: 1.5, fontWeight: 500 }}>
                      {q.keterangan}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--fg)' }}>
                      {rp(q.jumlah)}
                    </td>
                    <td>
                      {q.buktiUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {displayImgUrl && (
                            <img
                              src={displayImgUrl}
                              alt="Bukti Transfer"
                              onClick={() => setPreviewBukti({ url: displayImgUrl, judul: q.keterangan })}
                              style={{
                                width: 42,
                                height: 42,
                                objectFit: 'cover',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                          <a
                            href={q.buktiUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 12.5,
                              color: 'var(--accent, #2563eb)',
                              textDecoration: 'none',
                              wordBreak: 'break-word',
                              fontWeight: 500,
                            }}
                            title="Klik untuk membuka dokumen bukti"
                          >
                            {q.buktiNama || 'Lihat Bukti'}
                          </a>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn ghost sm no-print"
                          onClick={() => onUbah(q)}
                          style={{ fontSize: 11.5, padding: '3px 8px', color: 'var(--fg-muted)' }}
                          title="Unggah bukti transfer untuk transaksi ini"
                        >
                          + Lampirkan Bukti
                        </button>
                      )}
                    </td>
                    <td className="no-print" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => onUbah(q)}
                        title="Ubah catatan ini"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        style={{ color: '#d64545', marginLeft: 6 }}
                        onClick={() => hapusKlik(q)}
                        title="Hapus catatan ini"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
              {itemsTersaring.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '48px 16px',
                      textAlign: 'center',
                      color: 'var(--fg-muted)',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                      {cari
                        ? 'Tidak ada hasil yang sesuai dengan pencarian.'
                        : `Tidak ada transaksi pengeluaran keluarga pada periode ${bulanAktif !== 'all' ? formatBulanTahun(bulanAktif) : ''}.`}
                    </div>
                    <div style={{ fontSize: 12.5, marginBottom: 12 }}>
                      {cari
                        ? `Kata kunci "${cari}" tidak ditemukan.`
                        : 'Pilih periode bulan lain di atas atau tambahkan catatan baru.'}
                    </div>
                    {cari ? (
                      <button type="button" className="btn sm" onClick={() => setCari('')}>
                        Hapus Filter Pencarian
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={onBukaCatat}
                      >
                        <IconPlus />
                        <span>Catat Pengeluaran Baru</span>
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
            {itemsTersaring.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--bg-subtle)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                  <td colSpan={3} style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: 'var(--fg-muted)' }}>
                    Total Pengeluaran {bulanAktif !== 'all' ? formatBulanTahun(bulanAktif) : 'Tercatat'}:
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 15, color: 'var(--accent, #2563eb)' }}>
                    {rp(totalPeriode)}
                  </td>
                  <td colSpan={2} style={{ padding: '14px 16px' }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* BOTTOM INFO BAR */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-subtle)',
            fontSize: 12,
            color: 'var(--fg-muted)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            Menampilkan <b>{itemsTersaring.length}</b> transaksi pada periode{' '}
            <b>{bulanAktif !== 'all' ? formatBulanTahun(bulanAktif) : 'Semua Periode'}</b>
          </div>
          <div>
            Sinkronisasi: <b>Google Sheets (Tab Keluarga)</b>
          </div>
        </div>
      </div>

      {/* FORMAL SIGNATURES AREA FOR PRINTED REPORT (A4) */}
      <div className="print-signature-area" style={{ marginTop: 24 }}>
        <div className="print-signature-box">
          <div className="print-sig-role">Disiapkan Oleh:</div>
          <div className="print-sig-name">Personal Assistant (PA) Direksi</div>
          <div className="print-sig-title">Tgl: {tglIndo(new Date().toISOString().slice(0, 10))}</div>
        </div>
        <div className="print-signature-box">
          <div className="print-sig-role">Diperiksa Oleh:</div>
          <div className="print-sig-name">Finance / Accounting</div>
          <div className="print-sig-title">Tgl: ...................................</div>
        </div>
        <div className="print-signature-box">
          <div className="print-sig-role">Disetujui Oleh:</div>
          <div className="print-sig-name">Direktur / Direksi</div>
          <div className="print-sig-title">Tgl: ...................................</div>
        </div>
      </div>

      {/* MODAL LIGHTBOX PREVIEW BUKTI */}
      {previewBukti && (
        <div
          className="backdrop"
          onClick={() => setPreviewBukti(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="modal"
            style={{
              background: 'var(--bg)',
              borderRadius: 8,
              maxWidth: 720,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15 }}>{previewBukti.judul}</h3>
              <button className="btn ghost sm" onClick={() => setPreviewBukti(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 16, textAlign: 'center', maxHeight: '75vh', overflow: 'auto' }}>
              <img
                src={previewBukti.url}
                alt={previewBukti.judul}
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 4 }}
              />
            </div>
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <a href={previewBukti.url} target="_blank" rel="noreferrer" className="btn sm">
                Buka Resolusi Penuh
              </a>
              <button className="btn sm primary" onClick={() => setPreviewBukti(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
