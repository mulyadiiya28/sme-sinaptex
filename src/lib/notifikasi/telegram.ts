export async function kirimTelegram(botToken: string, chatId: string, pesan: string): Promise<{ ok: boolean; pesan: string }> {
  if (!botToken || !chatId) return { ok: false, pesan: "Token bot atau chat ID belum diisi." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: pesan, parse_mode: "HTML" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) return { ok: true, pesan: "Terkirim." };
    return { ok: false, pesan: data?.description || `Gagal (${res.status}).` };
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : String(e) };
  }
}
