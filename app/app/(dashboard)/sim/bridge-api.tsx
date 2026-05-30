'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createSimLinkedAccount, 
  updateSimLinkedAccount 
} from '@/lib/db/sim-actions';
import { showToast } from './sim-ui-helpers';

interface VaultData {
  assets: any[];
  linkedAccounts: any[];
  employees: any[];
  platforms: any[];
  riskEvents: any[];
  checkLogs: any[];
}

interface BridgeAPIProps {
  teamId: number;
  vaultData: VaultData;
}

// Helper to convert camelCase to snake_case
function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to convert snake_case to camelCase
function snakeToCamelKey(key: string): string {
  return key.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      res[camelToSnakeKey(key)] = toSnakeCase(val);
    }
    return res;
  }
  return obj;
}

function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      res[snakeToCamelKey(key)] = toCamelCase(val);
    }
    return res;
  }
  return obj;
}

export default function BridgeAPI({ teamId, vaultData }: BridgeAPIProps) {
  const router = useRouter();

  // 1. Sync server-side vaultData down to localStorage (snake_case)
  useEffect(() => {
    try {
      localStorage.setItem('simguard_assets', JSON.stringify(toSnakeCase(vaultData.assets) || []));
      localStorage.setItem('simguard_linked_accounts', JSON.stringify(toSnakeCase(vaultData.linkedAccounts) || []));
      localStorage.setItem('simguard_employees', JSON.stringify(toSnakeCase(vaultData.employees) || []));
      localStorage.setItem('simguard_platforms', JSON.stringify(toSnakeCase(vaultData.platforms) || []));
      localStorage.setItem('simguard_risk_events', JSON.stringify(toSnakeCase(vaultData.riskEvents) || []));
      localStorage.setItem('simguard_check_logs', JSON.stringify(toSnakeCase(vaultData.checkLogs) || []));

      if (!localStorage.getItem('simguard_pin')) {
        localStorage.setItem('simguard_pin', '1234');
      }
    } catch (err) {
      console.error('BridgeAPI: Error writing to localStorage:', err);
    }
  }, [vaultData]);

  // 2. Listen to postMessage from SimGuard Extension
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Security filter: prevent cross-origin message interception / data injection
      if (event.origin !== window.location.origin) {
        return;
      }

      // Security filter: only listen to messages coming from the SimGuard extension
      if (!event.data || event.data.source !== 'simguard-extension') {
        return;
      }

      const { type, payload: extPayload, data: extData } = event.data;
      const payload = extPayload ?? extData;

      console.log('BridgeAPI: Received message from Extension:', type, payload);

      if (type === 'VAULT_QUERY') {
        // Return current vault data mapped to snake_case
        window.postMessage({
          source: 'simguard-web',
          type: 'VAULT_QUERY_RESPONSE',
          success: true,
          data: {
            assets: toSnakeCase(vaultData.assets),
            linked_accounts: toSnakeCase(vaultData.linkedAccounts),
            employees: toSnakeCase(vaultData.employees),
            platforms: toSnakeCase(vaultData.platforms),
            risk_events: toSnakeCase(vaultData.riskEvents),
            check_logs: toSnakeCase(vaultData.checkLogs),
            pin: localStorage.getItem('simguard_pin') || '1234'
          }
        }, window.location.origin);
      }

      else if (type === 'VAULT_SAVE_ACCOUNT') {
        try {
          const accountData = toCamelCase(payload);
          
          // Check if account already exists by ID or by (platformKey, username)
          const existing = vaultData.linkedAccounts.find(
            a => a.id === accountData.id || 
            (a.platformKey === accountData.platformKey && a.username === accountData.username && accountData.username)
          );

          // Ensure linkedPhoneAssetId is provided and not null, otherwise fallback to the first asset ID
          let linkedPhoneAssetId = accountData.linkedPhoneAssetId;
          if (!linkedPhoneAssetId && vaultData.assets.length > 0) {
            linkedPhoneAssetId = vaultData.assets[0].id;
          }

          let result;
          if (existing) {
            // Remove identifiers/timestamps from update payload
            const { id, teamId: _, createdAt: __, updatedAt: ___, ...updatePayload } = accountData;
            result = await updateSimLinkedAccount(teamId, existing.id, {
              ...updatePayload,
              linkedPhoneAssetId: linkedPhoneAssetId || existing.linkedPhoneAssetId
            });
          } else {
            // Remove identifiers/timestamps from create payload
            const { id: _, teamId: __, createdAt: ___, updatedAt: ____, ...createPayload } = accountData;
            result = await createSimLinkedAccount(teamId, {
              ...createPayload,
              linkedPhoneAssetId: linkedPhoneAssetId || (vaultData.assets[0]?.id as number)
            } as any);
          }

          if (result.success) {
            // Show premium toast notification
            showToast(
              existing ? 'Cập nhật tài khoản từ Extension thành công' : 'Đồng bộ tài khoản từ Extension thành công', 
              'success'
            );
            router.refresh();

            // Respond success back to extension
            window.postMessage({
              source: 'simguard-web',
              type: 'VAULT_SAVE_ACCOUNT_RESPONSE',
              success: true,
              data: toSnakeCase(result.data)
            }, window.location.origin);
          } else {
            throw new Error(result.error);
          }
        } catch (err: any) {
          console.error('BridgeAPI: Error processing VAULT_SAVE_ACCOUNT:', err);
          showToast(err.message || 'Lỗi lưu tài khoản từ Extension', 'error');

          window.postMessage({
            source: 'simguard-web',
            type: 'VAULT_SAVE_ACCOUNT_RESPONSE',
            success: false,
            error: err.message || 'Lỗi hệ thống'
          }, window.location.origin);
        }
      }

      else if (type === 'VAULT_IMPORT_BATCH') {
        console.warn('BridgeAPI: VAULT_IMPORT_BATCH is deprecated. Use Native Web Import instead.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [teamId, vaultData, router]);

  return null;
}
