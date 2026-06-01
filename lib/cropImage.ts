/**
 * Gera imagem recortada em círculo. Suporta JPG (fundo branco) ou PNG (fundo transparente).
 * Usado para avatar/logo após crop com react-easy-crop (cropShape="round").
 */

export type Area = { x: number; y: number; width: number; height: number };

export type CropOutputOptions = {
  /** 'jpeg' = fundo branco (ex.: header). 'png' = transparência preservada (download do logo). */
  outputFormat?: 'jpeg' | 'png';
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Retorna um Blob com a região recortada em máscara circular.
 * @param imageSrc URL da imagem (object URL ou data URL)
 * @param pixelCrop Área em pixels (croppedAreaPixels do react-easy-crop)
 * @param fillColor Cor de preenchimento fora do círculo (default branco). Ignorado se outputFormat === 'png'.
 * @param options outputFormat: 'jpeg' (fundo branco) ou 'png' (transparência fora do círculo)
 */
export async function getCroppedImageCircle(
  imageSrc: string,
  pixelCrop: Area,
  fillColor = '#ffffff',
  options: CropOutputOptions = {},
): Promise<Blob> {
  const { outputFormat = 'jpeg' } = options;
  const image = await createImage(imageSrc);
  const { width, height, x, y } = pixelCrop;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d not available');

  const r = Math.min(width, height) / 2;
  const cx = width / 2;
  const cy = height / 2;

  if (outputFormat === 'png') {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  ctx.restore();

  if (outputFormat === 'png') {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const r2 = r * r;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const dx = px - cx + 0.5;
        const dy = py - cy + 0.5;
        if (dx * dx + dy * dy > r2) {
          const i = (py * width + px) * 4;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      outputFormat === 'png' ? 'image/png' : 'image/jpeg',
      outputFormat === 'png' ? undefined : 0.92,
    );
  });
}
