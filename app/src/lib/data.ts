/* ============================================================
   ORBIT — Model data & data demonstrasi (Bahasa Indonesia)
   Semua tanggal relatif terhadap "hari ini" yang dikunci agar
   demo konsisten: Sabtu, 22 November 2026.
   ============================================================ */

export const TODAY = new Date(2026, 10, 22) // 22 Nov 2026

/* ---------- Knowledge Graph ---------- */

export type NodeType =
  | 'orang'
  | 'dokumen'
  | 'aktivitas'
  | 'tempat'
  | 'uang'
  | 'pengingat'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  /** bobot visual 1..3 */
  size?: number
}

export interface GraphLink {
  source: string
  target: string
  label?: string
}

export const NODE_TYPE_META: Record<
  NodeType,
  { label: string; color: string; glow: string }
> = {
  orang: { label: 'Orang', color: 'hsl(258 88% 67%)', glow: 'hsl(258 88% 67% / .45)' },
  dokumen: { label: 'Dokumen', color: 'hsl(188 88% 56%)', glow: 'hsl(188 88% 56% / .45)' },
  aktivitas: { label: 'Aktivitas', color: 'hsl(304 76% 64%)', glow: 'hsl(304 76% 64% / .45)' },
  tempat: { label: 'Tempat', color: 'hsl(38 94% 58%)', glow: 'hsl(38 94% 58% / .45)' },
  uang: { label: 'Uang', color: 'hsl(152 62% 48%)', glow: 'hsl(152 62% 48% / .45)' },
  pengingat: { label: 'Pengingat', color: 'hsl(16 92% 62%)', glow: 'hsl(16 92% 62% / .45)' },
}

export const GRAPH_NODES: GraphNode[] = [
  // Orang
  { id: 'ibu', label: 'Ibu', type: 'orang', size: 2 },
  { id: 'papa', label: 'Papa', type: 'orang', size: 1.6 },
  { id: 'rina', label: 'Rina', type: 'orang', size: 1.6 },
  { id: 'bayu', label: 'Bayu', type: 'orang', size: 1.4 },
  { id: 'wati', label: 'Bu Wati', type: 'orang', size: 2.4 },
  { id: 'deni', label: 'Pak Deni (tukang angkut)', type: 'orang', size: 1.2 },
  // Dokumen
  { id: 'kontrak', label: 'Kontrak Sewa Rumah', type: 'dokumen', size: 2.6 },
  { id: 'kuitansi-deposit', label: 'Kuitansi Deposit', type: 'dokumen', size: 1.8 },
  { id: 'kuitansi-laptop', label: 'Kuitansi Laptop', type: 'dokumen', size: 1.8 },
  { id: 'garansi', label: 'Kartu Garansi Laptop', type: 'dokumen', size: 1.4 },
  { id: 'sim', label: 'SIM C', type: 'dokumen', size: 1.6 },
  { id: 'invoice-net', label: 'Invoice Internet Nov', type: 'dokumen', size: 1.2 },
  { id: 'buku', label: 'Buku "Atomic Habits"', type: 'dokumen', size: 1.2 },
  { id: 'proposal', label: 'Proposal Studio Kata', type: 'dokumen', size: 1.4 },
  // Aktivitas / urusan
  { id: 'pindah', label: 'Pindah Rumah', type: 'aktivitas', size: 3 },
  { id: 'beli-laptop', label: 'Beli Laptop', type: 'aktivitas', size: 2 },
  { id: 'mcu', label: 'Medical Check-up Papa', type: 'aktivitas', size: 1.6 },
  { id: 'pinjam', label: 'Pinjam Buku', type: 'aktivitas', size: 1.2 },
  { id: 'freelance', label: 'Proyek Desain Freelance', type: 'aktivitas', size: 1.6 },
  // Tempat
  { id: 'rumah-baru', label: 'Rumah Baru — Pondok Bambu', type: 'tempat', size: 2 },
  { id: 'toko-maju', label: 'Toko Maju Komputer', type: 'tempat', size: 1.4 },
  { id: 'mayapada', label: 'RS Mayapada', type: 'tempat', size: 1.2 },
  { id: 'kafe', label: 'Kafe Arunika', type: 'tempat', size: 1.2 },
  { id: 'samsat', label: 'Samsat Jakarta Timur', type: 'tempat', size: 1.2 },
  // Uang
  { id: 'deposit', label: 'Deposit Rp 15.000.000', type: 'uang', size: 2.2 },
  { id: 'internet', label: 'Tagihan Internet Rp 389.000', type: 'uang', size: 1.4 },
  { id: 'ipl', label: 'IPL Apartemen Rp 470.000', type: 'uang', size: 1.4 },
  { id: 'gaji-laptop', label: 'Pembayaran Laptop Rp 12.499.000', type: 'uang', size: 1.6 },
  // Pengingat
  { id: 'rem-deposit', label: 'Bayar deposit — 28 Nov', type: 'pengingat', size: 2.2 },
  { id: 'rem-kunci', label: 'Serah terima kunci — 30 Nov', type: 'pengingat', size: 1.8 },
  { id: 'rem-sim', label: 'Perpanjang SIM — kadaluarsa 5 Des', type: 'pengingat', size: 2 },
  { id: 'rem-rina', label: 'Ketemu Rina — 26 Nov 10.00', type: 'pengingat', size: 1.6 },
  { id: 'rem-mcu', label: 'MCU Papa — 3 Des 08.00', type: 'pengingat', size: 1.6 },
  { id: 'rem-buku', label: 'Kembalikan buku — 29 Nov', type: 'pengingat', size: 1.4 },
  { id: 'rem-proposal', label: 'Deadline proposal — 2 Des', type: 'pengingat', size: 1.6 },
  { id: 'rem-ipl', label: 'IPL terakhir — 30 Nov', type: 'pengingat', size: 1.2 },
]

