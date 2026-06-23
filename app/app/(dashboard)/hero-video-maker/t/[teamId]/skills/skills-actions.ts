'use server';

import fs from 'fs/promises';
import path from 'path';

export interface UpdateSkillPayload {
  name: string;
  imageUrl: string;
  prompt: string;
}

export async function updateSkillAction(
  type: 'artSkills' | 'storySkills',
  id: string,
  payload: UpdateSkillPayload
) {
  try {
    const presetsPath = path.join(process.cwd(), 'app', 'lib', 'hero-video-maker', 'presets.json');
    const fileContent = await fs.readFile(presetsPath, 'utf8');
    const presets = JSON.parse(fileContent);

    if (!presets[type]) {
      return { success: false, error: 'Loại skill không tồn tại' };
    }

    const skillIndex = presets[type].findIndex((s: any) => s.id === id);
    if (skillIndex === -1) {
      return { success: false, error: 'Không tìm thấy skill' };
    }

    // Cập nhật thông tin
    presets[type][skillIndex] = {
      ...presets[type][skillIndex],
      name: payload.name,
      imageUrl: payload.imageUrl,
      prompt: payload.prompt,
    };

    // Ghi lại vào file
    await fs.writeFile(presetsPath, JSON.stringify(presets, null, 2), 'utf8');

    return { success: true, message: 'Cập nhật thành công' };
  } catch (error: any) {
    console.error('Error updating skill:', error);
    return { success: false, error: error.message || 'Lỗi không xác định khi cập nhật skill' };
  }
}
