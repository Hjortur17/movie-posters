export function pixelateImage(
  imageUrl: string,
  pixelationLevel: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Try with CORS first, but handle failures gracefully
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
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

          // Try to get data URL - this will fail if canvas is tainted (CORS issue)
          const dataUrl = canvas.toDataURL("image/png");
          resolve(dataUrl);
        } else {
          // No pixelation, draw normally
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          resolve(dataUrl);
        }
      } catch (error) {
        // CORS or canvas error - try without CORS
        reject(new Error("Canvas tainted or error: " + (error instanceof Error ? error.message : String(error))));
      }
    };

    img.onerror = () => {
      // If CORS fails, try loading without CORS
      const imgNoCors = new Image();
      imgNoCors.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          const pixelSize = Math.max(2, Math.floor((pixelationLevel / 100) * 40));
          canvas.width = imgNoCors.width;
          canvas.height = imgNoCors.height;

          if (pixelSize > 1) {
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            if (!tempCtx) {
              reject(new Error("Could not get temp canvas context"));
              return;
            }

            const scaledWidth = Math.max(1, Math.floor(imgNoCors.width / pixelSize));
            const scaledHeight = Math.max(1, Math.floor(imgNoCors.height / pixelSize));

            tempCanvas.width = scaledWidth;
            tempCanvas.height = scaledHeight;
            tempCtx.drawImage(imgNoCors, 0, 0, scaledWidth, scaledHeight);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, imgNoCors.width, imgNoCors.height);

            // This might still fail due to CORS, but we try
            try {
              const dataUrl = canvas.toDataURL("image/png");
              resolve(dataUrl);
            } catch {
              reject(new Error("Canvas tainted - CORS issue"));
            }
          } else {
            ctx.drawImage(imgNoCors, 0, 0);
            try {
              const dataUrl = canvas.toDataURL("image/png");
              resolve(dataUrl);
            } catch {
              reject(new Error("Canvas tainted - CORS issue"));
            }
          }
        } catch (error) {
          reject(new Error("Failed to pixelate: " + (error instanceof Error ? error.message : String(error))));
        }
      };
      imgNoCors.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      imgNoCors.src = imageUrl;
    };

    img.src = imageUrl;
  });
}
