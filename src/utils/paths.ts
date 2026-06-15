export interface ParsedPath {
  uploadRoot: string;
  relativePath: string;
}

export interface FolderTreeNode {
  name: string;
  path: string;
  imageCount: number;
  children: FolderTreeNode[];
}

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'heic', 'heif',
]);

export function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
}

export function isSafeRelativePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('..')) {
    return false;
  }
  return true;
}

export function parseWebkitRelativePath(webkitRelativePath: string): ParsedPath {
  const normalized = normalizeRelativePath(webkitRelativePath);
  const parts = normalized.split('/').filter(Boolean);

  if (parts.length <= 1) {
    const filename = parts[0] || normalized;
    return { uploadRoot: '', relativePath: filename };
  }

  return {
    uploadRoot: parts[0],
    relativePath: parts.slice(1).join('/'),
  };
}

export function buildImageIdentity(
  relativePath: string,
  size: number,
  lastModified: number
): string {
  return `${normalizeRelativePath(relativePath)}|${size}|${lastModified}`;
}

export function sanitizeLabelName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'unnamed';
}

export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? (parts.pop()?.toLowerCase() || '') : '';
}

export function isImageByExtension(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(filename));
}

export function imageMatchesLabel(
  image: { relativePath: string; size: number; lastModified: number },
  label: { relativePath?: string; filename?: string; size: number; lastModified: number }
): boolean {
  const imagePath = normalizeRelativePath(image.relativePath);
  const labelPath = label.relativePath
    ? normalizeRelativePath(label.relativePath)
    : label.filename || '';
  return (
    imagePath === labelPath &&
    image.size === label.size &&
    image.lastModified === label.lastModified
  );
}

export function getFolderPrefix(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
}

export function isInFolder(relativePath: string, folderPath: string | null): boolean {
  if (!folderPath) return true;
  const normalized = normalizeRelativePath(relativePath);
  const folder = normalizeRelativePath(folderPath);
  return normalized === folder || normalized.startsWith(`${folder}/`);
}

export function buildFolderTree(relativePaths: string[]): FolderTreeNode[] {
  const nodeMap = new Map<string, FolderTreeNode>();

  const ensureFolder = (folderPath: string): void => {
    if (!folderPath) return;
    const segments = folderPath.split('/');
    let currentPath = '';
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!nodeMap.has(currentPath)) {
        nodeMap.set(currentPath, {
          name: segment,
          path: currentPath,
          imageCount: 0,
          children: [],
        });
      }
    }
  };

  for (const rawPath of relativePaths) {
    const relativePath = normalizeRelativePath(rawPath);
    const folderPath = getFolderPrefix(relativePath);
    ensureFolder(folderPath);

    if (folderPath) {
      const folderNode = nodeMap.get(folderPath);
      if (folderNode) {
        folderNode.imageCount += 1;
      }
    }
  }

  const roots: FolderTreeNode[] = [];
  const sortedPaths = Array.from(nodeMap.keys()).sort();

  for (const path of sortedPaths) {
    const node = nodeMap.get(path)!;
    const parentPath = getFolderPrefix(path);
    if (!parentPath) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(parentPath);
      if (parent && !parent.children.some((c) => c.path === path)) {
        parent.children.push(node);
      }
    }
  }

  const sortNodes = (nodes: FolderTreeNode[]): FolderTreeNode[] =>
    nodes
      .map((n) => ({ ...n, children: sortNodes(n.children) }))
      .sort((a, b) => a.name.localeCompare(b.name));

  return sortNodes(roots);
}

export function reconcileImagesWithLabels<T extends { relativePath: string; size: number; lastModified: number; labels?: string[] }>(
  images: T[],
  imageLabels: Array<{ relativePath?: string; filename?: string; size: number; lastModified: number; label: string }>
): T[] {
  return images.map((image) => {
    const match = imageLabels.find((l) => imageMatchesLabel(image, l));
    if (!match) return image;
    return { ...image, labels: [match.label] };
  });
}

export function countUniqueLabeledImages(
  imageLabels: Array<{ relativePath?: string; filename?: string; size: number; lastModified: number }>
): number {
  const keys = new Set<string>();
  for (const label of imageLabels) {
    const path = label.relativePath || label.filename || '';
    keys.add(buildImageIdentity(path, label.size, label.lastModified));
  }
  return keys.size;
}
