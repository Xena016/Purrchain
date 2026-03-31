import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Wallet, Building2, Shield, Coins, Gamepad2, Heart, ChevronDown, ExternalLink } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Navbar } from "../components/Navbar";

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars: { x: number; y: number; r: number; alpha: number; speed: number }[] = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random(),
        speed: Math.random() * 0.3 + 0.05,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.alpha += s.speed * 0.01;
        const a = (Math.sin(s.alpha) + 1) / 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.7})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", handleResize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

const features = [
  {
    icon: <Shield size={24} />,
    color: "#7C3AED",
    title: "区块链透明",
    desc: "所有捐款流向链上公开，直达机构钱包，平台完全不经手，真正做到透明可查。",
  },
  {
    icon: <Heart size={24} />,
    color: "#EC4899",
    title: "真实领养",
    desc: "每只猫咪都有真实档案，支持线下领养。保证金制度保障猫咪健康归宿。",
  },
  {
    icon: <Coins size={24} />,
    color: "#F59E0B",
    title: "动态成长 NFT",
    desc: "云领养的猫咪随时间成长，NFT 图案随之更新。真实领养更可获得 Genesis 专属 NFT。",
  },
  {
    icon: <Gamepad2 size={24} />,
    color: "#06B6D4",
    title: "放置类游戏",
    desc: "选择你的初始猫咪，派它出去探险。归来时带回稀有道具和 NFT，寓教于乐。",
  },
];

const steps = [
  { num: "01", title: "连接钱包", desc: "使用 MetaMask 连接 Avalanche Fuji 测试网" },
  { num: "02", title: "领取全家福 NFT", desc: "每季限量全家福 NFT，每个地址仅限一枚" },
  { num: "03", title: "领取 20 $PURR", desc: "初始游戏代币，用于购买道具和装备" },
  { num: "04", title: "选择你的猫咪", desc: "从真实收容猫咪档案中选择初始伙伴" },
];

export function Landing() {
  const navigate = useNavigate();
  const { connectWallet, isConnected } = useApp();

  const handleConnectAndGo = () => {
    if (!isConnected) connectWallet();
    navigate("/dashboard");
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: "#f7f5ff", fontFamily: "'Nunito', sans-serif" }}
    >
      <Navbar />
      <StarField />

      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #7C3AED 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #06B6D4 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #EC4899 0%, transparent 70%)" }} />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-6"
            style={{
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#A78BFA",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#A78BFA" }} />
            部署在 Avalanche C-Chain · Fuji 测试网
            <ExternalLink size={10} />
          </div>

          {/* Title */}
          <h1
            className="mb-4"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(2.5rem, 8vw, 5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{
              background: "linear-gradient(135deg, #A78BFA, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Purr</span>
            <span className="text-white">Chain</span>
          </h1>

          <div className="text-5xl mb-6">🐾</div>

          <p
            className="max-w-xl mx-auto mb-8 text-lg"
            style={{ color: "#4c4980", lineHeight: 1.7 }}
          >
            去中心化猫咪领养平台。用区块链记录每一只猫的故事，
            <br className="hidden sm:block" />
            让每一笔捐款都透明可查，直达收容机构。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConnectAndGo}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white text-base"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                boxShadow: "0 0 40px rgba(124,58,237,0.5)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Wallet size={18} />
              {isConnected ? "进入猫咪档案" : "连接钱包 · 用户入场"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/institution/register")}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base"
              style={{
                background: "rgba(109,58,238,0.06)",
                border: "1px solid rgba(109,58,238,0.2)",
                color: "#2d2a6e",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Building2 size={18} />
              机构注册入驻
            </motion.button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-14">
            {[
              { num: "8", label: "档案猫咪" },
              { num: "3", label: "合作机构" },
              { num: "100%", label: "链上透明" },
              { num: "0", label: "平台经手" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl" style={{ color: "#A78BFA", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                  {s.num}
                </div>
                <div className="text-xs mt-1" style={{ color: "#7c7aaa" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <span className="text-xs" style={{ color: "#a8a6c8" }}>向下探索</span>
          <ChevronDown size={16} style={{ color: "#a8a6c8" }} />
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative px-6 py-24 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2
            className="mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1e1b4b", fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
          >
            为什么选择 PurrChain？
          </h2>
          <p style={{ color: "#7c7aaa" }}>区块链 × 真实领养 × 游戏化体验</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl"
              style={{
                background: "rgba(109,58,238,0.04)",
                border: "1px solid rgba(109,58,238,0.08)",
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}20`, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#7c7aaa" }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-6 py-24" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1e1b4b", fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>
              新用户入场三步骤
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="p-5 rounded-2xl h-full"
                  style={{ background: "rgba(109,58,238,0.04)", border: "1px solid #ddd6fe" }}>
                  <div
                    className="text-3xl mb-3"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: "rgba(167,139,250,0.3)", fontWeight: 700 }}
                  >
                    {s.num}
                  </div>
                  <div className="text-sm text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {s.title}
                  </div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {s.desc}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 text-purple-600 z-10">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NFT Types */}
      <section className="relative px-6 py-24 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1e1b4b", fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>
            NFT 类型一览
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🖼️", name: "全家福 NFT", desc: "新用户入场凭证，每季一换，可领 20 PURR", color: "#7C3AED" },
            { icon: "☁️", name: "云领养 NFT", desc: "捐款达标自动铸造，随猫咪成长（幼/少/成年）", color: "#06B6D4" },
            { icon: "🏆", name: "Genesis NFT", desc: "真实领养通过回访后专属，stage 4 最高级", color: "#F59E0B" },
          ].map((n, i) => (
            <motion.div
              key={n.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl text-center"
              style={{ background: `${n.color}10`, border: `1px solid ${n.color}30` }}
            >
              <div className="text-4xl mb-3">{n.icon}</div>
              <div className="text-sm text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {n.name}
              </div>
              <div className="text-xs" style={{ color: "#7c7aaa" }}>{n.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="relative px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-block text-5xl mb-6">🐱</div>
          <h2 className="mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1e1b4b", fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
            有一只猫咪正在等待你
          </h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: "#7c7aaa" }}>
            连接钱包，领取免费 NFT，开始你的爱猫之旅。
            每一笔支持都将帮助真实的猫咪找到温暖的家。
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleConnectAndGo}
            className="px-10 py-4 rounded-2xl text-white"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
              boxShadow: "0 0 50px rgba(124,58,237,0.5)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            开始探索 →
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t px-6 py-8 text-center"
        style={{ borderColor: "rgba(109,58,238,0.06)", color: "#a8a6c8" }}>
        <div className="text-sm">
          PurrChain · 部署在 Avalanche Fuji 测试网 (chainId: 43113)
        </div>
        <div className="text-xs mt-2">
          所有资金流向链上透明可查 · 捐款直达机构钱包 · 平台不经手
        </div>
      </footer>
    </div>
  );
}