export const GRAPH_LINKS: GraphLink[] = [
  // Urusan Pindah Rumah
  { source: 'wati', target: 'kontrak', label: 'pemilik' },
  { source: 'wati', target: 'rumah-baru', label: 'pemilik rumah' },
  { source: 'kontrak', target: 'pindah', label: 'dokumen inti' },
  { source: 'pindah', target: 'rumah-baru', label: 'lokasi tujuan' },
  { source: 'kuitansi-deposit', target: 'deposit', label: 'bukti bayar' },
  { source: 'kuitansi-deposit', target: 'pindah' },
  { source: 'deposit', target: 'rem-deposit', label: 'jatuh tempo' },
  { source: 'pindah', target: 'rem-deposit' },
  { source: 'pindah', target: 'rem-kunci' },
  { source: 'rem-kunci', target: 'rumah-baru' },
  { source: 'pindah', target: 'deni', label: 'tukang angkut' },
  { source: 'ipl', target: 'rem-ipl', label: 'terakhir' },
  { source: 'ipl', target: 'pindah', label: 'berhenti setelah pindah' },
  // Urusan Laptop
  { source: 'kuitansi-laptop', target: 'toko-maju', label: 'tempat beli' },
  { source: 'kuitansi-laptop', target: 'gaji-laptop', label: 'bukti' },
  { source: 'garansi', target: 'kuitansi-laptop', label: 'terlampir' },
  { source: 'beli-laptop', target: 'kuitansi-laptop' },
  { source: 'beli-laptop', target: 'garansi', label: 's.d. 12 Nov 2027' },
  // SIM
  { source: 'sim', target: 'samsat', label: 'tempat perpanjang' },
  { source: 'sim', target: 'rem-sim', label: 'kadaluarsa' },
  // Sosial
  { source: 'rina', target: 'kafe', label: 'lokasi janji' },
  { source: 'rina', target: 'rem-rina' },
  { source: 'bayu', target: 'buku', label: 'pemilik' },
  { source: 'buku', target: 'pinjam' },
  { source: 'pinjam', target: 'rem-buku', label: 'tenggat' },
  // Keluarga
  { source: 'ibu', target: 'mcu', label: 'pengingat via voice note' },
  { source: 'papa', target: 'mcu' },
  { source: 'mcu', target: 'mayapada', label: 'lokasi' },
  { source: 'mcu', target: 'rem-mcu' },
  // Pekerjaan
  { source: 'proposal', target: 'freelance', label: 'deliverable' },
  { source: 'freelance', target: 'rem-proposal', label: 'deadline' },
  // Internet
  { source: 'invoice-net', target: 'internet', label: 'terbit' },
]

