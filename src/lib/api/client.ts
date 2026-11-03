import type {
  ArApTurnover,
  AuditEntry,
  Biaya,
  BiayaParams,
  CashConversionCycle,
  CheckoutPayload,
  CheckoutResult,
  CompanyProfile,
  Dupont,
  HasilImpor,
  HealthIndicator,
  HealthSummary,
  ImportResult,
  ImporPelangganBaris,
  ImporProdukBaris,
  ImporSaldoAwalBaris,
  InventoryTurnover,
  JurnalEntry,
  JurnalParams,
  KebijakanOperasional,
  LabaRugi,
  LiquidityRatio,
  LoginResult,
  PaymentMethod,
  Pelanggan,
  Pembelian,
  PembelianInput,
  PenyesuaianStokInput,
  Product,
  ProductPerformance,
  ProductPerformanceRankings,
  ProfilToko,
  ProfitabilityRatio,
  ReturInput,
  ReturPenjualan,
  ReturRiwayatParams,
  ShiftBukaInput,
  ShiftInfo,
  ShiftMutasiInput,
  ShiftRiwayat,
  Solvency,
  TransaksiRiwayat,
  User,
  WorkingCapital,
  WorkingCapitalTurnover,
  AgedInvoice,
  AgingReport,
  CreateFiscalPeriodRequest,
  CreateSupplierRequest,
  DailyMovementReport,
  FiscalPeriod,
  Reconciliation,
  Supplier,
} from "@/lib/api/types";
import { mockDb, produkBaruId } from "@/lib/api/mock/db";
import { useToko } from "@/lib/store/toko";
import {
  BUSINESS_ID,
  fileCsvPelangganDariBaris,
  fileCsvProdukDariBaris,
  fileCsvSaldoAwalDariBaris,
  liveAkun,
  liveAuditLog,
  liveBayarHutang,
  liveBayarPiutang,
  liveBiayaCatat,
  liveBiayaList,
  liveBuatUser,
  liveCheckout,
  liveCompanyProfileGet,
  liveCompanyProfilePut,
  liveCreateProduct,
  liveFiscalPeriodClose,
  liveFiscalPeriodCreate,
  liveFiscalPeriodGetPendingClose,
  liveFiscalPeriodList,
  liveFiscalPeriodLock,
  liveFiscalPeriodReopen,
  liveFiscalPeriodReverseClosing,
  liveKebijakanGet,
  liveKebijakanPut,
  liveSupplierCreate,
  liveSupplierDeactivate,
  liveSupplierList,
  liveDeleteProduct,
  liveHapusUser,
  liveHealthSummary,
  liveImporPelanggan,
  liveImporProduk,
  liveImporSaldoAwal,
  liveDailyMovement,
  liveInventoryTurnover,
  liveJurnal,
  liveKonfirmasiDigital,
  liveLabaRugi,
  liveLogin,
  liveLogout,
  livePelanggan,
  livePenyesuaianStok,
  livePembelianBuat,
  livePembelianList,
  liveProductPerformance,
  liveProductPerformanceRankings,
  liveProducts,
  liveProfitability,
  liveAging,
  liveReconciliation,
  liveRetur,
  liveReturRiwayat,
  liveShiftAktif,
  liveShiftBuka,
  liveShiftMutasi,
  liveShiftRiwayat,
  liveShiftTutup,
  liveSolvency,
  liveTransaksiRiwayat,
  liveUbahUser,
  liveUpdateProduct,
  liveUsers,
  liveVoidTransaksi,
  liveWorkingCapital,
  liveWorkingCapitalTurnover,
  liveCashConversionCycle,
  liveCashRatio,
  liveCurrentRatio,
  liveArTurnover,
  liveApTurnover,
} from "@/lib/api/live";

export const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? "mock";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let nomorBerikut = 25;

export function hitungTotal(payload: Pick<CheckoutPayload, "lines" | "diskonTransaksi" | "pajak">): number {
  const subtotal = payload.lines.reduce(
    (sum, l) => sum + Math.max(0, l.product.hargaJual * l.qty - l.diskon),
    0,
  );
  return Math.max(0, subtotal - payload.diskonTransaksi + payload.pajak);
}

