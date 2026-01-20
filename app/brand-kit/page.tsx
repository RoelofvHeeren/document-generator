"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoBrowser } from "@/components/LogoBrowser";
import { BrandKitImporter } from "@/components/BrandKitImporter";
import { Plus, Trash2, Save, Loader2, Edit2, X, Image, Palette, Type, FileUp, CheckCircle } from "lucide-react";

type ColorToken = {
    id: string;
    name: string;
    value: string;
    usage: string;
};

type LogoCategories = {
    [subBrand: string]: {
        [colorVariant: string]: {
            [logoType: string]: string;
        };
    };
};

type BrandKit = {
    id: string;
    name: string;
    colors: ColorToken[];
    logoCategories: LogoCategories | null;
    fontFiles: Array<{ name: string; family: string; format: string; path: string }> | null;
    brandGuideUrl: string | null;
    sourceFolder: string | null;
};

// Default setup if nothing exists
const defaultColors: ColorToken[] = [
    { id: "1", name: "teal-accent", value: "#139187", usage: "Primary brand color, icons, links" },
    { id: "2", name: "primary", value: "#000000", usage: "Text, active nav items" },
    { id: "3", name: "primary-dim", value: "#1A1A1A", usage: "Dark backgrounds" },
];

type TabType = 'logos' | 'colors' | 'fonts' | 'import';

