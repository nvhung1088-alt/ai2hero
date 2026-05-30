import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-8 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 h-12 w-12 rounded-full border-t-2 border-orange-500/20 blur-sm animate-spin" />
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 drop-shadow-sm" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
        Đang tải dữ liệu không gian làm việc...
      </p>
    </div>
  );
}
