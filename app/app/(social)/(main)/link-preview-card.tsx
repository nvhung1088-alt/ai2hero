'use client';

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewData {
  title: string;
  description: string;
  image: string | null;
  url: string;
  siteName?: string;
}

interface LinkPreviewCardProps {
  preview: LinkPreviewData;
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);
  const { title, description, image, url, siteName } = preview;

  const hostname = siteName || new URL(url).hostname;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 rounded-xl overflow-hidden transition-all duration-300 group cursor-pointer shadow-md select-none"
    >
      <div className="flex flex-col sm:flex-row items-stretch">
        
        {/* Link Thumbnail */}
        {image && !imgError && (
          <div className="relative w-full sm:w-40 md:w-48 shrink-0 aspect-video sm:aspect-auto min-h-[120px] bg-gray-950 overflow-hidden border-b sm:border-b-0 sm:border-r border-white/5">
            <img
              src={image}
              alt={title || 'Link Preview'}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* Link metadata details */}
        <div className="p-4 flex-1 min-w-0 flex flex-col justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">
              <span>{hostname}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <h4 className="text-xs md:text-sm font-bold text-white/90 group-hover:text-white transition-colors line-clamp-1">
              {title}
            </h4>
            <p className="text-[11px] md:text-xs text-white/45 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}