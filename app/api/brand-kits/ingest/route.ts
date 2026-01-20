import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { analyzeBrandKitFolder, copyAssetsToPublic, formatFileSize } from '@/lib/brand-kit-analyzer';
import path from 'path';
import { promises as fs } from 'fs';
import AdmZip from 'adm-zip';

/**
 * PUT /api/brand-kits/ingest
 * Upload and import a brand kit from a ZIP file
 * Using PUT to avoid Next.js Server Action method conflicts
 */
export async function PUT(request: NextRequest) {
    let tempDir: string | null = null;

    try {
        const searchParams = request.nextUrl.searchParams;
        const kitNameParam = searchParams.get('kitName');
        const fileNameEncoded = request.headers.get('x-file-name');
        const fileName = fileNameEncoded ? decodeURIComponent(fileNameEncoded) : 'brand-kit.zip';

        const buffer = await request.arrayBuffer();

        if (!buffer || buffer.byteLength === 0) {
            return NextResponse.json(
                { error: 'No file content uploaded' },
                { status: 400 }
            );
        }

        // Create temp directory for extraction
        const tempBase = path.join(process.cwd(), 'temp');
        await fs.mkdir(tempBase, { recursive: true });

        tempDir = path.join(tempBase, `brand-kit-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Save the uploaded ZIP file
        const zipPath = path.join(tempDir, fileName);
        await fs.writeFile(zipPath, Buffer.from(buffer));

        // Define kitName from param or filename
        const kitName = kitNameParam || fileName.replace('.zip', '');

        // Extract the ZIP file
        const extractDir = path.join(tempDir, 'extracted');
        await fs.mkdir(extractDir, { recursive: true });

        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractDir, true);
        } catch (unzipError) {
            console.error('Unzip failed:', unzipError);
            return NextResponse.json(
                { error: 'Failed to extract ZIP file. Please ensure it is a valid ZIP archive.' },
                { status: 400 }
            );
        }

        // Find the actual brand kit folder (might be nested)
        const entries = await fs.readdir(extractDir, { withFileTypes: true });
        let brandKitFolder = extractDir;

        // If there's only one directory in the extracted folder, use that
        const directories = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== '__MACOSX');
        if (directories.length === 1) {
            brandKitFolder = path.join(extractDir, directories[0].name);
        }

        const name = kitName;

        // Step 1: Analyze the folder
        console.log(`Analyzing brand kit folder: ${brandKitFolder}`);
        const analysis = await analyzeBrandKitFolder(brandKitFolder);

        // Step 2: Check for existing brand kit
        const existing = await prisma.brandKit.findFirst({
            where: { name }
        });

        let brandKit;

        // Step 3: Create or get kit ID for asset storage
        if (existing) {
            brandKit = existing;
        } else {
            // Create new brand kit first to get ID
            brandKit = await prisma.brandKit.create({
                data: {
                    name,
                    colors: [
                        { id: '1', name: 'primary', value: '#000000', usage: 'Primary text and elements' },
                        { id: '2', name: 'accent', value: '#139187', usage: 'Accent color for highlights' },
                    ],
                    fonts: {},
                    assets: {},
                    logoCategories: {},
                    fontFiles: [],
                    sourceFolder: name
                }
            });
        }

        // Step 4: Copy assets to uploads folder (persistent storage)
        const publicPath = path.join(process.cwd(), 'uploads');
        const { logos: copiedLogos, fonts: copiedFonts } = await copyAssetsToPublic(
            analysis,
            publicPath,
            brandKit.id
        );

        // Step 5: Build structured logo categories
        const logoCategories: Record<string, Record<string, Record<string, string>>> = {};

        for (const subBrand of Object.keys(analysis.logos)) {
            logoCategories[subBrand] = {};
            for (const colorVariant of Object.keys(analysis.logos[subBrand])) {
                logoCategories[subBrand][colorVariant] = {};
                for (const logoType of Object.keys(analysis.logos[subBrand][colorVariant])) {
                    const key = `${subBrand}/${colorVariant}/${logoType}`;
                    if (copiedLogos[key]) {
                        logoCategories[subBrand][colorVariant][logoType] = copiedLogos[key];
                    }
                }
            }
        }

        // Step 6: Build font files array
        const fontFiles = analysis.fonts.map(font => ({
            name: font.name,
            family: font.category,
            format: font.format,
            path: font.webPath || copiedFonts[font.name],
            originalPath: font.originalPath
        }));

        // Step 7: Get brand guide URL
        const brandGuide = analysis.documents.find(d =>
            d.format === 'pdf' &&
            (d.name.toLowerCase().includes('guide') || d.name.toLowerCase().includes('brand'))
        );

        // Step 8: Update brand kit with imported data
        brandKit = await prisma.brandKit.update({
            where: { id: brandKit.id },
            data: {
                logoCategories,
                fontFiles,
                brandGuideUrl: brandGuide?.webPath || null,
                sourceFolder: name,
                updatedAt: new Date()
            }
        });

        // Cleanup temp directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.warn('Failed to cleanup temp directory:', cleanupError);
        }

        return NextResponse.json({
            success: true,
            brandKit: {
                id: brandKit.id,
                name: brandKit.name,
                sourceFolder: name
            },
            analysis: {
                totalItems: analysis.totalItems,
                totalSize: formatFileSize(analysis.totalSize),
                summary: {
                    subBrands: Object.keys(analysis.logos),
                    logoCount: Object.values(copiedLogos).length,
                    fontCount: fontFiles.length,
                    documentCount: analysis.documents.length
                }
            }
        });
    } catch (error) {
        console.error('Error uploading brand kit:', error);

        // Cleanup on error
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp directory:', cleanupError);
            }
        }

        return NextResponse.json(
            { error: 'Failed to upload brand kit', details: String(error) },
            { status: 500 }
        );
    }
}

// App Router route segment config for handling large file uploads
export const maxDuration = 60; // Maximum execution time in seconds
export const dynamic = 'force-dynamic';
