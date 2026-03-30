import { ethers } from "ethers";

// ============================================================
//  合约地址 — Avalanche Fuji 测试网 (chainId: 43113)
// ============================================================

export const ADDRESSES = {
  catRegistry:   "0x96208e12E4Af9F76C2Ea46D86474c1a90919ac45",
  catNFT:        "0x2E7Ccd19c383102831a54de2dF57Ad46198D9e37",
  purrToken:     "0xf79B8fe6A79fe1eBA747842B6B6D00b26F5ed250",
  equipmentNFT:  "0xb00081765ce22319060e7286BAdeFdE0B75120Ce",
  gameContract:  "0x469853196b0201fFedDB53008dF11659e22815ee",
  donationVault: "0xc55D34E3F1e3B690872934359930A64fb82dd56A",
  adoptionVault: "0xFcbA7E3ddc86bfFCFeD0dE62e4F404d9f05878C9",
} as const;

// ============================================================
//  Fuji 网络参数
// ============================================================

export const FUJI_CHAIN_ID = 43113;

export const FUJI_NETWORK = {
  chainId: "0xA869", // 43113 in hex
  chainName: "Avalanche Fuji C-Chain",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
  blockExplorerUrls: ["https://testnet.snowtrace.io"],
};

// ============================================================
//  ABI — 只包含前端实际调用的函数
// ============================================================

export const CAT_REGISTRY_ABI = [
  "function catCount() view returns (uint256)",
  "function getCat(uint256 _catId) view returns (tuple(uint256 id, string name, uint8 age, string gender, string description, string[4] stageURIs, address shelter, uint8 status))",
  "function isShelterApproved(address _shelter) view returns (bool)",
  "function registerShelter(string calldata _name, string calldata _location) external",
  "function shelters(address) view returns (string name, string location, address wallet, uint8 status)",
] as const;

export const CAT_NFT_ABI = [
  "function claimFamilyPortrait() external",
  "function hasClaimedFamilyPortrait(address) view returns (bool)",
  "function getUserCatTokenIds(address _user, uint256 _realCatId) view returns (uint256[3])",
  "function userCatStage(address, uint256) view returns (uint8)",
  "function nftInfo(uint256) view returns (uint8 nftType, uint256 linkedRealCatId, uint8 stage, uint8 season, uint32 seriesId, string tokenURIValue)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  // 查询用户持有的 tokenId 需要遍历，用 totalSupply + ownerOf 或监听事件
  // 这里提供 totalSupply 供前端遍历用
  "function totalSupply() view returns (uint256)",
] as const;

export const PURR_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function hasClaimedWelcome(address) view returns (bool)",
  "function claimWelcomeTokens(uint256 nftTokenId) external",
  "function buyTokens() external payable",
] as const;

export const DONATION_VAULT_ABI = [
  "function donate(uint256 _realCatId) external payable",
  "function userCatDonation(address, uint256) view returns (uint256)",
  "function remainingToNextStage(address _donor, uint256 _realCatId) view returns (uint256)",
  "function donationStage(address, uint256) view returns (uint8)",
  "function stageThreshold() view returns (uint256)",
] as const;

export const ADOPTION_VAULT_ABI = [
  "function applyAdoption(uint256 _catId) external",
  "function payDeposit(uint256 _catId) external payable",
  "function getApplication(uint256 _catId) view returns (tuple(address applicant, uint256 catId, uint256 depositAmount, uint256 depositTimestamp, uint256 cancelTimestamp, uint8 status))",
  "function adoptionDepositAmount() view returns (uint256)",
] as const;

export const GAME_CONTRACT_ABI = [
  // 新用户
  "function claimStarterCat(uint256 _realCatId) external",
  "function hasClaimedStarterCat(address) view returns (bool)", // 注意：此函数在 CatNFT 合约，这里备注
  // 体力
  "function staminaOf(address player) view returns (uint8)",
  "function buyStamina(uint8 amount) external",
  // 道具库存
  "function foodBalance(address) view returns (uint256)",
  "function canBalance(address) view returns (uint256)",
  "function boosterBalance(address) view returns (uint256)",
  "function materialBalance(address) view returns (uint256)",
  "function gachaTickets(address) view returns (uint256)",
  // 商店购买
  "function buyCatFood(uint256 amount) external",
  "function buyCatCan(uint256 amount) external",
  "function buyBooster(uint256 amount) external",
  // 出猎: duration 0=Short/1=Mid/2=Long, item 0=None/1=Food/2=Can
  "function startHunt(uint256 catTokenId, uint8 duration, uint8 item, bool useBooster) external",
  "function settleHunt(uint256 catTokenId) external",
  "function huntInfo(uint256) view returns (uint8 status, uint8 duration, uint256 departureTime, uint256 effectiveDuration, uint8 item)",
  // 碎片合成 & 抽卡
  "function mergeFragments(uint256 amount) external",
  "function gacha() external",
  // 周券
  "function claimWeeklyTicket(uint256 catTokenId) external",
  "function lastClaimTime(uint256) view returns (uint256)",
  // 装备
  "function equipItem(uint256 catTokenId, uint256 equipTokenId) external",
  "function unequipItem(uint256 catTokenId, uint8 slot) external",
  // 价格查询
  "function foodPrice() view returns (uint256)",
  "function canPrice() view returns (uint256)",
  "function staminaPrice() view returns (uint256)",
  "function boosterPrice() view returns (uint256)",
  // 出猎参数
  "function huntDuration(uint256) view returns (uint256)",
  "function staminaCost(uint256) view returns (uint256)",
] as const;

export const EQUIPMENT_NFT_ABI = [
  "function getCatBonuses(uint256 catTokenId) view returns (uint16 totalRarity, uint16 totalSafety, uint16 totalCarry, uint16 totalSpeed)",
  "function getSlotEquipment(uint256 catTokenId, uint8 slot) view returns (uint256)",
  "function getEquipment(uint256 tokenId) view returns (tuple(uint8 slot, uint8 rarity, string name, string lore, uint16 rarityBonus, uint16 safetyBonus, uint16 carryBonus, uint16 speedBonus))",
  "function ownerOf(uint256 tokenId) view returns (address)",
] as const;

// ============================================================
//  合约实例工厂
//  用法：const c = getContracts(signer)
//        await c.purrToken.balanceOf(addr)
// ============================================================

export function getContracts(signerOrProvider: ethers.Signer | ethers.Provider) {
  return {
    catRegistry:   new ethers.Contract(ADDRESSES.catRegistry,   CAT_REGISTRY_ABI,   signerOrProvider),
    catNFT:        new ethers.Contract(ADDRESSES.catNFT,        CAT_NFT_ABI,        signerOrProvider),
    purrToken:     new ethers.Contract(ADDRESSES.purrToken,     PURR_TOKEN_ABI,     signerOrProvider),
    donationVault: new ethers.Contract(ADDRESSES.donationVault, DONATION_VAULT_ABI, signerOrProvider),
    adoptionVault: new ethers.Contract(ADDRESSES.adoptionVault, ADOPTION_VAULT_ABI, signerOrProvider),
    gameContract:  new ethers.Contract(ADDRESSES.gameContract,  GAME_CONTRACT_ABI,  signerOrProvider),
    equipmentNFT:  new ethers.Contract(ADDRESSES.equipmentNFT,  EQUIPMENT_NFT_ABI,  signerOrProvider),
  };
}

// 只读 provider（不需要钱包，用于展示数据）
export function getReadonlyProvider() {
  return new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
}

export function getReadonlyContracts() {
  return getContracts(getReadonlyProvider());
}
