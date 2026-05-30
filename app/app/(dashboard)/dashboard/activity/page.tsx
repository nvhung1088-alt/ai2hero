import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { ActivityType } from '@/lib/db/schema';
import { getActivityLogs } from '@/lib/db/queries';

const iconMap: Record<ActivityType, LucideIcon> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
};

function getRelativeTime(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'vừa xong';
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function formatAction(action: ActivityType): string {
  switch (action) {
    case ActivityType.SIGN_UP:
      return 'Bạn đã đăng ký tài khoản';
    case ActivityType.SIGN_IN:
      return 'Bạn đã đăng nhập';
    case ActivityType.SIGN_OUT:
      return 'Bạn đã đăng xuất';
    case ActivityType.UPDATE_PASSWORD:
      return 'Bạn đã đổi mật khẩu';
    case ActivityType.DELETE_ACCOUNT:
      return 'Bạn đã xóa tài khoản';
    case ActivityType.UPDATE_ACCOUNT:
      return 'Bạn đã cập nhật tài khoản';
    case ActivityType.CREATE_TEAM:
      return 'Bạn đã tạo nhóm mới';
    case ActivityType.REMOVE_TEAM_MEMBER:
      return 'Bạn đã xóa thành viên khỏi nhóm';
    case ActivityType.INVITE_TEAM_MEMBER:
      return 'Bạn đã mời thành viên mới';
    case ActivityType.ACCEPT_INVITATION:
      return 'Bạn đã chấp nhận lời mời';
    default:
      return 'Hoạt động không xác định';
  }
}

export default async function ActivityPage() {
  const logs = await getActivityLogs();

  return (
    <section className="flex-1 p-6 lg:p-10">
      <h1 className="text-xl lg:text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent tracking-tight mb-6 animate-fade-up">
        Nhật ký hoạt động
      </h1>
      <Card className="rounded-2xl bg-gray-900/50 border-white/10 backdrop-blur-sm shadow-2xl text-white animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-bold text-white">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || Settings;
                const formattedAction = formatAction(
                  log.action as ActivityType
                );

                return (
                  <li key={log.id} className="flex items-start space-x-4 p-3.5 rounded-xl hover:bg-white/5 transition-colors duration-150 border border-transparent hover:border-white/5">
                    <div className="bg-orange-500/10 rounded-full p-2.5 shrink-0 shadow-inner">
                      <Icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 break-words leading-relaxed">
                        {formattedAction}
                        {log.ipAddress && (
                          <span className="text-xs text-gray-500 ml-1.5 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
                        {getRelativeTime(new Date(log.timestamp))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Chưa có hoạt động nào
              </h3>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Khi bạn thực hiện các hành động như đăng nhập hoặc cập nhật tài khoản, chúng sẽ hiển thị tại đây.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
