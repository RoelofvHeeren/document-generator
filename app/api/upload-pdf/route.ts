import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { cleanupOldUploads } from "@/utils/cleanup";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        // Run cleanup in background (don't await for faster response)
        cleanupOldUploads().catch(err => console.error("Cleanup error:", err));

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

        // Define paths
        // We'll save uploads in the public directory so images are accessible
        const uploadsDir = path.join(process.cwd(), "public", "uploads", `${timestamp}`);
        const pdfPath = path.join(uploadsDir, cleanFileName);

        // Create directory
        await mkdir(uploadsDir, { recursive: true });

        // Save PDF
        await writeFile(pdfPath, buffer);

        // Script is now in web-app/scripts/extract_pdf_v2.py
        // In Next.js, process.cwd() is the root of the project (web-app)
        const scriptPath = path.join(process.cwd(), "scripts", "extract_pdf_v2.py");

        // Execute Python script
        // We pass the output dir as the same uploads dir
        // The script puts images in output_dir/images
        const command = `python3 "${scriptPath}" "${pdfPath}" "${uploadsDir}"`;

        console.log("Executing:", command);

        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.warn("Python stderr:", stderr);
        }

        try {
            const data = JSON.parse(stdout);

            // Post-process paths to be relative to web server
            // The script returns paths like /uploads/filename.png (based on our script logic? No, script logic was generic)
            // Check script again:
            // "src": f"/uploads/{image_filename}"
            // Actually the script hardcoded "/uploads/..." which might be wrong if we nested it.
            // But let's fix the paths here if needed.
            // The script output paths relative to the web root would be better.
            // Since we served it from public/uploads/timestamp, the URL should be /uploads/timestamp/images/...

            const refinedPages = data.pages.map((page: any) => ({
                ...page,
                backgroundImage: `/uploads/${timestamp}/images/${path.basename(page.backgroundImage)}`,
                images: page.images.map((img: any) => ({
                    ...img,
                    src: `/uploads/${timestamp}/images/${path.basename(img.src)}`
                }))
            }));

            return NextResponse.json({
                success: true,
                pages: refinedPages,
                projectId: timestamp.toString() // Use simple ID for now
            });

        } catch (parseError) {
            console.error("Failed to parse Python output", stdout);
            return NextResponse.json({ error: "Failed to parse extraction results", details: stdout }, { status: 500 });
        }

    } catch (error) {
        console.error("Upload failed", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
