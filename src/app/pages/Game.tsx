import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Zap, ShoppingBag, Package, ChevronRight, X, Clock, Trophy, Sparkles, Coins, Loader2 } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts } from "../../lib/contracts";

type HuntDuration = "short" | "medium" | "long";
type HuntItem = "none" | "food" | "can";
type CatState = "idle" | "hunting" | "returning" | "sleeping";

interface HuntState {
  active: boolean;
  startTime: number;
  duration: number;
  durationLabel: HuntDuration;
  item: HuntItem;
  useBooster: boolean;
}

interface Reward {
  type: string;
  name: string;
  rarity: string;
  icon: string;
}

const HUNT_DURATIONS: Record<HuntDuration, { label: string; ms: number; stamina: number; fragments: number }> = {
  short:  { label: "短途 (2h)", ms: 30 * 1000,  stamina: 1, fragments: 2  },
  medium: { label: "中途 (4h)", ms: 60 * 1000,  stamina: 2, fragments: 5  },
  long:   { label: "长途 (8h)", ms: 120 * 1000, stamina: 3, fragments: 15 },
};

const ITEMS: Record<HuntItem, { label: string; icon: string; cost: number; desc: string }> = {
  none: { label: "不携带",   icon: "🚫", cost: 0,  desc: "无道具" },
  food: { label: "猫粮 🐟", icon: "🐟", cost: 5,  desc: "普通 80% / 稀有 15% / 珍稀 5%" },
  can:  { label: "罐罐 🥫", icon: "🥫", cost: 15, desc: "普通 50% / 稀有 35% / 珍稀 15%" },
};

const COLLECTION_NFTS: Reward[] = [
  { type: "collection", name: "小猫玩耍", rarity: "普通", icon: "🐱" },
  { type: "collection", name: "小猫同伴", rarity: "稀有", icon: "😺" },
  { type: "collection", name: "小猫睡觉", rarity: "珍稀", icon: "😸" },
  { type: "equipment",  name: "猫爪武器", rarity: "精良", icon: "⚔️" },
  { type: "equipment",  name: "探险背包", rarity: "普通", icon: "🎒" },
  { type: "equipment",  name: "疾风靴",   rarity: "稀有", icon: "👟" },
];

function CatSVG({ state }: { state: CatState }) {
  const eyeOpen = state !== "sleeping";
  return (
    <svg viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <motion.path
        d="M85 110 Q110 90 105 70 Q100 50 90 60"
        stroke="#C4A882" strokeWidth="8" strokeLinecap="round" fill="none"
        animate={state === "idle" || state === "sleeping" ? { d: ["M85 110 Q110 90 105 70 Q100 50 90 60","M85 110 Q115 95 108 72 Q98 48 88 58","M85 110 Q110 90 105 70 Q100 50 90 60"] } : {}}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />
      <motion.ellipse cx="60" cy="95" rx="35" ry="28" fill="#E8C99A"
        animate={state === "idle" ? { ry: [28, 30, 28] } : {}}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }} />
      <ellipse cx="60" cy="100" rx="20" ry="16" fill="#F5DEB3" />
      <circle cx="60" cy="58" r="28" fill="#E8C99A" />
      <polygon points="35,38 28,16 50,32" fill="#E8C99A" />
      <polygon points="85,38 92,16 70,32" fill="#E8C99A" />
      <polygon points="37,36 32,22 48,33" fill="#F4A0A0" />
      <polygon points="83,36 88,22 72,33" fill="#F4A0A0" />
      {eyeOpen ? (
        <>
          <motion.ellipse cx="48" cy="55" rx="7" ry="8" fill="#1A1A2E"
            animate={{ ry: [8, 2, 8] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.05, 0.1], ease: "easeInOut" }} />
          <motion.ellipse cx="72" cy="55" rx="7" ry="8" fill="#1A1A2E"
            animate={{ ry: [8, 2, 8] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.05, 0.1], ease: "easeInOut" }} />
          <circle cx="51" cy="52" r="2" fill="white" />
          <circle cx="75" cy="52" r="2" fill="white" />
        </>
      ) : (
        <>
          <path d="M41 55 Q48 60 55 55" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M65 55 Q72 60 79 55" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}
      <polygon points="60,64 56,70 64,70" fill="#F4A0A0" />
      <path d="M56 70 Q60 74 64 70" stroke="#C4A882" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="20" y1="62" x2="50" y2="65" stroke="#C4A882" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="20" y1="68" x2="50" y2="68" stroke="#C4A882" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="70" y1="65" x2="100" y2="62" stroke="#C4A882" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="70" y1="68" x2="100" y2="68" stroke="#C4A882" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="38" cy="118" rx="12" ry="7" fill="#E8C99A" />
      <ellipse cx="82" cy="118" rx="12" ry="7" fill="#E8C99A" />
      {state === "sleeping" && (
        <g>
          <text x="92" y="30" fill="#A78BFA" fontSize="14" fontWeight="bold">z</text>
          <text x="100" y="20" fill="#A78BFA" fontSize="10" fontWeight="bold">z</text>
          <text x="106" y="12" fill="#A78BFA" fontSize="7" fontWeight="bold">z</text>
        </g>
      )}
    </svg>
  );
}

