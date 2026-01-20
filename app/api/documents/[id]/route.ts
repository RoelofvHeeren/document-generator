import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const document = await prisma.document.findUnique({
            where: { id: params.id },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const { name, content, themeId } = body;

        const document = await prisma.document.update({
            where: { id: params.id },
            data: {
                name,
                content, // This is Json type in Prisma
                themeId
            },
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error("Error updating document:", error);
        return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
    }
}
