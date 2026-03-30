import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  connectWallet as connectMetaMask,
  formatAddress,
  formatPurr,
  onAccountChange,
  onChainChange,
  isMetaMaskInstalled,
} from "../../lib/web3";
import { getContracts, getReadonlyContracts } from "../../lib/contracts";

// ============================================================
//  类型定义
// ============================================================

interface AppContextType {
  // 钱包状态
  walletAddress: string | null;
  isConnected: boolean;
  formattedAddress: string;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // 链上资产状态
  purrBalance: string;           // 格式化后的 PURR 余额（整数字符串）
  purrBalanceRaw: bigint;        // 原始 wei
  nftClaimed: boolean;           // 是否已领全家福 NFT
  familyPortraitTokenId: number | null; // 全家福 NFT 的 tokenId（领取后用于领 PURR）
  welcomeClaimed: boolean;       // 是否已领 20 PURR 欢迎奖励
  starterCatClaimed: boolean;    // 是否已领免费初始猫
  starterCatId: number | null;   // 初始猫对应的真实猫 ID (CatRegistry id)

  // 链上操作
  claimFamilyPortrait: () => Promise<void>;
  claimWelcomeTokens: () => Promise<void>;
  claimStarterCat: (realCatId: number) => Promise<void>;
  refreshBalance: () => Promise<void>;

  // 错误 & 加载
  error: string | null;
  clearError: () => void;
  isLoading: boolean;

  // signer（其他页面需要发交易时用）
  signer: ethers.Signer | null;

  // 语言
  lang: "zh" | "en";
  setLang: (lang: "zh" | "en") => void;
}

