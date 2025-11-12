import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { getUploadsDir, getFileUrlPath } from '@/lib/uploadPath';

export async function GET() {
  try {
    const uploadDir = getUploadsDir();

    try {
      const files = await readdir(uploadDir);
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filePath = join(uploadDir, file);
          const stats = await stat(filePath);
          return {
            name: file,
            size: stats.size,
            uploadedAt: stats.mtime.toISOString(),
            path: getFileUrlPath(file)
          };
        })
      );

      return NextResponse.json({ files: fileDetails });
    } catch (err) {
      // If directory doesn't exist, return empty array
      return NextResponse.json({ files: [] });
    }
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}
