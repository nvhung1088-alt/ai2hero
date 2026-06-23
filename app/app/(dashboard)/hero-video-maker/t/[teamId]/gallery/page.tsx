import { getFinishedVideoProjects } from '@/lib/db/video-maker-actions';
import { Play, Download, Calendar, Film } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default async function GalleryPage(props: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await props.params;
  const tid = parseInt(teamId, 10);
  
  const projects = await getFinishedVideoProjects(tid);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
            Thư viện Video đã tạo
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Danh sách các tác phẩm video đã được render hoàn chỉnh.
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-white/[0.05] bg-white/[0.01]">
            <Film size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-sm text-slate-400">Bạn chưa tạo thành công video nào.</p>
            <Link 
              href={`/hero-video-maker/t/${tid}/projects`} 
              className="text-pink-400 text-xs mt-2 inline-block hover:underline"
            >
              Vào danh sách dự án để tiếp tục làm video
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <Card key={proj.id} className="overflow-hidden border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03] transition-all group shadow-xl">
                <div className="relative aspect-video bg-black/50 overflow-hidden">
                  {proj.outputUrl ? (
                    <video 
                      src={proj.outputUrl} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      controls
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Film size={32} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wide border border-white/10">
                    Sẵn sàng
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 line-clamp-1">{proj.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{proj.intro || 'Không có mô tả'}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {new Date(proj.createdAt!).toLocaleDateString('vi-VN')}
                    </div>
                    
                    {proj.outputUrl && (
                      <a 
                        href={proj.outputUrl} 
                        download 
                        target="_blank"
                        className="flex items-center gap-1.5 text-pink-400 hover:text-pink-300 font-semibold transition-colors"
                      >
                        <Download size={14} />
                        Tải về
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
