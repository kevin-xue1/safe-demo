import { useState } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { getSafeKits, SAFE_ADDRESS } from '../lib/safe';

export default function SafeTxDemo() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  // 表单状态
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  
  // 交易状态
  const [safeTxHash, setSafeTxHash] = useState(''); // 这一步生成的 Hash 用于后续 Confirm/Execute
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. 发起交易 (Propose)
  // 逻辑：构建交易 -> 签名 -> 上传到 Safe 服务端
  const handlePropose = async () => {
    if (!walletClient) return;
    setIsLoading(true);
    setStatus('正在初始化 Safe SDK...');

    try {
      const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);

      setStatus('正在构建交易...');
      const safeTransactionData = {
        to: to,
        value: parseEther(amount || '0').toString(), // 转换 ETH 为 Wei
        data: '0x', // 普通转账 data 为空
      };

      // 创建 Safe 交易对象
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [safeTransactionData],
      });

      // 计算交易哈希 (SafeTxHash)
      const txHash = await protocolKit.getTransactionHash(safeTransaction);
      setSafeTxHash(txHash);

      setStatus('请在钱包中签名...');
      // 对 Hash 进行签名 (Off-chain signature)
      const senderSignature = await protocolKit.signHash(txHash);

      setStatus('正在提交到 Safe API...');
      // 提交 Propose 请求
      await apiKit.proposeTransaction({
        safeAddress: SAFE_ADDRESS,
        safeTransactionData: safeTransaction.data,
        safeTxHash: txHash,
        senderAddress: address!,
        senderSignature: senderSignature.data,
        origin: 'Safe Demo App',
      });

      setStatus(`✅ 交易已 Propose!\nSafeTxHash: ${txHash}\n请通知其他 Owner 进行 Confirm。`);
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Propose 失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 确认交易 (Confirm)
  // 逻辑：其他 Owner 拿到 Hash -> 签名 -> 上传签名
  const handleConfirm = async () => {
    if (!safeTxHash || !walletClient) return;
    setIsLoading(true);
    setStatus('正在准备签名...');

    try {
      const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);

      setStatus('请在钱包中签名确认...');
      const signature = await protocolKit.signHash(safeTxHash);

      setStatus('正在上传签名...');
      await apiKit.confirmTransaction(safeTxHash, signature.data);

      setStatus('✅ Confirm 成功! 签名已上传。');
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Confirm 失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 执行交易 (Execute)
  // 逻辑：拉取所有签名 -> 检查门槛 -> 发送链上交易
  const handleExecute = async () => {
    if (!safeTxHash || !walletClient) return;
    setIsLoading(true);
    setStatus('正在准备执行...');

    try {
      const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);

      // 从 API 获取完整的交易详情（包含所有已收集的签名）
      const safeTransaction = await apiKit.getTransaction(safeTxHash);

      console.log('当前签名数:', safeTransaction.confirmations?.length);
      console.log('所需签名数:', safeTransaction.confirmationsRequired);

      if ((safeTransaction.confirmations?.length || 0) < safeTransaction.confirmationsRequired) {
        throw new Error(`签名不足: 当前 ${safeTransaction.confirmations?.length}, 需要 ${safeTransaction.confirmationsRequired}`);
      }

      setStatus('正在提交上链 (需要 Gas)...');
      
      // 执行交易 (这一步是真正的链上操作)
      const executeTxResponse = await protocolKit.executeTransaction(safeTransaction);
      
      setStatus(`🚀 交易已发送!\nTx Hash: ${executeTxResponse.hash}\n等待上链...`);

      // 等待交易确认 (可选)
      // await executeTxResponse.transactionResponse?.wait();
      // setStatus('🎉 交易已上链成功!');
      
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Execute 失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return <div style={{textAlign: 'center', marginTop: 20}}>请先连接钱包</div>;
  }

  return (
    <div style={{ 
      padding: 24, 
      background: '#fff', 
      borderRadius: 12, 
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      maxWidth: 500,
      margin: '0 auto'
    }}>
      <h2 style={{marginTop: 0}}>Safe 多签转账</h2>
      <div style={{fontSize: 12, color: '#666', marginBottom: 20}}>
        Safe 合约: {SAFE_ADDRESS}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="接收地址 (0x...)"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
        />
        <input
          type="number"
          placeholder="金额 (ETH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
        />
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button 
          onClick={handlePropose} 
          disabled={isLoading || !to || !amount}
          style={{ flex: 1, padding: 10, background: '#000', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
        >
          1. Propose
        </button>
      </div>

      {safeTxHash && (
        <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 20 }}>
          <p style={{fontSize: 12, fontWeight: 'bold'}}>当前交易 Hash:</p>
          <div style={{fontSize: 10, background: '#f5f5f5', padding: 8, borderRadius: 4, wordBreak: 'break-all'}}>
            {safeTxHash}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button 
              onClick={handleConfirm}
              disabled={isLoading}
              style={{ flex: 1, padding: 10, background: '#2196F3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              2. Confirm (其他 Owner)
            </button>
            <button 
              onClick={handleExecute}
              disabled={isLoading}
              style={{ flex: 1, padding: 10, background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              3. Execute (上链)
            </button>
          </div>
        </div>
      )}

      {status && (
        <div style={{ marginTop: 20, padding: 12, background: '#f9f9f9', borderRadius: 6, fontSize: 13, whiteSpace: 'pre-wrap' }}>
          {status}
        </div>
      )}
    </div>
  );
}
