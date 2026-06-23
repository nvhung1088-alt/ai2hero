import { NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import os from 'os';

export async function POST(request: Request) {
  try {
    const { path: rawPath, isFolder } = await request.json();
    if (!rawPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    if (os.platform() === 'win32') {
      const winPath = rawPath.replace(/\//g, '\\');
      if (isFolder) {
        // Mở thư mục
        spawn('explorer.exe', [winPath], { detached: true, stdio: 'ignore' }).unref();
      } else {
        // Highlight file
        spawn('explorer.exe', ['/select,', winPath], { detached: true, stdio: 'ignore' }).unref();
      }
      return NextResponse.json({ success: true, message: `Opened: ${winPath}` });
    } else if (os.platform() === 'darwin') {
      // macOS
      if (isFolder) {
        spawn('open', [rawPath], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('open', ['-R', rawPath], { detached: true, stdio: 'ignore' }).unref();
      }
      return NextResponse.json({ success: true });
    } else {
      // Linux
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
