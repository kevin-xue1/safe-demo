import { ethers } from 'ethers'; // v5
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import type { WalletClient } from 'viem';

// ✅ 你的真实 Safe 地址
export const SAFE_ADDRESS = '0xB3025aBA0b68CB840202C5B4ce875706fc7FFEe0'; 

const getTxServiceUrl = (chainId: number) => {
    switch (chainId) {
        case 1: return 'https://safe-transaction-mainnet.safe.global';
        case 11155111: return 'https://safe-transaction-sepolia.safe.global';
        case 56: return 'https://safe-transaction-bsc.safe.global';
        default: return 'https://safe-transaction-mainnet.safe.global';
    }
};

export async function getSafeKits(
  chainId: number,
  walletClient?: WalletClient
) {
  let provider;
  let signer;

  if (walletClient) {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      // 1. 初始化 Provider
      provider = new ethers.providers.Web3Provider((window as any).ethereum);

      // 2. 获取 Signer
      // 🔥【关键修复 1】显式传入当前钱包地址，避免 unknown account #0
      const currentAddress = walletClient.account?.address;
      signer = provider.getSigner(currentAddress);

      // 🔥【关键修复 2】直接覆盖方法来禁用 ENS，不要用 Proxy！
      // 这种方式最安全，不会破坏 signer 的内部逻辑
      signer.resolveName = async (name: string) => {
        if (name.startsWith('0x')) return name;
        return null; 
      };
      
      provider.resolveName = async (name: string) => {
        if (name.startsWith('0x')) return name;
        return null;
      };
    }
  } else {
    const RPC_URL = 'https://rpc.sepolia.org';
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  }

  // 3. 初始化适配器
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer || provider,
  });

  // 4. 初始化 Protocol Kit
  const protocolKit = await Safe.create({
    ethAdapter,
    safeAddress: SAFE_ADDRESS,
  });

  // 5. 初始化 API Kit
  const apiKit = new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl: getTxServiceUrl(chainId),
  });

  return { protocolKit, apiKit };
}
