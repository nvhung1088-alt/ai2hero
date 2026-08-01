/**
 * Google Drive Runner — Connector xử lý tương tác trực tiếp với Google Drive API v3.
 * 
 * BẢO MẬT & TIÊU CHUẨN:
 * 1. Tự động đổi Refresh Token lấy Access Token tươi (Google OAuth2 Token Swap)
 * 2. Timeout & AbortController (15s cho query, 60s cho upload)
 * 3. Hỗ trợ Upload Multipart & Direct Streaming Link cho YouTube / Facebook
 */

interface DriveCreds {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  access_token?: string;
  defaultFolderId?: string;
}

/**
 * Trao đổi Refresh Token lấy Access Token mới nhất từ Google OAuth 2.0
 */
async function getValidAccessToken(creds: any): Promise<string> {
  const directToken = creds.accessToken || creds.AccessToken || creds.access_token;
  const refreshToken = creds.refreshToken || creds.RefreshToken || creds.refresh_token;
  const clientId = creds.clientId || creds.ClientId || creds.client_id;
  const clientSecret = creds.clientSecret || creds.ClientSecret || creds.client_secret;

  if (directToken && !refreshToken) {
    return directToken;
  }

  if (!refreshToken) {
    if (directToken) return directToken;
    throw new Error('Thiếu Refresh Token hoặc Access Token để xác thực Google Drive.');
  }

  if (!clientId || !clientSecret) {
    throw new Error('Thiếu Client ID hoặc Client Secret để làm mới Access Token Google Drive.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const bodyParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error_description || errJson.error || `Lỗi refresh token HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.access_token) {
      throw new Error('Google OAuth API không trả về access_token.');
    }

    return data.access_token;
  } catch (error: any) {
    throw new Error(`Xác thực Google OAuth2 thất bại: ${error.message}`);
  }
}

export async function runGoogleDrive(
  creds: any,
  action: string,
  input: Record<string, any> = {}
): Promise<any> {
  const token = await getValidAccessToken(creds);
  const defaultFolder = creds.defaultFolderId || creds.DefaultFolderId || creds.default_folder_id;

  switch (action) {
    case 'get_about':
      return await handleGetAbout(token);

    case 'list_files':
      return await handleListFiles(token, input, defaultFolder);

    case 'upload_file':
      return await handleUploadFile(token, input, defaultFolder);

    case 'create_folder':
      return await handleCreateFolder(token, input, defaultFolder);

    case 'get_stream_link':
      return await handleGetStreamLink(token, input);

    case 'get_file_metadata':
      return await handleGetFileMetadata(token, input);

    case 'delete_file':
      return await handleDeleteFile(token, input);

    default:
      throw new Error(`Action "${action}" chưa được hỗ trợ trên Google Drive runner.`);
  }
}

/**
 * Action: Lấy thông tin dung lượng đĩa & chủ tài khoản
 */
async function handleGetAbout(token: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  const res = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink),storageQuota(limit,usage,usageInDrive,usageInDriveTrash)',
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    }
  );

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi Google Drive API (get_about): ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const limit = Number(data.storageQuota?.limit || 0);
  const usage = Number(data.storageQuota?.usage || 0);
  const freeBytes = limit > 0 ? limit - usage : null;

  return {
    success: true,
    accessToken: token,
    user: data.user,
    storageQuota: {
      ...data.storageQuota,
      limitFormattedGB: limit ? (limit / (1024 ** 3)).toFixed(2) + ' GB' : 'Unlimited',
      usageFormattedGB: (usage / (1024 ** 3)).toFixed(2) + ' GB',
      freeFormattedGB: freeBytes !== null ? (freeBytes / (1024 ** 3)).toFixed(2) + ' GB' : 'N/A'
    }
  };
}

/**
 * Action: Danh sách File & Thư mục
 */
