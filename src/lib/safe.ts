import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import type { WalletClient } from 'viem';

// ✅ 你的真实 Safe 地址
export const SAFE_ADDRESS = '0x860dA3e57971cf0B6378Ac5eE8839D2221f8D0BF'; 

// 1. 修正后的 API 地址：必须使用 api.safe.global 才能让 API Key 生效
const getTxServiceUrl = (chainId: number) => {
    switch (chainId) {
        case 1: 
            return 'https://api.safe.global';
        case 11155111: 
            // Sepolia 专用 API 路径
            return 'https://api.safe.global';
        case 56: 
            return 'https://api.safe.global';
        case 137:
            return 'https://api.safe.global';
        default: 
            return 'https://api.safe.global';
    }
};

// 2. 辅助函数：获取 RPC URL
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
    protocolKit = await Safe.init({
      provider: (window as any).ethereum, 
      signer: walletClient.account?.address, 
      safeAddress: SAFE_ADDRESS,
    });
  } else {
    protocolKit = await Safe.init({
      provider: getRpcUrl(chainId),
      safeAddress: SAFE_ADDRESS,
    });
  }

  // ------------------------------------------------------
  // 4. 初始化 API Kit (带 Key 修复版)
  // ------------------------------------------------------
  const apiKit = new SafeApiKit({
    chainId: BigInt(chainId),
    // txServiceUrl: getTxServiceUrl(chainId),
    // 注入你申请的 API Key
    apiKey: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzYWZlLWF1dGgtc2VydmljZSIsInN1YiI6ImQ5ZDA5MjFjOWFkNTQ4YjJhNjI3NzczNWQ4ZmE1OWViXzJhNjA0Mzg1ZDBjZTQ5M2E4MTAyMjRiOGMwZjFhMTdiIiwia2V5IjoiZDlkMDkyMWM5YWQ1NDhiMmE2Mjc3NzM1ZDhmYTU5ZWJfMmE2MDQzODVkMGNlNDkzYTgxMDIyNGI4YzBmMWExN2IiLCJhdWQiOlsic2FmZS1hdXRoLXNlcnZpY2UiXSwiZXhwIjoxOTMwNjIyNTA0LCJyb2xlcyI6W10sImRhdGEiOnt9fQ.V0JIgDKfTnUGmBkR0l6xuTfsdonnEMOADw7q_A055a7k2WSdCvGrzHeJNLjEhhTRqdLUjFatHXzvK1lgz92fiw',
  });

  return { protocolKit, apiKit };
}