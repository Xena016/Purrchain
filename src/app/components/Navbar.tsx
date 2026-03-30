import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Wallet, LogOut, Menu, X, Coins } from "lucide-react";
import { useApp } from "../context/AppContext";

export function Navbar() {
  const { walletAddress, isConnected, purrBalance, connectWallet, disconnectWallet } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleConnect = () => {
    connectWallet();
    navigate("/dashboard");
  };

  const navLinks = isConnected
    ? [
        { label: "猫咪档案", path: "/dashboard" },
        { label: "机构注册", path: "/institution/register" },
      ]
    : [{ label: "机构注册", path: "/institution/register" }];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: "rgba(5, 5, 20, 0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(124, 58, 237, 0.2)",
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <span className="text-2xl">🐾</span>
        <span
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }}
          className="hidden sm:block"
        >
          <span style={{ color: "#A78BFA" }}>Purr</span>
          <span style={{ color: "#06B6D4" }}>Chain</span>
        </span>
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            style={{
              fontFamily: "'Nunito', sans-serif",
              color: location.pathname === link.path ? "#A78BFA" : "rgba(255,255,255,0.7)",
              transition: "color 0.2s",
            }}
            className="hover:text-white text-sm"
          >
            {link.label}
          </Link>
        ))}

        {isConnected && (
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
            style={{ background: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <Coins size={14} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{purrBalance} PURR</span>
          </div>
        )}

        {isConnected ? (
          <div className="flex items-center gap-3">
            <div
              className="px-3 py-1 rounded-full text-xs"
              style={{ background: "rgba(124,58,237,0.2)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {walletAddress}
            </div>
            <button
              onClick={disconnectWallet}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}
              title="断开钱包"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
              color: "#fff",
              fontFamily: "'Nunito', sans-serif",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            <Wallet size={15} />
            连接钱包
          </button>
        )}
      </div>

      {/* Mobile menu toggle */}
      <button
        className="md:hidden text-white"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="absolute top-full left-0 right-0 p-4 flex flex-col gap-3 md:hidden"
          style={{ background: "rgba(10,10,30,0.97)", borderBottom: "1px solid rgba(124,58,237,0.2)" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              style={{ fontFamily: "'Nunito', sans-serif", color: "rgba(255,255,255,0.8)" }}
              className="py-2 text-sm"
            >
              {link.label}
            </Link>
          ))}
          {isConnected ? (
            <button
              onClick={() => { disconnectWallet(); setMenuOpen(false); }}
              className="flex items-center gap-2 text-sm py-2"
              style={{ color: "#A78BFA" }}
            >
              <LogOut size={15} /> 断开钱包
            </button>
          ) : (
            <button
              onClick={() => { handleConnect(); setMenuOpen(false); }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff" }}
            >
              <Wallet size={15} />
              连接钱包
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
