'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, FolderOpen, RefreshCcw, StopCircle, Settings, Loader2 } from 'lucide-react';
import {
  forceScanCoccocProjectAction,
  getProjectTasksAction,
  retryTaskAction,
  stopTaskAction,
  openProjectFolderAction
} from '@/lib/db/hero-coccoc-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export default function ProjectTasksManager({ teamId, project, onEdit }: { teamId: number, project: any, onEdit: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    if (!project?.id) return;
    const res = await getProjectTasksAction(project.id, teamId);
    if (res.success && res.tasks) {
      setTasks(res.tasks);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000); // Auto-refresh every 3s
    return () => clearInterval(interval);
  }, [project?.id]);

  const handleForceScan = async () => {
    if (!project?.id) return;
    setLoading(true);
    const res = await forceScanCoccocProjectAction(project.id, teamId);
    if (res?.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Đã gửi lệnh quét ngay tới Worker!', 'success');
    }
    setLoading(false);
  };

  const handleOpenFolder = async () => {
    if (!project?.id) return;
    const res = await openProjectFolderAction(project.id, teamId);
    if (res?.error) showToast(res.error, 'error');
  };

  const handleRetry = async (taskId: number) => {
    const res = await retryTaskAction(taskId, teamId);
    if (res?.success) fetchTasks();
  };

  const handleStop = async (taskId: number) => {
    const res = await stopTaskAction(taskId, teamId);
    if (res?.success) fetchTasks();
  };

  if (!project) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="mt-4 text-lg font-semibold">Chưa chọn dự án</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Vui lòng chọn một dự án từ danh sách bên trái để xem tiến trình tải video và quản lý các tác vụ cào dữ liệu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            {project.name}
            {project.isActive ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
            )}
          </CardTitle>
          <CardDescription className="mt-1">Tiến trình tải video (Cập nhật tự động 3s)</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Settings className="w-4 h-4 mr-2" />
            Cấu hình
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenFolder} title="Mở thư mục trên máy tính">
            <FolderOpen className="w-4 h-4 mr-2" />
            Mở thư mục
          </Button>
          <Button size="sm" onClick={handleForceScan} disabled={loading || !project.isActive}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
            Quét Ngay
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0 max-h-[600px]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b border-white/10 text-gray-400 select-none bg-white/[0.01]">
              <th className="p-4 font-black">Tên Video / Link</th>
              <th className="p-4 font-black">Trạng thái</th>
              <th className="p-4 font-black">Dung lượng</th>
              <th className="p-4 font-black text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-12">
                  Chưa có tác vụ tải nào. Hãy bấm "Quét Ngay" để lấy video!
                </td>
              </tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4 max-w-[200px] lg:max-w-[300px] truncate font-medium text-white" title={t.videoTitle || t.videoUrl}>
                    {t.videoTitle || t.videoUrl}
                  </td>
                  <td className="p-4">
                    <Badge variant={t.status === 'completed' ? 'default' : t.status === 'failed' ? 'destructive' : t.status === 'downloading' || t.status === 'scanning' ? 'secondary' : 'outline'}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground text-sm">
                    {t.fileSize ? (t.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                  </td>
                  <td className="p-4 text-right">
                    {(t.status === 'failed' || t.status === 'completed' || t.status === 'skipped') && (
                      <Button variant="ghost" size="icon" onClick={() => handleRetry(t.id)} title="Tải lại">
                        <RefreshCcw className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                    {(t.status === 'pending' || t.status === 'downloading' || t.status === 'scanning') && (
                      <Button variant="ghost" size="icon" onClick={() => handleStop(t.id)} title="Dừng/Hủy tải">
                        <StopCircle className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
