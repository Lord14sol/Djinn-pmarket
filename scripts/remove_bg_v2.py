
from PIL import Image
import math

def remove_white_bg_smart(input_path, output_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        
        # Calculate distance from White (255, 255, 255)
        dist = math.sqrt((r - 255)**2 + (g - 255)**2 + (b - 255)**2)
        
        # Threshold: if close to white (dist < 100), transparent.
        # Pink Star is roughly (255, 105, 180).
        # Dist to White: sqrt(0 + 150^2 + 75^2) = sqrt(22500 + 5625) = 167.
        # So threshold 100 is safe.
        
        if dist < 80:
             new_data.append((255, 255, 255, 0)) # Transparent
        else:
             new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    remove_white_bg_smart("public/openclaw-star-transparent.png", "public/openclaw-star-transparent.png")
