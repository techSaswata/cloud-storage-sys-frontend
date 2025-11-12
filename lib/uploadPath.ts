import { join } from 'path';

/**
 * Get the uploads directory path
 * Uses environment variable if set, otherwise defaults to public/uploads
 */
export function getUploadsDir(): string {
  const uploadsPath = process.env.UPLOADS_DIR || join(process.cwd(), 'public', 'uploads');
  return uploadsPath;
}

/**
 * Get the relative URL path for a file
 */
export function getFileUrlPath(filename: string): string {
  return `/uploads/${filename}`;
}
