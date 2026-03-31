import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts, getContracts, ADDRESSES } from "../../lib/contracts";
import { ethers } from "ethers";
import { ShieldCheck, Clock, CheckCircle, XCircle, RefreshCw, ExternalLink, Lock, ArrowLeft, Home, Search } from "lucide-react";

const OWNER_ADDRESS = "0xA80deB694775DD09e5141b2097A879c7419309c0";
const ADMIN_PASSWORD = "purrchain2024";

interface ShelterInfo {
  address: string;
  name: string;
  location: string;
  wallet: string;
  status: number;
}

export function AdminPage() {
  const { walletAddress, isConnected, connectWallet, signer, lang } = useApp();
  const navigate = useNavigate();
  const isZh = lang === "zh";

  // 密码门控
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState(false);

  const [shelters, setShelters] = useState<ShelterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = walletAddress?.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  const loadShelters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
      const c = getReadonlyContracts();

      const catRegistryContract = new ethers.Contract(
        ADDRESSES.catRegistry,
        [
          "event ShelterRegistered(address indexed shelter, string name, string location)",
          "function shelters(address) view returns (string name, string location, address wallet, uint8 status)",
        ],
        provider
      );

      const latest = await provider.getBlockNumber();
      const DEPLOY_BLOCK = 53429539;
      const events: ethers.Log[] = [];
      for (let from = DEPLOY_BLOCK; from <= latest; from += 2000) {
        const to = Math.min(from + 1999, latest);
        const chunk = await provider.getLogs({
          address: ADDRESSES.catRegistry,
          topics: ["0xd77472e230176dcc3b63ebe73b71039773ff62dfb43d8e850824df0ddb2ae797"],
          fromBlock: from,
          toBlock: to,
        });
        events.push(...chunk);
      }

      const iface = catRegistryContract.interface;
      const shelterList: ShelterInfo[] = await Promise.all(
        events.map(async (event) => {
          const addr = "0x" + event.topics[1].slice(26);
          let name = "", location = "";
          try {
            const parsed = iface.parseLog(event);
            name = parsed?.args[1] ?? "";
            location = parsed?.args[2] ?? "";
          } catch {}
          try {
            const info = await c.catRegistry.shelters(addr) as { name: string; location: string; wallet: string; status: number };
            return {
              address: addr,
              name: info.name || name,
              location: info.location || location,
              wallet: info.wallet || addr,
              status: Number(info.status),
            };
          } catch {
            return { address: addr, name, location, wallet: addr, status: 0 };
          }
        })
      );
      setShelters(shelterList);
    } catch {
      setError(isZh ? "读取机构数据失败，请检查网络连接" : "Failed to load shelter data");
    } finally {
      setLoading(false);
    }
  }, [isZh]);

  useEffect(() => {
    if (unlocked) loadShelters();
  }, [unlocked, loadShelters]);

  const approveShelter = async (shelterAddress: string) => {
    if (!signer) { setError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setActionLoading(shelterAddress);
    setError(null); setSuccess(null);
    try {
      const contract = new ethers.Contract(
        ADDRESSES.catRegistry,
        ["function approveShelter(address _shelter) external"],
        signer
      );
      const tx = await contract.approveShelter(shelterAddress);
      await tx.wait();
      setSuccess(isZh ? `机构 ${shelterAddress.slice(0, 8)}... 审批通过！` : `Shelter ${shelterAddress.slice(0, 8)}... approved!`);
      await loadShelters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setError(isZh ? `审批失败：${msg.slice(0, 80)}` : `Failed: ${msg.slice(0, 80)}`);
    } finally { setActionLoading(null); }
  };

  const statusStyle = (status: number) => {
    switch (status) {
      case 0: return { text: isZh ? "待审批" : "Pending",  color: "#d97706", bg: "rgba(217,119,6,0.1)",  border: "rgba(217,119,6,0.3)" };
      case 1: return { text: isZh ? "已审批" : "Approved", color: "#16a34a", bg: "rgba(22,163,74,0.1)",  border: "rgba(22,163,74,0.3)" };
      case 2: return { text: isZh ? "已拒绝" : "Rejected", color: "#dc2626", bg: "rgba(220,38,38,0.1)",  border: "rgba(220,38,38,0.3)" };
      default: return { text: "—", color: "#888", bg: "rgba(136,136,136,0.1)", border: "rgba(136,136,136,0.3)" };
    }
  };


  // ── 回访确认状态 ──────────────────────────────────────────
  const [visitCatId, setVisitCatId]       = useState("");
  const [visitLoading, setVisitLoading]   = useState(false);
  const [visitResult, setVisitResult]     = useState<string | null>(null);
  const [visitError,  setVisitError]      = useState<string | null>(null);

  // ── 密码解锁页 ──────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#fffbf5" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", boxShadow: "0 8px 24px rgba(249,115,22,0.3)" }}>
              <Lock size={28} color="#fff" />
            </div>
            <h1 className="text-2xl font-black mb-1" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>
              {isZh ? "管理员入口" : "Admin Access"}
            </h1>
            <p className="text-sm" style={{ color: "#b45309" }}>PurrChain · CatRegistry</p>
          </div>
          <div className="p-6 rounded-3xl" style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.15)", boxShadow: "0 8px 32px rgba(249,115,22,0.08)" }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#92400e" }}>
              {isZh ? "管理员密码" : "Admin Password"}
            </label>
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setPwdErr(false); }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (pwd === ADMIN_PASSWORD) setUnlocked(true);
                  else setPwdErr(true);
                }
              }}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl outline-none mb-3 text-sm"
              style={{
                background: "rgba(249,115,22,0.05)",
                border: pwdErr ? "1px solid #dc2626" : "1px solid rgba(249,115,22,0.2)",
                color: "#92400e",
              }}
              autoFocus
            />
            {pwdErr && <p className="text-xs text-red-500 mb-3">{isZh ? "密码错误" : "Incorrect password"}</p>}
            <button
              onClick={() => { if (pwd === ADMIN_PASSWORD) setUnlocked(true); else setPwdErr(true); }}
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer" }}>
              {isZh ? "进入管理面板" : "Enter Admin Panel"}
            </button>
          </div>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 mx-auto mt-4 text-sm"
            style={{ color: "#b45309", cursor: "pointer" }}>
            <ArrowLeft size={14} />{isZh ? "返回首页" : "Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  const pending = shelters.filter(s => s.status === 0);
  const approved = shelters.filter(s => s.status === 1);


  const confirmVisit = async (passed: boolean) => {
    if (!signer || !isOwner) { setVisitError(isZh ? "请先连接 Owner 钱包" : "Connect Owner wallet first"); return; }
    const cid = parseInt(visitCatId);
    if (isNaN(cid)) { setVisitError(isZh ? "请输入有效的猫咪 ID" : "Enter a valid Cat ID"); return; }
    setVisitLoading(true); setVisitError(null); setVisitResult(null);
    try {
      const contract = new ethers.Contract(
        ADDRESSES.adoptionVault,
        ["function confirmVisit(uint256 _catId, bool _passed) external"],
        signer
      );
      const tx = await contract.confirmVisit(cid, passed);
      await tx.wait();
      setVisitResult(passed
        ? (isZh ? `✅ 回访通过！猫咪 #${cid} 已领养，保证金已退还，Genesis NFT 已 mint` : `✅ Visit passed! Cat #${cid} adopted, deposit returned, Genesis NFT minted`)
        : (isZh ? `❌ 回访未通过，保证金已转给机构` : `❌ Visit failed, deposit sent to shelter`));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) {
        if (msg.includes("not in deposit paid")) setVisitError(isZh ? "该猫咪尚未缴纳保证金，无法回访" : "Deposit not paid yet");
        else if (msg.includes("lock period not elapsed")) setVisitError(isZh ? "锁定期未到，暂时无法回访" : "Lock period not elapsed");
        else setVisitError(msg.slice(0, 100));
      }
    } finally { setVisitLoading(false); }
  };

  return (
    <div className="min-h-screen px-4 py-16" style={{ background: "#fffbf5" }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)" }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>
                {isZh ? "管理面板" : "Admin Panel"}
              </h1>
              <p className="text-xs" style={{ color: "#b45309" }}>CatRegistry · {isZh ? "机构审批" : "Shelter Approval"}</p>
            </div>
          </div>
          <button onClick={loadShelters} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)", color: "#c2410c", cursor: "pointer" }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isZh ? "刷新" : "Refresh"}
          </button>
        </div>

        {/* Wallet status */}
        {!isConnected ? (
          <div className="p-6 rounded-2xl text-center mb-6"
            style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.12)" }}>
            <div className="text-4xl mb-3">🔐</div>
            <p className="mb-4 font-medium" style={{ color: "#92400e" }}>
              {isZh ? "请连接 Owner 钱包以执行审批" : "Connect Owner wallet to approve"}
            </p>
            <button onClick={connectWallet}
              className="px-6 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer" }}>
              {isZh ? "连接钱包" : "Connect Wallet"}
            </button>
          </div>
        ) : !isOwner ? (
          <div className="p-5 rounded-2xl mb-6"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)" }}>
            <p className="text-sm font-medium" style={{ color: "#dc2626" }}>
              ⚠️ {isZh ? "当前钱包非合约 Owner，只能查看，无法审批" : "Not Owner wallet — view only"}
            </p>
            <p className="text-xs mt-1 font-mono" style={{ color: "#b45309" }}>{walletAddress}</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl mb-6 flex items-center gap-3"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.18)" }}>
            <CheckCircle size={16} color="#16a34a" />
            <p className="text-sm font-medium" style={{ color: "#16a34a" }}>
              {isZh ? "Owner 身份验证通过，可执行审批操作" : "Owner verified — can approve shelters"}
            </p>
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <div className="p-4 rounded-xl mb-4 flex items-center gap-2"
            style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <XCircle size={16} color="#dc2626" />
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl mb-4 flex items-center gap-2"
            style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }}>
            <CheckCircle size={16} color="#16a34a" />
            <p className="text-sm" style={{ color: "#16a34a" }}>{success}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: isZh ? "待审批" : "Pending",  count: pending.length,  color: "#d97706" },
            { label: isZh ? "已审批" : "Approved", count: approved.length, color: "#16a34a" },
            { label: isZh ? "总计" : "Total",      count: shelters.length, color: "#F97316" },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-2xl text-center"
              style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.1)" }}>
              <div className="text-3xl font-black mb-1" style={{ color: item.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {item.count}
              </div>
              <div className="text-xs font-medium" style={{ color: "#b45309" }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Pending list */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} color="#d97706" />
              <h2 className="text-lg font-bold" style={{ color: "#92400e" }}>{isZh ? "待审批机构" : "Pending Shelters"}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(217,119,6,0.12)", color: "#d97706", border: "1px solid rgba(217,119,6,0.25)" }}>
                {pending.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {pending.map(s => <ShelterCard key={s.address} shelter={s} statusStyle={statusStyle} isOwner={isOwner} actionLoading={actionLoading} onApprove={approveShelter} isZh={isZh} />)}
            </div>
          </div>
        )}

        {/* Approved list */}
        {approved.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} color="#16a34a" />
              <h2 className="text-lg font-bold" style={{ color: "#92400e" }}>{isZh ? "已审批机构" : "Approved Shelters"}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(22,163,74,0.12)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.25)" }}>
                {approved.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {approved.map(s => <ShelterCard key={s.address} shelter={s} statusStyle={statusStyle} isOwner={isOwner} actionLoading={actionLoading} onApprove={approveShelter} isZh={isZh} />)}
            </div>
          </div>
        )}

        {!loading && shelters.length === 0 && (
          <div className="p-12 rounded-2xl text-center"
            style={{ background: "rgba(249,115,22,0.03)", border: "1px dashed rgba(249,115,22,0.15)" }}>
            <div className="text-4xl mb-3">🏠</div>
            <p style={{ color: "#b45309" }}>{isZh ? "暂无机构注册记录" : "No shelter registrations yet"}</p>
          </div>
        )}

        {loading && (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3 animate-spin inline-block">⚙️</div>
            <p style={{ color: "#b45309" }}>{isZh ? "读取链上数据中..." : "Loading chain data..."}</p>
          </div>
        )}

        {/* ── Owner 回访确认 ─────────────────────────────── */}
        <div className="mt-10 pt-8" style={{ borderTop: "1px solid rgba(249,115,22,0.15)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Home size={16} color="#F97316" />
            <h2 className="text-lg font-bold" style={{ color: "#92400e" }}>
              {isZh ? "回访确认（Owner 专用）" : "Home Visit Confirmation (Owner Only)"}
            </h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#b45309" }}>
            {isZh
              ? "用户缴纳保证金满 1 年后可执行回访确认。通过 → 退还保证金 + mint Genesis NFT；不通过 → 保证金转给机构。"
              : "After 1 year deposit lock, confirm home visit. Pass → refund + Genesis NFT. Fail → deposit to shelter."}
          </p>
          <div className="p-5 rounded-2xl" style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.12)" }}>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#F97316" }} />
                <input
                  value={visitCatId}
                  onChange={e => { setVisitCatId(e.target.value); setVisitError(null); setVisitResult(null); }}
                  placeholder={isZh ? "输入猫咪 ID（如：0）" : "Enter Cat ID (e.g. 0)"}
                  type="number" min="0"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.18)", color: "#92400e" }}
                />
              </div>
            </div>
            {visitError  && <p className="text-xs text-red-500 mb-3">{visitError}</p>}
            {visitResult && <p className="text-xs font-semibold mb-3" style={{ color: "#16a34a" }}>{visitResult}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => confirmVisit(true)}
                disabled={visitLoading || !isOwner || !visitCatId}
                className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: (!isOwner || !visitCatId) ? "rgba(22,163,74,0.3)" : "linear-gradient(135deg, #16a34a, #15803d)",
                  cursor: (!isOwner || !visitCatId || visitLoading) ? "not-allowed" : "pointer",
                  opacity: visitLoading ? 0.7 : 1,
                }}>
                {visitLoading ? <span className="animate-spin">⚙️</span> : <CheckCircle size={15} />}
                {isZh ? "回访通过" : "Visit Passed"}
              </button>
              <button
                onClick={() => confirmVisit(false)}
                disabled={visitLoading || !isOwner || !visitCatId}
                className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: (!isOwner || !visitCatId) ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #dc2626, #b91c1c)",
                  cursor: (!isOwner || !visitCatId || visitLoading) ? "not-allowed" : "pointer",
                  opacity: visitLoading ? 0.7 : 1,
                }}>
                {visitLoading ? <span className="animate-spin">⚙️</span> : <XCircle size={15} />}
                {isZh ? "回访未通过" : "Visit Failed"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShelterCard({ shelter, statusStyle, isOwner, actionLoading, onApprove, isZh }: {
  shelter: ShelterInfo;
  statusStyle: (s: number) => { text: string; color: string; bg: string; border: string };
  isOwner: boolean;
  actionLoading: string | null;
  onApprove: (addr: string) => void;
  isZh: boolean;
}) {
  const sl = statusStyle(shelter.status);
  const isLoading = actionLoading === shelter.address;

  return (
    <div className="p-5 rounded-2xl flex items-center justify-between gap-4"
      style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.1)" }}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
          🏠
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>{shelter.name}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: sl.bg, color: sl.color, border: `1px solid ${sl.border}` }}>
              {sl.text}
            </span>
          </div>
          <div className="text-xs mb-1" style={{ color: "#b45309" }}>📍 {shelter.location}</div>
          <div className="text-xs font-mono truncate" style={{ color: "#d97706" }}>{shelter.address}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a href={`https://testnet.snowtrace.io/address/${shelter.address}`} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-lg" style={{ background: "rgba(249,115,22,0.08)", color: "#b45309" }}>
          <ExternalLink size={14} />
        </a>
        {isOwner && shelter.status === 0 && (
          <button
            onClick={() => onApprove(shelter.address)}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: isLoading ? "rgba(249,115,22,0.3)" : "linear-gradient(135deg, #16a34a, #15803d)",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}>
            {isLoading ? (isZh ? "确认中..." : "Confirming...") : (isZh ? "✓ 审批通过" : "✓ Approve")}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  Owner 回访确认面板（追加到 AdminPage 底部区域用的独立组件）
//  在 AdminPage return 里的最后 section 处调用
// ============================================================
