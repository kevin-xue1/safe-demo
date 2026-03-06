import React, { useState } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { getSafeKits, SAFE_ADDRESS } from '../lib/safe';

export default function SafeTxDemo() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  // 模式切换: 'transfer' | 'message'
  const [activeTab, setActiveTab] = useState<'transfer' | 'message'>('transfer');

  // --- 转账相关状态 ---
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [safeTxHash, setSafeTxHash] = useState('');
  
  // --- 消息签名相关状态 ---
  const [messageContent, setMessageContent] = useState('Safe Demo 固定消息');
  
  // --- 公共状态 ---
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // =========================
  // 功能 1: 转账 (Transaction)
  // =========================
  
  const handlePropose = async () => {
    if (!walletClient) return;
    setIsLoading(true);
    setStatus('正在初始化 Safe SDK (转账模式)...');

    try {
      const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);

      setStatus('正在构建交易...');
      const safeTransactionData = {
        to: to,
        value: parseEther(amount || '0').toString(),
        data: '0x',
      };

      const safeTransaction = await protocolKit.createTransaction({
        transactions: [safeTransactionData],
      });

      const txHash = await protocolKit.getTransactionHash(safeTransaction);
      setSafeTxHash(txHash);

      setStatus('请在钱包中签名 (Sign Transaction Hash)...');
      // 这里 signHash 是好用的，继续保持
      const senderSignature = await protocolKit.signHash(txHash);

      setStatus('正在提交到 Safe API...');
      await apiKit.proposeTransaction({
        safeAddress: SAFE_ADDRESS,
        safeTransactionData: safeTransaction.data,
        safeTxHash: txHash,
        senderAddress: address!,
        senderSignature: senderSignature.data,
        origin: 'Safe Demo App',
      });

      setStatus(`✅ 转账提案已 Propose!\nSafeTxHash: ${txHash}\n请通知其他 Owner 进行 Confirm。`);
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Propose 失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleExecute = async () => {
    if (!safeTxHash || !walletClient) return;
    setIsLoading(true);
    setStatus('正在准备执行...');

    try {
      const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);
      const safeTransaction = await apiKit.getTransaction(safeTxHash);

      if ((safeTransaction.confirmations?.length || 0) < safeTransaction.confirmationsRequired) {
        throw new Error(`签名不足: 当前 ${safeTransaction.confirmations?.length}, 需要 ${safeTransaction.confirmationsRequired}`);
      }

      setStatus('正在提交上链 (需要 Gas)...');
      const executeTxResponse = await protocolKit.executeTransaction(safeTransaction);
      
      setStatus(`🚀 交易已发送!\nTx Hash: ${executeTxResponse.hash}\n等待上链...`);
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Execute 失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // 功能 2: 消息签名 (Message)
  // =========================

  const handleSignMessage = async () => {
    if (!walletClient) return;
    if (!messageContent) {
      alert('请输入消息内容');
      return;
    }
    
    setIsLoading(true);
    setStatus('正在初始化 Safe SDK (消息模式)...');

    try {
      // 1. 获取 API Kit (用于上传)
      const { apiKit } = await getSafeKits(chainId, walletClient);

      setStatus('请在钱包中签名 (Sign Message)...');
      
      // 🔥 使用 WalletClient 直接签名 (Personal Sign)
      const signature = await walletClient.signMessage({
        message: messageContent
      });

      console.log('Raw Signature:', signature);

      setStatus('正在上传签名到 Safe 服务端...');
      
      // 2. 上传到 Safe API
      await apiKit.addMessage(SAFE_ADDRESS, {
        message: messageContent,
        signature: signature,
      });

      setStatus(`✅ 消息签名成功！\n已上传到 Safe 后台 (Transactions -> Messages)。`);

    } catch (err: any) {
      console.error(err);
      setStatus(`❌ 消息签名失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // 渲染 UI
  // =========================

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
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h2 style={{marginTop: 0, marginBottom: 8}}>Safe 功能演示</h2>
      <div style={{fontSize: 12, color: '#666', marginBottom: 20, wordBreak: 'break-all'}}>
        Safe: {SAFE_ADDRESS}
      </div>

      {/* 顶部切换 Tab */}
      <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid #eee' }}>
        <button
          onClick={() => { setActiveTab('transfer'); setStatus(''); }}
          style={{
            flex: 1,
            padding: '10px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'transfer' ? '2px solid #000' : 'none',
            fontWeight: activeTab === 'transfer' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          💰 转账交易
        </button>
        <button
          onClick={() => { setActiveTab('message'); setStatus(''); }}
          style={{
            flex: 1,
            padding: '10px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'message' ? '2px solid #000' : 'none',
            fontWeight: activeTab === 'message' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          📝 消息签名
        </button>
      </div>

      {/* 面板 1: 转账 */}
      {activeTab === 'transfer' && (
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
          
          <button 
            onClick={handlePropose} 
            disabled={isLoading || !to || !amount}
            style={{ padding: 12, background: '#000', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', marginTop: 8 }}
          >
            1. 发起提案 (Propose)
          </button>

          {safeTxHash && (
            <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
              <p style={{fontSize: 12, fontWeight: 'bold', margin: '0 0 8px 0'}}>当前交易 Hash:</p>
              <div style={{fontSize: 10, wordBreak: 'break-all', color: '#0066cc', marginBottom: 12}}>
                {safeTxHash}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={handleConfirm}
                  disabled={isLoading}
                  style={{ flex: 1, padding: 8, background: '#2196F3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                  2. 确认 (Confirm)
                </button>
                <button 
                  onClick={handleExecute}
                  disabled={isLoading}
                  style={{ flex: 1, padding: 8, background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                  3. 执行 (Execute)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 面板 2: 消息签名 */}
      {activeTab === 'message' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            placeholder="请输入要签名的消息内容..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            rows={3}
            style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd', resize: 'vertical' }}
          />
          
          <button 
            onClick={handleSignMessage} 
            disabled={isLoading || !messageContent}
            style={{ padding: 12, background: '#673AB7', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', marginTop: 8 }}
          >
            ✍️ 签名并上传 (Sign Message)
          </button>
          
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            * 此操作不会消耗 Gas，仅生成 EIP-712 签名并上传到 Safe 服务端。
          </p>
        </div>
      )}

      {/* 状态显示区 */}
      {status && (
        <div style={{ 
          marginTop: 24, 
          padding: 12, 
          background: status.startsWith('❌') ? '#fff0f0' : '#f9f9f9', 
          borderRadius: 6, 
          fontSize: 13, 
          whiteSpace: 'pre-wrap',
          borderLeft: status.startsWith('❌') ? '4px solid #ff4d4f' : '4px solid #52c41a'
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
