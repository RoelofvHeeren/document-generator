import { readdir, stat, rm } from "fs/promises";
import path from "path";

/**
 * Cleans up old directories in the uploads folder.
 * Default: Removes folders older than 24 hours.
 */
export async function cleanupOldUploads(maxAgeMs: number = 24 * 60 * 60 * 1000) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const now = Date.now();

    try {
        const entries = await readdir(uploadsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const folderPath = path.join(uploadsDir, entry.name);

                // Folders are named with timestamps, we can use that primarily
                const folderTimestamp = parseInt(entry.name);

                if (!isNaN(folderTimestamp)) {
                    if (now - folderTimestamp > maxAgeMs) {
                        console.log(`[Cleanup] Removing old folder: ${entry.name}`);
                        await rm(folderPath, { recursive: true, force: true });
                        continue;
                    }
                }

                // Fallback to file system stats
                const stats = await stat(folderPath);
                if (now - stats.mtimeMs > maxAgeMs) {
                    console.log(`[Cleanup] Removing stale folder: ${entry.name}`);
                    await rm(folderPath, { recursive: true, force: true });
                }
            }
        }
    } catch (error) {
        // uploads dir might not exist yet
        console.warn("[Cleanup] Warning during cleanup:", error);
    }
}
