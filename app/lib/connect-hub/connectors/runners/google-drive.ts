export async function runGoogleDrive(
  creds: Record<string, string>,
  action: string,
  input: any
): Promise<any> {
  // Demo mock runner for Google Drive
  // Mọi kết nối OAuth2 của Drive sẽ lưu credentials dưới dạng JSON chứa { access_token, refresh_token }

  const accessToken = creds.access_token || creds.accessToken;
  if (!accessToken) {
    throw new Error('Không tìm thấy Access Token cho Google Drive. Vui lòng kết nối lại.');
  }

  if (action === 'upload_file') {
    // API thật sẽ dùng fetch để POST file_content/base64 lên Google Drive API
    // https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
    
    // MOCK RESPONSE DO CHƯA CÓ DEPENDENCIES GAPI CHUẨN
    const { filename, base64Content } = input;
    
    console.log(`[Google Drive Runner] MOCK Uploading ${filename} to Drive...`);
    
    // Giả lập trả về fileId như thật
    return {
      success: true,
      fileId: 'mock-google-drive-file-id-' + Date.now(),
      webContentLink: 'https://drive.google.com/uc?export=view&id=mock-id',
      webViewLink: 'https://drive.google.com/file/d/mock-id/view'
    };
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ trên Google Drive runner.`);
}
