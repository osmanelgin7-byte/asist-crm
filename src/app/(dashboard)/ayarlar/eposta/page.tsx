"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Plug, Save } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "../settings-shell";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/form-fields";
import { Card, CardBody } from "@/components/ui/card";

interface MailSettingsForm {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPass: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  signatureText: string;
  signatureHtml: string;
}

const empty: MailSettingsForm = {
  imapHost: "outlook.office365.com",
  imapPort: 993,
  imapSecure: true,
  imapUser: "",
  imapPass: "",
  smtpHost: "smtp.office365.com",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPass: "",
  fromName: "Asist On",
  fromEmail: "",
  signatureText: "",
  signatureHtml: "",
};

function applyOffice365Preset(current: MailSettingsForm): MailSettingsForm {
  const email = current.fromEmail.trim();
  return {
    ...current,
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false,
    imapUser: email || current.imapUser,
    smtpUser: email || current.smtpUser,
  };
}

export default function MailSettingsPage() {
  const [form, setForm] = useState<MailSettingsForm>(empty);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/mail/settings").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setForm({
        imapHost: data.imapHost ?? "",
        imapPort: data.imapPort ?? 993,
        imapSecure: data.imapSecure ?? true,
        imapUser: data.imapUser ?? "",
        imapPass: data.imapPass ?? "",
        smtpHost: data.smtpHost ?? "",
        smtpPort: data.smtpPort ?? 587,
        smtpSecure: data.smtpSecure ?? false,
        smtpUser: data.smtpUser ?? "",
        smtpPass: data.smtpPass ?? "",
        fromName: data.fromName ?? "",
        fromEmail: data.fromEmail ?? "",
        signatureText: data.signatureText ?? "",
        signatureHtml: data.signatureHtml ?? "",
      });
      setConfigured(typeof data.configured === "boolean" ? data.configured : null);
    });
  }, []);

  function patch(p: Partial<MailSettingsForm>) {
    setForm((c) => {
      const next = { ...c, ...p };
      if ("imapPort" in p) {
        const port = p.imapPort ?? next.imapPort;
        next.imapSecure = port === 993 ? true : port === 143 ? false : next.imapSecure;
      }
      if ("smtpPort" in p) {
        const port = p.smtpPort ?? next.smtpPort;
        next.smtpSecure = port === 465 ? true : port === 587 || port === 25 ? false : next.smtpSecure;
      }
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    setTestResult(null);
    const res = await apiFetch("/api/mail/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Kaydedilemedi");
      return;
    }
    setMessage("E-posta ayarları kaydedildi.");
    setConfigured(Boolean(data.configured));
    setForm((c) => ({ ...c, imapPass: data.imapPass ?? "********", smtpPass: data.smtpPass ?? "********" }));
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestResult(null);
    setMessage(null);

    const saveRes = await apiFetch("/api/mail/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const saveData = await saveRes.json();
    if (!saveRes.ok) {
      setTesting(false);
      setError(typeof saveData.error === "string" ? saveData.error : "Ayarlar kaydedilemedi");
      return;
    }
    setConfigured(Boolean(saveData.configured));
    setForm((c) => ({ ...c, imapPass: saveData.imapPass ?? "********", smtpPass: saveData.smtpPass ?? "********" }));

    const res = await apiFetch("/api/mail/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setTesting(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Bağlantı testi başarısız");
      return;
    }
    setTestResult(typeof data.message === "string" ? data.message : "IMAP ve SMTP bağlantısı başarılı.");
    setMessage("Ayarlar kaydedildi ve bağlantı doğrulandı.");
  }

  return (
    <div>
      <PageHeader
        title="E-posta Hesabı"
        description="IMAP ile gelen kutusunu çekin, SMTP ile gönderin (Outlook / Office 365 / Gmail uyumlu)"
        breadcrumb={["Yönetim", "Ayarlar", "E-posta"]}
      />
      <SettingsNav activeHref="/ayarlar/eposta" />

      <Card>
        <CardBody>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-8">
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
                <Mail className="h-4 w-4" /> Gönderen
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Görünen ad" value={form.fromName} onChange={(e) => patch({ fromName: e.target.value })} />
                <Input
                  label="E-posta adresi"
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => {
                    const email = e.target.value;
                    patch({
                      fromEmail: email,
                      imapUser: form.imapUser || email,
                      smtpUser: form.smtpUser || email,
                    });
                  }}
                  required
                />
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">E-posta İmzası</h2>
              <div className="grid gap-4">
                <Textarea
                  label="Metin imza"
                  value={form.signatureText}
                  onChange={(e) => patch({ signatureText: e.target.value })}
                  rows={5}
                  placeholder={"Saygılarımla,\nAd Soyad\nUnvan · Firma\ntel: 0xxx xxx xx xx"}
                />
                <Textarea
                  label="HTML imza (isteğe bağlı)"
                  value={form.signatureHtml}
                  onChange={(e) => patch({ signatureHtml: e.target.value })}
                  rows={4}
                  placeholder='<p><strong>Asist On</strong><br/>Sigorta Asistans</p>'
                />
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">IMAP — Gelen</h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setForm((current) => applyOffice365Preset(current))}
                >
                  Office 365 değerlerini doldur
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Sunucu" value={form.imapHost} onChange={(e) => patch({ imapHost: e.target.value })} placeholder="outlook.office365.com" />
                <Input label="Port" type="number" value={String(form.imapPort)} onChange={(e) => patch({ imapPort: Number(e.target.value) })} />
                <Input label="Kullanıcı" value={form.imapUser} onChange={(e) => patch({ imapUser: e.target.value })} placeholder="ad@sirketiniz.com" />
                <Input label="Şifre / uygulama şifresi" type="password" value={form.imapPass} onChange={(e) => patch({ imapPass: e.target.value })} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
                <input type="checkbox" checked={form.imapSecure} onChange={(e) => patch({ imapSecure: e.target.checked })} />
                Doğrudan SSL/TLS (port 993 — port 143 için kapalı bırakın)
              </label>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">SMTP — Giden</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Sunucu" value={form.smtpHost} onChange={(e) => patch({ smtpHost: e.target.value })} placeholder="smtp.office365.com" />
                <Input label="Port" type="number" value={String(form.smtpPort)} onChange={(e) => patch({ smtpPort: Number(e.target.value) })} />
                <Input label="Kullanıcı" value={form.smtpUser} onChange={(e) => patch({ smtpUser: e.target.value })} placeholder="ad@sirketiniz.com" />
                <Input label="Şifre / uygulama şifresi" type="password" value={form.smtpPass} onChange={(e) => patch({ smtpPass: e.target.value })} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
                <input type="checkbox" checked={form.smtpSecure} onChange={(e) => patch({ smtpSecure: e.target.checked })} />
                Doğrudan SSL/TLS (port 465 — port 587 için kapalı, STARTTLS kullanılır)
              </label>
            </section>

            <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-4 text-sm text-sky-950">
              <p className="font-semibold">Office 365 kurulumu</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="font-medium text-sky-900">Sunucu ayarları</p>
                  <ul className="mt-2 space-y-1 text-sky-900/90">
                    <li>IMAP: <code className="rounded bg-white px-1">outlook.office365.com</code> · 993 · SSL açık</li>
                    <li>SMTP: <code className="rounded bg-white px-1">smtp.office365.com</code> · 587 · SSL kapalı</li>
                    <li>IMAP ve SMTP kullanıcı adı: tam Office 365 e-postanız</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-sky-900">Şifre (AUTHENTICATE failed için)</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sky-900/90">
                    <li>2 adımlı doğrulama açıksa normal şifre çalışmaz.</li>
                    <li>
                      <a className="font-semibold underline" href="https://mysignins.microsoft.com/security-info" target="_blank" rel="noreferrer">
                        Microsoft güvenlik bilgileri
                      </a>{" "}
                      sayfasından uygulama şifresi oluşturun.
                    </li>
                    <li>Aynı uygulama şifresini IMAP ve SMTP alanına yazın.</li>
                  </ol>
                </div>
              </div>
              <p className="mt-3 text-sky-900/80">
                Kurumsal tenant’ta IT yönetici panelinden posta kutunuz için <strong>IMAP</strong> ve{" "}
                <strong>Kimliği Doğrulanmış SMTP</strong> açık olmalı. Temel kimlik doğrulama (Basic Auth) kapalıysa uygulama şifresi de yetmeyebilir; IT ekibinden IMAP/SMTP erişimi isteyin.
              </p>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                <p className="font-semibold">“Login is disabled” hatası</p>
                <p className="mt-1">
                  Bu hata şifre yanlış demek değil — <strong>IMAP posta kutunuzda kapalı</strong>. Exchange yöneticinizden şunu isteyin:
                </p>
                <p className="mt-2 font-mono text-xs leading-relaxed">
                  Exchange admin → Alıcılar → Posta kutuları → [sizin hesap] → Posta → E-posta uygulamalarını yönet → <strong>IMAP: Açık</strong>
                </p>
              </div>
            </div>

            {configured === false && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Ayarlar kaydedildi ancak e-posta hesabı henüz tamamlanmadı. Tüm zorunlu alanları doldurup kaydedin.
              </div>
            )}

            {message && <p className="text-sm font-medium text-emerald-600">{message}</p>}
            {testResult && <p className="text-sm font-medium text-emerald-600">{testResult}</p>}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="accent" disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Kaydediliyor…" : "Kaydet"}
              </Button>
              <Button type="button" variant="secondary" disabled={testing} onClick={() => void handleTest()}>
                <Plug className="h-4 w-4" /> {testing ? "Test ediliyor…" : "Kaydet ve Bağlantıyı Test Et"}
              </Button>
              <Link href="/eposta" className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
                E-posta paneline git →
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
