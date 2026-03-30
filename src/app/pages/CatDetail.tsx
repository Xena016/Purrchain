import { useState } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Heart, Home, Gamepad2, MapPin, Shield,
  Syringe, Scale, Clock, AlertCircle, CheckCircle, X, Coins
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { CATS, getStatusLabel, getStatusColor } from "../data/cats";
import { useApp } from "../context/AppContext";

export function CatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isConnected, connectWallet, starterCatClaimed, claimStarterCat, starterCatId, purrBalance } = useApp();

  const cat = CATS.find((c) => c.id === Number(id));

  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState("0.1");
  const [donated, setDonated] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060614" }}>
        <Navbar />
        <div className="text-center pt-20">
          <div className="text-5xl mb-4">😿</div>
          <p className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>找不到这只猫咪</p>
          <button onClick={() => navigate("/dashboard")} className="mt-4 text-purple-400 text-sm">← 返回档案</button>
        </div>
      </div>
    );
  }

  const isAdopted = cat.status === "adopted" || cat.status === "pendingAdoption";
  const statusLabel = getStatusLabel(cat.status);
  const statusColor = getStatusColor(cat.status);
  const isMyStarterCat = starterCatId === cat.id;

  const handleGameEnter = () => {
    setShowGameModal(false);
    if (!starterCatClaimed) {
      claimStarterCat(cat.id);
    }
    navigate(`/game/${cat.id}`);
  };

  const handleDonate = () => {
    setDonated(true);
    setTimeout(() => setShowDonateModal(false), 1500);
  };

  const handleApply = () => {
    setApplied(true);
    setTimeout(() => setShowAdoptModal(false), 1500);
  };

  return (
    <div className="min-h-screen" style={{ background: "#060614", fontFamily: "'Nunito', sans-serif" }}>
      <Navbar />

      {/* Fixed background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[60vh]"
          style={{ background: "linear-gradient(to bottom, rgba(124,58,237,0.1) 0%, transparent 100%)" }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mb-6 text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft size={16} />
          返回档案列表
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 0 60px rgba(124,58,237,0.3)" }}>
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-80 lg:h-[420px] object-cover"
              />
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, transparent 60%, rgba(6,6,20,0.7) 100%)" }} />

              {/* Status overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center justify-between">
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
            </div>

            {/* Stage progress */}
            <div className="mt-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>成长阶段</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Stage {cat.stage} / 4</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-1.5 rounded-full"
                      style={{ background: s <= cat.stage ? "linear-gradient(90deg, #7C3AED, #06B6D4)" : "rgba(255,255,255,0.1)" }} />
                    <span className="text-xs" style={{ color: s <= cat.stage ? "#A78BFA" : "rgba(255,255,255,0.2)", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {s === 1 ? "幼猫" : s === 2 ? "少年" : s === 3 ? "成年" : "创世"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Name & basic */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem" }}>
                  {cat.name}
                </h1>
                <span className="text-2xl">{cat.gender === "female" ? "♀" : "♂"}</span>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span>{cat.age < 1 ? `${Math.round(cat.age * 12)} 月龄` : `${cat.age} 岁`}</span>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <MapPin size={13} />
                  <span>{cat.shelter}，{cat.shelterLocation}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>
              {cat.fullDesc}
            </p>

            {/* Personality */}
            <div className="flex gap-2 flex-wrap mb-6">
              {cat.personality.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full text-sm"
                  style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.25)" }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Info pills */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: <Scale size={14} />, label: "体重", value: cat.weight },
                { icon: <Syringe size={14} />, label: "疫苗", value: cat.vaccinated ? "已接种" : "未接种" },
                { icon: <Shield size={14} />, label: "绝育", value: cat.neutered ? "已绝育" : "未绝育" },
                { icon: <Clock size={14} />, label: "来源", value: "已认证机构" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>{item.icon}</span>
                  <div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>{item.label}</div>
                    <div className="text-sm text-white">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            {!isConnected ? (
              <div className="p-4 rounded-2xl text-center mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>连接钱包后可领养或捐赠</p>
                <button onClick={connectWallet} className="px-6 py-2 rounded-xl text-white text-sm"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  连接钱包
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Adopt button */}
                <button
                  onClick={() => !isAdopted && !applied && setShowAdoptModal(true)}
                  disabled={isAdopted || applied}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all"
                  style={{
                    background: isAdopted || applied ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #10B981, #06B6D4)",
                    color: isAdopted || applied ? "rgba(255,255,255,0.3)" : "#fff",
                    cursor: isAdopted || applied ? "default" : "pointer",
                    boxShadow: isAdopted || applied ? "none" : "0 0 25px rgba(16,185,129,0.3)",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}
                >
                  <Home size={16} />
                  {applied ? "领养申请已提交" : isAdopted ? (cat.status === "pendingAdoption" ? "领养处理中" : "已有温暖的家 ♥") : "线下领养申请"}
                </button>

                {/* Donate button */}
                <button
                  onClick={() => !isAdopted && setShowDonateModal(true)}
                  disabled={isAdopted}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all"
                  style={{
                    background: isAdopted ? "rgba(255,255,255,0.06)" : "rgba(236,72,153,0.15)",
                    border: isAdopted ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(236,72,153,0.3)",
                    color: isAdopted ? "rgba(255,255,255,0.3)" : "#F9A8D4",
                    cursor: isAdopted ? "default" : "pointer",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}
                >
                  <Heart size={16} />
                  {donated ? "感谢你的捐赠 ❤️" : isAdopted ? "已不需要捐赠" : "爱心捐赠 (AVAX)"}
                </button>

                {/* Game button */}
                <button
                  onClick={() => setShowGameModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all"
                  style={{
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    color: "#FCD34D",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}
                >
                  <Gamepad2 size={16} />
                  {isMyStarterCat ? "进入游戏 🎮" : starterCatClaimed ? "选择此猫进入游戏" : "🎁 首次免费 · 进入游戏"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Adopt Modal */}
      <AnimatePresence>
        {showAdoptModal && (
          <Modal onClose={() => setShowAdoptModal(false)} title="线下领养申请">
            <div className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
              <p className="mb-3">申请线下领养 <strong className="text-white">{cat.name}</strong>。</p>
              <p className="mb-3">领养流程：</p>
              <ol className="space-y-2 text-xs list-none">
                {[
                  "提交申请 → 猫咪状态变为「领养处理中」",
                  "机构审核通过后，缴纳 0.1 AVAX 保证金（锁定 1 年）",
                  "满一年后机构回访：通过则退还保证金 + 获得 Genesis NFT",
                  "猫咪状态更新为「已领养」",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: "rgba(124,58,237,0.2)", color: "#A78BFA", fontFamily: "'Space Grotesk', sans-serif" }}>{i + 1}</span>
                    <span style={{ color: "rgba(255,255,255,0.55)" }}>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            {applied ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
                style={{ background: "rgba(16,185,129,0.1)", color: "#6EE7B7" }}>
                <CheckCircle size={16} />
                <span className="text-sm">申请已提交！</span>
              </div>
            ) : (
              <button onClick={handleApply}
                className="w-full py-3 rounded-xl text-white text-sm"
                style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", fontFamily: "'Space Grotesk', sans-serif" }}>
                确认提交领养申请
              </button>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* Donate Modal */}
      <AnimatePresence>
        {showDonateModal && (
          <Modal onClose={() => setShowDonateModal(false)} title={`捐赠给 ${cat.name}`}>
            <div className="mb-4">
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                捐款直接转至机构钱包，平台完全不经手，链上透明可查。
                每累计 0.1 AVAX 可自动铸造一枚云领养 NFT。
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
                <input
                  type="number"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-white"
                  step="0.01" min="0.01"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <AlertCircle size={14} style={{ color: "#FCD34D" }} />
                <span className="text-xs" style={{ color: "#FCD34D" }}>
                  捐款达 0.1 AVAX 可自动获得云领养 NFT
                </span>
              </div>
            </div>
            {donated ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
                style={{ background: "rgba(236,72,153,0.1)", color: "#F9A8D4" }}>
                <Heart size={16} />
                <span className="text-sm">感谢你的爱心捐赠！</span>
              </div>
            ) : (
              <button onClick={handleDonate}
                className="w-full py-3 rounded-xl text-white text-sm"
                style={{ background: "linear-gradient(135deg, #EC4899, #7C3AED)", fontFamily: "'Space Grotesk', sans-serif" }}>
                确认捐赠 {donateAmount} AVAX
              </button>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* Game Modal */}
      <AnimatePresence>
        {showGameModal && (
          <Modal onClose={() => setShowGameModal(false)} title="进入游戏">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}>
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-sm mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                选择 <strong style={{ color: "#A78BFA" }}>{cat.name}</strong> 作为你的游戏伙伴
              </p>
              {!starterCatClaimed ? (
                <>
                  <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                    首次进入免费！还将获得 {cat.name} 目前的成长系列 NFT（Stage {cat.stage}）
                  </p>
                  <div className="flex flex-col gap-2 mb-4">
                    {[
                      { icon: "🎁", text: `${cat.name} StarterCat NFT（免费）` },
                      { icon: "🖼️", text: `Stage ${cat.stage} 成长 NFT（免费）` },
                      { icon: "🎮", text: "解锁放置类游戏" },
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
                  继续与 {cat.name} 的冒险！
                </p>
              ) : (
                <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="flex items-center gap-2">
                    <Coins size={14} style={{ color: "#FCD34D" }} />
                    <span className="text-xs" style={{ color: "#FCD34D" }}>
                      你已有初始猫咪，再次选择将用 10 $PURR (余额: {purrBalance})
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleGameEnter}
                className="w-full py-3 rounded-xl text-white text-sm"
                style={{ background: "linear-gradient(135deg, #7C3AED, #F59E0B)", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 0 25px rgba(124,58,237,0.4)" }}>
                🎮 出发！
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md rounded-3xl p-6"
        style={{ background: "linear-gradient(145deg, #0D0D2B, #140D40)", border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 0 50px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}