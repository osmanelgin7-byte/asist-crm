export function parseWorkOrderNumbers(input: {
  title?: unknown;
  asistansDosyaNo?: unknown;
}): { dosyaNo: string; asistansDosyaNo: string } {
  return {
    dosyaNo: typeof input.title === "string" ? input.title.trim() : "",
    asistansDosyaNo: typeof input.asistansDosyaNo === "string" ? input.asistansDosyaNo.trim() : "",
  };
}

export function validateRequiredWorkOrderNumbers(
  dosyaNo: string,
  asistansDosyaNo: string
): string | null {
  if (!dosyaNo && !asistansDosyaNo) {
    return "Dosya No ve Asistans Dosya No zorunludur.";
  }
  if (!dosyaNo) {
    return "Dosya No zorunludur.";
  }
  if (!asistansDosyaNo) {
    return "Asistans Dosya No zorunludur.";
  }
  return null;
}

export function resolveWorkOrderNumbers(
  existing: { title: string; asistansDosyaNo: string | null },
  patch: { title?: unknown; asistansDosyaNo?: unknown }
): { dosyaNo: string; asistansDosyaNo: string } {
  return {
    dosyaNo: patch.title !== undefined ? String(patch.title).trim() : existing.title.trim(),
    asistansDosyaNo:
      patch.asistansDosyaNo !== undefined
        ? String(patch.asistansDosyaNo).trim()
        : (existing.asistansDosyaNo?.trim() ?? ""),
  };
}
