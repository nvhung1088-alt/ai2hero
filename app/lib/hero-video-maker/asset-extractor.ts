import { db } from '@/lib/db/drizzle';
import { videoMakerAssets, videoScriptAssets, videoScripts, videoPrompts } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { HeroAiText } from './ai-utils';

export interface ExtractedAsset {
  name: string;
  desc: string;
  type: 'role' | 'scene' | 'tool';
  scriptIds: number[];
}

export interface ExistingAssetRef {
  name: string;
  scriptIds: number[];
}

export async function extractAssetsFromScripts(params: {
  teamId: number;
  projectId: number;
  scriptIds: number[];
  aiText: HeroAiText;
}) {
  const { teamId, projectId, scriptIds, aiText } = params;

  if (!scriptIds.length) return { success: false, error: 'Không có kịch bản nào được chọn.' };

  const scripts = await db.select().from(videoScripts).where(
    inArray(videoScripts.id, scriptIds)
  );

  if (!scripts.length) {
    return { success: false, error: 'Không tìm thấy kịch bản nào phù hợp.' };
  }

  const scriptMap = new Map(scripts.map(s => [s.id, s]));

  // Cập nhật trạng thái kịch bản: đang trích xuất (ở AI2Hero, extractState = 0 có nghĩa là "generating/extracting")
  // 0: đang chạy, 1: thành công, 3: lỗi
  await db.update(videoScripts).set({
    extractState: 0
  }).where(inArray(videoScripts.id, scriptIds));

  try {
    // Lấy danh sách tài sản hiện có của dự án để AI tham khảo tránh trùng
    const existingAssets = await db.select().from(videoMakerAssets).where(
      eq(videoMakerAssets.projectId, projectId)
    );
    const existingAssetsList = existingAssets.map(a => `${a.name}(${a.type})`).join('、');

    const scriptsContent = scripts
      .map(s => `===== 【剧本ID: ${s.id}】${s.name || ''} =====\n${s.content}`)
      .join('\n\n');

    // Lấy prompt mẫu trong DB
    const promptData = await db.query.videoPrompts.findFirst({
      where: eq(videoPrompts.type, 'scriptAssetExtraction')
    });
    let basePrompt = promptData?.data || '';
    if (promptData?.useData) {
      basePrompt = promptData.useData;
    }

    if (!basePrompt) {
      basePrompt = `# Script Assets Extract\nTrích xuất các tài sản (role, scene, tool) từ kịch bản.`;
    }

    const existingHint = existingAssetsList
      ? `\n\n【已有资产列表】：${existingAssetsList}\nĐối với các tài sản đã có sẵn trong danh sách trên, nếu xuất hiện trong kịch bản, bạn chỉ cần điền vào existingAssetRefs gồm tên và scriptIds. Không lặp lại mô tả trong newAssets. Đối với tài sản hoàn toàn mới, hãy điền đầy đủ thông tin vào newAssets.`
      : '';

    const systemPrompt = basePrompt +
      `\n\nBẠN BẮT BUỘC PHẢI TRẢ VỀ PHẢN HỒI LÀ MỘT KHỐI JSON DUY NHẤT khớp với định dạng sau. Không viết thêm lời dẫn hay giải thích. Không dùng Markdown codeblock.` +
      `\n{\n  "newAssets": [\n    { "name": "tên nhân vật/bối cảnh/đạo cụ", "desc": "mô tả trực quan chi tiết", "type": "role" | "scene" | "tool", "scriptIds": [1, 2] }\n  ],\n  "existingAssetRefs": [\n    { "name": "tên tài sản đã có", "scriptIds": [1, 2] }\n  ]\n}`;

    const userContent = `Danh sách tài sản hiện có: ${existingHint}\n\nNội dung kịch bản:\n${scriptsContent}`;

    const resData = await aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    });

    // Parse JSON từ phản hồi của AI
    let cleanText = resData.text.trim();
    // Loại bỏ markdown code block nếu có
    cleanText = cleanText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    
    let jsonStart = cleanText.indexOf('{');
    let jsonEnd = cleanText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('AI không trả về định dạng JSON hợp lệ: ' + cleanText);
    }

    const jsonStr = cleanText.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr) as { newAssets: ExtractedAsset[]; existingAssetRefs: ExistingAssetRef[] };

    const newAssets = parsed.newAssets || [];
    const existingRefs = parsed.existingAssetRefs || [];

    // Lưu kết quả vào DB
    const existingMap = new Map(existingAssets.map(a => [a.name, a.id]));

    // 1. Thêm các tài sản hoàn toàn mới
    const toInsert = newAssets.filter(asset => !existingMap.has(asset.name));
    if (toInsert.length) {
      await db.insert(videoMakerAssets).values(
        toInsert.map(asset => ({
          projectId,
          name: asset.name,
          type: asset.type,
          describe: asset.desc,
          promptState: 'done'
        }))
      );
    }

    // 2. Query lại để lấy đầy đủ ID của toàn bộ tài sản
    const allAssets = await db.select().from(videoMakerAssets).where(
      eq(videoMakerAssets.projectId, projectId)
    );
    const nameToId = new Map(allAssets.map(a => [a.name, a.id]));

    // 3. Xây dựng các dòng liên kết n-n Script <-> Asset
    const scriptAssetRows: { scriptId: number; assetId: number }[] = [];

    for (const asset of newAssets) {
      const assetId = nameToId.get(asset.name);
      if (assetId) {
        for (const sid of asset.scriptIds) {
          scriptAssetRows.push({ scriptId: sid, assetId });
        }
      }
    }

    for (const ref of existingRefs) {
      const assetId = nameToId.get(ref.name);
      if (assetId) {
        for (const sid of ref.scriptIds) {
          scriptAssetRows.push({ scriptId: sid, assetId });
        }
      }
    }

    // Lọc trùng lặp
    const uniqueRows = [...new Map(scriptAssetRows.map(r => [`${r.scriptId}_${r.assetId}`, r])).values()];

    // Xóa liên kết cũ của các kịch bản này
    await db.delete(videoScriptAssets).where(inArray(videoScriptAssets.scriptId, scriptIds));

    // Thêm liên kết mới
    if (uniqueRows.length) {
      await db.insert(videoScriptAssets).values(uniqueRows);
    }

    // Cập nhật trạng thái kịch bản thành công (1: xong)
    await db.update(videoScripts).set({
      extractState: 1,
      errorReason: null
    }).where(inArray(videoScripts.id, scriptIds));

    return { success: true };

  } catch (error: any) {
    console.error('[AssetExtractor] Error:', error);
    // Cập nhật trạng thái kịch bản bị lỗi (3: lỗi)
    await db.update(videoScripts).set({
      extractState: 3,
      errorReason: error.message
    }).where(inArray(videoScripts.id, scriptIds));

    return { success: false, error: error.message };
  }
}
