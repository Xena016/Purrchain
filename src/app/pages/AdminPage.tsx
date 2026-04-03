import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts, getContracts, ADDRESSES } from "../../lib/contracts";
import { ethers } from "ethers";
import {
  ShieldCheck, Clock, CheckCircle, XCircle, RefreshCw,
  ExternalLink, ArrowLeft, Home, Search, Coins, Send, Plus, Trash2,
  Gamepad2, Layers, Sword, ToggleLeft, ToggleRight, Loader2
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

  // ── 游戏配置状态 ──
  interface SeriesInfo { id: number; name: string; uri: string; active: boolean; }
  interface EquipTemplate { slot: number; rarity: number; name: string; lore: string; rarityBonus: number; safetyBonus: number; carryBonus: number; speedBonus: number; }

  const [seriesList,        setSeriesList]        = useState<SeriesInfo[]>([]);
  const [seriesLoading,     setSeriesLoading]     = useState(false);
  const [addSeriesName,     setAddSeriesName]     = useState("");
  const [addSeriesUri,      setAddSeriesUri]      = useState("");
  const [addSeriesLoading,  setAddSeriesLoading]  = useState(false);
  const [seriesResult,      setSeriesResult]      = useState<string | null>(null);

  const [equipTemplates,        setEquipTemplates]        = useState<(EquipTemplate & { id: number })[]>([]);
  const [equipsLoading,         setEquipsLoading]         = useState(false);
  const [newTemplate,           setNewTemplate]           = useState<EquipTemplate>({ slot: 0, rarity: 0, name: "", lore: "", rarityBonus: 0, safetyBonus: 0, carryBonus: 0, speedBonus: 0 });
  const [addTemplateLoading,    setAddTemplateLoading]    = useState(false);
  const [templateResult,        setTemplateResult]        = useState<string | null>(null);

  // localStorage key for caching scanned block range
  // key 包含合约地址，合约重部署后自动失效
  const CACHE_KEY = "purrchain_shelter_addrs_" + ADDRESSES.catRegistry.slice(2, 10).toLowerCase();
  const BLOCK_KEY = "purrchain_last_block_"    + ADDRESSES.catRegistry.slice(2, 10).toLowerCase();

  const loadShelters = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const c = getReadonlyContracts();
      const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");

      // ── 读缓存的机构地址 + 上次扫到的区块 ──
      let cachedAddrs: string[] = [];
      let lastBlock = 0;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) cachedAddrs = JSON.parse(raw) as string[];
        lastBlock = parseInt(localStorage.getItem(BLOCK_KEY) ?? "0") || 0;
      } catch { /* localStorage 不可用时忽略 */ }

      const shelterAddrs = new Set<string>(cachedAddrs);
      const sig    = ethers.id("ShelterRegistered(address,string,string)");
      const latest = await provider.getBlockNumber();

      // ── 增量扫描：只扫上次之后的新区块 ──
      // 首次（lastBlock=0）从合约部署前一天开始扫；之后只扫增量
      // Fuji 出块 ~2s，86400块≈2天，足够兜底
      const scanFrom = lastBlock > 0 ? lastBlock + 1 : Math.max(0, latest - 86400);
      if (scanFrom <= latest) {
        for (let from = scanFrom; from <= latest; from += 2000) {
          try {
            const logs = await provider.getLogs({
              address: ADDRESSES.catRegistry,
              topics:  [sig],
              fromBlock: from,
              toBlock:   Math.min(from + 1999, latest),
            });
            for (const log of logs) {
              shelterAddrs.add(("0x" + log.topics[1].slice(26)).toLowerCase());
            }
          } catch { /* 某批失败跳过，不影响其他批 */ }
        }
        // 保存最新扫描进度到 localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(shelterAddrs)));
          localStorage.setItem(BLOCK_KEY, String(latest));
        } catch { /* 写入失败忽略 */ }
      }

      // ── 补充：从猫咪档案兜底收集机构地址 ──
      try {
        const total = Number(await c.catRegistry.catCount());
        const BATCH = 20;
        for (let i = 0; i < total; i += BATCH) {
          const ids  = Array.from({ length: Math.min(BATCH, total - i) }, (_, k) => i + k);
          const cats = await Promise.allSettled(ids.map(id => c.catRegistry.getCat(id)));
          for (const r of cats) {
            if (r.status === "fulfilled") {
              const cat = r.value as { shelter: string };
              if (cat.shelter && cat.shelter !== ethers.ZeroAddress)
                shelterAddrs.add(cat.shelter.toLowerCase());
            }
          }
        }
      } catch { /* 读猫咪失败不影响主流程 */ }

      // ── 批量读机构链上信息 ──
      const shelterList: ShelterInfo[] = (
        await Promise.all(
          Array.from(shelterAddrs).map(async (addr) => {
            try {
              const info = await c.catRegistry.shelters(addr) as {
                name: string; location: string; wallet: string; status: number;
              };
              if (!info.name) return null;
              return { address: addr, name: info.name, location: info.location, wallet: info.wallet || addr, status: Number(info.status) };
            } catch { return null; }
          })
        )
      ).filter((s): s is ShelterInfo => s !== null);

      setShelters(shelterList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(isZh ? `读取链上数据失败：${msg.slice(0, 80)}` : `Failed: ${msg.slice(0, 80)}`);
    } finally { setLoading(false); }
  }, [isZh]);

  const loadVaultBalance = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
      const bal = await provider.getBalance(ADDRESSES.purrToken);
      setVaultBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch {}
  }, []);

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    try {
      const c = getReadonlyContracts();
      const count = Number(await c.catNFT.seriesCount());
      const list: SeriesInfo[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const s = await c.catNFT.getCollectionSeries(i) as { name: string; uri: string; active: boolean };
          list.push({ id: i, name: s.name, uri: s.uri, active: s.active });
        } catch { /* skip */ }
      }
      setSeriesList(list);
    } catch (e) { console.error("loadSeries:", e); }
    finally { setSeriesLoading(false); }
  }, []);

  const loadEquipTemplates = useCallback(async () => {
    setEquipsLoading(true);
    try {
      const c = getReadonlyContracts();
      const [balRaw, totalRaw] = await Promise.all([
        c.equipmentNFT.totalSupply().catch(() => 0n),
        c.equipmentNFT.totalSupply().catch(() => 0n),
      ]);
      // Scan last 50 equipment NFTs to infer template IDs used
      const total = Number(totalRaw ?? balRaw ?? 0);
      const templateIds = new Set<number>();
      const limit = Math.min(total, 50);
      for (let i = Math.max(0, total - limit); i < total; i++) {
        try {
          const eq = await c.equipmentNFT.getEquipment(i) as { slot: bigint; rarity: bigint; name: string; lore: string; rarityBonus: bigint; safetyBonus: bigint; carryBonus: bigint; speedBonus: bigint };
          const key = `${Number(eq.slot)}_${Number(eq.rarity)}_${eq.name}`;
          if (!templateIds.has(Number(eq.rarity) * 100 + Number(eq.slot))) {
            templateIds.add(Number(eq.rarity) * 100 + Number(eq.slot));
            setEquipTemplates(prev => {
              const exists = prev.some(t => t.slot === Number(eq.slot) && t.rarity === Number(eq.rarity) && t.name === eq.name);
              if (exists) return prev;
              return [...prev, { id: i, slot: Number(eq.slot), rarity: Number(eq.rarity), name: eq.name, lore: eq.lore, rarityBonus: Number(eq.rarityBonus), safetyBonus: Number(eq.safetyBonus), carryBonus: Number(eq.carryBonus), speedBonus: Number(eq.speedBonus) }];
            });
          }
        } catch { /* skip */ }
      }
    } catch (e) { console.error("loadEquipTemplates:", e); }
    finally { setEquipsLoading(false); }
  }, []);

  const handleAddSeries = async () => {
    if (!signer || !isOwner) { setSeriesResult(isZh ? "⚠️ 仅 Owner 可添加系列" : "⚠️ Owner only"); return; }
    if (!addSeriesName.trim()) { setSeriesResult(isZh ? "请输入系列名称" : "Enter series name"); return; }
    setAddSeriesLoading(true); setSeriesResult(null);
    try {
      const c = getContracts(signer);
      const tx = await c.catNFT.addCollectionSeries(addSeriesName.trim(), addSeriesUri.trim());
      await (tx as ethers.ContractTransactionResponse).wait();
      setSeriesResult(isZh ? `✅ 系列「${addSeriesName}」已添加` : `✅ Series "${addSeriesName}" added`);
      setAddSeriesName(""); setAddSeriesUri("");
      await loadSeries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setSeriesResult(isZh ? `❌ 失败：${msg.slice(0, 80)}` : `❌ Failed: ${msg.slice(0, 80)}`);
    } finally { setAddSeriesLoading(false); }
  };

  const handleToggleSeries = async (id: number, active: boolean) => {
    if (!signer || !isOwner) { setSeriesResult(isZh ? "⚠️ 仅 Owner 可操作（非 Admin）" : "⚠️ Owner only (not Admin)"); return; }
    setSeriesResult(null);
    try {
      const c = getContracts(signer);
      const tx = await c.catNFT.setCollectionSeriesActive(id, !active);
      await (tx as ethers.ContractTransactionResponse).wait();
      setSeriesResult(isZh ? `✅ 系列 #${id} 已${!active ? "启用" : "停用"}` : `✅ Series #${id} ${!active ? "enabled" : "disabled"}`);
      await loadSeries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setSeriesResult(isZh ? `❌ 失败：${msg.slice(0, 60)}` : `❌ Failed: ${msg.slice(0, 60)}`);
    }
  };

  const handleAddTemplate = async () => {
    if (!signer || !isAdmin) { setTemplateResult(isZh ? "请先连接管理员钱包" : "Connect admin wallet"); return; }
    if (!newTemplate.name.trim()) { setTemplateResult(isZh ? "请输入模板名称" : "Enter template name"); return; }
    setAddTemplateLoading(true); setTemplateResult(null);
    try {
      const c = getContracts(signer);
      const tx = await c.gameContract.addEquipTemplate(
        newTemplate.rarity, newTemplate.slot,
        newTemplate.name.trim(), newTemplate.lore.trim(),
        newTemplate.rarityBonus, newTemplate.safetyBonus,
        newTemplate.carryBonus, newTemplate.speedBonus,
      );
      await (tx as ethers.ContractTransactionResponse).wait();
      setTemplateResult(isZh ? `✅ 模板「${newTemplate.name}」已添加` : `✅ Template "${newTemplate.name}" added`);
      setNewTemplate({ slot: 0, rarity: 0, name: "", lore: "", rarityBonus: 0, safetyBonus: 0, carryBonus: 0, speedBonus: 0 });
      await loadEquipTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setTemplateResult(isZh ? `❌ 失败：${msg.slice(0, 80)}` : `❌ Failed: ${msg.slice(0, 80)}`);
    } finally { setAddTemplateLoading(false); }
  };

  useEffect(() => { loadShelters(); loadVaultBalance(); loadSeries(); loadEquipTemplates(); }, [loadShelters, loadVaultBalance, loadSeries, loadEquipTemplates]);

  // 投票审批机构（approve=true赞成，false反对）
  const voteShelter = async (addr: string, approve: boolean) => {
    if (!signer) { setError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setActionLoading(addr + (approve ? "_yes" : "_no")); setError(null); setSuccess(null);
    try {
      const tx = await new ethers.Contract(
        ADDRESSES.catRegistry,
        ["function voteApprove(address _shelter, bool _approve) external"],
        signer
      ).voteApprove(addr, approve);
      await tx.wait();
      setSuccess(isZh
        ? `已投票${approve ? "赞成" : "反对"} ${addr.slice(0,8)}...，等待多数通过`
        : `Voted ${approve ? "approve" : "reject"} for ${addr.slice(0,8)}...`);
      await loadShelters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setError(isZh ? `投票失败：${msg.slice(0,80)}` : `Failed: ${msg.slice(0,80)}`);
    } finally { setActionLoading(null); }
  };

  // 投票关闭机构
  const voteCloseShelter = async (addr: string) => {
    if (!signer) { setError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    setActionLoading(addr + "_close"); setError(null); setSuccess(null);
    try {
      const tx = await new ethers.Contract(
        ADDRESSES.catRegistry,
        ["function voteClose(address _shelter) external"],
        signer
      ).voteClose(addr);
      await tx.wait();
      setSuccess(isZh ? `已投票关闭 ${addr.slice(0,8)}...，等待多数通过` : `Voted to close ${addr.slice(0,8)}...`);
      await loadShelters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) setError(isZh ? `投票失败：${msg.slice(0,80)}` : `Failed: ${msg.slice(0,80)}`);
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
    if (s === 0) return { text: isZh?"待审批":"Pending",  color:"#d97706", bg:"rgba(217,119,6,0.1)",  border:"rgba(217,119,6,0.3)"  };
    if (s === 1) return { text: isZh?"已审批":"Approved", color:"#16a34a", bg:"rgba(22,163,74,0.1)",  border:"rgba(22,163,74,0.3)"  };
    if (s === 3) return { text: isZh?"已关闭":"Closed",   color:"#64748b", bg:"rgba(100,116,139,0.1)",border:"rgba(100,116,139,0.3)" };
    return             { text: isZh?"已拒绝":"Rejected", color:"#dc2626", bg:"rgba(220,38,38,0.1)",  border:"rgba(220,38,38,0.3)"  };
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
            <button onClick={() => { loadShelters(); loadVaultBalance(); loadSeries(); loadEquipTemplates(); }} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.15)", color:"#c2410c", cursor:"pointer" }}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {isZh ? "刷新" : "Refresh"}
            </button>
            <button onClick={() => {
                // 清除 localStorage 缓存，下次刷新时从头全量扫
                try {
                  Object.keys(localStorage).filter(k => k.startsWith("purrchain_")).forEach(k => localStorage.removeItem(k));
                } catch {}
                loadShelters(); loadVaultBalance();
              }} disabled={loading}
              title={isZh ? "清除缓存并全量重新扫描" : "Clear cache & full rescan"}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.1)", color:"#b45309", cursor:"pointer" }}>
              <RefreshCw size={14} />
              {isZh ? "全量扫描" : "Full Scan"}
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
            { label:isZh?"已通过机构":"Approved Total", count:approved.length, color:"#F97316" },
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
              {pending.map(s => <ShelterCard key={s.address} shelter={s} statusStyle={statusStyle} isAdmin={isAdmin} actionLoading={actionLoading} onVote={voteShelter} onClose={voteCloseShelter} isZh={isZh} />)}
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
              {approved.map(s => <ShelterCard key={s.address} shelter={s} statusStyle={statusStyle} isAdmin={isAdmin} actionLoading={actionLoading} onVote={voteShelter} onClose={voteCloseShelter} isZh={isZh} />)}
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

        {/* ── 游戏配置面板 ── */}
        <div className="mt-8 p-6 rounded-2xl" style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.12)" }}>
          <div className="flex items-center gap-2 mb-6">
            <Gamepad2 size={18} color="#F97316" />
            <h2 className="text-lg font-bold" style={{ color: "#92400e" }}>{isZh ? "游戏配置" : "Game Config"}</h2>
          </div>

          {/* ── Collection Series ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={15} color="#a855f7" />
                <h3 className="font-bold" style={{ color: "#92400e" }}>{isZh ? "收藏系列管理" : "Collection Series"}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>
                  {seriesList.length}
                </span>
              </div>
              <button onClick={loadSeries} disabled={seriesLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", color: "#a855f7", cursor: "pointer" }}>
                <RefreshCw size={11} className={seriesLoading ? "animate-spin" : ""} />
                {isZh ? "刷新" : "Refresh"}
              </button>
            </div>

            {/* 现有系列列表 */}
            {seriesLoading ? (
              <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin" style={{ color: "#a855f7" }} /></div>
            ) : seriesList.length === 0 ? (
              <div className="py-4 text-center rounded-xl mb-4" style={{ background: "rgba(168,85,247,0.04)", border: "1px dashed rgba(168,85,247,0.2)" }}>
                <p className="text-xs" style={{ color: "#b45309" }}>{isZh ? "暂无收藏系列" : "No series yet"}</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {seriesList.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                    style={{ background: s.active ? "rgba(168,85,247,0.06)" : "rgba(100,116,139,0.05)", border: `1px solid ${s.active ? "rgba(168,85,247,0.2)" : "rgba(100,116,139,0.15)"}` }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>#{s.id}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "#92400e" }}>{s.name}</p>
                        {s.uri && <p className="text-xs font-mono truncate" style={{ color: "#d97706" }}>{s.uri.slice(0, 40)}{s.uri.length > 40 ? "…" : ""}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: s.active ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)", color: s.active ? "#16a34a" : "#64748b", border: `1px solid ${s.active ? "rgba(22,163,74,0.2)" : "rgba(100,116,139,0.2)"}` }}>
                        {s.active ? (isZh ? "启用" : "Active") : (isZh ? "停用" : "Inactive")}
                      </span>
                      {isOwner && (
                        <button onClick={() => handleToggleSeries(s.id, s.active)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: s.active ? "rgba(100,116,139,0.08)" : "rgba(22,163,74,0.08)", color: s.active ? "#64748b" : "#16a34a", border: `1px solid ${s.active ? "rgba(100,116,139,0.2)" : "rgba(22,163,74,0.2)"}`, cursor: "pointer" }}
                          title={s.active ? (isZh ? "停用此系列" : "Disable series") : (isZh ? "启用此系列" : "Enable series")}>
                          {s.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 添加新系列 */}
            {isOwner && (
              <div className="p-4 rounded-xl" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "#a855f7" }}>＋ {isZh ? "添加新系列（仅 Owner）" : "Add New Series (Owner only)"}</p>
                <div className="space-y-2">
                  <input value={addSeriesName} onChange={e => setAddSeriesName(e.target.value)}
                    placeholder={isZh ? "系列名称（如：Summer 2025）" : "Series name (e.g. Summer 2025)"}
                    className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                    style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#92400e" }} />
                  <input value={addSeriesUri} onChange={e => setAddSeriesUri(e.target.value)}
                    placeholder={isZh ? "元数据 URI（可选，如：ipfs://...）" : "Metadata URI (optional, e.g. ipfs://...)"}
                    className="w-full px-3 py-2 rounded-xl outline-none text-sm font-mono"
                    style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#92400e" }} />
                </div>
                {seriesResult && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: seriesResult.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{seriesResult}</p>
                )}
                <button onClick={handleAddSeries} disabled={addSeriesLoading || !addSeriesName.trim()}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: (!addSeriesName.trim() || addSeriesLoading) ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg,#a855f7,#9333ea)", cursor: (!addSeriesName.trim() || addSeriesLoading) ? "default" : "pointer", opacity: addSeriesLoading ? 0.7 : 1 }}>
                  {addSeriesLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {isZh ? "添加系列" : "Add Series"}
                </button>
              </div>
            )}
          </div>

          {/* ── Equipment Templates ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sword size={15} color="#F97316" />
                <h3 className="font-bold" style={{ color: "#92400e" }}>{isZh ? "装备模板管理" : "Equipment Templates"}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.1)", color: "#F97316", border: "1px solid rgba(249,115,22,0.2)" }}>
                  {equipTemplates.length}
                </span>
              </div>
              <button onClick={loadEquipTemplates} disabled={equipsLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#c2410c", cursor: "pointer" }}>
                <RefreshCw size={11} className={equipsLoading ? "animate-spin" : ""} />
                {isZh ? "刷新" : "Refresh"}
              </button>
            </div>

            {/* 现有模板列表 */}
            {equipsLoading ? (
              <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin" style={{ color: "#F97316" }} /></div>
            ) : equipTemplates.length === 0 ? (
              <div className="py-4 text-center rounded-xl mb-4" style={{ background: "rgba(249,115,22,0.03)", border: "1px dashed rgba(249,115,22,0.15)" }}>
                <p className="text-xs" style={{ color: "#b45309" }}>{isZh ? "暂无装备模板（链上装备为空）" : "No templates found (no equipment on chain)"}</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {(() => {
                  const SLOT_ICONS = ["⚔️","🎒","👟"];
                  const SLOT_NAMES = isZh ? ["武器","背包","靴子"] : ["Weapon","Bag","Boots"];
                  const RARITY_LABELS = isZh ? ["普通","精良","稀有","传说"] : ["Common","Fine","Rare","Legendary"];
                  const RARITY_COLORS = ["#9CA3AF","#34D399","#60A5FA","#FBBF24"];
                  return equipTemplates.map((t, i) => (
                    <div key={i} className="p-3 rounded-xl flex items-center gap-3"
                      style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)" }}>
                      <span className="text-xl">{SLOT_ICONS[t.slot]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold" style={{ color: "#92400e" }}>{t.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${RARITY_COLORS[t.rarity]}18`, color: RARITY_COLORS[t.rarity], border: `1px solid ${RARITY_COLORS[t.rarity]}30`, fontSize: "10px" }}>
                            {RARITY_LABELS[t.rarity]}
                          </span>
                          <span className="text-xs" style={{ color: "#b45309" }}>{SLOT_NAMES[t.slot]}</span>
                        </div>
                        {t.lore && <p className="text-xs mt-0.5 truncate" style={{ color: "#d97706" }}>{t.lore}</p>}
                        <div className="flex gap-3 mt-1">
                          {t.rarityBonus > 0 && <span className="text-xs" style={{ color: "#FBBF24" }}>🏆+{t.rarityBonus}</span>}
                          {t.safetyBonus > 0 && <span className="text-xs" style={{ color: "#34D399" }}>🛡+{t.safetyBonus}</span>}
                          {t.carryBonus  > 0 && <span className="text-xs" style={{ color: "#60A5FA" }}>🎒+{t.carryBonus}</span>}
                          {t.speedBonus  > 0 && <span className="text-xs" style={{ color: "#F97316" }}>💨+{t.speedBonus}</span>}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* 添加新模板 */}
            {isAdmin && (() => {
              const SLOT_ICONS_SEL = ["⚔️ " + (isZh ? "武器" : "Weapon"), "🎒 " + (isZh ? "背包" : "Bag"), "👟 " + (isZh ? "靴子" : "Boots")];
              const RARITY_SEL = isZh ? ["普通","精良","稀有","传说"] : ["Common","Fine","Rare","Legendary"];
              return (
                <div className="p-4 rounded-xl" style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)" }}>
                  <p className="text-xs font-bold mb-3" style={{ color: "#c2410c" }}>＋ {isZh ? "添加新模板" : "Add New Template"}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "#b45309" }}>{isZh ? "槽位" : "Slot"}</label>
                      <select value={newTemplate.slot} onChange={e => setNewTemplate(t => ({ ...t, slot: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                        style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#92400e" }}>
                        {SLOT_ICONS_SEL.map((s, i) => <option key={i} value={i}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "#b45309" }}>{isZh ? "稀有度" : "Rarity"}</label>
                      <select value={newTemplate.rarity} onChange={e => setNewTemplate(t => ({ ...t, rarity: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                        style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#92400e" }}>
                        {RARITY_SEL.map((r, i) => <option key={i} value={i}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 mb-2">
                    <input value={newTemplate.name} onChange={e => setNewTemplate(t => ({ ...t, name: e.target.value }))}
                      placeholder={isZh ? "名称（如：狩猎利爪）" : "Name (e.g. Hunting Claw)"}
                      className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                      style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#92400e" }} />
                    <input value={newTemplate.lore} onChange={e => setNewTemplate(t => ({ ...t, lore: e.target.value }))}
                      placeholder={isZh ? "Lore（可选）" : "Lore (optional)"}
                      className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                      style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#92400e" }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { key: "rarityBonus" as const, label: isZh ? "🏆稀有加成" : "🏆Rarity" },
                      { key: "safetyBonus" as const, label: isZh ? "🛡安全加成" : "🛡Safety" },
                      { key: "carryBonus"  as const, label: isZh ? "🎒携带加成" : "🎒Carry" },
                      { key: "speedBonus"  as const, label: isZh ? "💨速度加成" : "💨Speed" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs block mb-1" style={{ color: "#b45309" }}>{label}</label>
                        <input type="number" min="0" max="9999" value={newTemplate[key]}
                          onChange={e => setNewTemplate(t => ({ ...t, [key]: Number(e.target.value) }))}
                          className="w-full px-2 py-2 rounded-xl outline-none text-sm text-center"
                          style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", color: "#F97316" }} />
                      </div>
                    ))}
                  </div>
                  {templateResult && (
                    <p className="text-xs mb-2 font-semibold" style={{ color: templateResult.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{templateResult}</p>
                  )}
                  <button onClick={handleAddTemplate} disabled={addTemplateLoading || !newTemplate.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: (!newTemplate.name.trim() || addTemplateLoading) ? "rgba(249,115,22,0.3)" : "linear-gradient(135deg,#F97316,#ea580c)", cursor: (!newTemplate.name.trim() || addTemplateLoading) ? "default" : "pointer", opacity: addTemplateLoading ? 0.7 : 1 }}>
                    {addTemplateLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {isZh ? "添加模板" : "Add Template"}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}

function ShelterCard({ shelter, statusStyle, isAdmin, actionLoading, onVote, onClose, isZh }: {
  shelter: ShelterInfo;
  statusStyle: (s: number) => { text: string; color: string; bg: string; border: string };
  isAdmin: boolean;
  actionLoading: string | null;
  onVote: (addr: string, approve: boolean) => void;
  onClose: (addr: string) => void;
  isZh: boolean;
}) {
  const sl = statusStyle(shelter.status);
  const isPending  = shelter.status === 0;
  const isApproved = shelter.status === 1;
  const isVotingYes   = actionLoading === shelter.address + "_yes";
  const isVotingNo    = actionLoading === shelter.address + "_no";
  const isVotingClose = actionLoading === shelter.address + "_close";
  const anyLoading = isVotingYes || isVotingNo || isVotingClose;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.1)" }}>
      {/* 机构信息行 */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>🏠</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>{shelter.name}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: sl.bg, color: sl.color, border: `1px solid ${sl.border}` }}>{sl.text}</span>
            </div>
            <div className="text-xs mb-0.5" style={{ color: "#b45309" }}>📍 {shelter.location}</div>
            <div className="text-xs font-mono truncate" style={{ color: "#d97706" }}>{shelter.address}</div>
          </div>
        </div>
        <a href={`https://testnet.snowtrace.io/address/${shelter.address}`} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-lg flex-shrink-0" style={{ background: "rgba(249,115,22,0.08)", color: "#b45309" }}>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* 待审批 → 投票区 */}
      {isAdmin && isPending && (
        <div className="px-4 pb-4">
          <p className="text-xs mb-2" style={{ color: "#b45309" }}>
            {isZh ? "超过半数管理员投票后自动生效" : "Auto-approved when majority votes"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onVote(shelter.address, true)}
              disabled={anyLoading}
              className="py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5"
              style={{
                background: isVotingYes ? "rgba(22,163,74,0.4)" : "linear-gradient(135deg,#16a34a,#15803d)",
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: isVotingYes ? 0.7 : 1,
              }}>
              {isVotingYes ? "⏳" : "✓"} {isZh ? "投票赞成" : "Vote Approve"}
            </button>
            <button
              onClick={() => onVote(shelter.address, false)}
              disabled={anyLoading}
              className="py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{
                background: isVotingNo ? "rgba(220,38,38,0.08)" : "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.25)", color: "#dc2626",
                cursor: anyLoading ? "not-allowed" : "pointer", opacity: isVotingNo ? 0.7 : 1,
              }}>
              {isVotingNo ? "⏳" : "✕"} {isZh ? "投票反对" : "Vote Reject"}
            </button>
          </div>
        </div>
      )}

      {/* 已审批 → 关闭投票 */}
      {isAdmin && isApproved && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onClose(shelter.address)}
            disabled={anyLoading}
            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{
              background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.25)",
              color: "#64748b", cursor: anyLoading ? "not-allowed" : "pointer", opacity: isVotingClose ? 0.7 : 1,
            }}>
            {isVotingClose ? "⏳" : "🔒"} {isZh ? "投票关闭机构" : "Vote to Close"}
          </button>
          <p className="text-xs mt-1.5 text-center" style={{ color: "#94a3b8" }}>
            {isZh ? "超过半数投票后机构关闭，旗下猫咪归入已关闭" : "Closes when majority votes — cats move to Closed"}
          </p>
        </div>
      )}
    </div>
  );
}