/* ---------- Universal Inbox ---------- */

export type CaptureType = 'screenshot' | 'foto' | 'pdf' | 'suara' | 'tautan' | 'teks'

export interface InboxItem {
  id: string
  type: CaptureType
  title: string
  source: string
  /** ISO tanggal */
  time: string
  excerpt: string
  aiTags: string[]
  urusan?: string
  status: 'baru' | 'diproses' | 'terhubung'
}

export const INBOX_ITEMS: InboxItem[] = [
  {
    id: 'in-1',
    type: 'pdf',
    title: 'Kontrak Sewa Rumah — 12 halaman',
    source: 'Diunggah dari Files',
    time: '2026-11-22T09:12:00',
    excerpt:
      'Perjanjian sewa rumah Pondok Bambu. Periode 1 Des 2026 – 30 Nov 2027. Deposit Rp 15.000.000, sewa Rp 2.800.000/bulan.',
    aiTags: ['Pindah Rumah', 'Bu Wati', 'Kontrak'],
    urusan: 'Pindah Rumah',
    status: 'terhubung',
  },
  {
    id: 'in-2',
    type: 'screenshot',
    title: 'WA Bu Wati: kunci diserahkan 30 Nov',
    source: 'Screenshot WhatsApp',
    time: '2026-11-19T18:40:00',
    excerpt:
      '"Deposit ditransfer maksimal 28 Nov ya. Kunci bisa diambil 30 Nov jam 9 pagi." — Bu Wati, 0812-8765-4321',
    aiTags: ['Pindah Rumah', 'Tenggat', 'Pembayaran'],
    urusan: 'Pindah Rumah',
    status: 'terhubung',
  },
  {
    id: 'in-3',
    type: 'foto',
    title: 'Kuitansi transfer deposit Rp 15.000.000',
    source: 'Kamera / Galeri',
    time: '2026-11-20T11:05:00',
    excerpt: 'Transfer BCA ke a.n. Wati Santoso, berita: "Deposit sewa Pondok Bambu".',
    aiTags: ['Pindah Rumah', 'Bukti Bayar'],
    urusan: 'Pindah Rumah',
    status: 'terhubung',
  },
  {
    id: 'in-4',
    type: 'suara',
    title: 'Voice note Ibu — 0:42',
    source: 'WhatsApp voice note',
    time: '2026-11-21T20:31:00',
    excerpt:
      'Transkrip: "Papa medical check-up di Mayapada tanggal 3 Desember jam 8 pagi. Jangan lupa ditemani ya."',
    aiTags: ['Keluarga', 'Kesehatan'],
    urusan: 'Medical Check-up Papa',
    status: 'terhubung',
  },
  {
    id: 'in-5',
    type: 'foto',
    title: 'Kuitansi laptop — Toko Maju Komputer',
    source: 'Kamera / Galeri',
    time: '2026-11-17T15:22:00',
    excerpt: 'Laptop ASUS Vivobook 16, Rp 12.499.000, garansi resmi 1 tahun (s.d. 12 Nov 2027).',
    aiTags: ['Beli Laptop', 'Garansi'],
    urusan: 'Beli Laptop',
    status: 'terhubung',
  },
  {
    id: 'in-6',
    type: 'screenshot',
    title: 'WA Rina: janjian Kamis jam 10',
    source: 'Screenshot WhatsApp',
    time: '2026-11-15T14:02:00',
    excerpt: '"Kamis kita ketemu di Arunika jam 10 ya, bahas rencana reunion angkatan."',
    aiTags: ['Janji', 'Rina'],
    status: 'terhubung',
  },
  {
    id: 'in-7',
    type: 'tautan',
    title: 'Artikel: checklist pindahan rumah',
    source: 'Tautan dari browser',
    time: '2026-11-16T21:47:00',
    excerpt: '12 langkah persiapan pindahan: dari bagasi "hari pertama" sampai update alamat kurir.',
    aiTags: ['Pindah Rumah', 'Referensi'],
    urusan: 'Pindah Rumah',
    status: 'diproses',
  },
  {
    id: 'in-8',
    type: 'teks',
    title: 'Catatan: kontak Pak Deni',
    source: 'Catatan manual',
    time: '2026-11-15T09:30:00',
    excerpt: 'Tukang angkut rekomendasi tetangga: Pak Deni 0813-2211-9905, tarif Rp 400.000/hari.',
    aiTags: ['Pindah Rumah', 'Kontak'],
    urusan: 'Pindah Rumah',
    status: 'baru',
  },
  {
    id: 'in-9',
    type: 'pdf',
    title: 'Invoice internet FirstMedia — Nov',
    source: 'Lampiran email',
    time: '2026-11-12T07:00:00',
    excerpt: 'Tagihan bulan November: Rp 389.000, jatuh tempo 25 November 2026.',
    aiTags: ['Tagihan', 'Langganan'],
    status: 'diproses',
  },
]