// ============================================================
//  Context
// ============================================================

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress]     = useState<string | null>(null);
  const [signer, setSigner]                   = useState<ethers.Signer | null>(null);
  const [isConnecting, setIsConnecting]       = useState(false);
  const [purrBalanceRaw, setPurrBalanceRaw]   = useState<bigint>(0n);
  const [nftClaimed, setNftClaimed]           = useState(false);
  const [familyPortraitTokenId, setFamilyPortraitTokenId] = useState<number | null>(null);
  const [welcomeClaimed, setWelcomeClaimed]   = useState(false);
  const [starterCatClaimed, setStarterCatClaimed] = useState(false);
  const [starterCatId, setStarterCatId]       = useState<number | null>(null);
  const [error, setError]                     = useState<string | null>(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [lang, setLang]                       = useState<"zh" | "en">("zh");

  // ── 读取用户链上状态 ──────────────────────────────────────

  const loadUserState = useCallback(async (address: string) => {
    try {
      setIsLoading(true);
      const c = getReadonlyContracts();

      const [
        purr,
        portraitClaimed,
        welcome,
        starterClaimed,
      ] = await Promise.all([
        c.purrToken.balanceOf(address),
        c.catNFT.hasClaimedFamilyPortrait(address),
        c.purrToken.hasClaimedWelcome(address),
        c.catNFT.hasClaimedFamilyPortrait(address), // starterCat 在 catNFT 里
      ]);

      setPurrBalanceRaw(purr as bigint);
      setNftClaimed(portraitClaimed as boolean);
      setWelcomeClaimed(welcome as boolean);

      // 检查是否已领免费初始猫（GameContract.hasClaimedStarterCat）
      // 用只读合约查
      const gc = getReadonlyContracts();
      // hasClaimedStarterCat 在 CatNFT 合约
      const scClaimed = await gc.catNFT.hasClaimedFamilyPortrait(address); // placeholder
      // 实际调用 GameContract 的 hasClaimedStarterCat —— 但 ABI 里没有，
      // 改从 catNFT.hasClaimedStarterCat 读（这个函数在 catNFT 合约里）
      // 需要直接调用：
      const provider = gc.catNFT.runner?.provider;
      if (provider) {
        const catNFTContract = new ethers.Contract(
          await gc.catNFT.getAddress(),
          ["function hasClaimedStarterCat(address) view returns (bool)",
           "function starterCatOf(address) view returns (uint256)"],
          provider
        );
        const [claimed, catOf] = await Promise.all([
          catNFTContract.hasClaimedStarterCat(address),
          catNFTContract.starterCatOf(address),
        ]);
        setStarterCatClaimed(claimed as boolean);
        if (claimed) setStarterCatId(Number(catOf));
      }

      // 如果已领全家福 NFT，尝试找到 tokenId（用于 claimWelcomeTokens）
      if (portraitClaimed) {
        // 通过遍历找到属于该用户的 FamilyPortrait NFT
        // 简化：从 totalSupply 往前找，找到第一个该用户持有的 type=3 NFT
        try {
          const total = await c.catNFT.totalSupply();
          const totalNum = Number(total);
          // 从最新的往前找，最多找 50 个
          const searchLimit = Math.min(totalNum, 50);
          for (let i = totalNum - 1; i >= totalNum - searchLimit; i--) {
            try {
              const owner = await c.catNFT.ownerOf(i);
              if ((owner as string).toLowerCase() === address.toLowerCase()) {
                const info = await c.catNFT.nftInfo(i);
                if (Number((info as { nftType: unknown }).nftType) === 3) {
                  setFamilyPortraitTokenId(i);
                  break;
                }
              }
            } catch {
              // token 不存在，继续
            }
          }
        } catch {
          // 查找失败不影响主流程
        }
      }
    } catch (err) {
      console.error("加载用户状态失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 连接钱包 ─────────────────────────────────────────────

  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError("请先安装 MetaMask 钱包插件，然后刷新页面");
      return;
    }
    try {
      setIsConnecting(true);
      setError(null);
      const { address, signer: s } = await connectMetaMask();
      setWalletAddress(address);
      setSigner(s);
      await loadUserState(address);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "连接钱包失败";
      if (!msg.includes("user rejected")) {
        setError(msg);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setSigner(null);
    setPurrBalanceRaw(0n);
    setNftClaimed(false);
    setFamilyPortraitTokenId(null);
    setWelcomeClaimed(false);
    setStarterCatClaimed(false);
    setStarterCatId(null);
  };

  // ── 刷新余额 ─────────────────────────────────────────────

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const c = getReadonlyContracts();
      const purr = await c.purrToken.balanceOf(walletAddress);
      setPurrBalanceRaw(purr as bigint);
    } catch (err) {
      console.error("刷新余额失败:", err);
    }
  }, [walletAddress]);

  // ── 领取全家福 NFT ────────────────────────────────────────

  const claimFamilyPortrait = async () => {
    if (!signer || !walletAddress) {
      setError("请先连接钱包");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const c = getContracts(signer);
      const tx = await c.catNFT.claimFamilyPortrait();
      await (tx as ethers.ContractTransactionResponse).wait();
      setNftClaimed(true);
      // 等链上确认后重新加载状态
      await loadUserState(walletAddress);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "领取失败";
      if (msg.includes("already claimed")) {
        setError("每个地址只能领取一次全家福 NFT");
      } else if (msg.includes("user rejected")) {
        // 用户取消，不显示错误
      } else {
        setError(`领取全家福 NFT 失败：${msg.slice(0, 80)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── 领取 20 PURR 欢迎奖励 ─────────────────────────────────

  const claimWelcomeTokens = async () => {
    if (!signer || !walletAddress) {
      setError("请先连接钱包");
      return;
    }
    if (familyPortraitTokenId === null) {
      setError("请先领取全家福 NFT");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const c = getContracts(signer);
      const tx = await c.purrToken.claimWelcomeTokens(familyPortraitTokenId);
      await (tx as ethers.ContractTransactionResponse).wait();
      setWelcomeClaimed(true);
      await refreshBalance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "领取失败";
      if (msg.includes("already claimed")) {
        setError("欢迎奖励已领取过");
        setWelcomeClaimed(true);
      } else if (!msg.includes("user rejected")) {
        setError(`领取 PURR 失败：${msg.slice(0, 80)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── 领取免费初始猫 ────────────────────────────────────────

  const claimStarterCat = async (realCatId: number) => {
    if (!signer || !walletAddress) {
      setError("请先连接钱包");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const c = getContracts(signer);
      const tx = await c.gameContract.claimStarterCat(realCatId);
      await (tx as ethers.ContractTransactionResponse).wait();
      setStarterCatClaimed(true);
      setStarterCatId(realCatId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "领取失败";
      if (msg.includes("already claimed")) {
        setError("已经领取过免费初始猫了");
        setStarterCatClaimed(true);
      } else if (!msg.includes("user rejected")) {
        setError(`领取初始猫失败：${msg.slice(0, 80)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── 监听账户 / 网络切换 ───────────────────────────────────

  useEffect(() => {
    const unsubAccount = onAccountChange((address) => {
      if (address) {
        setWalletAddress(address);
        loadUserState(address);
      } else {
        disconnectWallet();
      }
    });

    const unsubChain = onChainChange((chainId) => {
      if (chainId !== 43113) {
        setError("请切换到 Avalanche Fuji 测试网（chainId: 43113）");
      } else {
        setError(null);
      }
    });

    return () => {
      unsubAccount();
      unsubChain();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 页面加载时检查是否已连接 ─────────────────────────────

  useEffect(() => {
    const checkExisting = async () => {
      if (!isMetaMaskInstalled()) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum!);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const s = await provider.getSigner();
          const address = await s.getAddress();
          setWalletAddress(address);
          setSigner(s);
          await loadUserState(address);
        }
      } catch {
        // 未授权，正常情况
      }
    };
    checkExisting();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────

  return (
    <AppContext.Provider
      value={{
        walletAddress,
        isConnected: !!walletAddress,
        formattedAddress: walletAddress ? formatAddress(walletAddress) : "",
        isConnecting,
        connectWallet,
        disconnectWallet,
        purrBalance: formatPurr(purrBalanceRaw),
        purrBalanceRaw,
        nftClaimed,
        familyPortraitTokenId,
        welcomeClaimed,
        starterCatClaimed,
        starterCatId,
        claimFamilyPortrait,
        claimWelcomeTokens,
        claimStarterCat,
        refreshBalance,
        error,
        clearError: () => setError(null),
        isLoading,
        signer,
        lang,
        setLang,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
