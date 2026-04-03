import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Zap, Package, ChevronRight, X, Clock, Trophy, Sparkles, Loader2, Plus, Sword, ShoppingBag as BagIcon, Wind } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts, getContracts } from "../../lib/contracts";
import { ethers } from "ethers";

type HuntDuration = "short" | "medium" | "long";
type HuntItem = "none" | "food" | "can";
type CatState = "idle" | "hunting" | "returning";

interface HuntState {
  active: boolean;
  startTime: number;
  duration: number;
  durationLabel: HuntDuration;
  item: HuntItem;
  useBooster: boolean;
}

interface Reward {
  type: "collection";
  name: string;
  rarity: string;
  icon: string;
}

interface EquipmentItem {
  tokenId: number;
  slot: number;
  rarity: number;
  name: string;
  lore: string;
  rarityBonus: number;
  carryBonus: number;
  speedBonus: number;
}

interface CollectionNFT {
  tokenId: number;
  name: string;
  image: string;
  description: string;
  seriesId: number;
}

const RARITY_LABELS = ["普通", "精良", "稀有", "传说"];
const RARITY_COLORS = ["#9CA3AF", "#34D399", "#60A5FA", "#FBBF24"];
const SLOT_ICONS = ["⚔️", "🎒", "👟"];
const SLOT_LABELS = ["武器", "背包", "靴子"];

const HUNT_CONFIG: Record<HuntDuration, { labelZh: string; labelEn: string; ms: number; stamina: number; fragments: [number, number] }> = {
  short:  { labelZh: "短途 2h", labelEn: "Short 2h",  ms: 30_000,  stamina: 1, fragments: [1, 3]  },
  medium: { labelZh: "中途 4h", labelEn: "Mid 4h",    ms: 60_000,  stamina: 2, fragments: [3, 8]  },
  long:   { labelZh: "长途 8h", labelEn: "Long 8h",   ms: 120_000, stamina: 3, fragments: [10, 20] },
};

const ITEM_CONFIG: Record<HuntItem, { labelZh: string; labelEn: string; icon: string; descZh: string; descEn: string; costPurr: number }> = {
  none: { labelZh: "不携带", labelEn: "None",     icon: "🚫", descZh: "无 NFT 掉落",             descEn: "No NFT drop",              costPurr: 0  },
  food: { labelZh: "猫粮",   labelEn: "Cat Food", icon: "🐟", descZh: "普通80% / 稀有15% / 珍稀5%", descEn: "80% Cmn/15% Rare/5% Epic",  costPurr: 5  },
  can:  { labelZh: "罐罐",   labelEn: "Cat Can",  icon: "🥫", descZh: "普通50% / 稀有35% / 珍稀15%", descEn: "50% Cmn/35% Rare/15% Epic", costPurr: 15 },
};

