import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Plus, CheckCircle, AlertCircle, X, Loader2, ExternalLink, Cat } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getContracts, getReadonlyContracts, ADDRESSES } from "../../lib/contracts";
import { ethers } from "ethers";

// 预设的 stageURIs（IPFS 上已有的图片）
const PRESET_STAGE_URIS = [
  {
    label: "幼猫 Stage 1",
    uri: "ipfs://bafybeiewjp2e4gmewiotq6pi2snbfta2gltblnaymdhbzkhv2hcq3psij4/cat_stage1.json",
  },
  {
    label: "少年猫 Stage 2",
    uri: "ipfs://bafybeiewjp2e4gmewiotq6pi2snbfta2gltblnaymdhbzkhv2hcq3psij4/cat_stage2_junior.json",
  },
  {
    label: "成年猫 Stage 3",
    uri: "ipfs://bafybeiewjp2e4gmewiotq6pi2snbfta2gltblnaymdhbzkhv2hcq3psij4/cat_stage3.json",
  },
  {
    label: "Genesis Stage 4",
    uri: "ipfs://bafybeiewjp2e4gmewiotq6pi2snbfta2gltblnaymdhbzkhv2hcq3psij4/genesis.json",
  },
];

const STAGE_LABELS = ["Stage 1 幼猫", "Stage 2 少年猫", "Stage 3 成年猫", "Stage 4 Genesis"];

interface CatRecord {
  id: number;
  name: string;
  age: number;
  gender: string;
  description: string;
  stageURIs: string[];
  status: number;
}

const STATUS_LABEL: Record<number, { zh: string; en: string; color: string }> = {
  0: { zh: "可领养", en: "Available",        color: "#16a34a" },
  1: { zh: "云领养中", en: "Cloud Adopted",  color: "#F97316" },
  2: { zh: "申请中", en: "Pending Adoption", color: "#a855f7" },
  3: { zh: "已领养", en: "Adopted",          color: "#888" },
};

