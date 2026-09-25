export type RgbaImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type GrayBuffer = {
  width: number;
  height: number;
  /** 0–255 luminance, row-major. */
  data: Float32Array;
};

export function createRgba(
  width: number,
  height: number,
  fill: [number, number, number, number] = [255, 255, 255, 255],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return { width, height, data };
}

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

/** Transparent pixels are composited over white. */
export function toGray(image: RgbaImage): GrayBuffer {
  const data = new Float32Array(image.width * image.height);
  const src = image.data;
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    const a = src[i + 3] / 255;
    const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    data[p] = lum * a + 255 * (1 - a);
  }
  return { width: image.width, height: image.height, data };
}

export function applyTone(
  gray: GrayBuffer,
  brightness: number,
  contrast: number,
  invert: boolean,
): GrayBuffer {
  const data = new Float32Array(gray.data.length);
  for (let i = 0; i < gray.data.length; i++) {
    let v = (gray.data[i] - 128) * contrast + 128 + brightness;
    if (invert) v = 255 - v;
    data[i] = clamp(v, 0, 255);
  }
  return { width: gray.width, height: gray.height, data };
}

export function gaussianBlur(gray: GrayBuffer, sigma: number): GrayBuffer {
  if (sigma < 0.3) return gray;
  const radius = Math.ceil(sigma * 3);
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const { width: w, height: h, data } = gray;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = clamp(x + k, 0, w - 1);
        acc += data[row + xx] * kernel[k + radius];
      }
      tmp[row + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = clamp(y + k, 0, h - 1);
        acc += tmp[yy * w + x] * kernel[k + radius];
      }
      out[y * w + x] = acc;
    }
  }
  return { width: w, height: h, data: out };
}
