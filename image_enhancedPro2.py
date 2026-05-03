import cv2
import numpy as np
import os
from datetime import datetime

def crop_logo_to_perfect_square(input_path, master_filename="logo_quadrat_master.png"):
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Fehler: Bild nicht gefunden.")
        return

    if len(img.shape) < 3:
        print("Nicht unterstützt: Graustufen-Bild.")
        return
    num_channels = img.shape[2]
    H, W = img.shape[:2]
    rgb_part = img[:, :, :3] if num_channels == 4 else img

    # ─── Strategy A: Use alpha channel if available and meaningful ───
    mask = None
    bg_color = None
    if num_channels == 4:
        alpha = img[:, :, 3]
        if alpha.min() < 250:
            mask = (alpha > 10).astype(np.uint8) * 255
            print("Erkennung über Alpha-Kanal.")

    # ─── Strategy B: Sample background from all 4 corners ───
    if mask is None:
        corner = 20
        corners = [
            rgb_part[0:corner, 0:corner],
            rgb_part[0:corner, W-corner:W],
            rgb_part[H-corner:H, 0:corner],
            rgb_part[H-corner:H, W-corner:W],
        ]
        all_corner_pixels = np.concatenate([c.reshape(-1, 3) for c in corners], axis=0)
        bg_color = np.median(all_corner_pixels, axis=0).astype(np.int16)
        bg_std = np.std(all_corner_pixels, axis=0).mean()
        threshold = max(25, int(bg_std * 3.5))
        print(f"Hintergrund-Farbe (Median): {bg_color.tolist()}, "
              f"Rauschen σ={bg_std:.1f}, Schwellwert={threshold}")

        diff = np.abs(rgb_part.astype(np.int16) - bg_color)
        diff_sum = np.sum(diff, axis=2)
        mask = (diff_sum > threshold).astype(np.uint8) * 255

        # Gentle close only — fills small gaps WITHOUT eating thin features.
        # NO opening, because opening destroys thin rings.
        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)

    # ─── Bounding box of ALL significant components ───
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num_labels <= 1:
        print("Kein Logo erkannt.")
        return

    # Filter out noise: keep components with area > 0.005% of image
    # (e.g. for a 1000x667 image that's ~33 px — kills single-pixel noise
    # but keeps map dots, which are bigger)
    min_area = max(20, int(H * W * 0.00005))
    significant = [i for i in range(1, num_labels)
                   if stats[i, cv2.CC_STAT_AREA] >= min_area]

    if not significant:
        print("Kein signifikantes Logo erkannt.")
        return

    print(f"Komponenten gefunden: {num_labels - 1}, davon signifikant: {len(significant)}")

    # Bounding box that encloses ALL significant components
    x_min = min(stats[i, cv2.CC_STAT_LEFT] for i in significant)
    y_min = min(stats[i, cv2.CC_STAT_TOP] for i in significant)
    x_max = max(stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH]
                for i in significant)
    y_max = max(stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT]
                for i in significant)

    x, y = x_min, y_min
    w, h = x_max - x_min, y_max - y_min

    print(f"Breite startet bei: {x}, endet bei: {x+w} (Total: {w}px)")
    print(f"Höhe startet bei: {y}, endet bei: {y+h} (Total: {h}px)")

    logo_only = img[y:y + h, x:x + w]
    size = max(w, h)

    if num_channels == 4:
        square_img = np.zeros((size, size, 4), dtype=np.uint8)
    else:
        fill = bg_color.astype(np.uint8) if bg_color is not None \
               else np.array([0, 0, 0], dtype=np.uint8)
        square_img = np.full((size, size, 3), fill, dtype=np.uint8)

    offset_x = (size - w) // 2
    offset_y = (size - h) // 2
    square_img[offset_y:offset_y + h, offset_x:offset_x + w] = logo_only

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_folder = f"logo_export_{timestamp}"
    os.makedirs(output_folder, exist_ok=True)
    print(f"Ordner erstellt: {output_folder}")

    master_path = os.path.join(output_folder, master_filename)
    cv2.imwrite(master_path, square_img)
    print(f"Master-Bild gespeichert: {master_path}")

    for icon_size in [16, 48, 128]:
        resized = cv2.resize(square_img, (icon_size, icon_size),
                             interpolation=cv2.INTER_LANCZOS4)
        icon_path = os.path.join(output_folder, f"icon_{icon_size}.png")
        cv2.imwrite(icon_path, resized)
        print(f"Icon {icon_size}x{icon_size} gespeichert → {icon_path}")


if __name__ == "__main__":
    crop_logo_to_perfect_square('hastochangeagain.png')