export function ShelterManage() {
  const navigate = useNavigate();
  const { signer, isConnected, connectWallet, walletAddress, lang } = useApp();
  const isZh = lang === "zh";

  const [shelterStatus, setShelterStatus] = useState<number | null>(null);
  const [shelterName,   setShelterName]   = useState("");
  const [myCats,        setMyCats]        = useState<CatRecord[]>([]);
  const [loadingCats,   setLoadingCats]   = useState(false);
  const [showForm,      setShowForm]      = useState(false);

  // 表单状态
  const [form, setForm] = useState({
    name: "", age: "1", gender: "female", description: "",
    uri0: "", uri1: "", uri2: "", uri3: "",
  });
  const [txLoading, setTxLoading] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [txError,   setTxError]   = useState<string | null>(null);

  // 检查机构状态
  useEffect(() => {
    if (!walletAddress) return;
    const check = async () => {
      try {
        const c = getReadonlyContracts();
        const info = await c.catRegistry.shelters(walletAddress) as {
          name: string; status: number;
        };
        setShelterStatus(Number(info.status));
        setShelterName(info.name || "");
      } catch {}
    };
    check();
  }, [walletAddress]);

  // 读取该机构名下所有猫咪
  useEffect(() => {
    if (!walletAddress || shelterStatus !== 1) return;
    const load = async () => {
      setLoadingCats(true);
      try {
        const c = getReadonlyContracts();
        const total = Number(await c.catRegistry.catCount());
        const cats: CatRecord[] = [];
        for (let i = 0; i < total; i++) {
          try {
            const raw = await c.catRegistry.getCat(i) as {
              name: string; age: bigint; gender: string; description: string;
              stageURIs: string[]; shelter: string; status: number;
            };
            if (raw.shelter.toLowerCase() !== walletAddress.toLowerCase()) continue;
            cats.push({
              id: i, name: raw.name, age: Number(raw.age),
              gender: raw.gender, description: raw.description,
              stageURIs: Array.from(raw.stageURIs),
              status: Number(raw.status),
            });
          } catch {}
        }
        setMyCats(cats);
      } finally { setLoadingCats(false); }
    };
    load();
  }, [walletAddress, shelterStatus]);

  const handleSubmit = async () => {
    if (!signer) { setTxError(isZh ? "请先连接钱包" : "Connect wallet first"); return; }
    if (!form.name.trim()) { setTxError(isZh ? "请填写猫咪名字" : "Enter cat name"); return; }

    setTxLoading(true); setTxError(null); setTxSuccess(null);
    try {
      const c = getContracts(signer);
      const stageURIs: [string, string, string, string] = [
        form.uri0.trim(), form.uri1.trim(), form.uri2.trim(), form.uri3.trim(),
      ];
      const tx = await c.catRegistry.addCat(
        form.name.trim(),
        parseInt(form.age) || 1,
        form.gender,
        form.description.trim(),
        stageURIs
      );
      await (tx as ethers.ContractTransactionResponse).wait();
      setTxSuccess(isZh ? `✅ 猫咪「${form.name}」已成功登记上链！` : `✅ Cat "${form.name}" registered on-chain!`);
      setForm({ name:"", age:"1", gender:"female", description:"", uri0:"", uri1:"", uri2:"", uri3:"" });
      // 刷新列表
      const c2 = getReadonlyContracts();
      const total = Number(await c2.catRegistry.catCount());
      const cats: CatRecord[] = [];
      for (let i = 0; i < total; i++) {
        try {
          const raw = await c2.catRegistry.getCat(i) as {
            name: string; age: bigint; gender: string; description: string;
            stageURIs: string[]; shelter: string; status: number;
          };
          if (raw.shelter.toLowerCase() !== walletAddress!.toLowerCase()) continue;
          cats.push({ id: i, name: raw.name, age: Number(raw.age), gender: raw.gender, description: raw.description, stageURIs: Array.from(raw.stageURIs), status: Number(raw.status) });
        } catch {}
      }
      setMyCats(cats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("user rejected")) {
        if (msg.includes("Not approved shelter")) setTxError(isZh ? "机构尚未通过审批" : "Shelter not approved");
        else setTxError(msg.slice(0, 100));
      }
    } finally { setTxLoading(false); }
  };

  const UriField = ({ idx, value, onChange }: { idx: number; value: string; onChange: (v: string) => void }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#92400e" }}>
        {STAGE_LABELS[idx]}
        <span className="font-normal ml-1" style={{ color: "#b45309" }}>
          {isZh ? "（可选，若该阶段无图可留空）" : "(optional)"}
        </span>
      </label>
      {/* 预设快选 */}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        <button onClick={() => onChange(PRESET_STAGE_URIS[idx].uri)}
          className="px-2 py-1 rounded-lg text-xs"
          style={{ background: "rgba(249,115,22,0.1)", color: "#c2410c", border: "1px solid rgba(249,115,22,0.2)", cursor: "pointer" }}>
          {isZh ? "使用默认图片" : "Use default image"}
        </button>
        {value && (
          <button onClick={() => onChange("")}
            className="px-2 py-1 rounded-lg text-xs"
            style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)", cursor: "pointer" }}>
            {isZh ? "清空" : "Clear"}
          </button>
        )}
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="ipfs://... 或留空"
        className="w-full px-3 py-2 rounded-xl outline-none text-xs font-mono"
        style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)", color: "#92400e" }}
      />
    </div>
  );

  // ── 未连接钱包 ──────────────────────────────────────────
  if (!isConnected) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="text-center">
        <div className="text-5xl mb-4">🔐</div>
        <p className="font-bold mb-4" style={{ color: "#92400e" }}>{isZh ? "请先连接机构钱包" : "Connect your shelter wallet"}</p>
        <button onClick={connectWallet} className="px-6 py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer" }}>
          {isZh ? "连接钱包" : "Connect Wallet"}
        </button>
      </div>
    </div>
  );

  // ── 未注册机构 ──────────────────────────────────────────
  if (shelterStatus === null || shelterStatus === undefined) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-4">🏠</div>
        <p className="font-bold mb-2" style={{ color: "#92400e" }}>{isZh ? "当前钱包未注册机构" : "No shelter registered"}</p>
        <p className="text-sm mb-5" style={{ color: "#b45309" }}>
          {isZh ? "请先前往「机构注册」页面申请注册，待管理员审批通过后即可登记猫咪。" : "Register your shelter first, then wait for admin approval."}
        </p>
        <button onClick={() => navigate("/institution/register")}
          className="px-6 py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer" }}>
          {isZh ? "前往注册" : "Register Shelter"}
        </button>
      </div>
    </div>
  );

  // ── 待审批 ──────────────────────────────────────────────
  if (shelterStatus === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-4">⏳</div>
        <p className="font-bold mb-2" style={{ color: "#92400e" }}>{isZh ? "机构审批中" : "Pending Approval"}</p>
        <p className="text-sm" style={{ color: "#b45309" }}>
          {isZh ? `「${shelterName}」的注册申请正在审核中，请等待管理员审批通过后再登记猫咪。` : `"${shelterName}" is awaiting admin approval.`}
        </p>
      </div>
    </div>
  );

  // ── 已审批机构主界面 ────────────────────────────────────
  return (
    <div className="min-h-screen pt-20" style={{ background: "#fffbf5" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#92400e", fontFamily: "'Space Grotesk', sans-serif" }}>
              🏠 {shelterName || (isZh ? "机构管理" : "Shelter Management")}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#b45309" }}>
              {isZh ? `已审批 · 共 ${myCats.length} 只猫咪` : `Approved · ${myCats.length} cats registered`}
            </p>
          </div>
          <button onClick={() => { setShowForm(true); setTxSuccess(null); setTxError(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer" }}>
            <Plus size={15} />{isZh ? "登记新猫咪" : "Add Cat"}
          </button>
        </div>

        {/* 我的猫咪列表 */}
        {loadingCats ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: "#F97316" }} />
          </div>
        ) : myCats.length === 0 ? (
          <div className="p-12 rounded-2xl text-center"
            style={{ background: "rgba(249,115,22,0.03)", border: "1px dashed rgba(249,115,22,0.15)" }}>
            <div className="text-5xl mb-3">🐱</div>
            <p className="font-bold mb-2" style={{ color: "#92400e" }}>{isZh ? "还没有登记猫咪" : "No cats registered yet"}</p>
            <p className="text-sm" style={{ color: "#b45309" }}>
              {isZh ? "点击右上角「登记新猫咪」开始添加" : "Click 'Add Cat' to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myCats.map(cat => {
              const st = STATUS_LABEL[cat.status] ?? STATUS_LABEL[0];
              return (
                <div key={cat.id} className="p-5 rounded-2xl flex items-start gap-4"
                  style={{ background: "#fff9f5", border: "1px solid rgba(249,115,22,0.1)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: "rgba(249,115,22,0.1)" }}>
                    <Cat size={20} style={{ color: "#F97316" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold" style={{ color: "#92400e" }}>{cat.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}30` }}>
                        {isZh ? st.zh : st.en}
                      </span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: "#b45309" }}>
                      {cat.gender === "female" ? "♀" : "♂"} · {cat.age}{isZh ? "岁" : "yr"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "#78350f" }}>{cat.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-mono" style={{ color: "#d97706" }}>Cat #{cat.id}</span>
                      <a href={`https://testnet.snowtrace.io/address/${ADDRESSES.catRegistry}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs" style={{ color: "#F97316" }}>
                        <ExternalLink size={10} />Snowtrace
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 登记猫咪 Modal ── */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl p-6 overflow-y-auto"
              style={{ background: "#fffbf5", border: "1px solid rgba(249,115,22,0.2)", boxShadow: "0 20px 60px rgba(249,115,22,0.15)", maxHeight: "90vh" }}>

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold" style={{ color: "#92400e" }}>
                  {isZh ? "🐱 登记新猫咪" : "🐱 Register New Cat"}
                </h3>
                <button onClick={() => { setShowForm(false); setTxSuccess(null); setTxError(null); }}
                  className="p-1.5 rounded-lg" style={{ background: "rgba(249,115,22,0.08)", color: "#b45309", cursor: "pointer" }}>
                  <X size={15} />
                </button>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#92400e" }}>
                    {isZh ? "猫咪名字 *" : "Name *"}
                  </label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder={isZh ? "如：小雀" : "e.g. Luna"}
                    className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                    style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.2)", color: "#92400e" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#92400e" }}>
                    {isZh ? "年龄（岁）" : "Age (yrs)"}
                  </label>
                  <input value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                    type="number" min="0" max="20"
                    className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                    style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.2)", color: "#92400e" }} />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#92400e" }}>
                  {isZh ? "性别" : "Gender"}
                </label>
                <div className="flex gap-3">
                  {[{ v: "female", zh: "♀ 母猫", en: "♀ Female" }, { v: "male", zh: "♂ 公猫", en: "♂ Male" }].map(opt => (
                    <button key={opt.v} onClick={() => setForm(p => ({ ...p, gender: opt.v }))}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold"
                      style={{
                        background: form.gender === opt.v ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.05)",
                        border: form.gender === opt.v ? "1px solid rgba(249,115,22,0.4)" : "1px solid rgba(249,115,22,0.12)",
                        color: form.gender === opt.v ? "#F97316" : "#b45309", cursor: "pointer",
                      }}>
                      {isZh ? opt.zh : opt.en}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#92400e" }}>
                  {isZh ? "描述" : "Description"}
                </label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder={isZh ? "介绍一下这只猫咪…" : "Describe this cat…"}
                  className="w-full px-3 py-2 rounded-xl outline-none text-sm resize-none"
                  style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.2)", color: "#92400e" }} />
              </div>

              {/* stageURIs */}
              <div className="p-4 rounded-2xl mb-4" style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "#F97316" }}>
                  {isZh ? "NFT 成长阶段图片（IPFS metadata URI）" : "Growth Stage NFT URIs (IPFS metadata)"}
                </p>
                <p className="text-xs mb-3" style={{ color: "#b45309" }}>
                  {isZh ? "点击「使用默认图片」快速填入已有的 IPFS 资源，或粘贴你自己的 URI。成年猫可只填 Stage 3。" : "Click 'Use default image' to fill in existing IPFS assets, or paste your own URIs."}
                </p>
                <UriField idx={0} value={form.uri0} onChange={v => setForm(p => ({ ...p, uri0: v }))} />
                <UriField idx={1} value={form.uri1} onChange={v => setForm(p => ({ ...p, uri1: v }))} />
                <UriField idx={2} value={form.uri2} onChange={v => setForm(p => ({ ...p, uri2: v }))} />
                <UriField idx={3} value={form.uri3} onChange={v => setForm(p => ({ ...p, uri3: v }))} />
              </div>

              {txError   && <div className="flex items-center gap-2 mb-3 text-xs text-red-500"><AlertCircle size={13} />{txError}</div>}
              {txSuccess && <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: "#16a34a" }}><CheckCircle size={13} />{txSuccess}</div>}

              <button onClick={handleSubmit} disabled={txLoading}
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #F97316, #fbbf24)", cursor: "pointer", opacity: txLoading ? 0.7 : 1 }}>
                {txLoading && <Loader2 size={16} className="animate-spin" />}
                {txLoading ? (isZh ? "链上处理中…" : "Processing…") : (isZh ? "确认登记上链" : "Register On-Chain")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
