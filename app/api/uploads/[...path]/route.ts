import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;

    // Prevent directory traversal
    const safePath = params.path.join('/').replace(/\.\./g, '');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, safePath);

    try {
        const file = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();

        let contentType = 'application/octet-stream';

        const contentTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.otf': 'font/otf',
            '.ttf': 'font/ttf',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2'
        };

        if (contentTypes[ext]) {
            contentType = contentTypes[ext];
        }

        return new NextResponse(file, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (error) {
        return new NextResponse('File not found', { status: 404 });
    }
}
