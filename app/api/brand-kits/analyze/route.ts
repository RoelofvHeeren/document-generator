import { NextRequest, NextResponse } from 'next/server';
import { analyzeBrandKitFolder, formatFileSize } from '@/lib/brand-kit-analyzer';

/**
 * POST /api/brand-kits/analyze
 * Analyze a local brand kit folder and return structured information
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { folderPath } = body;

        if (!folderPath) {
            return NextResponse.json(
                { error: 'folderPath is required' },
                { status: 400 }
            );
        }

        // Analyze the folder
        const analysis = await analyzeBrandKitFolder(folderPath);

        // Format response with human-readable sizes
        const response = {
            success: true,
            analysis: {
                ...analysis,
                totalSizeFormatted: formatFileSize(analysis.totalSize),
                summary: {
                    totalItems: analysis.totalItems,
                    logoCount: countLogos(analysis.logos),
                    fontCount: analysis.fonts.length,
                    documentCount: analysis.documents.length,
                    sourceFileCount: analysis.sourceFiles.length,
                    subBrands: Object.keys(analysis.logos),
                    colorVariants: getUniqueColorVariants(analysis.logos),
                    logoTypes: getUniqueLogoTypes(analysis.logos)
                }
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error analyzing brand kit:', error);
        return NextResponse.json(
            { error: 'Failed to analyze brand kit folder', details: String(error) },
            { status: 500 }
        );
    }
}

// Helper functions
function countLogos(logos: Record<string, Record<string, Record<string, unknown[]>>>): number {
    let count = 0;
    for (const subBrand of Object.values(logos)) {
        for (const colorVariant of Object.values(subBrand)) {
            for (const logoTypes of Object.values(colorVariant)) {
                count += (logoTypes as unknown[]).length;
            }
        }
    }
    return count;
}

function getUniqueColorVariants(logos: Record<string, Record<string, unknown>>): string[] {
    const variants = new Set<string>();
    for (const subBrand of Object.values(logos)) {
        for (const variant of Object.keys(subBrand)) {
            variants.add(variant);
        }
    }
    return Array.from(variants);
}

function getUniqueLogoTypes(logos: Record<string, Record<string, Record<string, unknown>>>): string[] {
    const types = new Set<string>();
    for (const subBrand of Object.values(logos)) {
        for (const colorVariant of Object.values(subBrand)) {
            for (const logoType of Object.keys(colorVariant)) {
                types.add(logoType);
            }
        }
    }
    return Array.from(types);
}
