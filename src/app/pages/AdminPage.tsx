import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts, getContracts, ADDRESSES } from "../../lib/contracts";
import { ethers } from "ethers";
import {
  ShieldCheck, Clock, CheckCircle, XCircle, RefreshCw,
  ExternalLink, ArrowLeft, Home, Search, Coins, Send, Plus, Trash2
} from "lucide-react";
import { Navbar } from "../components/Navbar";

const OWNER_ADDRESS   = "0x99d23e329CBF9989581De6b6D15A7d2C3DD342df";
const ADMIN_ADDRESSES = [
  "0xA80deB694775DD09e5141b2097A879c7419309c0",
  "0xc3AE0Fd5d1Be2A5d19bb683E43fFa0D3991a074d",
];

function isAdminWallet(addr: string | null) {
  if (!addr) return false;
  const low = addr.toLowerCase();
  return low === OWNER_ADDRESS.toLowerCase() || ADMIN_ADDRESSES.some(a => a.toLowerCase() === low);
}

interface ShelterInfo { address: string; name: string; location: string; wallet: string; status: number; }
interface ShareRow    { addr: string; share: string; }

export function AdminPage() {
  const { walletAddress, isConnected, connectWallet, signer, lang } = useApp();
  const navigate = useNavigate();
  const isZh    = lang === "zh";
  const isOwner = walletAddress?.toLowerCase() === OWNER_ADDRESS.toLowerCase();
  const isAdmin = isAdminWallet(walletAddress);

  const [shelters,      setShelters]      = useState<ShelterInfo[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState<string | null>(null);

  const [visitCatId,   setVisitCatId]   = useState("");
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitResult,  setVisitResult]  = useState<string | null>(null);
  const [visitError,   setVisitError]   = useState<string | null>(null);

  const [vaultBalance,      setVaultBalance]      = useState("0");
  const [shareRows,         setShareRows]         = useState<ShareRow[]>([{ addr: OWNER_ADDRESS, share: "10000" }]);
  const [distributeLoading, setDistributeLoading] = useState(false);
  const [setSharesLoading,  setSetSharesLoading]  = useState(false);
  const [distributeResult,  setDistributeResult]  = useState<string | null>(null);
  const [sharesResult,      setSharesResult]      = useState<string | null>(null);

  const loadShelters = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
      const c = getReadonlyContracts();
      const latest = await provider.getBlockNumber();
      // 合约今天部署，从当前区块往前 100000 块（约 2 天）开始扫，避免从区块 0 扫全链
      const SCAN_WINDOW = 100000;
      const fromBlock = Math.max(0, latest - SCAN_WINDOW);
      const events: ethers.Log[] = [];
      for (let from = fromBlock; from <= latest; from += 2000) {
        const chunk = await provider.getLogs({
          address: ADDRESSES.catRegistry,
          // ShelterRegistered(address indexed shelter, string name, string location)
          topics: ["0xd77472e230176dcc3b63ebe73b71039773ff62dfb43d8e850824df0ddb2ae797"],
          fromBlock: from, toBlock: Math.min(from + 1999, latest),
        });
        events.push(...chunk);
      }
      const iface = new ethers.Interface([
        "event ShelterRegistered(address indexed shelter, string name, string location)",
      ]);
      const shelterList: ShelterInfo[] = await Promise.all(
        events.map(async (event) => {
          const addr = "0x" + event.topics[1].slice(26);
          let name = "", location = "";
          try { const p = iface.parseLog({ topics: [...event.topics], data: event.data }); name = p?.args[1] ?? ""; location = p?.args[2] ?? ""; } catch {}
          try {
            const info = await c.catRegistry.shelters(addr) as { name: string; location: string; wallet: string; status: number };
            return { address: addr, name: info.name || name, location: info.location || location, wallet: info.wallet || addr, status: Number(info.status) };
          } catch { return { address: addr, name, location, wallet: addr, status: 0 }; }
        })
      );
      setShelters(shelterList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(isZh ? `读取链上数据失败：${msg.slice(0, 80)}` : `Failed to load chain data: ${msg.slice(0, 80)}`);
    }
    finally { setLoading(false); }
  }, [isZh]);

  const loadVaultBalance = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
      const bal = await provider.getBalance(ADDRESSES.purrToken);
      setVaultBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch {}
  }, []);

  useEffect(() => { loadShelters(); loadVaultBalance(); }, [loadShelters, loadVaultBalance]);

  const approveShelter = async (addr: string) => {
    if (!signer) { setError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setActionLoading(addr); setError(null); setSuccess(null);
    try {
      const tx = await new ethers.Contract(ADDRESSES.catRegistry, ["function approveShelter(address) external"], signer).approveShelter(addr);
      await tx.wait();
      setSuccess(isZh ? `机构 ${addr.slice(0,8)}... 审批通过！` : `Shelter approved!`);
      await loadShelters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setError(isZh ? `审批失败：${msg.slice(0,80)}` : `Failed: ${msg.slice(0,80)}`);
    } finally { setActionLoading(null); }
  };

  const confirmVisit = async (passed: boolean) => {
    if (!signer || !isAdmin) { setVisitError(isZh ? "请先连接管理员钱包" : "Connect admin wallet"); return; }
    const cid = parseInt(visitCatId);
    if (isNaN(cid)) { setVisitError(isZh ? "请输入有效猫咪 ID" : "Enter valid Cat ID"); return; }
    setVisitLoading(true); setVisitError(null); setVisitResult(null);
    try {
      const tx = await new ethers.Contract(ADDRESSES.adoptionVault, ["function confirmVisit(uint256,bool) external"], signer).confirmVisit(cid, passed);
      await tx.wait();
      setVisitResult(passed
        ? (isZh ? `✅ 回访通过！猫咪 #${cid} 已领养，保证金已退还，Genesis NFT 已 mint` : `✅ Passed! Cat #${cid} adopted, deposit returned, Genesis NFT minted`)
        : (isZh ? `❌ 回访未通过，保证金已转给机构` : `❌ Failed, deposit sent to shelter`));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) {
        if (msg.includes("not in deposit paid")) setVisitError(isZh ? "该猫咪尚未缴纳保证金" : "Deposit not paid yet");
        else if (msg.includes("lock period not elapsed")) setVisitError(isZh ? "锁定期未满一年" : "Lock period not elapsed");
        else setVisitError(msg.slice(0, 100));
      }
    } finally { setVisitLoading(false); }
  };

  const handleSetShares = async () => {
    if (!signer || !isAdmin) { setSharesResult(isZh ? "请先连接管理员钱包" : "Connect admin wallet"); return; }
    const recipients = shareRows.map(r => r.addr.trim()).filter(Boolean);
    const shares     = shareRows.map(r => parseInt(r.share) || 0);
    const total      = shares.reduce((a, b) => a + b, 0);
    if (total !== 10000) { setSharesResult(isZh ? `❌ 比例总和必须为 10000（当前：${total}）` : `❌ Must sum to 10000 (current: ${total})`); return; }
    setSetSharesLoading(true); setSharesResult(null);
    try {
      const tx = await new ethers.Contract(ADDRESSES.purrToken, ["function setShares(address[],uint256[]) external"], signer).setShares(recipients, shares);
      await tx.wait();
      setSharesResult(isZh ? "✅ 分账比例已更新" : "✅ Shares updated");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setSharesResult(isZh ? `❌ 失败：${msg.slice(0,80)}` : `❌ Failed: ${msg.slice(0,80)}`);
    } finally { setSetSharesLoading(false); }
  };

  const handleDistribute = async () => {
    if (!signer || !isAdmin) { setDistributeResult(isZh ? "请先连接管理员钱包" : "Connect admin wallet"); return; }
    setDistributeLoading(true); setDistributeResult(null);
    try {
      const tx = await new ethers.Contract(ADDRESSES.purrToken, ["function distribute() external"], signer).distribute();
      await tx.wait();
      setDistributeResult(isZh ? "✅ 分账执行成功！" : "✅ Distribution completed!");
      loadVaultBalance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) {
        if (msg.includes("balance below minimum")) setDistributeResult(isZh ? "❌ 合约余额不足最低门槛" : "❌ Balance below minimum");
        else if (msg.includes("no recipients")) setDistributeResult(isZh ? "❌ 请先设置分账比例" : "❌ Set shares first");
        else setDistributeResult(isZh ? `❌ 失败：${msg.slice(0,80)}` : `❌ Failed: ${msg.slice(0,80)}`);
      }
    } finally { setDistributeLoading(false); }
  };

  const statusStyle = (s: number) => {
    if (s === 0) return { text: isZh?"待审批":"Pending",  color:"#d97706", bg:"rgba(217,119,6,0.1)",  border:"rgba(217,119,6,0.3)" };
    if (s === 1) return { text: isZh?"已审批":"Approved", color:"#16a34a", bg:"rgba(22,163,74,0.1)",  border:"rgba(22,163,74,0.3)" };
    return             { text: isZh?"已拒绝":"Rejected", color:"#dc2626", bg:"rgba(220,38,38,0.1)",  border:"rgba(220,38,38,0.3)" };
  };

  const updateRow  = (i: number, k: keyof ShareRow, v: string) => setShareRows(rows => rows.map((r, idx) => idx===i ? {...r,[k]:v} : r));
  const addRow     = () => setShareRows(r => [...r, { addr:"", share:"" }]);
  const removeRow  = (i: number) => setShareRows(r => r.filter((_,idx) => idx !== i));
  const totalShare = shareRows.reduce((s, r) => s + (parseInt(r.share)||0), 0);
  const pending    = shelters.filter(s => s.status === 0);
  const approved   = shelters.filter(s => s.status === 1);

  return (
    <div className="min-h-screen pt-20" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

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
              <p className="text-xs" style={{ color: "#b45309" }}>PurrChain · Admin</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { loadShelters(); loadVaultBalance(); }} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.15)", color:"#c2410c", cursor:"pointer" }}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {isZh ? "刷新" : "Refresh"}
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.1)", color:"#b45309", cursor:"pointer" }}>
              <ArrowLeft size={14} />{isZh ? "返回" : "Back"}
            </button>
          </div>
        </div>

        {/* 钱包状态 */}
        {!isConnected ? (
          <div className="p-6 rounded-2xl text-center mb-6"
            style={{ background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.12)" }}>
            <div className="text-4xl mb-3">🔐</div>
            <p className="mb-4 font-medium" style={{ color:"#92400e" }}>
              {isZh ? "请连接管理员钱包以执行操作" : "Connect admin wallet to proceed"}
            </p>
            <button onClick={connectWallet} className="px-6 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background:"linear-gradient(135deg, #F97316, #fbbf24)", cursor:"pointer" }}>
              {isZh ? "连接钱包" : "Connect Wallet"}
            </button>
          </div>
        ) : !isAdmin ? (
          <div className="p-5 rounded-2xl mb-6"
            style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.18)" }}>
            <p className="text-sm font-medium" style={{ color:"#dc2626" }}>
              ⚠️ {isZh ? "当前钱包非管理员，只能查看，无法执行写操作" : "Not an admin wallet — view only"}
            </p>
            <p className="text-xs mt-1 font-mono" style={{ color:"#b45309" }}>{walletAddress}</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl mb-6 flex items-center gap-3"
            style={{ background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.18)" }}>
            <CheckCircle size={16} color="#16a34a" />
            <div>
              <p className="text-sm font-medium" style={{ color:"#16a34a" }}>
                {isOwner ? (isZh?"✅ Owner 身份验证通过":"✅ Owner verified") : (isZh?"✅ 管理员身份验证通过":"✅ Admin verified")}
              </p>
              <p className="text-xs font-mono mt-0.5" style={{ color:"#b45309" }}>{walletAddress}</p>
            </div>
          </div>
        )}

        {error   && <div className="p-4 rounded-xl mb-4 flex items-center gap-2" style={{ background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)" }}><XCircle size={16} color="#dc2626" /><p className="text-sm" style={{ color:"#dc2626" }}>{error}</p></div>}
        {success && <div className="p-4 rounded-xl mb-4 flex items-center gap-2" style={{ background:"rgba(22,163,74,0.08)", border:"1px solid rgba(22,163,74,0.2)" }}><CheckCircle size={16} color="#16a34a" /><p className="text-sm" style={{ color:"#16a34a" }}>{success}</p></div>}

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label:isZh?"待审批":"Pending",  count:pending.length,  color:"#d97706" },
            { label:isZh?"已审批":"Approved", count:approved.length, color:"#16a34a" },
            { label:isZh?"总机构":"Total",    count:shelters.length, color:"#F97316" },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-2xl text-center"
              style={{ background:"#fff9f5", border:"1px solid rgba(249,115,22,0.1)" }}>
              <div className="text-3xl font-black mb-1" style={{ color:item.color, fontFamily:"'Space Grotesk', sans-serif" }}>{item.count}</div>
              <div className="text-xs font-medium" style={{ color:"#b45309" }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* 待审批 */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} color="#d97706" />
              <h2 className="text-lg font-bold" style={{ color:"#92400e" }}>{isZh?"待审批机构":"Pending Shelters"}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(217,119,6,0.12)", color:"#d97706", border:"1px solid rgba(217,119,6,0.25)" }}>{pending.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {pending.map(s => <ShelterCard key={s.address} shelter={s} statusStyle={statusStyle} isAdmin={isAdmin} actionLoading={actionLoading} onApprove={approveShelter} isZh={isZh} />)}
            </div>
          </div>
        )}

        {/* 已审批 */}
        {approved.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} color="#16a34a" />
              <h2 className="text-lg font-bold" style={{ color:"#92400e" }}>{isZh?"已审批机构":"Approved Shelters"}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(22,163,74,0.12)", color:"#16a34a", border:"1px solid rgba(22,163,74,0.25)" }}>{approved.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {approved.map(s => <ShelterCard key={s.address} shelter={s} statusStyle={statusStyle} isAdmin={isAdmin} actionLoading={actionLoading} onApprove={approveShelter} isZh={isZh} />)}
            </div>
          </div>
        )}

        {!loading && shelters.length === 0 && <div className="p-12 rounded-2xl text-center mb-8" style={{ background:"rgba(249,115,22,0.03)", border:"1px dashed rgba(249,115,22,0.15)" }}><div className="text-4xl mb-3">🏠</div><p style={{ color:"#b45309" }}>{isZh?"暂无机构注册记录":"No shelters yet"}</p></div>}
        {loading && <div className="p-12 text-center mb-8"><div className="text-4xl mb-3 animate-spin inline-block">⚙️</div><p style={{ color:"#b45309" }}>{isZh?"读取链上数据中...":"Loading..."}</p></div>}

        {/* 回访确认 */}
        <div className="mb-8 p-6 rounded-2xl" style={{ background:"#fff9f5", border:"1px solid rgba(249,115,22,0.12)" }}>
          <div className="flex items-center gap-2 mb-3"><Home size={16} color="#F97316" /><h2 className="text-lg font-bold" style={{ color:"#92400e" }}>{isZh?"回访确认":"Home Visit Confirmation"}</h2></div>
          <p className="text-xs mb-4" style={{ color:"#b45309" }}>{isZh?"用户缴纳保证金满 1 年后可执行。通过 → 退还保证金 + mint Genesis NFT；不通过 → 保证金转给机构。":"After 1-year deposit lock. Pass → refund + Genesis NFT. Fail → deposit to shelter."}</p>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"#F97316" }} />
            <input value={visitCatId} onChange={e => { setVisitCatId(e.target.value); setVisitError(null); setVisitResult(null); }}
              placeholder={isZh?"输入猫咪 ID（如：0）":"Enter Cat ID (e.g. 0)"} type="number" min="0"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm"
              style={{ background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.18)", color:"#92400e" }} />
          </div>
          {visitError  && <p className="text-xs text-red-500 mb-3">{visitError}</p>}
          {visitResult && <p className="text-xs font-semibold mb-3" style={{ color:"#16a34a" }}>{visitResult}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => confirmVisit(true)} disabled={visitLoading||!isAdmin||!visitCatId}
              className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
              style={{ background:(!isAdmin||!visitCatId)?"rgba(22,163,74,0.3)":"linear-gradient(135deg,#16a34a,#15803d)", cursor:(!isAdmin||!visitCatId||visitLoading)?"not-allowed":"pointer", opacity:visitLoading?0.7:1 }}>
              {visitLoading?<span className="animate-spin">⚙️</span>:<CheckCircle size={15} />}{isZh?"回访通过":"Visit Passed"}
            </button>
            <button onClick={() => confirmVisit(false)} disabled={visitLoading||!isAdmin||!visitCatId}
              className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
              style={{ background:(!isAdmin||!visitCatId)?"rgba(239,68,68,0.3)":"linear-gradient(135deg,#dc2626,#b91c1c)", cursor:(!isAdmin||!visitCatId||visitLoading)?"not-allowed":"pointer", opacity:visitLoading?0.7:1 }}>
              {visitLoading?<span className="animate-spin">⚙️</span>:<XCircle size={15} />}{isZh?"回访未通过":"Visit Failed"}
            </button>
          </div>
        </div>

        {/* 分账管理 */}
        <div className="p-6 rounded-2xl" style={{ background:"#fff9f5", border:"1px solid rgba(249,115,22,0.12)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Coins size={16} color="#F97316" /><h2 className="text-lg font-bold" style={{ color:"#92400e" }}>{isZh?"AVAX 收益分账":"AVAX Revenue Distribution"}</h2></div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)" }}>
              <span className="text-xs" style={{ color:"#b45309" }}>{isZh?"合约余额：":"Vault: "}</span>
              <span className="text-sm font-black" style={{ color:"#F97316" }}>{vaultBalance} AVAX</span>
            </div>
          </div>
          <p className="text-xs mb-5" style={{ color:"#b45309" }}>{isZh?"设置收款方和比例（万分比，总和必须等于 10000）。比例保存后，点击「触发分账」将合约 AVAX 分配给各收款方。":"Set recipients and shares (basis points, must sum to 10000). After saving, click Distribute to send AVAX."}</p>

          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-12 gap-2 px-1">
              <p className="col-span-8 text-xs font-semibold" style={{ color:"#b45309" }}>{isZh?"收款方地址":"Recipient Address"}</p>
              <p className="col-span-3 text-xs font-semibold" style={{ color:"#b45309" }}>{isZh?"比例（万分）":"Share (bps)"}</p>
            </div>
            {shareRows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={row.addr} onChange={e => updateRow(i,"addr",e.target.value)} placeholder="0x..."
                  className="col-span-8 px-3 py-2 rounded-xl outline-none text-xs font-mono"
                  style={{ background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.18)", color:"#92400e" }} />
                <input value={row.share} onChange={e => updateRow(i,"share",e.target.value)} type="number" min="0" max="10000" placeholder="5000"
                  className="col-span-3 px-3 py-2 rounded-xl outline-none text-xs text-center"
                  style={{ background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.18)", color:"#F97316" }} />
                <button onClick={() => removeRow(i)} disabled={shareRows.length <= 1}
                  className="col-span-1 flex items-center justify-center p-2 rounded-xl"
                  style={{ background:"rgba(220,38,38,0.07)", color:shareRows.length<=1?"#ddd":"#dc2626", cursor:shareRows.length<=1?"default":"pointer" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.18)", color:"#c2410c", cursor:"pointer" }}>
              <Plus size={12} />{isZh?"添加收款方":"Add Recipient"}
            </button>
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background:totalShare===10000?"rgba(22,163,74,0.1)":"rgba(220,38,38,0.08)", color:totalShare===10000?"#16a34a":"#dc2626", border:`1px solid ${totalShare===10000?"rgba(22,163,74,0.25)":"rgba(220,38,38,0.2)"}` }}>
              {isZh?`总计：${totalShare} / 10000`:`Total: ${totalShare} / 10000`}
            </span>
          </div>

          {sharesResult     && <p className="text-xs mb-3 font-semibold" style={{ color:sharesResult.startsWith("✅")?"#16a34a":"#dc2626" }}>{sharesResult}</p>}
          {distributeResult && <p className="text-xs mb-3 font-semibold" style={{ color:distributeResult.startsWith("✅")?"#16a34a":"#dc2626" }}>{distributeResult}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleSetShares} disabled={setSharesLoading||!isAdmin||totalShare!==10000}
              className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
              style={{ background:(!isAdmin||totalShare!==10000)?"rgba(249,115,22,0.3)":"linear-gradient(135deg,#F97316,#ea580c)", cursor:(!isAdmin||totalShare!==10000||setSharesLoading)?"not-allowed":"pointer", opacity:setSharesLoading?0.7:1 }}>
              {setSharesLoading?<span className="animate-spin">⚙️</span>:<CheckCircle size={15} />}{isZh?"保存分账比例":"Save Shares"}
            </button>
            <button onClick={handleDistribute} disabled={distributeLoading||!isAdmin}
              className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
              style={{ background:!isAdmin?"rgba(168,85,247,0.3)":"linear-gradient(135deg,#a855f7,#9333ea)", cursor:(!isAdmin||distributeLoading)?"not-allowed":"pointer", opacity:distributeLoading?0.7:1 }}>
              {distributeLoading?<span className="animate-spin">⚙️</span>:<Send size={15} />}{isZh?"触发分账":"Distribute"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function ShelterCard({ shelter, statusStyle, isAdmin, actionLoading, onApprove, isZh }: {
  shelter: ShelterInfo;
  statusStyle: (s: number) => { text: string; color: string; bg: string; border: string };
  isAdmin: boolean; actionLoading: string | null; onApprove: (a: string) => void; isZh: boolean;
}) {
  const sl = statusStyle(shelter.status);
  const isLoading = actionLoading === shelter.address;
  return (
    <div className="p-5 rounded-2xl flex items-center justify-between gap-4"
      style={{ background:"#fff9f5", border:"1px solid rgba(249,115,22,0.1)" }}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.2)" }}>🏠</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold" style={{ color:"#92400e", fontFamily:"'Space Grotesk', sans-serif" }}>{shelter.name}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:sl.bg, color:sl.color, border:`1px solid ${sl.border}` }}>{sl.text}</span>
          </div>
          <div className="text-xs mb-1" style={{ color:"#b45309" }}>📍 {shelter.location}</div>
          <div className="text-xs font-mono truncate" style={{ color:"#d97706" }}>{shelter.address}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a href={`https://testnet.snowtrace.io/address/${shelter.address}`} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-lg" style={{ background:"rgba(249,115,22,0.08)", color:"#b45309" }}><ExternalLink size={14} /></a>
        {isAdmin && shelter.status === 0 && (
          <button onClick={() => onApprove(shelter.address)} disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background:isLoading?"rgba(22,163,74,0.3)":"linear-gradient(135deg,#16a34a,#15803d)", cursor:isLoading?"not-allowed":"pointer", opacity:isLoading?0.7:1 }}>
            {isLoading?(isZh?"确认中...":"Confirming..."):(isZh?"✓ 审批通过":"✓ Approve")}
          </button>
        )}
      </div>
    </div>
  );
}
