import { getSession } from "next-auth/react";

function mergeHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);

  if (
    init?.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : null;
}

/** Tarayıcıdan API istekleri — oturum çerezi ile Next.js API; isteğe bağlı backend JWT. */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = mergeHeaders(init);
  const isApi = input.startsWith("/api/") && !input.startsWith("/api/auth");

  if (isApi) {
    const session = await getSession();
    if (session?.apiToken) {
      headers.set("Authorization", `Bearer ${session.apiToken}`);
    }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "same-origin",
  });
}

/** API JSON yanıtını güvenli okur (HTML hata sayfasında patlamaz). */
export async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: "Sunucu yanıtı okunamadı" };
  }
}

/** Excel/PDF gibi dosyaları oturum çerezi veya JWT ile indirir. */
export async function downloadFile(url: string, fallbackFilename = "indirme.xlsx") {
  const res = await apiFetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : "Dosya indirilemedi");
  }

  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get("Content-Disposition")) ?? fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
