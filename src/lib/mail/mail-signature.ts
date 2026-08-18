export function appendMailSignature(body: string, signatureText?: string | null): string {
  const sig = signatureText?.trim();
  if (!sig) return body;
  if (body.includes(sig)) return body;

  const signatureBlock = `--\n${sig}`;
  const quoteIndex = body.search(/\n---\n/);

  if (quoteIndex !== -1) {
    const before = body.slice(0, quoteIndex).trimEnd();
    const quote = body.slice(quoteIndex);
    return before ? `${before}\n\n${signatureBlock}${quote}` : `\n\n${signatureBlock}${quote}`;
  }

  const trimmed = body.trimEnd();
  return trimmed ? `${trimmed}\n\n${signatureBlock}` : signatureBlock;
}

/** Yeni e-posta / yanıt / tümünü yanıtla için mesaj alanı şablonu (imza gönderimde eklenir). */
export function buildComposeBody(quote = ""): string {
  const trimmedQuote = quote.trimEnd();
  if (!trimmedQuote) return "\n\n";
  return trimmedQuote.startsWith("\n") ? trimmedQuote : `\n${trimmedQuote}`;
}

export function signatureToHtml(signatureText?: string | null, signatureHtml?: string | null): string | null {
  if (signatureHtml?.trim()) return signatureHtml.trim();
  if (!signatureText?.trim()) return null;
  return signatureText
    .trim()
    .split("\n")
    .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br/>");
}

export function appendMailSignatureHtml(
  bodyHtml: string,
  signatureText?: string | null,
  signatureHtml?: string | null
): string {
  const sigHtml = signatureToHtml(signatureText, signatureHtml);
  if (!sigHtml) return bodyHtml;
  if (bodyHtml.includes(sigHtml)) return bodyHtml;

  const sigBlock = `<br/><br/><hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0"/><div>${sigHtml}</div>`;
  const quoteMarker = "<br/>---<br/>";
  const quoteIndex = bodyHtml.indexOf(quoteMarker);

  if (quoteIndex !== -1) {
    return `${bodyHtml.slice(0, quoteIndex)}${sigBlock}${bodyHtml.slice(quoteIndex)}`;
  }

  return `${bodyHtml}${sigBlock}`;
}
