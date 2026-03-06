import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc, base } from '@reown/appkit/networks';

const queryClient = new QueryClient();

const projectId = import.meta.env.VITE_PROJECT_ID ?? '1146540fcf3283a22224d2bceefdee4a';

const metadata = {
  name: 'Safe Demo',
  description: 'Reown AppKit + EIP-712 固定消息签名',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const networks: any = [bsc, base];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  featuredWalletIds: [
    '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Safe (Safe{Wallet}) - 主推
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // MetaMask
  ],
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
