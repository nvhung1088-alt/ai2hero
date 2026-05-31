import os
from PIL import Image, ImageDraw, ImageFont

def create_image(filename, width, height, text, bg_color=(245, 96, 126), text_color=(255, 255, 255)):
    # Create image in RGB mode (no alpha channel, ensuring 24-bit PNG)
    img = Image.new('RGB', (width, height), color=bg_color)
    d = ImageDraw.Draw(img)
    
    # Try to load a nice font, fallback to default
    try:
        font = ImageFont.truetype("arial.ttf", size=max(24, int(height/10)))
    except IOError:
        font = ImageFont.load_default()
    
    # Draw text in the center
    text_bbox = d.textbbox((0, 0), text, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    
    d.text(((width - text_w) / 2, (height - text_h) / 2), text, font=font, fill=text_color)
    
    # Draw dimension text
    dim_text = f"{width}x{height}"
    try:
        dim_font = ImageFont.truetype("arial.ttf", size=max(16, int(height/20)))
    except IOError:
        dim_font = ImageFont.load_default()
        
    dim_bbox = d.textbbox((0, 0), dim_text, font=dim_font)
    dim_w = dim_bbox[2] - dim_bbox[0]
    dim_h = dim_bbox[3] - dim_bbox[1]
    
    d.text(((width - dim_w) / 2, (height - text_h) / 2 + text_h + 20), dim_text, font=dim_font, fill=text_color)

    # Save as PNG without alpha
    img.save(filename, format="PNG")
    print(f"Created {filename}")

if __name__ == '__main__':
    out_dir = r"C:\Users\ADMIN\OneDrive\Desktop\Ai2Hero\app\extension\store_assets"
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Screenshot (1280x800 or 640x400)
    create_image(os.path.join(out_dir, "screenshot_1_1280x800.png"), 1280, 800, "Screenshot: HeroSim Vault", bg_color=(15, 23, 42))
    create_image(os.path.join(out_dir, "screenshot_2_1280x800.png"), 1280, 800, "Screenshot: Autofill In Action", bg_color=(30, 41, 59))
    
    # 2. Small Promo Tile (440x280)
    create_image(os.path.join(out_dir, "promo_small_440x280.png"), 440, 280, "HeroSim", bg_color=(249, 115, 22))
    
    # 3. Marquee Promo Tile (1400x560)
    create_image(os.path.join(out_dir, "promo_marquee_1400x560.png"), 1400, 560, "HeroSim — AI2Hero Vault", bg_color=(236, 72, 153))
