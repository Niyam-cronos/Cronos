import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function ensureUploadDir(subdir: string): Promise<string> {
  const dir = path.join(UPLOAD_DIR, subdir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function uploadFile(
  bucket: string,
  filePath: string,
  file: Buffer,
  _contentType: string
): Promise<string | null> {
  const dir = await ensureUploadDir(bucket);
  const fullPath = path.join(dir, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, file);
  return `/uploads/${bucket}/${filePath}`;
}

export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, bucket, filePath);
  await fs.unlink(fullPath).catch(() => {});
}

export function getUploadsDir(): string {
  return UPLOAD_DIR;
}
