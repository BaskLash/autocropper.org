import cv2
import numpy as np
import os
from datetime import datetime

def crop_logo_to_perfect_square(input_path, master_filename="logo_quadrat_master.png",
                                 transparent_background=True, debug=False,
                                 decontaminate=True):
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

    # ─── Maske erstellen ───
    mask = None
    soft_mask = None
    bg_color = None
    original_had_alpha = False

    if num_channels == 4:
        alpha = img[:, :, 3]
        if alpha.min() < 250:
            mask = (alpha > 10).astype(np.uint8) * 255
            soft_mask = alpha.copy()
            original_had_alpha = True
            print("Erkennung über Alpha-Kanal.")

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
        threshold = max(20, int(bg_std * 3.5))
        print(f"Hintergrund-Farbe (Median): {bg_color.tolist()}, "
              f"Rauschen σ={bg_std:.2f}, Schwellwert={threshold}")

        diff = np.abs(rgb_part.astype(np.int16) - bg_color)
        diff_sum = np.sum(diff, axis=2)

        transition_width = max(15, threshold // 2)
        soft_mask = np.clip(
            (diff_sum - threshold) / transition_width * 255, 0, 255
        ).astype(np.uint8)

        mask = (diff_sum > threshold).astype(np.uint8) * 255

        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
        soft_mask = cv2.morphologyEx(soft_mask, cv2.MORPH_CLOSE, kernel, iterations=1)

    # ─── Bounding Box ───
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num_labels <= 1:
        print("Kein Logo erkannt.")
        return

    min_area = max(20, int(H * W * 0.00005))
    significant = [i for i in range(1, num_labels)
                   if stats[i, cv2.CC_STAT_AREA] >= min_area]

    if not significant:
        print("Kein signifikantes Logo erkannt.")
        return

    print(f"Komponenten gefunden: {num_labels - 1}, davon signifikant: {len(significant)}")

    x_min = min(stats[i, cv2.CC_STAT_LEFT] for i in significant)
    y_min = min(stats[i, cv2.CC_STAT_TOP] for i in significant)
    x_max = max(stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH]
                for i in significant)
    y_max = max(stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT]
                for i in significant)

    x, y = x_min, y_min
    w, h = x_max - x_min, y_max - y_min

    print(f"Breite: {x} bis {x+w} ({w}px), Höhe: {y} bis {y+h} ({h}px)")

    logo_rgb = rgb_part[y:y + h, x:x + w].astype(np.float32)

    # ─── Transparenz + Color Decontamination ───
    if transparent_background:
        if original_had_alpha:
            logo_alpha = img[y:y + h, x:x + w, 3]
        else:
            logo_alpha = soft_mask[y:y + h, x:x + w]

        if decontaminate and bg_color is not None:
            # ═══════════════════════════════════════════════════════════
            # COLOR DECONTAMINATION
            # Formel: foreground = (observed - bg × (1 - α)) / α
            # 
            # Für jeden Pixel berechnen wir den "echten" Vordergrund,
            # bevor er mit dem Hintergrund vermischt wurde.
            # ═══════════════════════════════════════════════════════════
            alpha_norm = logo_alpha.astype(np.float32) / 255.0
            bg_float = bg_color.astype(np.float32)

            # Decontamination nur dort anwenden, wo Alpha < 1.0 (Kantenpixel)
            # Voll opake Pixel (Alpha = 1.0) bleiben unverändert
            
            # Sicherheitsclip damit wir nicht durch Null teilen
            alpha_safe = np.maximum(alpha_norm, 0.01)
            
            # Per-Channel Decontamination
            decontaminated = np.zeros_like(logo_rgb)
            for c in range(3):
                # f = (o - bg × (1 - α)) / α
                decontaminated[:, :, c] = (
                    logo_rgb[:, :, c] - bg_float[c] * (1.0 - alpha_norm)
                ) / alpha_safe
            
            # Werte in gültigen Bereich clampen
            decontaminated = np.clip(decontaminated, 0, 255)
            
            # Blend zwischen Original und Decontaminated basierend auf Alpha:
            # Bei Alpha = 1.0 → 100% Original (kein Bedarf an Decontamination)
            # Bei Alpha < 1.0 → graduell mehr Decontamination, je transparenter
            blend_weight = (1.0 - alpha_norm)[:, :, np.newaxis]
            logo_rgb_final = (
                logo_rgb * (1.0 - blend_weight) + 
                decontaminated * blend_weight
            )
            logo_rgb_final = np.clip(logo_rgb_final, 0, 255).astype(np.uint8)
            
            print(f"Color Decontamination angewendet (Hintergrund: BGR {bg_color.tolist()})")
        else:
            logo_rgb_final = np.clip(logo_rgb, 0, 255).astype(np.uint8)

        logo_only = np.dstack([logo_rgb_final, logo_alpha])
        output_channels = 4
        print(f"Hintergrund transparent. Alpha-Bereich: min={logo_alpha.min()}, max={logo_alpha.max()}")
    else:
        logo_only = img[y:y + h, x:x + w]
        output_channels = num_channels

    # ─── Quadratisches Canvas ───
    size = max(w, h)
    if output_channels == 4:
        square_img = np.zeros((size, size, 4), dtype=np.uint8)
    else:
        fill = bg_color.astype(np.uint8) if bg_color is not None \
               else np.array([0, 0, 0], dtype=np.uint8)
        square_img = np.full((size, size, 3), fill, dtype=np.uint8)

    offset_x = (size - w) // 2
    offset_y = (size - h) // 2
    square_img[offset_y:offset_y + h, offset_x:offset_x + w] = logo_only

    # ─── Speichern ───
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_folder = f"logo_export_{timestamp}"
    os.makedirs(output_folder, exist_ok=True)

    if debug:
        cv2.imwrite(os.path.join(output_folder, "_debug_hard_mask.png"), mask)
        cv2.imwrite(os.path.join(output_folder, "_debug_soft_mask.png"), soft_mask)
        # Test-Vorschau auf weißem Hintergrund (zeigt Halo-Probleme sofort)
        white_preview = np.full_like(square_img[:, :, :3], 255)
        if output_channels == 4:
            alpha_3ch = square_img[:, :, 3:4].astype(np.float32) / 255.0
            white_preview = (
                square_img[:, :, :3].astype(np.float32) * alpha_3ch +
                white_preview.astype(np.float32) * (1 - alpha_3ch)
            ).astype(np.uint8)
        cv2.imwrite(os.path.join(output_folder, "_debug_on_white.png"), white_preview)
        print(f"Debug-Dateien gespeichert.")

    print(f"Ordner: {output_folder}")

    master_path = os.path.join(output_folder, master_filename)
    cv2.imwrite(master_path, square_img, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    print(f"Master gespeichert: {master_path}")

    for icon_size in [16, 48, 128]:
        resized = cv2.resize(square_img, (icon_size, icon_size),
                             interpolation=cv2.INTER_LANCZOS4)
        icon_path = os.path.join(output_folder, f"icon_{icon_size}.png")
        cv2.imwrite(icon_path, resized, [cv2.IMWRITE_PNG_COMPRESSION, 9])
        print(f"Icon {icon_size}x{icon_size}: {icon_path}")


if __name__ == "__main__":
    crop_logo_to_perfect_square(
        'hasx.png',
        transparent_background=True,
        decontaminate=True,
        debug=True  # Schaltet die Vorschau auf weißem Hintergrund ein
    )