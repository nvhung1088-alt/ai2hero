'use client';

import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, RefreshCcw, Plus, ExternalLink, Activity } from 'lucide-react';

export default function MarketplaceWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState(100000);

  const fetchWallet = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/marketplace/wallet');
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải ví:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleDeposit = async () => {
    try {
      setIsDepositing(true);
      
      // Lấy danh sách connections từ Connect Hub (Mock KiotViet/PayOS).
      // Trong thực tế sẽ gọi API GET /api/connect-hub/connections để cho người dùng chọn.
      // Tạm thời truyền connectionId dummy hoặc giả định. 
      // Nhưng để code này không lỗi 400 nếu connectionId là undefined, ta sẽ giả lập prompt
      const connId = prompt("Nhập ID kết nối (Connection ID) của PayOS/MoMo trong Connect Hub:", "1");
      if (!connId) return;

      const res = await fetch('/api/marketplace/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: depositAmount,
          connectionId: parseInt(connId, 10),
          paymentMethod: 'payos' // or 'momo'
        })
      });
      
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Lỗi: ' + (data.error || 'Không thể tạo link thanh toán'));
      }
    } catch (error) {
      alert('Lỗi kết nối');
    } finally {
      setIsDepositing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center animate-pulse">
        <Wallet className="h-8 w-8 text-orange-500 opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in p-2 lg:p-4">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Ví Giao Dịch</h1>
          <p className="text-gray-400 mt-2 text-sm">Quản lý dòng tiền, số dư và đối soát thanh toán.</p>
        </div>
        <button 
          onClick={fetchWallet}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Số Dư */}
        <div className="md:col-span-2 bg-gradient-to-br from-orange-500/20 via-orange-900/10 to-gray-900 border border-orange-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Wallet className="w-32 h-32" />
          </div>
          
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400/80 mb-2 block">
            Số Dư Khả Dụng
          </span>
          <div className="text-5xl font-black text-white tracking-tight">
            {new Intl.NumberFormat('vi-VN').format(wallet?.balance || 0)} <span className="text-2xl text-orange-400">{wallet?.currency || 'VND'}</span>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                className="w-32 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                min={10000}
                step={10000}
              />
              <button 
                onClick={handleDeposit}
                disabled={isDepositing}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {isDepositing ? 'Đang tạo...' : 'Nạp Tiền'}
              </button>
            </div>
            
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white font-bold text-sm rounded-xl hover:bg-white/10 transition-colors ml-auto">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              Rút Tiền
            </button>
          </div>
        </div>

        {/* Thống kê nhỏ */}
        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-5">
            <span className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><ArrowDownRight className="w-3 h-3 text-emerald-500" /> Tổng Nạp</span>
            <div className="text-xl font-bold text-white mt-1">0 ₫</div>
          </div>
          <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-5">
            <span className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><ArrowUpRight className="w-3 h-3 text-red-500" /> Tổng Rút</span>
            <div className="text-xl font-bold text-white mt-1">0 ₫</div>
          </div>
        </div>
      </div>

      {/* Lịch sử giao dịch */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold text-white">Lịch Sử Giao Dịch</h2>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm font-medium">
            Chưa có giao dịch nào phát sinh.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    tx.type === 'deposit' || tx.type === 'payment_received' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'payment_received' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white capitalize">
                      {tx.type.replace('_', ' ')}
                      {tx.referenceId && <span className="ml-2 text-xs font-normal text-gray-500">#{tx.referenceId}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-black ${tx.type === 'deposit' || tx.type === 'payment_received' ? 'text-emerald-400' : 'text-white'}`}>
                    {tx.type === 'deposit' || tx.type === 'payment_received' ? '+' : '-'} {new Intl.NumberFormat('vi-VN').format(tx.amount)} ₫
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider mt-1 text-gray-500 px-2 py-0.5 rounded-full bg-white/5 inline-block">
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
