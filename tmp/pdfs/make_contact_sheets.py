from pathlib import Path

from PIL import Image, ImageDraw


source = Path(r"C:\BricksApp\tmp\pdfs\bricks-v05")
pages = sorted(source.glob("page-*.jpg"))

for offset in range(0, len(pages), 8):
    batch = pages[offset : offset + 8]
    images = [Image.open(page).convert("RGB") for page in batch]
    cell_width = max(image.width for image in images)
    cell_height = max(image.height for image in images) + 28
    canvas = Image.new("RGB", (cell_width * 4, cell_height * 2), "#D6D3CE")
    draw = ImageDraw.Draw(canvas)
    for index, (page, image) in enumerate(zip(batch, images)):
        x = (index % 4) * cell_width
        y = (index // 4) * cell_height
        canvas.paste(image, (x, y + 28))
        draw.text((x + 8, y + 7), page.stem, fill="#111111")
    canvas.save(source / f"contact-{offset // 8 + 1}.jpg", quality=92)
