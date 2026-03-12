import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { hashSafeMessage } from '@safe-global/protocol-kit';
// import { SigningMethod } from '@safe-global/sdk-types-kit'
import { parseEther } from 'viem'; // 补充引入 parseEther
import { getSafeKits, SAFE_ADDRESS } from '../lib/safe';
import { OperationType } from '@safe-global/safe-core-sdk-types';
import { hashTypedData, type TypedDataDomain } from 'viem';

// --- 辅助组件：签名进度展示 ---
const SignatureStatus = ({ 
  owners, 
  threshold, 
  confirmations = [], 
  currentAddress 
}: { 
  owners: string[], 
  threshold: number, 
  confirmations: any[], 
  currentAddress?: string 
}) => {
  // 归一化地址 (转小写) 以便比较
  const signedOwners = new Set(confirmations.map((c: any) => c.owner.toLowerCase()));
  const currentCount = signedOwners.size;
  const progress = Math.min((currentCount / threshold) * 100, 100);
  const isExecuted = currentCount >= threshold; // 简化逻辑，实际执行状态需看 tx 状态

  return (
    <div style={{ marginTop: 12, padding: 12, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
      {/* 进度条头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: '#444' }}>签名进度</span>
        <span style={{ fontWeight: 600, color: isExecuted ? '#2e7d32' : '#f57c00' }}>
          {currentCount} / {threshold} 
          {isExecuted ? ' (已达标)' : ' (等待中)'}
        </span>
      </div>

      {/* 进度条 */}
      <div style={{ height: 6, width: '100%', background: '#e0e0e0', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          width: `${progress}%`, 
          background: isExecuted ? '#4caf50' : '#ff9800', 
          transition: 'width 0.3s ease' 
        }} />
      </div>

      {/* Owner 列表详情 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {owners.map((owner) => {
          const hasSigned = signedOwners.has(owner.toLowerCase());
          const isMe = currentAddress && owner.toLowerCase() === currentAddress.toLowerCase();
          
          return (
            <div key={owner} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: 12, 
              padding: '4px 8px', 
              borderRadius: 4,
              background: isMe ? '#e3f2fd' : 'transparent',
              border: isMe ? '1px solid #bbdefb' : 'none'
            }}>
              <span style={{ marginRight: 8, fontSize: 14 }}>
                {hasSigned ? '✅' : '⏳'}
              </span>
              <span style={{ fontFamily: 'monospace', color: hasSigned ? '#333' : '#888', flex: 1 }}>
                {owner.slice(0, 6)}...{owner.slice(-4)}
                {isMe && <span style={{ marginLeft: 6, color: '#1976d2', fontWeight: 'bold' }}>(我)</span>}
              </span>
              {hasSigned && <span style={{ fontSize: 10, color: '#4caf50', fontWeight: 500 }}>已签署</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function SafeTxDemo() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  // --- Safe 基础信息 ---
  const [safeInfo, setSafeInfo] = useState<{ owners: string[], threshold: number } | null>(null);

  // 模式切换: 'transfer' | 'message'
  const [activeTab, setActiveTab] = useState<'transfer' | 'message'>('transfer');

  // --- 转账相关状态 ---
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [safeTxHash, setSafeTxHash] = useState('');
  const [txDetails, setTxDetails] = useState<any>(null);
  
  // --- 消息签名相关状态 ---
  const [messageContent, setMessageContent] = useState('Safe Demo 固定消息');
  const [messageHash, setMessageHash] = useState(''); 
  const [messageDetails, setMessageDetails] = useState<any>(null); 
  
  // --- 公共状态 ---
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 🟢 初始化：获取 Safe 的 Owners 和 Threshold
  useEffect(() => {
    const initSafeInfo = async () => {
      if (!walletClient) return;
      try {
        const { protocolKit } = await getSafeKits(chainId, walletClient);
        const owners = await protocolKit.getOwners();
        const threshold = await protocolKit.getThreshold();
        setSafeInfo({ owners, threshold });
      } catch (e) {
        console.error("无法加载 Safe 信息", e);
      }
    };
    initSafeInfo();
  }, [walletClient, chainId]);

  // =========================
  // 功能 1: 转账 (Transaction)
  // =========================
  
  const handlePropose = async () => {
    // 1. 基础检查
    if (!walletClient || !address) {
        console.error("Wallet not connected");
        setStatus('❌ 钱包未连接');
        return;
    }

    // 2. 安全检查：确保当前连接的确实是 Safe 地址
    // (防止用户意外用普通钱包连接，导致直接把钱转出去了)
    if (address.toLowerCase() !== SAFE_ADDRESS.toLowerCase()) {
        setStatus(`❌ 模式错误：请使用 Safe 钱包 (WalletConnect) 连接。\n当前连接: ${address}\n目标 Safe: ${SAFE_ADDRESS}`);
        return;
    }

    setIsLoading(true);
    setStatus('🚀 正在通过 Safe 钱包发起交易请求...');
    setTxDetails(null);

    try {
        console.log("Mode: Safe Wallet Direct Transaction");

        // ============================================================
        // 🔥 核心逻辑：直接发送交易
        // ============================================================
        // 当你通过 WalletConnect 连接 Safe 时，发送 eth_sendTransaction
        // 会被 Safe 的 Relay 服务拦截，并自动在 Safe 后台生成一个提案。
        const hash = await walletClient.sendTransaction({
            account: address, // 发起方是 Safe 自己
            to: to,           // 接收方
            value: parseEther(amount || '0'), // 金额
            data: '0x',       // 普通转账数据为空
            chain: null       //通常不需要指定 chain，WalletConnect 会自动处理
        });

        console.log("Transaction Request ID:", hash);

        // ============================================================
        // ✅ 成功反馈
        // ============================================================
        setStatus(`✅ 交易请求已发送！\n\n请立即打开 Safe 手机 App (或网页版)\n在 "Transactions" 列表中确认并执行。\n\n请求 ID: ${hash}`);
        
        setSafeTxHash(hash);
        if (handleCheckStatus) {
            handleCheckStatus(hash);
        }

    } catch (err: any) {
        console.error("Transaction Error:", err);
        
        // 错误处理优化
        let errorMessage = err?.message || 'Unknown error';
        if (errorMessage.includes('User rejected')) {
            errorMessage = '用户在钱包端取消了操作';
        }
        
        setStatus(`❌ 发送失败: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
};

  const handleCheckStatus = async (hashToCheck?: string) => {
    const targetHash = hashToCheck || safeTxHash;
    if (!targetHash || !walletClient) return;
    
    setIsLoading(true);
    try {
      const { apiKit } = await getSafeKits(chainId, walletClient);
      const details = await apiKit.getTransaction(targetHash);
      setTxDetails(details);
      setStatus(`✅ 交易状态已更新`);
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ 查询失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleConfirm = async () => {
  //   if (!safeTxHash || !walletClient) return;
  //   setIsLoading(true);
  //   setStatus('正在准备签名...');

  //   try {
  //     const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);

  //     setStatus('请在钱包中签名确认...');
  //     const signature = await protocolKit.signHash(safeTxHash);

  //     setStatus('正在上传签名...');
  //     await apiKit.confirmTransaction(safeTxHash, signature.data);

  //     setStatus('✅ Confirm 成功! 签名已上传。');
  //     handleCheckStatus();
  //   } catch (err: any) {
  //     console.error(err);
  //     setStatus(`❌ Confirm 失败: ${err.message}`);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const handleExecute = async () => {
  //   if (!safeTxHash || !walletClient) return;
  //   setIsLoading(true);
  //   setStatus('正在准备执行...');

  //   try {
  //     const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);
  //     const safeTransaction = await apiKit.getTransaction(safeTxHash);

  //     if ((safeTransaction.confirmations?.length || 0) < safeTransaction.confirmationsRequired) {
  //       throw new Error(`签名不足: 当前 ${safeTransaction.confirmations?.length}, 需要 ${safeTransaction.confirmationsRequired}`);
  //     }

  //     setStatus('正在提交上链 (需要 Gas)...');
  //     const executeTxResponse = await protocolKit.executeTransaction(safeTransaction);
      
  //     setStatus(`🚀 交易已发送!\nTx Hash: ${executeTxResponse.hash}\n等待上链...`);
  //     handleCheckStatus();
  //   } catch (err: any) {
  //     console.error(err);
  //     setStatus(`❌ Execute 失败: ${err.message}`);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // =========================
  // 功能 2: 消息签名 (Message)
  // =========================

  const handleSignMessage = async () => {
    if (!walletClient || !address) return;

    setIsLoading(true);
    setStatus('正在准备...');

    try {
        const { apiKit, protocolKit } = await getSafeKits(chainId, walletClient);
        const safeAddress = await protocolKit.getAddress();
        const chainIdNum = Number(chainId);

        // ==========================================
        // 1. 定义业务数据 (内层)
        // ==========================================
        const domain: TypedDataDomain = {
            name: 'Safe Login', 
            version: '1',
            chainId: chainIdNum,
            verifyingContract: safeAddress as `0x${string}`,
        };

        const types = {
            LoginRequest: [
                { name: 'content', type: 'string' },
                { name: 'timestamp', type: 'uint256' }
            ]
        };

        const message = {
            content: messageContent,
            timestamp: BigInt(Date.now())
        };

        // ==========================================
        // 2. 计算内层 Hash (用于签名和上传)
        // ==========================================
        const innerHash = hashTypedData({
            domain,
            types,
            primaryType: 'LoginRequest',
            message
        });
        console.log("🔹 内层 Hash (业务数据):", innerHash);

        // ==========================================
        // 3. 计算外层 Hash (Safe ID) - 关键步骤！
        // ==========================================
        // 手动模拟 SafeMessage 包装过程，确保 ID 绝对正确
        const safeMessageHash = hashTypedData({
            domain: { 
                chainId: chainIdNum, 
                verifyingContract: safeAddress as `0x${string}` 
            },
            types: { 
                SafeMessage: [{ name: 'message', type: 'bytes' }] 
            },
            primaryType: 'SafeMessage',
            message: { message: innerHash } // 把内层 Hash 放进去
        });
        
        console.log("🔶 外层 Hash (Safe ID):", safeMessageHash);
        
        // 🔥 核心动作：更新状态变量，供外部使用
        setMessageHash(safeMessageHash); 

        // ==========================================
        // 4. 签名 (签内层)
        // ==========================================
        console.log("✍️ 请求签名...");
        setStatus('请在钱包中签名...');
        
        const signature = await walletClient.signTypedData({
            account: address as `0x${string}`,
            domain,
            types,
            primaryType: 'LoginRequest',
            message
        });

        console.log("signature", signature)

        // ==========================================
        // 5. 上传 (传内层 Hash)
        // ==========================================
        console.log("☁️ 上传签名...");
        await apiKit.addMessage(safeAddress, {
            message: innerHash, 
            signature: signature
        });

        console.log("✅ 上传成功！");
        setStatus('签名已上传，Hash 已更新');

        // 可选：上传后立即查一次，确认状态
        // const result = await apiKit.getMessage(safeMessageHash);
        // console.log("🎉 当前状态:", result);

    } catch (err: any) {
        console.error("❌ 错误:", err);
        setStatus(`失败: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
}


  const handleCheckMessage = async (hashToCheck?: string) => {
    console.log("messageHash", messageHash)
      const targetHash = hashToCheck || messageHash;
      if (!targetHash || !walletClient) return;

      setIsLoading(true);
      try {
          const { apiKit } = await getSafeKits(chainId, walletClient);
          const message = await apiKit.getMessage(targetHash);
          setMessageDetails(message);
          setStatus(`✅ 消息状态已更新`);
      } catch (err: any) {
          console.error(err);
          setStatus(`❌ 查询消息失败: ${err.message}`);
          setMessageDetails(null);
      } finally {
          setIsLoading(false);
      }
  };

  // =========================
  // 渲染 UI
  // =========================

  if (!isConnected) {
    return <div style={{textAlign: 'center', marginTop: 40, color: '#666'}}>请先连接钱包</div>;
  }

  return (
    <div style={{ 
      padding: 24, 
      background: '#fff', 
      borderRadius: 16, 
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      maxWidth: 520,
      margin: '40px auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* 🟢 Safe 概览卡片 */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        color: 'white', 
        padding: 16, 
        borderRadius: 12, 
        marginBottom: 24 
      }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Safe Wallet</div>
        <div style={{ fontFamily: 'monospace', fontSize: 14, marginBottom: 12 }}>{SAFE_ADDRESS}</div>
        
        <div style={{ display: 'flex', gap: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Owners</div>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>{safeInfo?.owners.length || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Threshold</div>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>{safeInfo?.threshold || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Network</div>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>{chainId}</div>
          </div>
        </div>
      </div>

      {/* 顶部切换 Tab */}
      <div style={{ display: 'flex', marginBottom: 24, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
        {['transfer', 'message'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab as any); setStatus(''); setTxDetails(null); setMessageDetails(null); }}
            style={{
              flex: 1,
              padding: '8px',
              background: activeTab === tab ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: 6,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#0f172a' : '#64748b',
              boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'transfer' ? '💰 转账交易' : '📝 消息签名'}
          </button>
        ))}
      </div>

      {/* 面板 1: 转账 */}
      {activeTab === 'transfer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: '#334155'}}>接收地址</label>
            <input
              type="text"
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: '#334155'}}>金额 (ETH)</label>
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            onClick={handlePropose} 
            disabled={isLoading || !to || !amount}
            style={{ padding: 12, background: '#0f172a', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            发起转账
          </button>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{display: 'flex', gap: 8, marginBottom: 12}}>
               <input 
                  type="text" 
                  value={safeTxHash}
                  onChange={(e) => setSafeTxHash(e.target.value)}
                  placeholder="输入 SafeTxHash..."
                  style={{flex: 1, padding: '8px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1'}}
               />
               <button 
                  onClick={() => handleCheckStatus()}
                  disabled={!safeTxHash}
                  style={{padding: '0 16px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 500}}
               >
                  查询
               </button>
            </div>

            {/* 🌟 交易 - 签名状态组件 */}
            {txDetails && safeInfo && (
              <SignatureStatus 
                owners={safeInfo.owners}
                threshold={safeInfo.threshold}
                confirmations={txDetails.confirmations}
                currentAddress={address}
              />
            )}

            {/* <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button 
                onClick={handleConfirm}
                disabled={isLoading || !safeTxHash}
                style={{ flex: 1, padding: 10, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
              >
                确认 (Confirm)
              </button>
              <button 
                onClick={handleExecute}
                disabled={isLoading || !safeTxHash}
                style={{ flex: 1, padding: 10, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
              >
                执行 (Execute)
              </button>
            </div> */}
          </div>
        </div>
      )}

      {/* 面板 2: 消息签名 */}
      {activeTab === 'message' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: '#334155'}}>消息内容</label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            onClick={handleSignMessage} 
            disabled={!messageContent}
            style={{ padding: 12, background: '#7c3aed', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            发起签名 (Sign)
          </button>

           <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{display: 'flex', gap: 8, marginBottom: 12}}>
               <input 
                  type="text" 
                  value={messageHash}
                  onChange={(e) => setMessageHash(e.target.value)}
                  placeholder="输入 Message Hash..."
                  style={{flex: 1, padding: '8px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1'}}
               />
               <button 
                  onClick={() => handleCheckMessage()}
                  disabled={!messageHash}
                  style={{padding: '0 16px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 500}}
               >
                  查询
               </button>
            </div>

            {/* 🌟 消息 - 签名状态组件 */}
            {messageDetails && safeInfo && (
              <SignatureStatus 
                owners={safeInfo.owners}
                threshold={safeInfo.threshold}
                confirmations={messageDetails.confirmations}
                currentAddress={address}
              />
            )}
          </div>
        </div>
      )}

      {/* 状态日志 */}
      {status && (
        <div style={{ 
          marginTop: 24, 
          padding: 12, 
          background: status.startsWith('❌') ? '#fef2f2' : '#f0fdf4', 
          borderRadius: 8, 
          fontSize: 13, 
          whiteSpace: 'pre-wrap',
          color: status.startsWith('❌') ? '#991b1b' : '#166534',
          border: `1px solid ${status.startsWith('❌') ? '#fecaca' : '#bbf7d0'}`
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
