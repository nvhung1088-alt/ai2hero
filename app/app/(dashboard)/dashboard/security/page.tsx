'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Lock, Trash2, Loader2 } from 'lucide-react';
import { useActionState } from 'react';
import { updatePassword, deleteAccount } from '@/app/(login)/actions';

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const [passwordState, passwordAction, isPasswordPending] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});

  const [deleteState, deleteAction, isDeletePending] = useActionState<
    DeleteState,
    FormData
  >(deleteAccount, {});

  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (passwordState.success) {
      setFormKey(prev => prev + 1);
    }
  }, [passwordState.success]);

  return (
    <section className="flex-1 p-6 lg:p-10">
      <h1 className="text-lg lg:text-2xl font-bold text-white mb-6 animate-fade-up">
        Bảo mật
      </h1>

      <Card className="mb-8 rounded-2xl shadow-xl shadow-black/25 border-white/10 bg-gray-900/50 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-bold text-white">Mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form key={formKey} className="space-y-4" action={passwordAction}>
            <div>
              <Label htmlFor="current-password" className="mb-2 block text-sm font-medium text-gray-300">
                Mật khẩu hiện tại
              </Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.currentPassword}
                className="rounded-lg border-white/10 bg-white/5 text-white focus:border-orange-500 focus:ring-orange-500 focus:ring-1 focus:outline-none"
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="mb-2 block text-sm font-medium text-gray-300">
                Mật khẩu mới
              </Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.newPassword}
                className="rounded-lg border-white/10 bg-white/5 text-white focus:border-orange-500 focus:ring-orange-500 focus:ring-1 focus:outline-none"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-gray-300">
                Xác nhận mật khẩu mới
              </Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.confirmPassword}
                className="rounded-lg border-white/10 bg-white/5 text-white focus:border-orange-500 focus:ring-orange-500 focus:ring-1 focus:outline-none"
              />
            </div>
            {passwordState.error && (
              <p className="text-red-500 text-sm">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-green-500 text-sm">{passwordState.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm font-medium px-4 py-2 transition-all"
              disabled={isPasswordPending}
            >
              {isPasswordPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Cập nhật mật khẩu
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-xl shadow-black/25 border-red-900/30 bg-red-950/20 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="border-b border-red-900/30 pb-4">
          <CardTitle className="text-lg font-bold text-red-400">Xóa tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-red-400 mb-4 bg-red-950/30 border border-red-900/30 rounded-xl p-3.5 font-medium">
            ⚠️ Việc xóa tài khoản không thể hoàn tác. Vui lòng cân nhắc kỹ trước khi thực hiện.
          </p>
          <form action={deleteAction} className="space-y-4">
            <div>
              <Label htmlFor="delete-password" className="mb-2 block text-sm font-medium text-gray-300">
                Xác nhận mật khẩu
              </Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={deleteState.password}
                className="rounded-lg border-red-900/30 bg-white/5 text-white focus:border-red-500 focus:ring-red-500 focus:ring-1 focus:outline-none"
              />
            </div>
            {deleteState.error && (
              <p className="text-red-500 text-sm">{deleteState.error}</p>
            )}
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm font-medium px-4 py-2 transition-all"
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa tài khoản
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
