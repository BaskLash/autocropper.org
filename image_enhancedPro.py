import cv2
import numpy as np

def crop_logo_to_perfect_square(input_path, output_path):
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

    # Detection works on RGB only (same logic as both scripts)
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

    # Center the logo perfectly (exact same math as Script 1)
    offset_x = (size - w) // 2
    offset_y = (size - h) // 2
    square_img[offset_y:offset_y + h, offset_x:offset_x + w] = logo_only

    # Save master image (pixel-perfect, alpha preserved if present)
    cv2.imwrite(output_path, square_img)

    # Optional: generate Chrome Extension icons (resizing is intentional here)
    for icon_size in [16, 48, 128]:
        resized = cv2.resize(square_img, (icon_size, icon_size), interpolation=cv2.INTER_LANCZOS4)
        cv2.imwrite(f"icon_{icon_size}.png", resized)
        print(f"Icon {icon_size}x{icon_size} erstellt.")


# Start
crop_logo_to_perfect_square('bird.png', 'logo_quadrat_master.png')