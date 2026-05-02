/** Cap for animated GIFs (encrypted payload must stay under socket limits). */
export const MAX_GIF_SIZE_BYTES = 4 * 1024 * 1024;

export function isGifDataUrl(s) {
  return typeof s === 'string' && /^data:image\/gif(;|base64,)/i.test(s);
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * After decrypt: blob URL for static images; keep data URL for GIF so frames animate in <img>.
 * Remote https URLs (e.g. Supabase) are returned unchanged.
 */
export async function decryptedImageToDisplayUrl(decrypted, messageType) {
  if (messageType !== 'image' || typeof decrypted !== 'string') {
    return decrypted;
  }
  if (/^https?:\/\//i.test(decrypted)) return decrypted;
  if (!decrypted.startsWith('data:')) return decrypted;

  try {
    // Manual Base64 to Blob conversion (more reliable than fetch() on some mobile browsers)
    const [header, base64] = decrypted.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([buffer], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Blob conversion failed', e);
    return decrypted;
  }
}

/** Resolve decrypted payload for image or video (URLs pass through). */
export async function resolvedMediaForDisplay(decrypted, messageType) {
  if (messageType === 'video') {
    return typeof decrypted === 'string' ? decrypted : decrypted;
  }
  if (messageType === 'image') {
    return decryptedImageToDisplayUrl(decrypted, 'image');
  }
  return decrypted;
}

/**
 * Compresses an image file using Canvas API.
 * @param {File} file - The image file to compress.
 * @param {Object} options - Compression options.
 * @param {number} options.maxWidth - Max width in pixels (default: 1200).
 * @param {number} options.maxHeight - Max height in pixels (default: 1200).
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.7).
 * @returns {Promise<string>} - Compressed image as base64 data URL.
 */
export const compressImage = (file, options = {}) => {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG for better compression (unless it's a PNG with transparency)
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(mimeType, quality);
        
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
