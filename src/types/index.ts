export interface ImageFile {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  lastModified: number;
  file: File;
  url?: string;
  labels?: string[];
  isProcessed?: boolean;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: number;
}

export interface ImageLabel {
  id: string;
  relativePath: string;
  filename: string;
  size: number;
  lastModified: number;
  label: string;
  labeledAt: number;
}

export type ExportPathLayout = 'flat' | 'preserve';

export interface ExportPreferences {
  includeEmptyLabels: boolean;
  includeUnlabeled: boolean;
  pathLayout: ExportPathLayout;
}

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
  includeEmptyLabels: false,
  includeUnlabeled: false,
  pathLayout: 'flat',
};

export interface ProjectData {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  labels: Label[];
  imageLabels: ImageLabel[];
  totalImages: number;
  labeledImages: number;
  uploadRoot?: string;
  formatVersion?: number;
  exportPreferences?: ExportPreferences;
}

export interface ExportPlanEntry {
  labelName: string;
  safeLabelName: string;
  relativeDestPath: string;
  file: File;
  sourceRelativePath: string;
}

export interface ExportPlan {
  entries: ExportPlanEntry[];
  emptyLabels: string[];
  missingFromSession: number;
  collisionsSkipped: number;
  warnings: string[];
  assignments: ExportAssignment[];
}

export interface ExportAssignment {
  relativePath: string;
  filename: string;
  size: number;
  lastModified: number;
  label: string;
  labelId?: string;
}

export interface ExportDataV2 {
  formatVersion: 2;
  uploadRoot?: string;
  exportedAt: string;
  labels: Array<{ id: string; name: string; color: string }>;
  assignments: ExportAssignment[];
  summary: {
    totalImages: number;
    labeledImages: number;
    missingFromSession: number;
  };
  project?: ProjectData;
}

export interface VirtualizationItem {
  index: number;
  image: ImageFile;
  isVisible: boolean;
}

export interface SidebarProps {
  labels: Label[];
  images: ImageFile[];
  imageLabels: ImageLabel[];
  uploadRoot?: string;
  onLabelSelect: (labelId: string | null) => void;
  selectedLabel: string | null;
  selectedFolder: string | null;
  onFolderSelect: (folderPath: string | null) => void;
  onExport: (mode: 'json' | 'folder' | 'zip') => void;
  onImportData: (data: ProjectData) => void;
  isExporting?: boolean;
}

export type ExportMode = 'json' | 'folder' | 'zip';

export interface LabelManagerProps {
  labels: Label[];
  onCreateLabel: (name: string, color: string) => void;
  onUpdateLabel: (id: string, name: string, color: string) => void;
  onDeleteLabel: (id: string) => void;
}

export interface ImageViewerProps {
  image: ImageFile;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  labels: Label[];
  onLabelImage: (labelId: string) => void;
  onCreateLabel: (name: string, color: string) => void;
}
