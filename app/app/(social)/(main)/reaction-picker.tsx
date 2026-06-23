'use client';

import React, { useEffect, useRef } from 'react';

interface ReactionPickerProps {
  onReact: (type: string) => void;
  onClose: () => void;
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Thích', color: 'text-blue-400' },
  { type: 'love', emoji: '❤️', label: 'Yêu thích', color: 'text-red-500' },
  { type: 'haha', emoji: '😆', label: 'Haha', color: 'text-yellow-500' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  { type: 'sad', emoji: '😢', label: 'Buồn', color: 'text-blue-300' },
  { type: 'angry', emoji: '😡', label: 'Phẫn nộ', color: 'text-orange-600' }
];

export function ReactionPicker({ onReact, onClose }: ReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 bg-[#161618] border border-white/10 backdrop-blur-md rounded-full px-3 py-2 shadow-2xl flex items-center gap-2.5 z-[100] animate-scale-up select-none origin-bottom-left"
    >
      {REACTIONS.map((react, idx) => (
        <button
          key={react.type}
          type="button"
          onClick={() => {
            onReact(react.type);
            onClose();
          }}
          className="group relative flex flex-col items-center hover:scale-125 active:scale-95 transition-all duration-200 cursor-pointer p-0.5"
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          {/* Reaction Emoji */}
          <span className="text-2xl filter drop-shadow">{react.emoji}</span>
          
          {/* Tooltip label */}
          <span className="absolute bottom-full mb-1 text-[10px] font-bold bg-black/80 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {react.label}
          </span>
        </button>
      ))}
    </div>
  );
}