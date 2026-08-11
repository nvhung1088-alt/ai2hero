'use client';

import { useState } from 'react';
import { Send, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

export default function OffPageSEOAdmin() {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/seo/indexing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, secret_key: secret })
      });
      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (error: any) {
      setResult({ status: 500, data: { error: error.message || 'Client fetch error' } });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Zap className="text-yellow-500" /> Google Indexing API
        </h1>
        <p className="text-gray-500">
          Module gửi yêu cầu thu thập dữ liệu tự động (Off-Page SEO) qua Google Indexing API. 
          Giúp bài viết mới xuất hiện trên kết quả tìm kiếm Google trong vài chục giây.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">URL cần lập chỉ mục (Index)</label>
            <input 
              type="url" 
              required
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://donghangtietkiem.com/bai-viet-moi"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Secret Key (Nếu có cấu hình)</label>
            <input 
              type="password" 
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nhập SEO_SECRET_KEY..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !url}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send size={18} />
            )}
            Push to Google Index
          </button>
        </form>
      </div>

      {result && (
        <div className={`p-4 rounded-xl border ${result.status === 200 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-start gap-3">
            {result.status === 200 ? <CheckCircle2 className="mt-0.5" /> : <AlertCircle className="mt-0.5" />}
            <div className="overflow-hidden">
              <h3 className="font-semibold mb-1">
                {result.status === 200 ? 'Thành công!' : 'Đã có lỗi xảy ra'}
              </h3>
              <p className="text-sm mb-3">
                {result.data?.message || result.data?.error || 'Xem chi tiết phản hồi từ Google bên dưới.'}
              </p>
              <pre className="bg-white/60 p-3 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
