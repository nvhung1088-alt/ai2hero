import { NotificationsClient } from './notifications-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông báo | Ai2Hero Social',
  description: 'Quản lý thông báo của bạn',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
