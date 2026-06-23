'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSchedule } from '../../../actions';
import { Share2, Clock, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateScheduleForm({ teamId }: { teamId: string }) {
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['isocial']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const PLATFORMS = [
    { id: 'isocial', name: 'iSocial Feed', icon: '🌟' },
    { id: 'facebook', name: 'Facebook Page', icon: '📘' },
    { id: 'zalo', name: 'Zalo OA', icon: '💬' }
  ];

  const handleTogglePlatform = (id: string) => {
    if (targetPlatforms.includes(id)) {
      setTargetPlatforms(targetPlatforms.filter(p => p !== id));
    } else {
      setTargetPlatforms([...targetPlatforms, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createSchedule({
      content,
      scheduledAt,
      targetPlatforms
    });

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setContent('');
      setScheduledAt('');
      setTargetPlatforms(['isocial']);
      setIsSubmitting(false);
      router.refresh();
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5 text-pink-500" />
          <span>Tạo bài viết mới</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Nội dung bài viết</label>
            <Textarea 
              placeholder="Bạn muốn chia sẻ điều gì?" 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
              required
            />
          </div>

          <div className="flex gap-4 border-t pt-4">
            <Button type="button" variant="outline" className="text-gray-500 gap-2">
              <ImageIcon className="h-4 w-4" />
              Thêm Ảnh/Video
            </Button>
            
            <div className="flex items-center gap-2 border rounded-md px-3 bg-gray-50 relative flex-1 max-w-[250px]">
              <Clock className="h-4 w-4 text-gray-500" />
              <Input 
                type="datetime-local" 
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-sm h-9"
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <label className="text-sm font-medium text-gray-700 block">Đăng chéo (Cross-post) lên</label>
            <div className="flex gap-3 flex-wrap">
              {PLATFORMS.map((platform) => {
                const isSelected = targetPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handleTogglePlatform(platform.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all ${
                      isSelected 
                        ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium' 
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{platform.icon}</span>
                    <span>{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-pink-500 to-rose-400 text-white min-w-[120px]"
              disabled={isSubmitting || targetPlatforms.length === 0}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
              ) : (
                'Lên lịch đăng'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
