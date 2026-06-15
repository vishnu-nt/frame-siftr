export class ImageWorkerService {
  private worker: Worker | null = null;
  private callbacks: Map<string, (result: any) => void> = new Map();
  private messageId = 0;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    // Create worker from the inline code since we can't import the worker file directly
    const workerCode = `
      self.onmessage = async (event) => {
        const { type, data, id } = event.data;
        
        try {
          switch (type) {
            case 'GENERATE_THUMBNAIL':
              const result = await generateThumbnail(data.file, data.maxWidth || 200, data.maxHeight || 200, data.quality || 0.8);
              self.postMessage({ type: 'THUMBNAIL_GENERATED', data: result, id });
              break;
            case 'PROCESS_IMAGES':
              await processImages(data.files, data.maxWidth || 200, data.maxHeight || 200, data.quality || 0.8);
              break;
          }
        } catch (error) {
          self.postMessage({ type: 'ERROR', error: error.message, id });
        }
      };

      async function generateThumbnail(file, maxWidth, maxHeight, quality) {
        const bitmap = await createImageBitmap(file);
        try {
          let width = bitmap.width;
          let height = bitmap.height;
          const aspectRatio = width / height;

          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }

          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }

          width = Math.round(width);
          height = Math.round(height);

          const canvas = new OffscreenCanvas(width, height);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          ctx.drawImage(bitmap, 0, 0, width, height);

          const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
          const url = URL.createObjectURL(blob);
          return { url, width, height };
        } finally {
          bitmap.close();
        }
      }

      async function processImages(files, maxWidth, maxHeight, quality) {
        for (const file of files) {
          const result = await generateThumbnail(file, maxWidth, maxHeight, quality);
          self.postMessage({ type: 'THUMBNAIL_GENERATED', data: result });
        }
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = (event) => {
      const { type, data, id, error } = event.data;
      
      if (type === 'ERROR') {
        const callback = this.callbacks.get(id);
        if (callback) {
          callback({ error });
          this.callbacks.delete(id);
        }
      } else {
        const callback = this.callbacks.get(id);
        if (callback) {
          callback(data);
          this.callbacks.delete(id);
        }
      }
    };
  }

  async generateThumbnail(
    file: File,
    maxWidth: number = 200,
    maxHeight: number = 200,
    quality: number = 0.8
  ): Promise<{ url: string; width: number; height: number }> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = (++this.messageId).toString();
      
      this.callbacks.set(id, (result) => {
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });

      this.worker!.postMessage({
        type: 'GENERATE_THUMBNAIL',
        data: { file, maxWidth, maxHeight, quality },
        id,
      });
    });
  }

  async processImages(files: File[]): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    this.worker.postMessage({
      type: 'PROCESS_IMAGES',
      data: { files },
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.callbacks.clear();
    }
  }
}

export const imageWorkerService = new ImageWorkerService();