function RoomScene({ catState, catName }: { catState: CatState; catName: string }) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl select-none"
      style={{ background: "linear-gradient(180deg, #1a1035 0%, #2d1b5e 40%, #1a0d30 100%)" }}>
      <div className="absolute top-4 left-6 w-28 h-20 rounded-lg overflow-hidden"
        style={{ border: "3px solid #4a3060", background: "linear-gradient(180deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%)" }}>
        {[{ x: 20, y: 15 }, { x: 60, y: 8 }, { x: 90, y: 25 }, { x: 40, y: 35 }, { x: 75, y: 40 }].map((s, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full animate-pulse bg-white"
            style={{ left: s.x, top: s.y, animationDelay: `${i * 0.4}s`, opacity: 0.8 }} />
        ))}
        <div className="absolute right-3 top-2 w-6 h-6 rounded-full"
          style={{ background: "#FFF5CC", boxShadow: "0 0 10px rgba(255,245,204,0.5)" }} />
        <div className="absolute inset-0 border-2 border-[#4a3060]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-[2px]" style={{ background: "#4a3060" }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-[2px]" style={{ background: "#4a3060" }} />
        </div>
      </div>
      <div className="absolute top-4 right-4 w-24 h-24"
        style={{ background: "#3d2455", borderRadius: "4px", border: "2px solid #4a2d6a" }}>
        <div className="flex items-end h-full p-1 gap-0.5">
          {[{ h: "70%", color: "#7C3AED" }, { h: "85%", color: "#06B6D4" }, { h: "60%", color: "#F59E0B" }, { h: "90%", color: "#EC4899" }, { h: "75%", color: "#10B981" }]
            .map((b, i) => <div key={i} className="flex-1 rounded-sm" style={{ height: b.h, background: b.color, opacity: 0.8 }} />)}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-2 rounded-b" style={{ background: "#5a3070" }} />
        <div className="absolute -top-3 right-2 text-xs">🐾</div>
      </div>
      <div className="absolute top-8 left-40 text-lg opacity-60">🌙</div>
      <div className="absolute top-6 right-32 text-sm opacity-40">⭐</div>
      <div className="absolute bottom-0 left-0 right-0 h-24 rounded-b-2xl"
        style={{ background: "linear-gradient(180deg, #3d2455 0%, #2d1b3e 100%)" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0"
            style={{ left: `${i * 12.5}%`, width: "1px", background: "rgba(109,58,238,0.04)" }} />
        ))}
      </div>
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-36 h-10 rounded-full"
        style={{ background: "linear-gradient(135deg, #7C3AED40, #5b21b640)", border: "2px solid rgba(167,139,250,0.3)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
        <div className="absolute inset-x-2 top-1 bottom-2 rounded-full" style={{ background: "rgba(167,139,250,0.1)" }} />
      </div>
      <motion.div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-28 h-32"
        animate={
          catState === "hunting"   ? { x: [0, -60, -300], opacity: [1, 1, 0] } :
          catState === "returning" ? { x: [300, 60, 0], opacity: [0, 1, 1] } :
          catState === "idle"      ? { y: [0, -5, 0] } : { y: 0 }
        }
        transition={
          catState === "hunting" || catState === "returning" ? { duration: 1.5, ease: "easeInOut" } :
          catState === "idle" ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" } : {}
        }>
        <CatSVG state={catState} />
      </motion.div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-xs"
        style={{ background: "rgba(0,0,0,0.4)", color: "#4c4980", fontFamily: "'Space Grotesk', sans-serif" }}>
        {catState === "hunting" ? "🏃 外出探险中" : catState === "returning" ? "🎉 回来了！" : catState === "sleeping" ? "😴 休息中" : `💤 ${catName}`}
      </div>
      {catState === "hunting" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="text-5xl mb-3">🌲</div>
            <p className="text-sm" style={{ color: "#4c4980", fontFamily: "'Nunito', sans-serif" }}>正在外出探险...</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export function Game() {
  const { catId } = useParams();
  const navigate  = useNavigate();
  const { purrBalance } = useApp();

  // ── 链上猫咪数据 ─────────────────────────────────────────
  const [cat, setCat]           = useState<{ id: number; name: string; image: string; stage: number } | null>(null);
  const [catLoading, setCatLoading] = useState(true);
  const [catError,   setCatError]   = useState<string | null>(null);

  useEffect(() => {
    if (!catId) return;
    const load = async () => {
      setCatLoading(true); setCatError(null);
      try {
        const c = getReadonlyContracts();
        const raw = await c.catRegistry.getCat(Number(catId)) as {
          name: string; stageURIs: string[]; shelter: string; status: number;
        };
        if (!raw.shelter || raw.shelter === "0x0000000000000000000000000000000000000000") {
          setCatError("找不到该猫咪"); return;
        }
        const uris  = Array.from(raw.stageURIs) as string[];
        const stage = uris.reduce((last, uri, idx) => uri && uri !== "" ? idx + 1 : last, 1);
        const firstUri = uris.find(u => u && u !== "") ?? "";
        let image = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80";
        if (firstUri) {
          try {
            const httpUri = firstUri.startsWith("ipfs://") ? firstUri.replace("ipfs://", "https://ipfs.io/ipfs/") : firstUri;
            const res  = await fetch(httpUri, { signal: AbortSignal.timeout(5000) });
            const json = await res.json() as { image?: string };
            if (json.image) image = json.image.startsWith("ipfs://") ? json.image.replace("ipfs://", "https://ipfs.io/ipfs/") : json.image;
          } catch { /* fallback */ }
        }
        setCat({ id: Number(catId), name: raw.name, image, stage });
      } catch {
        setCatError("读取猫咪数据失败");
      } finally { setCatLoading(false); }
    };
    load();
  }, [catId]);

  // ── 游戏状态 ─────────────────────────────────────────────
  const [catState, setCatState]   = useState<CatState>("idle");
  const [stamina,  setStamina]    = useState(() => parseInt(localStorage.getItem(`stamina_${catId}`) || "5"));
  const [fragments, setFragments] = useState(0);
  const [purr, setPurr]           = useState(() => {
    const saved = localStorage.getItem(`purr_${catId}`);
    return saved !== null ? saved : purrBalance;
  });
  const [staminaRestore, setStaminaRestore] = useState<number>(() => parseInt(localStorage.getItem(`stamina_restore_${catId}`) || "0"));
  const [showShop, setShowShop]   = useState(false);
  const [showHuntModal, setShowHuntModal] = useState(false);
  const [huntConfig, setHuntConfig] = useState<{ duration: HuntDuration; item: HuntItem; booster: boolean }>({
    duration: "short", item: "none", booster: false,
  });
  const [hunt, setHunt]           = useState<HuntState | null>(null);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [rewards, setRewards]     = useState<Reward[]>([]);
  const [showRewards, setShowRewards] = useState(false);
  const [inventory, setInventory] = useState<{ fragments: number; items: string[] }>({ fragments: 0, items: [] });
  const [foodCount,    setFoodCount]    = useState(() => parseInt(localStorage.getItem(`food_${catId}`) || "0"));
  const [canCount,     setCanCount]     = useState(() => parseInt(localStorage.getItem(`can_${catId}`) || "0"));
  const [boosterCount, setBoosterCount] = useState(() => parseInt(localStorage.getItem(`booster_${catId}`) || "0"));
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    const savedHunt = localStorage.getItem(`hunt_${catId}`);
    if (savedHunt) {
      const h: HuntState = JSON.parse(savedHunt);
      if (h.active) {
        const elapsed = Date.now() - h.startTime;
        if (elapsed >= h.duration) {
          setCatState("returning"); setHunt(null);
          localStorage.removeItem(`hunt_${catId}`);
          setTimeout(() => { settleRewards(h.item); setCatState("idle"); }, 2000);
        } else {
          setHunt(h); setCatState("hunting"); setTimeLeft(Math.ceil((h.duration - elapsed) / 1000));
        }
      }
    }
  }, [catId]);

  // Persist purr and stamina
  useEffect(() => { localStorage.setItem(`purr_${catId}`, String(purr)); }, [purr, catId]);
  useEffect(() => { localStorage.setItem(`stamina_${catId}`, String(stamina)); }, [stamina, catId]);
  useEffect(() => { localStorage.setItem(`food_${catId}`, String(foodCount)); }, [foodCount, catId]);
  useEffect(() => { localStorage.setItem(`can_${catId}`, String(canCount)); }, [canCount, catId]);
  useEffect(() => { localStorage.setItem(`booster_${catId}`, String(boosterCount)); }, [boosterCount, catId]);

  useEffect(() => {
    if (hunt && catState === "hunting") {
      timerRef.current = setInterval(() => {
        const elapsed   = Date.now() - hunt.startTime;
        const remaining = hunt.duration - elapsed;
        if (remaining <= 0) {
          clearInterval(timerRef.current!); setHunt(null);
          localStorage.removeItem(`hunt_${catId}`); setCatState("returning");
          setTimeout(() => { settleRewards(hunt.item); setCatState("idle"); }, 2000);
        } else { setTimeLeft(Math.ceil(remaining / 1000)); }
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hunt, catState]);

  const settleRewards = (item: HuntItem) => {
    const newRewards: Reward[] = [];
    const fragmentCount = Math.floor(Math.random() * 5) + 2;
    setFragments(f => f + fragmentCount);
    setInventory(inv => ({ ...inv, fragments: inv.fragments + fragmentCount }));
    if (item !== "none") {
      const roll = Math.random();
      let rarity = "普通";
      if (item === "can")  { if (roll < 0.15) rarity = "珍稀"; else if (roll < 0.5) rarity = "稀有"; }
      else                 { if (roll < 0.05) rarity = "珍稀"; else if (roll < 0.2) rarity = "稀有"; }
      const eligible = COLLECTION_NFTS.filter(n => n.rarity === rarity);
      if (eligible.length > 0) {
        const reward = eligible[Math.floor(Math.random() * eligible.length)];
        newRewards.push(reward);
        setInventory(inv => ({ ...inv, items: [...inv.items, `${reward.icon} ${reward.name}`] }));
      }
    }
    setRewards(newRewards); setShowRewards(true);
  };

  const startHunt = () => {
    const dur = HUNT_DURATIONS[huntConfig.duration];
    if (stamina < dur.stamina) return;
    let actualMs = dur.ms;
    if (huntConfig.booster) actualMs = Math.max(actualMs * 0.5, dur.ms * 0.1);
    const itemCost = ITEMS[huntConfig.item].cost;
    const purrNum = typeof purr === "string" ? parseFloat(purr) : purr;
    if (huntConfig.booster && purrNum < 10 + itemCost) { showToast("❌ PURR 不足！"); return; }
    if (!huntConfig.booster && purrNum < itemCost) { showToast("❌ PURR 不足！"); return; }
    const cost = itemCost + (huntConfig.booster ? 10 : 0);
    setPurr((p: any) => (parseFloat(String(p)) - cost).toFixed(0)); setStamina(s => s - dur.stamina);
    const newHunt: HuntState = { active: true, startTime: Date.now(), duration: actualMs, durationLabel: huntConfig.duration, item: huntConfig.item, useBooster: huntConfig.booster };
    setHunt(newHunt); localStorage.setItem(`hunt_${catId}`, JSON.stringify(newHunt));
    setCatState("hunting"); setTimeLeft(Math.ceil(actualMs / 1000)); setShowHuntModal(false);
  };

  const formatTime = (s: number) => { if (s <= 0) return "0s"; const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}m ${sec}s` : `${sec}s`; };
  const buyItem = (type: string, cost: number, name: string) => {
    const purrNum = typeof purr === "string" ? parseFloat(purr) : purr;
    if (purrNum < cost) { showToast("❌ PURR 不足！"); return; }
    setPurr((p: any) => (parseFloat(String(p)) - cost).toFixed(0));
    if (type === "stamina") {
      setStamina(s => Math.min(5, s + 1));
      showToast("✅ 体力恢复 +1");
    } else if (type === "food") {
      setFoodCount(c => c + 1);
      setInventory(inv => ({ ...inv, items: [...inv.items, "🐟 猫粮"] }));
      showToast("✅ 购买猫粮 x1");
    } else if (type === "can") {
      setCanCount(c => c + 1);
      setInventory(inv => ({ ...inv, items: [...inv.items, "🥫 罐罐"] }));
      showToast("✅ 购买罐罐 x1");
    } else if (type === "booster") {
      setBoosterCount(c => c + 1);
      setInventory(inv => ({ ...inv, items: [...inv.items, "⚡ 加速符"] }));
      showToast("✅ 购买加速符 x1");
    }
  };

  // ── 加载中 / 错误 早退 ───────────────────────────────────
  if (catLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f5ff" }}>
      <Navbar />
      <Loader2 size={32} className="animate-spin" style={{ color: "#A78BFA" }} />
    </div>
  );

  if (catError || !cat) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#f7f5ff" }}>
      <Navbar />
      <div className="text-5xl">😿</div>
      <p className="font-bold text-lg" style={{ color: "#92400e" }}>{catError ?? "找不到该猫咪"}</p>
      <button onClick={() => navigate("/dashboard")}
        className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
        style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer" }}>
        返回档案馆
      </button>
    </div>
  );

  // ── 正常渲染 ─────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#f7f5ff", fontFamily: "'Nunito', sans-serif" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-8">
        <button onClick={() => navigate(`/cat/${cat.id}`)} className="flex items-center gap-2 mb-4 text-sm" style={{ color: "#7c7aaa" }}>
          <ArrowLeft size={15} /> 返回 {cat.name} 的档案
        </button>

        {/* Status Bar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-4 flex flex-wrap gap-4 items-center justify-between"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ border: "2px solid rgba(167,139,250,0.3)" }}>
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>{cat.name}</div>
              <div className="text-xs" style={{ color: "#A78BFA" }}>Stage {cat.stage}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: "#FCD34D" }} />
            <span className="text-xs" style={{ color: "#7c7aaa" }}>体力</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-4 h-4 rounded-sm"
                  style={{ background: i <= stamina ? "#F59E0B" : "rgba(109,58,238,0.08)", boxShadow: i <= stamina ? "0 0 6px rgba(245,158,11,0.4)" : "none" }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: "#7c7aaa" }}>{stamina}/5</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Coins size={14} style={{ color: "#FCD34D" }} />
            <span className="text-sm" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>{purr} PURR</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <Sparkles size={14} style={{ color: "#A78BFA" }} />
            <span className="text-sm" style={{ color: "#A78BFA", fontFamily: "'Space Grotesk', sans-serif" }}>{fragments} 碎片</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Room Scene */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-2xl overflow-hidden" style={{ height: 380 }}>
              <RoomScene catState={catState} catName={cat.name} />
              {catState === "hunting" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <Clock size={14} style={{ color: "#FCD34D" }} />
                  <span className="text-sm" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>{formatTime(timeLeft)} 后归来</span>
                </motion.div>
              )}
            </motion.div>
            <div className="flex gap-3 mt-4">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => catState === "idle" && setShowHuntModal(true)}
                disabled={catState !== "idle" || stamina === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm"
                style={{
                  background: catState !== "idle" || stamina === 0 ? "rgba(109,58,238,0.06)" : "linear-gradient(135deg, #7C3AED, #06B6D4)",
                  color: catState !== "idle" || stamina === 0 ? "rgba(100,100,180,0.5)" : "#fff",
                  cursor: catState !== "idle" || stamina === 0 ? "default" : "pointer",
                  boxShadow: catState !== "idle" || stamina === 0 ? "none" : "0 0 25px rgba(124,58,237,0.4)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                {catState === "hunting" ? <><Clock size={15} /> 探险中...</> : catState === "returning" ? <><Trophy size={15} /> 归来中...</> : stamina === 0 ? "体力耗尽，等待恢复" : <><ChevronRight size={15} /> 派出探险</>}
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowShop(true)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm"
                style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer" }}>
                <ShoppingBag size={15} /> 商店
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setCatState(catState === "sleeping" ? "idle" : "sleeping")}
                className="px-4 py-3.5 rounded-2xl text-lg" title="休息"
                style={{ background: "rgba(109,58,238,0.06)", border: "1px solid rgba(109,58,238,0.08)", cursor: "pointer" }}>
                {catState === "sleeping" ? "⏰" : "😴"}
              </motion.button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #ddd6fe" }}>
              <div className="flex items-center gap-2 mb-3">
                <Package size={14} style={{ color: "#A78BFA" }} />
                <span className="text-sm font-bold" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>背包</span>
              </div>
              {inventory.items.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "#a8a6c8" }}>还没有物品<br />派猫咪出去探险吧！</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {inventory.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.15)" }}>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              )}
              {inventory.fragments > 0 && (
                <div className="mt-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA" }}>
                  ✨ {inventory.fragments} 材料碎片 (10个 = 1张抽卡券)
                </div>
              )}
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #ddd6fe" }}>
              <div className="text-xs font-bold mb-2 flex items-center justify-between" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>
                <span>🎴 抽卡</span>
              </div>
              <div className="text-xs mb-2" style={{ color: "#7c7aaa" }}>碎片：{inventory.fragments} / 10 = {Math.floor(inventory.fragments/10)} 券</div>
              <button
                onClick={() => { if (inventory.fragments >= 10) { setInventory(inv => ({ ...inv, fragments: inv.fragments - 10 })); showToast("🎉 获得 1 张抽卡券！去抽卡页面使用"); } else showToast("❌ 碎片不足 10 个"); }}
                className="w-full py-2 rounded-xl text-xs font-bold mb-2"
                style={{ background: inventory.fragments >= 10 ? "linear-gradient(135deg, #7C3AED, #06B6D4)" : "rgba(109,58,238,0.06)", color: inventory.fragments >= 10 ? "#fff" : "#a8a6c8", cursor: inventory.fragments >= 10 ? "pointer" : "default" }}>
                🔮 10碎片 → 1抽卡券
              </button>
              <button onClick={() => { window.location.href = "/gacha"; }}
                className="w-full py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D", cursor: "pointer" }}>
                ✨ 前往抽卡页面
              </button>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #ddd6fe" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>💡 游戏提示</div>
              <ul className="space-y-1.5 text-xs" style={{ color: "#7c7aaa" }}>
                <li>⚡ 体力每 8 小时恢复 1 点</li>
                <li>🐟 携带猫粮或罐罐可带回 NFT</li>
                <li>🎒 背包装备增加碎片产出</li>
                <li>👟 靴子装备缩短探险时长</li>
                <li>🔮 10 碎片合成 1 张抽卡券</li>
              </ul>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #ddd6fe" }}>
              <div className="text-xs font-bold mb-3" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>🎴 收藏系列</div>
              <div className="grid grid-cols-3 gap-2">
                {[{ icon: "🐱", name: "玩耍", rarity: "普通" }, { icon: "😺", name: "同伴", rarity: "稀有" }, { icon: "😸", name: "睡觉", rarity: "珍稀" }].map(n => (
                  <div key={n.name} className="text-center p-2 rounded-xl" style={{ background: "rgba(109,58,238,0.04)", border: "1px solid rgba(109,58,238,0.08)" }}>
                    <div className="text-2xl mb-1">{n.icon}</div>
                    <div className="text-xs" style={{ color: "#7c7aaa" }}>{n.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: n.rarity === "珍稀" ? "#F59E0B" : n.rarity === "稀有" ? "#06B6D4" : "#a8a6c8" }}>{n.rarity}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hunt Modal */}
      <AnimatePresence>
        {showHuntModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md rounded-3xl p-6"
              style={{ background: "linear-gradient(145deg, #0D0D2B, #140D40)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>配置探险</h3>
                <button onClick={() => setShowHuntModal(false)} className="p-1.5 rounded-lg" style={{ background: "rgba(109,58,238,0.08)", color: "#7c7aaa", cursor: "pointer" }}><X size={15} /></button>
              </div>
              <div className="mb-4">
                <label className="text-xs mb-2 block" style={{ color: "#7c7aaa" }}>探险时长</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(HUNT_DURATIONS) as [HuntDuration, typeof HUNT_DURATIONS[HuntDuration]][]).map(([key, val]) => (
                    <button key={key} onClick={() => setHuntConfig(c => ({ ...c, duration: key }))}
                      className="py-2 px-1 rounded-xl text-xs text-center transition-all"
                      style={{ background: huntConfig.duration === key ? "rgba(124,58,237,0.3)" : "rgba(109,58,238,0.06)", border: huntConfig.duration === key ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(109,58,238,0.08)", color: huntConfig.duration === key ? "#A78BFA" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                      <div>{val.label}</div>
                      <div className="mt-0.5" style={{ color: huntConfig.duration === key ? "#FCD34D" : "rgba(255,255,255,0.3)" }}>⚡{val.stamina} +{val.fragments}碎片</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs mb-2 block" style={{ color: "#7c7aaa" }}>携带道具</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(ITEMS) as [HuntItem, typeof ITEMS[HuntItem]][]).map(([key, val]) => (
                    <button key={key} onClick={() => setHuntConfig(c => ({ ...c, item: key }))}
                      className="py-2 px-1 rounded-xl text-xs text-center transition-all"
                      style={{ background: huntConfig.item === key ? "rgba(124,58,237,0.3)" : "rgba(109,58,238,0.06)", border: huntConfig.item === key ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(109,58,238,0.08)", color: huntConfig.item === key ? "#A78BFA" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                      <div>{val.label}</div>
                      <div className="mt-0.5" style={{ color: val.cost > 0 ? "#FCD34D" : "rgba(255,255,255,0.3)" }}>{val.cost > 0 ? `${val.cost} PURR` : "免费"}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setHuntConfig(c => ({ ...c, booster: !c.booster }))}
                className="w-full py-2.5 rounded-xl text-xs mb-5 flex items-center justify-between px-4 transition-all"
                style={{ background: huntConfig.booster ? "rgba(245,158,11,0.15)" : "rgba(109,58,238,0.04)", border: huntConfig.booster ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(109,58,238,0.08)", color: huntConfig.booster ? "#FCD34D" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                <span>⚡ 使用加速符（时长减半）</span>
                <span style={{ color: huntConfig.booster ? "#FCD34D" : "rgba(255,255,255,0.3)" }}>10 PURR</span>
              </button>
              <div className="flex justify-between items-center mb-4 px-3 py-2 rounded-xl" style={{ background: "rgba(109,58,238,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-xs" style={{ color: "#7c7aaa" }}>总消耗</span>
                <span className="text-xs" style={{ color: "#FCD34D", fontFamily: "'Space Grotesk', sans-serif" }}>
                  ⚡{HUNT_DURATIONS[huntConfig.duration].stamina} + {ITEMS[huntConfig.item].cost + (huntConfig.booster ? 10 : 0)} PURR
                </span>
              </div>
              <button onClick={startHunt} disabled={stamina < HUNT_DURATIONS[huntConfig.duration].stamina}
                className="w-full py-3 rounded-2xl text-sm"
                style={{ background: stamina >= HUNT_DURATIONS[huntConfig.duration].stamina ? "linear-gradient(135deg, #7C3AED, #06B6D4)" : "rgba(109,58,238,0.06)", color: stamina >= HUNT_DURATIONS[huntConfig.duration].stamina ? "#fff" : "rgba(255,255,255,0.3)", cursor: stamina >= HUNT_DURATIONS[huntConfig.duration].stamina ? "pointer" : "default", fontFamily: "'Space Grotesk', sans-serif", boxShadow: stamina >= HUNT_DURATIONS[huntConfig.duration].stamina ? "0 0 20px rgba(124,58,237,0.4)" : "none" }}>
                {stamina < HUNT_DURATIONS[huntConfig.duration].stamina ? "体力不足" : "🐾 出发探险！"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shop Modal */}
      <AnimatePresence>
        {showShop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md rounded-3xl p-6"
              style={{ background: "linear-gradient(145deg, #0D0D2B, #140D40)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>🏪 道具商店</h3>
                <button onClick={() => setShowShop(false)} className="p-1.5 rounded-lg" style={{ background: "rgba(109,58,238,0.08)", color: "#7c7aaa", cursor: "pointer" }}><X size={15} /></button>
              </div>
              <div className="text-xs mb-4 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: "rgba(245,158,11,0.1)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Coins size={13} /> 余额：{purr} PURR
              </div>
              <div className="space-y-3">
                {[
                  { icon: "🐟", name: "猫粮",   desc: `带回 NFT 概率提升（已有：${foodCount}）`,     cost: 5,  action: () => buyItem("food", 5, "猫粮") },
                  { icon: "🥫", name: "罐罐",   desc: `稀有 NFT 概率大幅提升（已有：${canCount}）`, cost: 15, action: () => buyItem("can", 15, "罐罐") },
                  { icon: "⚡", name: "体力恢复", desc: "立即恢复 1 点体力",    cost: 8,  action: () => buyItem("stamina", 8, "体力") },
                  { icon: "🔮", name: "加速符", desc: `本次出猎时长减半（已有：${boosterCount}）`,  cost: 10, action: () => buyItem("booster", 10, "加速符") },
                ].map(item => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: "rgba(109,58,238,0.04)", border: "1px solid rgba(109,58,238,0.08)" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="text-sm font-bold" style={{ color: "#e2d9f3", fontFamily: "'Space Grotesk', sans-serif" }}>{item.name}</div>
                        <div className="text-xs" style={{ color: "#7c7aaa" }}>{item.desc}</div>
                      </div>
                    </div>
                    <button onClick={item.action} disabled={purr < item.cost}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: purr >= item.cost ? "rgba(124,58,237,0.2)" : "rgba(109,58,238,0.04)", border: purr >= item.cost ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(109,58,238,0.06)", color: purr >= item.cost ? "#A78BFA" : "rgba(109,58,238,0.25)", cursor: purr >= item.cost ? "pointer" : "default" }}>
                      {item.cost} PURR
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-bold"
          style={{ background: "rgba(15,12,40,0.95)", color: "#e2d9f3", border: "1px solid rgba(167,139,250,0.3)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {toast}
        </div>
      )}

      {/* Rewards Modal */}
      <AnimatePresence>
        {showRewards && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 text-center"
              style={{ background: "linear-gradient(145deg, #0D0D2B, #1a0d40)", border: "1px solid #c4b5fd", boxShadow: "0 0 60px rgba(124,58,237,0.4)" }}>
              <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.5 }} className="text-5xl mb-4">🎉</motion.div>
              <h3 className="font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{cat.name} 回来了！</h3>
              <p className="text-sm mb-4" style={{ color: "#4c4980" }}>带回了以下战利品</p>
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between px-4 py-2 rounded-xl" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <span className="text-sm text-white">✨ 材料碎片</span>
                  <span className="text-sm" style={{ color: "#A78BFA", fontFamily: "'Space Grotesk', sans-serif" }}>+{fragments} 个</span>
                </div>
                {rewards.map((r, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.15 }}
                    className="flex items-center justify-between px-4 py-2 rounded-xl"
                    style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <span className="text-sm text-white">{r.icon} {r.name} NFT</span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: r.rarity === "珍稀" ? "rgba(245,158,11,0.2)" : r.rarity === "稀有" ? "rgba(6,182,212,0.2)" : "rgba(109,58,238,0.08)", color: r.rarity === "珍稀" ? "#FCD34D" : r.rarity === "稀有" ? "#06B6D4" : "rgba(255,255,255,0.5)" }}>
                      {r.rarity}
                    </span>
                  </motion.div>
                ))}
                {rewards.length === 0 && (
                  <div className="px-4 py-2 rounded-xl text-sm" style={{ background: "rgba(109,58,238,0.06)", color: "#7c7aaa" }}>
                    这次没有 NFT 掉落（未携带道具）
                  </div>
                )}
              </div>
              <button onClick={() => setShowRewards(false)} className="w-full py-3 rounded-2xl text-white text-sm"
                style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer" }}>
                太棒了！继续冒险
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
