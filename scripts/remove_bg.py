
from PIL import Image
import sys

def remove_white_bg(input_path, output_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        # Check if pixel is white-ish (R>240, G>240, B>240)
        # Adjust threshold if needed. The star is pink, so it won't be pure white.
        if item[0] > 220 and item[1] > 220 and item[2] > 220:
            new_data.append((255, 255, 255, 0)) # Transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    remove_white_bg("public/openclaw-star-transparent.png", "public/openclaw-star-transparent.png")
