'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const errorParam = searchParams.get('error');

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );

  let oauthError = '';
  if (errorParam) {
    if (errorParam === 'invalid_state') oauthError = 'Phiên đăng nhập Google đã hết hạn (quá 10 phút) hoặc bị gián đoạn. Vui lòng bấm "Tiếp tục với Google" để thử lại.';
    else if (errorParam === 'missing_credentials') oauthError = 'Hệ thống chưa cấu hình Google Client Credentials.';
    else if (errorParam === 'token_exchange_failed') oauthError = 'Không thể xác thực mã với Google.';
    else if (errorParam === 'fetch_profile_failed') oauthError = 'Không thể lấy thông tin cá nhân từ Google.';
    else if (errorParam === 'email_not_provided') oauthError = 'Tài khoản Google không cung cấp email.';
    else if (errorParam === 'email_not_verified') oauthError = 'Tài khoản Google chưa xác minh email. Vui lòng xác minh email trên Google trước khi đăng nhập.';
    else if (errorParam === 'user_creation_failed') oauthError = 'Lỗi tạo tài khoản mới từ Google.';
    else if (errorParam === 'team_creation_failed') oauthError = 'Lỗi tạo không gian làm việc mới.';
    else oauthError = 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.';
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#08080A] text-white relative overflow-hidden">
      {/* Background Glow Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-hero-gradient text-white shadow-lg shadow-orange-500/20">
            <Sparkles className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          {mode === 'signin'
            ? 'Đăng nhập tài khoản'
            : 'Tạo tài khoản mới'}
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          AI biến bạn thành Hero
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10">
        <form className="space-y-5" action={formAction}>
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />
          <div>
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300"
            >
              Email
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
                maxLength={50}
                className="appearance-none rounded-full relative block w-full px-4 py-3 bg-zinc-800/40 border border-zinc-800 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 focus:z-10 sm:text-sm transition-all"
                placeholder="Nhập email của bạn"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300"
              >
                Mật khẩu
              </Label>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  (window as any).showToast?.('Tính năng khôi phục mật khẩu đang được phát triển.', 'info');
                }}
                className="text-xs text-orange-500 hover:text-orange-400 hover:underline transition-all"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                defaultValue={state.password}
                required
                minLength={8}
                maxLength={100}
                className="appearance-none rounded-full relative block w-full px-4 py-3 bg-zinc-800/40 border border-zinc-800 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 focus:z-10 sm:text-sm transition-all"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>

          {(state?.error || oauthError) && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 py-2.5 px-4 rounded-2xl">
              {state?.error || oauthError}
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-full shadow-lg text-sm font-semibold text-white bg-hero-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-orange-500 transition-all cursor-pointer"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Đang xử lý...
                </>
              ) : mode === 'signin' ? (
                'Đăng nhập'
              ) : (
                'Đăng ký'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#111113] text-zinc-500 rounded-full border border-zinc-800/50 py-0.5 text-xs uppercase tracking-wider">
                Hoặc
              </span>
            </div>
          </div>

          <div className="mt-6">
            <a
              href={`/api/auth/google?${new URLSearchParams({
                ...(redirect ? { redirect } : {}),
                ...(priceId ? { priceId } : {}),
                ...(inviteId ? { inviteId } : {}),
              }).toString()}`}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-zinc-800 rounded-full shadow-md text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-orange-500 transition-all cursor-pointer mb-6"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Tiếp tục với Google
            </a>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800/40" />
              </div>
            </div>

            <div className="text-center">
              <span className="text-zinc-500 text-sm mr-2">
                {mode === 'signin' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              </span>
              <Link
                href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `&priceId=${priceId}` : ''}`}
                className="text-sm font-semibold text-orange-500 hover:text-orange-400 hover:underline transition-all"
              >
                {mode === 'signin' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
