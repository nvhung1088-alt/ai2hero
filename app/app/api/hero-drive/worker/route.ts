import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import {
  driveProjects,
  driveFolderMappings,
  driveScanConfigs,
  driveContents,
  driveFiles,
  connectHubConnections,
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { runGoogleDrive } from '@/lib/connect-hub/connectors/runners/google-drive';
import { decryptField } from '@/lib/sim-crypto';

function parseCredentials(conn: any) {
  if (!conn) return null;
  if (conn.credentials && typeof conn.credentials === 'object') return conn.credentials;
  if (conn.encryptedCredentials) {
    try {
      const decrypted = decryptField(conn.encryptedCredentials);
      if (decrypted) return JSON.parse(decrypted);
    } catch (e) {}
    try {
      return JSON.parse(conn.encryptedCredentials);
    } catch (e) {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const body = await req.json();

    // 1. SYNC: Worker gửi lên danh sách các nhóm file (Contents) mới phát hiện ở local
    if (action === 'sync') {
      const { teamId, projectId, mappingId, configId, items } = body;
      if (!Array.isArray(items)) {
        return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
      }

      const createdContents = [];

      for (const item of items) {
        const { baseName, files } = item;
        if (!baseName || !Array.isArray(files) || files.length === 0) continue;

        // Tìm content đã có chưa
        let content = null;
        if (mappingId) {
          content = await db.query.driveContents.findFirst({
            where: and(eq(driveContents.mappingId, mappingId), eq(driveContents.baseName, baseName)),
          });
        } else if (configId) {
          content = await db.query.driveContents.findFirst({
            where: and(eq(driveContents.configId, configId), eq(driveContents.baseName, baseName)),
          });
        }

        if (!content) {
          const [inserted] = await db
            .insert(driveContents)
            .values({
              teamId: teamId || 1,
              projectId: projectId || null,
              mappingId: mappingId || null,
              configId: configId || null,
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

      if (mappingId) {
        await db.update(driveFolderMappings).set({ lastScanAt: new Date() }).where(eq(driveFolderMappings.id, mappingId));
      } else if (configId) {
        await db.update(driveScanConfigs).set({ lastScanAt: new Date() }).where(eq(driveScanConfigs.id, configId));
      }

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
  const projectIdStr = searchParams.get('projectId');
  const configIdStr = searchParams.get('configId');

  try {
    // 2.5 GET ALL TASKS FOR GLOBAL WORKER
    if (action === 'get_all_tasks' || !action || (action === 'get_project_tasks' && !projectIdStr)) {
      const mappings = await db.query.driveFolderMappings.findMany({
        where: eq(driveFolderMappings.isActive, true),
      });

      const contents = await db.query.driveContents.findMany();
      let pendingFiles: any[] = [];
      if (contents.length > 0) {
        const contentIds = contents.map((c) => c.id);
        pendingFiles = await db.query.driveFiles.findMany({
          where: and(eq(driveFiles.status, 'pending'), inArray(driveFiles.contentId, contentIds)),
          limit: 20,
        });
      }

      // Lấy Access Token cho từng mapping
      const mappingTokens: Record<number, { accessToken: string | null; targetFolderId: string | null; deleteAfterUpload: boolean }> = {};

      // Lấy kết nối Google Drive mặc định (nếu mapping chưa gán)
      let defaultAccessToken: string | null = null;
      const allDriveConns = await db.query.connectHubConnections.findMany({
        where: eq(connectHubConnections.appSlug, 'google-drive'),
      });

      for (const conn of allDriveConns as any[]) {
        const creds = parseCredentials(conn);
        if (creds) {
          try {
            const res = await runGoogleDrive(creds, 'get_about', {});
            if (res.success && res.data && res.data.accessToken) {
              defaultAccessToken = res.data.accessToken;
              break;
            }
          } catch (e) {}
        }
      }

      for (const m of mappings) {
        let accessToken = null;
        if (m.connectionId) {
          const conn: any = await db.query.connectHubConnections.findFirst({
            where: eq(connectHubConnections.id, m.connectionId),
          });
          const creds = parseCredentials(conn);
          if (creds) {
            try {
              const res = await runGoogleDrive(creds, 'get_about', {});
              if (res.success && res.data && res.data.accessToken) {
                accessToken = res.data.accessToken;
              }
            } catch (e) {}
          }
        }

        mappingTokens[m.id] = {
          accessToken: accessToken || defaultAccessToken,
          targetFolderId: m.targetFolderId || null,
          deleteAfterUpload: m.deleteAfterUpload,
        };
      }

      const filesWithTokens = pendingFiles.map((file) => {
        const content = contents.find((c) => c.id === file.contentId);
        const mappingId = content?.mappingId;
        const tokenInfo = mappingId ? mappingTokens[mappingId] : null;

        return {
          ...file,
          mappingId,
          accessToken: tokenInfo?.accessToken || defaultAccessToken,
          targetFolderId: tokenInfo?.targetFolderId || null,
          deleteAfterUpload: tokenInfo?.deleteAfterUpload || false,
        };
      });

      return NextResponse.json({
        success: true,
        mappings,
        mappingTokens,
        files: filesWithTokens,
      });
    }

    // 3. GET TASKS FOR PROJECT
    if (action === 'get_project_tasks' && projectIdStr) {
      const projectId = parseInt(projectIdStr);

      const mappings = await db.query.driveFolderMappings.findMany({
        where: eq(driveFolderMappings.projectId, projectId),
      });

      const contents = await db.query.driveContents.findMany({
        where: eq(driveContents.projectId, projectId),
      });

      if (contents.length === 0) {
        return NextResponse.json({ success: true, mappings, files: [] });
      }

      const contentIds = contents.map((c) => c.id);
      const pendingFiles = await db.query.driveFiles.findMany({
        where: and(eq(driveFiles.status, 'pending'), inArray(driveFiles.contentId, contentIds)),
        limit: 10,
      });

      // Lấy Access Token cho từng mapping
      const mappingTokens: Record<number, { accessToken: string | null; targetFolderId: string | null; deleteAfterUpload: boolean }> = {};

      for (const m of mappings) {
        let accessToken = null;
        if (m.connectionId) {
          const conn: any = await db.query.connectHubConnections.findFirst({
            where: eq(connectHubConnections.id, m.connectionId),
          });
          if (conn && conn.credentials) {
            const res = await runGoogleDrive(conn.credentials as any, 'get_about', {});
            if (res.success && res.data && res.data.accessToken) {
              accessToken = res.data.accessToken;
            }
          }
        }
        mappingTokens[m.id] = {
          accessToken,
          targetFolderId: m.targetFolderId || null,
          deleteAfterUpload: m.deleteAfterUpload,
        };
      }

      return NextResponse.json({
        success: true,
        mappings,
        mappingTokens,
        files: pendingFiles,
      });
    }

    // 4. LEGACY GET TASKS FOR CONFIG
    if (action === 'get_pending_files' && configIdStr) {
      const configId = parseInt(configIdStr);

      const config = await db.query.driveScanConfigs.findFirst({
        where: eq(driveScanConfigs.id, configId),
      });

      if (!config) {
        return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 });
      }

      const contents = await db.query.driveContents.findMany({
        where: eq(driveContents.configId, configId),
      });

      if (contents.length === 0) {
        return NextResponse.json({ success: true, files: [], accessToken: null });
      }

      const contentIds = contents.map((c) => c.id);
      const pendingFiles = await db.query.driveFiles.findMany({
        where: and(eq(driveFiles.status, 'pending'), inArray(driveFiles.contentId, contentIds)),
        limit: 10,
      });

      let accessToken = null;
      if (config.connectionId) {
        const conn: any = await db.query.connectHubConnections.findFirst({
          where: eq(connectHubConnections.id, config.connectionId),
        });

        if (conn && conn.credentials) {
          const res = await runGoogleDrive(conn.credentials as any, 'get_about', {});
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
