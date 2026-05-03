import cv2
import numpy as np

def crop_logo_only(input_path, output_path):
    # 1. Bild laden (unverändert!)
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Fehler: Bild nicht gefunden.")
        return

    # 2. Hintergrundfarbe bestimmen
    bg_sample = img[0:5, 0:5, :3]
    bg_color = np.mean(bg_sample, axis=(0, 1))

    # 3. Differenz berechnen (nur zur Erkennung, NICHT fürs Bild!)
    diff = np.abs(img[:, :, :3] - bg_color)
    diff_sum = np.sum(diff, axis=2)

    # 4. Maske NUR für Bounding Box
    mask = (diff_sum > 30).astype(np.uint8)

    coords = cv2.findNonZero(mask)
    if coords is None:
        print("Kein Logo erkannt.")
        return

    x, y, w, h = cv2.boundingRect(coords)

    # 5. Optional minimaler Rand (empfohlen)
    padding = 2
    x = max(x - padding, 0)
    y = max(y - padding, 0)
    w = min(w + 2 * padding, img.shape[1] - x)
    h = min(h + 2 * padding, img.shape[0] - y)

    # ✅ 6. DAS ist der einzige echte Schritt
    cropped = img[y:y+h, x:x+w]

    # ✅ 7. Speichern (OHNE jede Veränderung)
    cv2.imwrite(output_path, cropped)

    print("Fertig – 100% originales Bild, nur zugeschnitten.")


# Start
crop_logo_only("bird.png", "logo_cropped.png")