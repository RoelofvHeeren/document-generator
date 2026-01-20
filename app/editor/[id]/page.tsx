"use client";

import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronLeft, Save, Sparkles, Download, Type, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DocumentPage } from "@/types/document";
import { Renderer } from "@/components/Renderer";
import Script from "next/script";

export default function EditorPage() {
    const params = useParams();
    const id = params?.id as string;

    const [activeTab, setActiveTab] = useState<"content" | "design" | "ai">("content");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [pages, setPages] = useState<DocumentPage[]>([]);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [isSafeZoneVisible, setIsSafeZoneVisible] = useState(false);
    const [isUploadingPDF, setIsUploadingPDF] = useState(false);

    // Form State - Expanded for comprehensive document generation
    const [projectDetails, setProjectDetails] = useState({
        // Basic Info
        name: "",
        location: "",
        description: "",
        // Financial Metrics
        roi: "",
        term: "",
        investmentAmount: "",
        targetRaise: "",
        projectedRevenue: "",
        // Development Details
        developer: "",
        architect: "",
        constructionTimeline: "",
        units: "",
        landSize: "",
        // Team & Experience
        teamBackground: "",
        // Risk & Strategy
        riskMitigation: "",
        exitStrategy: "",
    });


    useEffect(() => {
        if (id) {
            fetchDocument(id);
        }
    }, [id]);

    const fetchDocument = async (docId: string) => {
        try {
            const res = await fetch(`/api/documents/${docId}`);
            if (res.ok) {
                const doc = await res.json();
                if (doc.content) {
                    // content is stored as JSON, which respects the DocumentPage[] structure
                    const content = doc.content as any;
                    if (content.pages) {
                        setPages(content.pages);
                    }
                    if (content.projectDetails) {
                        setProjectDetails(content.projectDetails);
                    }
                }
                if (doc.name) {
                    // Update name in local state if needed
                }
            }
        } catch (error) {
            console.error("Failed to load document", error);
        }
    };

    const handleSave = async () => {
        if (!id) return;
        setIsSaving(true);
        try {
            const content = {
                pages,
                projectDetails
            };

            const res = await fetch(`/api/documents/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: projectDetails.name || "Untitled Document",
                    content,
                })
            });

            if (!res.ok) throw new Error("Failed to save");

            // Optional: Show success toast
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save document");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setProjectDetails(prev => ({ ...prev, [field]: value }));
    };

    const generateDocument = async () => {
        // Validate that we have at least some project details
        if (!projectDetails.name && !projectDetails.description) {
            alert("Please fill in at least the Project Name or Description before generating.");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectDetails })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || `Server error: ${res.status}`);
            }

            const data = await res.json();
            if (data.pages && data.pages.length > 0) {
                setPages(data.pages);
                setActiveTab("design"); // Switch to design view
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error("No pages were generated. Please try again.");
            }
        } catch (error) {
            console.error("Generation failed", error);
            const message = error instanceof Error ? error.message : "Failed to generate document";
            alert(`Generation failed: ${message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingPDF(true);
        try {
            const arrayBuffer = await file.arrayBuffer();

            // Access pdfjsLib from global window object (loaded via Script)
            const pdfjsLib = (window as any).pdfjsLib;
            if (!pdfjsLib) {
                throw new Error("PDF Library not loaded. Please refresh.");
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const newPages: DocumentPage[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 }); // 72 DPI by default usually

                // Convert PDF items to our components
                // Standard A4 is approx 595x842 pts. Our editor uses ~794x1123 px (96 DPI).
                // We might need to handle scaling.
                // For V1, we'll map directly and let user adjust.

                const components: any[] = textContent.items.map((item: any, index: number) => {
                    if (!item.str || item.str.trim() === "") return null;

                    // PDF coordinates: bottom-left is origin usually. item.transform[5] is y (from bottom)
                    // We need to flip Y.
                    const x = item.transform[4];
                    const y = viewport.height - item.transform[5] - item.height;

                    return {
                        id: `pdf-${i}-${index}`,
                        type: "text",
                        x: x * 1.33, // approx pt to px conversion if needed, or just keep raw
                        y: y * 1.33,
                        width: item.width * 1.5, // slightly wider to avoid wrap
                        height: item.height * 1.5,
                        content: item.str,
                        style: {
                            fontSize: `${item.height}px`, // approximate
                            fontFamily: item.fontName
                        }
                    };
                }).filter(Boolean);

                newPages.push({
                    id: `imported-page-${Date.now()}-${i}`,
                    name: `PDF Page ${i}`,
                    components: components
                });
            }

            if (newPages.length > 0) {
                // Append to existing or replace? User asked to "start editing from there".
                // If current doc is empty (1 page with 0 components), replace.
                if (pages.length === 1 && pages[0].components.length === 0) {
                    setPages(newPages);
                } else {
                    setPages(prev => [...prev, ...newPages]);
                }
                setActiveTab("design");
            }

        } catch (error) {
            console.error("PDF Import failed", error);
            alert("Failed to import PDF. Ensure it is a valid PDF file.");
        } finally {
            setIsUploadingPDF(false);
        }
    };

    const addShape = (shapeType: 'rectangle' | 'circle' | 'line') => {
        const newComponent: any = {
            id: `shape-${Date.now()}`,
            type: "shape",
            x: 100,
            y: 100,
            width: shapeType === 'line' ? 200 : 100,
            height: shapeType === 'line' ? 2 : 100,
            style: {
                backgroundColor: "#D4C5A8", // Default brand accent
                borderRadius: shapeType === 'circle' ? "50%" : "0"
            }
        };

        setPages(prev => {
            const newPages = [...prev];
            newPages[activePageIndex].components.push(newComponent);
            return newPages;
        });
    };

    const handleExportPDF = async () => {
        if (pages.length === 0) {
            alert("No pages to export. Please generate a document first.");
            return;
        }

        setIsExporting(true);
        try {
            const res = await fetch("/api/export-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pages })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || `Export failed: ${res.status}`);
            }

            // Download the PDF
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectDetails.name || 'document'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed", error);
            const message = error instanceof Error ? error.message : "Failed to export PDF";
            alert(`Export failed: ${message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const activePage = pages[activePageIndex];

    return (
        <div className="flex h-screen overflow-hidden">
            {/* 1. Main Navigation Sidebar (Global) */}
            <Sidebar />

            {/* 2. Editor Sidebar (Tools) */}
            <div className="w-80 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col shrink-0">
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <Link href="/templates">
                        <Button variant="ghost" size="sm" className="px-2">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-white font-medium text-sm">Business Plan</h2>
                        <p className="text-xs text-gray-400">Editor Analysis</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-1 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab("content")}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'content' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Content
                    </button>
                    <button
                        onClick={() => setActiveTab("design")}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'design' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Design
                    </button>
                    <button
                        onClick={() => setActiveTab("ai")}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-teal-accent/20 text-teal-accent' : 'text-gray-400 hover:text-teal-accent'}`}
                    >
                        <div className="flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Gen
                        </div>
                    </button>
                </div>

                {/* Dynamic Tool Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {activeTab === "content" && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Basic Info</h3>
                                <Input
                                    label="Project Name"
                                    placeholder="e.g. Kaba Kaba Villas"
                                    value={projectDetails.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                />
                                <Input
                                    label="Location"
                                    placeholder="e.g. Seseh, Bali"
                                    value={projectDetails.location}
                                    onChange={(e) => handleInputChange("location", e.target.value)}
                                />
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-400">Description</label>
                                    <textarea
                                        className="w-full h-24 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-teal-accent focus:outline-none focus:ring-1 focus:ring-teal-accent/50 resize-none"
                                        placeholder="Describe the investment opportunity..."
                                        value={projectDetails.description}
                                        onChange={(e) => handleInputChange("description", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Financial Metrics */}
                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Financial Metrics</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        label="ROI %"
                                        placeholder="25%"
                                        value={projectDetails.roi}
                                        onChange={(e) => handleInputChange("roi", e.target.value)}
                                    />
                                    <Input
                                        label="Term"
                                        placeholder="24 months"
                                        value={projectDetails.term}
                                        onChange={(e) => handleInputChange("term", e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        label="Investment Amount"
                                        placeholder="$500,000"
                                        value={projectDetails.investmentAmount}
                                        onChange={(e) => handleInputChange("investmentAmount", e.target.value)}
                                    />
                                    <Input
                                        label="Target Raise"
                                        placeholder="$2,500,000"
                                        value={projectDetails.targetRaise}
                                        onChange={(e) => handleInputChange("targetRaise", e.target.value)}
                                    />
                                </div>
                                <Input
                                    label="Projected Revenue"
                                    placeholder="$850,000/year"
                                    value={projectDetails.projectedRevenue}
                                    onChange={(e) => handleInputChange("projectedRevenue", e.target.value)}
                                />
                            </div>

                            {/* Development Details */}
                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Development Details</h3>
                                <Input
                                    label="Developer"
                                    placeholder="Fifth Avenue Properties"
                                    value={projectDetails.developer}
                                    onChange={(e) => handleInputChange("developer", e.target.value)}
                                />
                                <Input
                                    label="Architect"
                                    placeholder="Studio XYZ"
                                    value={projectDetails.architect}
                                    onChange={(e) => handleInputChange("architect", e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        label="Timeline"
                                        placeholder="18 months"
                                        value={projectDetails.constructionTimeline}
                                        onChange={(e) => handleInputChange("constructionTimeline", e.target.value)}
                                    />
                                    <Input
                                        label="Units"
                                        placeholder="5 villas"
                                        value={projectDetails.units}
                                        onChange={(e) => handleInputChange("units", e.target.value)}
                                    />
                                </div>
                                <Input
                                    label="Land Size"
                                    placeholder="2,500 sqm"
                                    value={projectDetails.landSize}
                                    onChange={(e) => handleInputChange("landSize", e.target.value)}
                                />
                            </div>

                            {/* Team & Strategy */}
                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Team & Strategy</h3>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-400">Team Background</label>
                                    <textarea
                                        className="w-full h-20 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-teal-accent focus:outline-none focus:ring-1 focus:ring-teal-accent/50 resize-none"
                                        placeholder="Key team members and experience..."
                                        value={projectDetails.teamBackground}
                                        onChange={(e) => handleInputChange("teamBackground", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-400">Risk Mitigation</label>
                                    <textarea
                                        className="w-full h-20 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-teal-accent focus:outline-none focus:ring-1 focus:ring-teal-accent/50 resize-none"
                                        placeholder="Key risk factors and mitigation strategies..."
                                        value={projectDetails.riskMitigation}
                                        onChange={(e) => handleInputChange("riskMitigation", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-400">Exit Strategy</label>
                                    <textarea
                                        className="w-full h-20 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-teal-accent focus:outline-none focus:ring-1 focus:ring-teal-accent/50 resize-none"
                                        placeholder="Planned exit strategies for investors..."
                                        value={projectDetails.exitStrategy}
                                        onChange={(e) => handleInputChange("exitStrategy", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "design" && (
                        <div className="space-y-4">
                            <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Page Elements</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="secondary" className="flex-col gap-2 h-20">
                                    <Type className="w-5 h-5 text-gray-400" />
                                    <span className="text-xs text-gray-400">Text</span>
                                </Button>
                                <Button variant="secondary" className="flex-col gap-2 h-20">
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                    <span className="text-xs text-gray-400">Image</span>
                                </Button>
                            </div>

                            <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider pt-4 border-t border-white/10">Shapes</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <Button variant="secondary" className="flex-col gap-2 h-16" onClick={() => addShape('rectangle')}>
                                    <div className="w-4 h-4 border border-gray-400 bg-gray-400/20" />
                                    <span className="text-[10px] text-gray-400">Box</span>
                                </Button>
                                <Button variant="secondary" className="flex-col gap-2 h-16" onClick={() => addShape('circle')}>
                                    <div className="w-4 h-4 rounded-full border border-gray-400 bg-gray-400/20" />
                                    <span className="text-[10px] text-gray-400">Circle</span>
                                </Button>
                                <Button variant="secondary" className="flex-col gap-2 h-16" onClick={() => addShape('line')}>
                                    <div className="w-4 h-px bg-gray-400" />
                                    <span className="text-[10px] text-gray-400">Line</span>
                                </Button>
                            </div>

                            <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider pt-4 border-t border-white/10">Tools</h3>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-sm text-gray-300">Show Safe Zone</span>
                                <button
                                    onClick={() => setIsSafeZoneVisible(!isSafeZoneVisible)}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${isSafeZoneVisible ? 'bg-teal-accent' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isSafeZoneVisible ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="pt-2">
                                <label className="block w-full cursor-pointer group">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="application/pdf"
                                        onChange={handlePDFUpload}
                                        disabled={isUploadingPDF}
                                    />
                                    <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/10 rounded-xl group-hover:border-teal-accent/50 group-hover:bg-teal-accent/5 transition-all">
                                        {isUploadingPDF ? (
                                            <Loader2 className="w-6 h-6 text-teal-accent animate-spin mb-2" />
                                        ) : (
                                            <Download className="w-6 h-6 text-gray-400 group-hover:text-teal-accent mb-2 rotate-180" />
                                        )}
                                        <span className="text-xs text-gray-400 group-hover:text-teal-accent">
                                            {isUploadingPDF ? "Importing..." : "Upload PDF to Edit"}
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === "ai" && (
                        <div className="space-y-4">
                            <div className="bg-teal-accent/10 border border-teal-accent/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2 text-teal-accent">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-sm font-medium">AI Assistant</span>
                                </div>
                                <p className="text-xs text-teal-accent/80 mb-3">
                                    Fill in the project details in the &apos;Content&apos; tab, then click generate to create the full document structure.
                                </p>
                                <Button
                                    className="w-full gap-2"
                                    onClick={generateDocument}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isGenerating ? "Generatring..." : "Generate Document"}
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* 3. Main Workspace (Canvas) */}
            <div className="flex-1 bg-neutral-900/50 flex flex-col relative overflow-hidden">

                {/* Toolbar */}
                <div className="h-14 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-10">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>Page {activePageIndex + 1} of {pages.length || 1}</span>
                        {pages.length > 1 && (
                            <div className="flex gap-1 ml-4">
                                <Button
                                    size="sm" variant="secondary" className="px-2"
                                    onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
                                    disabled={activePageIndex === 0}
                                >
                                    Prev
                                </Button>
                                <Button
                                    size="sm" variant="secondary" className="px-2"
                                    onClick={() => setActivePageIndex(Math.min(pages.length - 1, activePageIndex + 1))}
                                    disabled={activePageIndex === pages.length - 1}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleExportPDF} disabled={isExporting || pages.length === 0}>
                            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            {isExporting ? "Exporting..." : "Export PDF"}
                        </Button>
                    </div>
                </div>

                {/* Canvas Area (Pan/Zoom) */}
                <div className="flex-1 overflow-auto p-12 flex justify-center items-start">
                    {/* A4 Page Representation */}
                    {/* 210mm x 297mm approx 794px x 1123px at 96 DPI. Scaled for screen. */}
                    <div
                        className="bg-white w-[794px] h-[1123px] shadow-2xl relative shrink-0 transition-transform origin-top"
                        style={{ transform: "scale(0.8)" }}
                    >
                        {activePage ? (
                            <div className="w-full h-full relative overflow-hidden bg-black">
                                {/* Background if present */}
                                {activePage.background && activePage.background.startsWith("#") ? (
                                    <div className="absolute inset-0 z-0" style={{ backgroundColor: activePage.background }}></div>
                                ) : activePage.background ? (
                                    <img src={activePage.background} className="absolute inset-0 w-full h-full object-cover z-0" />
                                ) : null}

                                {/* Render Components */}
                                <Renderer components={activePage.components} />

                                {/* Safe Zone Overlay */}
                                {isSafeZoneVisible && (
                                    <div className="absolute inset-[40px] border-2 border-dashed border-teal-500/50 pointer-events-none z-50">
                                        <div className="absolute top-0 right-0 bg-teal-500/50 text-white text-[10px] px-1">Safe Zone</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-16 flex flex-col h-full bg-black text-white relative overflow-hidden items-center justify-center border border-white/10">
                                <div className="text-gray-500 text-center">
                                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-serif">Ready to Create</p>
                                    <p className="text-sm">Enter details and use AI Gen to start.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            {/* Load PDF.js for client-side parsing */}
            <Script
                src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
                strategy="lazyOnload"
                onLoad={() => console.log("PDF.js loaded")}
            />
        </div>
    );
}
