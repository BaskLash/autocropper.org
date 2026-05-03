import cv2
import numpy as np

def make_background_transparent(input_path, output_path, threshold=30):
    # Bild laden (unchanged, damit kein Qualitätsverlust)
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Fehler: Bild nicht gefunden.")
        return

    # Falls kein Alpha, hinzufügen
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    # Hintergrundfarbe oben links (wie vorher)
    bg_sample = img[0:5, 0:5, :3]
    bg_color = np.mean(bg_sample, axis=(0,1)).astype(np.uint8)

    # Differenz berechnen
    diff = np.linalg.norm(img[:, :, :3] - bg_color, axis=2)

    # Maske erstellen: True = Pixel zum Transparenz setzen
    mask = diff < threshold

    # Alpha setzen: transparent für Hintergrund, original für Logo
    img[:, :, 3][mask] = 0  # Alpha 0 für Hintergrund

    # Speichern als PNG
    cv2.imwrite(output_path, img)
    print("Hintergrund transparent gemacht!")

# Beispiel
make_background_transparent("download_cleanup.png", "logo_transparent.png", threshold=30)