import { describe, it, expect } from 'vitest';
import {
  normalizeRelativePath,
  isSafeRelativePath,
  parseWebkitRelativePath,
  buildImageIdentity,
  sanitizeLabelName,
  getExtension,
  isImageByExtension,
  getFolderPrefix,
  isInFolder,
} from './paths';

describe('paths utility functions', () => {
  describe('normalizeRelativePath', () => {
    it('should replace backslashes with forward slashes', () => {
      expect(normalizeRelativePath('folder\\subfolder\\file.txt')).toBe('folder/subfolder/file.txt');
    });

    it('should collapse multiple consecutive slashes', () => {
      expect(normalizeRelativePath('folder///subfolder//file.txt')).toBe('folder/subfolder/file.txt');
    });

    it('should strip leading slashes', () => {
      expect(normalizeRelativePath('/folder/file.txt')).toBe('folder/file.txt');
    });
  });

  describe('isSafeRelativePath', () => {
    it('should reject empty or absolute paths or paths with directory traversal', () => {
      expect(isSafeRelativePath('')).toBe(false);
      expect(isSafeRelativePath('/absolute/path')).toBe(false);
      expect(isSafeRelativePath('folder/../other')).toBe(false);
    });

    it('should accept valid relative paths', () => {
      expect(isSafeRelativePath('folder/subfolder/file.txt')).toBe(true);
      expect(isSafeRelativePath('file.txt')).toBe(true);
    });
  });

  describe('parseWebkitRelativePath', () => {
    it('should parse single level folder path', () => {
      const result = parseWebkitRelativePath('RootFolder/image.jpg');
      expect(result).toEqual({ uploadRoot: 'RootFolder', relativePath: 'image.jpg' });
    });

    it('should parse multi level paths', () => {
      const result = parseWebkitRelativePath('RootFolder/sub/folder/image.jpg');
      expect(result).toEqual({ uploadRoot: 'RootFolder', relativePath: 'sub/folder/image.jpg' });
    });
  });

  describe('buildImageIdentity', () => {
    it('should build a string identifier', () => {
      const id = buildImageIdentity('path/to/img.png', 1024, 1623456789);
      expect(id).toBe('path/to/img.png|1024|1623456789');
    });
  });

  describe('sanitizeLabelName', () => {
    it('should replace illegal characters with underscores', () => {
      expect(sanitizeLabelName('label/name?')).toBe('label_name_');
    });

    it('should return unnamed for empty strings', () => {
      expect(sanitizeLabelName('   ')).toBe('unnamed');
    });
  });

  describe('getExtension', () => {
    it('should extract lowercase extension', () => {
      expect(getExtension('image.PNG')).toBe('png');
      expect(getExtension('noextension')).toBe('');
    });
  });

  describe('isImageByExtension', () => {
    it('should check if file is an image', () => {
      expect(isImageByExtension('photo.jpg')).toBe(true);
      expect(isImageByExtension('document.pdf')).toBe(false);
    });
  });

  describe('getFolderPrefix', () => {
    it('should return parent directory path', () => {
      expect(getFolderPrefix('a/b/c.png')).toBe('a/b');
      expect(getFolderPrefix('c.png')).toBe('');
    });
  });

  describe('isInFolder', () => {
    it('should check folder hierarchy membership', () => {
      expect(isInFolder('a/b/c.png', 'a')).toBe(true);
      expect(isInFolder('a/b/c.png', 'a/b')).toBe(true);
      expect(isInFolder('a/b/c.png', 'd')).toBe(false);
      expect(isInFolder('a/b/c.png', null)).toBe(true);
    });
  });
});
