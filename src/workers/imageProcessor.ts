// Web Worker for image processing to offload main thread
export interface ImageProcessingMessage {
  type: 'PROCESS_IMAGES' | 'GENERATE_THUMBNAIL';
  data: {
    files: File[];
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  };
}

export interface ImageProcessingResult {
  type: 'PROCESSING_COMPLETE' | 'THUMBNAIL_GENERATED';
  data: {
    url: string;
    width: number;
    height: number;
    file: File;
  };
}

self.onmessage = async (event: MessageEvent<ImageProcessingMessage>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'GENERATE_THUMBNAIL':
        await generateThumbnail(data.files[0], data.maxWidth || 200, data.maxHeight || 200, data.quality || 0.8);
        break;
      case 'PROCESS_IMAGES':
        await processImages(data.files, data.maxWidth || 200, data.maxHeight || 200, data.quality || 0.8);
        break;
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
  }
};

async function generateThumbnail(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = new OffscreenCanvas(maxWidth, maxHeight);
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Set canvas size and draw image
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob and create URL
      if ((canvas as any).convertToBlob) {
        (canvas as any).convertToBlob({ type: 'image/jpeg', quality }).then((blob: Blob) => {
          const url = URL.createObjectURL(blob);
          self.postMessage({
            type: 'THUMBNAIL_GENERATED',
            data: {
              url,
              width,
              height,
              file,
            },
          } as ImageProcessingResult);
          resolve();
        }).catch(reject);
      } else {
        // Fallback: create data URL
        const dataUrl = (canvas as any).toDataURL('image/jpeg', quality);
        self.postMessage({
          type: 'THUMBNAIL_GENERATED',
          data: {
            url: dataUrl,
            width,
            height,
            file,
          },
        } as ImageProcessingResult);
        resolve();
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

async function processImages(
  files: File[],
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<void> {
  for (const file of files) {
    await generateThumbnail(file, maxWidth, maxHeight, quality);
  }
}
