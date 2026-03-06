import { useState } from 'react';
import { useAccount, useChainId, useSignTypedData } from 'wagmi';
import { AppKitButton } from '@reown/appkit/react';

// 固定消息内容（仅用于签名演示）
const EIP712_MESSAGE_CONTENT = 'Safe Demo 固定消息';

// 通用 EIP-712 格式：Safe 钱包仿真不支持 SafeMessage 类型，改用通用的 Message 类型以通过仿真
const EIP712_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
  ],
  Message: [{ name: 'message', type: 'string' }],
} as const;

const EIP712_DOMAIN_NAME = 'Safe Demo';
const EIP712_VERSION = '1';

function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [signature, setSignature] = useState<string>('');

  const { signTypedDataAsync, isPending: isSigning, error: signError } = useSignTypedData();

  const handleSignFixedMessage = async () => {
    try {
      const sig = await signTypedDataAsync({
        domain: {
          name: EIP712_DOMAIN_NAME,
          version: EIP712_VERSION,
          chainId: BigInt(chainId),
        },
        types: EIP712_TYPES,
        primaryType: 'Message',
        message: {
          message: EIP712_MESSAGE_CONTENT,
        },
      });
      setSignature(sig ?? '');
    } catch {
      // 错误由 signError 展示
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: 'auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 8 }}>Reown AppKit Demo</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>连接后可用下方按钮签名一条 EIP-712 固定消息</p>

      <div style={{ marginBottom: 24 }}>
        <AppKitButton />
      </div>

      {isConnected && (
        <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <p style={{ marginBottom: 8 }}>
            <strong>已连接：</strong> {address}
          </p>
          <p style={{ marginBottom: 12, fontSize: 14, color: '#555' }}>
            EIP-712 Message：&quot;{EIP712_MESSAGE_CONTENT}&quot;
          </p>
          <button
            type="button"
            onClick={handleSignFixedMessage}
            disabled={isSigning}
            style={{
              padding: '10px 20px',
              background: isSigning ? '#999' : '#12FF80',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: isSigning ? 'not-allowed' : 'pointer',
            }}
          >
            {isSigning ? '签名中...' : '签名固定消息 (EIP-712)'}
          </button>
          {signError && (
            <p style={{ marginTop: 12, color: '#c00', fontSize: 14 }}>{signError.message}</p>
          )}
          {signature && (
            <p style={{ marginTop: 12, fontSize: 14 }}>
              签名：<code style={{ wordBreak: 'break-all' }}>{signature}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
