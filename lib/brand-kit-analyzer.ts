import { promises as fs } from 'fs';
import path from 'path';

// Types for brand kit analysis
export interface AnalyzedAsset {
    type: 'logo' | 'font' | 'document' | 'source';
    category: string;     // e.g., "Homes/Black/FullLogo"
    subBrand?: string;    // e.g., "Homes", "Properties"
    colorVariant?: string; // e.g., "Black", "White"
    logoType?: string;    // e.g., "FullLogo", "AveLogo", "SecondaryMark"
    name: string;
    format: string;       // png, jpg, eps, otf, pdf, ai
    originalPath: string;
    webPath?: string;     // Path in public folder (for web assets)
    size: number;
}

export interface LogoCategory {
    subBrand: string;
    colorVariant: string;
    logos: {
        [logoType: string]: AnalyzedAsset[];
    };
}

export interface BrandKitAnalysis {
    name: string;
    totalItems: number;
    totalSize: number;
    logos: {
        [subBrand: string]: {
            [colorVariant: string]: {
                [logoType: string]: AnalyzedAsset[];
            };
        };
    };
    fonts: AnalyzedAsset[];
    documents: AnalyzedAsset[];
    sourceFiles: AnalyzedAsset[];
}

// File extension categories
const LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.eps', '.ai'];
const FONT_EXTENSIONS = ['.otf', '.ttf', '.woff', '.woff2'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];
const SOURCE_EXTENSIONS = ['.ai', '.psd', '.sketch', '.fig', '.xd'];
const WEB_SAFE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];

// Logo type patterns to detect from filename
const LOGO_TYPE_PATTERNS = [
    'FullLogo',
    'AveLogo',
    'SecondaryMark2',
    'SecondaryMark',
    'StackedLogo',
    'Icon',
    'Mark',
    'Wordmark',
    'Logo'
];

// Color variant patterns
const COLOR_VARIANT_PATTERNS = ['Black', 'White', 'Color', 'RGB', 'CMYK'];

/**
 * Analyze a brand kit folder and categorize all assets
 */
export async function analyzeBrandKitFolder(folderPath: string): Promise<BrandKitAnalysis> {
    const analysis: BrandKitAnalysis = {
        name: path.basename(folderPath),
        totalItems: 0,
        totalSize: 0,
        logos: {},
        fonts: [],
        documents: [],
        sourceFiles: []
    };

    await scanDirectory(folderPath, '', analysis);

    return analysis;
}

async function scanDirectory(
    basePath: string,
    relativePath: string,
    analysis: BrandKitAnalysis
): Promise<void> {
    const currentPath = path.join(basePath, relativePath);

    try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            // Skip hidden files and common ignore patterns
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }

            const entryRelativePath = path.join(relativePath, entry.name);
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                // Recurse into subdirectories
                await scanDirectory(basePath, entryRelativePath, analysis);
            } else {
                // Analyze the file
                const asset = await analyzeFile(fullPath, entryRelativePath, basePath);
                if (asset) {
                    analysis.totalItems++;
                    analysis.totalSize += asset.size;

                    switch (asset.type) {
                        case 'logo':
                            addLogoToAnalysis(asset, analysis);
                            break;
                        case 'font':
                            analysis.fonts.push(asset);
                            break;
                        case 'document':
                            analysis.documents.push(asset);
                            break;
                        case 'source':
                            analysis.sourceFiles.push(asset);
                            break;
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error);
    }
}

