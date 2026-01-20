import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const brandKit = await prisma.brandKit.findUnique({
            where: { id },
        });

        if (!brandKit) {
            return NextResponse.json({ error: "Brand Kit not found" }, { status: 404 });
        }

        return NextResponse.json(brandKit);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch brand kit" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, colors, fonts, assets } = body;

        const brandKit = await prisma.brandKit.update({
            where: { id },
            data: {
                name,
                colors, // Json
                fonts,  // Json
                assets, // Json
            },
        });

        return NextResponse.json(brandKit);
    } catch (error) {
        console.error("Error updating brand kit:", error);
        return NextResponse.json({ error: "Failed to update brand kit" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.brandKit.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete brand kit" }, { status: 500 });
    }
}
