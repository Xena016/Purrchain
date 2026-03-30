import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Search, Filter, Wallet, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { WelcomeNFTModal } from "../components/WelcomeNFTModal";
import { CatCard } from "../components/CatCard";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts } from "../../lib/contracts";

// ============================================================
//  类型
// ============================================================

export type CatStatus = "available" | "cloudAdopted" | "pendingAdoption" | "adopted";

export interface ChainCat {
  id: number;
  name: string;
  age: number;
  gender: string;
  description: string;
  stageURIs: string[];
  shelter: string;
  status: CatStatus;
  // 以下为前端展示用，从 stageURIs 解析或用占位
  image: string;
  stage: 1 | 2 | 3 | 4;
}

// 链上 status 数字 → 前端字符串
function toStatus(n: number): CatStatus {
  switch (n) {
    case 0: return "available";
    case 1: return "cloudAdopted";
    case 2: return "pendingAdoption";
    case 3: return "adopted";
    default: return "available";
  }
}

// 根据 stageURIs 判断当前 stage
function inferStage(uris: string[]): 1 | 2 | 3 | 4 {
  if (uris[3] && uris[3] !== "") return 4;
  if (uris[2] && uris[2] !== "") return 3;
  if (uris[1] && uris[1] !== "") return 2;
  return 1;
}

