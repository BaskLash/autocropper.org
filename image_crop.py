import cv2
import numpy as np

def crop_logo_to_perfect_square(input_path, output_path):
    # 1. Bild laden
    img = cv2.imread(input_path)
    if img is None:
        print("Fehler: Bild nicht gefunden.")
        return

    # 2. Hintergrundfarbe bestimmen (Pixel oben links)
    # Wir nehmen den Durchschnitt der ersten 5x5 Pixel für mehr Stabilität
    bg_sample = img[0:5, 0:5]
    bg_color = np.mean(bg_sample, axis=(0, 1))

    # 3. Differenz berechnen: Wo weicht das Bild vom Hintergrund ab?
    # Wir berechnen den absoluten Unterschied zwischen jedem Pixel und der Hintergrundfarbe
    diff = np.abs(img - bg_color)
    diff_sum = np.sum(diff, axis=2) # Summe der RGB-Differenzen

    # 4. Schwellenwert anwenden
    # Alles, was eine Differenz von mehr als '30' hat, gilt als "Logo"
    # (Diesen Wert kannst du senken auf 15-20, wenn er zu viel wegschneidet)
    mask = (diff_sum > 30).astype(np.uint8) * 255

    # 5. Koordinaten der farbigen Pixel finden (Start/Ende von Breite und Höhe)
    coords = cv2.findNonZero(mask)
    if coords is None:
        print("Kein Logo erkannt.")
        return

    # x, y ist der Startpunkt; w, h ist die Ausdehnung
    x, y, w, h = cv2.boundingRect(coords)
    
    print(f"Breite startet bei: {x}, endet bei: {x+w} (Total: {w}px)")
    print(f"Höhe startet bei: {y}, endet bei: {y+h} (Total: {h}px)")

    # 6. Zuschneiden auf das Logo
    logo_only = img[y:y+h, x:x+w]

    # 7. Perfekte Ausrichtung als Quadrat (1:1)
    # Wir nehmen die längere Seite als Referenz
    size = max(w, h)
    
    # Erstelle eine neue Leinwand mit der Original-Hintergrundfarbe
    square_img = np.full((size, size, 3), bg_color, dtype=np.uint8)

    # Logo exakt in die Mitte setzen
    offset_x = (size - w) // 2
    offset_y = (size - h) // 2
    square_img[offset_y:offset_y+h, offset_x:offset_x+w] = logo_only

    # 8. Speichern des Master-Bildes
    cv2.imwrite(output_path, square_img)
    
    # 9. Automatisch Icons für Chrome Extension generieren
    for icon_size in [16, 48, 128]:
        resized = cv2.resize(square_img, (icon_size, icon_size), interpolation=cv2.INTER_LANCZOS4)
        cv2.imwrite(f"icon_{icon_size}.png", resized)
        print(f"Icon {icon_size}x{icon_size} erstellt.")

# Starten
crop_logo_to_perfect_square('bird.png', 'logo_quadrat_master.png')
