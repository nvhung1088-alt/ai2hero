'use server';

import { db } from '@/lib/db/drizzle';
import { systemSettings, simPlatforms } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { encryptField, decryptField } from '@/lib/sim-crypto';

function encrypt(text: string): string {
  return encryptField(text) || '';
}

function decrypt(text: string): string {
  return decryptField(text) || '';
}

export async function saveSystemSetting(key: string, value: any) {
  try {
    const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    let finalValue = { ...value };
    
    if (existing.length > 0) {
      const oldValue = existing[0].value as any;
      if (oldValue && typeof oldValue === 'object') {
        // Xử lý giữ nguyên giá trị cũ nếu client gửi mask placeholder
        if (finalValue.numverifyKey === '__SAVED_KEY__') {
          finalValue.numverifyKey = oldValue.numverifyKey;
        } else if (finalValue.numverifyKey) {
          finalValue.numverifyKey = encrypt(finalValue.numverifyKey);
        }
        
        if (finalValue.telegramToken === '__SAVED_TOKEN__') {
          finalValue.telegramToken = oldValue.telegramToken;
        } else if (finalValue.telegramToken) {
          finalValue.telegramToken = encrypt(finalValue.telegramToken);
        }
      } else {
        if (finalValue.numverifyKey && finalValue.numverifyKey !== '__SAVED_KEY__') {
          finalValue.numverifyKey = encrypt(finalValue.numverifyKey);
        }
        if (finalValue.telegramToken && finalValue.telegramToken !== '__SAVED_TOKEN__') {
          finalValue.telegramToken = encrypt(finalValue.telegramToken);
        }
      }
      
      await db.update(systemSettings).set({ value: finalValue, updatedAt: new Date() }).where(eq(systemSettings.key, key));
    } else {
      if (finalValue.numverifyKey && finalValue.numverifyKey !== '__SAVED_KEY__') {
        finalValue.numverifyKey = encrypt(finalValue.numverifyKey);
      }
      if (finalValue.telegramToken && finalValue.telegramToken !== '__SAVED_TOKEN__') {
        finalValue.telegramToken = encrypt(finalValue.telegramToken);
      }
      await db.insert(systemSettings).values({ key, value: finalValue, updatedAt: new Date() });
    }
    
    revalidatePath('/sim/settings');
    return { success: true };
  } catch (error) {
    console.error('Error saving system setting:', error);
    return { success: false, error: 'Lỗi lưu cấu hình' };
  }
}

export async function getSystemSetting(key: string, maskSensitive = false) {
  try {
    const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    if (result.length === 0) return null;
    
    let value = result[0].value;
    if (value && typeof value === 'object') {
      const decryptedValue = { ...value } as any;
      if (decryptedValue.numverifyKey) {
        decryptedValue.numverifyKey = decrypt(decryptedValue.numverifyKey);
      }
      if (decryptedValue.telegramToken) {
        decryptedValue.telegramToken = decrypt(decryptedValue.telegramToken);
      }
      
      if (maskSensitive) {
        if (decryptedValue.numverifyKey) decryptedValue.numverifyKey = '__SAVED_KEY__';
        if (decryptedValue.telegramToken) decryptedValue.telegramToken = '__SAVED_TOKEN__';
      }
      return decryptedValue;
    }
    return value;
  } catch (error) {
    console.error('Error getting system setting:', error);
    return null;
  }
}

export async function testNumverifyConnectionAction(teamId: number, apiKey: string) {
  try {
    let keyToTest = apiKey;
    if (keyToTest === '__SAVED_KEY__') {
      const settings = await getSystemSetting(`sim_settings_team_${teamId}`, false);
      if (settings && settings.numverifyKey) {
        keyToTest = settings.numverifyKey;
      } else {
        return { success: false, error: 'Chưa cấu hình Numverify API Key' };
      }
    }
    
    if (!keyToTest) return { success: false, error: 'API Key không được để trống' };
    
    const res = await fetch(`http://apilayer.net/api/validate?access_key=${keyToTest}&number=84901234567`, {
      method: 'GET',
      next: { revalidate: 0 }
    });
    
    if (!res.ok) {
      return { success: false, error: `Lỗi kết nối API Server (HTTP ${res.status})` };
    }
    
    const data = await res.json();
    if (data.success === false) {
      return { success: false, error: data.error?.info || 'Khóa API không hợp lệ' };
    }
    
    return { 
      success: true, 
      message: `Kết nối API Key Numverify hợp lệ! Quốc gia: ${data.country_name || 'Việt Nam'}, Nhà mạng: ${data.carrier || 'Viettel/Vinaphone'}` 
    };
  } catch (error) {
    console.error('Error testing Numverify connection:', error);
    return { success: false, error: 'Lỗi kết nối mạng hoặc API Server không phản hồi' };
  }
}

