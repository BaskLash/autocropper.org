/**
 * Autocropper logo processing pipeline.
 *
 * Pure client-side. Canvas + ImageData + Uint8Array only.
 *
 * Mirrors the reference OpenCV (Python) implementation step by step:
 *   1. Decode the image.
 *   2. If the image already has a non-opaque alpha channel, use it.
 *      Otherwise sample 20×20 patches from the four corners and compute
 *      a per-channel median + per-channel std (averaged across channels).
 *   3. Build a hard binary mask (`L1 distance > threshold`) and a soft
 *      gradient mask (`(diff − threshold) / transition * 255`).
 *      `threshold = max(20, std * 3.5)` and `transition = max(15, threshold/2)`.
 *   4. Morphological close (3×3, 1 iteration) on **both** masks.
 *   5. 8-connectivity connected components on the hard mask. Keep all
 *      components with area ≥ max(20, H·W·5e-5) and union their bboxes.
 *   6. Crop the RGB and the soft mask to that bbox.
 *   7. Color decontamination by alpha:
 *        decontaminated = (C − BG·(1−α)) / max(α, 0.01)
 *        final          =  C · α  +  decontaminated · (1−α)
 *   8. Place the cropped RGBA on a `max(w, h)` square transparent canvas
 *      (no extra padding).
 *   9. Lanczos-4 resample to each requested target size.
 *  10. Export PNG via `canvas.toBlob`.
 */

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BgInfo {
  r: number;
  g: number;
  b: number;
  std: number;
}

export interface ProcessedResult {
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  croppedCanvas: HTMLCanvasElement;
  squareCanvas: HTMLCanvasElement;
  sizes: Record<number, HTMLCanvasElement>;
  bbox: BBox;
  bg: BgInfo | null;
  components: number;
  durationMs: number;
}

export const TARGET_SIZES = [16, 32, 48, 64, 128, 256, 512] as const;
export const PREVIEW_SIZES = [16, 48, 128] as const;

const CORNER_PATCH = 20;
const LANCZOS_A = 4;

/* ------------------------------------------------------------------ */
/* Image decode                                                        */
/* ------------------------------------------------------------------ */

export function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    img.src = url;
  });
}

function imageToData(img: HTMLImageElement): {
  data: Uint8ClampedArray;
  w: number;
  h: number;
} {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

/* ------------------------------------------------------------------ */
/* Statistics helpers                                                  */
/* ------------------------------------------------------------------ */

function median(arr: number[]): number {
  arr.sort((a, b) => a - b);
  const n = arr.length;
  return n % 2 === 0 ? Math.floor((arr[n / 2 - 1] + arr[n / 2]) / 2) : arr[(n - 1) >> 1];
}

function stdOf(arr: number[]): number {
  const n = arr.length;
  if (n === 0) return 0;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += arr[i];
  mean /= n;
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const d = arr[i] - mean;
    sq += d * d;
  }
  return Math.sqrt(sq / n);
}

/* ------------------------------------------------------------------ */
/* Step 2: Corner sampling → per-channel median + mean of channel-std  */
/* ------------------------------------------------------------------ */

export function sampleCorners(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): BgInfo {
  const patch = Math.min(CORNER_PATCH, Math.max(2, Math.floor(Math.min(w, h) / 4)));
  const corners: Array<[number, number]> = [
    [0, 0],
    [w - patch, 0],
    [0, h - patch],
    [w - patch, h - patch],
  ];
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (const [x0, y0] of corners) {
    for (let y = y0; y < y0 + patch; y++) {
      const row = y * w;
      for (let x = x0; x < x0 + patch; x++) {
        const i = (row + x) * 4;
        rs.push(data[i]);
        gs.push(data[i + 1]);
        bs.push(data[i + 2]);
      }
    }
  }
  const r = median(rs.slice());
  const g = median(gs.slice());
  const b = median(bs.slice());
  // std per channel, then mean of those (matches Python `np.std(..., axis=0).mean()`).
  const std = (stdOf(rs) + stdOf(gs) + stdOf(bs)) / 3;
  return { r, g, b, std };
}

/* ------------------------------------------------------------------ */
/* Alpha channel detection                                             */
/* ------------------------------------------------------------------ */

