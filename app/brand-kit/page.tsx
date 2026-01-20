"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Trash2, Upload } from "lucide-react";

type ColorToken = {
    id: string;
    name: string;
    value: string;
    usage: string;
};

const initialColors: ColorToken[] = [
    { id: "1", name: "teal-accent", value: "#139187", usage: "Primary brand color, icons, links" },
    { id: "2", name: "primary", value: "#000000", usage: "Text, active nav items" },
    { id: "3", name: "primary-dim", value: "#1A1A1A", usage: "Dark backgrounds" },
];

export default function BrandKitPage() {
    const [colors, setColors] = useState<ColorToken[]>(initialColors);

    const handleDelete = (id: string) => {
        setColors(colors.filter(c => c.id !== id));
    };

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8">
                <div className="max-w-5xl mx-auto space-y-8">

                    <div className="glass-card p-8 rounded-2xl flex justify-between items-center">
                        <div>
                            <h1 className="font-serif text-3xl text-white mb-2">Brand Kit</h1>
                            <p className="text-gray-400">Manage your brand's visual identity.</p>
                        </div>
                        <Button>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Styling Guide
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Color Palette */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-medium text-white">Color Palette</h2>
                                <Button variant="secondary" size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Color
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {colors.map((color) => (
                                    <Card key={color.id} className="p-4 flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-lg border border-white/10 shadow-lg shrink-0"
                                            style={{ backgroundColor: color.value }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-white text-sm">{color.name}</span>
                                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded uppercase">{color.value}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">{color.usage}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 hover:text-red-400"
                                            onClick={() => handleDelete(color.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </Card>
                                ))}
                            </div>
                        </section>

                        {/* Typography & Logos */}
                        <section className="space-y-8">
                            {/* Fonts */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-medium text-white">Typography</h2>
                                <Card className="p-6 space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Headings (Serif)</p>
                                        <p className="font-serif text-2xl text-white">Instrument Serif</p>
                                    </div>
                                    <div className="h-px bg-white/5" />
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Body (Sans)</p>
                                        <p className="font-sans text-lg text-white">Plus Jakarta Sans / Inter</p>
                                    </div>
                                    <div className="h-px bg-white/5" />
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Code / Technical (Mono)</p>
                                        <p className="font-mono text-base text-white">JetBrains Mono</p>
                                    </div>
                                </Card>
                            </div>

                            {/* Logos */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-medium text-white">Logos</h2>
                                    <Button variant="secondary" size="sm">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="aspect-square flex flex-col items-center justify-center p-4 gap-2 hover:bg-white/5 transition-colors cursor-pointer border-dashed border-white/20">
                                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
                                            <Plus className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <span className="text-sm text-gray-400">Add Variant</span>
                                    </Card>
                                    <Card className="aspect-square relative group overflow-hidden">
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="danger" size="sm">Remove</Button>
                                        </div>
                                        {/* Placeholder for actual logo */}
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 italic">
                                            Light Logo
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
