import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'AI2Hero — AI biến bạn thành Hero',
  description: 'Nền tảng công cụ AI miễn phí cho doanh nghiệp. Đăng ký 1 tài khoản, truy cập tất cả ứng dụng — từ AI Chat đến Quản lý Kho, POS, Marketing.',
  keywords: ['AI', 'SaaS', 'chatbot', 'doanh nghiệp', 'miễn phí', 'AI2Hero', 'quản lý', 'CRM'],
  openGraph: {
    title: 'AI2Hero — AI biến bạn thành Hero',
    description: 'Nền tảng công cụ AI miễn phí cho doanh nghiệp.',
    siteName: 'AI2Hero',
  },
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });

import { cookies } from 'next/headers';

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has('session');

  const fallback: Record<string, any> = {
    '/api/user': hasSession ? await getUser() : null,
    '/api/team': hasSession ? await getTeamForUser() : null
  };

  return (
    <html
      lang="vi"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig value={{ fallback }}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SWRConfig>
      </body>
    </html>
  );
}