export default function BrandKitPage() {
    const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
    const [colors, setColors] = useState<ColorToken[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('logos');

    // Selected primary logo for documents
    const [primaryLogo, setPrimaryLogo] = useState<string | null>(null);
    const [primaryLogoInfo, setPrimaryLogoInfo] = useState<{ subBrand: string; colorVariant: string; logoType: string } | null>(null);

    // Editing State
    const [editingColor, setEditingColor] = useState<ColorToken | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    useEffect(() => {
        fetchBrandKit();
    }, []);

    const fetchBrandKit = async () => {
        try {
            const res = await fetch("/api/brand-kits");
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const kit = data[0];
                    setBrandKit(kit);
                    setColors(kit.colors as ColorToken[] || []);
                    // Load primary logo from assets if previously saved
                    if (kit.assets?.primaryLogo) {
                        setPrimaryLogo(kit.assets.primaryLogo);
                    }
                } else {
                    // Create default
                    await createDefaultBrandKit();
                }
            }
        } catch (error) {
            console.error("Failed to fetch brand kits", error);
        } finally {
            setIsLoading(false);
        }
    };

    const createDefaultBrandKit = async () => {
        try {
            const res = await fetch("/api/brand-kits", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Default Brand Kit",
                    colors: defaultColors,
                    fonts: {},
                    assets: {}
                })
            });
            if (res.ok) {
                const kit = await res.json();
                setBrandKit(kit);
                setColors(kit.colors as ColorToken[]);
            }
        } catch (error) {
            console.error("Failed to create default brand kit", error);
        }
    };

    const handleSaveColors = async (updatedColors: ColorToken[]) => {
        if (!brandKit) return;
        setIsSaving(true);
        try {
            await fetch(`/api/brand-kits/${brandKit.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    colors: updatedColors
                })
            });
        } catch (error) {
            console.error("Failed to save brand kit", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectLogo = async (logoPath: string, logoInfo: { subBrand: string; colorVariant: string; logoType: string }) => {
        setPrimaryLogo(logoPath);
        setPrimaryLogoInfo(logoInfo);

        // Save to database
        if (brandKit) {
            try {
                await fetch(`/api/brand-kits/${brandKit.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assets: {
                            ...(brandKit as unknown as { assets?: Record<string, unknown> }).assets,
                            primaryLogo: logoPath,
                            primaryLogoInfo: logoInfo
                        }
                    })
                });
            } catch (error) {
                console.error("Failed to save primary logo", error);
            }
        }
    };

    const handleDeleteColor = (id: string) => {
        const newColors = colors.filter(c => c.id !== id);
        setColors(newColors);
        handleSaveColors(newColors);
    };

    const handleAddColor = () => {
        const newColor: ColorToken = {
            id: Date.now().toString(),
            name: "New Color",
            value: "#FFFFFF",
            usage: "Usage description"
        };
        setEditingColor(newColor);
        setIsEditorOpen(true);
    };

    const handleEditColor = (color: ColorToken) => {
        setEditingColor({ ...color });
        setIsEditorOpen(true);
    };

    const handleSaveColor = () => {
        if (!editingColor) return;

        let newColors = [...colors];
        const index = newColors.findIndex(c => c.id === editingColor.id);

        if (index > -1) {
            newColors[index] = editingColor;
        } else {
            newColors.push(editingColor);
        }

        setColors(newColors);
        handleSaveColors(newColors);
        setIsEditorOpen(false);
        setEditingColor(null);
    };

    const handleImportComplete = (result: { success: boolean; brandKit?: { id: string; name: string } }) => {
        if (result.success) {
            // Refresh brand kit data
            fetchBrandKit();
            // Switch to logos tab to show imported assets
            setActiveTab('logos');
        }
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'logos', label: 'Logos', icon: <Image className="w-4 h-4" /> },
        { id: 'colors', label: 'Colors', icon: <Palette className="w-4 h-4" /> },
        { id: 'fonts', label: 'Fonts', icon: <Type className="w-4 h-4" /> },
        { id: 'import', label: 'Import', icon: <FileUp className="w-4 h-4" /> },
    ];

    if (isLoading) {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 p-8 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen relative">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* Header with Primary Logo Selection */}
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="font-serif text-3xl text-white mb-2">Brand Kit</h1>
                                <p className="text-gray-400">Manage your brand's visual identity and document styling.</p>
                            </div>
                            {primaryLogo && (
                                <div className="flex items-center gap-4 bg-black/20 rounded-xl p-4">
                                    <div className="bg-white/10 rounded-lg p-2">
                                        <img src={primaryLogo} alt="Primary logo" className="h-10 w-auto object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-400" />
                                            Primary Logo
                                        </p>
                                        <p className="text-sm text-white font-medium">
                                            {primaryLogoInfo?.subBrand} - {primaryLogoInfo?.logoType}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <nav className="flex border-b border-white/10">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-4 px-6 font-medium text-sm transition-colors flex items-center justify-center gap-2 ${activeTab === tab.id
                                        ? 'bg-[#139187]/20 text-[#139187] border-b-2 border-[#139187]'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        <div className="p-6">
                            {/* Logos Tab */}
                            {activeTab === 'logos' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-xl font-medium text-white">Logo Library</h2>
                                            <p className="text-sm text-gray-400">Select a logo to use as your primary document logo</p>
                                        </div>
                                    </div>
                                    <LogoBrowser
                                        logoCategories={brandKit?.logoCategories || {}}
                                        selectedLogo={primaryLogo || undefined}
                                        onSelectLogo={handleSelectLogo}
                                    />
                                </div>
                            )}

                            {/* Colors Tab */}
                            {activeTab === 'colors' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-medium text-white">Color Palette</h2>
                                        <Button variant="secondary" size="sm" onClick={handleAddColor}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Color
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {colors.map((color) => (
                                            <Card key={color.id} className="p-4 flex items-center gap-4 group">
                                                <div
                                                    className="w-14 h-14 rounded-xl border border-white/10 shadow-lg shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                                    style={{ backgroundColor: color.value }}
                                                    onClick={() => handleEditColor(color)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-white text-sm">{color.name}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded uppercase">{color.value}</span>
                                                    <p className="text-xs text-gray-400 truncate mt-1">{color.usage}</p>
                                                </div>
                                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-400 hover:text-white"
                                                        onClick={() => handleEditColor(color)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-500 hover:text-red-400"
                                                        onClick={() => handleDeleteColor(color.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fonts Tab */}
                            {activeTab === 'fonts' && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-medium text-white">Typography</h2>

                                    {brandKit?.fontFiles && brandKit.fontFiles.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Group fonts by family */}
                                            {Object.entries(
                                                brandKit.fontFiles.reduce((acc, font) => {
                                                    const family = font.family || font.name;
                                                    if (!acc[family]) acc[family] = [];
                                                    acc[family].push(font);
                                                    return acc;
                                                }, {} as Record<string, typeof brandKit.fontFiles>)
                                            ).map(([family, fonts]) => (
                                                <Card key={family} className="p-4">
                                                    <h3 className="text-white font-medium mb-2">{family}</h3>
                                                    <div className="space-y-1">
                                                        {fonts.map((font, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-300">{font.name}</span>
                                                                <span className="text-gray-500 text-xs uppercase">{font.format}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <Card className="p-6 space-y-4 text-center">
                                            <Type className="w-12 h-12 text-gray-500 mx-auto" />
                                            <div>
                                                <p className="text-gray-400">No fonts imported yet.</p>
                                                <p className="text-gray-500 text-sm">Import a brand kit containing fonts to see them here.</p>
                                            </div>

                                            <div className="border-t border-white/10 pt-4 mt-4">
                                                <p className="text-sm text-gray-400 mb-2">Default Document Fonts:</p>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-gray-400 text-xs mb-1">Headings (Serif)</p>
                                                        <p className="font-serif text-xl text-white">Instrument Serif</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 text-xs mb-1">Body (Sans)</p>
                                                        <p className="font-sans text-lg text-white">Plus Jakarta Sans / Inter</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* Import Tab */}
                            {activeTab === 'import' && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-medium text-white mb-2">Import Brand Kit</h2>
                                        <p className="text-sm text-gray-400">
                                            Upload a ZIP file containing your brand assets. We'll automatically organize logos, fonts, and brand documents.
                                        </p>
                                    </div>
                                    <BrandKitImporter onImportComplete={handleImportComplete} />

                                    <Card className="p-4 bg-white/5">
                                        <h4 className="text-white font-medium mb-2">Supported Structure</h4>
                                        <div className="text-sm text-gray-400 font-mono">
                                            <p>brand-kit.zip/</p>
                                            <p className="ml-4">├── Logos/</p>
                                            <p className="ml-8">├── Black/ (or White/)</p>
                                            <p className="ml-8">└── FullLogo.png, Icon.png, etc.</p>
                                            <p className="ml-4">├── Fonts/</p>
                                            <p className="ml-8">└── *.otf, *.ttf files</p>
                                            <p className="ml-4">└── BrandGuide.pdf</p>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Color Editor Modal */}
            {isEditorOpen && editingColor && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md p-6 rounded-xl space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-serif text-white">Edit Color</h3>
                            <button onClick={() => setIsEditorOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Name</label>
                                <Input
                                    value={editingColor.name}
                                    onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Hex Value</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={editingColor.value}
                                        onChange={(e) => setEditingColor({ ...editingColor, value: e.target.value })}
                                        className="w-14 h-12 rounded border border-white/20 cursor-pointer bg-transparent"
                                    />
                                    <Input
                                        value={editingColor.value}
                                        onChange={(e) => setEditingColor({ ...editingColor, value: e.target.value })}
                                        className="font-mono flex-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Usage</label>
                                <Input
                                    value={editingColor.usage}
                                    onChange={(e) => setEditingColor({ ...editingColor, usage: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button className="flex-1" onClick={handleSaveColor}>Save Color</Button>
                            <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
