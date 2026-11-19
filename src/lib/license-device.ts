import { printerNativeTersedia } from "@/lib/printer/printer";
import { sidikPerangkatLokal } from "@/lib/license";

export async function sidikMesin(): Promise<string> {
  if (!printerNativeTersedia()) return sidikPerangkatLokal();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("machine_id");
}
