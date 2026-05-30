/**
 * Helper hiển thị Toast notification cho module SIM Manager.
 * Dùng chung cho tất cả client components trong /dashboard/sim/*
 */
export function showToast(msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(msg, type);
  }
}
