"use client";

import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Plus, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DocumentTemplate } from "@/types/document";

// Mock Data for Templates
const templates: DocumentTemplate[] = [
    {
        id: "business-plan",
        name: "Business Plan (A4)",
        description: "Standard investor-ready business plan structure including Executive Summary, Financials, and Risk Analysis.",
        thumbnail: "/thumbnails/business-plan.png",
        pages: [] // Loaded on demand
    },
    {
        id: "project-overview",
        name: "Project Overview (One-Pager)",
        description: "Concise summary of a development project for quick sharing with leads.",
        thumbnail: "/thumbnails/one-pager.png",
        pages: []
    },
    {
        id: "investment-memo",
        name: "Investment Memorandum",
        description: "Detailed breakdown of the investment opportunity, ROI projections, and legal structure.",
        thumbnail: "/thumbnails/memo.png",
        pages: []
    }
];

export default function TemplatesPage() {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    <div className="glass-card p-8 rounded-2xl flex justify-between items-center">
                        <div>
                            <h1 className="font-serif text-3xl text-white mb-2">Templates</h1>
                            <p className="text-gray-400">Select a starting point for your new document.</p>
                        </div>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Empty Template
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <Card key={template.id} className="group overflow-hidden hover:border-teal-accent/50 transition-colors">
                                <div className="aspect-[1/1.414] bg-white/5 relative overflow-hidden">
                                    {/* Placeholder Thumbnail */}
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 bg-black/20 group-hover:bg-black/40 transition-colors">
                                        <FileText className="w-12 h-12 opacity-50" />
                                    </div>

                                    {/* Overlay Action */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link href={`/editor/new?template=${template.id}`}>
                                            <Button>Use Template</Button>
                                        </Link>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-white/10 bg-white/5">
                                    <h3 className="font-medium text-white text-lg mb-1">{template.name}</h3>
                                    <p className="text-sm text-gray-400 line-clamp-2">{template.description}</p>
                                </div>
                            </Card>
                        ))}
                    </div>

                </div>
            </main>
        </div>
    );
}
