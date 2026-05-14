from PIL import Image
import os

input_path = r"D:\EDITS\Music\rizz master ss\ChatGPT Image May 14, 2026, 10_00_14 AM.png"
output_path = "c:/Users/rv941/.gemini/antigravity/scratch/bible-gpt/assets/logo.png"

img = Image.open(input_path)
img = img.convert("RGBA")

datas = img.getdata()
new_data = []

# Define tolerance
tolerance = 240

for item in datas:
    # If the pixel is close to white, make it transparent
    if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)

img.putdata(new_data)
img.save(output_path, "PNG")

# also copy to icon.png and splash.png
import shutil
shutil.copy(output_path, "c:/Users/rv941/.gemini/antigravity/scratch/bible-gpt/assets/icon.png")
shutil.copy(output_path, "c:/Users/rv941/.gemini/antigravity/scratch/bible-gpt/assets/splash.png")

print("Successfully converted background to transparent and saved.")
