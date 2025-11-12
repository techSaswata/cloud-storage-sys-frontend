import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { getUploadsDir, getFileUrlPath } from '@/lib/uploadPath';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to uploads directory
    const uploadDir = getUploadsDir();
    const filePath = join(uploadDir, file.name);

    // Create directory structure if it doesn't exist
    const fileDir = dirname(filePath);
    await mkdir(fileDir, { recursive: true });

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        path: getFileUrlPath(file.name)
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
