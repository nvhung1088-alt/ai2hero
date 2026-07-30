import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.srt') return 'text/plain; charset=utf-8';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  return 'video/mp4';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  try {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = request.headers.get('range');
    const contentType = getContentType(absolutePath);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(absolutePath, { start, end });
      const webStream = new ReadableStream({
        start(controller) {
          file.on('data', (chunk) => controller.enqueue(chunk));
          file.on('end', () => controller.close());
          file.on('error', (err) => controller.error(err));
        }
      });
      const head: Record<string, string> = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': contentType,
      };
      if (absolutePath.endsWith('.srt')) {
        head['Content-Disposition'] = `attachment; filename="${encodeURIComponent(path.basename(absolutePath))}"`;
      }
      return new NextResponse(webStream, { status: 206, headers: head });
    } else {
      const head: Record<string, string> = {
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
      };
      if (absolutePath.endsWith('.srt')) {
        head['Content-Disposition'] = `attachment; filename="${encodeURIComponent(path.basename(absolutePath))}"`;
      }
      const file = fs.createReadStream(absolutePath);
      const webStream = new ReadableStream({
        start(controller) {
          file.on('data', (chunk) => controller.enqueue(chunk));
          file.on('end', () => controller.close());
          file.on('error', (err) => controller.error(err));
        }
      });
      return new NextResponse(webStream, { status: 200, headers: head });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
