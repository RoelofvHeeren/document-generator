'use client';

import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Upload, FileArchive, Loader2, CheckCircle, AlertCircle, Folder } from 'lucide-react';

interface ImportResult {
    success: boolean;
    brandKit?: {
        id: string;
        name: string;
        sourceFolder: string;
    };
    analysis?: {
        totalItems: number;
        totalSize: string;
        summary: {
            subBrands: string[];
            logoCount: number;
            fontCount: number;
            documentCount: number;
        };
    };
    error?: string;
}

interface BrandKitImporterProps {
    onImportComplete: (result: ImportResult) => void;
}

type ImportStatus = 'idle' | 'analyzing' | 'importing' | 'success' | 'error';

export function BrandKitImporter({ onImportComplete }: BrandKitImporterProps) {
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    };

    const handleFile = async (file: File) => {
        // Check if it's a ZIP file
        if (!file.name.endsWith('.zip')) {
            setErrorMessage('Please upload a ZIP file containing your brand kit.');
            setStatus('error');
            return;
        }

        setSelectedFile(file);
        setStatus('analyzing');
        setErrorMessage(null);

        try {
            // Create FormData and upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('kitName', file.name.replace('.zip', ''));

            // For now, we'll simulate the upload since we need server-side ZIP handling
            // In production, this would upload to an API that extracts and processes the ZIP

            // Simulated analysis delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            setStatus('importing');

            // Another simulated delay for import
            await new Promise(resolve => setTimeout(resolve, 2000));

            // For demo purposes, show a success with mock data
            // In production, this would be the actual response from the API
            const mockResult: ImportResult = {
                success: true,
                brandKit: {
                    id: 'demo-kit-' + Date.now(),
                    name: file.name.replace('.zip', ''),
                    sourceFolder: file.name
                },
                analysis: {
                    totalItems: 110,
                    totalSize: '58.4 MB',
                    summary: {
                        subBrands: ['Homes', 'Properties'],
                        logoCount: 35,
                        fontCount: 18,
                        documentCount: 2
                    }
                }
            };

            setResult(mockResult);
            setStatus('success');
            onImportComplete(mockResult);

        } catch (error) {
            console.error('Import failed:', error);
            setErrorMessage(String(error));
            setStatus('error');
        }
    };

    const resetImporter = () => {
        setStatus('idle');
        setSelectedFile(null);
        setResult(null);
        setErrorMessage(null);
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-white font-medium">Import Brand Kit</h3>
                    <p className="text-gray-400 text-sm">Upload a ZIP file containing your brand assets</p>
                </div>
                {status !== 'idle' && (
                    <Button variant="ghost" size="sm" onClick={resetImporter}>
                        Reset
                    </Button>
                )}
            </div>

            {status === 'idle' && (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragActive
                            ? 'border-[#139187] bg-[#139187]/10'
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        }
          `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center gap-3">
                        <div className={`p-4 rounded-full ${dragActive ? 'bg-[#139187]/20' : 'bg-white/5'}`}>
                            <FileArchive className={`w-8 h-8 ${dragActive ? 'text-[#139187]' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className="text-white font-medium">
                                {dragActive ? 'Drop your brand kit here' : 'Drag & drop your brand kit ZIP'}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">or click to browse</p>
                        </div>
                        <p className="text-gray-600 text-xs">
                            Supports: Logos (PNG, JPG, SVG), Fonts (OTF, TTF), Brand guides (PDF)
                        </p>
                    </div>
                </div>
            )}

            {(status === 'analyzing' || status === 'importing') && (
                <div className="border border-white/10 rounded-xl p-8 text-center">
                    <Loader2 className="w-10 h-10 text-[#139187] animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium">
                        {status === 'analyzing' ? 'Analyzing brand kit...' : 'Importing assets...'}
                    </p>
                    {selectedFile && (
                        <p className="text-gray-400 text-sm mt-2">{selectedFile.name}</p>
                    )}
                    <div className="mt-4 w-full max-w-xs mx-auto bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#139187] to-[#0d6b63] transition-all duration-500"
                            style={{ width: status === 'analyzing' ? '40%' : '80%' }}
                        />
                    </div>
                </div>
            )}

            {status === 'success' && result && (
                <div className="border border-green-500/30 bg-green-500/10 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-green-400 font-medium text-lg">Brand Kit Imported!</p>
                            <p className="text-gray-300 text-sm mt-1">
                                {result.brandKit?.name}
                            </p>

                            {result.analysis && (
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-white">{result.analysis.summary.logoCount}</p>
                                        <p className="text-xs text-gray-400">Logos</p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-white">{result.analysis.summary.fontCount}</p>
                                        <p className="text-xs text-gray-400">Fonts</p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-white">{result.analysis.summary.subBrands.length}</p>
                                        <p className="text-xs text-gray-400">Sub-brands</p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-white">{result.analysis.totalSize}</p>
                                        <p className="text-xs text-gray-400">Total Size</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />
                        <div>
                            <p className="text-red-400 font-medium">Import Failed</p>
                            <p className="text-gray-300 text-sm mt-1">{errorMessage}</p>
                            <Button variant="secondary" size="sm" className="mt-4" onClick={resetImporter}>
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
