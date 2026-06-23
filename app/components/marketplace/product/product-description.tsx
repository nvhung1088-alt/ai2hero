import React from 'react';

export function ProductDescription() {
  return (
    <div className="flex flex-col gap-8">
      {/* Specs */}
      <div>
        <div className="bg-[#1a1a1f] px-4 py-3 rounded-xl inline-block mb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">Chi tiết sản phẩm</h2>
        </div>
        <div className="flex flex-col text-sm bg-white/5 rounded-xl px-6 py-2">
          <div className="flex items-center border-b border-white/5 py-4">
            <span className="w-32 text-white/40 shrink-0 font-medium">Danh Mục</span>
            <div className="text-pink-400 flex items-center gap-2 flex-wrap">
               <span className="hover:underline cursor-pointer">Ai2Hero Market</span> 
               <span className="text-white/20">{'>'}</span> 
               <span className="hover:underline cursor-pointer">Thiết Bị Điện Tử</span> 
               <span className="text-white/20">{'>'}</span> 
               <span className="hover:underline cursor-pointer">Âm Thanh</span>
            </div>
          </div>
          <div className="flex items-center border-b border-white/5 py-4">
            <span className="w-32 text-white/40 shrink-0 font-medium">Thương hiệu</span>
            <span className="text-white/80 hover:text-pink-400 cursor-pointer transition-colors">Ai2Hero</span>
          </div>
          <div className="flex items-center border-b border-white/5 py-4">
            <span className="w-32 text-white/40 shrink-0 font-medium">Kiểu kết nối</span>
            <span className="text-white/80">Không dây (Bluetooth 5.3)</span>
          </div>
          <div className="flex items-center border-b border-white/5 py-4">
            <span className="w-32 text-white/40 shrink-0 font-medium">Bảo hành</span>
            <span className="text-white/80">12 tháng chính hãng</span>
          </div>
          <div className="flex items-center py-4">
            <span className="w-32 text-white/40 shrink-0 font-medium">Gửi từ</span>
            <span className="text-white/80">Hà Nội</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="bg-[#1a1a1f] px-4 py-3 rounded-xl inline-block mb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">Mô tả sản phẩm</h2>
        </div>
        <div className="text-white/80 text-sm leading-relaxed space-y-4 px-2">
          <p className="text-lg font-bold text-pink-400">🔥 TAI NGHE BLUETOOTH AI2HERO PRO - CHỐNG ỒN CHỦ ĐỘNG ĐỈNH CAO 🔥</p>
          <p>
            Trải nghiệm âm thanh tuyệt hảo với công nghệ chống ồn chủ động ANC tiên tiến.
            Đắm chìm vào thế giới âm nhạc của riêng bạn mà không bị làm phiền bởi tiếng ồn xung quanh.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-white/70">
            <li>Công nghệ Bluetooth 5.3 mới nhất, kết nối ổn định, độ trễ cực thấp.</li>
            <li>Pin dung lượng cao, nghe nhạc liên tục lên đến 40 giờ (kèm hộp sạc).</li>
            <li>Microphone kép lọc gió, đàm thoại rõ ràng ngay cả khi đi đường.</li>
            <li>Thiết kế công thái học, đeo thoải mái cả ngày dài không gây đau tai.</li>
            <li>Điều khiển cảm ứng thông minh: Chạm để Play/Pause, Vuốt để tăng giảm âm lượng.</li>
          </ul>
          <div className="bg-pink-500/5 border border-pink-500/20 p-4 rounded-xl mt-4">
            <p>
              🎁 <strong>Quà tặng kèm:</strong> Tặng ngay ốp bảo vệ silicon cao cấp và cáp sạc nhanh Type-C.
            </p>
            <p className="mt-2 text-orange-400">
              ⚠️ <strong>Lưu ý:</strong> Vui lòng giữ lại hộp và phụ kiện để được hỗ trợ bảo hành tốt nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
