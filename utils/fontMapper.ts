/**
 * Maps raw PDF font names to suitable web-safe fonts or Google Fonts.
 */
export const mapFont = (pdfFontName: string): string => {
    const font = pdfFontName.toLowerCase();

    // 1. Serifs (usually for headers/titles in business docs)
    if (font.includes("freight") || font.includes("georgia") || font.includes("serif")) {
        return "'Source Serif 4', 'Georgia', serif";
    }

    // 2. Sans-Serifs
    if (font.includes("inter") || font.includes("sans") || font.includes("arial") || font.includes("helvetica")) {
        return "'Inter', 'Helvetica Neue', Arial, sans-serif";
    }

    // 3. Monospaced (for data or code)
    if (font.includes("mono") || font.includes("courier") || font.includes("consolas")) {
        return "'JetBrains Mono', 'Courier New', monospace";
    }

    // 4. Specific common PDF fonts
    if (font.includes("times")) return "'Times New Roman', Times, serif";
    if (font.includes("verdana")) return "Verdana, sans-serif";
    if (font.includes("garamond")) return "'EB Garamond', Garamond, serif";

    // Default fallback to Inter
    return "'Inter', sans-serif";
};
