import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
// 👇 1. 引入 bsc (BNB Smart Chain)
import { mainnet, sepolia, bsc } from '@reown/appkit/networks'
import { QueryClient } from '@tanstack/react-query'

// 1. 从 Cloud.reown.com 获取 projectId
const projectId = import.meta.env.VITE_PROJECT_ID ?? '1146540fcf3283a22224d2bceefdee4a';
export const queryClient = new QueryClient()

// 👇 2. 把 bsc 加入列表
export const networks = [mainnet, sepolia, bsc]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Safe Demo',
    description: 'Safe Demo App',
    url: 'http://localhost:5173', 
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  featuredWalletIds: [
    '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Safe (Safe{Wallet}) - 主推
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // MetaMask
  ],
})