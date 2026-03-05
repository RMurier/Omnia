import { authFetchResponse } from "./authFetch";
import i18n from "../i18n";

export async function apiJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetchResponse(url, options);

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let msg = raw || i18n.t("common.error");
    try {
      const j = JSON.parse(raw);
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const text = await res.text().catch(() => "");
  return (text ? (JSON.parse(text) as T) : (undefined as T));
}
