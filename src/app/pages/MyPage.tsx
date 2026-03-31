import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Heart, Gift, Image, CreditCard, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts, getContracts, ADDRESSES } from "../../lib/contracts";
import { ethers } from "ethers";

type MyTab = "donations" | "adoptions" | "nfts" | "topup";

const TABS: { id: MyTab; icon: React.ReactNode; zh: string; en: string }[] = [
  { id: "donations", icon: <Heart size={16} />,    zh: "捐赠记录", en: "Donations" },
  { id: "adoptions", icon: <Gift size={16} />,     zh: "领养记录", en: "Adoptions" },
  { id: "nfts",      icon: <Image size={16} />,    zh: "我的 NFT", en: "My NFTs" },
  { id: "topup",     icon: <CreditCard size={16} />, zh: "充值 PURR", en: "Buy PURR" },
];

// ── 充值面板 ──────────────────────────────────────────────
function TopupPanel({ isZh, purrBalance }: { isZh: boolean; purrBalance: string }) {
  const { signer, walletAddress, refreshBalance } = useApp();
  const [amount, setAmount] = useState("0.1");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    if (!signer) { setError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const tx = await getContracts(signer).purrToken.buyTokens({ value: ethers.parseEther(amount) });
      await (tx as ethers.ContractTransactionResponse).wait();
      setSuccess(isZh ? `充值成功！` : "Top-up successful!");
      refreshBalance();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setError(isZh ? `充值失败：${msg.slice(0, 60)}` : `Failed: ${msg.slice(0, 60)}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md">
      <div className="p-5 rounded-2xl mb-5" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
        <p className="text-xs font-medium mb-1" style={{ color: "#b45309" }}>{isZh ? "当前余额" : "Current Balance"}</p>
        <p className="text-3xl font-black" style={{ color: "#F97316", fontFamily: "'Space Grotesk', sans-serif" }}>{purrBalance} <span className="text-lg">PURR</span></p>
      </div>
      <p className="text-sm mb-4" style={{ color: "#b45309" }}>
        {isZh ? "用 AVAX 购买 $PURR 代币，用于商店购买道具和装备。" : "Use AVAX to buy $PURR tokens for the in-game shop."}
      </p>
      <div className="flex gap-2 mb-3">
        {["0.05", "0.1", "0.5", "1.0"].map(v => (
          <button key={v} onClick={() => setAmount(v)} className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{
              background: amount === v ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.05)",
              border: amount === v ? "1px solid rgba(249,115,22,0.4)" : "1px solid rgba(249,115,22,0.12)",
              color: amount === v ? "#F97316" : "#b45309", cursor: "pointer",
            }}>{v} AVAX</button>
        ))}
      </div>
      <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" min="0.01"
        className="w-full px-4 py-3 rounded-xl outline-none mb-3 text-sm"
        style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#F97316" }} />
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {success && <p className="text-xs text-green-600 mb-2">{success}</p>}
      <button onClick={handleBuy} disabled={loading || !parseFloat(amount)}
        className="w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? (isZh ? "处理中..." : "Processing...") : (isZh ? `购买 ${amount} AVAX 的 PURR` : `Buy PURR for ${amount} AVAX`)}
      </button>
    </div>
  );
}

// ── NFT 展示 ──────────────────────────────────────────────
function NFTPanel({ isZh }: { isZh: boolean }) {
  const { walletAddress } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 暂时只展示说明，NFT 枚举需要更多合约支持
    setLoading(false);
  }, []);

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin" style={{ color: "#F97316" }} /></div>
      ) : (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🖼️</div>
          <p className="font-bold mb-2" style={{ color: "#92400e" }}>
            {isZh ? "NFT 展示功能开发中" : "NFT Gallery Coming Soon"}
          </p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "#b45309" }}>
            {isZh
              ? "您可以在 Snowtrace 上查看您的 NFT 资产，或在猫咪详情页进行领养和捐款操作"
              : "View your NFTs on Snowtrace, or visit cat detail pages to donate and adopt"}
          </p>
          <a
            href={`https://testnet.snowtrace.io/address/${walletAddress}#tokentxnsErc721`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: "rgba(249,115,22,0.1)", color: "#F97316", border: "1px solid rgba(249,115,22,0.2)" }}>
            <ExternalLink size={14} />
            {isZh ? "在 Snowtrace 查看" : "View on Snowtrace"}
          </a>
        </div>
      )}
    </div>
  );
}

// ── 空状态通用 ────────────────────────────────────────────
function EmptyState({ emoji, titleZh, titleEn, descZh, descEn, isZh }: {
  emoji: string; titleZh: string; titleEn: string; descZh: string; descEn: string; isZh: boolean;
}) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{emoji}</div>
      <p className="font-bold mb-2" style={{ color: "#92400e" }}>{isZh ? titleZh : titleEn}</p>
      <p className="text-sm max-w-xs mx-auto" style={{ color: "#b45309" }}>{isZh ? descZh : descEn}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export function MyPage() {
  const { tab } = useParams<{ tab: MyTab }>();
  const navigate = useNavigate();
  const { isConnected, connectWallet, lang, purrBalance } = useApp();
  const isZh = lang === "zh";
  const activeTab = (tab as MyTab) || "donations";

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fffbf5" }}>
        <Navbar />
        <div className="text-center">
          <div className="text-5xl mb-4">👛</div>
          <p className="font-bold mb-4" style={{ color: "#92400e" }}>{isZh ? "请先连接钱包" : "Connect wallet first"}</p>
          <button onClick={connectWallet} className="px-6 py-3 rounded-xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer" }}>
            {isZh ? "连接钱包" : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 mb-6 text-sm"
          style={{ color: "#b45309", cursor: "pointer" }}>
          <ArrowLeft size={16} />{isZh ? "返回档案馆" : "Back"}
        </button>

        <h1 className="text-2xl font-black mb-6" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>
          {isZh ? "我的账户" : "My Account"}
        </h1>

        {/* Tab nav */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => navigate(`/my/${t.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: activeTab === t.id ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.05)",
                border: activeTab === t.id ? "1px solid rgba(249,115,22,0.35)" : "1px solid rgba(249,115,22,0.1)",
                color: activeTab === t.id ? "#F97316" : "#b45309",
                cursor: "pointer",
              }}>
              {t.icon}
              {isZh ? t.zh : t.en}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6 rounded-3xl" style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.1)" }}>
          {activeTab === "donations" && (
            <EmptyState emoji="💝" titleZh="暂无捐赠记录" titleEn="No donations yet"
              descZh="前往猫咪档案，为你心仪的猫咪捐款，记录将在这里展示" descEn="Visit the cat registry to donate. Records will appear here." isZh={isZh} />
          )}
          {activeTab === "adoptions" && (
            <EmptyState emoji="🏠" titleZh="暂无领养记录" titleEn="No adoptions yet"
              descZh="申请线下领养后，领养流程记录将在这里展示" descEn="Apply for in-person adoption. Records will appear here." isZh={isZh} />
          )}
          {activeTab === "nfts" && <NFTPanel isZh={isZh} />}
          {activeTab === "topup" && <TopupPanel isZh={isZh} purrBalance={purrBalance} />}
        </div>
      </div>
    </div>
  );
}