/* ---------- Commitment Tracker ---------- */

export type CommitmentKind =
  | 'janji'
  | 'tagihan'
  | 'deadline'
  | 'pembayaran'
  | 'pengembalian'
  | 'masa-berlaku'

export interface Commitment {
  id: string
  kind: CommitmentKind
  title: string
  party?: string
  due: string
  time?: string
  status: 'menunggu' | 'terlambat' | 'selesai'
  source: string
  auto: boolean
  note?: string
}

export const COMMITMENT_KIND_META: Record<CommitmentKind, { label: string }> = {
  janji: { label: 'Janji bertemu' },
  tagihan: { label: 'Tagihan' },
  deadline: { label: 'Deadline' },
  pembayaran: { label: 'Pembayaran' },
  pengembalian: { label: 'Pengembalian' },
  'masa-berlaku': { label: 'Masa berlaku' },
}

export const COMMITMENTS: Commitment[] = [
  {
    id: 'cm-1',
    kind: 'tagihan',
    title: 'Internet FirstMedia — Rp 389.000',
    party: 'FirstMedia',
    due: '2026-11-25',
    status: 'menunggu',
    source: 'Invoice dari email (12 Nov)',
    auto: true,
  },
  {
    id: 'cm-2',
    kind: 'janji',
    title: 'Ketemu Rina — bahas reunion angkatan',
    party: 'Rina',
    due: '2026-11-26',
    time: '10:00',
    status: 'menunggu',
    source: 'Screenshot WA (15 Nov)',
    auto: true,
    note: 'Lokasi: Kafe Arunika',
  },
  {
    id: 'cm-3',
    kind: 'pembayaran',
    title: 'Deposit rumah baru — Rp 15.000.000',
    party: 'Bu Wati',
    due: '2026-11-28',
    status: 'menunggu',
    source: 'Chat WA + kuitansi (19–20 Nov)',
    auto: true,
    note: 'Sebelum serah terima kunci 30 Nov',
  },
  {
    id: 'cm-4',
    kind: 'pengembalian',
    title: 'Kembalikan buku "Atomic Habits"',
    party: 'Bayu',
    due: '2026-11-29',
    status: 'menunggu',
    source: 'Catatan pinjam (28 Okt)',
    auto: true,
  },
  {
    id: 'cm-5',
    kind: 'tagihan',
    title: 'IPL apartemen lama — Rp 470.000',
    party: 'Management Apartemen',
    due: '2026-11-30',
    status: 'menunggu',
    source: 'Tagihan email (1 Nov)',
    auto: true,
    note: 'Tagihan ini berhenti setelah pindah — tidak perlu dijadwalkan Desember',
  },
  {
    id: 'cm-6',
    kind: 'deadline',
    title: 'Proposal proyek desain — Studio Kata',
    party: 'Studio Kata',
    due: '2026-12-02',
    status: 'menunggu',
    source: 'Email brief (10 Nov)',
    auto: true,
  },
  {
    id: 'cm-7',
    kind: 'masa-berlaku',
    title: 'SIM C — perpanjang sebelum kadaluarsa',
    party: 'Samsat Jakarta Timur',
    due: '2026-12-05',
    status: 'menunggu',
    source: 'Foto SIM (10 Nov)',
    auto: true,
    note: 'ORBIT menyarankan mulai proses 24 Nov (ganti baris + cek berkas)',
  },
  {
    id: 'cm-8',
    kind: 'janji',
    title: 'Medical check-up Papa',
    party: 'RS Mayapada',
    due: '2026-12-03',
    time: '08:00',
    status: 'menunggu',
    source: 'Voice note Ibu (21 Nov)',
    auto: true,
    note: 'Ditemani — paling tepat setelah pindahan selesai',
  },
]