function keHasilImpor(hasil: ImportResult): HasilImpor {
  return {
    sukses: hasil.successCount,
    gagal: hasil.failedCount,
    pesan: hasil.errors.map((e) => e.message),
  };
}

export const api = {
  auth: {
    login: async (username: string, password: string): Promise<LoginResult> => {
      if (API_MODE === "live") return liveLogin(username, password);
      await delay(400);
      return mockDb.login(username, password);
    },
    logout: async (user?: User): Promise<void> => {
      if (API_MODE === "live") return liveLogout();
      await delay(150);
      mockDb.logout(user);
    },
    users: async (): Promise<User[]> => {
      if (API_MODE === "live") return liveUsers();
      await delay(120);
      return mockDb.users.map(({ password: _, ...u }) => u);
    },
    auditList: async (): Promise<AuditEntry[]> => {
      if (API_MODE === "live") return liveAuditLog();
      await delay(120);
      return structuredClone(mockDb.auditLog).reverse();
    },
    buatUser: async (input: { nama: string; username: string; password: string; role: User["role"] }, actor: User): Promise<User> => {
      if (API_MODE === "live") return liveBuatUser(input);
      await delay(300);
      return mockDb.buatUser(input, actor);
    },
    ubahUser: async (id: string, input: { password?: string; role?: User["role"] }, actor: User): Promise<User> => {
      if (API_MODE === "live") return liveUbahUser(id, input);
      await delay(300);
      return mockDb.ubahUser(id, input, actor);
    },
    hapusUser: async (id: string, actor: User): Promise<void> => {
      if (API_MODE === "live") return liveHapusUser(id);
      await delay(250);
      mockDb.hapusUser(id, actor);
    },
  },

  master: {
    products: async (): Promise<Product[]> => {
      if (API_MODE === "live") return liveProducts();
      await delay(150);
      return structuredClone(mockDb.products);
    },
    createProduct: async (p: Omit<Product, "id">): Promise<Product> => {
      if (API_MODE === "live") return liveCreateProduct(p);
      await delay(250);
      if (p.barcode !== "" && mockDb.products.some((x) => x.barcode === p.barcode)) {
        throw new Error("Barcode sudah dipakai produk lain.");
      }
      const baru: Product = { ...p, id: produkBaruId() };
      mockDb.products.push(baru);
      return structuredClone(baru);
    },
    penyesuaianStok: async (input: PenyesuaianStokInput, user: User): Promise<Product> => {
      if (API_MODE === "live") return livePenyesuaianStok(input);
      await delay(300);
      return mockDb.penyesuaianStok(input, user);
    },
    updateProduct: async (id: string, p: Omit<Product, "id">): Promise<Product> => {
      if (API_MODE === "live") return liveUpdateProduct(id, p);
      await delay(250);
      const idx = mockDb.products.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Produk tidak ditemukan.");
      if (p.barcode !== "" && mockDb.products.some((x) => x.id !== id && x.barcode === p.barcode)) {
        throw new Error("Barcode sudah dipakai produk lain.");
      }
      mockDb.products[idx] = { ...p, id };
      return structuredClone(mockDb.products[idx]);
    },
    deleteProduct: async (id: string): Promise<void> => {
      if (API_MODE === "live") return liveDeleteProduct(id);
      await delay(200);
      mockDb.products = mockDb.products.filter((x) => x.id !== id);
    },

    imporProduk: async (rows: ImporProdukBaris[], user: User): Promise<HasilImpor> => {
      if (API_MODE === "live") return keHasilImpor(await liveImporProduk(fileCsvProdukDariBaris(rows)));
      await delay(500);
      return mockDb.imporProduk(rows, user);
    },

    imporPelanggan: async (rows: ImporPelangganBaris[], user: User): Promise<HasilImpor> => {
      if (API_MODE === "live") return keHasilImpor(await liveImporPelanggan(fileCsvPelangganDariBaris(rows)));
      await delay(500);
      return mockDb.imporPelanggan(rows, user);
    },

    imporSaldoAwal: async (rows: ImporSaldoAwalBaris[], user: User): Promise<HasilImpor> => {
      if (API_MODE === "live") return keHasilImpor(await liveImporSaldoAwal(fileCsvSaldoAwalDariBaris(rows)));
      await delay(500);
      return mockDb.imporSaldoAwal(rows, user);
    },

    pelanggan: async (): Promise<Pelanggan[]> => {
      if (API_MODE === "live") return livePelanggan();
      await delay(120);
      return mockDb.daftarPelanggan();
    },
  },

  shift: {
    aktif: async (): Promise<ShiftInfo | null> => {
      if (API_MODE === "live") return liveShiftAktif();
      await delay(100);
      return structuredClone(mockDb.shiftAktif);
    },
    riwayat: async (): Promise<ShiftRiwayat[]> => {
      if (API_MODE === "live") return liveShiftRiwayat();
      await delay(100);
      return structuredClone(mockDb.shiftRiwayat);
    },
    buka: async (input: ShiftBukaInput): Promise<ShiftInfo> => {
      if (API_MODE === "live") return liveShiftBuka(input);
      await delay(300);
      return mockDb.bukaShift(input);
    },
    mutasiKas: async (input: ShiftMutasiInput): Promise<ShiftInfo> => {
      if (API_MODE === "live") {
        const shift = await liveShiftAktif();
        if (!shift) throw new Error("Shift belum dibuka.");
        return liveShiftMutasi(shift.id, input);
      }
      await delay(250);
      return mockDb.mutasiKas(input);
    },
    tutup: async (uangFisik: number): Promise<ShiftRiwayat> => {
      if (API_MODE === "live") {
        const shift = await liveShiftAktif();
        if (!shift) throw new Error("Shift belum dibuka.");
        return liveShiftTutup(shift.id, uangFisik);
      }
      await delay(400);
      return mockDb.tutupShift(uangFisik);
    },
  },

  pembelian: {
    list: async (): Promise<Pembelian[]> => {
      if (API_MODE === "live") return livePembelianList();
      await delay(150);
      return structuredClone(mockDb.pembelian);
    },
    buat: async (input: PembelianInput): Promise<Pembelian> => {
      if (API_MODE === "live") return livePembelianBuat(input);
      await delay(400);
      return mockDb.registerPembelian(input);
    },
  },

  hutang: {
    bayar: async (pembelianId: string, nominal: number, metode: "tunai" | "transfer"): Promise<Pembelian> => {
      if (API_MODE === "live") return liveBayarHutang({ pembelianId, nominal, metode });
      await delay(350);
      return mockDb.bayarHutang(pembelianId, nominal, metode);
    },
  },

  piutang: {
    bayar: async (nomor: string, nominal: number, metode: "tunai" | "transfer"): Promise<TransaksiRiwayat> => {
      if (API_MODE === "live") return liveBayarPiutang({ nomor, nominal, metode });
      await delay(350);
      return mockDb.bayarPiutang(nomor, nominal, metode);
    },
  },

  biaya: {
    list: async (params?: BiayaParams): Promise<Biaya[]> => {
      if (API_MODE === "live") return liveBiayaList(params);
      await delay(120);
      return structuredClone(mockDb.biaya);
    },
    catat: async (input: { kategori: string; nominal: number; metode: "tunai" | "transfer"; catatan?: string }): Promise<Biaya> => {
      if (API_MODE === "live") return liveBiayaCatat(input);
      await delay(350);
      return mockDb.catatBiaya(input);
    },
  },

  akuntansi: {
    jurnal: async (params?: JurnalParams): Promise<JurnalEntry[]> => {
      if (API_MODE === "live") return liveJurnal(params);
      await delay(120);
      return structuredClone(mockDb.jurnal);
    },
    akun: async (): Promise<ReturnType<typeof mockDb.akunSaldos>> => {
      if (API_MODE === "live") return liveAkun();
      await delay(120);
      return structuredClone(mockDb.akunSaldos());
    },
    labaRugi: async (): Promise<LabaRugi> => {
      if (API_MODE === "live") return liveLabaRugi();
      await delay(120);
      return structuredClone(mockDb.labaRugi());
    },
    fiscalPeriods: {
      list: async (): Promise<FiscalPeriod[]> => {
        if (API_MODE === "live") return liveFiscalPeriodList();
        await delay(120);
        return [];
      },
      create: async (input: CreateFiscalPeriodRequest): Promise<FiscalPeriod> => {
        if (API_MODE === "live") return liveFiscalPeriodCreate(input);
        await delay(350);
        return {
          id: crypto.randomUUID(),
          businessId: BUSINESS_ID,
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status ?? "OPEN",
          version: 1,
        };
      },
      close: async (id: string, actorId: string, idempotensiKunci: string): Promise<FiscalPeriod> => {
        if (API_MODE === "live") return liveFiscalPeriodClose(id, actorId, idempotensiKunci);
        await delay(350);
        return {
          id,
          businessId: BUSINESS_ID,
          name: "",
          startDate: "",
          endDate: "",
          status: "CLOSED",
          version: 1,
        };
      },
      lock: async (id: string, actorId: string, actorLevel: string, reason: string, idempotensiKunci: string): Promise<FiscalPeriod> => {
        if (API_MODE === "live") return liveFiscalPeriodLock(id, actorId, actorLevel, reason, idempotensiKunci);
        await delay(350);
        return {
          id,
          businessId: BUSINESS_ID,
          name: "",
          startDate: "",
          endDate: "",
          status: "LOCKED",
          version: 1,
        };
      },
      reopen: async (id: string, actorId: string, actorLevel: string, reason: string, idempotensiKunci: string): Promise<FiscalPeriod> => {
        if (API_MODE === "live") return liveFiscalPeriodReopen(id, actorId, actorLevel, reason, idempotensiKunci);
        await delay(350);
        return {
          id,
          businessId: BUSINESS_ID,
          name: "",
          startDate: "",
          endDate: "",
          status: "OPEN",
          version: 1,
        };
      },
      reverseClosing: async (id: string, actorId: string, actorLevel: string, reason: string, idempotensiKunci: string): Promise<FiscalPeriod> => {
        if (API_MODE === "live") return liveFiscalPeriodReverseClosing(id, actorId, actorLevel, reason, idempotensiKunci);
        await delay(350);
        return {
          id,
          businessId: BUSINESS_ID,
          name: "",
          startDate: "",
          endDate: "",
          status: "OPEN",
          version: 1,
        };
      },
      getPendingClose: async (): Promise<FiscalPeriod[]> => {
        if (API_MODE === "live") return liveFiscalPeriodGetPendingClose();
        await delay(120);
        return [];
      },
    },
    dailyMovement: async (date: string, accountCode: string): Promise<DailyMovementReport> => {
      if (API_MODE === "live") return liveDailyMovement(date, accountCode);
      await delay(120);
      return {
        date,
        accountCode,
        accountName: "-",
        openingBalance: 0,
        entries: [],
        closingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
      };
    },
  },

  analytics: {
    profitability: async (startDate: string, endDate: string): Promise<ProfitabilityRatio> => {
      if (API_MODE === "live") return liveProfitability(startDate, endDate);
      await delay(120);
      return {
        roe: 0, roa: 0, netProfitMargin: 0, totalNetIncome: 0,
        totalEquity: 0, totalAssets: 0, totalRevenue: 0,
        roeAssessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        roaAssessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        netProfitMarginAssessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        description: "Tidak ada data.",
      };
    },
    inventoryTurnover: async (startDate: string, endDate: string): Promise<InventoryTurnover> => {
      if (API_MODE === "live") return liveInventoryTurnover(startDate, endDate);
      await delay(120);
      return {
        turnoverRatio: 0, daysInInventory: 0, costOfGoodsSold: 0, averageInventory: 0,
        assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        description: "Tidak ada data.",
      };
    },
    arTurnover: async (startDate: string, endDate: string): Promise<ArApTurnover> => {
      if (API_MODE === "live") return liveArTurnover(startDate, endDate);
      await delay(120);
      return {
        turnoverRatio: 0, daysOutstanding: 0, totalBase: 0, averageBalance: 0,
        assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        description: "Tidak ada data.",
      };
    },
    apTurnover: async (startDate: string, endDate: string): Promise<ArApTurnover> => {
      if (API_MODE === "live") return liveApTurnover(startDate, endDate);
      await delay(120);
      return {
        turnoverRatio: 0, daysOutstanding: 0, totalBase: 0, averageBalance: 0,
        assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        description: "Tidak ada data.",
      };
    },
    workingCapital: async (date: string): Promise<WorkingCapital> => {
      if (API_MODE === "live") return liveWorkingCapital(date);
      await delay(120);
      return {
        currentAssets: 0, currentLiabilities: 0, workingCapital: 0, workingCapitalRatio: 0,
        description: "Tidak ada data.", assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
      };
    },
    workingCapitalTurnover: async (startDate: string, endDate: string): Promise<WorkingCapitalTurnover> => {
      if (API_MODE === "live") return liveWorkingCapitalTurnover(startDate, endDate);
      await delay(120);
      return {
        turnoverRatio: 0, daysTurnover: 0, totalRevenue: 0,
        averageWorkingCapital: 0, openingWorkingCapital: 0, closingWorkingCapital: 0,
        assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        description: "Tidak ada data.",
      };
    },
    currentRatio: async (date: string): Promise<LiquidityRatio> => {
      if (API_MODE === "live") return liveCurrentRatio(date);
      await delay(120);
      return {
        ratio: 0, numerator: 0, denominator: 0, description: "Tidak ada data.",
        assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
      };
    },
    cashRatio: async (date: string): Promise<LiquidityRatio> => {
      if (API_MODE === "live") return liveCashRatio(date);
      await delay(120);
      return {
        ratio: 0, numerator: 0, denominator: 0, description: "Tidak ada data.",
        assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
      };
    },
    solvency: async (date: string): Promise<Solvency> => {
      if (API_MODE === "live") return liveSolvency(date);
      await delay(120);
      return {
        debtToAssets: 0, debtToEquity: 0, equityRatio: 0,
        totalLiabilities: 0, totalAssets: 0, totalEquity: 0,
        description: "Tidak ada data.", assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
      };
    },
    cashConversionCycle: async (startDate: string, endDate: string): Promise<CashConversionCycle> => {
      if (API_MODE === "live") return liveCashConversionCycle(startDate, endDate);
      await delay(120);
      return {
        cashConversionCycleDays: 0, daysInventoryOutstanding: 0,
        daysSalesOutstanding: 0, daysPayableOutstanding: 0,
        assessment: { rating: "TIDAK BERLAKU", explanation: "Tidak ada data.", benchmark: "-" },
        description: "Tidak ada data.",
      };
    },
    healthSummary: async (date: string, startDate?: string, endDate?: string): Promise<HealthSummary> => {
      if (API_MODE === "live") return liveHealthSummary(date, startDate, endDate);
      await delay(120);
      return {
        date, startDate: date, endDate: date,
        comparisonStartDate: date, comparisonEndDate: date,
        overallVerdict: "TIDAK BERLAKU", overallExplanation: "Tidak ada data.",
        indicators: [],
        dupont: { returnOnEquity: 0, netProfitMargin: 0, assetTurnover: 0, equityMultiplier: 0, dominantDriver: "-" },
      };
    },
    productPerformance: async (startDate: string, endDate: string): Promise<ProductPerformance[]> => {
      if (API_MODE === "live") return liveProductPerformance(startDate, endDate);
      await delay(120);
      return [];
    },
    productPerformanceRankings: async (startDate: string, endDate: string, top = 10): Promise<ProductPerformanceRankings> => {
      if (API_MODE === "live") return liveProductPerformanceRankings(startDate, endDate, top);
      await delay(120);
      return {
        fastMoving: [], slowMoving: [], highMargin: [], topRevenue: [], topProfit: [],
      };
    },
  },

  aging: {
    ar: async (asOfDate?: string): Promise<AgingReport> => {
      if (API_MODE === "live") return liveAging("RECEIVABLE", asOfDate);
      await delay(120);
      return {
        side: "RECEIVABLE", asOfDate: asOfDate ?? new Date().toISOString(),
        outstandingTotal: 0, current: 0, days30: 0, days60: 0, days90: 0, over90: 0,
        invoices: [],
      };
    },
    ap: async (asOfDate?: string): Promise<AgingReport> => {
      if (API_MODE === "live") return liveAging("PAYABLE", asOfDate);
      await delay(120);
      return {
        side: "PAYABLE", asOfDate: asOfDate ?? new Date().toISOString(),
        outstandingTotal: 0, current: 0, days30: 0, days60: 0, days90: 0, over90: 0,
        invoices: [],
      };
    },
    reconciliation: async (side: "RECEIVABLE" | "PAYABLE", accountCode: string, asOfDate?: string): Promise<Reconciliation> => {
      if (API_MODE === "live") return liveReconciliation(side, accountCode, asOfDate);
      await delay(120);
      return {
        side, accountCode,
        invoiceCount: 0, invoicedTotal: 0, allocatedTotal: 0,
        outstandingTotal: 0, ledgerBalance: 0, difference: 0,
        isReconciled: true,
      };
    },
  },

  supplier: {
    list: async (): Promise<Supplier[]> => {
      if (API_MODE === "live") return liveSupplierList();
      await delay(120);
      return [];
    },
    create: async (input: CreateSupplierRequest): Promise<Supplier> => {
      if (API_MODE === "live") return liveSupplierCreate(input);
      await delay(350);
      return {
        id: crypto.randomUUID(),
        businessId: BUSINESS_ID,
        code: input.code,
        name: input.name,
        address: input.address ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        taxNumber: input.taxNumber ?? null,
        isActive: true,
      };
    },
    deactivate: async (id: string): Promise<Supplier> => {
      if (API_MODE === "live") return liveSupplierDeactivate(id);
      await delay(350);
      return {
        id,
        businessId: BUSINESS_ID,
        code: "",
        name: "",
        address: null,
        phone: null,
        email: null,
        taxNumber: null,
        isActive: false,
      };
    },
  },

  toko: {
    profil: {
      get: async (): Promise<CompanyProfile> => {
        if (API_MODE === "live") return liveCompanyProfileGet();
        await delay(120);
        const p = useToko.getState().profil;
        return {
          nama: p.nama,
          alamat: p.alamat,
          telepon: p.telepon,
          email: "",
          website: "",
          npwp: "",
          logoUrl: "",
        };
      },
      put: async (input: CompanyProfile): Promise<CompanyProfile> => {
        if (API_MODE === "live") return liveCompanyProfilePut(input);
        await delay(250);
        const p = useToko.getState().profil;
        const gabungan: ProfilToko = {
          nama: input.nama,
          alamat: input.alamat,
          telepon: input.telepon,
          mataUang: p.mataUang,
          zonaWaktu: p.zonaWaktu,
          footerStruk: p.footerStruk,
          pajakPersen: p.pajakPersen,
        };
        useToko.getState().simpan(gabungan);
        return input;
      },
    },
    kebijakan: {
      get: async (): Promise<KebijakanOperasional> => {
        if (API_MODE === "live") return liveKebijakanGet();
        await delay(120);
        const k = useToko.getState().kebijakan;
        return { izinkanKredit: k.izinkanKredit, saldoAwalShift: k.saldoAwalShift };
      },
      put: async (input: KebijakanOperasional): Promise<KebijakanOperasional> => {
        if (API_MODE === "live") return liveKebijakanPut(input);
        await delay(250);
        useToko.getState().simpanKebijakan(input);
        return input;
      },
    },
  },

  transaksi: {
    checkout: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
      if (API_MODE === "live") return liveCheckout(payload);
      await delay(600);

      if (!mockDb.shiftAktif) throw new Error("Shift belum dibuka.");

      if (mockDb.kunciCheckout.has(payload.idempotensiKunci)) {
        throw new Error("Transaksi ganda terdeteksi (idempotensi) — refresh dan ulangi.");
      }

      const total = hitungTotal(payload);

      let belum = total;
      let kembalian = 0;
      let masukTunai = 0;
      let masukBank = 0;
      let masukGateway = 0;
      const pembayaran: Array<{ metode: PaymentMethod; nominal: number }> = [];
      for (const a of payload.allocations) {
        if (belum <= 0) break;
        const nominal = Math.max(0, a.nominal);
        if (a.metode !== "tunai" && nominal > belum) {
          throw new Error("Pembayaran digital tidak boleh melebihi sisa pembayaran.");
        }
        const masuk = Math.min(nominal, belum);
        if (a.metode === "tunai") {
          masukTunai += masuk;
          kembalian += Math.max(0, nominal - masuk);
        } else if (a.metode === "qris") masukGateway += masuk;
        else masukBank += masuk;
        if (masuk > 0) pembayaran.push({ metode: a.metode, nominal: masuk });
        belum -= masuk;
      }

      const sisa = Math.max(0, belum);
      const jadiPiutang = sisa > 0 && payload.gunakanPiutang;
      const digitalPending = pembayaran.some((p) => p.metode === "qris");

      if (sisa > 0 && !jadiPiutang) {
        throw new Error("Pembayaran kurang dan penjualan kredit tidak diizinkan.");
      }

      mockDb.kunciCheckout.add(payload.idempotensiKunci);

      nomorBerikut += 1;
      const status: CheckoutResult["status"] =
        sisa > 0 ? "dibayar_sebagian" : digitalPending ? "menunggu_pembayaran" : "lunas";
      const nomor = `PTR-${String(nomorBerikut).padStart(6, "0")}`;

      mockDb.catatTransaksi({
        nomor,
        waktu: new Date().toISOString(),
        kasir: payload.kasir,
        shiftId: payload.shiftId,
        pelanggan: payload.pelanggan,
        items: payload.lines.map((l) => ({
          nama: l.product.nama,
          qty: l.qty,
          hargaJual: l.product.hargaJual,
          diskon: l.diskon,
          hargaBeli: l.product.hargaBeli,
        })),
        diskonTransaksi: payload.diskonTransaksi,
        pajak: payload.pajak,
        total,
        kembalian,
        piutang: jadiPiutang ? sisa : 0,
        status,
        pembayaran,
      });

      mockDb.jurnalPenjualan(
        {
          shiftId: payload.shiftId,
          items: payload.lines.map((l) => ({
            nama: l.product.nama,
            qty: l.qty,
            hargaBeli: l.product.hargaBeli,
          })),
        },
        {
          tunai: masukTunai,
          bank: masukBank,
          gateway: masukGateway,
          piutang: jadiPiutang ? sisa : 0,
        },
        total,
        payload.pajak,
      );

      if (masukTunai > 0) mockDb.catatPenjualanTunai(masukTunai);

      for (const l of payload.lines) {
        const p = mockDb.products.find((x) => x.id === l.product.id);
        if (p) p.stok = Math.max(0, p.stok - l.qty);
      }

      return { nomor, total, kembalian, piutang: jadiPiutang ? sisa : 0, status };
    },

    riwayat: async (): Promise<TransaksiRiwayat[]> => {
      if (API_MODE === "live") return liveTransaksiRiwayat();
      await delay(120);
      return mockDb.riwayatTransaksi();
    },

    batal: async (nomor: string, user: User): Promise<TransaksiRiwayat> => {
      if (API_MODE === "live") return liveVoidTransaksi(nomor);
      await delay(400);
      return mockDb.batalTransaksi(nomor, user);
    },

    retur: async (input: ReturInput, user: User): Promise<ReturPenjualan> => {
      if (API_MODE === "live") return liveRetur(input);
      await delay(400);
      return mockDb.prosesRetur(input, user);
    },

    riwayatRetur: async (params?: ReturRiwayatParams): Promise<ReturPenjualan[]> => {
      if (API_MODE === "live") return liveReturRiwayat(params);
      await delay(120);
      return mockDb.riwayatRetur();
    },

    konfirmasiDigital: async (nomor: string, user: User): Promise<TransaksiRiwayat> => {
      if (API_MODE === "live") return liveKonfirmasiDigital(nomor);
      await delay(300);
      return mockDb.konfirmasiDigital(nomor, user);
    },
  },
};
