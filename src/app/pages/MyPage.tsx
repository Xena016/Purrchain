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
// NFT 类型标签
const NFT_TYPE_LABEL: Record<number, { zh: string; en: string; color: string }> = {
  0: { zh: "Starter",       en: "Starter",        color: "#888" },
  1: { zh: "云领养",         en: "CloudAdopted",   color: "#F97316" },
  2: { zh: "Genesis ✨",     en: "Genesis ✨",      color: "#a855f7" },
  3: { zh: "全家福",         en: "FamilyPortrait", color: "#16a34a" },
  4: { zh: "初始猫",         en: "StarterCat",     color: "#0ea5e9" },
  5: { zh: "收藏",           en: "Collection",     color: "#f59e0b" },
};

interface NFTItem {
  tokenId: number;
  nftType: number;
  stage: number;
  image: string;
  name: string;
}

async function ipfsToHttp(uri: string): Promise<string> {
  if (!uri) return "";
  return uri.startsWith("ipfs://")
    ? uri.replace("ipfs://", "https://ipfs.io/ipfs/")
    : uri;
}

async function fetchNFTImage(tokenURIValue: string): Promise<string> {
  if (!tokenURIValue) return "";
  try {
    const url = await ipfsToHttp(tokenURIValue);
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const json = await res.json() as { image?: string; name?: string };
    return json.image ? await ipfsToHttp(json.image) : "";
  } catch { return ""; }
}

function NFTPanel({ isZh }: { isZh: boolean }) {
  const { walletAddress } = useApp();
  const [loading,  setLoading]  = useState(true);
  const [nfts,     setNfts]     = useState<NFTItem[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!walletAddress) { setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      setLoading(true); setNfts([]);
      try {
        const { getReadonlyContracts } = await import("../../lib/contracts");
        const c = getReadonlyContracts();
        const total = Number(await c.catNFT.totalSupply());
        setProgress(0);

        const found: NFTItem[] = [];
        // 批量查询，每批 10 个
        for (let i = 0; i < total; i += 10) {
          if (cancelled) return;
          const batch = Array.from({ length: Math.min(10, total - i) }, (_, j) => i + j);
          await Promise.all(batch.map(async (tokenId) => {
            try {
              const owner = await c.catNFT.ownerOf(tokenId);
              if ((owner as string).toLowerCase() !== walletAddress.toLowerCase()) return;
              const info = await c.catNFT.nftInfo(tokenId) as {
                nftType: bigint; stage: bigint; tokenURIValue: string;
              };
              const nftType = Number(info.nftType);
              const stage   = Number(info.stage);
              const image   = await fetchNFTImage(info.tokenURIValue);
              const typeInfo = NFT_TYPE_LABEL[nftType];
              const name = stage > 0
                ? `${typeInfo?.zh ?? "NFT"} Stage ${stage}`
                : (typeInfo?.zh ?? "NFT");
              found.push({ tokenId, nftType, stage, image, name });
            } catch { /* token已销毁或其他错误，跳过 */ }
          }));
          setProgress(Math.round(((i + 10) / total) * 100));
        }

        if (!cancelled) setNfts(found.sort((a, b) => b.tokenId - a.tokenId));
      } catch (e) {
        console.error("NFT load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [walletAddress]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 size={28} className="animate-spin" style={{ color: "#F97316" }} />
      <p className="text-sm" style={{ color: "#b45309" }}>
        {isZh ? `正在读取链上 NFT…（${Math.min(progress, 100)}%）` : `Loading NFTs… (${Math.min(progress, 100)}%)`}
      </p>
    </div>
  );

  if (!walletAddress || nfts.length === 0) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🖼️</div>
      <p className="font-bold mb-2" style={{ color: "#92400e" }}>{isZh ? "暂无 NFT" : "No NFTs yet"}</p>
      <p className="text-sm max-w-xs mx-auto mb-4" style={{ color: "#b45309" }}>
        {isZh ? "领取全家福、捐款云领养或完成线下领养后将在此显示" : "NFTs from portrait claims, donations, or adoptions will appear here"}
      </p>
      <a href={`https://testnet.snowtrace.io/address/${walletAddress}#tokentxnsErc721`}
        target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
        style={{ background: "rgba(249,115,22,0.1)", color: "#F97316", border: "1px solid rgba(249,115,22,0.2)" }}>
        <ExternalLink size={14} />{isZh ? "在 Snowtrace 查看" : "View on Snowtrace"}
      </a>
    </div>
  );

  return (
    <div>
      <p className="text-sm mb-4 font-medium" style={{ color: "#b45309" }}>
        {isZh ? `共 ${nfts.length} 个 NFT` : `${nfts.length} NFTs`}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {nfts.map(nft => {
          const typeInfo = NFT_TYPE_LABEL[nft.nftType];
          return (
            <div key={nft.tokenId} className="rounded-2xl overflow-hidden"
              style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.12)" }}>
              {/* 图片 */}
              <div className="aspect-square relative overflow-hidden"
                style={{ background: "rgba(249,115,22,0.06)" }}>
                {nft.image ? (
                  <img src={nft.image} alt={nft.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🐱</div>
                )}
              </div>
              {/* 信息 */}
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${typeInfo?.color ?? "#888"}18`, color: typeInfo?.color ?? "#888", border: `1px solid ${typeInfo?.color ?? "#888"}30` }}>
                    {isZh ? typeInfo?.zh : typeInfo?.en}
                  </span>
                </div>
                <p className="text-xs font-bold truncate" style={{ color: "#92400e" }}>{nft.name}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: "#d97706" }}>#{nft.tokenId}</p>
              </div>
            </div>
          );
        })}
      </div>
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