function alphaIsMeaningful(data: Uint8ClampedArray): boolean {
  // True if any pixel's alpha is below 250 — matches the Python check.
  for (let p = 3; p < data.length; p += 4) {
    if (data[p] < 250) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Step 3: Hard + soft masks (L1 distance, transition formula)         */
/* ------------------------------------------------------------------ */

export function buildMasks(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bg: BgInfo,
): { hard: Uint8Array; soft: Uint8Array; threshold: number } {
  const n = w * h;
  const hard = new Uint8Array(n);
  const soft = new Uint8Array(n);

  const threshold = Math.max(20, Math.floor(bg.std * 3.5));
  const transition = Math.max(15, threshold >> 1);

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const dr = data[p] - bg.r;
    const dg = data[p + 1] - bg.g;
    const db = data[p + 2] - bg.b;
    // L1 distance — exactly what Python computes (`np.sum(|diff|, axis=2)`).
    const diffSum = (dr < 0 ? -dr : dr) + (dg < 0 ? -dg : dg) + (db < 0 ? -db : db);

    hard[i] = diffSum > threshold ? 1 : 0;

    let s = ((diffSum - threshold) / transition) * 255;
    if (s < 0) s = 0;
    else if (s > 255) s = 255;
    soft[i] = s;
  }
  return { hard, soft, threshold };
}

/* ------------------------------------------------------------------ */
/* Step 4: Morphological close — works for both binary and grayscale   */
/* ------------------------------------------------------------------ */

function dilate3x3(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < w - 1 ? x + 1 : w - 1;
      let m = 0;
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * w;
        for (let xx = x0; xx <= x1; xx++) {
          const v = src[row + xx];
          if (v > m) m = v;
        }
      }
      dst[y * w + x] = m;
    }
  }
  return dst;
}

function erode3x3(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < w - 1 ? x + 1 : w - 1;
      let m = 255;
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * w;
        for (let xx = x0; xx <= x1; xx++) {
          const v = src[row + xx];
          if (v < m) m = v;
        }
      }
      dst[y * w + x] = m;
    }
  }
  return dst;
}

export function morphClose(
  src: Uint8Array,
  w: number,
  h: number,
): Uint8Array {
  return erode3x3(dilate3x3(src, w, h), w, h);
}

/* ------------------------------------------------------------------ */
/* Step 5: 8-connectivity components → union bbox of all significant   */
/* ------------------------------------------------------------------ */

export function unionBBox(
  mask: Uint8Array,
  w: number,
  h: number,
): { bbox: BBox | null; count: number } {
  const minArea = Math.max(20, Math.floor(w * h * 0.00005));
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);

  let unionMinX = w;
  let unionMaxX = -1;
  let unionMinY = h;
  let unionMaxY = -1;
  let kept = 0;

  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || visited[i]) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    visited[i] = 1;

    let minX = w, maxX = 0, minY = h, maxY = 0;
    let size = 0;

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx - x) / w;
      size++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // 8-connectivity
      const xLeft = x > 0;
      const xRight = x < w - 1;
      const yTop = y > 0;
      const yBot = y < h - 1;
      if (xLeft) {
        const n = idx - 1;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (xRight) {
        const n = idx + 1;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (yTop) {
        const n = idx - w;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
        if (xLeft) {
          const nn = idx - w - 1;
          if (mask[nn] && !visited[nn]) { visited[nn] = 1; queue[tail++] = nn; }
        }
        if (xRight) {
          const nn = idx - w + 1;
          if (mask[nn] && !visited[nn]) { visited[nn] = 1; queue[tail++] = nn; }
        }
      }
      if (yBot) {
        const n = idx + w;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
        if (xLeft) {
          const nn = idx + w - 1;
          if (mask[nn] && !visited[nn]) { visited[nn] = 1; queue[tail++] = nn; }
        }
        if (xRight) {
          const nn = idx + w + 1;
          if (mask[nn] && !visited[nn]) { visited[nn] = 1; queue[tail++] = nn; }
        }
      }
    }

    if (size >= minArea) {
      kept++;
      if (minX < unionMinX) unionMinX = minX;
      if (maxX > unionMaxX) unionMaxX = maxX;
      if (minY < unionMinY) unionMinY = minY;
      if (maxY > unionMaxY) unionMaxY = maxY;
    }
  }

  if (kept === 0) return { bbox: null, count: 0 };
  return {
    bbox: {
      x: unionMinX,
      y: unionMinY,
      w: unionMaxX - unionMinX + 1,
      h: unionMaxY - unionMinY + 1,
    },
    count: kept,
  };
}

/* ------------------------------------------------------------------ */
/* Step 7: Color decontamination blend, applied to the cropped region  */
/* ------------------------------------------------------------------ */

