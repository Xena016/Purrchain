import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, MapPin, Phone, Mail, FileText, Upload, CheckCircle, ChevronRight, Cat } from "lucide-react";

const STEPS = [
  { label: "基本信息", icon: Building2 },
  { label: "机构资质", icon: FileText },
  { label: "提交审核", icon: CheckCircle },
];

export function InstitutionRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    description: "",
    walletAddress: "",
    // Step 2
    licenseNo: "",
    foundedYear: "",
    catCount: "",
    socialLink: "",
    contactName: "",
  });

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };
  const prevStep = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20" style={{ background: "#0a0819" }}>
        <div className="text-center max-w-md flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4ecdc4, #7ec8e3)" }}>
            <CheckCircle size={40} color="#fff" />
          </div>
          <h2 className="text-3xl" style={{ color: "#fff", fontWeight: 800 }}>申请已提交！</h2>
          <div className="p-6 rounded-2xl text-left" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(126,200,227,0.15)" }}>
            <p className="text-sm leading-relaxed" style={{ color: "#9090b0" }}>
              您的机构注册申请已成功提交。平台管理员将在 <span style={{ color: "#f7a541" }}>3-5 个工作日</span> 内完成审核。
              审核通过后，系统将向您的邮箱发送通知，届时您可以登录并开始上传猫咪档案。
            </p>
          </div>
          <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(247,165,65,0.08)", border: "1px solid rgba(247,165,65,0.2)" }}>
            <p style={{ color: "#f7a541" }}>📋 审核流程</p>
            <ol className="mt-2 space-y-1 text-left" style={{ color: "#9090b0" }}>
              <li>① 机构提交注册申请（已完成）</li>
              <li>② 平台 Owner 调用 approveShelter() 审批</li>
              <li>③ 机构获权，可开始登记猫咪档案</li>
            </ol>
          </div>
          <Link to="/"
            className="px-8 py-3 rounded-full"
            style={{ background: "linear-gradient(135deg, #f7a541, #ff6b6b)", color: "#fff", fontWeight: 700 }}>
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-24" style={{ background: "#0a0819" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7ec8e3, #a855f7)" }}>
            <Building2 size={28} color="#fff" />
          </div>
          <h1 className="text-3xl" style={{ color: "#fff", fontWeight: 800 }}>机构注册申请</h1>
          <p className="text-sm text-center" style={{ color: "#6060a0" }}>
            成为 PurrChain 认证收容机构，开始在链上管理猫咪档案
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all`}
                  style={{
                    background: i <= step ? "linear-gradient(135deg, #7ec8e3, #a855f7)" : "rgba(255,255,255,0.05)",
                    border: i <= step ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}>
                  <s.icon size={18} color={i <= step ? "#fff" : "#444466"} />
                </div>
                <span className="text-xs" style={{ color: i <= step ? "#7ec8e3" : "#444466" }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-16 h-px mx-2 mb-6" style={{ background: i < step ? "rgba(126,200,227,0.5)" : "rgba(255,255,255,0.08)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(126,200,227,0.12)" }}>
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <h3 className="text-lg" style={{ color: "#fff", fontWeight: 700 }}>机构基本信息</h3>

              {[
                { label: "机构名称 *", key: "name", placeholder: "例：爱心猫咪收容所", icon: Building2 },
                { label: "所在地区 *", key: "location", placeholder: "例：台湾 彰化县", icon: MapPin },
                { label: "联系电话 *", key: "phone", placeholder: "例：+886-4-XXXX-XXXX", icon: Phone },
                { label: "联系邮箱 *", key: "email", placeholder: "shelter@example.com", icon: Mail },
                { label: "机构钱包地址 *", key: "walletAddress", placeholder: "0x... (AVAX/C-Chain)", icon: Cat },
              ].map(field => (
                <div key={field.key} className="flex flex-col gap-2">
                  <label className="text-sm" style={{ color: "#9090b0" }}>{field.label}</label>
                  <div className="relative">
                    <field.icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6060a0" }} />
                    <input
                      value={form[field.key as keyof typeof form]}
                      onChange={e => update(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(126,200,227,0.12)", color: "#e8e8f0" }}
                    />
                  </div>
                </div>
              ))}

              <div className="flex flex-col gap-2">
                <label className="text-sm" style={{ color: "#9090b0" }}>机构简介</label>
                <textarea
                  value={form.description}
                  onChange={e => update("description", e.target.value)}
                  placeholder="简单描述机构的背景、规模与使命..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(126,200,227,0.12)", color: "#e8e8f0" }}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <h3 className="text-lg" style={{ color: "#fff", fontWeight: 700 }}>机构资质材料</h3>
              <p className="text-sm" style={{ color: "#6060a0" }}>请提供以下信息，以供平台进行资质审核。</p>

              {[
                { label: "登记证号 / 社团法人证书号", key: "licenseNo", placeholder: "例：财团法人-123456" },
                { label: "成立年份", key: "foundedYear", placeholder: "例：2018" },
                { label: "目前收容猫咪数量（约）", key: "catCount", placeholder: "例：30" },
                { label: "机构负责人姓名", key: "contactName", placeholder: "例：王小明" },
                { label: "社群/官网链接（可选）", key: "socialLink", placeholder: "https://..." },
              ].map(field => (
                <div key={field.key} className="flex flex-col gap-2">
                  <label className="text-sm" style={{ color: "#9090b0" }}>{field.label}</label>
                  <input
                    value={form[field.key as keyof typeof form]}
                    onChange={e => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(126,200,227,0.12)", color: "#e8e8f0" }}
                  />
                </div>
              ))}

              {/* Upload simulation */}
              <div className="flex flex-col gap-2">
                <label className="text-sm" style={{ color: "#9090b0" }}>上传证明文件（登记证书/照片）</label>
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer"
                  style={{ borderColor: "rgba(126,200,227,0.2)", color: "#6060a0" }}>
                  <Upload size={28} />
                  <p className="text-sm">点击或拖拽文件至此处上传</p>
                  <p className="text-xs" style={{ color: "#444466" }}>支持 JPG / PNG / PDF，单文件不超过 10MB</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-lg" style={{ color: "#fff", fontWeight: 700 }}>确认提交申请</h3>

              <div className="p-5 rounded-2xl space-y-3" style={{ background: "rgba(126,200,227,0.06)", border: "1px solid rgba(126,200,227,0.12)" }}>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "#6060a0" }}>机构名称</span>
                  <span className="text-sm" style={{ color: "#e8e8f0" }}>{form.name || "（未填写）"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "#6060a0" }}>所在地区</span>
                  <span className="text-sm" style={{ color: "#e8e8f0" }}>{form.location || "（未填写）"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "#6060a0" }}>联系邮箱</span>
                  <span className="text-sm" style={{ color: "#e8e8f0" }}>{form.email || "（未填写）"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "#6060a0" }}>钱包地址</span>
                  <span className="text-sm font-mono" style={{ color: "#7ec8e3" }}>{form.walletAddress ? form.walletAddress.slice(0, 16) + "..." : "（未填写）"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "#6060a0" }}>登记证号</span>
                  <span className="text-sm" style={{ color: "#e8e8f0" }}>{form.licenseNo || "（未填写）"}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl text-sm space-y-2" style={{ background: "rgba(247,165,65,0.07)", border: "1px solid rgba(247,165,65,0.18)" }}>
                <p style={{ color: "#f7a541" }}>📋 链上注册说明</p>
                <p style={{ color: "#9090b0" }}>
                  提交后，平台将在链上调用 <code className="px-1 rounded" style={{ background: "rgba(126,200,227,0.1)", color: "#7ec8e3" }}>CatRegistry.registerShelter()</code>，
                  等待 Owner 审批 <code className="px-1 rounded" style={{ background: "rgba(126,200,227,0.1)", color: "#7ec8e3" }}>approveShelter()</code> 后即可开始登记猫咪。
                </p>
                <p style={{ color: "#9090b0" }}>
                  捐款将通过 <code className="px-1 rounded" style={{ background: "rgba(126,200,227,0.1)", color: "#7ec8e3" }}>DonationVault</code> 直接转入您的钱包，平台完全不经手。
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded" style={{ accentColor: "#7ec8e3" }} />
                <span className="text-sm" style={{ color: "#9090b0" }}>
                  我已阅读并同意 PurrChain 机构入驻协议，保证所有信息真实有效。
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button onClick={prevStep} disabled={step === 0}
            className="px-6 py-3 rounded-full text-sm disabled:opacity-30"
            style={{ border: "1px solid rgba(126,200,227,0.25)", color: "#7ec8e3", cursor: step === 0 ? "default" : "pointer" }}>
            上一步
          </button>

          {step < STEPS.length - 1 ? (
            <button onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm"
              style={{ background: "linear-gradient(135deg, #7ec8e3, #a855f7)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              下一步 <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-full"
              style={{ background: "linear-gradient(135deg, #f7a541, #ff6b6b)", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "提交中..." : "提交申请"}
              {!loading && <CheckCircle size={16} />}
            </button>
          )}
        </div>

        <p className="text-center mt-4 text-sm" style={{ color: "#444466" }}>
          已有账户？<Link to="/login" style={{ color: "#7ec8e3" }}>直接登录</Link>
        </p>
      </div>
    </div>
  );
}
