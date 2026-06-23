'use client';

import { useState } from 'react';
import { ArrowLeft, Save, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updatePageAction } from '@/lib/db/social-page-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export function PageAdminClient({ pageData }: { pageData: any }) {
  const [name, setName] = useState(pageData.name || '');
  const [description, setDescription] = useState(pageData.description || '');
  const [category, setCategory] = useState(pageData.category || '');
  const [website, setWebsite] = useState(pageData.website || '');
  const [email, setEmail] = useState(pageData.email || '');
  const [phone, setPhone] = useState(pageData.phone || '');
  const [address, setAddress] = useState(pageData.address || '');
  const [avatarUrl, setAvatarUrl] = useState(pageData.avatarUrl || '');
  const [coverUrl, setCoverUrl] = useState(pageData.coverUrl || '');
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updatePageAction(pageData.id, {
        name,
        description,
        category,
        website,
        email,
        phone,
        address,
        avatarUrl,
        coverUrl
      });
      showToast('Cập nhật trang thành công', 'success');
      router.refresh();
    } catch (e: any) {
      showToast(e.message || 'Lỗi cập nhật trang', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    showToast('Tính năng xóa trang đang được phát triển', 'error');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Link href={`/pages/${pageData.id}`} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Cài đặt Trang: {pageData.name}</h1>
      </div>

      <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
        <h2 className="text-lg font-bold text-white/90 border-b border-white/5 pb-2">Thông tin hiển thị</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Tên trang</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Danh mục / Thể loại</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/60">Mô tả (Bio)</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-white/5 border-white/10 text-white resize-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Ảnh đại diện URL</label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Ảnh bìa URL</label>
            <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
      </div>

      <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
        <h2 className="text-lg font-bold text-white/90 border-b border-white/5 pb-2">Thông tin liên hệ</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Email liên hệ</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Số điện thoại</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Trang web</label>
            <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/60">Địa chỉ</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button onClick={handleUpdate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">
          <Save className="h-4 w-4 mr-2" /> {loading ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
        </Button>
        <Button onClick={handleDelete} variant="destructive" disabled={loading} className="font-bold ml-auto bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20">
          <Trash className="h-4 w-4 mr-2" /> Xóa Trang
        </Button>
      </div>
    </div>
  );
}
