export default function ConnectHubLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full bg-transparent">
      <div className="flex flex-col items-center space-y-4 p-8 rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-xl">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-xs font-bold text-gray-400 tracking-wider">Đang kết nối dữ liệu...</p>
      </div>
    </div>
  );
}
