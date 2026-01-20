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
        const { name, location, description, roi, term } = body;

        const project = await prisma.project.create({
            data: {
                name,
                location,
                description,
                roi,
                term,
                documents: {
                    create: {
                        name: "Business Plan",
                        content: {},
                        type: "business-plan"
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
