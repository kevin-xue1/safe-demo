import { ethers } from 'ethers'; // v5
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import type { WalletClient } from 'viem';

// 你的 Safe 钱包地址
export const SAFE_ADDRESS = '0x...'; 

const getTxServiceUrl = (chainId: number) => {
    switch (chainId) {
        case 1:
            return 'https://safe-transaction-mainnet.safe.global';
        case 11155111:
            return 'https://safe-transaction-sepolia.safe.global';
        case 56: // 👈 添加 BNB Chain (Chain ID 56)
            return 'https://safe-transaction-bsc.safe.global';
        default:
            // 默认回退，或者你可以抛出错误
            return 'https://safe-transaction-mainnet.safe.global';
    }
};

export async function getSafeKits(
  chainId: number,
  walletClient?: WalletClient
) {
  let provider;
  let signer;

  if (walletClient) {
    // ✅ Ethers v5 写法: providers.Web3Provider
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      provider = new ethers.providers.Web3Provider((window as any).ethereum);
      signer = provider.getSigner();
    }
  } else {
    // ✅ Ethers v5 写法: providers.JsonRpcProvider
    const RPC_URL = 'https://rpc.sepolia.org';
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  }

  // ✅ Safe v1.3.0 + Ethers v5 完美兼容
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer || provider,
  });

  const protocolKit = await Safe.create({
    ethAdapter,
    safeAddress: SAFE_ADDRESS,
  });

  const apiKit = new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl: getTxServiceUrl(chainId),
  });

  return { protocolKit, apiKit };
}
