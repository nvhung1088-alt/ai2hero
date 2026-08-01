import { ConnectorDefinition } from '../types';

export const googleDriveConnector: ConnectorDefinition = {
  slug: 'google-drive',
  name: 'Google Drive',
  icon: 'HardDrive',
  category: 'storage',
  description: 'Quản lý kho lưu trữ cloud, tự động đồng bộ folder local và trích xuất luồng Media cho YouTube / Facebook.',
  authType: 'oauth2',
  badge: {
    text: 'Essential Cloud Storage',
    variant: 'premium'
  },
  authFields: [
    {
      name: 'accountEmail',
      label: 'Địa chỉ Gmail đại diện',
      type: 'text',
      required: false,
      placeholder: 'example@gmail.com',
      helpText: 'Nhập địa chỉ Gmail của tài khoản này (Ví dụ: account@gmail.com) để dễ chọn đúng tài khoản khi gán thư mục quét'
    },
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      helpText: 'OAuth 2.0 Client ID lấy từ Google Cloud Console (APIs & Services > Credentials)'
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      secret: true,
      helpText: 'OAuth 2.0 Client Secret tương ứng'
    },
    {
      name: 'refreshToken',
      label: 'Refresh Token',
      type: 'password',
      required: true,
      secret: true,
      helpText: 'Refresh Token dài hạn có scope https://www.googleapis.com/auth/drive.file hoặc https://www.googleapis.com/auth/drive'
    },
    {
      name: 'defaultFolderId',
      label: 'Thư mục Mặc định (Root Folder ID)',
      type: 'text',
      required: false,
      placeholder: '1a2b3c4d5e...',
      helpText: 'ID thư mục Drive mặc định dùng để lưu trữ file (Lấy từ đoạn mã cuối của URL folder trên Drive)'
    }
  ],
  actions: [
    {
      slug: 'get_about',
      name: 'Kiểm tra Dung lượng & Tài khoản',
      description: 'Lấy thông tin chủ sở hữu và hạn mức dung lượng đĩa cloud (Storage Quota).',
      group: 'Quản trị Tài khoản',
      httpMethod: 'GET',
      endpoint: 'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
      status: 'ready',
      outputFields: ['user', 'storageQuota'],
      aiInstruction: 'Gọi action này để kiểm tra xem tài khoản Google Drive còn bao nhiêu GB trống trước khi upload file lớn.',
      inputSchema: [],
      testStrategy: 'direct'
    },
    {
      slug: 'list_files',
      name: 'Danh sách File & Folder',
      description: 'Quét và tìm kiếm file/thư mục trong Google Drive theo từ khóa hoặc ID thư mục mẹ.',
      group: 'Quản lý Tập tin',
      httpMethod: 'GET',
      endpoint: 'https://www.googleapis.com/drive/v3/files',
      status: 'ready',
      outputFields: ['files', 'nextPageToken'],
      aiInstruction: 'Bước 1: Nhập folderId hoặc câu lệnh truy vấn q (ví dụ: name contains "video").\nBước 2: Trả về danh sách file.',
      inputSchema: [
        { name: 'folderId', label: 'ID Thư mục mẹ', type: 'text', required: false, placeholder: '1a2b3c...', helpText: 'Bỏ trống để lấy ở Root Drive' },
        { name: 'q', label: 'Query nâng cao (Google Drive Query)', type: 'text', required: false, placeholder: "mimeType = 'video/mp4' and trashed = false" },
        { name: 'pageSize', label: 'Số lượng tối đa', type: 'text', required: false, placeholder: '50' },
        { name: 'pageToken', label: 'Page Token (Phân trang)', type: 'text', required: false }
      ],
      testStrategy: 'direct'
    },
    {
      slug: 'upload_file',
      name: 'Upload File lên Drive',
      description: 'Tải tệp tin (video, hình ảnh, tài liệu) lên thư mục Google Drive được chỉ định.',
      group: 'Quản lý Tập tin',
      httpMethod: 'POST',
      endpoint: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      status: 'ready',
      outputFields: ['id', 'name', 'mimeType', 'size', 'webViewLink', 'webContentLink'],
      aiInstruction: 'Tải file lên Google Drive. Cần cung cấp fileName, fileUrl hoặc stream buffer, và folderId.',
      inputSchema: [
        { name: 'fileName', label: 'Tên file trên Drive', type: 'text', required: true, placeholder: 'video_clip_01.mp4' },
        { name: 'fileUrl', label: 'URL nguồn hoặc Base64', type: 'text', required: true, placeholder: 'https://... hoặc data:video/mp4;base64,...' },
        { name: 'folderId', label: 'ID Thư mục lưu trữ', type: 'text', required: false, helpText: 'Nơi lưu file. Nếu trống sẽ dùng Thư mục mặc định' },
        { name: 'mimeType', label: 'MIME Type', type: 'text', required: false, placeholder: 'video/mp4' },
        { name: 'description', label: 'Ghi chú / Description', type: 'textarea', required: false }
      ],
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_files',
        path: 'files[0].id',
        inputKey: 'folderId'
      }
    },
    {
      slug: 'create_folder',
      name: 'Tạo Thư mục mới',
      description: 'Khởi tạo thư mục mới trên Google Drive để phân loại dữ liệu.',
      group: 'Quản lý Tập tin',
      httpMethod: 'POST',
      endpoint: 'https://www.googleapis.com/drive/v3/files',
      status: 'ready',
      outputFields: ['id', 'name', 'mimeType'],
      aiInstruction: 'Tạo thư mục mới để chứa dữ liệu theo workspace hoặc chiến dịch.',
      inputSchema: [
        { name: 'folderName', label: 'Tên Thư mục', type: 'text', required: true, placeholder: 'Kênh TikTok #01' },
        { name: 'parentFolderId', label: 'ID Thư mục cha', type: 'text', required: false, helpText: 'Bỏ trống để tạo ở Root Drive' }
      ],
      testStrategy: 'direct'
    },
    {
      slug: 'get_stream_link',
      name: 'Lấy Direct Stream Link (Đăng YT/FB)',
      description: 'Lấy đường dẫn trực tiếp (Direct Media URL / Pipe Stream) từ Google Drive để upload sang YouTube hoặc Facebook.',
      group: 'Media & Streaming',
      httpMethod: 'GET',
      endpoint: 'https://www.googleapis.com/drive/v3/files/{fileId}?alt=media',
      status: 'ready',
      outputFields: ['fileId', 'directStreamUrl', 'webContentLink', 'webViewLink', 'mimeType', 'size'],
      aiInstruction: 'Dùng action này để bốc tách Direct Stream Link phát video hoặc trích xuất luồng truyền thẳng sang YouTube/Facebook API.',
      inputSchema: [
        { name: 'fileId', label: 'ID File Google Drive', type: 'text', required: true, placeholder: '1x2y3z...' }
      ],
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_files',
        path: 'files[0].id',
        inputKey: 'fileId'
      }
    },
    {
      slug: 'get_file_metadata',
      name: 'Xem Chi tiết File',
      description: 'Lấy đầy đủ thông tin thuộc tính (size, md5Checksum, createdTime, videoMediaMetadata) của file.',
      group: 'Quản lý Tập tin',
      httpMethod: 'GET',
      endpoint: 'https://www.googleapis.com/drive/v3/files/{fileId}',
      status: 'ready',
      outputFields: ['id', 'name', 'mimeType', 'size', 'createdTime', 'md5Checksum', 'videoMediaMetadata'],
      aiInstruction: 'Xem chi tiết thuộc tính file trên Google Drive.',
      inputSchema: [
        { name: 'fileId', label: 'ID File', type: 'text', required: true, placeholder: '1x2y3z...' }
      ],
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_files',
        path: 'files[0].id',
        inputKey: 'fileId'
      }
    },
    {
      slug: 'delete_file',
      name: 'Xóa File trên Drive',
      description: 'Xóa vĩnh viễn hoặc chuyển file vào Thùng rác (Trash) của Google Drive.',
      group: 'Quản lý Tập tin',
      httpMethod: 'DELETE',
      endpoint: 'https://www.googleapis.com/drive/v3/files/{fileId}',
      status: 'ready',
      outputFields: ['success', 'fileId'],
      aiInstruction: 'Xóa file khỏi Google Drive.',
      inputSchema: [
        { name: 'fileId', label: 'ID File cần xóa', type: 'text', required: true, placeholder: '1x2y3z...' },
        { name: 'permanent', label: 'Xóa vĩnh viễn (true/false)', type: 'select', required: false, options: ['false', 'true'], helpText: 'Mặc định false (chỉ chuyển vào thùng rác)' }
      ],
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_files',
        path: 'files[0].id',
        inputKey: 'fileId'
      }
    }
  ],
  popular: true,
  setupGuide: '<div class="space-y-3"><p><b>1. Tạo OAuth Client ID:</b> Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-blue-500 underline">Google Cloud</a>. Nếu chưa có Project, hãy tạo mới và bật <b>Google Drive API</b>. Chọn <i>Create Credentials > OAuth client ID</i>. Chọn loại <b>Web application</b>. <span class="text-amber-400 font-semibold">Quan trọng:</span> Ở phần <b>Authorized redirect URIs</b>, điền <code>https://developers.google.com/oauthplayground</code>. Copy lại Client ID và Client Secret.</p><details class="group bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 transition-colors"><summary class="font-medium text-blue-400 cursor-pointer select-none">2. Hướng dẫn chi tiết lấy Refresh Token (Click để mở)</summary><div class="mt-3 text-sm text-slate-300 space-y-2 pl-4 border-l-2 border-slate-700"><p>1. Truy cập <a href="https://developers.google.com/oauthplayground/" target="_blank" class="text-blue-400 hover:underline">OAuth 2.0 Playground</a>.</p><p>2. Ở góc trên bên phải, bấm <b>Bánh răng ⚙️</b>, tích chọn <i>Use your own OAuth credentials</i>. Dán Client ID & Secret vào đây rồi đóng bảng lại.</p><p>3. Ở cột bên trái, cuộn tìm <b>Drive API v3</b>, tích chọn <code>https://www.googleapis.com/auth/drive</code>, rồi bấm nút xanh <b>Authorize APIs</b> ở dưới cùng.</p><p>4. <i>(Mẹo: Nếu Google báo lỗi 403, hãy về trang Google Cloud > mục OAuth consent screen > kéo xuống thêm email của bạn vào <b>Test users</b>)</i>.</p><p>5. Đăng nhập Gmail và Allow. Màn hình sẽ tự chuyển sang Step 2. Bấm <b>Exchange authorization code for tokens</b>.</p><p>6. Ở nửa màn hình bên phải, copy chuỗi mã trong ngoặc kép ở dòng <code>"refresh_token"</code> (thường bắt đầu bằng 1//0...) và dán vào form bên dưới.</p></div></details></div>',
  lifecycle: {
    updatePolicy: 'auto_sync',
    healthCheckEndpoint: 'https://www.googleapis.com/drive/v3/about?fields=kind',
    documentationUrl: 'https://developers.google.com/drive/api/guides/about-sdk'
  }
};
