import { useState } from "react";
import { useApp } from "../context/AppContext";
import { X, Sparkles, Coins, Gift, Heart } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function NFTWelcomeModal({ onClose }: Props) {
  const { claimFamilyPortrait, isConnected, connectWallet, nftClaimed } = useApp();
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
	setClaiming(true);
	await claimFamilyPortrait();
	setClaiming(false);
	setClaimed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #12102b, #1a1535)", border: "1px solid rgba(126,200,227,0.2)" }}>

        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-3xl opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, #f7a541, transparent)" }} />

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(109,58,238,0.08)", color: "#888", cursor: "pointer" }}>
          <X size={16} />
        </button>

        <div className="p-8 flex flex-col items-center gap-6 relative">
          {/* Animated NFT card */}
          <div className="relative">
            <div className="w-52 h-52 rounded-2xl flex flex-col items-center justify-center overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1a1040, #2d1060)",
                border: "2px solid rgba(247,165,65,0.4)",
                boxShadow: "0 0 40px rgba(247,165,65,0.15)",
              }}>
              <div className="text-7xl mb-2" style={{ filter: "drop-shadow(0 0 20px rgba(247,165,65,0.6))" }}>🐱</div>
              <div className="flex flex-col items-center">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(247,165,65,0.2)", color: "#f7a541" }}>Season 1</span>
                <span className="text-sm mt-1" style={{ color: "#1e1b4b", fontWeight: 700 }}>猫咪全家福</span>
              </div>
            </div>
            {/* Sparkle effect */}
            <Sparkles size={20} color="#f7a541" className="absolute -top-2 -right-2 animate-spin" style={{ animationDuration: "3s" }} />
            <Sparkles size={14} color="#7ec8e3" className="absolute -bottom-2 -left-2 animate-spin" style={{ animationDuration: "4s" }} />
          </div>

          {!claimed ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl mb-2" style={{ color: "#1e1b4b", fontWeight: 800 }}>🎉 欢迎加入 PurrChain！</h2>
                <p className="text-sm leading-relaxed" style={{ color: "#4c4980" }}>
                  作为新用户，您可以免费领取<span style={{ color: "#f7a541" }}>当季猫咪全家福 NFT</span>。
                  这是您进入 PurrChain 世界的入场凭证！
                </p>
              </div>

              {/* Benefits */}
              <div className="w-full space-y-3">
                {[
                  { icon: <Gift size={16} />, color: "#f7a541", text: "Season 1 全家福 NFT（每季度更新，限每钱包地址一个）" },
                  { icon: <Coins size={16} />, color: "#4ecdc4", text: "免费获得 20 $PURR 游戏代币，立即可用" },
                  { icon: <Heart size={16} />, color: "#ff6b6b", text: "可销毁换取 30 PURR（不可逆），或保留作收藏" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(109,58,238,0.03)", border: "1px solid rgba(109,58,238,0.06)" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${item.color}20`, color: item.color }}>
                      {item.icon}
                    </div>
                    <p className="text-sm" style={{ color: "#4c4980" }}>{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="w-full p-3 rounded-xl text-sm text-center" style={{ background: "rgba(126,200,227,0.06)", border: "1px solid rgba(126,200,227,0.12)", color: "#7c7aaa" }}>
                💡 为什么要帮助猫咪？每年有数万只流浪猫因缺乏资源而无法获得救治。PurrChain 用区块链让每一笔善意都透明可查，直达需要帮助的猫咪。
              </div>

              {!isConnected && (
                <p className="text-xs text-center" style={{ color: "#666688" }}>
                  ⚠️ 需先连接钱包才能领取 NFT（每个钱包地址仅限领取一次）
                </p>
              )}

              <button onClick={handleClaim} disabled={claiming}
                className="w-full py-4 rounded-xl transition-all hover:opacity-90 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #f7a541, #ff6b6b)",
                  color: "#1e1b4b",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  cursor: "pointer",
                }}>
                {claiming ? "领取中..." : isConnected ? "🎁 免费领取 NFT + 20 PURR" : "🔗 连接钱包并领取"}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="text-6xl animate-bounce">🎊</div>
              <h2 className="text-2xl" style={{ color: "#1e1b4b", fontWeight: 800 }}>领取成功！</h2>
              <p style={{ color: "#4c4980" }}>
                您已成功获得 <span style={{ color: "#f7a541" }}>Season 1 全家福 NFT</span> 与{" "}
                <span style={{ color: "#4ecdc4" }}>20 $PURR</span>！
                快去浏览猫咪档案，找到您的第一只虚拟猫咪伙伴吧 🐱
              </p>
              <button onClick={onClose}
                className="px-8 py-3 rounded-full"
                style={{ background: "linear-gradient(135deg, #7ec8e3, #a855f7)", color: "#1e1b4b", fontWeight: 700, cursor: "pointer" }}>
                开始探索猫咪档案 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
