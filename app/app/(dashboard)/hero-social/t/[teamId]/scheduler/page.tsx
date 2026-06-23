import { getSchedules } from '../../../actions';
import { CreateScheduleForm } from './create-schedule-form';
import { Calendar, Clock, Facebook, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

export default async function SchedulerPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const schedules = await getSchedules(parseInt(teamId));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'publishing': return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default: return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return <span className="text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Đã đăng</span>;
      case 'failed': return <span className="text-red-600 font-medium text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Lỗi</span>;
      case 'publishing': return <span className="text-blue-600 font-medium text-xs bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Đang xử lý</span>;
      default: return <span className="text-orange-600 font-medium text-xs bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Chờ đăng</span>;
    }
  };

  const renderPlatformIcons = (platforms: unknown) => {
    if (!Array.isArray(platforms)) return null;
    return (
      <div className="flex -space-x-2">
        {platforms.map((p, i) => {
          if (p === 'facebook') return <div key={i} className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white"><span className="text-[10px]">FB</span></div>;
          if (p === 'zalo') return <div key={i} className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white text-white"><span className="text-[10px]">ZL</span></div>;
          if (p === 'isocial') return <div key={i} className="h-6 w-6 rounded-full bg-pink-100 flex items-center justify-center border-2 border-white"><span className="text-[10px]">IS</span></div>;
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-pink-500" />
            Lịch Đăng Bài (Scheduler)
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Lên lịch và tự động phân phối bài viết đa nền tảng
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <CreateScheduleForm teamId={teamId} />
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Danh sách chờ đăng</h2>
          
          <div className="space-y-4">
            {schedules.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Chưa có bài viết nào được lên lịch.</p>
              </div>
            ) : (
              schedules.map(schedule => (
                <div key={schedule.id} className="bg-white rounded-xl border p-4 shadow-sm hover:shadow transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">
                        {schedule.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{schedule.user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(schedule.scheduledAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {renderPlatformIcons(schedule.targetPlatforms)}
                      {getStatusLabel(schedule.status)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 line-clamp-3">
                    {schedule.content}
                  </div>
                  
                  {schedule.errorMessage && (
                    <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                      <strong>Lỗi:</strong> {schedule.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