async function analyzeFile(
    fullPath: string,
    relativePath: string,
    basePath: string
): Promise<AnalyzedAsset | null> {
    const ext = path.extname(fullPath).toLowerCase();
    const fileName = path.basename(fullPath, ext);
    const dirPath = path.dirname(relativePath);

    try {
        const stats = await fs.stat(fullPath);

        // Determine file type
        let type: AnalyzedAsset['type'];

        if (FONT_EXTENSIONS.includes(ext)) {
            type = 'font';
        } else if (SOURCE_EXTENSIONS.includes(ext) && !isLogoFile(fileName, dirPath)) {
            type = 'source';
        } else if (DOCUMENT_EXTENSIONS.includes(ext)) {
            type = 'document';
        } else if (LOGO_EXTENSIONS.includes(ext) || isLogoFile(fileName, dirPath)) {
            type = 'logo';
        } else {
            // Skip unknown file types
            return null;
        }

        const asset: AnalyzedAsset = {
            type,
            category: dirPath || 'root',
            name: fileName,
            format: ext.replace('.', ''),
            originalPath: fullPath,
            size: stats.size
        };

        // Extract logo-specific metadata
        if (type === 'logo') {
            const logoInfo = parseLogoFileName(fileName, dirPath);
            asset.subBrand = logoInfo.subBrand;
            asset.colorVariant = logoInfo.colorVariant;
            asset.logoType = logoInfo.logoType;
        }

        // Font metadata
        if (type === 'font') {
            const fontInfo = parseFontFileName(fileName);
            asset.category = fontInfo.family;
        }

        return asset;
    } catch (error) {
        console.error(`Error analyzing file ${fullPath}:`, error);
        return null;
    }
}

function isLogoFile(fileName: string, dirPath: string): boolean {
    const lowerFileName = fileName.toLowerCase();
    const lowerDirPath = dirPath.toLowerCase();

    // Check if in a logo-related directory
    if (lowerDirPath.includes('logo') ||
        lowerDirPath.includes('black') ||
        lowerDirPath.includes('white') ||
        lowerDirPath.includes('homes') ||
        lowerDirPath.includes('properties') ||
        lowerDirPath.includes('cities')) {
        return true;
    }

    // Check if filename contains logo patterns
    return lowerFileName.includes('logo') ||
        lowerFileName.includes('mark') ||
        lowerFileName.includes('icon');
}

interface LogoInfo {
    subBrand: string;
    colorVariant: string;
    logoType: string;
}

function parseLogoFileName(fileName: string, dirPath: string): LogoInfo {
    const parts = dirPath.split(path.sep).filter(Boolean);

    let subBrand = 'Primary';
    let colorVariant = 'Default';
    let logoType = 'Logo';

    // Extract from directory path
    for (const part of parts) {
        const lowerPart = part.toLowerCase();

        if (lowerPart === 'homes' || lowerPart.includes('home')) {
            subBrand = 'Homes';
        } else if (lowerPart === 'properties' || lowerPart.includes('prop')) {
            subBrand = 'Properties';
        } else if (lowerPart === 'cities' || lowerPart.includes('city')) {
            subBrand = 'Cities';
        }

        if (lowerPart === 'black') {
            colorVariant = 'Black';
        } else if (lowerPart === 'white') {
            colorVariant = 'White';
        }
    }

    // Extract from filename
    for (const pattern of LOGO_TYPE_PATTERNS) {
        if (fileName.includes(pattern)) {
            logoType = pattern;
            break;
        }
    }

    // Extract color variant from filename if not found in path
    if (colorVariant === 'Default') {
        for (const variant of COLOR_VARIANT_PATTERNS) {
            if (fileName.includes(variant)) {
                colorVariant = variant;
                break;
            }
        }
    }

    // Extract sub-brand from filename if not found in path
    if (subBrand === 'Primary') {
        if (fileName.toLowerCase().includes('homes') || fileName.includes('Homes')) {
            subBrand = 'Homes';
        } else if (fileName.toLowerCase().includes('prop') || fileName.includes('Prop')) {
            subBrand = 'Properties';
        }
    }

    return { subBrand, colorVariant, logoType };
}

interface FontInfo {
    family: string;
    weight: string;
    style: string;
}

function parseFontFileName(fileName: string): FontInfo {
    // Common font weight patterns
    const weights: { [key: string]: string } = {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'regular': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900'
    };

    const lowerFileName = fileName.toLowerCase();

    // Try to extract family name (usually before the weight)
    let family = fileName;
    let weight = '400';
    let style = 'normal';

    // Check for italic
    if (lowerFileName.includes('italic')) {
        style = 'italic';
        family = family.replace(/italic/gi, '');
    }

    // Find and extract weight
    for (const [name, value] of Object.entries(weights)) {
        if (lowerFileName.includes(name)) {
            weight = value;
            family = family.replace(new RegExp(name, 'gi'), '');
            break;
        }
    }

    // Clean up family name
    family = family.replace(/[-_]/g, ' ').trim();

    // Try to get just the font family name (first part before hyphen)
    const hyphenIndex = fileName.indexOf('-');
    if (hyphenIndex > 0) {
        family = fileName.substring(0, hyphenIndex);
    }

    return { family, weight, style };
}