export async function testTelegramBotAction(teamId: number, token: string) {
  try {
    let tokenToTest = token;
    if (tokenToTest === '__SAVED_TOKEN__') {
      const settings = await getSystemSetting(`sim_settings_team_${teamId}`, false);
      if (settings && settings.telegramToken) {
        tokenToTest = settings.telegramToken;
      } else {
        return { success: false, error: 'Chưa cấu hình Bot Token' };
      }
    }
    
    if (!tokenToTest) return { success: false, error: 'Bot Token không được để trống' };
    
    const res = await fetch(`https://api.telegram.org/bot${tokenToTest}/getMe`, {
      method: 'GET',
      next: { revalidate: 0 }
    });
    
    if (!res.ok) {
      return { success: false, error: `Bot Token không hợp lệ hoặc Telegram bị chặn (HTTP ${res.status})` };
    }
    
    const data = await res.json();
    if (data.ok) {
      return { success: true, message: `Handshake Telegram thành công! Bot khả dụng: @${data.result.username} (${data.result.first_name})` };
    } else {
      return { success: false, error: data.description || 'Lỗi bắt tay với Telegram' };
    }
  } catch (error) {
    console.error('Error testing Telegram Bot:', error);
    return { success: false, error: 'Lỗi mạng hoặc Telegram Server không phản hồi' };
  }
}

export async function sendTelegramTestMessageAction(teamId: number, token: string, chatId: string) {
  try {
    let tokenToTest = token;
    if (tokenToTest === '__SAVED_TOKEN__') {
      const settings = await getSystemSetting(`sim_settings_team_${teamId}`, false);
      if (settings && settings.telegramToken) {
        tokenToTest = settings.telegramToken;
      } else {
        return { success: false, error: 'Chưa cấu hình Bot Token' };
      }
    }
    
    if (!tokenToTest) return { success: false, error: 'Bot Token không được để trống' };
    if (!chatId) return { success: false, error: 'Chat ID không được để trống' };
    
    const textMsg = `🛡️ <b>[SimGuard Alerts]</b>\n\nĐây là tin nhắn kiểm thử kết nối Bot từ bảng điều khiển SIM Manager Web App.\n\n• <b>Hệ thống:</b> AI2Hero Platform\n• <b>Trạng thái:</b> Đã bắt tay thành công 🤝\n• <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}`;
    
    const res = await fetch(`https://api.telegram.org/bot${tokenToTest}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textMsg,
        parse_mode: 'HTML'
      }),
      next: { revalidate: 0 }
    });
    
    const data = await res.json();
    if (data.ok) {
      return { success: true, message: 'Gửi tin nhắn test tới Telegram thành công! Hãy kiểm tra chat/group của bạn.' };
    } else {
      return { success: false, error: data.description || 'Không thể gửi tin nhắn. Hãy chắc chắn rằng bạn đã nhắn tin với Bot trước hoặc đã add Bot vào group chat.' };
    }
  } catch (error) {
    console.error('Error sending test Telegram message:', error);
    return { success: false, error: 'Lỗi kết nối mạng hoặc Telegram Server không phản hồi' };
  }
}

export async function createSimPlatformAction(teamId: number, key: string, label: string, icon: string, color: string) {
  try {
    await db.insert(simPlatforms).values({
      teamId,
      key,
      label,
      icon,
      color,
      isDefault: 0
    });
    revalidatePath('/sim/settings');
    return { success: true };
  } catch (error) {
    console.error('Error creating platform:', error);
    return { success: false, error: 'Lỗi thêm nền tảng' };
  }
}

export async function deleteSimPlatformAction(teamId: number, key: string) {
  try {
    await db.delete(simPlatforms).where(and(eq(simPlatforms.teamId, teamId), eq(simPlatforms.key, key)));
    revalidatePath('/sim/settings');
    return { success: true };
  } catch (error) {
    console.error('Error deleting platform:', error);
    return { success: false, error: 'Lỗi xóa nền tảng' };
  }
}

// ─── HeroSim Extension Actions ────────────────────────────────────────────────
import {
  generateLinkCode,
  getActiveExtensionTokens,
  revokeExtensionToken,
} from '@/lib/db/extension-actions';

export async function generateLinkCodeAction(teamId: number, userId: number) {
  return generateLinkCode(teamId, userId);
}

export async function getLinkedDevicesAction(teamId: number) {
  return getActiveExtensionTokens(teamId);
}

export async function revokeDeviceAction(teamId: number, tokenId: number) {
  const result = await revokeExtensionToken(teamId, tokenId);
  if (result.success) revalidatePath('/sim/settings');
  return result;
}


