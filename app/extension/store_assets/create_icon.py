import os
from PIL import Image, ImageDraw, ImageFont

def create_store_icon(filepath):
    # Kích thước 128x128, nền trong suốt hoàn toàn (RGBA)
    size = 128
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Nguyên tắc của Google: Không để ảnh tràn sát viền.
    # Nên có padding 16px. Do đó, kích thước hình vẽ chính là 96x96 (từ 16 đến 112).
    pad = 16
    inner_size = size - pad * 2
    
    # Gradient background cho icon
    # Pillow không hỗ trợ vẽ gradient bounding box bo tròn một cách native tốt.
    # Ta sẽ tạo một ảnh gradient trước, sau đó dùng mask để bo tròn.
    gradient = Image.new('RGBA', (size, size), color=0)
    draw_grad = ImageDraw.Draw(gradient)
    
    # Cam (249, 115, 22) -> Hồng (219, 39, 119)
    color1 = (249, 115, 22, 255)
    color2 = (219, 39, 119, 255)
    
    for y in range(size):
        r = int(color1[0] + (color2[0] - color1[0]) * y / size)
        g = int(color1[1] + (color2[1] - color1[1]) * y / size)
        b = int(color1[2] + (color2[2] - color1[2]) * y / size)
        draw_grad.line([(0, y), (size, y)], fill=(r, g, b, 255))
        
    # Tạo mask hình chữ nhật bo góc (hoặc hình tròn) tại khu vực 16->112
    mask = Image.new('L', (size, size), color=0)
    draw_mask = ImageDraw.Draw(mask)
    
    # Bán kính bo góc: khoảng 20-25% của inner_size
    radius = 24
    draw_mask.rounded_rectangle([pad, pad, size-pad, size-pad], radius=radius, fill=255)
    
    # Kết hợp gradient và mask
    icon_bg = Image.composite(gradient, img, mask)
    
    # Vẽ biểu tượng (Ví dụ: Chữ H phong cách logo hoặc biểu tượng ổ khoá đơn giản)
    # Vì chúng ta không có file SVG ở dạng raster, ta sẽ vẽ chữ 'H' thật đẹp, đại diện cho HeroSim
    draw_icon = ImageDraw.Draw(icon_bg)
    try:
        # Cố load font đậm
        font = ImageFont.truetype("arialbd.ttf", 60)
    except:
        font = ImageFont.load_default()
        
    text = "H"
    text_bbox = draw_icon.textbbox((0, 0), text, font=font)
    tw = text_bbox[2] - text_bbox[0]
    th = text_bbox[3] - text_bbox[1]
    
    # Canh giữa
    draw_icon.text(((size - tw) / 2, (size - th) / 2 - 5), text, font=font, fill=(255, 255, 255, 255))
    
    # Lưu ra định dạng PNG (có kênh Alpha để duy trì nền trong suốt ngoài padding)
    icon_bg.save(filepath, format="PNG")
    print(f"Đã tạo thành công icon chuẩn CWS: {filepath}")

if __name__ == '__main__':
    out_dir = r"C:\Users\ADMIN\OneDrive\Desktop\Ai2Hero\app\extension\store_assets"
    os.makedirs(out_dir, exist_ok=True)
    icon_path = os.path.join(out_dir, "store_icon_128x128_new.png")
    create_store_icon(icon_path)
