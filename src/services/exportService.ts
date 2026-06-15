import { Zip, ZipPassThrough } from 'fflate';
import {
  ImageFile,
  Label,
  ImageLabel,
  ExportPreferences,
  ExportPlan,
  ExportPlanEntry,
  ExportAssignment,
  DEFAULT_EXPORT_PREFERENCES,
} from '../types';
import {
  buildImageIdentity,
  imageMatchesLabel,
  isSafeRelativePath,
  sanitizeLabelName,
} from '../utils/paths';

const UNLABELED_FOLDER = 'Unlabeled';

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function buildDestPath(
  safeLabel: string,
  sourceRelativePath: string,
  pathLayout: ExportPreferences['pathLayout']
): string {
  if (pathLayout === 'preserve') {
    return `${safeLabel}/${sourceRelativePath}`;
  }
  return `${safeLabel}/${basename(sourceRelativePath)}`;
}

export function buildExportPlan(
  images: ImageFile[],
  labels: Label[],
  imageLabels: ImageLabel[],
  preferences: ExportPreferences = DEFAULT_EXPORT_PREFERENCES
): ExportPlan {
  const prefs = { ...DEFAULT_EXPORT_PREFERENCES, ...preferences };
  const labelNames = new Set(labels.map((l) => l.name));
  const validLabels = imageLabels.filter((il) => labelNames.has(il.label));

  const assignmentMap = new Map<string, ImageLabel>();
  for (const il of validLabels) {
    const key = buildImageIdentity(il.relativePath, il.size, il.lastModified);
    assignmentMap.set(key, il);
  }

  const assignments: ExportAssignment[] = Array.from(assignmentMap.values()).map((il) => {
    const labelDef = labels.find((l) => l.name === il.label);
    return {
      relativePath: il.relativePath,
      filename: il.filename,
      size: il.size,
      lastModified: il.lastModified,
      label: il.label,
      labelId: labelDef?.id,
    };
  });

  const entries: ExportPlanEntry[] = [];
  const emptyLabels: string[] = [];
  const warnings: string[] = [];
  let missingFromSession = 0;
  let collisionsSkipped = 0;

  const flatCollisionMap = new Map<string, string>();

  const labelsWithFiles = new Set<string>();

  for (const il of Array.from(assignmentMap.values())) {
    const image = images.find((img) => imageMatchesLabel(img, il));
    if (!image?.file) {
      missingFromSession++;
      continue;
    }

    const labelDef = labels.find((l) => l.name === il.label);
    const labelName = labelDef?.name ?? il.label;
    const safeLabelName = sanitizeLabelName(labelName);
    const sourceRelativePath = il.relativePath;

    if (!isSafeRelativePath(sourceRelativePath)) {
      warnings.push(`Skipped unsafe path: ${sourceRelativePath}`);
      continue;
    }

    const relativeDestPath = buildDestPath(safeLabelName, sourceRelativePath, prefs.pathLayout);

    if (prefs.pathLayout === 'flat') {
      const collisionKey = `${safeLabelName}/${basename(sourceRelativePath)}`;
      const existing = flatCollisionMap.get(collisionKey);
      if (existing) {
        if (existing !== sourceRelativePath) {
          collisionsSkipped++;
          warnings.push(
            `Collision (flat): ${basename(sourceRelativePath)} in label '${labelName}'`
          );
          continue;
        }
      } else {
        flatCollisionMap.set(collisionKey, sourceRelativePath);
      }
    }

    labelsWithFiles.add(safeLabelName);
    entries.push({
      labelName,
      safeLabelName,
      relativeDestPath,
      file: image.file,
      sourceRelativePath,
    });
  }

  if (prefs.includeUnlabeled) {
    const labeledKeys = new Set(
      Array.from(assignmentMap.values()).map((il) =>
        buildImageIdentity(il.relativePath, il.size, il.lastModified)
      )
    );

    const unlabeledFlatMap = new Map<string, string>();

    for (const image of images) {
      const key = buildImageIdentity(image.relativePath, image.size, image.lastModified);
      if (labeledKeys.has(key)) continue;
      if (!image.file) continue;

      const sourceRelativePath = image.relativePath;
      if (!isSafeRelativePath(sourceRelativePath)) continue;

      const safeLabelName = sanitizeLabelName(UNLABELED_FOLDER);
      const relativeDestPath = buildDestPath(safeLabelName, sourceRelativePath, prefs.pathLayout);

      if (prefs.pathLayout === 'flat') {
        const collisionKey = `${safeLabelName}/${basename(sourceRelativePath)}`;
        const existing = unlabeledFlatMap.get(collisionKey);
        if (existing) {
          if (existing !== sourceRelativePath) {
            collisionsSkipped++;
            continue;
          }
        } else {
          unlabeledFlatMap.set(collisionKey, sourceRelativePath);
        }
      }

      labelsWithFiles.add(safeLabelName);
      entries.push({
        labelName: UNLABELED_FOLDER,
        safeLabelName,
        relativeDestPath,
        file: image.file,
        sourceRelativePath,
      });
    }
  }

  if (prefs.includeEmptyLabels) {
    for (const label of labels) {
      const safeLabelName = sanitizeLabelName(label.name);
      if (!labelsWithFiles.has(safeLabelName)) {
        emptyLabels.push(safeLabelName);
      }
    }
  }

  return {
    entries,
    emptyLabels,
    missingFromSession,
    collisionsSkipped,
    warnings,
    assignments,
  };
}

