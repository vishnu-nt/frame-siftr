import { ImageFile } from '../types';
import { imageWorkerService } from './imageWorker';

const THUMB_MAX_WIDTH = 200;
const THUMB_MAX_HEIGHT = 200;
const THUMB_QUALITY = 0.75;
const MAX_CONCURRENT = 6;

type QueueItem = {
  id: string;
  file: File;
  priority: number;
};

class ThumbnailCacheService {
  private cache = new Map<string, string>();
  private pending = new Set<string>();
  private queue: QueueItem[] = [];
  private active = 0;
  private listeners = new Map<string, Set<() => void>>();

  get(imageId: string): string | undefined {
    return this.cache.get(imageId);
  }

  subscribe(imageId: string, listener: () => void): () => void {
    let set = this.listeners.get(imageId);
    if (!set) {
      set = new Set();
      this.listeners.set(imageId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set?.size === 0) {
        this.listeners.delete(imageId);
      }
    };
  }

  request(image: ImageFile, priority = 0): void {
    const { id, file } = image;
    if (this.cache.has(id) || this.pending.has(id)) {
      return;
    }

    this.pending.add(id);
    this.queue.push({ id, file, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
    this.drain();
  }

  requestForIndices(images: ImageFile[], indices: number[], priority: number): void {
    for (const index of indices) {
      const image = images[index];
      if (image) {
        this.request(image, priority);
      }
    }
  }

  requestVisibleRange(
    images: ImageFile[],
    columnCount: number,
    rowStart: number,
    rowStop: number,
    colStart: number,
    colStop: number,
    priority: number
  ): void {
    const indices: number[] = [];
    for (let row = rowStart; row <= rowStop; row++) {
      for (let col = colStart; col <= colStop; col++) {
        const index = row * columnCount + col;
        if (index < images.length) {
          indices.push(index);
        }
      }
    }
    this.requestForIndices(images, indices, priority);
  }

  clear(): void {
    this.cache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.cache.clear();
    this.pending.clear();
    this.queue = [];
    this.active = 0;
    this.listeners.clear();
  }

  private notify(imageId: string): void {
    const set = this.listeners.get(imageId);
    if (!set) return;
    set.forEach((listener) => listener());
  }

  private drain(): void {
    while (this.active < MAX_CONCURRENT && this.queue.length > 0) {
      const item = this.queue.shift()!;
      if (this.cache.has(item.id)) {
        this.pending.delete(item.id);
        continue;
      }

      this.active++;
      imageWorkerService
        .generateThumbnail(item.file, THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, THUMB_QUALITY)
        .then((result) => {
          this.cache.set(item.id, result.url);
          this.notify(item.id);
        })
        .catch((err) => {
          console.warn('Thumbnail generation failed:', item.id, err);
        })
        .finally(() => {
          this.pending.delete(item.id);
          this.active--;
          this.drain();
        });
    }
  }
}

export const thumbnailCache = new ThumbnailCacheService();
