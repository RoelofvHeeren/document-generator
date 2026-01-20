import { NextRequest, NextResponse } from "next/server";

/**
 * PDF Import Route - Node-Native (pdfjs-dist)
 * 
 * FIX: This route uses dynamic imports and a DOMMatrix polyfill 
 * to prevent build-time crashes and runtime reference errors in Node.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function PUT(request: NextRequest) {
    try {
        // 1. POLYFILL DOMMatrix (Required by pdfjs-dist v5+ in Node)
        if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
            (global as any).DOMMatrix = class DOMMatrix {
                a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
                constructor(init?: any) {
                    if (init instanceof Array && init.length === 6) {
                        this.a = init[0]; this.b = init[1]; this.c = init[2];
                        this.d = init[3]; this.e = init[4]; this.f = init[5];
                    }
                }
                multiply() { return this; }
                invertSelf() { return this; }
                preMultiplySelf() { return this; }
                multiplySelf() { return this; }
                translate() { return this; }
                scale() { return this; }
                static fromFloat32Array() { return new DOMMatrix(); }
                static fromFloat64Array() { return new DOMMatrix(); }
            };
        }

        // 2. DYNAMIC IMPORT (Prevents build-time static analysis crashes)
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

        // 3. CONFIGURE WORKER
        if (!(pdfjs as any).GlobalWorkerOptions.workerSrc) {
            try {
                (pdfjs as any).GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
            } catch (e) {
                // Fallback for environments where require.resolve behaves differently
                console.warn("Could not resolve worker path, trying default lookup");
            }
        }

        const buffer = await request.arrayBuffer();
        if (!buffer || buffer.byteLength === 0) {
            return NextResponse.json({ error: "No PDF data received" }, { status: 400 });
        }

        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            isEvalSupported: false,
            disableFontFace: true,
            verbosity: 0 // Keep it quiet
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

            // Group blocks by Y coordinate to reduce "garbled" text
            const groupedBlocks: any[] = [];
            const sortedBlocks = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);

            let currentBlock: any = null;
            const Y_THRESHOLD = 3;
            const X_THRESHOLD = 5;

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