// IPFS URI → HTTP 网关
function ipfsToHttp(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

// 从 metadata JSON 拿图片，fallback 到 unsplash 占位图
async function fetchImageFromMetadata(metaUri: string): Promise<string> {
  const FALLBACK = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80";
  if (!metaUri) return FALLBACK;
  try {
    const httpUri = ipfsToHttp(metaUri);
    const res = await fetch(httpUri, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    if (json.image) return ipfsToHttp(json.image as string);
  } catch {
    // 网络问题或超时，使用 fallback
  }
  return FALLBACK;
}

// 状态标签（中文）
export function getStatusLabel(status: CatStatus, lang: "zh" | "en" = "zh"): string {
  if (lang === "en") {
    switch (status) {
      case "available": return "Available";
      case "cloudAdopted": return "Cloud Adopted";
      case "pendingAdoption": return "Pending";
      case "adopted": return "Adopted";
    }
  }
  switch (status) {
    case "available": return "待领养";
    case "cloudAdopted": return "云领养中";
    case "pendingAdoption": return "领养申请中";
    case "adopted": return "已领养";
  }
}

export function getStatusColor(status: CatStatus): string {
  switch (status) {
    case "available": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "cloudAdopted": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
    case "pendingAdoption": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "adopted": return "text-purple-400 bg-purple-400/10 border-purple-400/30";
  }
}

// ============================================================
//  主组件
// ============================================================

const STATUS_FILTERS_ZH = [
  { label: "全部", value: "all" as const },
  { label: "待领养", value: "available" as const },
  { label: "云领养中", value: "cloudAdopted" as const },
  { label: "领养中", value: "pendingAdoption" as const },
  { label: "已领养", value: "adopted" as const },
];

const STATUS_FILTERS_EN = [
  { label: "All", value: "all" as const },
  { label: "Available", value: "available" as const },
  { label: "Cloud Adopted", value: "cloudAdopted" as const },
  { label: "Pending", value: "pendingAdoption" as const },
  { label: "Adopted", value: "adopted" as const },
];

export function Dashboard() {
  const { isConnected, nftClaimed, connectWallet, lang } = useApp();
  const navigate = useNavigate();
  const isZh = lang === "zh";

  const [showNFTModal, setShowNFTModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatStatus | "all">("all");
  const [cats, setCats] = useState<ChainCat[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // ── 从链上读取猫咪列表 ──────────────────────────────────

  const loadCats = useCallback(async () => {
    setLoadingCats(true);
    setCatError(null);
    try {
      const c = getReadonlyContracts();
      const total = Number(await c.catRegistry.catCount());
      if (total === 0) {
        setCats([]);
        return;
      }

      // 并行读取所有猫咪
      const promises = Array.from({ length: total }, (_, i) =>
        c.catRegistry.getCat(i)
      );
      const rawCats = await Promise.all(promises);

      // 并行拉取图片（从 stageURIs[0] 的 metadata 中取）
      const parsed: ChainCat[] = await Promise.all(
        rawCats.map(async (raw, i) => {
          const r = raw as {
            id: bigint; name: string; age: number; gender: string;
            description: string; stageURIs: string[]; shelter: string; status: number;
          };
          const uris = Array.from(r.stageURIs) as string[];
          const stage = inferStage(uris);
          // 找第一个有值的 URI 取图片
          const firstUri = uris.find((u) => u && u !== "") ?? "";
          const image = await fetchImageFromMetadata(firstUri);
          return {
            id: i,
            name: r.name,
            age: r.age,
            gender: r.gender,
            description: r.description,
            stageURIs: uris,
            shelter: r.shelter, // 这里是地址，后续可查 shelters mapping 获取名称
            status: toStatus(r.status),
            image,
            stage,
          };
        })
      );

      setCats(parsed);
    } catch (err) {
      console.error("读取猫咪列表失败:", err);
      setCatError(isZh ? "读取链上数据失败，请检查网络" : "Failed to load chain data");
    } finally {
      setLoadingCats(false);
    }
  }, [isZh]);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  // ── 新用户弹窗 ────────────────────────────────────────────

  useEffect(() => {
    if (isConnected && !nftClaimed) {
      const timer = setTimeout(() => setShowNFTModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isConnected, nftClaimed]);

  // ── 过滤 ──────────────────────────────────────────────────

  const filtered = cats.filter((cat) => {
    const matchSearch =
      search === "" ||
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || cat.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_FILTERS = isZh ? STATUS_FILTERS_ZH : STATUS_FILTERS_EN;

  // ── 未连接状态 ────────────────────────────────────────────

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
              {isZh ? "请先连接钱包" : "Connect Your Wallet"}
            </h2>
            <p className="mb-8 text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Nunito', sans-serif" }}>
              {isZh
                ? "连接 MetaMask 钱包以浏览猫咪档案并参与互动"
                : "Connect MetaMask to browse cats and interact on-chain"}
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
              {isZh ? "连接钱包" : "Connect Wallet"}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── 主界面 ────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "#060614", fontFamily: "'Nunito', sans-serif" }}>
      <Navbar />
      {showNFTModal && <WelcomeNFTModal onClose={() => setShowNFTModal(false)} />}

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96"
          style={{ background: "linear-gradient(to bottom, rgba(124,58,237,0.08) 0%, transparent 100%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
                🐾 {isZh ? "猫咪档案" : "Cat Registry"}
              </h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                {loadingCats
                  ? (isZh ? "加载中..." : "Loading...")
                  : `${isZh ? "共" : "Total"} ${filtered.length} ${isZh ? "只猫咪" : "cats"}`}
              </p>
            </div>
            <button
              onClick={loadCats}
              disabled={loadingCats}
              className="p-2 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
              title={isZh ? "刷新链上数据" : "Refresh chain data"}
            >
              <RefreshCw size={16} className={loadingCats ? "animate-spin" : ""} />
            </button>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Search size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
              placeholder={isZh ? "搜索猫咪名、描述..." : "Search cats..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontFamily: "'Nunito', sans-serif" }}
            />
          </div>
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

        {/* Error */}
        {catError && (
          <div className="mb-6 p-4 rounded-2xl text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5" }}>
            {catError}
          </div>
        )}

        {/* Loading skeleton */}
        {loadingCats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", height: 380 }} />
            ))}
          </div>
        )}

        {/* Cat Grid */}
        {!loadingCats && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((cat, i) => (
              <CatCard key={cat.id} cat={cat} index={i} onClick={() => navigate(`/cat/${cat.id}`)} />
            ))}
          </div>
        )}

        {!loadingCats && filtered.length === 0 && !catError && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito', sans-serif" }}>
              {isZh ? "没有找到匹配的猫咪" : "No cats found"}
            </p>
          </div>
        )}

        {/* Stats bar */}
        {!loadingCats && cats.length > 0 && (
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isZh ? "待领养" : "Available", count: cats.filter((c) => c.status === "available").length, color: "#10B981" },
              { label: isZh ? "云领养中" : "Cloud Adopted", count: cats.filter((c) => c.status === "cloudAdopted").length, color: "#06B6D4" },
              { label: isZh ? "申请中" : "Pending", count: cats.filter((c) => c.status === "pendingAdoption").length, color: "#F59E0B" },
              { label: isZh ? "已领养" : "Adopted", count: cats.filter((c) => c.status === "adopted").length, color: "#A78BFA" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-2xl mb-1" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                  {s.count}
                </div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
