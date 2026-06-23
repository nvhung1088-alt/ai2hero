'use client';

import { useState } from 'react';
import { PlaySquare, Image as ImageIcon } from 'lucide-react';
import { type FeedAttachment } from '@/lib/shared-constants';
import MediaLightbox from './media-lightbox';

interface PostMediaGridProps {
  attachments: FeedAttachment[];
}

export default function PostMediaGrid({ attachments }: PostMediaGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!attachments || attachments.length === 0) return null;

  // Filter out documents (we only grid images/videos)
  const visualMedia = attachments.filter(a => a.type === 'image' || a.type === 'video');
  const documents = attachments.filter(a => a.type === 'file');

  const handleMediaClick = (index: number) => {
    setLightboxIndex(index);
  };

  const renderMediaItem = (att: FeedAttachment, index: number, isLastInGrid: boolean, hiddenCount: number) => {
    return (
      <div 
        key={index} 
        className="relative w-full h-full bg-gray-950 overflow-hidden cursor-pointer group"
        onClick={() => handleMediaClick(index)}
      >
        {att.type === 'image' ? (
          <img 
            src={att.url} 
            alt={att.caption || 'Attachment Image'} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : att.type === 'video' ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
            <video 
              src={att.url} 
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="h-12 w-12 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                  <PlaySquare className="h-6 w-6 text-white" />
               </div>
            </div>
          </div>
        ) : (
           <div className="w-full h-full flex items-center justify-center bg-gray-900">
             <ImageIcon className="h-8 w-8 text-gray-500" />
           </div>
        )}

        {isLastInGrid && hiddenCount > 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-white text-3xl font-bold">+{hiddenCount}</span>
          </div>
        )}
      </div>
    );
  };

  const renderGrid = () => {
    const len = visualMedia.length;
    
    if (len === 1) {
      return (
        <div className="w-full max-h-[600px] overflow-hidden rounded-xl border border-white/5">
          {renderMediaItem(visualMedia[0], 0, false, 0)}
        </div>
      );
    }
    
    if (len === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden border border-white/5">
          {visualMedia.map((media, idx) => renderMediaItem(media, idx, false, 0))}
        </div>
      );
    }

    if (len === 3) {
      return (
        <div className="grid grid-cols-2 gap-1 w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden border border-white/5">
          <div className="col-span-1 h-full">
            {renderMediaItem(visualMedia[0], 0, false, 0)}
          </div>
          <div className="col-span-1 grid grid-rows-2 gap-1 h-full">
            {renderMediaItem(visualMedia[1], 1, false, 0)}
            {renderMediaItem(visualMedia[2], 2, false, 0)}
          </div>
        </div>
      );
    }

    if (len === 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden border border-white/5">
          {visualMedia.map((media, idx) => renderMediaItem(media, idx, false, 0))}
        </div>
      );
    }

    if (len >= 5) {
      return (
        <div className="grid grid-cols-2 gap-1 w-full h-[400px] rounded-xl overflow-hidden border border-white/5">
          <div className="col-span-2 grid grid-cols-2 gap-1 h-[200px]">
             {renderMediaItem(visualMedia[0], 0, false, 0)}
             {renderMediaItem(visualMedia[1], 1, false, 0)}
          </div>
          <div className="col-span-2 grid grid-cols-3 gap-1 h-[196px]">
             {renderMediaItem(visualMedia[2], 2, false, 0)}
             {renderMediaItem(visualMedia[3], 3, false, 0)}
             {renderMediaItem(visualMedia[4], 4, true, len - 5)}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      {visualMedia.length > 0 && renderGrid()}
      
      {/* Documents are rendered below the grid */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {documents.map((att, idx) => (
             <div key={`doc-${idx}`} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center">
                    📄
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[200px]">{att.fileName || 'Tài liệu'}</p>
                    <p className="text-[10px] text-gray-500">{att.caption || 'Tài liệu đi kèm'}</p>
                  </div>
                </div>
                <button className="text-xs text-orange-400 font-bold hover:underline cursor-pointer">
                  Tải xuống
                </button>
             </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <MediaLightbox 
          attachments={visualMedia} 
          initialIndex={lightboxIndex} 
          onClose={() => setLightboxIndex(null)} 
        />
      )}
    </div>
  );
}
