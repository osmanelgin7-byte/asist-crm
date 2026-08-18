"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { User, Lock, AlertCircle, ArrowRight, Camera, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const MOTIVATIONAL_QUOTES = [
  "Bugün attığın her adım, yarının başarısına dönüşür.",
  "Zorluklar seni yavaşlatmaz; seni güçlendirir.",
  "Kendine güven — yapabileceklerinin sınırı sandığından çok daha geniş.",
  "Harika işler, küçük ama istikrarlı adımlarla başlar.",
  "Bugün de enerjinle fark yaratacaksın.",
  "Her gün yeni bir sayfa; sen o hikâyenin kahramanısın.",
  "Başarı, vazgeçmemekten geçer — sen bunu biliyorsun.",
];

function LoginMirrorSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          activeStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(activeStream);
        setCameraError(false);
      } catch {
        setCameraError(true);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const cameraOn = !!stream && !cameraError;

  return (
    <div className="mb-8 space-y-4">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-[24px] border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-inner ring-4 ring-indigo-500/10">
        {cameraOn ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm ring-1 ring-indigo-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Canlı
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-indigo-100">
              <Camera className="h-7 w-7 text-indigo-500" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold text-indigo-600">Kamera alanı</p>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              {cameraError
                ? "Kamera açılamadı — yine de bugün harika görünüyorsun."
                : "Kamera hazırlanıyor…"}
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/40 to-transparent" />
      </div>

      <p className="text-center text-sm font-medium leading-relaxed text-zinc-600">
        Bugün ne kadar güzel göründüğünü hatırlatmak istedik.
      </p>

      <div className="rounded-2xl bg-indigo-50/80 p-4 ring-1 ring-indigo-100">
        <p className="text-center text-xs leading-relaxed text-indigo-900/80">“{quote}”</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (!result?.ok || result.error) {
        setError("Kullanıcı adı veya şifre hatalı.");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;
      const destination = session?.user?.isFirstLogin
        ? role === "PLANLAMA" ? "/" : "/raporlama"
        : callbackUrl === "/login"
          ? "/"
          : callbackUrl;

      window.location.href = destination;
    } catch {
      setError("Giriş sırasında bir hata oluştu. Sayfayı yenileyip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="login-user-field"
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 py-3.5 pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            placeholder="Kullanıcı adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="password"
            name="login-pass-field"
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 py-3.5 pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-brand group relative flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#f6f7fb]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.07) 1px, transparent 0),
            radial-gradient(ellipse 100% 80% at 0% 0%, rgba(139, 92, 246, 0.15), transparent 50%),
            radial-gradient(ellipse 80% 60% at 100% 100%, rgba(59, 130, 246, 0.1), transparent 50%)
          `,
          backgroundSize: "24px 24px, 100% 100%, 100% 100%",
        }}
      />

      <div className="relative hidden w-1/2 flex-col justify-between p-14 lg:flex">
        <div className="flex items-center gap-4">
          <BrandLogo width={200} height={58} priority />
          <div>
            <p className="text-xl font-extrabold tracking-tight text-zinc-900">{APP_NAME}</p>
            <p className="text-xs font-medium text-zinc-400">{APP_TAGLINE} Platformu</p>
          </div>
        </div>

        <div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
            <Sparkles className="h-3.5 w-3.5" />
            Yeni nesil operasyon yönetimi
          </div>
          <h1 className="max-w-lg text-5xl font-extrabold leading-[1.08] tracking-tight text-zinc-900">
            Asistans operasyonlarınızı{" "}
            <span className="text-gradient">daha hızlı</span>{" "}
            yönetin
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-500">
            Asistans dosyaları, maliyet onayları, sigorta faturaları ve koordinasyon — tüm operasyon tek panelde.
          </p>
        </div>

        <p className="text-xs font-medium text-zinc-400">© {APP_NAME}</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-[28px] border border-zinc-200/80 bg-white p-10 shadow-2xl shadow-indigo-500/10 ring-1 ring-white">
          <div className="mb-8 lg:hidden">
            <BrandLogo width={168} height={48} priority />
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900">Hoş geldiniz</h2>
          <p className="mt-2 text-sm text-zinc-500">Hesabınıza giriş yapın</p>

          <LoginMirrorSection />

          <div>
            <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
