'use client';

import { useActionState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = ''
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-300">
          Họ tên
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Nhập họ tên của bạn"
          defaultValue={state.name || nameValue}
          required
          className="rounded-lg border-white/10 bg-white/5 text-white focus:border-orange-500 focus:ring-orange-500 focus:ring-1 focus:outline-none"
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
          Địa chỉ Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Nhập địa chỉ email"
          defaultValue={emailValue}
          required
          className="rounded-lg border-white/10 bg-white/5 text-white focus:border-orange-500 focus:ring-orange-500 focus:ring-1 focus:outline-none"
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

  return (
    <section className="flex-1 p-6 lg:p-10">
      <h1 className="text-lg lg:text-2xl font-bold text-white mb-6 animate-fade-up">
        Tổng quan
      </h1>

      <Card className="rounded-2xl shadow-xl shadow-black/25 border-white/10 bg-gray-900/50 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-bold text-white">Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm font-medium px-4 py-2 transition-all"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