/* ---------- Action Center ---------- */

export type ActionKind = 'pengingat' | 'agenda' | 'kontak' | 'dokumen' | 'pembayaran'

export interface ProposedAction {
  id: string
  kind: ActionKind
  title: string
  detail: string
  source: string
  confidence: number
  urgency: 'tinggi' | 'sedang' | 'rendah'
}

export const PROPOSED_ACTIONS: ProposedAction[] = [
  {
    id: 'ac-1',
    kind: 'pengingat',
    title: 'Buat pengingat "Bayar deposit Rp 15.000.000"',
    detail: 'Pengingat aktif 28 Nov 2026, pukul 09.00 — H-2 sebelum serah terima kunci.',
    source: 'WA Bu Wati (19 Nov) + kuitansi deposit',
    confidence: 96,
    urgency: 'tinggi',
  },
  {
    id: 'ac-2',
    kind: 'agenda',
    title: 'Tambah agenda "Ketemu Rina di Kafe Arunika"',
    detail: 'Kamis 26 Nov 2026, 10.00 WIB. Lokasi dari isi chat.',
    source: 'Screenshot WA Rina (15 Nov)',
    confidence: 94,
    urgency: 'sedang',
  },
  {
    id: 'ac-3',
    kind: 'pembayaran',
    title: 'Catat tagihan internet Rp 389.000 ke Money',
    detail: 'Jatuh tempo 25 Nov. Ditandai berulang bulanan sampai diubah.',
    source: 'Invoice PDF dari email (12 Nov)',
    confidence: 97,
    urgency: 'tinggi',
  },
  {
    id: 'ac-4',
    kind: 'pengingat',
    title: 'Rencanakan perpanjangan SIM C',
    detail: 'Mulai 24 Nov: cek berkas + ganti baris. Kadaluarsa 5 Des 2026.',
    source: 'Foto SIM (10 Nov)',
    confidence: 89,
    urgency: 'sedang',
  },
  {
    id: 'ac-5',
    kind: 'kontak',
    title: 'Simpan kontak "Bu Wati — pemilik rumah baru"',
    detail: '0812-8765-4321, dihubungkan ke urusan Pindah Rumah.',
    source: 'Screenshot WA (19 Nov)',
    confidence: 91,
    urgency: 'rendah',
  },
  {
    id: 'ac-6',
    kind: 'dokumen',
    title: 'Perbarui alamat pengiriman ke Pondok Bambu',
    detail: 'Untuk 3 toko online yang sering dipakai. Berlaku setelah kunci diambil 30 Nov.',
    source: 'Kontrak Sewa (22 Nov)',
    confidence: 78,
    urgency: 'rendah',
  },
]

/* ---------- Life Event Engine ---------- */

export interface LifeEventPlan {
  id: string
  name: string
  trigger: string
  dueDate: string
  progress: number
  steps: { label: string; done: boolean; hint?: string }[]
}

export const LIFE_EVENT: LifeEventPlan = {
  id: 'le-1',
  name: 'Pindah Rumah',
  trigger: '"Saya mau pindah rumah bulan depan."',
  dueDate: '2026-12-01',
  progress: 3 / 8,
  steps: [
    { label: 'Kumpulkan dokumen (KTP, NPWP, slip gaji)', done: true },
    { label: 'Tandatangani kontrak sewa', done: true },
    { label: 'Transfer deposit Rp 15.000.000', done: true },
    { label: 'Bayar sewa bulan pertama', done: false, hint: 'sebelum 30 Nov' },
    { label: 'Sewa tukang angkut (Pak Deni)', done: false, hint: '30 Nov' },
    { label: 'Ubah alamat kurir, tagihan & layanan', done: false, hint: 'minggu ini' },
    { label: 'Daftar ISP baru + pindah langganan', done: false },
    { label: 'Serah terima kunci & bersih-bersih', done: false, hint: '30 Nov 09.00' },
  ],
}

