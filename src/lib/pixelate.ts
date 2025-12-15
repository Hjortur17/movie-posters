export function pixelateImage(
  imageUrl: string,
  pixelationLevel: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Calculate pixel size based on pixelation level (0-100)
      // Higher level = more pixelated
      // Lower multiplier = smaller pixels = more detail visible
      // Ensure minimum pixel size of 2 to maintain pixelation effect
      const pixelSize = Math.max(2, Math.floor((pixelationLevel / 100) * 40));

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image at smaller size, then scale up for pixelation effect
      if (pixelSize > 1) {
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) {
          reject(new Error("Could not get temp canvas context"));
          return;
        }

        // Calculate scaled dimensions
        const scaledWidth = Math.max(1, Math.floor(img.width / pixelSize));
        const scaledHeight = Math.max(1, Math.floor(img.height / pixelSize));

        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;

        // Draw image scaled down
        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // Draw scaled image back to full size (creates pixelation)
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, 0, 0, img.width, img.height);
      } else {
        // No pixelation, draw normally
        ctx.drawImage(img, 0, 0);
      }

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = imageUrl;
  });
}
