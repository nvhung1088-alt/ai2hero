'use client';

import { useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Share2 } from 'lucide-react';
import { ImportContentModal } from '@/app/(social)/(main)/components/import-content-modal';

export default function HeroSocialSettings({ params }: { params: Promise<{ teamId: string }> }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const resolvedParams = use(params);

  // Chuyển teamId từ string sang number nếu cần
  const teamIdNum = parseInt(resolvedParams.teamId, 10);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cài đặt HeroSocial</h1>
          <p className="text-sm text-gray-400 mt-1">Quản lý cấu hình và kết nối đồng bộ cho Mạng xã hội nội bộ</p>
        </div>
      </div>

      <Card className="bg-gray-900/50 border-white/10 text-white animate-fade-up">
        <CardHeader>
          <CardTitle className="text-white">Đồng bộ Nội dung (Connect Hub)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl">
              <h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2">
                <RefreshCw className="h-5 w-5" /> Kéo bài viết từ Mạng xã hội
              </h3>
              <p className="text-sm text-blue-200/70 mb-5 leading-relaxed">
                Nhập (import) các bài viết mới nhất từ Fanpage Facebook của bạn vào hệ thống iSocial. 
                Bạn có thể quản lý và xem tất cả nội dung tập trung tại một nơi, giúp tiết kiệm thời gian vận hành.
              </p>
              <Button 
                onClick={() => setShowImportModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 font-bold"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Kéo Nội Dung Về
              </Button>
            </div>

            <div className="bg-pink-500/10 border border-pink-500/20 p-5 rounded-xl">
              <h3 className="font-bold text-pink-400 flex items-center gap-2 mb-2">
                <Share2 className="h-5 w-5" /> Up bài lên Mạng xã hội (Đăng chéo)
              </h3>
              <p className="text-sm text-pink-200/70 mb-4 leading-relaxed">
                Để đăng chéo một bài viết lên mạng xã hội khác (như Facebook Page, Facebook Group), 
                hãy sử dụng biểu tượng <b>Chia sẻ (Share)</b> trong phần đính kèm khi <b>Tạo bài viết mới</b> trên Bảng tin (Feed) iSocial.
              </p>
              <div className="p-4 bg-black/40 rounded-xl flex items-center gap-3 border border-white/5">
                <Share2 className="h-6 w-6 text-gray-500" />
                <span className="text-sm text-gray-400 italic">Tính năng chia sẻ đã được tích hợp sẵn ngoài Bảng tin.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ImportContentModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        teamId={teamIdNum} 
      />
    </div>
  );
}
