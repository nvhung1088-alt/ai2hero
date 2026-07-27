'use server';

import fs from 'fs';
import path from 'path';

// Define the keys we want to manage from settings
const SOCIAL_ENV_KEYS = [
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'TIKTOK_CLIENT_ID',
  'TIKTOK_CLIENT_SECRET',
  'PINTEREST_CLIENT_ID',
  'PINTEREST_CLIENT_SECRET',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'X_API_KEY',
  'X_API_SECRET',
];

export type HeroSocialEnv = Record<string, string>;

// Helper to get the absolute path to apps/hero-postiz/.env
function getPostizEnvPath() {
  return path.join(process.cwd(), '..', 'apps', 'hero-postiz', '.env');
}

export async function getHeroSocialEnvAction(): Promise<{ success: boolean; data?: HeroSocialEnv; error?: string }> {
  try {
    const envPath = getPostizEnvPath();
    if (!fs.existsSync(envPath)) {
      return { success: false, error: 'Không tìm thấy file .env của Postiz.' };
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const result: HeroSocialEnv = {};

    // Parse keys
    for (const key of SOCIAL_ENV_KEYS) {
      const match = envContent.match(new RegExp(`^${key}="(.*)"$`, 'm')) || envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      if (match) {
        result[key] = match[1] || '';
      } else {
        result[key] = ''; // Default if missing
      }
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateHeroSocialEnvAction(updates: HeroSocialEnv): Promise<{ success: boolean; error?: string }> {
  try {
    const envPath = getPostizEnvPath();
    if (!fs.existsSync(envPath)) {
      return { success: false, error: 'Không tìm thấy file .env của Postiz.' };
    }

    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update keys
    for (const key of SOCIAL_ENV_KEYS) {
      if (updates[key] !== undefined) {
        const newValue = updates[key];
        
        // Regex to match existing key
        const regexQuotes = new RegExp(`^${key}=".*"$`, 'm');
        const regexNoQuotes = new RegExp(`^${key}=.*$`, 'm');
        
        if (regexQuotes.test(envContent)) {
          envContent = envContent.replace(regexQuotes, `${key}="${newValue}"`);
        } else if (regexNoQuotes.test(envContent)) {
          envContent = envContent.replace(regexNoQuotes, `${key}="${newValue}"`);
        } else {
          // If key doesn't exist, append it
          envContent += `\n${key}="${newValue}"`;
        }
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Attempt to restart Postiz process if running via PM2 (optional in prod)
    // For local dev, User needs to manually restart.
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
