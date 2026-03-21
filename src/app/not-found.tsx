import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
        <span className="text-3xl">404</span>
      </div>
      <h1 className="text-xl font-semibold">Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
