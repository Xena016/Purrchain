import React, { createContext, useContext, useState, useEffect } from "react";

interface AppContextType {
  walletAddress: string | null;
  isConnected: boolean;
  nftClaimed: boolean;
  purrBalance: number;
  connectWallet: () => void;
  disconnectWallet: () => void;
  claimNFT: () => void;
  claimPURR: () => void;
  purrClaimed: boolean;
  starterCatClaimed: boolean;
  claimStarterCat: (catId: number) => void;
  starterCatId: number | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [nftClaimed, setNftClaimed] = useState(false);
  const [purrBalance, setPurrBalance] = useState(0);
  const [purrClaimed, setPurrClaimed] = useState(false);
  const [starterCatClaimed, setStarterCatClaimed] = useState(false);
  const [starterCatId, setStarterCatId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("purrchain_state");
    if (saved) {
      const state = JSON.parse(saved);
      setWalletAddress(state.walletAddress || null);
      setNftClaimed(state.nftClaimed || false);
      setPurrBalance(state.purrBalance || 0);
      setPurrClaimed(state.purrClaimed || false);
      setStarterCatClaimed(state.starterCatClaimed || false);
      setStarterCatId(state.starterCatId || null);
    }
  }, []);

  const saveState = (updates: Partial<{
    walletAddress: string | null;
    nftClaimed: boolean;
    purrBalance: number;
    purrClaimed: boolean;
    starterCatClaimed: boolean;
    starterCatId: number | null;
  }>) => {
    const current = JSON.parse(localStorage.getItem("purrchain_state") || "{}");
    localStorage.setItem("purrchain_state", JSON.stringify({ ...current, ...updates }));
  };

  const connectWallet = () => {
    const addr = "0x" + Math.random().toString(16).slice(2, 10).toUpperCase() + "..." + Math.random().toString(16).slice(2, 6).toUpperCase();
    setWalletAddress(addr);
    saveState({ walletAddress: addr });
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    saveState({ walletAddress: null });
  };

  const claimNFT = () => {
    setNftClaimed(true);
    saveState({ nftClaimed: true });
  };

  const claimPURR = () => {
    setPurrBalance((prev) => prev + 20);
    setPurrClaimed(true);
    saveState({ purrBalance: purrBalance + 20, purrClaimed: true });
  };

  const claimStarterCat = (catId: number) => {
    setStarterCatClaimed(true);
    setStarterCatId(catId);
    saveState({ starterCatClaimed: true, starterCatId: catId });
  };

  return (
    <AppContext.Provider
      value={{
        walletAddress,
        isConnected: !!walletAddress,
        nftClaimed,
        purrBalance,
        connectWallet,
        disconnectWallet,
        claimNFT,
        claimPURR,
        purrClaimed,
        starterCatClaimed,
        claimStarterCat,
        starterCatId,
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
