import { ethers } from "ethers";

// ============================================================
//  合约地址 — Avalanche Fuji 测试网 (chainId: 43113)
// ============================================================

export const ADDRESSES = {
  catRegistry:   "0xA7002729B8CD1a01adc58eD4fD2A1F22491AfD81",
  catNFT:        "0x1c23189c9DCDed2050008699576e28F303e2E138",
  purrToken:     "0xBAc1d9887cD4bA082049A50b6e7024fd1ce9258c",
  equipmentNFT:  "0x368A130859323B644Dc55f2371C6e056dE8003E6",
  gameContract:  "0xb46cDF1e9A48912D12F9b3cD98766B5bEe8b9Afe",
  donationVault: "0xE487579BA05d150d3cb0c0415F395B760f7280F2",
  adoptionVault: "0xEf0C63083c78B24Ad4a232AA793723f633E67338",
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
  "function addCat(string calldata _name, uint8 _age, string calldata _gender, string calldata _description, string[4] calldata _stageURIs) external",
  "function approveShelter(address _shelter) external",
  "function rejectShelter(address _shelter) external",
  "function updateCatStageURI(uint256 _catId, uint8 _stage, string calldata _uri) external",
  "event ShelterRegistered(address indexed shelter, string name, string location)",
  "function shelters(address) view returns (string name, string location, address wallet, uint8 status)",
] as const;

export const CAT_NFT_ABI = [
  "function claimFamilyPortrait() external",
  "function hasClaimedFamilyPortrait(address) view returns (bool)",
  // StarterCat 相关 — 这两个函数在 CatNFT 合约里
  "function hasClaimedStarterCat(address) view returns (bool)",
  "function starterCatOf(address) view returns (uint256)",
  // NFT 查询
  "function getUserCatTokenIds(address _user, uint256 _realCatId) view returns (uint256[3])",
  "function userCatStage(address, uint256) view returns (uint8)",
  "function nftInfo(uint256) view returns (uint8 nftType, uint256 linkedRealCatId, uint8 stage, uint8 season, uint32 seriesId, string tokenURIValue)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
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
  // 用户操作
  "function applyAdoption(uint256 _catId) external",
  "function payDeposit(uint256 _catId) external payable",
  "function cancelAdoption(uint256 _catId) external",
  "function forceWithdraw(uint256 _catId) external",
  // 机构操作
  "function approveApplication(uint256 _catId) external",
  "function rejectApplication(uint256 _catId) external",
  "function confirmReturn(uint256 _catId, bool _healthy) external",
  // Owner 操作
  "function confirmVisit(uint256 _catId, bool _passed) external",
  // 查询
  "function getApplication(uint256 _catId) view returns (tuple(address applicant, uint256 catId, uint256 depositAmount, uint256 depositTimestamp, uint256 cancelTimestamp, uint8 status))",
  "function adoptionDepositAmount() view returns (uint256)",
  "function remainingLockTime(uint256 _catId) view returns (uint256)",
  "function lockPeriod() view returns (uint256)",
  "function returnConfirmPeriod() view returns (uint256)",
] as const;

export const GAME_CONTRACT_ABI = [
  // 新用户（claimStarterCat 在 GameContract，hasClaimedStarterCat 在 CatNFT）
  "function claimStarterCat(uint256 _realCatId) external",
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
