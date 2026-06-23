import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || 'ai2hero-social';
const r2PublicUrl = process.env.R2_PUBLIC_URL; // Ví dụ: https://pub-xxx.r2.dev

// Khởi tạo S3Client kết nối với Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId || '',
    secretAccessKey: r2SecretAccessKey || '',
  },
});

/**
 * Upload file dạng Buffer lên Cloudflare R2
 * @param file Buffer nội dung tệp
 * @param key Đường dẫn lưu trữ (ví dụ: social/avatar/user-1.png)
 * @param contentType Định dạng mime type (ví dụ: image/png)
 * @returns Đường dẫn URL truy cập công khai
 */
export async function uploadFile(file: Buffer, key: string, contentType: string): Promise<string> {
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.warn('R2 credentials are not configured in environment variables. Falling back to local storage.');
    
    const publicUploadPath = path.join(process.cwd(), 'public', 'uploads', key);
    await mkdir(path.dirname(publicUploadPath), { recursive: true });
    await writeFile(publicUploadPath, file);
    
    return `/uploads/${key}`;
  }

  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Định dạng public URL
  const baseUrl = r2PublicUrl?.replace(/\/$/, '') || `https://${r2BucketName}.r2.dev`;
  return `${baseUrl}/${key}`;
}

/**
 * Xóa file trên Cloudflare R2 theo key
 * @param key Đường dẫn lưu trữ tệp cần xóa
 */
export async function deleteFile(key: string): Promise<void> {
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.warn('R2 credentials are not configured in environment variables.');
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: r2BucketName,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Tạo Presigned PUT URL để client/worker tải tệp trực tiếp lên R2 (hoặc local fallback)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const baseUrl = r2PublicUrl?.replace(/\/$/, '') || `https://${r2BucketName}.r2.dev`;
  
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.warn('R2 credentials are not configured in environment variables. Falling back to local upload endpoint.');
    // Fallback: Trả về URL để upload qua endpoint local
    const uploadUrl = `/api/hero-dub/local-upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`;
    const publicUrl = `/uploads/${key}`;
    return { uploadUrl, publicUrl };
  }

  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  const publicUrl = `${baseUrl}/${key}`;

  return { uploadUrl, publicUrl };
}