import { useAccount } from 'wagmi';
import SafeTxDemo from './components/SafeTxDemo';

function App() {
  const { isConnected } = useAccount();

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: 40, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, maxWidth: 800, margin: '0 auto 40px' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Safe Demo App</h1>
        {/* Web3Modal 的连接按钮组件 */}
        <appkit-button />
      </header>

      <main>
        {isConnected ? (
          <SafeTxDemo />
        ) : (
          <div style={{ textAlign: 'center', marginTop: 100, color: '#666' }}>
            请先连接钱包以开始 Demo
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
