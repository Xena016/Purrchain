import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ethers } from "ethers";
import {
  ArrowLeft, Heart, Home, Gamepad2, MapPin,
  AlertCircle, CheckCircle, X, Loader2, ExternalLink
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getContracts, getReadonlyContracts, ADDRESSES } from "../../lib/contracts";
import { chainStatusToLocal, getStatusLabel, type ChainCat, type CatStatus } from "../data/cats";

// ============================================================
//  从链上读单只猫
// ============================================================

function useCat(id: number) {
  const [cat, setCat] = useState<ChainCat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const c = getReadonlyContracts();
        const raw = await c.catRegistry.getCat(id) as {
          name: string; age: bigint; gender: string; description: string;
          stageURIs: string[]; shelter: string; status: number;
        };
        const uris = Array.from(raw.stageURIs) as string[];
        const stage = (uris.reduce((last, uri, idx) =>
          uri && uri !== "" ? idx + 1 : last, 1)) as 1 | 2 | 3 | 4;

        const firstUri = uris.find(u => u && u !== "") ?? "";
        let image = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80";
        if (firstUri) {
          try {
            const httpUri = firstUri.startsWith("ipfs://")
              ? firstUri.replace("ipfs://", "https://ipfs.io/ipfs/") : firstUri;
            const res = await fetch(httpUri, { signal: AbortSignal.timeout(5000) });
            const json = await res.json() as { image?: string };
            if (json.image) {
              image = json.image.startsWith("ipfs://")
                ? json.image.replace("ipfs://", "https://ipfs.io/ipfs/") : json.image;
            }
          } catch { /* fallback */ }
        }

        setCat({
          id, name: raw.name, age: Number(raw.age),
          gender: raw.gender === "female" ? "female" : "male",
          description: raw.description, stageURIs: uris,
          shelter: raw.shelter, shelterLocation: "",
          status: chainStatusToLocal(raw.status),
          image, stage, isOnChain: true,
        });
      } catch { setCat(null); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  return { cat, loading };
}

