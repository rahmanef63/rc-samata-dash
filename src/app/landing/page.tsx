"use client";

import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Upload,
  Shield,
  Smartphone,
  TrendingUp,
  PieChart,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Upload & Parse Otomatis",
    desc: "Drop file Excel laporan mingguan — 15+ sheet langsung ter-parse dan masuk database.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Real-Time",
    desc: "KPI, grafik penjualan, food cost, dan cashflow waterfall terupdate otomatis.",
  },
  {
    icon: PieChart,
    title: "Analisis Mendalam",
    desc: "Data browser untuk explore semua tabel, HPP vs margin, cost analysis per item.",
  },
  {
    icon: Shield,
    title: "Validasi & Audit",
    desc: "8 validasi otomatis saat upload. Deteksi duplikat, anomali, dan inkonsistensi.",
  },
  {
    icon: TrendingUp,
    title: "Tren & Perbandingan",
    desc: "Bandingkan performa antar periode. Lihat tren 7 hari dan 30 hari.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First PWA",
    desc: "Install di HP seperti aplikasi native. Responsif di semua ukuran layar.",
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // If already logged in, go to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#1a1333] to-[#24243e] text-white overflow-hidden">
      {/* Decorative blobs */}
      <div className="fixed -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#dc2648]/15 blur-[150px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#f97316]/10 blur-[150px] pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#6366f1]/8 blur-[120px] pointer-events-none" />

      {/* ─── Nav ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#dc2648] to-[#f97316] flex items-center justify-center shadow-lg shadow-[#dc2648]/30">
            <span className="text-xl">🐔</span>
          </div>
          <span className="font-bold text-lg tracking-tight">RC Samata</span>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-medium hover:bg-white/[0.14] transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* ─── Hero ─── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-16 pb-20 md:pt-24 md:pb-28"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs text-white/60 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Owner Control & Audit System
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Kontrol Penuh{" "}
          <span className="bg-gradient-to-r from-[#dc2648] to-[#f97316] bg-clip-text text-transparent">
            Operasional Cabang
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload laporan Excel mingguan, dapatkan insight real-time — omzet, food cost, HPP, margin, dan cashflow. Semua dalam satu dashboard.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#dc2648] to-[#f97316] text-base font-semibold shadow-xl shadow-[#dc2648]/25 hover:shadow-[#dc2648]/40 transition-all active:scale-[0.98]"
          >
            Mulai Sekarang
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
          >
            Lihat Fitur
            <ChevronRight className="h-4 w-4" />
          </button>
        </motion.div>
      </motion.section>

      {/* ─── Dashboard Preview ─── */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative z-10 max-w-5xl mx-auto px-6 pb-20"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-4 md:p-6 shadow-2xl">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Total Sales", val: "Rp 42.5M", color: "from-blue-500 to-cyan-400" },
              { label: "Food Cost", val: "31.2%", color: "from-green-500 to-emerald-400" },
              { label: "Net Profit", val: "Rp 8.7M", color: "from-purple-500 to-pink-400" },
              { label: "Expenses", val: "Rp 33.8M", color: "from-orange-500 to-amber-400" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 md:p-4">
                <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-lg md:text-2xl font-bold mt-1 bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
                  {kpi.val}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 h-32 flex items-end">
              <div className="flex items-end gap-1 w-full h-full">
                {[40, 55, 45, 70, 60, 80, 65].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-[#dc2648]/60 to-[#f97316]/40"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 h-32 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-[#dc2648]/40 border-t-[#f97316] animate-[spin_3s_linear_infinite]" />
              <div className="ml-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="w-3 h-3 rounded bg-[#dc2648]/60" /> Bahan Baku
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="w-3 h-3 rounded bg-[#f97316]/60" /> Gaji & HR
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="w-3 h-3 rounded bg-[#6366f1]/60" /> Operasional
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Features ─── */}
      <motion.section
        id="features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
        className="relative z-10 max-w-6xl mx-auto px-6 pb-24"
      >
        <motion.div variants={fadeUp} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Semua yang Anda Butuhkan
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Dari upload Excel sampai analisis HPP — satu platform untuk seluruh operasional cabang.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#dc2648]/20 to-[#f97316]/20 flex items-center justify-center mb-4 group-hover:from-[#dc2648]/30 group-hover:to-[#f97316]/30 transition-colors">
                <f.icon className="h-5 w-5 text-[#f97316]" />
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-gradient-to-r from-[#dc2648]/20 to-[#f97316]/20 border border-white/[0.1] p-10 md:p-14 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Siap Mengontrol Cabang Anda?
          </h2>
          <p className="text-white/40 mb-8 max-w-lg mx-auto">
            Upload laporan pertama Anda dan lihat dashboard terisi data real dalam hitungan detik.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#dc2648] to-[#f97316] font-semibold shadow-xl shadow-[#dc2648]/25 hover:shadow-[#dc2648]/40 transition-all active:scale-[0.98]"
          >
            Masuk Dashboard
            <ArrowRight className="h-5 w-5" />
          </button>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/30">
            <span>🐔</span>
            <span>&copy; {new Date().getFullYear()} RC Samata Gowa</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <span>Powered by Next.js + Convex</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
