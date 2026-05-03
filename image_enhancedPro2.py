import cv2
import numpy as np
import os
from datetime import datetime

def crop_logo_to_perfect_square(input_path, master_filename="logo_quadrat_master.png"):
    # Load with UNCHANGED → preserves alpha (if present) and all original data
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Fehler: Bild nicht gefunden.")
        return

    # Determine number of channels (3 = BGR or 4 = BGRA)
    if len(img.shape) < 3:
        print("Nicht unterstützt: Graustufen-Bild.")
        return
    num_channels = img.shape[2]

    # Background color from top-left 5x5 (only RGB part)
    bg_sample = img[0:5, 0:5, :3]
    bg_color = np.round(np.mean(bg_sample, axis=(0, 1))).astype(np.uint8)

    # Detection works on RGB only
    rgb_part = img[:, :, :3] if num_channels == 4 else img
    diff = np.abs(rgb_part - bg_color)
    diff_sum = np.sum(diff, axis=2)
    mask = (diff_sum > 30).astype(np.uint8) * 255

    coords = cv2.findNonZero(mask)
    if coords is None:
        print("Kein Logo erkannt.")
        return

    x, y, w, h = cv2.boundingRect(coords)
    print(f"Breite startet bei: {x}, endet bei: {x+w} (Total: {w}px)")
    print(f"Höhe startet bei: {y}, endet bei: {y+h} (Total: {h}px)")

    # Exact crop of the original data (keeps alpha + every pixel unchanged)
    logo_only = img[y:y + h, x:x + w]

    # Build perfect square canvas with SAME number of channels
    size = max(w, h)
    if num_channels == 4:
        # Transparent background (alpha = 0)
        square_img = np.zeros((size, size, 4), dtype=np.uint8)
        square_img[:, :, :3] = bg_color
    else:
        square_img = np.full((size, size, 3), bg_color, dtype=np.uint8)

    # Center the logo perfectly
    offset_x = (size - w) // 2
    offset_y = (size - h) // 2
    square_img[offset_y:offset_y + h, offset_x:offset_x + w] = logo_only

    # ────────────────────────────────────────────────
    # Neuer Ordner mit Timestamp erstellen
    # Format: 2025-12-31_14-55-42
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_folder = f"logo_export_{timestamp}"
    
    try:
        os.makedirs(output_folder, exist_ok=True)
        print(f"Ordner erstellt: {output_folder}")
    except Exception as e:
        print(f"Fehler beim Erstellen des Ordners: {e}")
        return
    # ────────────────────────────────────────────────

    # Master-Bild speichern
    master_path = os.path.join(output_folder, master_filename)
    cv2.imwrite(master_path, square_img)
    print(f"Master-Bild gespeichert: {master_path}")

    # Chrome Extension Icons erstellen
    for icon_size in [16, 48, 128]:
        resized = cv2.resize(square_img, (icon_size, icon_size), interpolation=cv2.INTER_LANCZOS4)
        icon_filename = f"icon_{icon_size}.png"
        icon_path = os.path.join(output_folder, icon_filename)
        cv2.imwrite(icon_path, resized)
        print(f"Icon {icon_size}x{icon_size} gespeichert → {icon_path}")


# ────────────────────────────────────────
# Start
# ────────────────────────────────────────
if __name__ == "__main__":
    crop_logo_to_perfect_square('hasx.png')
    # Alternativ mit anderem Namen für das Master-Bild:
    # crop_logo_to_perfect_square('bird.png', 'mein_logo_master.png')