function Modal({ onClose, title, children }: {
  onClose: () => void; title: string; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md rounded-3xl p-6"
        style={{ background: "linear-gradient(145deg, #12102b, #1a1535)", border: "1px solid rgba(126,200,227,0.2)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ background: "rgba(109,58,238,0.08)", color: "#7c7aaa" }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ============================================================
//  主组件
// ============================================================

export function CatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    isConnected, connectWallet, signer, walletAddress,
    starterCatClaimed, claimStarterCat, starterCatId,
    purrBalance, lang,
  } = useApp();

  const isZh = lang === "zh";
  const catId = Number(id);
  const { cat, loading } = useCat(catId);

  const [showAdoptModal,  setShowAdoptModal]  = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showGameModal,   setShowGameModal]   = useState(false);
  const [donateAmount, setDonateAmount]       = useState("0.1");
  const [txLoading, setTxLoading]             = useState(false);
  const [txSuccess, setTxSuccess]             = useState<string | null>(null);
  const [txError,   setTxError]               = useState<string | null>(null);
  const [donationTotal,    setDonationTotal]    = useState("0");
  const [remainingToNext,  setRemainingToNext]  = useState("0.1");

  useEffect(() => {
    if (!walletAddress || !cat) return;
    getReadonlyContracts().donationVault.userCatDonation(walletAddress, catId)
      .then(v => setDonationTotal(parseFloat(ethers.formatEther(v as bigint)).toFixed(3)))
      .catch(() => {});
    getReadonlyContracts().donationVault.remainingToNextStage(walletAddress, catId)
      .then(v => setRemainingToNext(parseFloat(ethers.formatEther(v as bigint)).toFixed(3)))
      .catch(() => {});
  }, [walletAddress, catId, cat]);

  const handleDonate = async () => {
    if (!signer) { setTxError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setTxLoading(true); setTxError(null); setTxSuccess(null);
    try {
      const tx = await getContracts(signer).donationVault.donate(catId,
        { value: ethers.parseEther(donateAmount) });
      await (tx as ethers.ContractTransactionResponse).wait();
      setTxSuccess(isZh ? `感谢您的爱心！已捐赠 ${donateAmount} AVAX` : `Donated ${donateAmount} AVAX!`);
      const c2 = getReadonlyContracts();
      Promise.all([
        c2.donationVault.userCatDonation(walletAddress!, catId),
        c2.donationVault.remainingToNextStage(walletAddress!, catId),
      ]).then(([t, r]) => {
        setDonationTotal(parseFloat(ethers.formatEther(t as bigint)).toFixed(3));
        setRemainingToNext(parseFloat(ethers.formatEther(r as bigint)).toFixed(3));
      });
      setTimeout(() => { setShowDonateModal(false); setTxSuccess(null); }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected"))
        setTxError(isZh ? `捐款失败：${msg.slice(0, 80)}` : `Failed: ${msg.slice(0, 80)}`);
    } finally { setTxLoading(false); }
  };

  const handleApply = async () => {
    if (!signer) { setTxError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setTxLoading(true); setTxError(null); setTxSuccess(null);
    try {
      const tx = await getContracts(signer).adoptionVault.applyAdoption(catId);
      await (tx as ethers.ContractTransactionResponse).wait();
      setTxSuccess(isZh ? "领养申请已提交！等待机构审核" : "Application submitted!");
      setTimeout(() => { setShowAdoptModal(false); setTxSuccess(null); }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("not available")) setTxError(isZh ? "该猫咪当前无法申请领养" : "Not available");
      else if (msg.includes("already exists")) setTxError(isZh ? "已提交过申请" : "Already applied");
      else if (!msg.includes("user rejected"))
        setTxError(isZh ? `申请失败：${msg.slice(0, 80)}` : `Failed: ${msg.slice(0, 80)}`);
    } finally { setTxLoading(false); }
  };

  const handleGameEnter = async () => {
    if (!starterCatClaimed) await claimStarterCat(catId);
    setShowGameModal(false);
    navigate(`/game/${catId}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f5ff" }}>
      <Navbar />
      <Loader2 size={32} className="animate-spin" style={{ color: "#7ec8e3" }} />
    </div>
  );

  if (!cat) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f5ff" }}>
      <Navbar />
      <div className="text-center pt-20">
        <div className="text-5xl mb-4">😿</div>
        <p className="text-white text-xl">{isZh ? "找不到这只猫咪" : "Cat not found"}</p>
        <button onClick={() => navigate("/dashboard")} className="mt-4 text-sm" style={{ color: "#7ec8e3" }}>
          ← {isZh ? "返回档案馆" : "Back"}
        </button>
      </div>
    </div>
  );

  const isAdopted = cat.status === "adopted" || cat.status === "pendingAdoption";
  const statusLabel = getStatusLabel(cat.status, lang);
  const isMyStarterCat = starterCatId === cat.id;
  const STATUS_COLOR: Record<CatStatus, string> = {
    available: "#4ecdc4", cloudAdopted: "#f7a541",
    pendingAdoption: "#a855f7", adopted: "#888888",
  };
  const statusColor = STATUS_COLOR[cat.status];

  return (
    <div className="min-h-screen pt-20" style={{ background: "#f7f5ff" }}>
      <Navbar />

      <AnimatePresence>
        {txError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl text-sm flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", backdropFilter: "blur(12px)" }}>
            <AlertCircle size={14} />{txError}
            <button onClick={() => setTxError(null)} className="ml-2"><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 mb-6 text-sm" style={{ color: "#7c7aaa" }}>
          <ArrowLeft size={16} />{isZh ? "返回档案馆" : "Back to Registry"}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left */}
          <div>
            <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "1" }}>
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover"
                style={{ filter: isAdopted ? "grayscale(20%)" : "none" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,8,25,0.6), transparent 60%)" }} />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs"
                  style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                  {isAdopted && <Home size={10} className="inline mr-1" />}{statusLabel}
                </span>
                <span className="px-3 py-1 rounded-full text-xs"
                  style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
                  Stage {cat.stage}
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl" style={{ background: "rgba(109,58,238,0.03)", border: "1px solid rgba(109,58,238,0.06)" }}>
              <p className="text-sm mb-3" style={{ color: "#7ec8e3" }}>{isZh ? "成长阶段 NFT" : "Growth Stage NFT"}</p>
              <div className="flex gap-2">
                {[{ n: 1, zh: "幼", en: "Kit" }, { n: 2, zh: "少", en: "Jun" }, { n: 3, zh: "成", en: "Adu" }, { n: 4, zh: "✨", en: "✨" }].map(({ n, zh, en }) => (
                  <div key={n} className="flex-1 py-2 px-1 rounded-xl text-center text-xs"
                    style={{
                      background: n <= cat.stage ? "rgba(168,85,247,0.15)" : "rgba(109,58,238,0.03)",
                      border: n <= cat.stage ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(109,58,238,0.06)",
                      color: n <= cat.stage ? "#a855f7" : "#444466",
                    }}>{isZh ? zh : en}</div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl text-xs space-y-1.5"
              style={{ background: "rgba(126,200,227,0.05)", border: "1px solid rgba(126,200,227,0.1)" }}>
              <p style={{ color: "#7ec8e3" }}>🔗 {isZh ? "链上信息" : "On-chain"} (Fuji)</p>
              <p style={{ color: "#7c7aaa" }}>Cat ID: #{cat.id}</p>
              <p style={{ color: "#7c7aaa" }}>{cat.shelter.slice(0, 10)}...{cat.shelter.slice(-6)}</p>
              <a href={`https://testnet.snowtrace.io/address/${ADDRESSES.catRegistry}`}
                target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-1" style={{ color: "#7ec8e3" }}>
                <ExternalLink size={10} />{isZh ? "在浏览器查看" : "View on Explorer"}
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-4xl mb-1" style={{ color: "#1e1b4b", fontWeight: 900 }}>{cat.name}</h1>
              <p className="text-sm" style={{ color: "#7c7aaa" }}>
                {cat.gender === "male" ? "♂ 公猫" : "♀ 母猫"} · {cat.age < 1 ? `${Math.round(cat.age * 12)} 月龄` : `${cat.age} 岁`}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ color: "#4c4980" }}>
              <MapPin size={14} style={{ color: "#7ec8e3" }} />
              <span>{isZh ? "收容机构：" : "Shelter: "}<span style={{ color: "#7ec8e3" }}>{cat.shelter.slice(0, 6)}...{cat.shelter.slice(-4)}</span></span>
            </div>

            <div className="p-5 rounded-2xl" style={{ background: "rgba(109,58,238,0.03)", border: "1px solid rgba(109,58,238,0.06)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#4c4980" }}>{cat.description}</p>
            </div>

            {walletAddress && (
              <div className="p-4 rounded-2xl" style={{ background: "rgba(247,165,65,0.07)", border: "1px solid rgba(247,165,65,0.15)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={14} color="#ff6b6b" />
                  <span className="text-sm font-bold" style={{ color: "#f7a541" }}>{isZh ? "我的捐款进度" : "My Donation"}</span>
                </div>
                <p className="text-xs" style={{ color: "#7c7aaa" }}>
                  {isZh ? "已累计：" : "Total: "}<span style={{ color: "#f7a541" }}>{donationTotal} AVAX</span>
                  {" · "}{isZh ? "距下阶段：" : "Next: "}<span style={{ color: "#4ecdc4" }}>{remainingToNext} AVAX</span>
                </p>
              </div>
            )}

            {!isConnected ? (
              <button onClick={connectWallet} className="w-full py-4 rounded-2xl text-white font-bold"
                style={{ background: "linear-gradient(135deg, #7ec8e3, #a855f7)", cursor: "pointer" }}>
                {isZh ? "🔗 连接钱包以互动" : "Connect Wallet"}
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button onClick={() => !isAdopted && setShowAdoptModal(true)} disabled={isAdopted}
                  className="flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-bold"
                  style={{
                    background: isAdopted ? "rgba(136,136,136,0.1)" : "linear-gradient(135deg, rgba(78,205,196,0.2), rgba(126,200,227,0.2))",
                    border: isAdopted ? "1px solid rgba(136,136,136,0.2)" : "1px solid rgba(78,205,196,0.4)",
                    color: isAdopted ? "#555" : "#4ecdc4", cursor: isAdopted ? "default" : "pointer",
                  }}>
                  <Home size={20} />
                  {isAdopted ? (isZh ? "🏠 此猫咪已有家" : "🏠 Has a Home") : (isZh ? "申请线下领养" : "Apply to Adopt")}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => !isAdopted && setShowDonateModal(true)} disabled={isAdopted}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl transition-all font-semibold"
                    style={{
                      background: isAdopted ? "rgba(136,136,136,0.08)" : "rgba(247,165,65,0.15)",
                      border: isAdopted ? "1px solid rgba(136,136,136,0.15)" : "1px solid rgba(247,165,65,0.35)",
                      color: isAdopted ? "#444" : "#f7a541", cursor: isAdopted ? "default" : "pointer",
                    }}>
                    <Heart size={18} />{isAdopted ? (isZh ? "已关闭" : "Closed") : (isZh ? "爱心捐款" : "Donate")}
                  </button>

                  <button onClick={() => setShowGameModal(true)}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl transition-all font-semibold"
                    style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.35)", color: "#a855f7", cursor: "pointer" }}>
                    <Gamepad2 size={18} />{isZh ? "进入游戏" : "Play Game"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 领养 Modal */}
      <AnimatePresence>
        {showAdoptModal && (
          <Modal onClose={() => { setShowAdoptModal(false); setTxSuccess(null); }} title={isZh ? "🏠 线下领养申请" : "Apply to Adopt"}>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: "#4c4980" }}>
              {isZh ? "提交后机构将与您联系。审核通过需缴纳 0.1 AVAX 保证金（锁定 1 年），回访通过退还并获得 Genesis NFT。"
                : "Shelter will contact you after submission. 0.1 AVAX deposit required (1 year lock)."}
            </p>
            {(isZh ? ["提交申请 → 猫咪状态变为申请中", "机构审核通过 → 缴纳 0.1 AVAX 保证金", "一年后回访通过 → 退还保证金 + 获得 Genesis NFT"]
              : ["Submit → Cat status = Pending", "Shelter approves → Pay 0.1 AVAX deposit", "Home visit passed → Deposit returned + Genesis NFT"]
            ).map((step, i) => (
              <div key={i} className="flex items-start gap-3 mb-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5"
                  style={{ background: "rgba(78,205,196,0.2)", color: "#4ecdc4" }}>{i + 1}</div>
                <p className="text-sm" style={{ color: "#4c4980" }}>{step}</p>
              </div>
            ))}
            <div className="mt-4">
              {txSuccess ? (
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#6EE7B7" }}>
                  <CheckCircle size={16} /><span className="text-sm">{txSuccess}</span>
                </div>
              ) : (
                <button onClick={handleApply} disabled={txLoading}
                  className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #4ecdc4, #7ec8e3)", cursor: "pointer", opacity: txLoading ? 0.7 : 1 }}>
                  {txLoading && <Loader2 size={16} className="animate-spin" />}
                  {isZh ? "确认提交领养申请" : "Submit Application"}
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* 捐款 Modal */}
      <AnimatePresence>
        {showDonateModal && (
          <Modal onClose={() => { setShowDonateModal(false); setTxSuccess(null); }} title={isZh ? `💝 捐款给 ${cat.name}` : `Donate to ${cat.name}`}>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: "#4c4980" }}>
              {isZh ? "捐款通过 DonationVault 直接转入机构钱包，平台完全不经手。每累计 0.1 AVAX 自动解锁成长阶段 NFT。"
                : "Funds go directly to the shelter. Every 0.1 AVAX = one Growth NFT auto-minted."}
            </p>
            <div className="flex gap-2 mb-3">
              {["0.05", "0.1", "0.5", "1.0"].map(v => (
                <button key={v} onClick={() => setDonateAmount(v)} className="flex-1 py-2 rounded-xl text-sm"
                  style={{
                    background: donateAmount === v ? "rgba(247,165,65,0.2)" : "rgba(109,58,238,0.06)",
                    border: donateAmount === v ? "1px solid rgba(247,165,65,0.5)" : "1px solid rgba(109,58,238,0.08)",
                    color: donateAmount === v ? "#f7a541" : "#9090b0", cursor: "pointer",
                  }}>{v}</button>
              ))}
            </div>
            <input value={donateAmount} onChange={e => setDonateAmount(e.target.value)}
              type="number" step="0.01" min="0.01"
              className="w-full px-4 py-3 rounded-xl outline-none mb-3"
              style={{ background: "rgba(109,58,238,0.06)", border: "1px solid rgba(247,165,65,0.2)", color: "#f7a541" }} />
            <div className="p-3 rounded-xl mb-4 text-sm"
              style={{ background: "rgba(78,205,196,0.06)", border: "1px solid rgba(78,205,196,0.15)", color: "#7c7aaa" }}>
              {isZh ? "已累计：" : "Total: "}<span style={{ color: "#f7a541" }}>{donationTotal} AVAX</span>
              {" · "}{isZh ? "距下阶段：" : "Next: "}<span style={{ color: "#4ecdc4" }}>{remainingToNext} AVAX</span>
            </div>
            {txSuccess ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
                style={{ background: "rgba(236,72,153,0.1)", color: "#F9A8D4" }}>
                <Heart size={16} /><span className="text-sm">{txSuccess}</span>
              </div>
            ) : (
              <button onClick={handleDonate} disabled={txLoading || !parseFloat(donateAmount)}
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #f7a541, #ff6b6b)", cursor: "pointer", opacity: txLoading ? 0.7 : 1 }}>
                {txLoading && <Loader2 size={16} className="animate-spin" />}
                {txLoading ? (isZh ? "链上处理中..." : "Processing...") : (isZh ? `❤️ 捐款 ${donateAmount} AVAX` : `Donate ${donateAmount} AVAX`)}
              </button>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* 游戏 Modal */}
      <AnimatePresence>
        {showGameModal && (
          <Modal onClose={() => setShowGameModal(false)} title={isZh ? "🎮 进入游戏" : "Enter Game"}>
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 0 30px rgba(168,85,247,0.4)" }}>
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-sm mb-3 text-white font-bold">
                {isZh ? `选择 ${cat.name} 作为游戏伙伴` : `Choose ${cat.name} as companion`}
              </p>
              {!starterCatClaimed ? (
                <div className="space-y-2 mb-4 text-left">
                  {[
                    { icon: "🎁", zh: `${cat.name} StarterCat NFT（免费）`, en: `${cat.name} StarterCat NFT (free)` },
                    { icon: "🖼️", zh: `Stage ${cat.stage} 成长 NFT（免费）`, en: `Stage ${cat.stage} Growth NFT (free)` },
                    { icon: "🎮", zh: "解锁放置类游戏", en: "Unlock idle game" },
                  ].map(item => (
                    <div key={item.zh} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.15)" }}>
                      <span>{item.icon}</span>
                      <span className="text-xs text-white">{isZh ? item.zh : item.en}</span>
                    </div>
                  ))}
                </div>
              ) : isMyStarterCat ? (
                <p className="text-sm mb-4" style={{ color: "#4c4980" }}>
                  {isZh ? `继续与 ${cat.name} 的冒险！` : `Continue with ${cat.name}!`}
                </p>
              ) : (
                <div className="p-3 rounded-xl mb-4 text-left"
                  style={{ background: "rgba(247,165,65,0.1)", border: "1px solid rgba(247,165,65,0.2)" }}>
                  <p className="text-xs" style={{ color: "#f7a541" }}>
                    {isZh ? `已有初始猫咪，将切换到 ${cat.name}（余额: ${purrBalance} PURR）`
                      : `Will switch to ${cat.name} (Balance: ${purrBalance} PURR)`}
                  </p>
                </div>
              )}
              <button onClick={handleGameEnter} disabled={txLoading}
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #a855f7, #7ec8e3)", cursor: "pointer", opacity: txLoading ? 0.7 : 1 }}>
                {txLoading && <Loader2 size={16} className="animate-spin" />}
                🚀 {isZh ? "出发！" : "Let's go!"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
