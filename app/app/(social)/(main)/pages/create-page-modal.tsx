'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPageAction } from '@/lib/db/social-page-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export function CreatePageModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [category, setCategory] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim() || !username.trim()) {
      showToast('Vui lòng nhập tên và tên định danh (username)', 'error');
      return;
    }

    // validate username: only a-z, 0-9, and dot/underscore
    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      showToast('Tên định danh chỉ chứa chữ, số, dấu chấm và gạch dưới', 'error');
      return;
    }

    setLoading(true);
    try {
      await createPageAction({ name, username, category });
      showToast('Tạo trang thành công!', 'success');
      onClose();
      // Reset form
      setName('');
      setUsername('');
      setCategory('');
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi tạo trang', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#161618] border border-white/10 text-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold">Tạo Trang mới</h2>
          <p className="text-white/40 text-sm mt-1">
            Trang là nơi để mọi người kết nối với doanh nghiệp, thương hiệu cá nhân hoặc tổ chức của bạn.
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Tên Trang *</Label>
            <Input 
              placeholder="VD: Cửa hàng Gốm Sứ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Tên định danh (username) *</Label>
            <Input 
              placeholder="VD: cuahang_gomsu"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black/20 border-white/10 text-white"
            />
            <p className="text-[10px] text-white/40">Đây sẽ là đường link trang của bạn: ai2hero.com/pages/username</p>
          </div>

          <div className="space-y-2">
            <Label>Hạng mục</Label>
            <Input 
              placeholder="VD: Bán lẻ, Công ty công nghệ..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-black/20 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={loading} className="bg-transparent border-white/10 hover:bg-white/5 text-white">
            Hủy
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? 'Đang tạo...' : 'Tạo Trang'}
          </Button>
        </div>
      </div>
    </div>
  );
}
