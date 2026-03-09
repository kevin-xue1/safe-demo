import React, { useState } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import  { hashSafeMessage } from '@safe-global/protocol-kit'

import { hashTypedData, keccak256, toBytes, stringToBytes } from 'viem';

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
  const [txDetails, setTxDetails] = useState<any>(null);
  
  // --- 消息签名相关状态 ---
  const [messageContent, setMessageContent] = useState('Safe Demo 固定消息');
  const [messageHash, setMessageHash] = useState(''); // 存储消息的 Hash
  const [messageDetails, setMessageDetails] = useState<any>(null); // 存储消息详情
  
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
    setTxDetails(null);

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
      handleCheckStatus(txHash);

    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Propose 失败: ${err.message}`);
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
      setStatus(`✅ 状态已更新 (Hash: ${targetHash.slice(0, 6)}...)`);
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ 查询失败: ${err.message}`);
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
      handleCheckStatus();
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
      handleCheckStatus();
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

  // 2.1 创建/发起消息签名 (EIP-712)
  const handleSignMessage = async () => {
    if (!walletClient || !messageContent) return;

    setIsLoading(true);
    setStatus('正在准备...');

    try {
        const { protocolKit, apiKit } = await getSafeKits(chainId, walletClient);
        const safeAddress = await protocolKit.getAddress();

 


       

        const messageHash = hashSafeMessage(messageContent)
        const safeMessageHash = await protocolKit.getSafeMessageHash(messageHash)

        setMessageHash(safeMessageHash);

        // ============================================================
        // SDK 签名流程 (保持不变)
        // ============================================================

        const safeMessage = protocolKit.createMessage(messageContent);
        
        setStatus('请在钱包中签名 (EIP-712)...');
        const signedMessage = await protocolKit.signMessage(safeMessage);

        setStatus('正在上传签名到 Safe 后台...');
        
        const response = await apiKit.addMessage(safeAddress, {
            message: messageContent,
            signature: signedMessage.encodedSignatures()
        });

        const isValid = await protocolKit.isValidSignature(messageHash, signedMessage.encodedSignatures())




        console.log('isValid',isValid)

        

      

        setStatus(`✅ 成功！消息已签名并上传。\nMessage Hash: ${safeMessageHash}`);


       
        
        handleCheckMessage(safeMessageHash);

    } catch (err: any) {
        console.error("❌ 签名流程出错:", err);
        setStatus(`❌ 出错: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
};

  // 2.2 查询消息状态
  const handleCheckMessage = async (hashToCheck?: string) => {
      const targetHash = hashToCheck || messageHash;
      if (!targetHash || !walletClient) return;

      setIsLoading(true);
      try {
          const { apiKit,protocolKit } = await getSafeKits(chainId, walletClient);
          
          // 获取消息详情
          const message = await apiKit.getMessage(targetHash);
          console.log("消息详情:", message);
          
          setMessageDetails(message);


            // A. 获取 Safe 配置信息 (总人数、门槛)
         const owners = await protocolKit.getOwners(); // string[] 所有拥有者地址
         const threshold = await protocolKit.getThreshold(); // number 需要多少人签
 
         // B. 从 API 获取该消息的详细信息 (包含已签名的列表)
         // safeMessageHash 是消息的唯一标识
        //  const messageDetails = await apiKit.getMessage(safeMessageHash);
         
         // C. 提取已签名数量
         // confirmations 数组里是所有已经签过名的人
         const currentSignatures = message.confirmations.length;
         const signedOwners = message.confirmations.map(c => c.owner);
 
         // 打印结果
         console.log('-----------------------------------');
         console.log(`📊 签名进度: ${currentSignatures} / ${threshold}`);
         console.log(`👥 总拥有者: ${owners.length} 人`);
         console.log(`📝 已签名名单:`, signedOwners);
         console.log('-----------------------------------');
 
         // 验证当前签名是否足够 (可选)
         if (currentSignatures >= threshold) {
             setStatus(`✅ 签名已完成！(${currentSignatures}/${threshold})\nHash: ${targetHash}`);
         } else {
             setStatus(`✅ 签名成功！等待其他人签名 (${currentSignatures}/${threshold})\nHash: ${targetHash}`);
         }
        

          setStatus(`✅ 消息状态已更新`);
      } catch (err: any) {
          console.error(err);
          setStatus(`❌ 查询消息失败: ${err.message}\n(可能该 Hash 不存在)`);
          setMessageDetails(null);
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
          onClick={() => { setActiveTab('transfer'); setStatus(''); setTxDetails(null); }}
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

          {/* 交易操作区域 */}
          <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
               <input 
                  type="text" 
                  value={safeTxHash}
                  onChange={(e) => setSafeTxHash(e.target.value)}
                  placeholder="输入 SafeTxHash 查询..."
                  style={{flex: 1, padding: 6, fontSize: 12, borderRadius: 4, border: '1px solid #ccc'}}
               />
               <button 
                  onClick={() => handleCheckStatus()}
                  disabled={!safeTxHash || isLoading}
                  style={{padding: '6px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12}}
               >
                  🔍 查询
               </button>
            </div>

            {/* 交易详情卡片 */}
            {txDetails && (
              <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #dee2e6', marginBottom: 12, fontSize: 12 }}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                  <span style={{color: '#666'}}>状态:</span>
                  <span style={{fontWeight: 'bold', color: txDetails.isExecuted ? 'green' : '#f59e0b'}}>
                    {txDetails.isExecuted ? '✅ 已执行' : '⏳ 等待中'}
                  </span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                  <span style={{color: '#666'}}>签名:</span>
                  <span style={{fontWeight: 'bold'}}>
                    {txDetails.confirmations?.length || 0} / {txDetails.confirmationsRequired}
                  </span>
                </div>
                
                {/* 已签名者列表 */}
                <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px dashed #eee'}}>
                  <div style={{color: '#666', marginBottom: 4}}>已签名 Owner:</div>
                  {txDetails.confirmations?.map((c: any, idx: number) => (
                    <div key={idx} style={{fontFamily: 'monospace', color: '#333', fontSize: 10}}>
                      • {c.owner.slice(0, 6)}...{c.owner.slice(-4)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={handleConfirm}
                disabled={isLoading || !safeTxHash}
                style={{ flex: 1, padding: 8, background: '#2196F3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                2. 确认 (Confirm)
              </button>
              <button 
                onClick={handleExecute}
                disabled={isLoading || !safeTxHash}
                style={{ flex: 1, padding: 8, background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                3. 执行 (Execute)
              </button>
            </div>
          </div>
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
            1. 发起签名 (Create)
          </button>

           {/* 消息操作区域 */}
           <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
               <input 
                  type="text" 
                  value={messageHash}
                  onChange={(e) => setMessageHash(e.target.value)}
                  placeholder="输入 Message Hash 查询..."
                  style={{flex: 1, padding: 6, fontSize: 12, borderRadius: 4, border: '1px solid #ccc'}}
               />
               <button 
                  onClick={() => handleCheckMessage()}
                  disabled={!messageHash || isLoading}
                  style={{padding: '6px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12}}
               >
                  🔍 查询
               </button>
            </div>

            {/* 消息详情卡片 */}
            {messageDetails && (
              <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #dee2e6', marginBottom: 12, fontSize: 12 }}>
                <div style={{marginBottom: 8, wordBreak: 'break-all'}}>
                  <span style={{color: '#666'}}>内容: </span>
                  <b>{typeof messageDetails.message === 'string' ? messageDetails.message : JSON.stringify(messageDetails.message)}</b>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                  <span style={{color: '#666'}}>签名进度:</span>
                  <span style={{fontWeight: 'bold'}}>
                    {messageDetails.confirmations?.length || 0} / {messageDetails.confirmationsRequired}
                  </span>
                </div>
                
                {/* 已签名者列表 */}
                <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px dashed #eee'}}>
                  <div style={{color: '#666', marginBottom: 4}}>已签名 Owner:</div>
                  {messageDetails.confirmations?.map((c: any, idx: number) => (
                    <div key={idx} style={{fontFamily: 'monospace', color: '#333', fontSize: 10}}>
                      • {c.owner.slice(0, 6)}...{c.owner.slice(-4)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            * 消息签名仅在链下聚合，不消耗 Gas，不执行上链。
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
