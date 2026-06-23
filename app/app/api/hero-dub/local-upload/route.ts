import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Đường dẫn lưu file tạm
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'hero-dub-temp');
    
    // Tạo thư mục nếu chưa có
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Tạo tên file an toàn
    const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFilename);

    // Ghi file xuống ổ đĩa
    await fs.writeFile(filePath, buffer);

    // Trả về Local Absolute Path cho Python Worker
    return NextResponse.json({ 
      success: true, 
      localPath: path.resolve(filePath)
    });

  } catch (error: any) {
    console.error('[API Local Upload] Lỗi:', error);
    return NextResponse.json({ error: 'Lỗi tải file cục bộ: ' + error.message }, { status: 500 });
  }
}
