import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { ToastProvider } from '@/components/ui/toast';
import NextTopLoader from 'nextjs-toploader';

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

const fontSans = Inter({ subsets: ['vietnamese', 'latin'], display: 'swap' });

import { cookies } from 'next/headers';

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  try {
    const cookieStore = await cookies();
    const hasSession = cookieStore.has('session');

    const rawFallback: Record<string, any> = {
      '/api/user': hasSession ? await getUser() : null,
      '/api/team': hasSession ? await getTeamForUser() : null
    };
    
    // Serialize fallback to strip any Date objects for RSC payload
    const fallback = JSON.parse(JSON.stringify(rawFallback));

    return (
      <html
        lang="vi"
        translate="no"
        className={`bg-white dark:bg-gray-950 text-black dark:text-white ${fontSans.className}`}
        suppressHydrationWarning={true}
      >
        <body className="min-h-[100dvh] bg-gray-50" suppressHydrationWarning={true}>
          <NextTopLoader color="#f97316" showSpinner={false} />
          <SWRConfig value={{ fallback }}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SWRConfig>
        </body>
      </html>
    );
  } catch (err: any) {
    return (
      <html lang="vi">
        <body>
          <div style={{ padding: '2rem', color: 'red', background: '#ffebee' }}>
            <h2>Layout Error</h2>
            <pre>{err.message || String(err)}</pre>
            <pre style={{ fontSize: '0.8rem', marginTop: '1rem' }}>{err.stack}</pre>
          </div>
        </body>
      </html>
    );
  }
}
