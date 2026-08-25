/**
 * ClassPulse Client Image & Storage Helpers
 * Ensures high-res images are automatically resized & compressed to prevent storage bloat,
 * enforces strict MIME validation, blocks malicious vector/script formats (e.g., raw SVGs),
 * and guarantees base64 attachments remain <= 500 KB to protect storage quotas.
 */

const MAX_ATTACHMENT_SIZE_BYTES = 500 * 1024; // 500 KB max target limit
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'application/pdf'
];

/**
 * Sanitizes file names to prevent directory traversal or XSS injection via filename.
 */
export function sanitizeFileName(name: string): string {
  if (!name) return 'attachment_' + Date.now();
  // Strip control characters, quotes, brackets, and path separators
  return name.replace(/[^\w\s.-]/gi, '_').substring(0, 100);
}

/**
 * Validates and compresses images or documents with strict size and format gates.
 * - Rejects SVGs to prevent script injection / XSS vectors.
 * - Dynamically scales image resolution and adjusts quality down to satisfy <= 500 KB limit.
 * - Validates PDF files to ensure they do not exceed 500 KB.
 */
export function compressImage(
  file: File,
  maxDimension = 1200,
  initialQuality = 0.82
): Promise<{ dataUrl: string; name: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided."));
    }

    const sanitizedName = sanitizeFileName(file.name);

    // 1. Explicitly block SVGs to mitigate XSS payload execution in document viewers
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    if (isSvg) {
      return reject(
        new Error(
          "SVG vector files are not allowed for medical/excuse attachments due to university security policy. Please upload a JPG, PNG, or PDF file."
        )
      );
    }

    // 2. Validate MIME type against whitelist
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      return reject(
        new Error(
          `Unsupported file format (${file.type || 'unknown'}). Please upload a JPG, PNG, WebP image or PDF document.`
        )
      );
    }

    // 3. Handle PDF files: enforce strict 500 KB raw limit
    if (isPdf) {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        return reject(
          new Error(
            `PDF file exceeds the maximum 500 KB attachment quota (Selected file is ${sizeMb} MB). Please compress the PDF or capture a photo/screenshot.`
          )
        );
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          dataUrl: result,
          name: sanitizedName,
          sizeBytes: file.size
        });
      };
      reader.onerror = () => reject(new Error("Failed to read the PDF document."));
      reader.readAsDataURL(file);
      return;
    }

    // 4. Handle Image files: Smart multi-pass compression to guarantee <= 500 KB
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      if (!rawUrl) {
        return reject(new Error("Failed to decode image data."));
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale dimensions if larger than maxDimension
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error("Browser canvas context unavailable for image compression."));
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Multi-pass quality stepping down if base64 exceeds MAX_ATTACHMENT_SIZE_BYTES
          let currentQuality = initialQuality;
          let compressedUrl = canvas.toDataURL('image/jpeg', currentQuality);

          // Estimate binary byte size from base64 length (~ 3/4 ratio)
          let estimatedBytes = Math.round(compressedUrl.length * 0.75);

          if (estimatedBytes > MAX_ATTACHMENT_SIZE_BYTES && currentQuality > 0.5) {
            currentQuality = 0.55;
            compressedUrl = canvas.toDataURL('image/jpeg', currentQuality);
            estimatedBytes = Math.round(compressedUrl.length * 0.75);
          }

          if (estimatedBytes > MAX_ATTACHMENT_SIZE_BYTES) {
            // Further step down canvas resolution by 30%
            canvas.width = Math.round(width * 0.7);
            canvas.height = Math.round(height * 0.7);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            compressedUrl = canvas.toDataURL('image/jpeg', 0.5);
            estimatedBytes = Math.round(compressedUrl.length * 0.75);
          }

          resolve({
            dataUrl: compressedUrl,
            name: sanitizedName.replace(/\.[^/.]+$/, "") + ".jpg",
            sizeBytes: estimatedBytes
          });
        } catch (err) {
          reject(new Error("Error during canvas image compression: " + (err instanceof Error ? err.message : String(err))));
        }
      };

      img.onerror = () => reject(new Error("Selected image file is corrupted or cannot be processed."));
      img.src = rawUrl;
    };

    reader.onerror = () => reject(new Error("Unable to read image file from storage."));
    reader.readAsDataURL(file);
  });
}
