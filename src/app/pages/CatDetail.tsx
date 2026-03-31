import { useState } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ethers } from "ethers";
import {
  ArrowLeft, Heart, Home, Gamepad2, MapPin,
  Syringe, Scale, AlertCircle, CheckCircle, X, Coins, Loader2
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getContracts, getReadonlyContracts } from "../../lib/contracts";
import { getStatusLabel, getStatusColor, chainStatusToLocal, type ChainCat } from "../data/cats";

// ============================================================
//  Hook：从链上读单只猫数据
// ============================================================

import { useEffect } from "react";

function useCat(id: number) {
  const [cat, setCat] = useState<ChainCat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const c = getReadonlyContracts();
        const raw = await c.catRegistry.getCat(id);
        const r = raw as {
          id: bigint; name: string; age: number; gender: string;
          description: string; stageURIs: string[]; shelter: string; status: number;
        };
        const uris = Array.from(r.stageURIs) as string[];

        // 判断 stage
        let stage: 1 | 2 | 3 | 4 = 1;
        if (uris[3] && uris[3] !== "") stage = 4;
        else if (uris[2] && uris[2] !== "") stage = 3;
        else if (uris[1] && uris[1] !== "") stage = 2;

        // 取图片
        const firstUri = uris.find((u) => u && u !== "") ?? "";
        let image = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80";
        if (firstUri) {
          try {
            const httpUri = firstUri.startsWith("ipfs://")
              ? firstUri.replace("ipfs://", "https://ipfs.io/ipfs/")
              : firstUri;
            const res = await fetch(httpUri, { signal: AbortSignal.timeout(5000) });
            const json = await res.json();
            if (json.image) {
              image = (json.image as string).startsWith("ipfs://")
                ? (json.image as string).replace("ipfs://", "https://ipfs.io/ipfs/")
                : json.image as string;
            }
          } catch { /* fallback */ }
        }

        setCat({
          id,
          name: r.name,
          age: Number(r.age),
          gender: r.gender,
          description: r.description,
          stageURIs: uris,
          shelter: r.shelter,
          shelterLocation: "",
          status: chainStatusToLocal(r.status),
          image,
          stage,
          isOnChain: true,
        });
      } catch (err) {
        console.error("读取猫咪详情失败:", err);
        setCat(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return { cat, loading };
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
    purrBalance, lang, refreshBalance,
  } = useApp();

  const isZh = lang === "zh";
  const catId = Number(id);
  const { cat, loading } = useCat(catId);

  const [showAdoptModal, setShowAdoptModal]   = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showGameModal, setShowGameModal]     = useState(false);
  const [donateAmount, setDonateAmount]       = useState("0.1");

  // 操作状态
  const [txLoading, setTxLoading]   = useState(false);
  const [txSuccess, setTxSuccess]   = useState<string | null>(null);
  const [txError, setTxError]       = useState<string | null>(null);

  // ── 捐款 ─────────────────────────────────────────────────

  const handleDonate = async () => {
    if (!signer || !walletAddress) { setTxError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setTxLoading(true); setTxError(null); setTxSuccess(null);
    try {
      const c = getContracts(signer);
      const amountWei = ethers.parseEther(donateAmount);
      const tx = await c.donationVault.donate(catId, { value: amountWei });
      await (tx as ethers.ContractTransactionResponse).wait();
      setTxSuccess(isZh ? `感谢你的爱心！已捐赠 ${donateAmount} AVAX` : `Donated ${donateAmount} AVAX, thank you!`);
      setTimeout(() => { setShowDonateModal(false); setTxSuccess(null); }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) {
        setTxError(isZh ? `捐款失败：${msg.slice(0, 60)}` : `Donate failed: ${msg.slice(0, 60)}`);
      }
    } finally {
      setTxLoading(false);
    }
  };

  // ── 领养申请 ──────────────────────────────────────────────

  const handleApply = async () => {
    if (!signer || !walletAddress) { setTxError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setTxLoading(true); setTxError(null); setTxSuccess(null);
    try {
      const c = getContracts(signer);
      const tx = await c.adoptionVault.applyAdoption(catId);
      await (tx as ethers.ContractTransactionResponse).wait();
      setTxSuccess(isZh ? "领养申请已提交！等待机构审核" : "Application submitted! Awaiting shelter approval");
      setTimeout(() => { setShowAdoptModal(false); setTxSuccess(null); }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("not available")) {
        setTxError(isZh ? "该猫咪当前无法申请领养" : "Cat not available for adoption");
      } else if (!msg.includes("user rejected")) {
        setTxError(isZh ? `申请失败：${msg.slice(0, 60)}` : `Failed: ${msg.slice(0, 60)}`);
      }
    } finally {
      setTxLoading(false);
    }
  };

  // ── 进入游戏 ──────────────────────────────────────────────

  const handleGameEnter = async () => {
    if (!starterCatClaimed) {
      await claimStarterCat(catId);
    }
    setShowGameModal(false);
    navigate(`/game/${catId}`);
  };

  // ── Loading / 404 ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060614" }}>
        <Navbar />
        <Loader2 size={32} className="animate-spin" style={{ color: "#A78BFA" }} />
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060614" }}>
        <Navbar />
        <div className="text-center pt-20">
          <div className="text-5xl mb-4">😿</div>
          <p className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {isZh ? "找不到这只猫咪" : "Cat not found"}
          </p>
          <button onClick={() => navigate("/dashboard")} className="mt-4 text-purple-400 text-sm">
            ← {isZh ? "返回档案" : "Back"}
          </button>
        </div>
      </div>
    );
  }

  const isAdopted    = cat.status === "adopted" || cat.status === "pendingAdoption";
  const statusLabel  = getStatusLabel(cat.status, lang);
  const statusColor  = getStatusColor(cat.status);
  const isMyStarterCat = starterCatId === cat.id;

  return (
    <div className="min-h-screen" style={{ background: "#060614", fontFamily: "'Nunito', sans-serif" }}>
      <Navbar />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[60vh]"
          style={{ background: "linear-gradient(to bottom, rgba(124,58,237,0.1) 0%, transparent 100%)" }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mb-6 text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft size={16} />
          {isZh ? "返回档案列表" : "Back to Registry"}
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left: Image */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="relative rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 0 60px rgba(124,58,237,0.3)" }}>
              <img src={cat.image} alt={cat.name} className="w-full h-80 lg:h-[420px] object-cover" />
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, transparent 60%, rgba(6,6,20,0.7) 100%)" }} />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className={`px-3 py-1 rounded-full text-xs border ${statusColor}`}
                  style={{ backdropFilter: "blur(8px)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {statusLabel}
                </div>
                <div className="px-2 py-1 rounded-full text-xs"
                  style={{ background: "rgba(0,0,0,0.5)", color: "#A78BFA", backdropFilter: "blur(8px)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Stage {cat.stage}
                </div>
              </div>
            </div>

            {/* Stage progress */}
            <div className="mt-4 p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {isZh ? "成长阶段" : "Growth Stage"}
                </span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Stage {cat.stage} / 4</span>
              </div>
              <div className="flex gap-2">
                {[
                  { n: 1, zh: "幼猫", en: "Kitten" },
                  { n: 2, zh: "少年", en: "Junior" },
                  { n: 3, zh: "成年", en: "Adult" },
                  { n: 4, zh: "创世", en: "Genesis" },
                ].map(({ n, zh, en }) => (
                  <div key={n} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-1.5 rounded-full"
                      style={{ background: n <= cat.stage ? "linear-gradient(90deg, #7C3AED, #06B6D4)" : "rgba(255,255,255,0.1)" }} />
                    <span className="text-xs" style={{
                      color: n <= cat.stage ? "#A78BFA" : "rgba(255,255,255,0.2)",
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>{isZh ? zh : en}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Info */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem" }}>
                  {cat.name}
                </h1>
                <span className="text-2xl">{cat.gender === "female" ? "♀" : "♂"}</span>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span>{cat.age < 1 ? `${Math.round(cat.age * 12)} ${isZh ? "月龄" : "mo"}` : `${cat.age} ${isZh ? "岁" : "yr"}`}</span>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <MapPin size={13} />
                  {/* shelter 是地址，显示缩短版 */}
                  <span>{cat.shelter.slice(0, 6)}...{cat.shelter.slice(-4)}</span>
                </div>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>
              {cat.description}
            </p>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: <Syringe size={14} />, label: isZh ? "疫苗" : "Vaccine", value: isZh ? "链上存档" : "On-chain" },
                { icon: <Scale size={14} />, label: isZh ? "来源" : "Source", value: isZh ? "已认证机构" : "Certified" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-1 mb-1" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem" }}>
                    {item.icon}
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.label}</span>
                  </div>
                  <div className="text-sm text-white">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            {!isConnected ? (
              <button onClick={connectWallet}
                className="w-full py-4 rounded-2xl text-white text-sm mb-3"
                style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                {isZh ? "连接钱包以互动" : "Connect Wallet to Interact"}
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                {/* 领养 */}
                <button
                  onClick={() => !isAdopted && setShowAdoptModal(true)}
                  disabled={isAdopted}
                  className="w-full py-4 rounded-2xl text-white text-sm flex items-center justify-center gap-2"
                  style={{
                    background: isAdopted ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #10B981, #06B6D4)",
                    color: isAdopted ? "rgba(255,255,255,0.3)" : "white",
                    cursor: isAdopted ? "not-allowed" : "pointer",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                  <Home size={16} />
                  {isAdopted
                    ? (isZh ? "已有家庭" : "Has a Home")
                    : (isZh ? "线下领养申请" : "Apply to Adopt")}
                </button>

                {/* 捐款 */}
                <button
                  onClick={() => !isAdopted && setShowDonateModal(true)}
                  disabled={isAdopted}
                  className="w-full py-4 rounded-2xl text-white text-sm flex items-center justify-center gap-2"
                  style={{
                    background: isAdopted ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #EC4899, #7C3AED)",
                    color: isAdopted ? "rgba(255,255,255,0.3)" : "white",
                    cursor: isAdopted ? "not-allowed" : "pointer",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                  <Heart size={16} />
                  {isZh ? "爱心捐赠 (AVAX)" : "Donate (AVAX)"}
                </button>

                {/* 游戏 */}
                <button
                  onClick={() => setShowGameModal(true)}
                  className="w-full py-4 rounded-2xl text-white text-sm flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.3)",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                  <Gamepad2 size={16} />
                  {isZh ? "选择此猫进入游戏" : "Play with this Cat"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* 全局错误提示 */}
      <AnimatePresence>
        {txError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl text-sm flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", backdropFilter: "blur(12px)" }}
          >
            <AlertCircle size={14} />
            {txError}
            <button onClick={() => setTxError(null)} className="ml-2"><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 领养 Modal */}
      <AnimatePresence>
        {showAdoptModal && (
          <Modal onClose={() => { setShowAdoptModal(false); setTxSuccess(null); setTxError(null); }}
            title={isZh ? "线下领养申请" : "Apply to Adopt"}>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
              {isZh
                ? "提交后进入机构审核。审核通过后需缴纳 0.1 AVAX 保证金，锁定 1 年，回访通过退还并获得 Genesis NFT。"
                : "After submission, the shelter will review your application. If approved, a 0.1 AVAX deposit is required (locked 1 year). Returned after home visit + Genesis NFT minted."}
            </p>
            {txSuccess ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
                style={{ background: "rgba(16,185,129,0.1)", color: "#6EE7B7" }}>
                <CheckCircle size={16} />
                <span className="text-sm">{txSuccess}</span>
              </div>
            ) : (
              <button onClick={handleApply} disabled={txLoading}
                className="w-full py-3 rounded-xl text-white text-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                {txLoading && <Loader2 size={14} className="animate-spin" />}
                {isZh ? "确认提交领养申请" : "Submit Application"}
              </button>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* 捐款 Modal */}
      <AnimatePresence>
        {showDonateModal && (
          <Modal onClose={() => { setShowDonateModal(false); setTxSuccess(null); setTxError(null); }}
            title={isZh ? `捐赠给 ${cat.name}` : `Donate to ${cat.name}`}>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
              {isZh
                ? "捐款直接转至机构钱包，平台完全不经手，链上透明可查。每累计 0.1 AVAX 自动铸造云领养 NFT。"
                : "Funds go directly to the shelter — platform never touches them. Every 0.1 AVAX = one Cloud Adoption NFT."}
            </p>
            <div className="flex items-center gap-2 mb-3">
              {["0.05", "0.1", "0.2", "0.5"].map((amt) => (
                <button key={amt} onClick={() => setDonateAmount(amt)}
                  className="flex-1 py-2 rounded-xl text-xs transition-all"
                  style={{
                    background: donateAmount === amt ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                    border: donateAmount === amt ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: donateAmount === amt ? "#A78BFA" : "rgba(255,255,255,0.5)",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                  {amt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>AVAX</span>
              <input type="number" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-white"
                step="0.01" min="0.01"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }} />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <AlertCircle size={14} style={{ color: "#FCD34D" }} />
              <span className="text-xs" style={{ color: "#FCD34D" }}>
                {isZh ? "捐款达 0.1 AVAX 可自动获得云领养 NFT" : "0.1 AVAX = Cloud Adoption NFT auto-minted"}
              </span>
            </div>
            {txSuccess ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
                style={{ background: "rgba(236,72,153,0.1)", color: "#F9A8D4" }}>
                <Heart size={16} />
                <span className="text-sm">{txSuccess}</span>
              </div>
            ) : (
              <button onClick={handleDonate} disabled={txLoading}
                className="w-full py-3 rounded-xl text-white text-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #EC4899, #7C3AED)", fontFamily: "'Space Grotesk', sans-serif" }}>
                {txLoading && <Loader2 size={14} className="animate-spin" />}
                {isZh ? `确认捐赠 ${donateAmount} AVAX` : `Confirm Donate ${donateAmount} AVAX`}
              </button>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* 游戏 Modal */}
      <AnimatePresence>
        {showGameModal && (
          <Modal onClose={() => setShowGameModal(false)} title={isZh ? "进入游戏" : "Enter Game"}>
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}>
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-sm mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {isZh ? "选择" : "Choose"} <strong style={{ color: "#A78BFA" }}>{cat.name}</strong> {isZh ? "作为你的游戏伙伴" : "as your companion"}
              </p>
              {!starterCatClaimed ? (
                <>
                  <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {isZh
                      ? `首次进入免费！还将获得 ${cat.name} 目前的成长系列 NFT（Stage ${cat.stage}）`
                      : `First time is free! You'll receive ${cat.name}'s current growth NFT (Stage ${cat.stage})`}
                  </p>
                  <div className="flex flex-col gap-2 mb-4">
                    {[
                      { icon: "🎁", text: isZh ? `${cat.name} StarterCat NFT（免费）` : `${cat.name} StarterCat NFT (free)` },
                      { icon: "🖼️", text: isZh ? `Stage ${cat.stage} 成长 NFT（免费）` : `Stage ${cat.stage} Growth NFT (free)` },
                      { icon: "🎮", text: isZh ? "解锁放置类游戏" : "Unlock idle game" },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.15)" }}>
                        <span>{item.icon}</span>
                        <span className="text-xs text-white">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : isMyStarterCat ? (
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {isZh ? `继续与 ${cat.name} 的冒险！` : `Continue your adventure with ${cat.name}!`}
                </p>
              ) : (
                <div className="p-3 rounded-xl mb-4"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="flex items-center gap-2">
                    <Coins size={14} style={{ color: "#FCD34D" }} />
                    <span className="text-xs" style={{ color: "#FCD34D" }}>
                      {isZh
                        ? `你已有初始猫咪，游戏将直接使用 ${cat.name} 的 NFT（余额: ${purrBalance} PURR）`
                        : `You already have a starter cat. Will use ${cat.name}'s NFT (Balance: ${purrBalance} PURR)`}
                    </span>
                  </div>
                </div>
              )}
              <button onClick={handleGameEnter} disabled={txLoading}
                className="w-full py-3 rounded-xl text-white text-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #7C3AED, #F59E0B)", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 0 25px rgba(124,58,237,0.4)" }}>
                {txLoading && <Loader2 size={14} className="animate-spin" />}
                🎮 {isZh ? "出发！" : "Let's go!"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Modal 组件 ──────────────────────────────────────────────

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md rounded-3xl p-6"
        style={{ background: "linear-gradient(145deg, #0D0D2B, #140D40)", border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 0 50px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
