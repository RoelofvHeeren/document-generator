'use client';

import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Upload, FileArchive, Loader2, CheckCircle, AlertCircle, Folder } from 'lucide-react';
import JSZip from 'jszip';

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
    const folderInputRef = useRef<HTMLInputElement>(null);

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

    const handleFolderInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setStatus('analyzing');
        setErrorMessage(null);

        try {
            const zip = new JSZip();
            let hasFiles = false;

            // Add all files to the zip
            // webkitRelativePath contains the full path including the root folder
            // e.g., "Brand Kit/Logos/logo.png"
            Array.from(files).forEach(file => {
                if (file.name.startsWith('.') || file.name === '.DS_Store') return;

                // Use the relative path to maintain structure
                // Remove the first directory component if it's the root folder to mimic a zip content
                // OR keep it - the backend handles nested folders gracefully now.
                // analyzing logic usually expects the root folder content. 
                // but local zip usually contains the root folder.
                // backend behavior: "If there's only one directory ... use that"
                // so keeping the structure as is (with root folder) is safer.

                if (file.webkitRelativePath) {
                    zip.file(file.webkitRelativePath, file);
                    hasFiles = true;
                } else {
                    // Fallback for browsers that might not set webkitRelativePath correctly for flat files
                    zip.file(file.name, file);
                    hasFiles = true;
                }
            });

            if (!hasFiles) {
                setErrorMessage('No valid files found in the selected folder.');
                setStatus('error');
                return;
            }

            // Generate ZIP blob
            const content = await zip.generateAsync({ type: 'blob' });

            // Create a File object from the blob
            const folderName = files[0].webkitRelativePath.split('/')[0] || 'brand-kit';
            const zipFile = new File([content], `${folderName}.zip`, { type: 'application/zip' });

            // Pass to existing handler
            handleFile(zipFile);

        } catch (error) {
            console.error('Failed to process folder:', error);
            setErrorMessage('Failed to process folder: ' + String(error));
            setStatus('error');
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
            // Create FormData and upload to the API
            const formData = new FormData();
            formData.append('file', file);
            formData.append('kitName', file.name.replace('.zip', ''));

            setStatus('importing');

            const response = await fetch(`/api/brand-kits/ingest?t=${Date.now()}`, {
                method: 'PUT',
                body: formData,
                cache: 'no-store', // Ensure we don't hit browser cache
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to import brand kit');
            }

            const importResult: ImportResult = {
                success: true,
                brandKit: data.brandKit,
                analysis: data.analysis
            };

            setResult(importResult);
            setStatus('success');
            onImportComplete(importResult);

        } catch (error) {
            console.error('Import failed:', error);
            setErrorMessage(error instanceof Error ? error.message : String(error));
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ZIP File Upload */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px]
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

                        <div className={`p-4 rounded-full mb-3 ${dragActive ? 'bg-[#139187]/20' : 'bg-white/5'}`}>
                            <FileArchive className={`w-8 h-8 ${dragActive ? 'text-[#139187]' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className="text-white font-medium">
                                Upload ZIP File
                            </p>
                            <p className="text-gray-500 text-sm mt-1">Drag & drop or click</p>
                        </div>
                    </div>

                    {/* Folder Upload */}
                    <div
                        onClick={() => folderInputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px]"
                    >
                        <input
                            ref={folderInputRef}
                            type="file"
                            // @ts-ignore - webkitdirectory is standard in modern browsers but missing in React types
                            webkitdirectory=""
                            directory=""
                            onChange={handleFolderInput}
                            className="hidden"
                        />

                        <div className="p-4 rounded-full bg-white/5 mb-3">
                            <Folder className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium">
                                Upload Folder
                            </p>
                            <p className="text-gray-500 text-sm mt-1">Select entire brand kit folder</p>
                        </div>
                    </div>

                    <div className="md:col-span-2 text-center mt-2">
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