/* ---------- Life Timeline ---------- */

export interface TimelineEvent {
  id: string
  date: string
  title: string
  category: 'kepindahan' | 'keuangan' | 'sosial' | 'kesehatan' | 'pekerjaan' | 'dokumen'
  description: string
  refs?: string[]
  done?: boolean
}

export const TIMELINE: TimelineEvent[] = [
  {
    id: 'tl-1',
    date: '2026-11-22',
    title: 'Kontrak sewa rumah ditandatangani',
    category: 'kepindahan',
    description: 'PDF 12 halaman diunggah. ORBIT menautkannya ke urusan "Pindah Rumah".',
    refs: ['Kontrak Sewa Rumah', 'Bu Wati'],
  },
  {
    id: 'tl-2',
    date: '2026-11-21',
    title: 'Voice note Ibu tentang MCU Papa',
    category: 'kesehatan',
    description: 'ORBIT mengekstrak: 3 Des, 08.00, RS Mayapada — ditambahkan sebagai komitmen.',
    refs: ['Medical Check-up Papa', 'Ibu'],
  },
  {
    id: 'tl-3',
    date: '2026-11-20',
    title: 'Deposit Rp 15.000.000 ditransfer',
    category: 'keuangan',
    description: 'Kuitansi transfer difoto — terhubung ke kontrak & pengingat 28 Nov.',
    refs: ['Kuitansi Deposit'],
  },
  {
    id: 'tl-4',
    date: '2026-11-19',
    title: 'Bu Wati menetapkan tanggal kunci',
    category: 'kepindahan',
    description: 'Deposit maksimal 28 Nov, kunci 30 Nov jam 09.00.',
    refs: ['Bu Wati'],
  },
  {
    id: 'tl-5',
    date: '2026-11-17',
    title: 'Beli laptop di Toko Maju Komputer',
    category: 'keuangan',
    description: 'Rp 12.499.000. Garansi 1 tahun — diingatkan ORBIT saat mendekati habis.',
    refs: ['Kuitansi Laptop', 'Kartu Garansi Laptop'],
  },
  {
    id: 'tl-6',
    date: '2026-11-15',
    title: 'Dua janji baru dari chat',
    category: 'sosial',
    description: 'Rina (26 Nov) dan kontak Pak Deni dicatat dari catatan manual.',
    refs: ['Rina', 'Pak Deni (tukang angkut)'],
  },
  {
    id: 'tl-7',
    date: '2026-11-12',
    title: 'Tagihan internet November terbit',
    category: 'keuangan',
    description: 'Rp 389.000, tempo 25 Nov — ditambahkan otomatis ke Money.',
    refs: ['Invoice Internet Nov'],
  },
  {
    id: 'tl-8',
    date: '2026-11-10',
    title: 'SIM C difoto — masa berlaku dicek',
    category: 'dokumen',
    description: 'ORBIT mendeteksi kadaluarsa 5 Des 2026 dan menyiapkan rencana perpanjangan.',
    refs: ['SIM C'],
  },
  {
    id: 'tl-9',
    date: '2026-10-28',
    title: 'Pinjam buku dari Bayu',
    category: 'sosial',
    description: '"Atomic Habits" — dijanjikan kembali minggu depan (tercatat sebagai komitmen).',
    refs: ['Bayu', 'Buku "Atomic Habits"'],
  },
  {
    id: 'tl-10',
    date: '2026-10-22',
    title: 'Selesai: pendaftaran anggota koperasi',
    category: 'dokumen',
    description: 'PDF pendaftaran diarsipkan. Urusan ditutup setelah kartu anggota terbit.',
    refs: [],
    done: true,
  },
]

/* ---------- Money ---------- */

export const SPENDING_6M = [
  { bulan: 'Jun', nilai: 7.9 },
  { bulan: 'Jul', nilai: 8.6 },
  { bulan: 'Agu', nilai: 8.1 },
  { bulan: 'Sep', nilai: 8.95 },
  { bulan: 'Okt', nilai: 8.42 },
]

