/**
 * Reduz imagem no frontend para caber em maxBytes, preservando transparência (PNG/WebP).
 * Usado na aba Logotipos antes do crop para não enviar/armazenar arquivos > 5MB.
 */

const MAX_DIMENSION = 4096;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
    img.src = src;
  });
}

/**
 * Reduz o arquivo de imagem para no máximo maxBytes.
 * Preserva PNG/WebP com transparência (saída PNG). JPEG mantém como JPEG.
 * Retorna o mesmo File se já estiver dentro do limite.
 */
export async function compressImageToMaxBytes(
  file: File,
  maxBytes: number,
): Promise<File> {
  if (file.size <= maxBytes) return file;
  if (!file.type.startsWith('image/')) return file;

  const preserveAlpha = file.type === 'image/png' || file.type === 'image/webp';
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const r = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * r);
      height = Math.round(height * r);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas não disponível.');

    let scale = 1;
    let blob: Blob | null = null;
    const mimeType = preserveAlpha ? 'image/png' : 'image/jpeg';
    const quality = preserveAlpha ? undefined : 0.92;

    while (scale >= 0.2) {
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      blob = await new Promise<Blob | null>((res, rej) => {
        canvas.toBlob(
          (b) => res(b),
          mimeType,
          quality,
        );
      });
      if (blob && blob.size <= maxBytes) break;
      scale *= 0.8;
    }

    if (!blob || blob.size > maxBytes) throw new Error('Não foi possível reduzir a imagem ao tamanho permitido.');

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'logo';
    const ext = preserveAlpha ? 'png' : 'jpg';
    const outName = `${baseName}.${ext}`;
    return new File([blob], outName, { type: blob.type });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
