import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function PUT(req: Request) {
    try {
        const { pageImage, extractedJson } = await req.json();

        if (!pageImage || !extractedJson) {
            return NextResponse.json(
                { error: "Missing pageImage or extractedJson" },
                { status: 400 }
            );
        }

        // 1. Get the image data
        // pageImage is likely a relative URL like "/uploads/..."
        // We need to read the file from disk to send to Claude as base64
        // Or if it's already a full URL (if hosted), we could pass it, but local disk is safer for dev.

        let imageBuffer: Buffer;
        let mediaType = "image/png";

        if (pageImage.startsWith("data:")) {
            // It's a data URI
            const matches = pageImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mediaType = matches[1];
                imageBuffer = Buffer.from(matches[2], "base64");
            } else {
                return NextResponse.json({ error: "Invalid data URI" }, { status: 400 });
            }
        } else {
            // It's a path, likely relative to public folder in Next.js
            // Our previous upload logic saved it to public/uploads/...
            // The URL provided to frontend was /uploads/timestamp/...
            // So we need to map that back to filesystem.
            const publicDir = path.join(process.cwd(), "public");
            const relPath = pageImage.startsWith("/") ? pageImage.slice(1) : pageImage; // remove leading slash
            const filePath = path.join(publicDir, relPath);

            try {
                imageBuffer = await readFile(filePath);
                if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) mediaType = "image/jpeg";
            } catch (err) {
                console.error("File read error:", err);
                return NextResponse.json({ error: "Could not read image file" }, { status: 404 });
            }
        }

        const imageBase64 = imageBuffer.toString("base64");

        // 2. prompt Claude
        // We want Claude to look at the image and the JSON, and fix specific things.
        // It should output the JSON structure again but "fixed".

        const systemPrompt = `
You are an expert Document Analysis AI specialized in converting PDF pages to editable web formats.
You will be provided with:
1. An image of a document page.
2. A JSON object representing the currently extracted text and image blocks (from a heuristic parser).

Your Goal:
Critique the JSON representation against the visual image and generate a *corrected* list of components.
Focus on:
- **Semantic Grouping**: If multiple text blocks visually form a single paragraph, merge them into one text block.
- **Hierarchy**: Identify headings vs body text. (You can adjust font size/weight labels if needed, but primarily ensure content is grouped correctly).
- **Missing Elements**: If there are images or icons missing in the JSON, add them (use placeholders or try to map if obvious).
- **Layout Precision**: If text is vertically aligned or has a specific rotation that is incorrect in the JSON, fix the 'rotation' property. (e.g. Sidebars often have 90 or 270 degree text).
- **Embedded Images**: Maintain the 'src' of existing images if they match visually. If the heuristic missed a photo, you can't create a new src, but you can flag it or adjust the bbox of an existing one.

Output Format:
Return ONLY validity JSON matching the input structure (a list of component objects).
Do not wrap in markdown or backticks. Just the raw JSON array.
`;

        const userPrompt = `
Here is the extracted JSON:
${JSON.stringify(extractedJson, null, 2)}

Please analyze the image and return the refined JSON array of components.
`;

        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 4096,
            temperature: 0.2, // Low temp for precision
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType as any,
                                data: imageBase64,
                            },
                        },
                        {
                            type: "text",
                            text: userPrompt
                        }
                    ],
                },
            ],
        });

        // 3. Parse and return
        const content = msg.content[0].type === 'text' ? msg.content[0].text : '';

        let cleanedJson = content;
        // Strip markdown if present
        if (cleanedJson.includes("```json")) {
            cleanedJson = cleanedJson.replace(/```json/g, "").replace(/```/g, "");
        } else if (cleanedJson.includes("```")) {
            cleanedJson = cleanedJson.replace(/```/g, "");
        }

        try {
            const fixedComponents = JSON.parse(cleanedJson);
            return NextResponse.json({ components: fixedComponents });
        } catch (e) {
            console.error("JSON Parse Error from Claude", content);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }


    } catch (error) {
        console.error("Analyze PDF Error:", error);
        return NextResponse.json(
            { error: "Internal server error during analysis" },
            { status: 500 }
        );
    }
}
