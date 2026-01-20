import { NextRequest, NextResponse } from "next/server";

/**
 * PDF Import Route - Node-Native (pdfjs-dist)
 * 
 * FIX: This version disables the PDF.js worker to run entirely in-process.
 * This prevents the "Cannot find module 'pdf.worker.mjs'" errors in production.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function PUT(request: NextRequest) {
    try {
        // 1. POLYFILL DOMMatrix (Required by pdfjs-dist v5+)
        if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
            (global as any).DOMMatrix = class DOMMatrix {
                a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
                const arrayBuffer = await req.arrayBuffer();
                const fileName = req.headers.get("X-File-Name") || "document.pdf";

                if(!arrayBuffer || arrayBuffer.byteLength === 0) {
                return NextResponse.json({ error: "Empty file data" }, { status: 400 });
            }

            const uint8Array = new Uint8Array(arrayBuffer);

            // Dynamic import of pdf-parse to avoid build-time issues
            const { PDFParse } = await import("pdf-parse");
            const parser = new PDFParse({ data: uint8Array });

            const pdf = await parser.load();
            const numPages = pdf.numPages;
            const pages = [];

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 });
                const textContent = await page.getTextContent();

                // Map text items to our schema
                const textBlocks = textContent.items
                    .filter((item: any) => item.str.trim().length > 0)
                    .map((item: any) => {
                        const transform = item.transform;
                        // PDF coordinates are bottom-up, convert to top-down
                        // transform: [scaleX, skewY, skewX, scaleY, x, y]
                        return {
                            id: Math.random().toString(36).substr(2, 9),
                            type: "text",
                            content: item.str,
                            x: transform[4],
                            // Flip Y coordinate: viewport.height - y
                            y: viewport.height - transform[5],
                            width: item.width,
                            height: item.height,
                            rotation: Math.atan2(transform[1], transform[0]) * (180 / Math.PI),
                            font: item.fontName,
                            fontSize: Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1])
                        };
                    });

                // Heuristic for grouping adjacent text blocks by Y and X
                const groupedBlocks: any[] = [];
                const sortedBlocks = [...textBlocks].sort((a, b) => {
                    if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
                    return a.y - b.y;
                });

                let currentGroup: any = null;
                for (const block of sortedBlocks) {
                    if (!currentGroup) {
                        currentGroup = { ...block };
                    } else {
                        const yDiff = Math.abs(block.y - currentGroup.y);
                        const xDiff = block.x - (currentGroup.x + currentGroup.width);

                        // If on same "line" (yDiff < 5) and close horizontally (xDiff < 20)
                        if (yDiff < 5 && xDiff < 20) {
                            currentGroup.content += " " + block.content;
                            currentGroup.width = (block.x + block.width) - currentGroup.x;
                        } else {
                            groupedBlocks.push(currentGroup);
                            currentGroup = { ...block };
                        }
                    }
                }
                if (currentGroup) groupedBlocks.push(currentGroup);

                pages.push({
                    pageNumber: i,
                    width: viewport.width,
                    height: viewport.height,
                    components: groupedBlocks
                });
            }

            await parser.destroy();

            return NextResponse.json({
                success: true,
                fileName,
                pages
            });

        } catch (err: any) {
            console.error("PDF Extraction Error:", err);
            return NextResponse.json({
                error: "Failed to extract PDF",
                details: err.message
            }, { status: 500 });
        }
    }