export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function getNestedDirectoryHandle(
  root: FileSystemDirectoryHandle,
  pathParts: string[]
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const part of pathParts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

export interface WriteToDirectoryResult {
  copied: number;
  skipped: number;
  errors: number;
}

export async function writeToDirectory(
  plan: ExportPlan,
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (copied: number, total: number) => void
): Promise<WriteToDirectoryResult> {
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const total = plan.entries.length;

  for (const emptyLabel of plan.emptyLabels) {
    await dirHandle.getDirectoryHandle(emptyLabel, { create: true });
  }

  for (const entry of plan.entries) {
    try {
      const pathParts = entry.relativeDestPath.split('/');
      const fileName = pathParts.pop()!;
      const dirParts = pathParts;

      const labelDir =
        dirParts.length > 0
          ? await getNestedDirectoryHandle(dirHandle, dirParts)
          : dirHandle;

      const fileHandle = await labelDir.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as FileSystemFileHandle & {
        createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
      }).createWritable();
      await writable.write(entry.file);
      await writable.close();
      copied++;
    } catch (err) {
      console.error('Failed to write file:', entry.relativeDestPath, err);
      errors++;
    }

    onProgress?.(copied + skipped + errors, total);
  }

  return { copied, skipped, errors };
}

export async function pickExportDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isDirectoryPickerSupported()) {
    return null;
  }

  try {
    const win = window as unknown as {
      showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
    };
    return await win.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Builds a ZIP sequentially (one source file read at a time) to limit peak memory.
 * Folder export uses the same strategy via per-file writes in writeToDirectory.
 */
export async function buildZipBlob(
  plan: ExportPlan,
  onProgress?: (processed: number, total: number) => void
): Promise<Blob> {
  const total = plan.entries.length;

  return new Promise<Blob>((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    const zip = new Zip((err, data, final) => {
      if (err) {
        reject(err);
        return;
      }
      chunks.push(data);
      if (final) {
        const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          out.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(new Blob([out], { type: 'application/zip' }));
      }
    });

    (async () => {
      for (let i = 0; i < plan.entries.length; i++) {
        const entry = plan.entries[i];
        const buffer = await entry.file.arrayBuffer();
        const fileStream = new ZipPassThrough(entry.relativeDestPath);
        zip.add(fileStream);
        fileStream.push(new Uint8Array(buffer), true);
        onProgress?.(i + 1, total);
      }

      for (const emptyLabel of plan.emptyLabels) {
        const folderStream = new ZipPassThrough(`${emptyLabel}/`);
        zip.add(folderStream);
        folderStream.push(new Uint8Array(0), true);
      }

      zip.end();
    })().catch(reject);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatExportSummary(
  plan: ExportPlan,
  result?: WriteToDirectoryResult
): string {
  const parts: string[] = [];

  if (result) {
    parts.push(`Copied: ${result.copied}`);
    if (result.skipped > 0) parts.push(`Skipped: ${result.skipped}`);
    if (result.errors > 0) parts.push(`Errors: ${result.errors}`);
  } else {
    parts.push(`Exported: ${plan.entries.length} files`);
  }

  if (plan.emptyLabels.length > 0) {
    parts.push(`Empty folders: ${plan.emptyLabels.length}`);
  }
  if (plan.missingFromSession > 0) {
    parts.push(`Missing from session: ${plan.missingFromSession}`);
  }
  if (plan.collisionsSkipped > 0) {
    parts.push(`Collisions skipped: ${plan.collisionsSkipped}`);
  }

  return parts.join('\n');
}