export const OKT_BREAKDOWN = [
  { label: 'Sewa apartemen', nilai: 2800000 },
  { label: 'Makan & belanja', nilai: 1905000 },
  { label: 'Transportasi', nilai: 850000 },
  { label: 'Kesehatan', nilai: 600000 },
  { label: 'Langganan', nilai: 320000 },
  { label: 'Lainnya', nilai: 1945000 },
]

export const BILLS_DUE = [
  { label: 'Internet FirstMedia', nilai: 389000, due: '2026-11-25' },
  { label: 'IPL apartemen (terakhir)', nilai: 470000, due: '2026-11-30' },
  { label: 'Deposit rumah baru', nilai: 15000000, due: '2026-11-28' },
]

export const SAVINGS_FOUND = 149000 // langganan jarang dipakai

/* ---------- Personal Memory ---------- */

export interface MemoryAnswer {
  q: string
  a: string
  bullets?: string[]
  source: string
  refs?: string[]
}

export const MEMORY_ANSWERS: MemoryAnswer[] = [
  {
    q: 'Berapa pengeluaran saya bulan lalu?',
    a: 'Total pengeluaran Oktober 2026: Rp 8.420.000 — turun 6% dari September (Rp 8.950.000).',
    bullets: [
      'Sewa apartemen — Rp 2.800.000',
      'Makan & belanja — Rp 1.905.000',
      'Transportasi — Rp 850.000',
      'Kesehatan — Rp 600.000',
      'Langganan — Rp 320.000',
    ],
    source: '14 kuitansi + 3 tagihan tercatat pada 1–31 Okt',
    refs: ['Kuitansi Laptop', 'Invoice Internet Nov'],
  },
  {
    q: 'Cari dokumen tentang pembelian laptop',
    a: 'Ada 2 dokumen terhubung dalam urusan "Beli Laptop":',
    bullets: [
      'Kuitansi Laptop — 17 Nov 2026, Rp 12.499.000, Toko Maju Komputer',
      'Kartu Garansi — berlaku s.d. 12 Nov 2027 (akan diingatkan H-30)',
    ],
    source: 'Foto kuitansi (17 Nov) + kartu garansi',
    refs: ['Kuitansi Laptop', 'Kartu Garansi Laptop', 'Beli Laptop'],
  },
  {
    q: 'Apa pekerjaan yang belum saya selesaikan?',
    a: '5 tugas belum selesai, 3 di antaranya menempel pada urusan "Pindah Rumah":',
    bullets: [
      'Proposal Studio Kata — deadline 2 Des',
      'Sewa tukang angkut (Pak Deni) — target 30 Nov',
      'Ubah alamat kurir & tagihan — minggu ini',
      'Daftar ISP baru di rumah Pondok Bambu',
      'Kembalikan buku ke Bayu — 29 Nov',
    ],
    source: 'Action Center + urusan Pindah Rumah',
    refs: ['Pindah Rumah', 'Proposal Studio Kata'],
  },
  {
    q: 'Kapan terakhir saya perpanjang SIM?',
    a: 'SIM C terakhir diperpanjang 5 Des 2021 (berlaku 5 tahun) → kadaluarsa 5 Des 2026.',
    bullets: [
      'ORBIT menyarankan mulai proses 24 Nov: cek berkas + ganti baris Samsat Jakarta Timur',
      'Berkas yang perlu disiapkan: KTP, SIM lama, bukti pas 5 tahun terakhir',
    ],
    source: 'Foto SIM (10 Nov) + arsip perpanjangan 2021',
    refs: ['SIM C', 'Samsat Jakarta Timur'],
  },
  {
    q: 'Urusan apa yang paling dekat tenggatnya?',
    a: 'Deposit rumah baru Rp 15.000.000 — jatuh tempo 28 Nov (6 hari lagi).',
    bullets: [
      'Sudah dibayar 20 Nov — cukup dijadwalkan sebagai pengingat konfirmasi',
      'Disusul: ketemu Rina 26 Nov, IPL terakhir 30 Nov',
    ],
    source: 'Commitment Tracker',
    refs: ['Deposit Rp 15.000.000', 'Pindah Rumah'],
  },
]

export const USER_NAME = 'Andi'
