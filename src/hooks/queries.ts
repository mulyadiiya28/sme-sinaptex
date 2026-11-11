import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { tanggalLokal } from "@/lib/format";
import type {
  ApprovalRule,
  AsetTetapInput,
  CheckoutPayload,
  CreateApprovalRuleRequest,
  CreateSupplierRequest,
  Gudang,
  ImporPelangganBaris,
  ImporProdukBaris,
  ImporSaldoAwalBaris,
  MutasiAset,
  NeracaParams,
  PembelianInput,
  PenyesuaianStokInput,
  PersetujuanBatch,
  Product,
  ProfilPerusahaan,
  ReturInput,
  ReturPembelianInput,
  ShiftBukaInput,
  ShiftMutasiInput,
  StockAdjustmentInput,
  StockOpnameInput,
  StockTransferInput,
  Supplier,
  TransferKasInput,
  User,
} from "@/lib/api/types";

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: api.master.products });
}

export function usePelanggan() {
  return useQuery({ queryKey: ["pelanggan"], queryFn: api.master.pelanggan });
}

export function useActiveShift() {
  return useQuery({ queryKey: ["shift"], queryFn: api.shift.aktif });
}

export function useShiftRiwayat() {
  return useQuery({ queryKey: ["shift-riwayat"], queryFn: api.shift.riwayat });
}

export function useRiwayatTransaksi() {
  return useQuery({ queryKey: ["transaksi"], queryFn: api.transaksi.riwayat });
}

export function useRiwayatRetur() {
  return useQuery({ queryKey: ["retur"], queryFn: () => api.transaksi.riwayatRetur() });
}

export function usePembelian() {
  return useQuery({ queryKey: ["pembelian"], queryFn: api.pembelian.list });
}

export function useBiaya() {
  return useQuery({ queryKey: ["biaya"], queryFn: () => api.biaya.list() });
}

export function useCashAccounts() {
  return useQuery({ queryKey: ["cash-accounts"], queryFn: api.transferKas.akun });
}

export function useTransferKas() {
  return useQuery({ queryKey: ["transfer-kas"], queryFn: api.transferKas.list });
}

export function useJurnal() {
  return useQuery({ queryKey: ["jurnal"], queryFn: () => api.akuntansi.jurnal() });
}

export function useAkun(params: NeracaParams = {}) {
  return useQuery({
    queryKey: ["akun", params.from ?? "", params.to ?? ""],
    queryFn: () => api.akuntansi.akun(params),
  });
}

export function useProfilPerusahaan() {
  return useQuery({ queryKey: ["profil-perusahaan"], queryFn: api.pengaturan.profil });
}

export function useRingkasanKesehatan() {
  const hari = tanggalLokal();
  return useQuery({
    queryKey: ["kesehatan-usaha", hari],
    queryFn: () => api.analytics.healthSummary(hari),
  });
}

export function usePengaturanMutations() {
  const qc = useQueryClient();
  const simpanProfil = useMutation({
    mutationFn: (input: ProfilPerusahaan) => api.pengaturan.simpanProfil(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profil-perusahaan"] });
    },
  });

  const unggahLogo = useMutation({
    mutationFn: (file: File) => api.pengaturan.unggahLogo(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profil-perusahaan"] });
    },
  });

  return { simpanProfil, unggahLogo };
}

export function useLabaRugi() {
  return useQuery({ queryKey: ["laba-rugi"], queryFn: api.akuntansi.labaRugi });
}

export function useDailyMovement(date: string, accountCode: string) {
  return useQuery({
    queryKey: ["laporan", "daily-movement", date, accountCode],
    queryFn: () => api.akuntansi.dailyMovement(date, accountCode),
    enabled: !!date && !!accountCode,
  });
}

export function useArAging(asOfDate?: string) {
  return useQuery({
    queryKey: ["aging", "ar", asOfDate],
    queryFn: () => api.aging.ar(asOfDate),
    enabled: true,
  });
}

export function useApAging(asOfDate?: string) {
  return useQuery({
    queryKey: ["aging", "ap", asOfDate],
    queryFn: () => api.aging.ap(asOfDate),
    enabled: true,
  });
}

