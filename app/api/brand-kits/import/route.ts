import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { analyzeBrandKitFolder, copyAssetsToPublic, formatFileSize } from '@/lib/brand-kit-analyzer';
import path from 'path';

/**
 * POST /api/brand-kits/import
 * Import a brand kit from a local folder path
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { folderPath, kitName } = body;

        if (!folderPath) {
            return NextResponse.json(
                { error: 'folderPath is required' },
                { status: 400 }
            );
        }

        const name = kitName || path.basename(folderPath);

        // Step 1: Analyze the folder
        console.log(`Analyzing brand kit folder: ${folderPath}`);
        const analysis = await analyzeBrandKitFolder(folderPath);

        // Step 2: Create or update brand kit in database
        // Check if a brand kit with this name already exists
        const existing = await prisma.brandKit.findFirst({
            where: { name }
        });

        let brandKit;
        const kitId = existing?.id || undefined;

        // Step 3: Copy assets to public folder
        const publicPath = path.join(process.cwd(), 'public');
        const { logos: copiedLogos, fonts: copiedFonts } = await copyAssetsToPublic(
            analysis,
            publicPath,
            kitId || 'temp'
        );

        // Step 4: Extract colors from existing brand kit or use defaults
        const existingColors = existing?.colors || [
            { id: '1', name: 'primary', value: '#000000', usage: 'Primary text and elements' },
            { id: '2', name: 'accent', value: '#139187', usage: 'Accent color for highlights' },
        ];

        // Step 5: Build structured logo categories from analysis
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

        // Step 8: Save or update brand kit
        if (existing) {
            brandKit = await prisma.brandKit.update({
                where: { id: existing.id },
                data: {
                    logoCategories,
                    fontFiles,
                    brandGuideUrl: brandGuide?.webPath || null,
                    sourceFolder: path.basename(folderPath),
                    updatedAt: new Date()
                }
            });
        } else {
            brandKit = await prisma.brandKit.create({
                data: {
                    name,
                    colors: existingColors,
                    fonts: {},
                    assets: {},
                    logoCategories,
                    fontFiles,
                    brandGuideUrl: brandGuide?.webPath || null,
                    sourceFolder: path.basename(folderPath)
                }
            });

            // Re-copy assets with actual kit ID
            await copyAssetsToPublic(analysis, publicPath, brandKit.id);

            // Update paths in database
            const updatedLogoCategories: Record<string, Record<string, Record<string, string>>> = {};
            for (const subBrand of Object.keys(analysis.logos)) {
                updatedLogoCategories[subBrand] = {};
                for (const colorVariant of Object.keys(analysis.logos[subBrand])) {
                    updatedLogoCategories[subBrand][colorVariant] = {};
                    for (const logoType of Object.keys(analysis.logos[subBrand][colorVariant])) {
                        const logos = analysis.logos[subBrand][colorVariant][logoType];
                        const webSafeLogo = logos.find(l => l.webPath);
                        if (webSafeLogo) {
                            const newPath = webSafeLogo.webPath!.replace('/temp/', `/${brandKit.id}/`);
                            updatedLogoCategories[subBrand][colorVariant][logoType] = newPath;
                        }
                    }
                }
            }

            await prisma.brandKit.update({
                where: { id: brandKit.id },
                data: { logoCategories: updatedLogoCategories }
            });
        }

        return NextResponse.json({
            success: true,
            brandKit: {
                id: brandKit.id,
                name: brandKit.name,
                sourceFolder: analysis.name
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
        console.error('Error importing brand kit:', error);
        return NextResponse.json(
            { error: 'Failed to import brand kit', details: String(error) },
            { status: 500 }
        );
    }
}
