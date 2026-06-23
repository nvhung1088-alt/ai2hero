import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  try {
    const absolutePath = path.resolve(filePath);
    
    // Bảo mật: MVP localhost chỉ read file tồn tại.
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(absolutePath, { start, end });
      const head: Record<string, string> = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': absolutePath.endsWith('.srt') ? 'text/plain' : 'video/mp4',
      };
      if (absolutePath.endsWith('.srt')) {
        head['Content-Disposition'] = `attachment; filename="${encodeURIComponent(path.basename(absolutePath))}"`;
      }
      return new NextResponse(file as any, { status: 206, headers: head });
    } else {
      const head: Record<string, string> = {
        'Content-Length': fileSize.toString(),
        'Content-Type': absolutePath.endsWith('.srt') ? 'text/plain' : 'video/mp4',
      };
      if (absolutePath.endsWith('.srt')) {
        head['Content-Disposition'] = `attachment; filename="${encodeURIComponent(path.basename(absolutePath))}"`;
      }
      const file = fs.createReadStream(absolutePath);
      return new NextResponse(file as any, { status: 200, headers: head });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
