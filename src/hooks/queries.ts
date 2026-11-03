import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  CheckoutPayload,
  ImporPelangganBaris,
  ImporProdukBaris,
  ImporSaldoAwalBaris,
  PembelianInput,
  PenyesuaianStokInput,
  Product,
  ReturInput,
  ShiftBukaInput,
  ShiftMutasiInput,
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

export function useJurnal() {
  return useQuery({ queryKey: ["jurnal"], queryFn: () => api.akuntansi.jurnal() });
}

export function useAkun() {
  return useQuery({ queryKey: ["akun"], queryFn: api.akuntansi.akun });
}

export function useLabaRugi() {
  return useQuery({ queryKey: ["laba-rugi"], queryFn: api.akuntansi.labaRugi });
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
    mutationFn: (args: { id: string; actor: User }) => api.auth.hapusUser(args.id, args.actor),
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

  return { buat };
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
    onSuccess: invalidate,
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
