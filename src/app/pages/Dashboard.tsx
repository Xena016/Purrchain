import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Filter, Wallet } from "lucide-react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { WelcomeNFTModal } from "../components/WelcomeNFTModal";
import { CatCard } from "../components/CatCard";
import { CATS, CatStatus } from "../data/cats";
import { useApp } from "../context/AppContext";

const STATUS_FILTERS: { label: string; value: CatStatus | "all" }[] = [
  { label: "全部", value: "all" },
  { label: "待领养", value: "available" },
  { label: "云领养中", value: "cloudAdopted" },
  { label: "领养中", value: "pendingAdoption" },
  { label: "已领养", value: "adopted" },
];

export function Dashboard() {
  const { isConnected, nftClaimed, connectWallet } = useApp();
  const navigate = useNavigate();
  const [showNFTModal, setShowNFTModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatStatus | "all">("all");

  useEffect(() => {
    if (isConnected && !nftClaimed) {
      const timer = setTimeout(() => setShowNFTModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isConnected, nftClaimed]);

  const filtered = CATS.filter((cat) => {
    const matchSearch =
      search === "" ||
      cat.name.includes(search) ||
      cat.shelter.includes(search) ||
      cat.shelterLocation.includes(search) ||
      cat.personality.some((p) => p.includes(search));
    const matchStatus = statusFilter === "all" || cat.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen" style={{ background: "#060614" }}>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-6xl mb-6">🔐</div>
            <h2 className="mb-3 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              请先连接钱包
            </h2>
            <p className="mb-8 text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Nunito', sans-serif" }}>
              连接 MetaMask 钱包以浏览猫咪档案并参与互动
            </p>
            <button
              onClick={connectWallet}
              className="flex items-center gap-2 mx-auto px-8 py-4 rounded-2xl text-white"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                boxShadow: "0 0 30px rgba(124,58,237,0.4)",
                fontFamily: "'Space Grotesk', sans-serif"
              }}
            >
              <Wallet size={18} />
              连接钱包
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#060614", fontFamily: "'Nunito', sans-serif" }}>
      <Navbar />

      {showNFTModal && <WelcomeNFTModal onClose={() => setShowNFTModal(false)} />}

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96"
          style={{ background: "linear-gradient(to bottom, rgba(124,58,237,0.08) 0%, transparent 100%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
            🐾 猫咪档案
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            共 {filtered.length} 只猫咪 · 找到你的缘分猫咪
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Search size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
              placeholder="搜索猫咪名、性格、机构..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontFamily: "'Nunito', sans-serif" }}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter size={14} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className="px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all"
                style={{
                  background: statusFilter === f.value ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                  border: statusFilter === f.value ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: statusFilter === f.value ? "#A78BFA" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Space Grotesk', sans-serif"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cat Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((cat, i) => (
              <CatCard key={cat.id} cat={cat} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito', sans-serif" }}>
              没有找到匹配的猫咪
            </p>
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "待领养", count: CATS.filter((c) => c.status === "available").length, color: "#10B981" },
            { label: "云领养中", count: CATS.filter((c) => c.status === "cloudAdopted").length, color: "#06B6D4" },
            { label: "领养申请中", count: CATS.filter((c) => c.status === "pendingAdoption").length, color: "#F59E0B" },
            { label: "已领养", count: CATS.filter((c) => c.status === "adopted").length, color: "#A78BFA" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="text-2xl mb-1" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                {s.count}
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
