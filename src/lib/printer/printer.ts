export type PrinterInfo = {
  name: string;
  isDefault: boolean;
};

export function printerNativeTersedia(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function daftarPrinter(): Promise<PrinterInfo[]> {
  if (!printerNativeTersedia()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<PrinterInfo[]>("printers");
}

export async function cetakMentah(nama: string, data: Uint8Array): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("print_raw", { printer: nama, data: Array.from(data) });
}
