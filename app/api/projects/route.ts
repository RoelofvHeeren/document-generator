import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { updatedAt: "desc" },
            include: {
                documents: {
                    select: { id: true }
                }
            }
        });
        return NextResponse.json(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, location, description, roi, term, templateId } = body;

        let documentName = "Business Plan";
        let documentType = "business-plan";
        let initialContent: any = {};

        switch (templateId) {
            case "project-overview":
                documentName = "Project Overview";
                documentType = "project-overview";
                initialContent = {
                    pages: [{ id: '1', name: 'Overview', components: [] }]
                };
                break;
            case "investment-memo":
                documentName = "Investment Memo";
                documentType = "investment-memo";
                initialContent = {
                    pages: [{ id: '1', name: 'Cover', components: [] }]
                };
                break;
            case "empty":
                documentName = "Untitled Document";
                documentType = "custom";
                initialContent = {
                    pages: [{ id: '1', name: 'Page 1', components: [] }]
                };
                break;
            case "business-plan":
            default:
                documentName = "Business Plan";
                documentType = "business-plan";
                // Keep empty or minimal for business plan to rely on AI or manual start
                break;
        }

        const project = await prisma.project.create({
            data: {
                name,
                location,
                description,
                roi,
                term,
                documents: {
                    create: {
                        name: documentName,
                        content: initialContent,
                        type: documentType
                    }
                }
            },
            include: {
                documents: true
            }
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error creating project:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}
