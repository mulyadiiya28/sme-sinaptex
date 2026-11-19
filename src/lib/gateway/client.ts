import type { GatewayConfig } from "@/lib/store/gateway";

export class GatewayError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GatewayError";
    this.status = status;
  }
}

export type StatusTagihan = "pending" | "paid" | "failed" | "expired" | "unknown";

export type TagihanGateway = {
  id: string;
  status: StatusTagihan;
  statusAsli: string;
  qrString?: string;
  qrUrl?: string;
  redirectUrl?: string;
  raw: unknown;
};

export type InputTagihan = {
  orderId: string;
  amount: number;
  description: string;
  customer?: { name?: string; phone?: string };
};

function headerAuth(config: GatewayConfig): Record<string, string> {
  const key = config.apiKey.trim();
  if (!key) return {};
  if (config.auth === "basic") {
    return { Authorization: `Basic ${btoa(`${key}:`)}` };
  }
  if (config.auth === "x-api-key") {
    return { [config.headerName.trim() || "X-Api-Key"]: key };
  }
  return { Authorization: `Bearer ${key}` };
}

async function request(
  config: GatewayConfig,
  path: string,
  init: { method: string; body?: string },
): Promise<unknown> {
  const base = config.baseUrl.trim().replace(/\/+$/, "");
  if (!base) throw new GatewayError("Base URL gateway belum diisi di Pengaturan → Gateway.");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, config.timeoutDetik) * 1000);
  try {
    const res = await fetch(url, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headerAuth(config),
      },
      body: init.body,
      signal: controller.signal,
    });
    const teks = await res.text();
    let data: unknown = null;
    if (teks) {
      try {
        data = JSON.parse(teks);
      } catch {
        data = teks;
      }
    }
    if (!res.ok) {
      const detail =
        typeof data === "object" && data !== null
          ? JSON.stringify(data).slice(0, 200)
          : String(data ?? "").slice(0, 200);
      throw new GatewayError(
        `Gateway menolak permintaan (HTTP ${res.status}). ${detail}`.trim(),
        res.status,
      );
    }
    return data;
  } catch (err) {
    if (err instanceof GatewayError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new GatewayError("Gateway tidak merespons dalam batas waktu yang ditentukan.");
    }
    throw new GatewayError(`Gagal menghubungi gateway: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export function normalisasiStatus(nilai: string | undefined | null): StatusTagihan {
  const v = (nilai ?? "").toString().trim().toLowerCase();
  if (!v) return "unknown";
  if (["paid", "settlement", "settled", "capture", "success", "successful", "completed", "lunas", "berhasil"].includes(v)) {
    return "paid";
  }
  if (["expire", "expired", "kadaluarsa", "kedaluwarsa"].includes(v)) return "expired";
  if (["fail", "failed", "deny", "denied", "cancel", "cancelled", "canceled", "error", "gagal"].includes(v)) {
    return "failed";
  }
  if (["pending", "unpaid", "waiting", "requiring_action", "menunggu", "pembayaran", "created", "new"].includes(v)) {
    return "pending";
  }
  return "unknown";
}

function ambil(data: unknown, ...jalur: string[]): unknown {
  let sekarang: unknown = data;
  for (const kunci of jalur) {
    if (typeof sekarang !== "object" || sekarang === null) return undefined;
    sekarang = (sekarang as Record<string, unknown>)[kunci];
  }
  return sekarang;
}

function teks(data: unknown, ...jalur: string[]): string | undefined {
  const nilai = ambil(data, ...jalur);
  if (nilai === undefined || nilai === null) return undefined;
  return String(nilai);
}

function mapUmum(data: unknown, orderId: string): TagihanGateway {
  const statusAsli = teks(data, "status") ?? teks(data, "state") ?? teks(data, "data", "status") ?? "";
  return {
    id: teks(data, "id") ?? teks(data, "chargeId") ?? teks(data, "reference") ?? teks(data, "data", "id") ?? orderId,
    status: normalisasiStatus(statusAsli),
    statusAsli,
    qrString:
      teks(data, "qrString") ??
      teks(data, "qr_string") ??
      teks(data, "qrCode") ??
      teks(data, "data", "qrString") ??
      teks(data, "data", "qr_string"),
    qrUrl: teks(data, "qrUrl") ?? teks(data, "qr_url") ?? teks(data, "qrImage") ?? teks(data, "data", "qrUrl"),
    redirectUrl:
      teks(data, "redirectUrl") ?? teks(data, "paymentUrl") ?? teks(data, "data", "redirectUrl"),
    raw: data,
  };
}

function mapMidtrans(data: unknown, orderId: string): TagihanGateway {
  const statusAsli = teks(data, "transaction_status") ?? "";
  const actions = ambil(data, "actions");
  const cariAction = (nama: string): string | undefined => {
    if (!Array.isArray(actions)) return undefined;
    const cocok = actions.find((a) => {
      const item = a as Record<string, unknown>;
      return String(item.name ?? "").toLowerCase() === nama;
    }) as Record<string, unknown> | undefined;
    if (!cocok) return undefined;
    const nilai = cocok.url ?? cocok.value ?? cocok.id;
    return nilai === undefined || nilai === null ? undefined : String(nilai);
  };
  return {
    id: teks(data, "order_id") ?? teks(data, "transaction_id") ?? orderId,
    status: normalisasiStatus(statusAsli),
    statusAsli,
    qrString: cariAction("qr_string") ?? teks(data, "qr_string"),
    qrUrl: cariAction("qr_code") ?? teks(data, "qr_code"),
    redirectUrl: teks(data, "redirect_url"),
    raw: data,
  };
}

function mapXendit(data: unknown, orderId: string): TagihanGateway {
  const statusAsli = teks(data, "status") ?? "";
  return {
    id: teks(data, "id") ?? teks(data, "external_id") ?? orderId,
    status: normalisasiStatus(statusAsli),
    statusAsli,
    qrString: teks(data, "qr_string"),
    qrUrl: teks(data, "qr_code") ?? teks(data, "image_url"),
    redirectUrl: teks(data, "checkout_url"),
    raw: data,
  };
}

export async function buatTagihan(
  config: GatewayConfig,
  input: InputTagihan,
): Promise<TagihanGateway> {
  if (!config.aktif) throw new GatewayError("Gateway belum diaktifkan di Pengaturan → Gateway.");

  if (config.provider === "midtrans") {
    const data = await request(config, "/v2/charge", {
      method: "POST",
      body: JSON.stringify({
        transaction_details: { order_id: input.orderId, gross_amount: input.amount },
        customer_details: {
          first_name: input.customer?.name ?? "Pelanggan",
          phone: input.customer?.phone || undefined,
        },
        payment_type: "qris",
        merchant_id: config.merchantId.trim() || undefined,
      }),
    });
    return mapMidtrans(data, input.orderId);
  }

  if (config.provider === "xendit") {
    const data = await request(config, "/v2/qr_codes", {
      method: "POST",
      body: JSON.stringify({
        external_id: input.orderId,
        amount: input.amount,
        channel: "ID_QRIS",
        customer: input.customer?.name ? { given_names: input.customer.name } : undefined,
        merchant_id: config.merchantId.trim() || undefined,
      }),
    });
    return mapXendit(data, input.orderId);
  }

  const data = await request(config, config.pathBuat.trim() || "/charges", {
    method: "POST",
    body: JSON.stringify({
      orderId: input.orderId,
      amount: input.amount,
      currency: "IDR",
      description: input.description,
      customer: input.customer
        ? { name: input.customer.name ?? "", phone: input.customer.phone ?? "" }
        : undefined,
      merchantId: config.merchantId.trim() || undefined,
    }),
  });
  return mapUmum(data, input.orderId);
}

export async function statusTagihan(
  config: GatewayConfig,
  id: string,
): Promise<TagihanGateway> {
  if (config.provider === "midtrans") {
    const data = await request(config, `/v2/qr_code/${encodeURIComponent(id)}/status`, {
      method: "GET",
    });
    return mapMidtrans(data, id);
  }

  if (config.provider === "xendit") {
    const data = await request(config, `/v2/qr_codes/${encodeURIComponent(id)}`, { method: "GET" });
    return mapXendit(data, id);
  }

  const template = config.pathStatus.trim() || "/charges/{id}";
  const path = template.includes("{id}") ? template.replace("{id}", encodeURIComponent(id)) : `${template.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  const data = await request(config, path, { method: "GET" });
  return mapUmum(data, id);
}

export type HasilTes = { ok: boolean; pesan: string };

export async function tesKoneksi(config: GatewayConfig): Promise<HasilTes> {
  const base = config.baseUrl.trim().replace(/\/+$/, "");
  if (!base) return { ok: false, pesan: "Base URL belum diisi." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, config.timeoutDetik) * 1000);
  try {
    const res = await fetch(base, {
      method: "GET",
      headers: { Accept: "application/json", ...headerAuth(config) },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, pesan: `Server menjawab HTTP ${res.status} — API key ditolak.` };
    }
    return {
      ok: true,
      pesan: `Server dapat dihubungi (HTTP ${res.status}). Status HTTP di atas 400 tetap berarti URL hidup.`,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, pesan: "Gateway tidak merespons dalam batas waktu yang ditentukan." };
    }
    return { ok: false, pesan: `Gagal menghubungi gateway: ${(err as Error).message}` };
  } finally {
    clearTimeout(timer);
  }
}
