'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronRight, ChevronDown, Check, Image as ImageIcon } from 'lucide-react';

interface LogoCategories {
    [subBrand: string]: {
        [colorVariant: string]: {
            [logoType: string]: string; // URL path
        };
    };
}

interface LogoBrowserProps {
    logoCategories: LogoCategories;
    selectedLogo?: string;
    onSelectLogo: (logoPath: string, logoInfo: { subBrand: string; colorVariant: string; logoType: string }) => void;
}

export function LogoBrowser({ logoCategories, selectedLogo, onSelectLogo }: LogoBrowserProps) {
    const [expandedSubBrands, setExpandedSubBrands] = useState<Set<string>>(new Set(Object.keys(logoCategories)));
    const [expandedColorVariants, setExpandedColorVariants] = useState<Set<string>>(new Set());
    const [previewBackground, setPreviewBackground] = useState<'dark' | 'light'>('dark');
    const [hoveredLogo, setHoveredLogo] = useState<string | null>(null);

    const toggleSubBrand = (subBrand: string) => {
        const newExpanded = new Set(expandedSubBrands);
        if (newExpanded.has(subBrand)) {
            newExpanded.delete(subBrand);
        } else {
            newExpanded.add(subBrand);
        }
        setExpandedSubBrands(newExpanded);
    };

    const toggleColorVariant = (key: string) => {
        const newExpanded = new Set(expandedColorVariants);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedColorVariants(newExpanded);
    };

    const previewLogo = hoveredLogo || selectedLogo;

    if (!logoCategories || Object.keys(logoCategories).length === 0) {
        return (
            <Card className="p-8 text-center">
                <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No logos imported yet.</p>
                <p className="text-gray-500 text-sm mt-1">Import a brand kit to see logos here.</p>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo Tree */}
            <Card className="p-4 max-h-[500px] overflow-y-auto">
                <h3 className="text-white font-medium mb-4">Logo Library</h3>

                <div className="space-y-1">
                    {Object.entries(logoCategories).map(([subBrand, colorVariants]) => (
                        <div key={subBrand}>
                            {/* Sub-brand level */}
                            <button
                                onClick={() => toggleSubBrand(subBrand)}
                                className="w-full flex items-center gap-2 px-2 py-2 text-left text-gray-200 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                {expandedSubBrands.has(subBrand) ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="font-medium">{subBrand}</span>
                                <span className="text-xs text-gray-500 ml-auto">
                                    {Object.keys(colorVariants).length} variants
                                </span>
                            </button>

                            {/* Color variants */}
                            {expandedSubBrands.has(subBrand) && (
                                <div className="ml-4 border-l border-white/10 pl-2">
                                    {Object.entries(colorVariants).map(([colorVariant, logoTypes]) => {
                                        const variantKey = `${subBrand}/${colorVariant}`;
                                        return (
                                            <div key={variantKey}>
                                                <button
                                                    onClick={() => toggleColorVariant(variantKey)}
                                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-sm"
                                                >
                                                    {expandedColorVariants.has(variantKey) || Object.keys(logoTypes).length <= 3 ? (
                                                        <ChevronDown className="w-3 h-3 text-gray-500" />
                                                    ) : (
                                                        <ChevronRight className="w-3 h-3 text-gray-500" />
                                                    )}
                                                    <span className={`w-3 h-3 rounded-full ${colorVariant === 'White' ? 'bg-white' : colorVariant === 'Black' ? 'bg-black border border-white/20' : 'bg-gradient-to-r from-gray-400 to-gray-600'}`} />
                                                    <span>{colorVariant}</span>
                                                </button>

                                                {/* Logo types */}
                                                {(expandedColorVariants.has(variantKey) || Object.keys(logoTypes).length <= 3) && (
                                                    <div className="ml-6 space-y-0.5">
                                                        {Object.entries(logoTypes).map(([logoType, logoPath]) => {
                                                            const isSelected = selectedLogo === logoPath;
                                                            return (
                                                                <button
                                                                    key={logoPath}
                                                                    onClick={() => onSelectLogo(logoPath, { subBrand, colorVariant, logoType })}
                                                                    onMouseEnter={() => setHoveredLogo(logoPath)}
                                                                    onMouseLeave={() => setHoveredLogo(null)}
                                                                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-lg transition-all text-sm ${isSelected
                                                                            ? 'bg-[#139187]/20 text-[#139187] border border-[#139187]/30'
                                                                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                                                        }`}
                                                                >
                                                                    <ImageIcon className="w-3 h-3" />
                                                                    <span className="truncate">{logoType}</span>
                                                                    {isSelected && <Check className="w-3 h-3 ml-auto" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Preview Panel */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Preview</h3>
                    <div className="flex gap-1 bg-black/20 rounded-lg p-1">
                        <button
                            onClick={() => setPreviewBackground('dark')}
                            className={`px-3 py-1 text-xs rounded ${previewBackground === 'dark' ? 'bg-white/10 text-white' : 'text-gray-400'}`}
                        >
                            Dark
                        </button>
                        <button
                            onClick={() => setPreviewBackground('light')}
                            className={`px-3 py-1 text-xs rounded ${previewBackground === 'light' ? 'bg-white text-black' : 'text-gray-400'}`}
                        >
                            Light
                        </button>
                    </div>
                </div>

                <div
                    className={`aspect-video rounded-lg flex items-center justify-center p-8 ${previewBackground === 'dark' ? 'bg-gray-900' : 'bg-white'
                        }`}
                >
                    {previewLogo ? (
                        <img
                            src={previewLogo}
                            alt="Logo preview"
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <p className={`text-sm ${previewBackground === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Select a logo to preview
                        </p>
                    )}
                </div>

                {selectedLogo && (
                    <div className="mt-4 p-3 bg-black/20 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Selected Logo</p>
                        <p className="text-sm text-white font-mono truncate">{selectedLogo}</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
