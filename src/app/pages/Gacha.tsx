import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Sparkles, ArrowLeft, Loader2, Package } from "lucide-react";
import { ethers } from "ethers";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getContracts, getReadonlyContracts } from "../../lib/contracts";

// 稀有度配置
const RARITY_CONFIG = {
  0: { label: "普通", labelEn: "Common",    color: "#9CA3AF", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.2)" },
  1: { label: "精良", labelEn: "Fine",      color: "#34D399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.2)"  },
  2: { label: "稀有", labelEn: "Rare",      color: "#60A5FA", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.2)"  },
  3: { label: "传说", labelEn: "Legendary", color: "#FBBF24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)"  },
};

const SLOT_CONFIG = {
  0: { label: "武器", labelEn: "Weapon", icon: "⚔️" },
  1: { label: "背包", labelEn: "Bag",    icon: "🎒" },
  2: { label: "靴子", labelEn: "Boots",  icon: "👟" },
};

interface GachaResult {
  tokenId: number;
  slot: number;
  rarity: number;
  name: string;
  lore: string;
  rarityBonus: number;
  carryBonus: number;
  speedBonus: number;
}

export function Gacha() {
  const navigate = useNavigate();
  const { isConnected, signer, walletAddress, lang } = useApp();
  const isZh = lang === "zh";

  const [tickets, setTickets] = useState<number | null>(null);
  const [materials, setMaterials] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取票券和碎片数量
  const loadStats = async () => {
    if (!walletAddress) return;
    try {
      const c = getReadonlyContracts();
      const [t, m] = await Promise.all([
        c.gameContract.gachaTickets(walletAddress),
        c.gameContract.materialBalance(walletAddress),
      ]);
      setTickets(Number(t));
      setMaterials(Number(m));
    } catch { /* ignore */ }
  };

  useState(() => { loadStats(); });

  // 合成碎片换票券
  const handleMerge = async () => {
    if (!signer || !materials || materials < 10) return;
    setIsMerging(true); setError(null);
    try {
      const c = getContracts(signer);
      const tx = await c.gameContract.mergeFragments(1);
      await (tx as ethers.ContractTransactionResponse).wait();
      await loadStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setError(isZh ? "合成失败" : "Merge failed");
    } finally {
      setIsMerging(false);
    }
  };

  // 抽卡
  const handleGacha = async () => {
    if (!signer || !tickets || tickets < 1) return;
    setIsRolling(true); setError(null); setResult(null);

    try {
      const c = getContracts(signer);

      // 记录抽卡前 equipmentNFT 的 totalSupply，抽卡后对比拿到新 tokenId
      const totalBefore = Number(await getReadonlyContracts().equipmentNFT.ownerOf(0).catch(() => -1));

      const tx = await c.gameContract.gacha();
      const receipt = await (tx as ethers.ContractTransactionResponse).wait();

      // 从 GachaResult 事件读 equipTokenId
      let equipTokenId: number | null = null;
      if (receipt) {
        for (const log of receipt.logs) {
          try {
            const iface = new ethers.Interface([
              "event GachaResult(address indexed player, uint256 equipTokenId, uint8 rarity)"
            ]);
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (parsed) {
              equipTokenId = Number(parsed.args[1]);
              break;
            }
          } catch { /* not this log */ }
        }
      }

      if (equipTokenId !== null) {
        const eq = await getReadonlyContracts().equipmentNFT.getEquipment(equipTokenId);
        const e = eq as { slot: number; rarity: number; name: string; lore: string; rarityBonus: number; safetyBonus: number; carryBonus: number; speedBonus: number };
        setResult({
          tokenId: equipTokenId,
          slot: e.slot,
          rarity: e.rarity,
          name: e.name,
          lore: e.lore,
          rarityBonus: e.rarityBonus,
          carryBonus: e.carryBonus,
          speedBonus: e.speedBonus,
        });
        setShowResult(true);
      }

      await loadStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setError(isZh ? "抽卡失败，请重试" : "Gacha failed, please retry");
    } finally {
      setIsRolling(false);
      void totalBefore; // suppress unused warning
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#060614", fontFamily: "'Nunito', sans-serif" }}>
      <Navbar />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #F59E0B 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 pt-24 pb-16">

        <motion.button
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 text-sm"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft size={16} />
          {isZh ? "返回" : "Back"}
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="text-5xl mb-3">✨</div>
          <h1 className="text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.8rem" }}>
            {isZh ? "装备抽卡" : "Equipment Gacha"}
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            {isZh ? "消耗抽卡券获得随机装备 NFT" : "Spend tickets to get random equipment NFTs"}
          </p>
        </motion.div>

        {/* 资产卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl text-center"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="text-3xl mb-1" style={{ color: "#FBBF24", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              {tickets === null ? "..." : tickets}
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              {isZh ? "🎟️ 抽卡券" : "🎟️ Tickets"}
            </div>
          </div>
          <div className="p-5 rounded-2xl text-center"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div className="text-3xl mb-1" style={{ color: "#A78BFA", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              {materials === null ? "..." : materials}
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              {isZh ? "🔩 材料碎片" : "🔩 Fragments"}
            </div>
          </div>
        </div>

        {/* 合成按钮 */}
        <div className="mb-6 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white mb-1">{isZh ? "碎片合成" : "Merge Fragments"}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {isZh ? "10 碎片 → 1 抽卡券" : "10 fragments → 1 ticket"}
              </div>
            </div>
            <button onClick={handleMerge}
              disabled={isMerging || !materials || materials < 10 || !isConnected}
              className="px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              style={{
                background: materials && materials >= 10 && isConnected ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: materials && materials >= 10 && isConnected ? "#A78BFA" : "rgba(255,255,255,0.3)",
                cursor: materials && materials >= 10 && isConnected ? "pointer" : "not-allowed",
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
              {isMerging && <Loader2 size={14} className="animate-spin" />}
              <Package size={14} />
              {isZh ? "合成" : "Merge"}
            </button>
          </div>
        </div>

        {/* 稀有度说明 */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {Object.entries(RARITY_CONFIG).map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl text-center"
              style={{ background: v.bg, border: `1px solid ${v.border}` }}>
              <div className="text-xs mb-1" style={{ color: v.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {isZh ? v.label : v.labelEn}
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {k === "3" ? "3%" : k === "2" ? "12%" : k === "1" ? "25%" : "60%"}
              </div>
            </div>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-center"
            style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        {/* 抽卡按钮 */}
        {!isConnected ? (
          <div className="text-center text-sm py-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            {isZh ? "请先连接钱包" : "Connect wallet first"}
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: tickets && tickets > 0 ? 1.02 : 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGacha}
            disabled={isRolling || !tickets || tickets < 1}
            className="w-full py-5 rounded-2xl text-white text-base flex items-center justify-center gap-3"
            style={{
              background: tickets && tickets > 0
                ? "linear-gradient(135deg, #F59E0B, #EC4899, #7C3AED)"
                : "rgba(255,255,255,0.05)",
              boxShadow: tickets && tickets > 0 ? "0 0 40px rgba(245,158,11,0.3)" : "none",
              cursor: tickets && tickets > 0 ? "pointer" : "not-allowed",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {isRolling ? (
              <><Loader2 size={20} className="animate-spin" /> {isZh ? "抽取中..." : "Rolling..."}</>
            ) : (
              <><Sparkles size={20} /> {isZh ? "抽取装备（消耗 1 券）" : "Roll Equipment (1 ticket)"}</>
            )}
          </motion.button>
        )}

        {/* 获取票券提示 */}
        <div className="mt-6 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-xs mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {isZh ? "如何获得抽卡券" : "How to get tickets"}
          </div>
          {[
            { icon: "🐱", zh: "持有猫咪 NFT 每 7 天领取 1 张", en: "Hold Cat NFT → claim 1/week" },
            { icon: "💰", zh: "每消费 50 PURR 奖励 1 张", en: "Spend 50 PURR → earn 1 ticket" },
            { icon: "🔩", zh: "10 个材料碎片合成 1 张", en: "10 fragments → merge 1 ticket" },
          ].map((item) => (
            <div key={item.zh} className="flex items-center gap-2 py-1.5 text-xs"
              style={{ color: "rgba(255,255,255,0.45)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span>{item.icon}</span>
              <span>{isZh ? item.zh : item.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 抽卡结果弹窗 */}
      <AnimatePresence>
        {showResult && result && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="relative w-full max-w-sm rounded-3xl p-8 text-center"
              style={{
                background: `linear-gradient(145deg, #0D0D2B, ${RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.bg ?? "rgba(124,58,237,0.1)"})`,
                border: `1px solid ${RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.border ?? "rgba(167,139,250,0.2)"}`,
                boxShadow: `0 0 60px ${RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.color ?? "#A78BFA"}40`,
              }}
            >
              <div className="text-5xl mb-4">
                {SLOT_CONFIG[result.slot as keyof typeof SLOT_CONFIG]?.icon ?? "📦"}
              </div>
              <div className="text-xs mb-2 px-3 py-1 rounded-full inline-block"
                style={{
                  background: RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.bg,
                  color: RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.color,
                  border: `1px solid ${RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.border}`,
                  fontFamily: "'Space Grotesk', sans-serif"
                }}>
                {isZh
                  ? RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.label
                  : RARITY_CONFIG[result.rarity as keyof typeof RARITY_CONFIG]?.labelEn}
                {" · "}
                {isZh
                  ? SLOT_CONFIG[result.slot as keyof typeof SLOT_CONFIG]?.label
                  : SLOT_CONFIG[result.slot as keyof typeof SLOT_CONFIG]?.labelEn}
              </div>
              <h2 className="text-white text-xl mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {result.name}
              </h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                {result.lore}
              </p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { label: isZh ? "稀有度加成" : "Rarity+", value: `+${(result.rarityBonus / 100).toFixed(1)}%` },
                  { label: isZh ? "携带量加成" : "Carry+",  value: `+${(result.carryBonus  / 100).toFixed(1)}%` },
                  { label: isZh ? "速度加成"   : "Speed+",  value: `+${(result.speedBonus  / 100).toFixed(1)}%` },
                ].map((stat) => (
                  <div key={stat.label} className="p-2 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{stat.label}</div>
                    <div className="text-sm" style={{ color: "#A78BFA", fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowResult(false)}
                className="w-full py-3 rounded-2xl text-white text-sm"
                style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                {isZh ? "收入背包" : "Collect"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
