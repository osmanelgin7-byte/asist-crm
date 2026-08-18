import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50">
      <h1 className="text-2xl font-semibold text-zinc-900">Sayfa bulunamadı</h1>
      <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
