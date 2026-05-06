"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BRAND } from "@/config/branding";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const flow = isSignUp ? "signUp" : "signIn";
      const params: Record<string, string> = { email, password, flow };
      if (isSignUp && name) params.name = name;

      await signIn("password", params);
      router.push("/");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const lower = raw.toLowerCase();
      let message: string;
      if (lower.includes("connection lost") || lower.includes("network") || lower.includes("fetch")) {
        message = "Koneksi terputus. Silakan coba lagi.";
      } else if (lower.includes("invalid account") || lower.includes("no account") || lower.includes("not found")) {
        message = "Akun tidak ditemukan. Periksa email Anda.";
      } else if (lower.includes("incorrect password") || lower.includes("wrong password") || lower.includes("invalid password")) {
        message = "Password salah. Silakan coba lagi.";
      } else if (lower.includes("already exists") || lower.includes("duplicate") || lower.includes("already registered")) {
        message = "Email sudah terdaftar. Silakan sign in.";
      } else if (lower.includes("terlalu pendek") || lower.includes("minimal")) {
        message = raw; // already in Indonesian from our custom validator
      } else if (lower.includes("unauthorized") || lower.includes("forbidden")) {
        message = "Akses ditolak.";
      } else {
        message = "Gagal masuk. Periksa kredensial Anda dan coba lagi.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#1a1333] to-[#24243e] relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#dc2648]/20 blur-[120px]" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#f97316]/15 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#6366f1]/10 blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Logo + Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#dc2648] to-[#f97316] shadow-lg shadow-[#dc2648]/30 mb-4"
            >
              <span className="text-3xl">🐔</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {BRAND.shortName}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {isSignUp ? "Daftar Akun Baru" : "Owner Control & Audit System"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-white/70"
                >
                  Nama
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#dc2648]/60 focus:border-transparent transition"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-white/70"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#dc2648]/60 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-white/70"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#dc2648]/60 focus:border-transparent transition"
              />
            </div>

            {/* Lupa password link — SARAN-01 */}
            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword((value) => !value)}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Lupa password?
                </button>
              </div>
            )}
            {showForgotPassword && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-xs text-blue-300">
                Hubungi administrator untuk reset password Anda.
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#dc2648] to-[#f97316] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#dc2648]/25 hover:shadow-[#dc2648]/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Memproses…
                </span>
              ) : (
                isSignUp ? "Daftar" : "Masuk"
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-xs text-white/40 mt-6">
            {isSignUp ? "Sudah punya akun?" : "Butuh akun owner baru?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setShowForgotPassword(false);
              }}
              className="text-[#f97316] hover:underline font-medium"
            >
              {isSignUp ? "Masuk" : "Daftar"}
            </button>
          </p>
          <p className="text-center text-[11px] text-white/25 mt-3">
            Gunakan email yang telah diotorisasi administrator.
          </p>
        </div>

        {/* Subtle branding */}
        <p className="text-center text-[10px] text-white/20 mt-4">
          © {new Date().getFullYear()} {BRAND.shortName} · Powered by Convex
        </p>
      </motion.div>
    </div>
  );
}