function addLogoToAnalysis(asset: AnalyzedAsset, analysis: BrandKitAnalysis): void {
    const subBrand = asset.subBrand || 'Primary';
    const colorVariant = asset.colorVariant || 'Default';
    const logoType = asset.logoType || 'Logo';

    // Initialize nested structure if needed
    if (!analysis.logos[subBrand]) {
        analysis.logos[subBrand] = {};
    }
    if (!analysis.logos[subBrand][colorVariant]) {
        analysis.logos[subBrand][colorVariant] = {};
    }
    if (!analysis.logos[subBrand][colorVariant][logoType]) {
        analysis.logos[subBrand][colorVariant][logoType] = [];
    }

    analysis.logos[subBrand][colorVariant][logoType].push(asset);
}

/**
 * Copy web-safe assets to the public folder
 */
export async function copyAssetsToPublic(
    analysis: BrandKitAnalysis,
    publicBasePath: string,
    kitId: string
): Promise<{ logos: Record<string, string>; fonts: Record<string, string> }> {
    const destPath = path.join(publicBasePath, 'brand-kits', kitId);

    // Ensure destination directory exists
    await fs.mkdir(destPath, { recursive: true });
    await fs.mkdir(path.join(destPath, 'logos'), { recursive: true });
    await fs.mkdir(path.join(destPath, 'fonts'), { recursive: true });

    const copiedLogos: Record<string, string> = {};
    const copiedFonts: Record<string, string> = {};

    // Copy logos (only web-safe formats)
    for (const subBrand of Object.keys(analysis.logos)) {
        for (const colorVariant of Object.keys(analysis.logos[subBrand])) {
            for (const logoType of Object.keys(analysis.logos[subBrand][colorVariant])) {
                const logos = analysis.logos[subBrand][colorVariant][logoType];

                // Prefer PNG, then JPG, then SVG
                const webSafeLogo = logos.find(l => l.format === 'png') ||
                    logos.find(l => l.format === 'jpg' || l.format === 'jpeg') ||
                    logos.find(l => l.format === 'svg');

                if (webSafeLogo) {
                    const destFileName = `${subBrand}_${colorVariant}_${logoType}.${webSafeLogo.format}`;
                    const destFilePath = path.join(destPath, 'logos', destFileName);

                    await fs.copyFile(webSafeLogo.originalPath, destFilePath);

                    const webPath = `/brand-kits/${kitId}/logos/${destFileName}`;
                    copiedLogos[`${subBrand}/${colorVariant}/${logoType}`] = webPath;
                    webSafeLogo.webPath = webPath;
                }
            }
        }
    }

    // Copy fonts (OTF and TTF for web use)
    for (const font of analysis.fonts) {
        const destFileName = `${font.name}.${font.format}`;
        const destFilePath = path.join(destPath, 'fonts', destFileName);

        await fs.copyFile(font.originalPath, destFilePath);

        const webPath = `/brand-kits/${kitId}/fonts/${destFileName}`;
        copiedFonts[font.name] = webPath;
        font.webPath = webPath;
    }

    // Copy brand guide PDF if exists
    const brandGuide = analysis.documents.find(d =>
        d.format === 'pdf' &&
        (d.name.toLowerCase().includes('guide') || d.name.toLowerCase().includes('brand'))
    );

    if (brandGuide) {
        const destFileName = 'brand-guide.pdf';
        const destFilePath = path.join(destPath, destFileName);
        await fs.copyFile(brandGuide.originalPath, destFilePath);
        brandGuide.webPath = `/brand-kits/${kitId}/${destFileName}`;
    }

    return { logos: copiedLogos, fonts: copiedFonts };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
