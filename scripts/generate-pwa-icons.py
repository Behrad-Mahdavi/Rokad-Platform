import os
from PIL import Image, ImageDraw

def generate_icon(size, output_path, is_maskable=False):
    # Scale factor for supersampling anti-aliasing
    scale = 4
    s = size * scale
    
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    bg_color = (89, 187, 175, 255) # #59BBAF
    
    if is_maskable:
        # Full bleed square for maskable
        draw.rectangle([0, 0, s, s], fill=bg_color)
        # safe area padding
        content_margin = int(s * 0.20)
    else:
        # Rounded rectangle
        corner_radius = int(s * 0.22)
        draw.rounded_rectangle([0, 0, s, s], radius=corner_radius, fill=bg_color)
        content_margin = int(s * 0.16)
        
    # Draw stylized 'R' in white inside content area
    w = s - (2 * content_margin)
    h = s - (2 * content_margin)
    ox = content_margin
    oy = content_margin
    
    white = (255, 255, 255, 255)
    
    # Outer coordinates relative to (ox, oy)
    # Using the path:
    # M30 70 L30 30 L55 30 C65 30 70 35 70 45 C70 52 65 57 58 59 L72 70 L58 70 L46 60 L42 60 L42 70 Z
    # Base 0..100 normalized:
    def n(x, y):
        return (ox + (x / 100.0) * w, oy + (y / 100.0) * h)
    
    # Let's draw outer polygon and inner hole
    # Outer 'R' shape
    poly = [
        n(26, 75), n(26, 25), n(56, 25),
        n(68, 27), n(74, 34), n(74, 45),
        n(70, 52), n(62, 57),
        n(75, 75), n(60, 75),
        n(48, 61), n(40, 61),
        n(40, 75)
    ]
    draw.polygon(poly, fill=white)
    
    # Inner hole
    inner_poly = [
        n(40, 37), n(54, 37),
        n(61, 38), n(63, 41), n(63, 47),
        n(60, 50), n(53, 51),
        n(40, 51)
    ]
    draw.polygon(inner_poly, fill=bg_color)
    
    # Resize down with Lanczos anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_img.save(output_path, "PNG")
    print(f"Generated: {output_path} ({size}x{size})")

if __name__ == "__main__":
    out_dir = "/Users/behrad/Desktop/Projects/rokad-platform/frontend/public/icons"
    generate_icon(192, f"{out_dir}/pwa-192x192.png")
    generate_icon(512, f"{out_dir}/pwa-512x512.png")
    generate_icon(180, f"{out_dir}/apple-touch-icon.png")
    generate_icon(512, f"{out_dir}/maskable-icon-512x512.png", is_maskable=True)
    generate_icon(32, f"{out_dir}/favicon-32x32.png")
    generate_icon(16, f"{out_dir}/favicon-16x16.png")
