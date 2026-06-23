import React from 'react';

export default function SocialLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse px-2 sm:px-0">
      
      {/* Skeleton Post Composer */}
      <div className="bg-gray-900/20 border border-white/5 p-4 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
          <div className="h-10 flex-1 bg-white/5 rounded-xl" />
        </div>
        <div className="border-t border-white/5 pt-3 flex justify-between gap-4">
          <div className="h-8 w-24 bg-white/5 rounded-lg" />
          <div className="h-8 w-24 bg-white/5 rounded-lg" />
          <div className="h-8 w-24 bg-white/5 rounded-lg" />
        </div>
      </div>

      {/* Skeleton Post Card 1 */}
      <div className="bg-gray-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-1/3 bg-white/5 rounded" />
            <div className="h-2.5 w-1/4 bg-white/5 rounded" />
          </div>
        </div>
        <div className="space-y-2.5 pt-2">
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-5/6 bg-white/5 rounded" />
          <div className="h-3 w-2/3 bg-white/5 rounded" />
        </div>
        <div className="h-48 w-full bg-white/5 rounded-xl mt-4" />
        <div className="border-t border-white/5 pt-3 flex justify-between">
          <div className="h-7 w-16 bg-white/5 rounded-lg" />
          <div className="h-7 w-20 bg-white/5 rounded-lg" />
          <div className="h-7 w-16 bg-white/5 rounded-lg" />
        </div>
      </div>

      {/* Skeleton Post Card 2 */}
      <div className="bg-gray-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-1/3 bg-white/5 rounded" />
            <div className="h-2.5 w-1/4 bg-white/5 rounded" />
          </div>
        </div>
        <div className="space-y-2.5 pt-2">
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-4/5 bg-white/5 rounded" />
        </div>
      </div>

    </div>
  );
}