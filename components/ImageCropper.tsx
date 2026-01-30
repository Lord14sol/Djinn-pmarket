import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Save } from 'lucide-react';

interface ImageCropperProps {
    imageSrc: string;
    aspectRatio?: number; // width / height
    onCropComplete: (croppedImage: string) => void;
    onCancel: () => void;
}

export default function ImageCropper({ imageSrc, aspectRatio = 3, onCropComplete, onCancel }: ImageCropperProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Calculate crop area dimensions based on container width and aspect ratio
    // We'll aim for a specific visual width, e.g., 600px max
    const CROP_WIDTH = 600;
    const CROP_HEIGHT = CROP_WIDTH / aspectRatio;

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Add boundary checks here if we want to force image to cover crop area
        // For now, let's allow free pan for flexibility
        setPan({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSave = () => {
        if (!imageRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas to final output size (high res)
        // Let's output at 3x the display crop size for quality
        const outputScale = 3;
        canvas.width = CROP_WIDTH * outputScale;
        canvas.height = CROP_HEIGHT * outputScale;

        // Draw image transformed
        // We need to map the visual pan/zoom to the canvas coordinates
        // Visual center is CROP_WIDTH/2, CROP_HEIGHT/2

        // 1. Clear background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Setup transformation
        // Origin at center
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(pan.x * outputScale, pan.y * outputScale);

        // 3. Draw image centered
        // We need the natural size of the image
        const img = imageRef.current;
        const naturalRatio = img.naturalWidth / img.naturalHeight;

        // Initial fit logic: contain or cover?
        // Let's assume the image starts fitted to width in the view
        // visual width = CROP_WIDTH
        // scale factor relative to natural size:
        const baseScale = (CROP_WIDTH * outputScale) / img.naturalWidth;

        ctx.drawImage(
            img,
            - (img.naturalWidth * baseScale) / 2,
            - (img.naturalHeight * baseScale) / 2,
            img.naturalWidth * baseScale,
            img.naturalHeight * baseScale
        );

        const result = canvas.toDataURL('image/jpeg', 0.9);
        onCropComplete(result);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Edit Media</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative w-full flex justify-center mb-8 select-none"
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* The "Viewport" */}
                    <div
                        ref={containerRef}
                        style={{ width: CROP_WIDTH, height: CROP_HEIGHT }}
                        className="relative overflow-hidden border-2 border-[#F492B7] rounded-lg cursor-move bg-black"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                    >
                        {/* The Image */}
                        <div
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: 'center center',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="Crop target"
                                className="max-w-none w-full object-contain pointer-events-none"
                                draggable={false}
                            />
                        </div>

                        {/* Grid Overlay */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                            <div className="border-r border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div className="border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div className="border-b border-white"></div>
                            <div className="border-r border-white"></div>
                            <div className="border-r border-white"></div>
                            <div></div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 text-gray-400">
                        <ZoomOut className="w-4 h-4" />
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.01"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full accent-[#F492B7] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <ZoomIn className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSave}
                            className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
