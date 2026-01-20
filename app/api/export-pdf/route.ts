import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import { DocumentPage } from "@/types/document";

// NOTE: This usually requires a real browser or a connection to a headless browser service
// For local dev, we might need a full puppeteer install or point to Chrome executable.
// Since we installed 'puppeteer' (not core) in package.json, we can use it directly?
// Checked package.json: "puppeteer": "^24.1.0" is installed. Defaults to downloading Chrome.

import puppeteerLib from "puppeteer";

const generateComponentStyle = (comp: any) => {
  const baseStyle = {
    left: `${comp.x}px`,
    top: `${comp.y}px`,
    width: `${comp.width}px`,
    height: `${comp.height}px`,
    ...comp.style
  };
  return Object.entries(baseStyle).map(([k, v]) => `${k}:${v}`).join(';');
};

const generatePageHtml = (docPage: DocumentPage) => {
  const componentsHtml = docPage.components.map(comp => {
    const style = generateComponentStyle(comp);
    if (comp.type === 'text') {
      // sanitize or handle content safely in a real app
      return `<div class="component" style="${style}; font-family: 'Inter', sans-serif; color: #1A1A1A;">${comp.content}</div>`;
    }
    if (comp.type === 'image') {
      return `<div class="component" style="${style}"><img src="${comp.src}" style="width:100%; height:100%; object-fit:cover;" /></div>`;
    }
    return '';
  }).join('');

  return `
        <div class="page" style="background: ${docPage.background || '#F5F5F3'}">
            ${componentsHtml}
        </div>
    `;
};

export async function POST(req: Request) {
  try {
    const { pages } = await req.json();

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: "No pages provided" }, { status: 400 });
    }

    const browser = await puppeteerLib.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to A4 size (approx)
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Generate HTML content for the PDF
    // In a real app, we would render the React component to HTML string or visit a preview URL.
    // Here we will construct a simple HTML representation using the same logic as Renderer.tsx
    // or ideally, we visit the /preview page with the document data injected.

    // For simplicity/robustness in this V1, we'll construct the HTML manually here to match Renderer style.

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
          body { margin: 0; padding: 0; box-sizing: border-box; }
          .page {
            width: 794px;
            height: 1123px;
            position: relative;
            page-break-after: always;
            overflow: hidden;
            background: #F5F5F3;
          }
          .component { position: absolute; }
        </style>
      </head>
      <body>
        ${pages.map((p: any) => generatePageHtml(p)).join('')}
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(new Blob([pdfBuffer as any]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=document.pdf",
      },
    });

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
