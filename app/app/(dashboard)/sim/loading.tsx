import { Loader2, DatabaseZap } from 'lucide-react';

export default function SimDashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-8 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute inset-0 h-16 w-16 rounded-full border-t-2 border-emerald-500/20 blur-sm animate-spin" />
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <DatabaseZap className="h-6 w-6 text-emerald-500 drop-shadow-sm" />
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
        Đang tải dữ liệu Kho SIM an toàn...
      </p>
    </div>
  );
}
