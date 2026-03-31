import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { getReadonlyContracts, getContracts, ADDRESSES } from "../../lib/contracts";
import { ethers } from "ethers";
import { ShieldCheck, Clock, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";

// Owner 地址（部署合约的钱包）
const OWNER_ADDRESS = "0xc3AE0Fd5d1Be2A5d19bb683E43fFa0D3991a074d"; // 从 deploy.js 输出复制

interface ShelterInfo {
  address: string;
  name: string;
  location: string;
  wallet: string;
  status: number; // 0=Pending, 1=Approved, 2=Rejected
}

export function AdminPage() {
  const { walletAddress, isConnected, connectWallet, signer } = useApp();
  const navigate = useNavigate();
  const [shelters, setShelters] = useState<ShelterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = walletAddress?.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  // 从链上读取所有机构注册事件
  const loadShelters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
      const c = getReadonlyContracts();

      // 监听 ShelterRegistered 事件获取所有注册地址
      const catRegistryContract = new ethers.Contract(
        ADDRESSES.catRegistry,
        [
          "event ShelterRegistered(address indexed shelter, string name, string location)",
          "function shelters(address) view returns (string name, string location, address wallet, uint8 status)",
          "function approveShelter(address _shelter) external",
        ],
        provider
      );

      // 获取历史事件
      const filter = catRegistryContract.filters.ShelterRegistered();
      const latest = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latest - 2000);
      const events = await catRegistryContract.queryFilter(filter, fromBlock, latest);

      const shelterList: ShelterInfo[] = await Promise.all(
        events.map(async (event) => {
          const e = event as ethers.EventLog;
          const addr = e.args[0] as string;
          try {
            const info = await c.catRegistry.shelters(addr);
            const infoTyped = info as { name: string; location: string; wallet: string; status: number };
            return {
              address: addr,
              name: infoTyped.name || e.args[1],
              location: infoTyped.location || e.args[2],
              wallet: infoTyped.wallet || addr,
              status: Number(infoTyped.status),
            };
          } catch {
            return {
              address: addr,
              name: e.args[1] as string,
              location: e.args[2] as string,
              wallet: addr,
              status: 0,
            };
          }
        })
      );

      setShelters(shelterList);
    } catch (err) {
      setError("读取机构数据失败，请检查网络连接");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShelters();
  }, [loadShelters]);

  const approveShelter = async (shelterAddress: string) => {
    if (!signer) { setError("请先连接钱包"); return; }
    setActionLoading(shelterAddress);
    setError(null);
    setSuccess(null);
    try {
      const catRegistryContract = new ethers.Contract(
        ADDRESSES.catRegistry,
        ["function approveShelter(address _shelter) external"],
        signer
      );
      const tx = await catRegistryContract.approveShelter(shelterAddress);
      await tx.wait();
      setSuccess(`机构 ${shelterAddress.slice(0, 8)}... 审批通过！`);
      await loadShelters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "审批失败";
      if (msg.includes("user rejected")) {
        setError("用户取消了操作");
      } else {
        setError(`审批失败：${msg.slice(0, 80)}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const statusLabel = (status: number) => {
    switch (status) {
      case 0: return { text: "待审批", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" };
      case 1: return { text: "已审批", color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" };
      case 2: return { text: "已拒绝", color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" };
      default: return { text: "未知", color: "#9090b0", bg: "rgba(144,144,176,0.1)", border: "rgba(144,144,176,0.3)" };
    }
  };

  const pending = shelters.filter(s => s.status === 0);
  const approved = shelters.filter(s => s.status === 1);

  return (
    <div className="min-h-screen px-4 py-24" style={{ background: "#080818" }}>
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }} />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: "#fff", fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
                Admin 管理面板
              </h1>
              <p className="text-xs" style={{ color: "#6060a0", fontFamily: "'Space Mono', sans-serif" }}>
                CatRegistry · 机构审批
              </p>
            </div>
          </div>
          <button
            onClick={loadShelters}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9090b0", cursor: "pointer" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="text-sm">刷新</span>
          </button>
        </div>

        {/* 钱包状态 */}
        {!isConnected ? (
          <div className="p-8 rounded-2xl text-center mb-6"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-4xl mb-3">🔐</div>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>请先连接 Owner 钱包</p>
            <button onClick={connectWallet}
              className="px-6 py-2 rounded-xl"
              style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff", cursor: "pointer" }}>
              连接钱包
            </button>
          </div>
        ) : !isOwner ? (
          <div className="p-6 rounded-2xl mb-6"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ color: "#FCA5A5" }}>⚠️ 当前钱包不是合约 Owner，无法执行审批操作</p>
            <p className="text-xs mt-1" style={{ color: "#6060a0" }}>当前地址：{walletAddress}</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl mb-6 flex items-center gap-3"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <CheckCircle size={16} color="#10B981" />
            <p className="text-sm" style={{ color: "#6EE7B7" }}>Owner 身份验证通过，可执行审批操作</p>
          </div>
        )}

        {/* 错误/成功提示 */}
        {error && (
          <div className="p-4 rounded-xl mb-4 flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <XCircle size={16} color="#EF4444" />
            <p className="text-sm" style={{ color: "#FCA5A5" }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl mb-4 flex items-center gap-2"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <CheckCircle size={16} color="#10B981" />
            <p className="text-sm" style={{ color: "#6EE7B7" }}>{success}</p>
          </div>
        )}

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "待审批", count: pending.length, color: "#F59E0B" },
            { label: "已审批", count: approved.length, color: "#10B981" },
            { label: "总计", count: shelters.length, color: "#A78BFA" },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-3xl font-bold mb-1" style={{ color: item.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {item.count}
              </div>
              <div className="text-xs" style={{ color: "#6060a0" }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* 待审批列表 */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} color="#F59E0B" />
              <h2 className="text-lg" style={{ color: "#fff", fontWeight: 700 }}>待审批机构</h2>
              <span className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
                {pending.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {pending.map((shelter) => (
                <ShelterCard
                  key={shelter.address}
                  shelter={shelter}
                  statusLabel={statusLabel}
                  isOwner={isOwner}
                  actionLoading={actionLoading}
                  onApprove={approveShelter}
                />
              ))}
            </div>
          </div>
        )}

        {/* 已审批列表 */}
        {approved.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} color="#10B981" />
              <h2 className="text-lg" style={{ color: "#fff", fontWeight: 700 }}>已审批机构</h2>
              <span className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
                {approved.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {approved.map((shelter) => (
                <ShelterCard
                  key={shelter.address}
                  shelter={shelter}
                  statusLabel={statusLabel}
                  isOwner={isOwner}
                  actionLoading={actionLoading}
                  onApprove={approveShelter}
                />
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && shelters.length === 0 && (
          <div className="p-12 rounded-2xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
            <div className="text-4xl mb-3">🏠</div>
            <p style={{ color: "rgba(255,255,255,0.4)" }}>暂无机构注册记录</p>
          </div>
        )}

        {loading && (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3 animate-spin inline-block">⚙️</div>
            <p style={{ color: "rgba(255,255,255,0.4)" }}>读取链上数据中...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ShelterCard({
  shelter,
  statusLabel,
  isOwner,
  actionLoading,
  onApprove,
}: {
  shelter: ShelterInfo;
  statusLabel: (s: number) => { text: string; color: string; bg: string; border: string };
  isOwner: boolean;
  actionLoading: string | null;
  onApprove: (addr: string) => void;
}) {
  const sl = statusLabel(shelter.status);
  const isLoading = actionLoading === shelter.address;

  return (
    <div className="p-5 rounded-2xl flex items-center justify-between gap-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)", fontSize: "1.2rem" }}>
          🏠
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold" style={{ color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>
              {shelter.name}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: sl.bg, color: sl.color, border: `1px solid ${sl.border}` }}>
              {sl.text}
            </span>
          </div>
          <div className="text-xs mb-1" style={{ color: "#6060a0" }}>📍 {shelter.location}</div>
          <div className="text-xs font-mono truncate" style={{ color: "#444466" }}>
            {shelter.address}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={`https://testnet.snowtrace.io/address/${shelter.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.05)", color: "#6060a0" }}
        >
          <ExternalLink size={14} />
        </a>
        {isOwner && shelter.status === 0 && (
          <button
            onClick={() => onApprove(shelter.address)}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: isLoading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #10B981, #059669)",
              color: "#fff",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {isLoading ? "确认中..." : "✓ 审批通过"}
          </button>
        )}
      </div>
    </div>
  );
}
