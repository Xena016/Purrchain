import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Wallet, LogOut, Menu, X, Coins, ChevronDown, User, Gift, Gamepad2, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";

export function Navbar() {
  const {
    walletAddress, isConnected, purrBalance,
    connectWallet, disconnectWallet,
    lang, setLang,
    nftClaimed, starterCatClaimed, starterCatId,
  } = useApp();

  const [menuOpen,  setMenuOpen]  = useState(false);
  const [myMenuOpen, setMyMenuOpen] = useState(false);
  const navigate   = useNavigate();
  const location   = useLocation();
  const isZh = lang === "zh";

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  const handleConnect = async () => {
    await connectWallet();
    navigate("/dashboard");
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #ddd6fe",
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 flex-shrink-0">
        <span className="text-2xl">🐾</span>
        <span className="hidden sm:block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <span style={{ color: "#6d3aee" }}>Purr</span>
          <span style={{ color: "#06B6D4" }}>Chain</span>
        </span>
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-5">
        {/* 猫咪档案 */}
        <Link to="/dashboard"
          className="text-sm transition-colors"
          style={{
            color: location.pathname === "/dashboard" ? "#7ec8e3" : "rgba(255,255,255,0.65)",
            fontFamily: "'Nunito', sans-serif",
          }}>
          {isZh ? "猫咪档案" : "Cat Registry"}
        </Link>

        {/* 机构注册 */}
        <Link to="/institution/register"
          className="text-sm transition-colors"
          style={{
            color: location.pathname === "/institution/register" ? "#7ec8e3" : "rgba(255,255,255,0.65)",
            fontFamily: "'Nunito', sans-serif",
          }}>
          {isZh ? "机构注册" : "Register"}
        </Link>

        {/* 抽卡入口（连接后显示）*/}
        {isConnected && (
          <Link to="/gacha"
            className="text-sm transition-colors flex items-center gap-1"
            style={{
              color: location.pathname === "/gacha" ? "#FBBF24" : "rgba(255,255,255,0.65)",
              fontFamily: "'Nunito', sans-serif",
            }}>
            <Sparkles size={13} />
            {isZh ? "抽卡" : "Gacha"}
          </Link>
        )}

        {/* PURR 余额 */}
        {isConnected && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
            style={{ background: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Coins size={13} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{purrBalance} PURR</span>
          </div>
        )}

        {/* 语言切换 */}
        <button
          onClick={() => setLang(isZh ? "en" : "zh")}
          className="px-2.5 py-1 rounded-lg text-xs transition-all"
          style={{
            background: "rgba(109,58,238,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#4c4980",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
          {isZh ? "EN" : "中文"}
        </button>

        {/* 钱包区域 */}
        {isConnected ? (
          <div className="relative">
            <button
              onClick={() => setMyMenuOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#6d3aee",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
              <User size={13} />
              {shortAddr}
              <ChevronDown size={12} style={{ transform: myMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {/* 「我的」下拉菜单 */}
            {myMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden"
                style={{ background: "#ffffff", border: "1px solid #ddd6fe", boxShadow: "0 8px 32px rgba(109,58,238,0.12)" }}
                onMouseLeave={() => setMyMenuOpen(false)}
              >
                {/* 用户信息 */}
                <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(109,58,238,0.06)" }}>
                  <p className="text-xs" style={{ color: "#7c7aaa" }}>{isZh ? "已连接" : "Connected"}</p>
                  <p className="text-sm mt-0.5" style={{ color: "#6d3aee", fontFamily: "'Space Grotesk', sans-serif" }}>{shortAddr}</p>
                </div>

                {/* 菜单项 */}
                <div className="py-2">
                  {/* 我的 NFT */}
                  <button
                    onClick={() => { navigate("/my-nfts"); setMyMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                    style={{ color: "#4c4980" }}>
                    <Gift size={14} style={{ color: "#f7a541" }} />
                    {isZh ? "我的 NFT" : "My NFTs"}
                    {!nftClaimed && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(247,165,65,0.2)", color: "#f7a541" }}>
                        {isZh ? "待领取" : "Claim"}
                      </span>
                    )}
                  </button>

                  {/* 游戏入口 */}
                  {starterCatClaimed && starterCatId !== null && (
                    <button
                      onClick={() => { navigate(`/game/${starterCatId}`); setMyMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                      style={{ color: "#4c4980" }}>
                      <Gamepad2 size={14} style={{ color: "#a855f7" }} />
                      {isZh ? "进入游戏" : "Play Game"}
                    </button>
                  )}

                  {/* 购买 PURR */}
                  <button
                    onClick={() => { navigate("/buy-purr"); setMyMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                    style={{ color: "#4c4980" }}>
                    <Coins size={14} style={{ color: "#FCD34D" }} />
                    {isZh ? "购买 PURR" : "Buy PURR"}
                  </button>

                  {/* 抽卡 */}
                  <button
                    onClick={() => { navigate("/gacha"); setMyMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                    style={{ color: "#4c4980" }}>
                    <Sparkles size={14} style={{ color: "#FBBF24" }} />
                    {isZh ? "装备抽卡" : "Equipment Gacha"}
                  </button>
                </div>

                {/* 断开钱包 */}
                <div className="px-4 py-2 border-t" style={{ borderColor: "rgba(109,58,238,0.06)" }}>
                  <button
                    onClick={() => { disconnectWallet(); setMyMenuOpen(false); }}
                    className="w-full flex items-center gap-2 py-2 text-sm transition-colors"
                    style={{ color: "rgba(255,100,100,0.7)" }}>
                    <LogOut size={14} />
                    {isZh ? "断开钱包" : "Disconnect"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
              color: "#1e1b4b",
              fontFamily: "'Nunito', sans-serif",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}>
            <Wallet size={15} />
            {isZh ? "连接钱包" : "Connect Wallet"}
          </button>
        )}
      </div>

      {/* Mobile toggle */}
      <button className="md:hidden" onClick={() => setMenuOpen(v => !v)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="absolute top-full left-0 right-0 p-4 flex flex-col gap-3 md:hidden"
          style={{ background: "#ffffff", borderBottom: "1px solid #ddd6fe" }}
        >
          <Link to="/dashboard" onClick={() => setMenuOpen(false)}
            className="py-2 text-sm" style={{ color: "#4c4980" }}>
            {isZh ? "猫咪档案" : "Cat Registry"}
          </Link>
          <Link to="/institution/register" onClick={() => setMenuOpen(false)}
            className="py-2 text-sm" style={{ color: "#4c4980" }}>
            {isZh ? "机构注册" : "Register"}
          </Link>
          {isConnected && (
            <>
              <Link to="/gacha" onClick={() => setMenuOpen(false)}
                className="py-2 text-sm" style={{ color: "#4c4980" }}>
                {isZh ? "装备抽卡" : "Gacha"}
              </Link>
              <Link to="/my-nfts" onClick={() => setMenuOpen(false)}
                className="py-2 text-sm" style={{ color: "#4c4980" }}>
                {isZh ? "我的 NFT" : "My NFTs"}
              </Link>
            </>
          )}
          <button onClick={() => setLang(isZh ? "en" : "zh")}
            className="py-2 text-sm text-left" style={{ color: "#4c4980" }}>
            {isZh ? "Switch to English" : "切换为中文"}
          </button>
          {isConnected ? (
            <button onClick={() => { disconnectWallet(); setMenuOpen(false); }}
              className="flex items-center gap-2 text-sm py-2"
              style={{ color: "#ff6b6b" }}>
              <LogOut size={15} />{isZh ? "断开钱包" : "Disconnect"}
            </button>
          ) : (
            <button onClick={() => { handleConnect(); setMenuOpen(false); }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff" }}>
              <Wallet size={15} />{isZh ? "连接钱包" : "Connect Wallet"}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