async function handleListFiles(token: string, input: any, defaultFolder?: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  const folderId = input.folderId || defaultFolder;
  const pageSize = Math.min(Number(input.pageSize) || 50, 100);

  let queryConditions: string[] = ['trashed = false'];

  if (folderId) {
    queryConditions.push(`'${folderId}' in parents`);
  }

  if (input.q) {
    queryConditions.push(`(${input.q})`);
  }

  const qStr = queryConditions.join(' and ');

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set('q', qStr);
  url.searchParams.set('orderBy', 'folder,modifiedTime desc');
  url.searchParams.set(
    'fields',
    'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,thumbnailLink,iconLink)'
  );

  if (input.pageToken) {
    url.searchParams.set('pageToken', input.pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi Google Drive API (list_files): ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return {
    success: true,
    files: data.files || [],
    nextPageToken: data.nextPageToken || null
  };
}

/**
 * Action: Upload File (Nhiều nguồn: Web URL, Base64 Data URI, hoặc Text)
 */
async function handleUploadFile(token: string, input: any, defaultFolder?: string) {
  const fileName = input.fileName || input.name;
  if (!fileName) throw new Error('Cần cung cấp tên file (fileName) khi upload.');

  const folderId = input.folderId || defaultFolder;
  const mimeType = input.mimeType || 'application/octet-stream';
  const description = input.description || '';

  let fileBuffer: Uint8Array;

  // Trường hợp 1: fileUrl được cung cấp
  if (input.fileUrl) {
    if (input.fileUrl.startsWith('data:')) {
      // Base64 Data URI
      const base64Data = input.fileUrl.split(',')[1];
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else if (input.fileUrl.startsWith('http://') || input.fileUrl.startsWith('https://')) {
      // Fetch từ Remote URL
      const fetchRes = await fetch(input.fileUrl);
      if (!fetchRes.ok) throw new Error(`Không thể tải file từ source URL: ${fetchRes.statusText}`);
      const arrayBuf = await fetchRes.arrayBuffer();
      fileBuffer = new Uint8Array(arrayBuf);
    } else {
      // Giả định là chuỗi Base64 thuần
      fileBuffer = Buffer.from(input.fileUrl, 'base64');
    }
  } else if (input.content) {
    fileBuffer = Buffer.from(input.content, 'utf-8');
  } else {
    throw new Error('Cần cung cấp fileUrl hoặc content để upload lên Drive.');
  }

  // Chuẩn bị Multipart Body
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: mimeType,
    description: description
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const multipartRequestBody = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + `Content-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(closeDelimiter)
  ]);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s cho upload

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': multipartRequestBody.length.toString()
      },
      body: multipartRequestBody,
      signal: controller.signal
    }
  );

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi Google Drive API (upload_file): ${res.status} - ${errText}`);
  }

  const uploadedFile = await res.json();
  return {
    success: true,
    fileId: uploadedFile.id,
    name: uploadedFile.name,
    mimeType: uploadedFile.mimeType,
    size: uploadedFile.size,
    webViewLink: uploadedFile.webViewLink,
    webContentLink: uploadedFile.webContentLink
  };
}

/**
 * Action: Tạo Thư mục mới
 */
async function handleCreateFolder(token: string, input: any, defaultFolder?: string) {
  const folderName = input.folderName || input.name;
  if (!folderName) throw new Error('Cần cung cấp tên thư mục (folderName).');

  const parentId = input.parentFolderId || defaultFolder;

  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi Google Drive API (create_folder): ${res.status} - ${errText}`);
  }

  const createdFolder = await res.json();
  return {
    success: true,
    folderId: createdFolder.id,
    name: createdFolder.name,
    mimeType: createdFolder.mimeType,
    webViewLink: createdFolder.webViewLink
  };
}

/**
 * Action: Lấy Direct Stream Link (phục vụ Upload YouTube / Facebook)
 */
async function handleGetStreamLink(token: string, input: any) {
  const fileId = input.fileId;
  if (!fileId) throw new Error('Cần cung cấp ID file (fileId).');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  // Lấy thông tin metadata file trước
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webContentLink,webViewLink`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    }
  );

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi Google Drive API (get_stream_link): ${res.status} - ${errText}`);
  }

  const meta = await res.json();

  return {
    success: true,
    fileId: meta.id,
    name: meta.name,
    mimeType: meta.mimeType,
    size: meta.size,
    directStreamUrl: `https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`,
    webContentLink: meta.webContentLink || `https://drive.google.com/uc?export=download&id=${meta.id}`,
    webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${meta.id}/view`,
    authHeader: `Bearer ${token}`
  };
}

/**
 * Action: Xem chi tiết thuộc tính File
 */
async function handleGetFileMetadata(token: string, input: any) {
  const fileId = input.fileId;
  if (!fileId) throw new Error('Cần cung cấp ID file (fileId).');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,md5Checksum,videoMediaMetadata,imageMediaMetadata,webViewLink,webContentLink`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    }
  );

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi Google Drive API (get_file_metadata): ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return {
    success: true,
    file: data
  };
}

/**
 * Action: Xóa File trên Drive (Xóa vĩnh viễn hoặc Trash)
 */
async function handleDeleteFile(token: string, input: any) {
  const fileId = input.fileId;
  if (!fileId) throw new Error('Cần cung cấp ID file (fileId).');

  const permanent = String(input.permanent) === 'true';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let res: Response;

  if (permanent) {
    // Xóa vĩnh viễn
    res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    });
  } else {
    // Chuyển vào Thùng rác
    res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trashed: true }),
      signal: controller.signal
    });
  }

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi Google Drive API (delete_file): ${res.status} - ${errText}`);
  }

  return {
    success: true,
    fileId: fileId,
    mode: permanent ? 'permanently_deleted' : 'trashed'
  };
}
