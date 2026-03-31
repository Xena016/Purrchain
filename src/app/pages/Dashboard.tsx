import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import { NFTWelcomeModal } from "../components/NFTWelcomeModal";
import { Search, MapPin, Heart, Gamepad2, Home, Loader2 } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { getReadonlyContracts } from "../../lib/contracts";
import { CATS, chainStatusToLocal, type ChainCat } from "../data/cats";

// ============================================================
//  类型
// ============================================================

// 统一用链上格式的 status（大写）
type ChainStatus = "Available" | "CloudAdopted" | "PendingAdoption" | "Adopted";

interface DisplayCat {
  id: number;
  name: string;
  age: number;
  gender: "male" | "female";
  desc: string;
  shelter: string;
  shelterLocation: string;
  image: string;
  stage: number;
  status: ChainStatus;
  isOnChain: boolean; // true = 链上真实数据，false = 演示假数据
}

// ============================================================
//  常量
// ============================================================

const STATUS_LABELS: Record<ChainStatus, { label: string; color: string; bg: string }> = {
  Available:       { label: "待领养",  color: "#4ecdc4", bg: "rgba(78,205,196,0.1)" },
  CloudAdopted:    { label: "已云领养", color: "#f7a541", bg: "rgba(247,165,65,0.1)" },
  PendingAdoption: { label: "申请中",  color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  Adopted:         { label: "已有家",  color: "#888",    bg: "rgba(136,136,136,0.1)" },
};

// cats.ts 里的 status 映射到链上格式（用于假数据转换）
const STATUS_MAP: Record<string, ChainStatus> = {
  available:       "Available",
  cloudAdopted:    "CloudAdopted",
  pendingAdoption: "PendingAdoption",
  adopted:         "Adopted",
};

const GENDER_LABEL = { male: "♂ 公猫", female: "♀ 母猫" };

// ============================================================
//  假数据转换为统一格式（用于演示）
// ============================================================

const MOCK_CATS: DisplayCat[] = CATS.map(c => ({
  id: c.id,
  name: c.name,
  age: c.age,
  gender: c.gender,
  desc: c.desc,
  shelter: c.shelter,
  shelterLocation: c.shelterLocation,
  image: c.image,
  stage: c.stage,
  status: STATUS_MAP[c.status] ?? "Available",
  isOnChain: false,
}));

// ============================================================
//  Component
// ============================================================

export function Dashboard() {
  const { nftClaimed, isConnected } = useApp();
  const [showModal, setShowModal] = useState(!nftClaimed && isConnected);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [cats, setCats] = useState<DisplayCat[]>(MOCK_CATS);
  const [chainLoading, setChainLoading] = useState(true);

  // ── 从链上读取真实猫咪数据，覆盖对应 id 的假数据 ──────────

  useEffect(() => {
    const loadOnChainCats = async () => {
      try {
        setChainLoading(true);
        const c = getReadonlyContracts();
        const countRaw = await c.catRegistry.catCount();
        const count = Number(countRaw);
        if (count === 0) return;

        const onChainCats: DisplayCat[] = [];
        for (let i = 0; i < count; i++) {
          try {
            const cat = await c.catRegistry.getCat(i) as {
              id: bigint;
              name: string;
              age: bigint;
              gender: string;
              description: string;
              stageURIs: string[];
              shelter: string;
              status: number;
            };

            // 从 stageURIs 判断当前阶段（找最后一个非空 URI 的位置）
            const stage = cat.stageURIs.reduce((last, uri, idx) =>
              uri && uri !== "" ? idx + 1 : last, 1
            );

            // 找对应的假数据取图片（链上没存图片 URL，用假数据的图作为展示）
            const mockMatch = MOCK_CATS.find(m => m.id === Number(cat.id));

            onChainCats.push({
              id: Number(cat.id),
              name: cat.name,
              age: Number(cat.age),
              gender: (cat.gender === "female" ? "female" : "male") as "male" | "female",
              desc: cat.description,
              shelter: cat.shelter, // 链上存的是 shelter 地址，显示时截短
              shelterLocation: mockMatch?.shelterLocation ?? "",
              image: mockMatch?.image ?? "",
              stage,
              status: STATUS_MAP[chainStatusToLocal(cat.status)] ?? "Available",
              isOnChain: true,
            });
          } catch {
            // 单只猫读取失败，跳过
          }
        }

        // 合并：链上数据覆盖假数据里相同 id 的条目，其余假数据补在后面
        setCats(prev => {
          const onChainIds = new Set(onChainCats.map(c => c.id));
          const mockRest = prev.filter(m => !onChainIds.has(m.id));
          return [...onChainCats, ...mockRest];
        });
      } catch (err) {
        console.error("读取链上猫咪数据失败:", err);
        // 失败就继续用假数据
      } finally {
        setChainLoading(false);
      }
    };

    loadOnChainCats();
  }, []);

  // ── 过滤 ────────────────────────────────────────────────

  const filtered = cats.filter(cat => {
    const matchSearch =
      cat.name.includes(search) ||
      cat.shelter.toLowerCase().includes(search.toLowerCase()) ||
      cat.shelterLocation.includes(search);
    const matchStatus = filterStatus === "all" || cat.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "#f7f5ff" }}>
      <Navbar />
      {showModal && <NFTWelcomeModal onClose={() => setShowModal(false)} />}

      <div className="px-6 py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl" style={{ color: "#1e1b4b", fontWeight: 800 }}>
              🐾 猫咪档案馆
            </h1>
            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: "#7c7aaa" }}>
              {chainLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  正在读取链上数据...
                </>
              ) : (
                <>
                  {filtered.length} 只猫咪等待您的关注 · 由{" "}
                  <span style={{ color: "#7ec8e3" }}>CatRegistry.sol</span> 链上存储
                </>
              )}
            </p>
          </div>

          {!nftClaimed && isConnected && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm animate-pulse"
              style={{
                background: "linear-gradient(135deg, #f7a541, #ff6b6b)",
                color: "#1e1b4b",
                fontWeight: 700,
                cursor: "pointer",
                animationDuration: "2s",
              }}
            >
              🎁 领取全家福 NFT + 20 PURR
            </button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#7c7aaa" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索猫咪名字、收容机构..."
              className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
              style={{
                background: "rgba(109,58,238,0.06)",
                border: "1px solid #ddd6fe",
                color: "#1e1b4b",
              }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { val: "all",            label: "全部" },
              { val: "Available",      label: "待领养" },
              { val: "CloudAdopted",   label: "已云领养" },
              { val: "Adopted",        label: "已有家" },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setFilterStatus(f.val)}
                className="px-4 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: filterStatus === f.val ? "rgba(126,200,227,0.2)" : "rgba(109,58,238,0.04)",
                  border: filterStatus === f.val ? "1px solid rgba(126,200,227,0.4)" : "1px solid rgba(109,58,238,0.06)",
                  color: filterStatus === f.val ? "#7ec8e3" : "#6060a0",
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(cat => {
            const statusInfo = STATUS_LABELS[cat.status] ?? STATUS_LABELS.Available;
            const isAdopted = cat.status === "Adopted";

            return (
              <Link
                key={cat.id}
                to={`/cat/${cat.id}`}
                className="group block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl"
                style={{
                  background: "rgba(109,58,238,0.03)",
                  border: cat.isOnChain
                    ? "1px solid rgba(126,200,227,0.2)"
                    : "1px solid rgba(126,200,227,0.08)",
                }}
              >
                {/* Cat Image */}
                <div className="relative overflow-hidden" style={{ height: "200px" }}>
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      style={{ filter: isAdopted ? "grayscale(40%)" : "none" }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl"
                      style={{ background: "rgba(126,200,227,0.05)" }}>
                      🐱
                    </div>
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,8,25,0.7), transparent)" }} />

                  {/* Status badge */}
                  <div
                    className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs"
                    style={{
                      background: statusInfo.bg,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.color}33`,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {isAdopted && <Home size={10} className="inline mr-1" />}
                    {statusInfo.label}
                  </div>

                  {/* Stage badge */}
                  <div
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs"
                    style={{
                      background: "rgba(168,85,247,0.2)",
                      color: "#a855f7",
                      border: "1px solid rgba(168,85,247,0.3)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    Stage {cat.stage}
                  </div>

                  {/* 链上真实数据标记 */}
                  {cat.isOnChain && (
                    <div
                      className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-xs"
                      style={{
                        background: "rgba(78,205,196,0.15)",
                        color: "#4ecdc4",
                        border: "1px solid rgba(78,205,196,0.3)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      ⛓ 链上
                    </div>
                  )}
                </div>

                {/* Cat Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="text-lg" style={{ color: "#1e1b4b", fontWeight: 700 }}>
                      {cat.name}
                    </h3>
                    <p className="text-xs" style={{ color: "#7c7aaa" }}>
                      {GENDER_LABEL[cat.gender]} · {cat.age}岁
                    </p>
                  </div>

                  <p className="text-sm mb-3 line-clamp-2" style={{ color: "#8080a0", lineHeight: 1.6 }}>
                    {cat.desc}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "#7c7aaa" }}>
                      <MapPin size={12} />
                      {cat.shelterLocation || cat.shelter.slice(0, 10) + "..."}
                    </div>
                  </div>

                  {/* Quick action hint */}
                  <div
                    className="mt-3 pt-3 flex items-center gap-2 text-xs"
                    style={{ borderTop: "1px solid rgba(109,58,238,0.06)" }}
                  >
                    {cat.isOnChain && !isAdopted ? (
                      <span style={{ color: "#7ec8e3" }}>
                        <Heart size={12} className="inline mr-1" />
                        可捐款 / 领养
                        <span className="mx-1">·</span>
                        <Gamepad2 size={12} className="inline mr-1" />
                        进入游戏
                      </span>
                    ) : isAdopted ? (
                      <span style={{ color: "#888" }}>🏠 此猫咪已找到家庭</span>
                    ) : (
                      <span style={{ color: "#404060" }}>演示数据 · 功能不可用</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && !chainLoading && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p style={{ color: "#7c7aaa" }}>没有找到符合条件的猫咪</p>
          </div>
        )}
      </div>
    </div>
  );
}
