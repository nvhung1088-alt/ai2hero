"use client";
import React, { useState } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images?: string[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const dummyImages = [
    "bg-gradient-to-br from-pink-500 to-orange-500",
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "/placeholder-1.jpg",
    "/placeholder-2.jpg",
    "/placeholder-3.jpg",
    "/placeholder-4.jpg",
    "/placeholder-5.jpg",
  ];
  const [activeIdx, setActiveIdx] = useState(0);

  const displayImages = images?.length ? images : dummyImages;

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-white/10 bg-[#1a1a1f] group">
        <Image
          src={displayImages[activeIdx]}
          alt="Product"
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Thumbnails */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {displayImages.map((img, idx) => (
          <button 
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeIdx === idx ? 'border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'border-transparent hover:border-white/20'}`}
          >
            <Image
              src={img}
              alt={`Thumbnail ${idx + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
