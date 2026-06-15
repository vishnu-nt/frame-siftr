import { ImageFile } from '../types';
import {
  buildImageIdentity,
  isImageByExtension,
  isSafeRelativePath,
  normalizeRelativePath,
  parseWebkitRelativePath,
} from '../utils/paths';

export class FileUploadService {
  private static readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'image/heic',
    'image/heif',
  ];

  static isImageFile(file: File): boolean {
    if (file.type && this.SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return true;
    }
    return isImageByExtension(file.name);
  }

  static async processFileList(files: FileList | File[]): Promise<{
    images: ImageFile[];
    uploadRoot: string;
  }> {
    const imageFiles: ImageFile[] = [];
    const seenPaths = new Set<string>();
    let uploadRoot = '';

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!this.isImageFile(file)) continue;

      const webkitPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const parsed = webkitPath
        ? parseWebkitRelativePath(webkitPath)
        : { uploadRoot: '', relativePath: file.name };

      if (parsed.uploadRoot && !uploadRoot) {
        uploadRoot = parsed.uploadRoot;
      }

      const relativePath = normalizeRelativePath(parsed.relativePath || file.name);
      if (!isSafeRelativePath(relativePath)) {
        console.warn('Skipping unsafe path:', relativePath);
        continue;
      }

      if (seenPaths.has(relativePath)) {
        console.warn('Skipping duplicate path:', relativePath);
        continue;
      }
      seenPaths.add(relativePath);

      imageFiles.push({
        id: buildImageIdentity(relativePath, file.size, file.lastModified),
        name: file.name,
        relativePath,
        size: file.size,
        lastModified: file.lastModified,
        file,
        isProcessed: false,
      });
    }

    return { images: imageFiles, uploadRoot };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