function decontaminateAndCompose(
  srcData: Uint8ClampedArray,
  srcW: number,
  alpha: Uint8Array,
  bbox: BBox,
  bg: BgInfo | null,
): ImageData {
  const out = new ImageData(bbox.w, bbox.h);
  const od = out.data;
  for (let y = 0; y < bbox.h; y++) {
    for (let x = 0; x < bbox.w; x++) {
      const sx = bbox.x + x;
      const sy = bbox.y + y;
      const sIdx = sy * srcW + sx;
      const sp = sIdx * 4;
      const a8 = alpha[sIdx];
      const dp = (y * bbox.w + x) * 4;

      if (!bg) {
        // No decontamination — just copy RGB and use alpha as-is.
        od[dp] = srcData[sp];
        od[dp + 1] = srcData[sp + 1];
        od[dp + 2] = srcData[sp + 2];
        od[dp + 3] = a8;
        continue;
      }

      const a = a8 / 255;
      const aSafe = a < 0.01 ? 0.01 : a;
      const inv = 1 - a;

      // decontaminated channel = (orig - bg·(1−α)) / max(α, 0.01)
      const dr = (srcData[sp] - bg.r * inv) / aSafe;
      const dg = (srcData[sp + 1] - bg.g * inv) / aSafe;
      const db = (srcData[sp + 2] - bg.b * inv) / aSafe;

      // blend = orig·α + decontaminated·(1−α)
      let fr = srcData[sp] * a + dr * inv;
      let fg = srcData[sp + 1] * a + dg * inv;
      let fb = srcData[sp + 2] * a + db * inv;

      if (fr < 0) fr = 0; else if (fr > 255) fr = 255;
      if (fg < 0) fg = 0; else if (fg > 255) fg = 255;
      if (fb < 0) fb = 0; else if (fb > 255) fb = 255;

      od[dp] = fr;
      od[dp + 1] = fg;
      od[dp + 2] = fb;
      od[dp + 3] = a8;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Step 8: Place crop on max(w,h) square transparent canvas            */
/* ------------------------------------------------------------------ */

function imageDataToCanvas(id: ImageData): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = id.width;
  c.height = id.height;
  c.getContext("2d")!.putImageData(id, 0, 0);
  return c;
}

function squareCanvas(crop: HTMLCanvasElement): HTMLCanvasElement {
  const size = Math.max(crop.width, crop.height);
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const dx = Math.floor((size - crop.width) / 2);
  const dy = Math.floor((size - crop.height) / 2);
  ctx.drawImage(crop, dx, dy);
  return c;
}

/* ------------------------------------------------------------------ */
/* Step 9: Lanczos-4 resampling, separable, fixed-radius (cv2 style)   */
/* ------------------------------------------------------------------ */

function lanczosKernel(x: number, a: number): number {
  if (x === 0) return 1;
  if (x <= -a || x >= a) return 0;
  const px = Math.PI * x;
  return (a * Math.sin(px) * Math.sin(px / a)) / (px * px);
}

interface AxisMap {
  start: Int32Array; // start source index per dst slot
  width: Int32Array; // number of source taps per dst slot
  weights: Float32Array; // flattened weights, indexed by dstSlot * maxWidth + i
  maxWidth: number;
}

function buildAxisMap(srcLen: number, dstLen: number, a: number): AxisMap {
  const start = new Int32Array(dstLen);
  const width = new Int32Array(dstLen);
  const maxWidth = a * 2; // fixed radius — cv2.INTER_LANCZOS4 style
  const weights = new Float32Array(dstLen * maxWidth);
  for (let d = 0; d < dstLen; d++) {
    const center = ((d + 0.5) * srcLen) / dstLen - 0.5;
    const s = Math.floor(center) - a + 1;
    const e = Math.floor(center) + a;
    const lo = Math.max(0, s);
    const hi = Math.min(srcLen - 1, e);
    let sum = 0;
    const wOff = d * maxWidth;
    let count = 0;
    for (let ix = lo; ix <= hi; ix++) {
      const v = lanczosKernel(ix - center, a);
      weights[wOff + count] = v;
      sum += v;
      count++;
    }
    start[d] = lo;
    width[d] = count;
    if (sum !== 0) {
      const inv = 1 / sum;
      for (let i = 0; i < count; i++) weights[wOff + i] *= inv;
    }
  }
  return { start, width, weights, maxWidth };
}

function clampByte(v: number): number {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return Math.round(v);
}

export function resampleLanczos(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  a: number = LANCZOS_A,
): ImageData {
  const xMap = buildAxisMap(srcW, dstW, a);
  const yMap = buildAxisMap(srcH, dstH, a);

  // Horizontal pass: srcH × dstW × 4 floats
  const tmp = new Float32Array(srcH * dstW * 4);
  for (let y = 0; y < srcH; y++) {
    const srcRow = y * srcW * 4;
    const dstRow = y * dstW * 4;
    for (let dx = 0; dx < dstW; dx++) {
      const ws = xMap.weights;
      const wOff = dx * xMap.maxWidth;
      const startX = xMap.start[dx];
      const widthX = xMap.width[dx];
      let r = 0, g = 0, b = 0, alpha = 0;
      for (let i = 0; i < widthX; i++) {
        const w = ws[wOff + i];
        const sp = srcRow + (startX + i) * 4;
        r += srcData[sp] * w;
        g += srcData[sp + 1] * w;
        b += srcData[sp + 2] * w;
        alpha += srcData[sp + 3] * w;
      }
      const dp = dstRow + dx * 4;
      tmp[dp] = r;
      tmp[dp + 1] = g;
      tmp[dp + 2] = b;
      tmp[dp + 3] = alpha;
    }
  }

  // Vertical pass: dstH × dstW × 4 bytes
  const out = new ImageData(dstW, dstH);
  const od = out.data;
  for (let dy = 0; dy < dstH; dy++) {
    const ws = yMap.weights;
    const wOff = dy * yMap.maxWidth;
    const startY = yMap.start[dy];
    const widthY = yMap.width[dy];
    const dstRow = dy * dstW * 4;
    for (let dx = 0; dx < dstW; dx++) {
      let r = 0, g = 0, b = 0, alpha = 0;
      for (let i = 0; i < widthY; i++) {
        const w = ws[wOff + i];
        const tp = (startY + i) * dstW * 4 + dx * 4;
        r += tmp[tp] * w;
        g += tmp[tp + 1] * w;
        b += tmp[tp + 2] * w;
        alpha += tmp[tp + 3] * w;
      }
      const dp = dstRow + dx * 4;
      od[dp] = clampByte(r);
      od[dp + 1] = clampByte(g);
      od[dp + 2] = clampByte(b);
      od[dp + 3] = clampByte(alpha);
    }
  }
  return out;
}

function lanczosToCanvas(
  srcCanvas: HTMLCanvasElement,
  dstW: number,
  dstH: number,
): HTMLCanvasElement {
  const sctx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
  const src = sctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const out = resampleLanczos(src.data, src.width, src.height, dstW, dstH);
  const c = document.createElement("canvas");
  c.width = dstW;
  c.height = dstH;
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

/* ------------------------------------------------------------------ */
/* Step 10: PNG export                                                 */
/* ------------------------------------------------------------------ */

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob returned null"));
      },
      type,
      quality,
    );
  });
}

