import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import type { WalletClient } from 'viem';

// ✅ 你的真实 Safe 地址
export const SAFE_ADDRESS = '0x860dA3e57971cf0B6378Ac5eE8839D2221f8D0BF'; 

// 1. 辅助函数：获取 Safe 交易服务 API 地址
// 必须显式提供这个 URL，否则 SDK 会报错要求 apiKey
const getTxServiceUrl = (chainId: number) => {
    switch (chainId) {
        case 1: 
            return 'https://safe-transaction-mainnet.safe.global';
        case 11155111: 
            return 'https://safe-transaction-sepolia.safe.global';
        case 56: 
            return 'https://safe-transaction-bsc.safe.global';
        case 137:
            return 'https://safe-transaction-polygon.safe.global';
        default: 
            // 默认回退到 Sepolia，或者抛出错误
            return 'https://safe-transaction-sepolia.safe.global';
    }
};

// 2. 辅助函数：获取 RPC URL (用于无钱包时的只读模式)
const getRpcUrl = (chainId: number) => {
    switch (chainId) {
        case 1: return 'https://eth.llamarpc.com';
        case 11155111: return 'https://rpc.sepolia.org';
        case 56: return 'https://binance.llamarpc.com';
        default: return 'https://rpc.sepolia.org';
    }
};

export async function getSafeKits(
  chainId: number,
  walletClient?: WalletClient
) {
  let protocolKit;

  // ------------------------------------------------------
  // 3. 初始化 Protocol Kit (v6 写法)
  // ------------------------------------------------------
  if (walletClient && typeof window !== 'undefined' && (window as any).ethereum) {
    // ✅ 有钱包：直接传入 window.ethereum
    protocolKit = await Safe.init({
      provider: (window as any).ethereum, 
      signer: walletClient.account?.address, 
      safeAddress: SAFE_ADDRESS,
    });
  } else {
    // ✅ 无钱包：只读模式
    protocolKit = await Safe.init({
      provider: getRpcUrl(chainId),
      safeAddress: SAFE_ADDRESS,
    });
  }

  // ------------------------------------------------------
  // 4. 初始化 API Kit (v4 写法 - 关键修复)
  // ------------------------------------------------------
  const apiKit = new SafeApiKit({
    chainId: BigInt(chainId),
    // 🔥 关键：显式传入 URL，绕过 apiKey 检查
    txServiceUrl: getTxServiceUrl(chainId) 
  });

  return { protocolKit, apiKit };
}
