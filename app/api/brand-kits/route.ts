import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const brandKits = await prisma.brandKit.findMany({
            orderBy: { updatedAt: "desc" },
        });
        return NextResponse.json(brandKits);
    } catch (error) {
        console.error("Error fetching brand kits:", error);
        return NextResponse.json({ error: "Failed to fetch brand kits" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { name, colors, fonts, assets } = body;

        const brandKit = await prisma.brandKit.create({
            data: {
                name,
                colors,
                fonts,
                assets,
            },
        });

        return NextResponse.json(brandKit);
    } catch (error) {
        console.error("Error creating brand kit:", error);
        return NextResponse.json({ error: "Failed to create brand kit" }, { status: 500 });
    }
}
