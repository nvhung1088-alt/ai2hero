import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { driveScanConfigs, driveContents, driveFiles, connectHubConnections } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { runGoogleDrive } from '@/lib/connect-hub/connectors/runners/google-drive';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const body = await req.json();

    // 1. SYNC: Worker gửi lên danh sách các nhóm file (Contents) mới phát hiện ở local
    if (action === 'sync') {
      const { teamId, configId, items } = body;
      if (!configId || !Array.isArray(items)) {
        return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
      }

      const config = await db.query.driveScanConfigs.findFirst({
        where: eq(driveScanConfigs.id, configId),
      });

      if (!config) {
        return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 });
      }

      const createdContents = [];

      for (const item of items) {
        const { baseName, files } = item;
        if (!baseName || !Array.isArray(files) || files.length === 0) continue;

        // Tìm content đã có chưa
        let content = await db.query.driveContents.findFirst({
          where: and(eq(driveContents.configId, configId), eq(driveContents.baseName, baseName)),
        });

        if (!content) {
          const [inserted] = await db
            .insert(driveContents)
            .values({
              teamId: config.teamId,
              configId,
              baseName,
              status: 'pending',
              totalFiles: files.length,
              uploadedFiles: 0,
            })
            .returning();
          content = inserted;
        }

        // Add các file con nếu chưa có
        for (const file of files) {
          const existingFile = await db.query.driveFiles.findFirst({
            where: and(eq(driveFiles.contentId, content.id), eq(driveFiles.fileName, file.fileName)),
          });

          if (!existingFile) {
            await db.insert(driveFiles).values({
              contentId: content.id,
              fileName: file.fileName,
              fileExtension: file.fileExtension || '',
              fileType: file.fileType || 'other',
              fileSize: file.fileSize || 0,
              localPath: file.localPath,
              status: 'pending',
            });
          }
        }

        createdContents.push(content);
      }

      // Cập nhật lastScanAt
      await db.update(driveScanConfigs).set({ lastScanAt: new Date() }).where(eq(driveScanConfigs.id, configId));

      return NextResponse.json({ success: true, count: createdContents.length });
    }

    // 2. FILE COMPLETE: Worker báo cáo file đã upload xong
    if (action === 'file_complete') {
      const { fileId, driveFileId, status, error } = body;
      if (!fileId) {
        return NextResponse.json({ success: false, error: 'fileId required' }, { status: 400 });
      }

      const streamLink = driveFileId ? `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media` : null;

      const [updatedFile] = await db
        .update(driveFiles)
        .set({
          driveFileId: driveFileId || null,
          streamLink,
          status: status || 'completed',
          error: error || null,
          updatedAt: new Date(),
        })
        .where(eq(driveFiles.id, fileId))
        .returning();

      if (updatedFile) {
        // Cập nhật tiến độ của driveContents
        const allFiles = await db.query.driveFiles.findMany({
          where: eq(driveFiles.contentId, updatedFile.contentId),
        });

        const completedCount = allFiles.filter((f) => f.status === 'completed' || f.status === 'deleted_local').length;
        const isAllDone = completedCount === allFiles.length;

        await db
          .update(driveContents)
          .set({
            uploadedFiles: completedCount,
            totalFiles: allFiles.length,
            status: isAllDone ? 'completed' : 'uploading',
            updatedAt: new Date(),
          })
          .where(eq(driveContents.id, updatedFile.contentId));
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Worker API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const configIdStr = searchParams.get('configId');

  try {
    // 3. GET TASKS: Lấy danh sách file pending & cấp Access Token của Google Drive
    if (action === 'get_pending_files' && configIdStr) {
      const configId = parseInt(configIdStr);

      const config = await db.query.driveScanConfigs.findFirst({
        where: eq(driveScanConfigs.id, configId),
      });

      if (!config) {
        return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 });
      }

      // Lấy danh sách contents của config
      const contents = await db.query.driveContents.findMany({
        where: eq(driveContents.configId, configId),
      });

      if (contents.length === 0) {
        return NextResponse.json({ success: true, files: [], accessToken: null });
      }

      const contentIds = contents.map((c) => c.id);

      // Lấy danh sách files pending
      const pendingFiles = await db.query.driveFiles.findMany({
        where: and(eq(driveFiles.status, 'pending'), inArray(driveFiles.contentId, contentIds)),
        limit: 10,
      });

      if (pendingFiles.length === 0) {
        return NextResponse.json({ success: true, files: [], accessToken: null });
      }

      // Đổi Access Token thông qua Connect Hub
      let accessToken = null;
      if (config.connectionId) {
        const conn: any = await db.query.connectHubConnections.findFirst({
          where: eq(connectHubConnections.id, config.connectionId),
        });

        if (conn && conn.credentials) {
          const creds = conn.credentials as any;
          // Gọi runner get_about để tự động xin fresh accessToken
          const res = await runGoogleDrive(creds, 'get_about', {});
          if (res.success && res.data && res.data.accessToken) {
            accessToken = res.data.accessToken;
          }
        }
      }

      return NextResponse.json({
        success: true,
        accessToken,
        targetFolderId: config.targetFolderId || null,
        deleteAfterUpload: config.deleteAfterUpload,
        files: pendingFiles,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action or parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Worker GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
