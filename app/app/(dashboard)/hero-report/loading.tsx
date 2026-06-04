export default function HeroReportLoading() {
  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto animate-pulse">
      {/* Overview stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-3" />
        ))}
      </div>

      {/* Main layout skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-64 bg-white/[0.02] border border-white/5 rounded-lg" />
        <div className="h-96 rounded-2xl bg-white/[0.02] border border-white/5 p-6" />
      </div>
    </div>
  );
}
