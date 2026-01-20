import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist";

// Standard way to load worker in Node for pdfjs-dist
const setupWorker = async () => {
    if (typeof window === 'undefined' && !(pdfjs as any).GlobalWorkerOptions.workerSrc) {
        // We use the minified worker for production stability
        (pdfjs as any).GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
    }
};

export async function PUT(request: NextRequest) {
    try {
        await setupWorker();

        const buffer = await request.arrayBuffer();
        if (!buffer || buffer.byteLength === 0) {
            return NextResponse.json({ error: "No PDF data received" }, { status: 400 });
        }

        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            isEvalSupported: false // Security best practice for Node
        });

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const pages = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            // Structure to hold text blocks
            const blocks = textContent.items.map((item: any) => {
                const [scaleX, skewY, skewX, scaleY, x, y] = item.transform;

                return {
                    text: item.str,
                    x: x,
                    y: viewport.height - y - (Math.abs(scaleY) || 12),
                    width: item.width,
                    height: item.height || Math.abs(scaleY) || 12,
                    fontSize: Math.abs(scaleY),
                    font: item.fontName,
                    rotation: Math.atan2(skewY, scaleX) * (180 / Math.PI)
                };
            });

            // Group blocks by Y coordinate to reduce "garbled" text (simple heuristic)
            // If they are on the same line and close to each other, merge them
            const groupedBlocks: any[] = [];
            const sortedBlocks = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);

            let currentBlock: any = null;
            const Y_THRESHOLD = 3; // pixels
            const X_THRESHOLD = 5; // pixels

            for (const block of sortedBlocks) {
                if (!currentBlock) {
                    currentBlock = { ...block };
                    continue;
                }

                const sameLine = Math.abs(block.y - currentBlock.y) < Y_THRESHOLD;
                const closeX = (block.x - (currentBlock.x + currentBlock.width)) < X_THRESHOLD;

                if (sameLine && closeX) {
                    currentBlock.text += block.text;
                    currentBlock.width += block.width;
                } else {
                    groupedBlocks.push(currentBlock);
                    currentBlock = { ...block };
                }
            }
            if (currentBlock) groupedBlocks.push(currentBlock);

            pages.push({
                pageNumber: i,
                width: viewport.width,
                height: viewport.height,
                blocks: groupedBlocks,
                images: [],
                backgroundImage: null
            });
        }

        return NextResponse.json({ pages });
    } catch (error) {
        console.error("PDF Extraction Error:", error);
        return NextResponse.json({
            error: "Failed to extract PDF",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