export function useReconciliation(side: "RECEIVABLE" | "PAYABLE", accountCode: string, asOfDate?: string) {
  return useQuery({
    queryKey: ["aging", "reconciliation", side, accountCode, asOfDate],
    queryFn: () => api.aging.reconciliation(side, accountCode, asOfDate),
    enabled: !!side && !!accountCode,
  });
}

export function useFiscalPeriodList() {
  return useQuery({
    queryKey: ["akuntansi", "fiscal-periods"],
    queryFn: () => api.akuntansi.fiscalPeriods.list(),
  });
}

export function useProfitability(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "profitability", startDate, endDate],
    queryFn: () => api.analytics.profitability(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useInventoryTurnover(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "inventory-turnover", startDate, endDate],
    queryFn: () => api.analytics.inventoryTurnover(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useArTurnover(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "ar-turnover", startDate, endDate],
    queryFn: () => api.analytics.arTurnover(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useApTurnover(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "ap-turnover", startDate, endDate],
    queryFn: () => api.analytics.apTurnover(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useWorkingCapital(date: string) {
  return useQuery({
    queryKey: ["analytics", "working-capital", date],
    queryFn: () => api.analytics.workingCapital(date),
    enabled: !!date,
  });
}

export function useWorkingCapitalTurnover(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "working-capital-turnover", startDate, endDate],
    queryFn: () => api.analytics.workingCapitalTurnover(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useCurrentRatio(date: string) {
  return useQuery({
    queryKey: ["analytics", "current-ratio", date],
    queryFn: () => api.analytics.currentRatio(date),
    enabled: !!date,
  });
}

export function useCashRatio(date: string) {
  return useQuery({
    queryKey: ["analytics", "cash-ratio", date],
    queryFn: () => api.analytics.cashRatio(date),
    enabled: !!date,
  });
}

export function useSolvency(date: string) {
  return useQuery({
    queryKey: ["analytics", "solvency", date],
    queryFn: () => api.analytics.solvency(date),
    enabled: !!date,
  });
}

export function useCashConversionCycle(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "cash-conversion-cycle", startDate, endDate],
    queryFn: () => api.analytics.cashConversionCycle(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useHealthSummary(date: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["analytics", "health-summary", date, startDate, endDate],
    queryFn: () => api.analytics.healthSummary(date, startDate, endDate),
    enabled: !!date,
  });
}

export function useProductPerformance(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["analytics", "product-performance", startDate, endDate],
    queryFn: () => api.analytics.productPerformance(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useProductPerformanceRankings(startDate: string, endDate: string, top = 10) {
  return useQuery({
    queryKey: ["analytics", "product-performance-rankings", startDate, endDate, top],
    queryFn: () => api.analytics.productPerformanceRankings(startDate, endDate, top),
    enabled: !!startDate && !!endDate,
  });
}

export function useSupplierList() {
  return useQuery({
    queryKey: ["master", "suppliers"],
    queryFn: () => api.supplier.list(),
  });
}

export function useSupplierCreate() {
  const qc = useQueryClient();
  return useMutation<Supplier, Error, CreateSupplierRequest>({
    mutationFn: (input: CreateSupplierRequest) => api.supplier.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master", "suppliers"] });
    },
  });
}

export function useSupplierDeactivate() {
  const qc = useQueryClient();
  return useMutation<Supplier, Error, string>({
    mutationFn: (id: string) => api.supplier.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master", "suppliers"] });
    },
  });
}

export function useApprovalRuleList() {
  return useQuery({
    queryKey: ["master", "approval-rules"],
    queryFn: () => api.approvalRules.list(),
  });
}

export function useApprovalRuleCreate() {
  const qc = useQueryClient();
  return useMutation<ApprovalRule, Error, CreateApprovalRuleRequest>({
    mutationFn: (input: CreateApprovalRuleRequest) => api.approvalRules.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master", "approval-rules"] });
    },
  });
}

export function useApprovalRuleDeactivate() {
  const qc = useQueryClient();
  return useMutation<ApprovalRule, Error, string>({
    mutationFn: (id: string) => api.approvalRules.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master", "approval-rules"] });
    },
  });
}

export function useAuthUsers() {
  return useQuery({ queryKey: ["users"], queryFn: api.auth.users });
}

export function useAuditLog() {
  return useQuery({ queryKey: ["audit"], queryFn: api.auth.auditList });
}

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const buat = useMutation({
    mutationFn: (args: { input: { nama: string; username: string; password: string; role: User["role"] }; actor: User }) =>
      api.auth.buatUser(args.input, args.actor),
    onSuccess: invalidate,
  });
  const ubah = useMutation({
    mutationFn: (args: { id: string; input: { password?: string; role?: User["role"] }; actor: User }) =>
      api.auth.ubahUser(args.id, args.input, args.actor),
    onSuccess: invalidate,
  });
  const hapus = useMutation({
    mutationFn: (args: { id: string; actor: User }) =>
      api.auth.hapusUser(args.id, args.actor),
    onSuccess: invalidate,
  });

  return { buat, ubah, hapus };
}

export function usePembelianMutations() {
  const qc = useQueryClient();
  const invalidateSemua = () => {
    qc.invalidateQueries({ queryKey: ["pembelian"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const buat = useMutation({
    mutationFn: (input: PembelianInput) => api.pembelian.buat(input),
    onSuccess: invalidateSemua,
  });

  const retur = useMutation({
    mutationFn: ({ input, user }: { input: ReturPembelianInput; user: User }) =>
      api.pembelian.retur(input, user),
    onSuccess: () => {
      invalidateSemua();
      qc.invalidateQueries({ queryKey: ["stok-gudang"] });
      qc.invalidateQueries({ queryKey: ["ringkasan-inventaris"] });
      qc.invalidateQueries({ queryKey: ["kartu-stok"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  return { buat, retur };
}

export function usePembayaranMutations() {
  const qc = useQueryClient();
  const invalidateSemua = () => {
    qc.invalidateQueries({ queryKey: ["pembelian"] });
    qc.invalidateQueries({ queryKey: ["transaksi"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
  };

  const bayarHutang = useMutation({
    mutationFn: ({ id, nominal, metode }: { id: string; nominal: number; metode: "tunai" | "transfer" }) =>
      api.hutang.bayar(id, nominal, metode),
    onSuccess: invalidateSemua,
  });
  const bayarPiutang = useMutation({
    mutationFn: ({ nomor, nominal, metode }: { nomor: string; nominal: number; metode: "tunai" | "transfer" }) =>
      api.piutang.bayar(nomor, nominal, metode),
    onSuccess: invalidateSemua,
  });

  return { bayarHutang, bayarPiutang };
}

export function useBiayaMutations() {
  const qc = useQueryClient();
  const invalidateSemua = () => {
    qc.invalidateQueries({ queryKey: ["biaya"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
  };

  const catat = useMutation({
    mutationFn: (input: { kategori: string; nominal: number; metode: "tunai" | "transfer"; catatan?: string }) =>
      api.biaya.catat(input),
    onSuccess: invalidateSemua,
  });

  return { catat };
}

export function useTransferKasMutations() {
  const qc = useQueryClient();
  const buat = useMutation({
    mutationFn: ({ input, user }: { input: TransferKasInput; user: User }) =>
      api.transferKas.buat(input, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfer-kas"] });
      qc.invalidateQueries({ queryKey: ["cash-accounts"] });
      qc.invalidateQueries({ queryKey: ["jurnal"] });
      qc.invalidateQueries({ queryKey: ["akun"] });
      qc.invalidateQueries({ queryKey: ["laba-rugi"] });
      qc.invalidateQueries({ queryKey: ["persetujuan"] });
      qc.invalidateQueries({ queryKey: ["shift"] });
    },
  });

  return { buat };
}

export function useShiftMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["shift"] });
    qc.invalidateQueries({ queryKey: ["shift-riwayat"] });
  };

  const buka = useMutation({
    mutationFn: (input: ShiftBukaInput) => api.shift.buka(input),
    onSuccess: invalidate,
  });
  const mutasiKas = useMutation({
    mutationFn: (input: ShiftMutasiInput) => api.shift.mutasiKas(input),
    onSuccess: invalidate,
  });
  const tutup = useMutation({
    mutationFn: (uangFisik: number) => api.shift.tutup(uangFisik),
    onSuccess: invalidate,
  });

  return { buka, mutasiKas, tutup };
}

export function useImporMutations() {
  const qc = useQueryClient();
  const invalidateMaster = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["pelanggan"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };
  const invalidateGl = () => {
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const produk = useMutation({
    mutationFn: ({ rows, user }: { rows: ImporProdukBaris[]; user: User }) =>
      api.master.imporProduk(rows, user),
    onSuccess: invalidateMaster,
  });
  const pelanggan = useMutation({
    mutationFn: ({ rows, user }: { rows: ImporPelangganBaris[]; user: User }) =>
      api.master.imporPelanggan(rows, user),
    onSuccess: invalidateMaster,
  });
  const saldoAwal = useMutation({
    mutationFn: ({ rows, user }: { rows: ImporSaldoAwalBaris[]; user: User }) =>
      api.master.imporSaldoAwal(rows, user),
    onSuccess: invalidateGl,
  });

  return { produk, pelanggan, saldoAwal };
}

export function useProductMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const create = useMutation({
    mutationFn: (p: Omit<Product, "id">) => api.master.createProduct(p),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<Product, "id"> }) =>
      api.master.updateProduct(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.master.deleteProduct(id),
    onSuccess: invalidate,
  });
  const penyesuaianStok = useMutation({
    mutationFn: (args: { input: PenyesuaianStokInput; user: User }) =>
      api.master.penyesuaianStok(args.input, args.user),
    onSuccess: invalidate,
  });

  return { create, update, remove, penyesuaianStok };
}

export function useAsetTetapList() {
  return useQuery({ queryKey: ["aset-tetap"], queryFn: () => api.master.daftarAsetTetap() });
}

export function useAsetTetapMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["aset-tetap"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const create = useMutation({
    mutationFn: (args: { input: AsetTetapInput; user: User }) =>
      api.master.buatAsetTetap(args.input, args.user),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (args: { id: string; input: Partial<AsetTetapInput>; user: User }) =>
      api.master.ubahAsetTetap(args.id, args.input, args.user),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (args: { id: string; user: User }) => api.master.hapusAsetTetap(args.id, args.user),
    onSuccess: invalidate,
  });
  const hitungPenyusutan = useMutation({
    mutationFn: (periode: string) => api.master.hitungPenyusutanBulanan(periode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aset-tetap", "penyusutan"] }),
  });
  const postingPenyusutan = useMutation({
    mutationFn: (args: { periode: string; user: User }) =>
      api.master.postingPenyusutanBulanan(args.periode, args.user),
    onSuccess: invalidate,
  });
  const mutasi = useMutation({
    mutationFn: (args: { input: Omit<MutasiAset, "id" | "createdAt">; user: User }) =>
      api.master.mutasiAset(args.input, args.user),
    onSuccess: invalidate,
  });
  const laporan = useMutation({
    mutationFn: (periode: string) => api.master.laporanAsetTetap(periode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aset-tetap", "laporan"] }),
  });

  return { create, update, remove, hitungPenyusutan, postingPenyusutan, mutasi, laporan };
}

export function useInventarisRingkasan() {
  return useQuery({ queryKey: ["inventaris-ringkasan"], queryFn: () => api.inventaris.ringkasan() });
}

export function useGudangList() {
  return useQuery({ queryKey: ["gudang"], queryFn: () => api.inventaris.gudang() });
}

export function useStokGudang(gudangId?: string, enabled = true) {
  return useQuery({
    queryKey: ["inventaris-stok", gudangId ?? "semua"],
    queryFn: () => api.inventaris.stok(gudangId),
    enabled,
  });
}

export function useMutasiStok(productId: string, gudangId?: string) {
  return useQuery({
    queryKey: ["inventaris-mutasi", productId, gudangId ?? "semua"],
    queryFn: () => api.inventaris.mutasi(productId, gudangId),
    enabled: productId !== "",
  });
}

export function useOpnameList(enabled = true) {
  return useQuery({ queryKey: ["stock-opname"], queryFn: () => api.inventaris.opname(), enabled });
}

export function useStokRendah() {
  return useQuery({ queryKey: ["inventaris-stok-rendah"], queryFn: () => api.inventaris.stokRendah() });
}

export function useInventarisMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["gudang"] });
    qc.invalidateQueries({ queryKey: ["inventaris-stok"] });
    qc.invalidateQueries({ queryKey: ["inventaris-ringkasan"] });
    qc.invalidateQueries({ queryKey: ["inventaris-stok-rendah"] });
    qc.invalidateQueries({ queryKey: ["inventaris-mutasi"] });
    qc.invalidateQueries({ queryKey: ["stock-opname"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const buatGudang = useMutation({
    mutationFn: (args: { input: Omit<Gudang, "id" | "createdAt" | "updatedAt">; user: User }) =>
      api.inventaris.buatGudang(args.input, args.user),
    onSuccess: invalidate,
  });
  const nonaktifkanGudang = useMutation({
    mutationFn: (args: { id: string; user: User }) =>
      api.inventaris.nonaktifkanGudang(args.id, args.user),
    onSuccess: invalidate,
  });
  const penyesuaian = useMutation({
    mutationFn: (args: { input: StockAdjustmentInput; user: User }) =>
      api.inventaris.penyesuaian(args.input, args.user),
    onSuccess: invalidate,
  });
  const transfer = useMutation({
    mutationFn: (args: { input: StockTransferInput; user: User }) =>
      api.inventaris.transfer(args.input, args.user),
    onSuccess: invalidate,
  });
  const buatOpname = useMutation({
    mutationFn: (args: { input: StockOpnameInput; user: User }) =>
      api.inventaris.buatOpname(args.input, args.user),
    onSuccess: invalidate,
  });
  const selesaikanOpname = useMutation({
    mutationFn: (args: { id: string; user: User }) =>
      api.inventaris.selesaikanOpname(args.id, args.user),
    onSuccess: invalidate,
  });
  const batalkanOpname = useMutation({
    mutationFn: (args: { id: string; user: User }) =>
      api.inventaris.batalkanOpname(args.id, args.user),
    onSuccess: invalidate,
  });

  return {
    buatGudang,
    nonaktifkanGudang,
    penyesuaian,
    transfer,
    buatOpname,
    selesaikanOpname,
    batalkanOpname,
  };
}

export function useTransaksiMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transaksi"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["shift"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laba-rugi"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
    qc.invalidateQueries({ queryKey: ["retur"] });
  };

  const batal = useMutation({
    mutationFn: ({ nomor, user }: { nomor: string; user: User }) => api.transaksi.batal(nomor, user),
    onSuccess: invalidate,
  });
  const retur = useMutation({
    mutationFn: ({ input, user }: { input: ReturInput; user: User }) => api.transaksi.retur(input, user),
    onSuccess: invalidate,
  });
  const konfirmasiDigital = useMutation({
    mutationFn: ({ nomor, user }: { nomor: string; user: User }) => api.transaksi.konfirmasiDigital(nomor, user),
    onSuccess: invalidate,
  });

  return { batal, retur, konfirmasiDigital };
}

export function useCheckout(onSuccess: (data: Awaited<ReturnType<typeof api.transaksi.checkout>>) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => api.transaksi.checkout(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["transaksi"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["shift"] });
      onSuccess(data);
    },
  });
}
export function usePersetujuanList() {
  return useQuery({
    queryKey: ["persetujuan"],
    queryFn: () => api.persetujuan.list(),
  });
}

export function usePersetujuanMutations() {
  const qc = useQueryClient();
  const setujui = useMutation<void, Error, PersetujuanBatch>({
    mutationFn: (batch: PersetujuanBatch) => api.persetujuan.setujui(batch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["persetujuan"] });
      qc.invalidateQueries({ queryKey: ["transaksi"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["shift"] });
      qc.invalidateQueries({ queryKey: ["jurnal"] });
      qc.invalidateQueries({ queryKey: ["akun"] });
      qc.invalidateQueries({ queryKey: ["laba-rugi"] });
      qc.invalidateQueries({ queryKey: ["pembelian"] });
    },
  });
  return { setujui };
}
