from PIL import Image
import os

def process(path):
    if not os.path.exists(path): return
    print(f"Processing {path}")
    img = Image.open(path).convert("RGBA")
    datas = img.getdata()
    new_data = []
    for item in datas:
        if item[0] > 230 and item[1] > 230 and item[2] > 230:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    # Save back
    img.save(path, "PNG")

process("public/game/grauzinho.png")
process("public/game/items.png")
print("Done")
