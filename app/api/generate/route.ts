import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { DocumentPage } from "@/types/document";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `
You are an expert document designer for high-end real estate developers (Fifth Avenue Properties).
Your task is to generate a JSON structure for a document page based on the provided project details.

BRANDING RULES (STRICT):
1. Font Hierarchy:
   - HEADERS: "Instrument Serif" (Elegant, premium serif)
   - BODY: "Inter" (Clean sans-serif)
2. Color Palette:
   - Primary Text: #1A1A1A (Charcoal)
   - Accents: #D4C5A8 (Tan/Gold), #A5B5A5 (Sage)
   - Backgrounds: #F5F5F3 (Off-white/Light Gray) or #000000 (Black for covers)
   - Surface: #FFFFFF (White cards)
3. Layout Style:
   - Minimalist, high-end magazine aesthetic.
   - Generous whitespace.
   - Overlapping elements (images with text overlays).

Output Format:
You must output ONLY valid JSON matching the DocumentPage interface.
`;

export async function POST(req: Request) {
    try {
        const { projectDetails, templateType } = await req.json();

        if (!projectDetails) {
            return NextResponse.json(
                { error: "Missing project details" },
                { status: 400 }
            );
        }

        const prompt = `
    Project Name: ${projectDetails.name}
    Location: ${projectDetails.location}
    Description: ${projectDetails.description}
    
    Financial Information:
    - ROI: ${projectDetails.roi || "Not specified"}
    - Investment Term: ${projectDetails.term || "Not specified"}
    - Investment Amount: ${projectDetails.investmentAmount || "Not specified"}
    - Target Raise: ${projectDetails.targetRaise || "Not specified"}
    - Projected Revenue: ${projectDetails.projectedRevenue || "Not specified"}
    
    Development Details:
    - Developer: ${projectDetails.developer || "Not specified"}
    - Architect: ${projectDetails.architect || "Not specified"}
    - Construction Timeline: ${projectDetails.constructionTimeline || "Not specified"}
    - Number of Units: ${projectDetails.units || "Not specified"}
    - Land Size: ${projectDetails.landSize || "Not specified"}
    
    Team Background: ${projectDetails.teamBackground || "Not specified"}
    Risk Mitigation: ${projectDetails.riskMitigation || "Not specified"}
    Exit Strategy: ${projectDetails.exitStrategy || "Not specified"}

    Template Type: ${templateType || "Business Plan"}

    Please generate a comprehensive multi-page document structure:
    Page 1: Cover Page (High impact, project name, location, key visual)
    Page 2: Executive Summary (Investment highlights, key metrics, ROI)
    Page 3: Development Overview (Project details, timeline, team)
    Page 4: Financial Projections (Investment breakdown, returns, exit strategy)
    Page 5: Risk Analysis (Risk factors and mitigation strategies)
    `;

        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 4096,
            temperature: 0.7,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        // Extract JSON from response
        const content = msg.content[0].type === 'text' ? msg.content[0].text : '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            throw new Error("Failed to parse JSON from AI response");
        }

        const pages: DocumentPage[] = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ pages });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate document" },
            { status: 500 }
        );
    }
}