/* ------------------------------------------------------------------ */
/* Pipeline orchestrator                                               */
/* ------------------------------------------------------------------ */

export async function processLogo(
  blob: Blob,
  sizes: readonly number[] = TARGET_SIZES,
): Promise<ProcessedResult> {
  const t0 = performance.now();
  const img = await loadImage(blob);
  const { data, w, h } = imageToData(img);

  const n = w * h;

  // Step 2 — alpha-channel detection vs background sampling
  let bg: BgInfo | null = null;
  let hard: Uint8Array;
  let soft: Uint8Array;

  if (alphaIsMeaningful(data)) {
    // Use the existing alpha channel.
    hard = new Uint8Array(n);
    soft = new Uint8Array(n);
    for (let i = 0, p = 3; i < n; i++, p += 4) {
      const a = data[p];
      hard[i] = a > 10 ? 1 : 0;
      soft[i] = a;
    }
    // Still close — Python does this in the no-alpha branch, but the alpha
    // branch reads the channel directly with no morph. Match Python: skip.
  } else {
    bg = sampleCorners(data, w, h);
    const masks = buildMasks(data, w, h, bg);
    hard = masks.hard;
    soft = masks.soft;
    // Step 4 — morph close on BOTH masks, 3×3, 1 iteration.
    hard = morphClose(hard, w, h);
    soft = morphClose(soft, w, h);
  }

  // Step 5 — connected components → union bbox of significant components.
  const { bbox, count } = unionBBox(hard, w, h);
  if (!bbox) {
    throw new Error(
      "No significant logo detected. Try a sharper image or a flatter background.",
    );
  }

  // Steps 6–7 — crop + decontamination blend.
  const composed = decontaminateAndCompose(data, w, soft, bbox, bg);
  const cropped = imageDataToCanvas(composed);

  // Step 8 — square canvas with no extra padding.
  const square = squareCanvas(cropped);

  // Step 9 — Lanczos-4 resample to each target size.
  const out: Record<number, HTMLCanvasElement> = {};
  for (const s of sizes) {
    if (s === square.width && s === square.height) {
      out[s] = square;
    } else {
      out[s] = lanczosToCanvas(square, s, s);
    }
  }

  const originalUrl = URL.createObjectURL(blob);
  return {
    originalUrl,
    originalWidth: w,
    originalHeight: h,
    croppedCanvas: cropped,
    squareCanvas: square,
    sizes: out,
    bbox,
    bg,
    components: count,
    durationMs: performance.now() - t0,
  };
}
