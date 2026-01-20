"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader2 } from "lucide-react";

function NewEditorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState("Creating project...");
    const [error, setError] = useState<string | null>(null);

    const templateId = searchParams.get("template") || "business-plan";

    useEffect(() => {
        createProjectFromTemplate();
    }, []);

    const createProjectFromTemplate = async () => {
        try {
            setStatus("Creating project...");

            // Create a new project with a document based on the template
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: getTemplateName(templateId),
                    description: `Created from ${templateId} template`,
                    templateId: templateId // Pass the template ID to the API
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to create project");
            }

            const project = await res.json();

            setStatus("Opening editor...");

            // Navigate to the editor with the new document
            if (project.documents && project.documents.length > 0) {
                router.replace(`/editor/${project.documents[0].id}`);
            } else {
                throw new Error("No document created with project");
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An error occurred");
        }
    };

    const getTemplateName = (id: string): string => {
        const names: Record<string, string> = {
            "business-plan": "Business Plan",
            "project-overview": "Project Overview",
            "investment-memo": "Investment Memorandum",
            "empty": "Untitled Document"
        };
        return names[id] || "New Document";
    };

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="glass-card p-8 rounded-xl text-center max-w-md">
                    <div className="text-red-400 text-xl mb-2">Error</div>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/templates")}
                        className="px-4 py-2 bg-teal-accent text-white rounded-lg hover:bg-teal-accent/80 transition"
                    >
                        Back to Templates
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="glass-card p-8 rounded-xl text-center">
                <Loader2 className="w-12 h-12 animate-spin text-teal-accent mx-auto mb-4" />
                <p className="text-white text-lg font-serif">{status}</p>
                <p className="text-gray-500 text-sm mt-2">Using template: {getTemplateName(templateId)}</p>
            </div>
        </div>
    );
}

export default function NewEditorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-teal-accent" />
            </div>
        }>
            <NewEditorContent />
        </Suspense>
    );
}