// ── 可爱小猫 SVG ──────────────────────────────────────────
function CatSVG({ state }: { state: CatState }) {
  const isHunting = state === "hunting";
  return (
    <svg viewBox="0 0 140 155" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
      {/* 尾巴 */}
      <motion.path
        d="M98 128 C120 118 128 100 120 84 C114 72 102 74 100 82"
        stroke="#F5C49A" strokeWidth="10" strokeLinecap="round" fill="none"
        animate={state === "idle" ? {
          d: ["M98 128 C120 118 128 100 120 84 C114 72 102 74 100 82",
              "M98 128 C124 114 134 95 124 78 C116 66 100 70 98 80",
              "M98 128 C120 118 128 100 120 84 C114 72 102 74 100 82"]
        } : {}}
        transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
      />
      <motion.path
        d="M98 128 C120 118 128 100 120 84 C114 72 102 74 100 82"
        stroke="#FDDCB5" strokeWidth="6" strokeLinecap="round" fill="none"
        animate={state === "idle" ? {
          d: ["M98 128 C120 118 128 100 120 84 C114 72 102 74 100 82",
              "M98 128 C124 114 134 95 124 78 C116 66 100 70 98 80",
              "M98 128 C120 118 128 100 120 84 C114 72 102 74 100 82"]
        } : {}}
        transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
      />

      {/* 身体 */}
      <motion.ellipse cx="68" cy="108" rx="38" ry="32" fill="#F5C49A"
        animate={state === "idle" ? { ry: [32, 34, 32] } : {}}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      />
      {/* 身体高光 */}
      <ellipse cx="55" cy="96" rx="14" ry="10" fill="#FDDCB5" opacity="0.6" transform="rotate(-20 55 96)" />
      {/* 肚皮 */}
      <ellipse cx="68" cy="114" rx="22" ry="17" fill="#FFF0DC" />
      {/* 肚皮纹路 */}
      <ellipse cx="68" cy="116" rx="12" ry="9" fill="#FFE4C4" opacity="0.5" />

      {/* 前爪 */}
      <ellipse cx="44" cy="136" rx="13" ry="8" fill="#F5C49A" />
      <ellipse cx="92" cy="136" rx="13" ry="8" fill="#F5C49A" />
      <ellipse cx="44" cy="136" rx="9" ry="5" fill="#FDDCB5" />
      <ellipse cx="92" cy="136" rx="9" ry="5" fill="#FDDCB5" />
      {/* 爪尖 */}
      {[38,44,50].map((x,i) => <ellipse key={i} cx={x} cy={140} rx="1.8" ry="3" fill="#E8A878" opacity="0.7" />)}
      {[86,92,98].map((x,i) => <ellipse key={i} cx={x} cy={140} rx="1.8" ry="3" fill="#E8A878" opacity="0.7" />)}

      {/* 头部 */}
      <circle cx="68" cy="62" r="32" fill="#F5C49A" />
      {/* 头部高光 */}
      <ellipse cx="57" cy="50" rx="12" ry="9" fill="#FDDCB5" opacity="0.55" transform="rotate(-15 57 50)" />

      {/* 耳朵外层 */}
      <path d="M40 42 L28 12 L56 34 Z" fill="#F5C49A" />
      <path d="M96 42 L112 12 L84 34 Z" fill="#F5C49A" />
      {/* 耳朵内层（粉色） */}
      <path d="M42 40 L33 18 L54 34 Z" fill="#FFAABB" />
      <path d="M94 40 L107 18 L86 34 Z" fill="#FFAABB" />
      {/* 耳朵高光 */}
      <path d="M42 38 L36 22 L51 33 Z" fill="#FFD0DA" opacity="0.6" />
      <path d="M94 38 L105 22 L89 33 Z" fill="#FFD0DA" opacity="0.6" />

      {/* 眼睛 */}
      {!isHunting ? (
        <>
          {/* 左眼 */}
          <ellipse cx="53" cy="60" rx="8" ry="9" fill="#2C1810" />
          <motion.ellipse cx="53" cy="60" rx="8" ry="9" fill="#2C1810"
            animate={{ ry: [9, 1, 9] }}
            transition={{ repeat: Infinity, duration: 4.5, times: [0, 0.03, 0.08], ease: "easeInOut" }}
          />
          <ellipse cx="53" cy="60" rx="5" ry="6" fill="#3D2515" />
          <circle cx="55" cy="57" r="2.5" fill="white" />
          <circle cx="50" cy="63" r="1" fill="white" opacity="0.4" />
          {/* 右眼 */}
          <motion.ellipse cx="83" cy="60" rx="8" ry="9" fill="#2C1810"
            animate={{ ry: [9, 1, 9] }}
            transition={{ repeat: Infinity, duration: 4.5, times: [0, 0.03, 0.08], ease: "easeInOut" }}
          />
          <ellipse cx="83" cy="60" rx="5" ry="6" fill="#3D2515" />
          <circle cx="85" cy="57" r="2.5" fill="white" />
          <circle cx="80" cy="63" r="1" fill="white" opacity="0.4" />
        </>
      ) : (
        <>
          {/* 眯眼（探险状态）*/}
          <path d="M46 60 Q53 55 60 60" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M76 60 Q83 55 90 60" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* 奋斗线 */}
          <line x1="46" y1="54" x2="50" y2="58" stroke="#E8956D" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="90" y1="54" x2="86" y2="58" stroke="#E8956D" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {/* 鼻子 */}
      <path d="M64 70 L68 67 L72 70 L68 73 Z" fill="#FF9CAD" />
      {/* 嘴巴 */}
      <path d="M64 73 Q68 78 72 73" stroke="#E8816A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M68 73 L68 70" stroke="#E8816A" strokeWidth="1.5" strokeLinecap="round" />

      {/* 腮红 */}
      <ellipse cx="42" cy="68" rx="9" ry="6" fill="#FFB8C8" opacity="0.45" />
      <ellipse cx="94" cy="68" rx="9" ry="6" fill="#FFB8C8" opacity="0.45" />

      {/* 胡须 */}
      <line x1="14" y1="66" x2="48" y2="69" stroke="#D4956A" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      <line x1="14" y1="72" x2="48" y2="72" stroke="#D4956A" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      <line x1="14" y1="78" x2="48" y2="75" stroke="#D4956A" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
      <line x1="88" y1="69" x2="122" y2="66" stroke="#D4956A" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      <line x1="88" y1="72" x2="122" y2="72" stroke="#D4956A" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      <line x1="88" y1="75" x2="122" y2="78" stroke="#D4956A" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />

      {/* 头顶花纹（虎斑条） */}
      <path d="M60 32 Q68 28 76 32" stroke="#E8A870" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M58 38 Q68 33 78 38" stroke="#E8A870" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35" />
    </svg>
  );
}

// ── 温暖小屋场景 ──────────────────────────────────────────
function CozyRoom({ catState, catName, isZh }: { catState: CatState; catName: string; isZh: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl select-none"
      style={{ background: "linear-gradient(170deg, #FEF3FF 0%, #FFF0E6 40%, #FFF8E8 100%)" }}>

      {/* 背景墙纸花纹 */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 8 }).map((_, i) =>
          Array.from({ length: 5 }).map((_, j) => (
            <text key={`${i}-${j}`} x={i * 60 - 10} y={j * 70 + 40} fontSize="22" fill="#F97316">🐾</text>
          ))
        )}
      </svg>

      {/* 窗户 — 更精致 */}
      <div className="absolute top-4 left-4 rounded-2xl overflow-hidden"
        style={{ width: 108, height: 88, border: "3px solid #D4956A", background: "linear-gradient(160deg, #C8E8FF 0%, #E8F6FF 50%, #D4F0E8 100%)", boxShadow: "inset 0 2px 8px rgba(180,220,255,0.5), 0 4px 12px rgba(180,120,60,0.15)" }}>
        {/* 太阳 */}
        <motion.div className="absolute" style={{ top: 8, left: 14, width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle, #FFFACD, #FFD700)", boxShadow: "0 0 16px 4px rgba(255,220,0,0.4)" }}
          animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} />
        {/* 云朵 */}
        <div className="absolute" style={{ top: 10, right: 8, width: 36, height: 16, background: "white", borderRadius: 10, opacity: 0.85 }} />
        <div className="absolute" style={{ top: 6, right: 14, width: 22, height: 18, background: "white", borderRadius: 12, opacity: 0.85 }} />
        {/* 远山 */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: 28, background: "linear-gradient(180deg, #A8D8A8 0%, #78C878 100%)", clipPath: "polygon(0 60%, 18% 20%, 35% 50%, 55% 10%, 75% 45%, 100% 25%, 100% 100%, 0 100%)" }} />
        {/* 窗框 */}
        <div className="absolute inset-0" style={{ borderRight: "2px solid rgba(180,120,60,0.4)", left: "50%" }} />
        <div className="absolute inset-0" style={{ borderBottom: "2px solid rgba(180,120,60,0.4)", top: "50%" }} />
        {/* 窗框圆角装饰 */}
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full" style={{ background: "rgba(255,200,100,0.5)" }} />
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "rgba(255,200,100,0.5)" }} />
      </div>

      {/* 窗台小花盆 */}
      <div className="absolute" style={{ top: 88, left: 12, display: "flex", gap: 6 }}>
        {[{ stem: "#68C44A", flower: "#FF88AA", pot: "#D4724A" },
          { stem: "#78D450", flower: "#FFD060", pot: "#E8845A" }].map((p, i) => (
          <div key={i} className="relative flex flex-col items-center">
            <div className="rounded-full" style={{ width: 12, height: 12, background: p.flower, boxShadow: `0 0 6px ${p.flower}88` }} />
            <div style={{ width: 3, height: 8, background: p.stem }} />
            <div style={{ width: 18, height: 10, background: p.pot, borderRadius: "0 0 5px 5px" }} />
          </div>
        ))}
      </div>

      {/* 书架 — 更精致 */}
      <div className="absolute top-3 right-3 rounded-xl overflow-hidden"
        style={{ width: 78, background: "#C8784A", border: "2.5px solid #A85C30", boxShadow: "2px 4px 12px rgba(120,60,20,0.2)", padding: "6px 5px 4px" }}>
        {/* 书架顶部装饰 */}
        <div className="absolute -top-1 left-0 right-0 h-2 rounded-t-xl" style={{ background: "#B86A38" }} />
        <div className="text-xs text-center mb-1" style={{ fontSize: 13 }}>🐾</div>
        {[
          ["#FF8FAB","#FF6B8A","#87CEEB","#60B4D8"],
          ["#98D17A","#70BC50","#DDA0DD","#C87EC8"],
          ["#F0E68C","#D8CA60","#FFB347","#E8952A"],
        ].map((row, ri) => (
          <div key={ri} className="flex items-end gap-0.5 mb-1">
            {row.map((c, ci) => (
              <div key={ci} className="rounded-sm" style={{ width: 14, height: 16 + (ci % 3) * 3, background: c, boxShadow: `inset -1px 0 0 rgba(0,0,0,0.1)` }} />
            ))}
          </div>
        ))}
        {/* 小摆件 */}
        <div className="flex justify-around mt-1">
          <div style={{ fontSize: 11 }}>🏺</div>
          <div style={{ fontSize: 11 }}>🪴</div>
        </div>
      </div>

      {/* 地板 — 木地板纹理 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 rounded-b-2xl overflow-hidden"
        style={{ background: "linear-gradient(180deg, #E8B86A 0%, #D4A050 40%, #C8944A 100%)" }}>
        {/* 木地板横纹 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="absolute left-0 right-0" style={{ top: i * 22, height: 1, background: "rgba(160,80,20,0.15)" }} />
        ))}
        {/* 木地板竖纹 */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0" style={{ left: `${i * 16}%`, width: 1, background: "rgba(160,80,20,0.1)" }} />
        ))}
        {/* 地板光泽 */}
        <div className="absolute top-0 left-0 right-0 h-4" style={{ background: "linear-gradient(180deg, rgba(255,220,150,0.25), transparent)" }} />
      </div>

      {/* 小地毯 */}
      <div className="absolute" style={{ bottom: 72, left: "50%", transform: "translateX(-50%)", width: 180, height: 44 }}>
        {/* 地毯底层 */}
        <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #FF9EBC, #FFD6A5, #FF9EBC)", boxShadow: "0 4px 16px rgba(255,120,140,0.25)" }} />
        {/* 地毯内圈 */}
        <div className="absolute" style={{ inset: "5px 15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)" }} />
        {/* 地毯花纹点 */}
        {[30, 90, 150].map((x, i) => (
          <div key={i} className="absolute rounded-full" style={{ left: x, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, background: "rgba(255,255,255,0.5)" }} />
        ))}
        {/* 地毯边缘流苏 */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute bottom-0" style={{ left: `${8 + i * 7.5}%`, width: 2, height: 6, background: "#FF88AA", borderRadius: 1, opacity: 0.7 }} />
        ))}
      </div>

      {/* 猫咪小屋（右下角装饰） */}
      <div className="absolute" style={{ bottom: 60, right: 16 }}>
        {/* 小屋屋顶 */}
        <div style={{ width: 0, height: 0, borderLeft: "22px solid transparent", borderRight: "22px solid transparent", borderBottom: "18px solid #F97316", marginBottom: -1 }} />
        {/* 小屋墙体 */}
        <div className="rounded-sm" style={{ width: 44, height: 28, background: "#FFF0D8", border: "1.5px solid #E8A060", position: "relative" }}>
          {/* 门 */}
          <div className="absolute rounded-t-full" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: 12, height: 16, background: "#D4724A" }} />
          {/* 窗 */}
          <div className="absolute rounded-sm" style={{ top: 4, left: 4, width: 8, height: 8, background: "#B8D8F0", border: "1px solid #C8A870" }} />
        </div>
        <div className="text-center text-xs mt-0.5" style={{ color: "#c2410c", fontSize: 9, fontWeight: "bold" }}>HOME</div>
      </div>

      {/* 猫咪本体 */}
      <motion.div className="absolute" style={{ bottom: 60, left: "50%", translateX: "-50%", width: 120, height: 140, x: "-50%" }}
        animate={
          catState === "hunting"   ? { x: ["-50%", "-130%", "-600%"] as unknown as number[], opacity: [1, 1, 0] } :
          catState === "returning" ? { x: ["600%", "30%", "-50%"] as unknown as number[], opacity: [0, 1, 1] } :
          { y: [0, -7, 0] }
        }
        transition={
          catState === "hunting" || catState === "returning"
            ? { duration: 1.6, ease: [0.4, 0, 0.2, 1] }
            : { repeat: Infinity, duration: 2.6, ease: "easeInOut" }
        }>
        <CatSVG state={catState} />
      </motion.div>

      {/* 脚印动画（探险时） */}
      {catState === "hunting" && (
        <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}>
            <div className="text-center">
              <div className="text-4xl mb-2">🌿</div>
              <div className="flex gap-2 justify-center mb-1">
                {["🐾","🐾","🐾"].map((p, i) => (
                  <motion.span key={i} style={{ fontSize: 16 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ delay: i * 0.3, repeat: Infinity, duration: 1.2 }}>{p}</motion.span>
                ))}
              </div>
              <p className="text-sm font-bold px-4 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.85)", color: "#c2410c", backdropFilter: "blur(4px)" }}>
                {isZh ? "🏃 外出探险中…" : "🏃 Out exploring…"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 名牌 */}
      <motion.div
        className="absolute whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold"
        style={{ bottom: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.9)", color: "#c2410c", border: "1.5px solid rgba(249,115,22,0.25)", boxShadow: "0 2px 12px rgba(249,115,22,0.15)", backdropFilter: "blur(6px)" }}
        animate={catState === "returning" ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.5 }}>
        {catState === "hunting"   ? (isZh ? "🏃 探险中…" : "🏃 Exploring…") :
         catState === "returning" ? (isZh ? "🎉 回来啦！" : "🎉 Welcome back!") :
         `✨ ${catName}`}
      </motion.div>

      {/* 归来时的礼花 */}
      {catState === "returning" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {["🌟","⭐","✨","🎊","🎉"].map((star, i) => (
            <motion.div key={i} className="absolute text-lg"
              style={{ left: `${15 + i * 18}%`, top: "20%" }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [-10, -60, -20], opacity: [0, 1, 0], rotate: [0, 20, -10] }}
              transition={{ delay: i * 0.15, duration: 1.2, repeat: 2 }}>
              {star}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export function Game() {
  const { catId } = useParams();
  const navigate  = useNavigate();
  const { signer, walletAddress, refreshBalance, lang } = useApp();
  const isZh = lang === "zh";

  // ── 猫咪数据 ──
  const [cat, setCat]             = useState<{ id: number; name: string; image: string; stage: number } | null>(null);
  const [catLoading, setCatLoading] = useState(true);
  const [catError,   setCatError]   = useState<string | null>(null);

  useEffect(() => {
    if (!catId) return;
    const load = async () => {
      setCatLoading(true); setCatError(null);
      try {
        const c = getReadonlyContracts();
        const raw = await c.catRegistry.getCat(Number(catId)) as { name: string; stageURIs: string[]; shelter: string };
        if (!raw.shelter || raw.shelter === "0x0000000000000000000000000000000000000000") {
          setCatError(isZh ? "找不到该猫咪" : "Cat not found"); return;
        }
        const uris  = Array.from(raw.stageURIs) as string[];
        const stage = uris.reduce((last, uri, idx) => uri && uri !== "" ? idx + 1 : last, 1);
        const firstUri = uris.find(u => u && u !== "") ?? "";
        let image = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80";
        if (firstUri) {
          try {
            const httpUri = firstUri.startsWith("ipfs://") ? firstUri.replace("ipfs://", "https://ipfs.io/ipfs/") : firstUri;
            const res = await fetch(httpUri, { signal: AbortSignal.timeout(5000) });
            const json = await res.json() as { image?: string };
            if (json.image) image = json.image.startsWith("ipfs://") ? json.image.replace("ipfs://", "https://ipfs.io/ipfs/") : json.image;
          } catch { /* fallback */ }
        }
        setCat({ id: Number(catId), name: raw.name, image, stage });
      } catch { setCatError(isZh ? "读取猫咪数据失败" : "Failed to load cat"); }
      finally { setCatLoading(false); }
    };
    load();
  }, [catId, isZh]);

  // ── 链上数据：体力、道具、碎片 ──
  const [stamina,      setStamina]      = useState(5);
  const [foodCount,    setFoodCount]    = useState(0);
  const [canCount,     setCanCount]     = useState(0);
  const [boosterCount, setBoosterCount] = useState(0);
  const [fragments,    setFragments]    = useState(0);
  const [chainLoading, setChainLoading] = useState(false);

  const loadChainData = useCallback(async () => {
    if (!walletAddress) return;
    setChainLoading(true);
    try {
      const c = getReadonlyContracts();
      const [st, food, can, boost, mat] = await Promise.all([
        c.gameContract.staminaOf(walletAddress),
        c.gameContract.foodBalance(walletAddress),
        c.gameContract.canBalance(walletAddress),
        c.gameContract.boosterBalance(walletAddress),
        c.gameContract.materialBalance(walletAddress),
      ]);
      setStamina(Number(st));
      setFoodCount(Number(food));
      setCanCount(Number(can));
      setBoosterCount(Number(boost));
      setFragments(Number(mat));
    } catch { /* ignore */ }
    finally { setChainLoading(false); }
  }, [walletAddress]);

  useEffect(() => { loadChainData(); }, [loadChainData]);

  // ── 装备 NFT ──
  const [equipments,    setEquipments]    = useState<EquipmentItem[]>([]);
  const [equipsLoading, setEquipsLoading] = useState(false);
  const [selectedEquip, setSelectedEquip] = useState<Record<number, number | null>>({ 0: null, 1: null, 2: null });

  const loadEquipments = useCallback(async () => {
    if (!walletAddress) return;
    setEquipsLoading(true);
    try {
      const c = getReadonlyContracts();
      // 先用 balanceOf 获取数量，再用 totalSupply 限制扫描范围
      const [balRaw, totalRaw] = await Promise.all([
        c.equipmentNFT.balanceOf(walletAddress),
        c.equipmentNFT.totalSupply().catch(() => 500n),
      ]);
      const balance = Number(balRaw);
      const total   = Number(totalRaw);
      const found: EquipmentItem[] = [];
      if (balance === 0) { setEquipments([]); return; }
      // 从最新 tokenId 往前扫，命中 balance 个后停止
      for (let i = total - 1; i >= 0 && found.length < balance; i--) {
        try {
          const owner = await c.equipmentNFT.ownerOf(i);
          if ((owner as string).toLowerCase() !== walletAddress.toLowerCase()) continue;
          const eq = await c.equipmentNFT.getEquipment(i);
          const e = eq as { slot: bigint; rarity: bigint; name: string; lore: string; rarityBonus: bigint; safetyBonus: bigint; carryBonus: bigint; speedBonus: bigint };
          found.push({ tokenId: i, slot: Number(e.slot), rarity: Number(e.rarity), name: e.name, lore: e.lore, rarityBonus: Number(e.rarityBonus), carryBonus: Number(e.carryBonus), speedBonus: Number(e.speedBonus) });
        } catch { /* not owned or burned */ }
      }
      setEquipments(found);
    } catch { /* ignore */ }
    finally { setEquipsLoading(false); }
  }, [walletAddress]);

  useEffect(() => { loadEquipments(); }, [loadEquipments]);

  // ── 收藏 NFT ──
  const [collections,    setCollections]    = useState<CollectionNFT[]>([]);
  const [colsLoading, setColsLoading] = useState(false);

  const loadCollections = useCallback(async () => {
    if (!walletAddress) return;
    setColsLoading(true);
    try {
      const c = getReadonlyContracts();
      const total = Number(await c.catNFT.totalSupply());
      const found: CollectionNFT[] = [];
      for (let i = total - 1; i >= 0 && found.length < 30; i--) {
        try {
          const owner = await c.catNFT.ownerOf(i);
          if ((owner as string).toLowerCase() !== walletAddress.toLowerCase()) continue;
          const info = await c.catNFT.nftInfo(i) as { nftType: bigint; seriesId: bigint; tokenURIValue: string };
          if (Number(info.nftType) !== 5) continue;
          let name = `Collection #${i}`, image = "", description = "";
          if (info.tokenURIValue) {
            try {
              const url = info.tokenURIValue.startsWith("ipfs://") ? info.tokenURIValue.replace("ipfs://", "https://ipfs.io/ipfs/") : info.tokenURIValue;
              const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
              const json = await res.json() as { name?: string; image?: string; description?: string };
              if (json.name) name = json.name;
              if (json.description) description = json.description;
              if (json.image) image = json.image.startsWith("ipfs://") ? json.image.replace("ipfs://", "https://ipfs.io/ipfs/") : json.image;
            } catch { /* fallback */ }
          }
          found.push({ tokenId: i, name, image, description, seriesId: Number(info.seriesId) });
        } catch { /* skip */ }
      }
      setCollections(found);
    } catch { /* ignore */ }
    finally { setColsLoading(false); }
  }, [walletAddress]);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  // ── 出猎状态 ──
  const [catState,        setCatState]        = useState<CatState>("idle");
  const [hunt,            setHunt]            = useState<HuntState | null>(null);
  const [timeLeft,        setTimeLeft]        = useState(0);
  const [rewards,         setRewards]         = useState<Reward[]>([]);
  const [rewardFragments, setRewardFragments] = useState(0);
  const [showRewards,     setShowRewards]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── UI 状态 ──
  const [showHuntModal, setShowHuntModal] = useState(false);
  const [huntConfig,    setHuntConfig]    = useState<{ duration: HuntDuration; item: HuntItem; booster: boolean }>({ duration: "short", item: "none", booster: false });
  const [toast,         setToast]         = useState<string | null>(null);
  const [buyingStamina, setBuyingStamina] = useState(false);
  const [buyingItem,    setBuyingItem]    = useState<string | null>(null);
  const [activePanel,   setActivePanel]   = useState<"bag" | "frags" | "tips">("bag");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ── 恢复出猎（退出再进）──
  useEffect(() => {
    if (!catId) return;
    const savedHunt = localStorage.getItem(`hunt_${catId}`);
    if (!savedHunt) return;
    const h: HuntState = JSON.parse(savedHunt);
    if (!h.active) return;
    const elapsed = Date.now() - h.startTime;
    if (elapsed >= h.duration) {
      setCatState("returning");
      setHunt(null);
      localStorage.removeItem(`hunt_${catId}`);
      const savedRewards = localStorage.getItem(`rewards_${catId}`);
      const savedFrags   = parseInt(localStorage.getItem(`reward_frags_${catId}`) || "0");
      setTimeout(() => {
        if (savedRewards) setRewards(JSON.parse(savedRewards));
        setRewardFragments(savedFrags);
        setShowRewards(true);
        setCatState("idle");
        localStorage.removeItem(`rewards_${catId}`);
        localStorage.removeItem(`reward_frags_${catId}`);
      }, 1500);
    } else {
      setHunt(h);
      setCatState("hunting");
      setTimeLeft(Math.ceil((h.duration - elapsed) / 1000));
    }
  }, [catId]);

  // ── 出猎倒计时 ──
  useEffect(() => {
    if (hunt && catState === "hunting") {
      timerRef.current = setInterval(() => {
        const elapsed   = Date.now() - hunt.startTime;
        const remaining = hunt.duration - elapsed;
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          setHunt(null);
          localStorage.removeItem(`hunt_${catId}`);
          setCatState("returning");

          const cfg = HUNT_CONFIG[hunt.durationLabel];
          const fragCount = Math.floor(Math.random() * (cfg.fragments[1] - cfg.fragments[0] + 1)) + cfg.fragments[0];
          const newRewards: Reward[] = [];
          if (hunt.item !== "none") {
            const roll = Math.random();
            let rarity = "普通";
            if (hunt.item === "can") { if (roll < 0.15) rarity = "珍稀"; else if (roll < 0.5) rarity = "稀有"; }
            else { if (roll < 0.05) rarity = "珍稀"; else if (roll < 0.2) rarity = "稀有"; }
            const options: Reward[] = [
              { type: "collection", name: isZh ? "小猫玩耍" : "Cat Playing",   rarity: "普通", icon: "🐱" },
              { type: "collection", name: isZh ? "小猫同伴" : "Cat Companion",  rarity: "稀有", icon: "😺" },
              { type: "collection", name: isZh ? "小猫睡觉" : "Cat Sleeping",   rarity: "珍稀", icon: "😸" },
            ].filter(n => n.rarity === rarity);
            if (options.length) newRewards.push(options[Math.floor(Math.random() * options.length)]);
          }
          localStorage.setItem(`rewards_${catId}`, JSON.stringify(newRewards));
          localStorage.setItem(`reward_frags_${catId}`, String(fragCount));
          setTimeout(() => {
            setRewards(newRewards);
            setRewardFragments(fragCount);
            setShowRewards(true);
            setCatState("idle");
            loadChainData();
            loadCollections();
            refreshBalance();
            localStorage.removeItem(`rewards_${catId}`);
            localStorage.removeItem(`reward_frags_${catId}`);
          }, 1500);
        } else { setTimeLeft(Math.ceil(remaining / 1000)); }
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hunt, catState, catId, isZh, loadChainData, loadCollections, refreshBalance]);

  const formatTime = (s: number) => {
    if (s <= 0) return "0s";
    const m = Math.floor(s / 60); const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // ── 购买体力（链上）──
  const handleBuyStamina = async () => {
    if (!signer || stamina >= 5 || buyingStamina) return;
    setBuyingStamina(true);
    try {
      const c = getContracts(signer);
      const tx = await c.gameContract.buyStamina(1);
      await (tx as ethers.ContractTransactionResponse).wait();
      await loadChainData();
      refreshBalance();
      showToast(isZh ? "✅ 体力 +1" : "✅ Stamina +1");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) showToast(isZh ? "❌ 购买失败（PURR 不足？）" : "❌ Failed (not enough PURR?)");
    } finally { setBuyingStamina(false); }
  };

  // ── 购买道具（链上）──
  const handleBuyItem = async (type: "food" | "can" | "booster") => {
    if (!signer || buyingItem) return;
    setBuyingItem(type);
    try {
      const c = getContracts(signer);
      let tx;
      if (type === "food")    tx = await c.gameContract.buyCatFood(1);
      else if (type === "can") tx = await c.gameContract.buyCatCan(1);
      else                    tx = await c.gameContract.buyBooster(1);
      await (tx as ethers.ContractTransactionResponse).wait();
      await loadChainData();
      refreshBalance();
      const names: Record<string, string> = { food: isZh ? "猫粮" : "Cat Food", can: isZh ? "罐罐" : "Cat Can", booster: isZh ? "加速符" : "Booster" };
      showToast(`✅ ${isZh ? "购买成功：" : "Bought: "}${names[type]}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) showToast(isZh ? "❌ 购买失败（PURR 不足？）" : "❌ Failed (not enough PURR?)");
    } finally { setBuyingItem(null); }
  };

  // ── 装备穿戴（链上）──
  const handleEquip = async (catTokenId: number, equipTokenId: number) => {
    if (!signer) return;
    try {
      const c = getContracts(signer);
      const tx = await c.gameContract.equipItem(catTokenId, equipTokenId);
      await (tx as ethers.ContractTransactionResponse).wait();
      showToast(isZh ? "✅ 装备成功" : "✅ Equipped");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) showToast(isZh ? "❌ 装备失败" : "❌ Equip failed");
    }
  };

  // ── 开始出猎 ──
  const startHunt = () => {
    const dur = HUNT_CONFIG[huntConfig.duration];
    if (stamina < dur.stamina) return;
    if (huntConfig.item === "food" && foodCount < 1) { showToast(isZh ? "❌ 没有猫粮" : "❌ No cat food"); return; }
    if (huntConfig.item === "can"  && canCount  < 1) { showToast(isZh ? "❌ 没有罐罐" : "❌ No cat can"); return; }
    if (huntConfig.booster && boosterCount < 1) { showToast(isZh ? "❌ 没有加速符" : "❌ No booster"); return; }

    let actualMs = dur.ms;
    if (huntConfig.booster) actualMs = Math.max(actualMs * 0.5, dur.ms * 0.1);
    const newHunt: HuntState = { active: true, startTime: Date.now(), duration: actualMs, durationLabel: huntConfig.duration, item: huntConfig.item, useBooster: huntConfig.booster };
    setHunt(newHunt);
    localStorage.setItem(`hunt_${catId}`, JSON.stringify(newHunt));
    setCatState("hunting");
    setTimeLeft(Math.ceil(actualMs / 1000));
    setShowHuntModal(false);
    // 乐观更新（链上下次进来时同步）
    setStamina(s => Math.max(0, s - dur.stamina));
    if (huntConfig.item === "food") setFoodCount(c => Math.max(0, c - 1));
    if (huntConfig.item === "can")  setCanCount(c => Math.max(0, c - 1));
    if (huntConfig.booster) setBoosterCount(c => Math.max(0, c - 1));
  };

  // ── Loading / Error ──
  if (!walletAddress) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="text-5xl">🔐</div>
      <p className="font-bold" style={{ color: "#92400e" }}>{isZh ? "请先连接钱包" : "Please connect your wallet"}</p>
      <p className="text-sm" style={{ color: "#b45309" }}>{isZh ? "进入游戏前需要连接钱包" : "A wallet connection is required to play"}</p>
      <button onClick={() => navigate("/dashboard")} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
        style={{ background: "linear-gradient(135deg,#F97316,#fbbf24)", cursor: "pointer" }}>
        {isZh ? "返回" : "Back"}
      </button>
    </div>
  );
  if (catLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fffbf5" }}>
      <Navbar /><Loader2 size={32} className="animate-spin" style={{ color: "#F97316" }} />
    </div>
  );
  if (catError || !cat) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="text-5xl">😿</div>
      <p className="font-bold" style={{ color: "#92400e" }}>{catError ?? (isZh ? "找不到该猫咪" : "Cat not found")}</p>
      <button onClick={() => navigate("/dashboard")} className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
        style={{ background: "linear-gradient(135deg,#F97316,#fbbf24)", cursor: "pointer" }}>
        {isZh ? "返回" : "Back"}
      </button>
    </div>
  );

  const dur = HUNT_CONFIG[huntConfig.duration];

  return (
    <div className="min-h-screen" style={{ background: "#fffbf5", fontFamily: "'Nunito', sans-serif" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-10">

        <button onClick={() => navigate(`/cat/${cat.id}`)} className="flex items-center gap-2 mb-5 text-sm" style={{ color: "#b45309", cursor: "pointer" }}>
          <ArrowLeft size={15} />{isZh ? `返回 ${cat.name} 的档案` : `Back to ${cat.name}`}
        </button>

        {/* ── 状态栏 ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-5 flex flex-wrap gap-4 items-center justify-between"
          style={{ background: "white", border: "1px solid rgba(249,115,22,0.15)", boxShadow: "0 2px 12px rgba(249,115,22,0.06)" }}>
          {/* 猫咪信息 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "2px solid rgba(249,115,22,0.25)" }}>
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: "#92400e" }}>{cat.name}</div>
              <div className="text-xs" style={{ color: "#F97316" }}>Stage {cat.stage}</div>
            </div>
          </div>

          {/* 体力 + 购买 */}
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: "#F97316" }} />
            <span className="text-xs font-medium" style={{ color: "#b45309" }}>{isZh ? "体力" : "SP"}</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-4 h-4 rounded-sm transition-all"
                  style={{ background: i <= stamina ? "#F97316" : "rgba(249,115,22,0.1)", boxShadow: i <= stamina ? "0 0 6px rgba(249,115,22,0.3)" : "none" }} />
              ))}
            </div>
            <span className="text-xs font-bold" style={{ color: "#F97316" }}>{stamina}/5</span>
            <button onClick={handleBuyStamina} disabled={stamina >= 5 || buyingStamina || !signer}
              title={isZh ? "花 8 PURR 购买 1 点体力" : "Buy 1 stamina for 8 PURR"}
              className="w-6 h-6 rounded-full flex items-center justify-center ml-0.5"
              style={{
                background: stamina < 5 && signer ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.05)",
                border: "1px solid rgba(249,115,22,0.3)",
                color: stamina < 5 && signer ? "#F97316" : "#d4a57a",
                cursor: stamina < 5 && signer ? "pointer" : "default",
              }}>
              {buyingStamina ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
            </button>
          </div>

          {/* 碎片 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <Sparkles size={13} style={{ color: "#a855f7" }} />
            <span className="text-sm font-bold" style={{ color: "#a855f7" }}>{fragments}</span>
            <span className="text-xs" style={{ color: "#b45309" }}>{isZh ? "碎片" : "frags"}</span>
          </div>

          {chainLoading && <Loader2 size={14} className="animate-spin" style={{ color: "#F97316", opacity: 0.4 }} />}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── 左：场景 ── */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="relative rounded-2xl overflow-hidden"
              style={{ height: 360, boxShadow: "0 4px 24px rgba(249,115,22,0.1)" }}>
              <CozyRoom catState={catState} catName={cat.name} isZh={isZh} />
              {catState === "hunting" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(249,115,22,0.3)", boxShadow: "0 2px 12px rgba(249,115,22,0.15)" }}>
                  <Clock size={14} style={{ color: "#F97316" }} />
                  <span className="text-sm font-bold" style={{ color: "#c2410c" }}>{formatTime(timeLeft)} {isZh ? "后归来" : "remaining"}</span>
                </motion.div>
              )}
            </motion.div>

            {/* 出猎按钮 */}
            <div className="mt-4">
              <motion.button whileHover={{ scale: catState === "idle" && stamina > 0 ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}
                onClick={() => catState === "idle" && stamina > 0 && setShowHuntModal(true)}
                disabled={catState !== "idle" || stamina === 0}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black"
                style={{
                  background: catState !== "idle" || stamina === 0 ? "rgba(249,115,22,0.06)" : "linear-gradient(135deg,#F97316,#fbbf24)",
                  color: catState !== "idle" || stamina === 0 ? "rgba(180,120,50,0.4)" : "white",
                  cursor: catState !== "idle" || stamina === 0 ? "default" : "pointer",
                  boxShadow: catState === "idle" && stamina > 0 ? "0 4px 20px rgba(249,115,22,0.3)" : "none",
                  border: catState !== "idle" || stamina === 0 ? "1px solid rgba(249,115,22,0.1)" : "none",
                }}>
                {catState === "hunting"   ? <><Clock size={16} />{isZh ? "探险中…" : "Exploring…"}</> :
                 catState === "returning" ? <><Trophy size={16} />{isZh ? "归来中…" : "Returning…"}</> :
                 stamina === 0            ? (isZh ? "体力耗尽，点体力旁 + 购买" : "No stamina — buy via + button") :
                 <><ChevronRight size={16} />{isZh ? "派出探险" : "Start Hunt"}</>}
              </motion.button>
            </div>

            {/* ── 收藏 NFT ── */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color: "#a855f7" }} />
                <span className="text-sm font-bold" style={{ color: "#92400e" }}>{isZh ? "收藏系列 NFT" : "Collection NFTs"}</span>
                {collections.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>
                    {collections.length}
                  </span>
                )}
              </div>
              {colsLoading ? (
                <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin" style={{ color: "#a855f7" }} /></div>
              ) : collections.length === 0 ? (
                <div className="py-6 text-center rounded-2xl" style={{ background: "rgba(249,115,22,0.03)", border: "1px dashed rgba(249,115,22,0.15)" }}>
                  <div className="text-3xl mb-2">🐾</div>
                  <p className="text-xs" style={{ color: "#b45309" }}>{isZh ? "携带猫粮或罐罐出猎可带回收藏 NFT" : "Bring food/can to get Collection NFTs"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {collections.map(col => (
                    <div key={col.tokenId} className="rounded-xl overflow-hidden"
                      style={{ background: "white", border: "1px solid rgba(168,85,247,0.15)", boxShadow: "0 2px 8px rgba(168,85,247,0.06)" }}>
                      <div className="aspect-square" style={{ background: "rgba(168,85,247,0.04)" }}>
                        {col.image
                          ? <img src={col.image} alt={col.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-bold truncate" style={{ color: "#92400e" }}>{col.name}</p>
                        {col.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#b45309" }}>{col.description}</p>}
                        <p className="text-xs font-mono mt-0.5" style={{ color: "#d97706" }}>#{col.tokenId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 右：Tab 面板 ── */}
          <div className="flex flex-col gap-4">
            {/* Tab 切换 */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(249,115,22,0.06)" }}>
              {([
                { id: "bag"   as const, icon: <BagIcon size={12} />,   zh: "装备", en: "Gear"  },
                { id: "frags" as const, icon: <Sparkles size={12} />,  zh: "碎片", en: "Frags" },
                { id: "tips"  as const, icon: <span style={{ fontSize: 11 }}>💡</span>, zh: "提示", en: "Tips"  },
              ]).map(t => (
                <button key={t.id} onClick={() => setActivePanel(t.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: activePanel === t.id ? "white" : "transparent",
                    color: activePanel === t.id ? "#F97316" : "#b45309",
                    cursor: "pointer",
                    boxShadow: activePanel === t.id ? "0 1px 6px rgba(249,115,22,0.1)" : "none",
                  }}>
                  {t.icon}{isZh ? t.zh : t.en}
                </button>
              ))}
            </div>

            {/* 装备背包面板 */}
            {activePanel === "bag" && (
              <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(249,115,22,0.12)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={14} style={{ color: "#F97316" }} />
                  <span className="text-sm font-bold" style={{ color: "#92400e" }}>{isZh ? "装备背包" : "Equipment"}</span>
                </div>
                {equipsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin" style={{ color: "#F97316" }} /></div>
                ) : equipments.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="text-4xl mb-2">🎒</div>
                    <p className="text-xs mb-3" style={{ color: "#b45309" }}>{isZh ? "还没有装备，去抽卡获得！" : "No equipment yet!"}</p>
                    <button onClick={() => navigate("/gacha")} className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#F97316,#fbbf24)", cursor: "pointer" }}>
                      {isZh ? "前往抽卡" : "Go Gacha"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {equipments.map(eq => (
                      <div key={eq.tokenId} className="p-3 rounded-xl"
                        style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{SLOT_ICONS[eq.slot]}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate" style={{ color: "#92400e" }}>{eq.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: `${RARITY_COLORS[eq.rarity]}18`, color: RARITY_COLORS[eq.rarity], border: `1px solid ${RARITY_COLORS[eq.rarity]}30`, fontSize: "10px" }}>
                                {RARITY_LABELS[eq.rarity]}
                              </span>
                            </div>
                            <div className="text-xs" style={{ color: "#b45309" }}>{SLOT_LABELS[eq.slot]} #{eq.tokenId}</div>
                          </div>
                          {catState === "idle" && (
                            <button onClick={() => handleEquip(cat.id, eq.tokenId)}
                              className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-semibold"
                              style={{ background: "rgba(249,115,22,0.1)", color: "#c2410c", border: "1px solid rgba(249,115,22,0.2)", cursor: "pointer" }}>
                              {isZh ? "装备" : "Equip"}
                            </button>
                          )}
                        </div>
                        {eq.lore && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: "#d97706" }}>{eq.lore}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 碎片面板 */}
            {activePanel === "frags" && (
              <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(249,115,22,0.12)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} style={{ color: "#a855f7" }} />
                  <span className="text-sm font-bold" style={{ color: "#92400e" }}>{isZh ? "材料碎片" : "Fragments"}</span>
                </div>
                <div className="text-center py-2">
                  <div className="text-5xl font-black mb-1" style={{ color: "#a855f7" }}>{fragments}</div>
                  <p className="text-xs mb-3" style={{ color: "#b45309" }}>{isZh ? "10 碎片 = 1 抽卡券" : "10 frags = 1 ticket"}</p>
                  <div className="w-full bg-orange-50 rounded-full h-2 mb-4 overflow-hidden" style={{ border: "1px solid rgba(249,115,22,0.1)" }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${(fragments % 10) * 10}%`, background: "linear-gradient(90deg,#a855f7,#F97316)" }} />
                  </div>
                  <button onClick={() => navigate("/gacha")} className="w-full py-3 rounded-xl text-white text-sm font-bold"
                    style={{ background: "linear-gradient(135deg,#a855f7,#F97316)", cursor: "pointer", boxShadow: "0 4px 16px rgba(168,85,247,0.2)" }}>
                    ✨ {isZh ? "前往抽卡合成" : "Go to Gacha"}
                  </button>
                </div>
              </div>
            )}

            {/* 提示面板 */}
            {activePanel === "tips" && (
              <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(249,115,22,0.12)" }}>
                <div className="text-sm font-bold mb-3" style={{ color: "#92400e" }}>💡 {isZh ? "游戏提示" : "Tips"}</div>
                <ul className="space-y-2 text-xs" style={{ color: "#b45309" }}>
                  <li className="flex items-start gap-2">
                    <Zap size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#F97316" }} />
                    <span>{isZh ? "体力每8小时自然恢复1点，可点 + 花8 PURR购买" : "Stamina restores 1/8h, or buy via + for 8 PURR"}</span>
                  </li>
                  <li className="flex items-start gap-2"><span className="flex-shrink-0">🐟</span><span>{isZh ? "携带猫粮或罐罐才能带回收藏系列 NFT" : "Need food/can to earn Collection NFTs"}</span></li>
                  <li className="flex items-start gap-2">
                    <Sword size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#F97316" }} />
                    <span>{isZh ? "武器装备提高出猎 NFT 的稀有度" : "Weapon raises NFT rarity on hunts"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BagIcon size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#F97316" }} />
                    <span>{isZh ? "背包装备增加碎片产出量" : "Bag boosts fragment yield"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Wind size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#F97316" }} />
                    <span>{isZh ? "靴子装备缩短探险时长" : "Boots shortens hunt duration"}</span>
                  </li>
                  <li className="flex items-start gap-2"><span className="flex-shrink-0">🎴</span><span>{isZh ? "装备 NFT 只能通过抽卡获得" : "Equipment NFTs only from gacha"}</span></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 出猎弹窗 ── */}
      <AnimatePresence>
        {showHuntModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md rounded-3xl p-6 overflow-y-auto"
              style={{ background: "#fffbf5", border: "1px solid rgba(249,115,22,0.2)", boxShadow: "0 20px 60px rgba(249,115,22,0.2)", maxHeight: "92vh" }}>

              <div className="flex justify-between items-center mb-5">
                <h3 className="font-black text-lg" style={{ color: "#92400e" }}>🐾 {isZh ? "配置探险" : "Configure Hunt"}</h3>
                <button onClick={() => setShowHuntModal(false)} className="p-1.5 rounded-lg"
                  style={{ background: "rgba(249,115,22,0.08)", color: "#b45309", cursor: "pointer" }}><X size={15} /></button>
              </div>

              {/* 时长选择 */}
              <div className="mb-5">
                <label className="text-xs font-bold mb-2 block" style={{ color: "#b45309" }}>{isZh ? "探险时长" : "Duration"}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(HUNT_CONFIG) as [HuntDuration, typeof HUNT_CONFIG[HuntDuration]][]).map(([key, val]) => (
                    <button key={key} onClick={() => setHuntConfig(c => ({ ...c, duration: key }))}
                      className="py-3 px-2 rounded-xl text-center transition-all"
                      style={{
                        background: huntConfig.duration === key ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.04)",
                        border: huntConfig.duration === key ? "2px solid rgba(249,115,22,0.5)" : "1px solid rgba(249,115,22,0.12)",
                        color: huntConfig.duration === key ? "#c2410c" : "#b45309", cursor: "pointer",
                      }}>
                      <div className="text-xs font-bold">{isZh ? val.labelZh : val.labelEn}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#F97316" }}>⚡{val.stamina}</div>
                      <div className="text-xs" style={{ color: "#d97706" }}>+{val.fragments[0]}~{val.fragments[1]} {isZh ? "碎片" : "frags"}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 道具选择 + 购买 */}
              <div className="mb-5">
                <label className="text-xs font-bold mb-2 block" style={{ color: "#b45309" }}>
                  {isZh ? "携带道具（携带才能带回收藏 NFT）" : "Item (needed for Collection NFTs)"}
                </label>
                <div className="space-y-2">
                  {(Object.entries(ITEM_CONFIG) as [HuntItem, typeof ITEM_CONFIG[HuntItem]][]).map(([key, val]) => {
                    const count = key === "food" ? foodCount : key === "can" ? canCount : null;
                    const selected = huntConfig.item === key;
                    return (
                      <div key={key}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{
                          background: selected ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.03)",
                          border: selected ? "2px solid rgba(249,115,22,0.4)" : "1px solid rgba(249,115,22,0.1)",
                          cursor: "pointer",
                        }}
                        onClick={() => setHuntConfig(c => ({ ...c, item: key }))}>
                        <span className="text-2xl">{val.icon}</span>
                        <div className="flex-1">
                          <div className="text-xs font-bold" style={{ color: "#92400e" }}>
                            {isZh ? val.labelZh : val.labelEn}
                            {count !== null && <span className="ml-1.5 font-normal" style={{ color: "#d97706" }}>({isZh ? "库存" : "stock"}: {count})</span>}
                          </div>
                          <div className="text-xs" style={{ color: "#b45309" }}>{isZh ? val.descZh : val.descEn}</div>
                        </div>
                        {val.costPurr > 0 && count !== null && (
                          <button onClick={e => { e.stopPropagation(); handleBuyItem(key as "food" | "can"); }}
                            disabled={!!buyingItem || !signer}
                            className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                            style={{ background: "rgba(249,115,22,0.12)", color: "#c2410c", border: "1px solid rgba(249,115,22,0.25)", cursor: signer ? "pointer" : "default" }}>
                            {buyingItem === key ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                            {val.costPurr} PURR
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 加速符 */}
              <div className="mb-5">
                <div className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: huntConfig.booster ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.03)",
                    border: huntConfig.booster ? "2px solid rgba(249,115,22,0.4)" : "1px solid rgba(249,115,22,0.1)",
                  }}>
                  <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setHuntConfig(c => ({ ...c, booster: !c.booster }))}>
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className="text-xs font-bold" style={{ color: "#92400e" }}>
                        {isZh ? "加速符（时长减半）" : "Booster (half time)"}
                        <span className="ml-1.5 font-normal" style={{ color: "#d97706" }}>({isZh ? "库存" : "stock"}: {boosterCount})</span>
                      </div>
                      <div className="text-xs" style={{ color: "#b45309" }}>10 PURR</div>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleBuyItem("booster"); }}
                    disabled={!!buyingItem || !signer}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                    style={{ background: "rgba(249,115,22,0.12)", color: "#c2410c", border: "1px solid rgba(249,115,22,0.25)", cursor: signer ? "pointer" : "default" }}>
                    {buyingItem === "booster" ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                    {isZh ? "购买" : "Buy"}
                  </button>
                </div>
              </div>

              {/* 装备选择 */}
              {equipments.length > 0 && (
                <div className="mb-5">
                  <label className="text-xs font-bold mb-2 block" style={{ color: "#b45309" }}>
                    ⚔️ {isZh ? "选择装备（点击选中/取消）" : "Equipment (click to toggle)"}
                  </label>
                  <div className="space-y-1.5">
                    {equipments.slice(0, 6).map(eq => {
                      const isSel = selectedEquip[eq.slot] === eq.tokenId;
                      return (
                        <div key={eq.tokenId}
                          onClick={() => setSelectedEquip(p => ({ ...p, [eq.slot]: isSel ? null : eq.tokenId }))}
                          className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all"
                          style={{
                            background: isSel ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.03)",
                            border: isSel ? "1px solid rgba(249,115,22,0.35)" : "1px solid rgba(249,115,22,0.08)",
                          }}>
                          <span>{SLOT_ICONS[eq.slot]}</span>
                          <span className="text-xs font-semibold flex-1 truncate" style={{ color: "#92400e" }}>{eq.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{ background: `${RARITY_COLORS[eq.rarity]}18`, color: RARITY_COLORS[eq.rarity], fontSize: "10px" }}>
                            {RARITY_LABELS[eq.rarity]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 总消耗 */}
              <div className="flex justify-between items-center mb-4 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)" }}>
                <span className="text-xs font-medium" style={{ color: "#b45309" }}>{isZh ? "总消耗" : "Total cost"}</span>
                <span className="text-xs font-bold" style={{ color: "#c2410c" }}>
                  ⚡{dur.stamina} + {ITEM_CONFIG[huntConfig.item].costPurr + (huntConfig.booster ? 10 : 0)} PURR
                </span>
              </div>

              <button onClick={startHunt} disabled={stamina < dur.stamina}
                className="w-full py-4 rounded-2xl font-black text-sm"
                style={{
                  background: stamina >= dur.stamina ? "linear-gradient(135deg,#F97316,#fbbf24)" : "rgba(249,115,22,0.08)",
                  color: stamina >= dur.stamina ? "white" : "rgba(180,120,50,0.4)",
                  cursor: stamina >= dur.stamina ? "pointer" : "default",
                  boxShadow: stamina >= dur.stamina ? "0 4px 20px rgba(249,115,22,0.3)" : "none",
                }}>
                {stamina < dur.stamina ? (isZh ? "体力不足" : "Not enough stamina") : `🐾 ${isZh ? "出发探险！" : "Start Exploring!"}`}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 奖励弹窗 ── */}
      <AnimatePresence>
        {showRewards && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 14 }}
              className="w-full max-w-sm rounded-3xl p-6 text-center"
              style={{ background: "#fffbf5", border: "1px solid rgba(249,115,22,0.25)", boxShadow: "0 20px 60px rgba(249,115,22,0.2)" }}>
              <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.5 }} className="text-5xl mb-3">🎉</motion.div>
              <h3 className="font-black text-lg mb-1" style={{ color: "#92400e" }}>{cat.name} {isZh ? "回来了！" : "is back!"}</h3>
              <p className="text-sm mb-4" style={{ color: "#b45309" }}>{isZh ? "带回了以下战利品" : "Loot collected!"}</p>
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  <span className="text-sm font-semibold" style={{ color: "#92400e" }}>✨ {isZh ? "材料碎片" : "Fragments"}</span>
                  <span className="text-sm font-black" style={{ color: "#a855f7" }}>+{rewardFragments}</span>
                </div>
                {rewards.map((r, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.15 }}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)" }}>
                    <span className="text-sm font-semibold" style={{ color: "#92400e" }}>{r.icon} {r.name} NFT</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: r.rarity === "珍稀" ? "rgba(245,158,11,0.15)" : r.rarity === "稀有" ? "rgba(96,165,250,0.15)" : "rgba(156,163,175,0.15)",
                        color: r.rarity === "珍稀" ? "#d97706" : r.rarity === "稀有" ? "#3b82f6" : "#9CA3AF",
                      }}>
                      {r.rarity}
                    </span>
                  </motion.div>
                ))}
                {rewards.length === 0 && (
                  <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: "rgba(249,115,22,0.04)", color: "#b45309" }}>
                    {isZh ? "这次没有 NFT 掉落（未携带道具）" : "No NFT drop (no item brought)"}
                  </div>
                )}
              </div>
              <button onClick={() => { setShowRewards(false); loadChainData(); loadCollections(); }}
                className="w-full py-3.5 rounded-2xl text-white font-black text-sm"
                style={{ background: "linear-gradient(135deg,#F97316,#fbbf24)", cursor: "pointer", boxShadow: "0 4px 16px rgba(249,115,22,0.3)" }}>
                {isZh ? "太棒了！继续冒险" : "Awesome! Keep exploring"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-bold pointer-events-none"
          style={{ background: "#fffbf5", color: "#92400e", border: "1px solid rgba(249,115,22,0.3)", boxShadow: "0 8px 32px rgba(249,115,22,0.2)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
