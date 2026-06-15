import { useState, useCallback } from 'react';
import {
  ImageFile,
  Label,
  ImageLabel,
  ProjectData,
  ExportDataV2,
  ExportPreferences,
  ExportMode,
  DEFAULT_EXPORT_PREFERENCES,
} from '../../types';
import { dbService } from '../../services/database';
import {
  buildExportPlan,
  writeToDirectory,
  pickExportDirectory,
  buildZipBlob,
  downloadBlob,
  formatExportSummary,
  isDirectoryPickerSupported,
} from '../../services/exportService';
import { isSafeRelativePath, buildImageIdentity, countUniqueLabeledImages } from '../../utils/paths';
import { useLatest } from '../useLatest';

interface UseExportImportProps {
  currentProject: ProjectData | null;
  images: ImageFile[];
  labels: Label[];
  imageLabels: ImageLabel[];
  updateProjectState: (project: ProjectData) => Promise<void>;
  onImportProject: (project: ProjectData) => void;
}

export function useExportImport({
  currentProject,
  images,
  labels,
  imageLabels,
  updateProjectState,
  onImportProject,
}: UseExportImportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportPreferences, setExportPreferences] = useState<ExportPreferences>(
    DEFAULT_EXPORT_PREFERENCES
  );

  const onImportProjectRef = useLatest(onImportProject);

  const getExportFilenameBase = useCallback(() => {
    const name = currentProject?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'project';
    const date = new Date().toISOString().split('T')[0];
    return `image-categorizer-${name}-${date}`;
  }, [currentProject]);

  const confirmMissingFromSession = useCallback((missing: number): boolean => {
    if (missing <= 0) return true;
    return window.confirm(
      `${missing} labeled image(s) are not in the current upload. Re-upload the folder to include them. Export available files only?`
    );
  }, []);

  const handleExportJson = useCallback(() => {
    try {
      if (!currentProject) {
        alert('No project data available for export.');
        return;
      }

      const plan = buildExportPlan(images, labels, imageLabels, exportPreferences);
      const assignments = plan.assignments;

      const hasFolderPaths = assignments.every(
        (a) => a.relativePath && isSafeRelativePath(a.relativePath)
      );
      const hasUploadRoot = Boolean(currentProject.uploadRoot);

      if (!hasFolderPaths || !hasUploadRoot) {
        const proceed = window.confirm(
          'Some labels lack folder paths (folder upload may be required for the organize script). Export anyway?'
        );
        if (!proceed) return;
      }

      const labelNames = new Set(labels.map((l) => l.name));
      const validLabels = imageLabels.filter((il) => labelNames.has(il.label));

      const exportData: ExportDataV2 = {
        formatVersion: 2,
        uploadRoot: currentProject.uploadRoot,
        exportedAt: new Date().toISOString(),
        labels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
        assignments,
        summary: {
          totalImages: images.length,
          labeledImages: assignments.length,
          missingFromSession: plan.missingFromSession,
        },
        project: {
          ...currentProject,
          imageLabels: validLabels,
          labeledImages: assignments.length,
          exportPreferences,
        },
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      downloadBlob(dataBlob, `${getExportFilenameBase()}.json`);
    } catch (error) {
      console.error('Failed to export project data:', error);
      alert('Failed to export project data. Please try again.');
    }
  }, [currentProject, images, labels, imageLabels, exportPreferences, getExportFilenameBase]);

  const handleExportFolder = useCallback(async () => {
    if (!currentProject) {
      alert('No project data available for export.');
      return;
    }

    if (!isDirectoryPickerSupported()) {
      alert('Folder export is not supported in this browser. Use Export as ZIP or try Chrome/Edge.');
      return;
    }

    const plan = buildExportPlan(images, labels, imageLabels, exportPreferences);

    if (plan.entries.length === 0 && plan.emptyLabels.length === 0) {
      alert('No labeled images to export. Label some images first.');
      return;
    }

    if (!confirmMissingFromSession(plan.missingFromSession)) return;

    try {
      setIsExporting(true);
      const dirHandle = await pickExportDirectory();
      if (!dirHandle) return;

      const result = await writeToDirectory(plan, dirHandle);
      alert(formatExportSummary(plan, result));
    } catch (error) {
      console.error('Failed to export folder:', error);
      alert('Failed to export folder. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, images, labels, imageLabels, exportPreferences, confirmMissingFromSession]);

  const handleExportZip = useCallback(async () => {
    if (!currentProject) {
      alert('No project data available for export.');
      return;
    }

    const plan = buildExportPlan(images, labels, imageLabels, exportPreferences);

    if (plan.entries.length === 0 && plan.emptyLabels.length === 0) {
      alert('No labeled images to export. Label some images first.');
      return;
    }

    if (!confirmMissingFromSession(plan.missingFromSession)) return;

    try {
      setIsExporting(true);
      const zipBlob = await buildZipBlob(plan);
      downloadBlob(zipBlob, `${getExportFilenameBase()}.zip`);
      alert(formatExportSummary(plan));
    } catch (error) {
      console.error('Failed to export ZIP:', error);
      alert('Failed to export ZIP. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [
    currentProject,
    images,
    labels,
    imageLabels,
    exportPreferences,
    confirmMissingFromSession,
    getExportFilenameBase,
  ]);

  const handleExport = useCallback(
    (mode: ExportMode) => {
      if (mode === 'json') {
        handleExportJson();
      } else if (mode === 'folder') {
        handleExportFolder();
      } else {
        handleExportZip();
      }
    },
    [handleExportJson, handleExportFolder, handleExportZip]
  );

  const handleUpdateExportPreferences = useCallback(
    async (preferences: ExportPreferences) => {
      setExportPreferences(preferences);

      if (currentProject) {
        const updatedProject: ProjectData = {
          ...currentProject,
          exportPreferences: preferences,
          lastModified: Date.now(),
        };
        await updateProjectState(updatedProject);
      }
    },
    [currentProject, updateProjectState]
  );

  const handleImportData = useCallback(
    async (data: ProjectData | ExportDataV2) => {
      try {
        let project: ProjectData;

        if ('formatVersion' in data && data.formatVersion === 2 && 'assignments' in data) {
          const exportData = data as ExportDataV2;
          project = exportData.project || {
            id: `project_${Date.now()}`,
            name: 'Imported Project',
            createdAt: Date.now(),
            lastModified: Date.now(),
            labels: [],
            imageLabels: [],
            totalImages: 0,
            labeledImages: 0,
          };

          project = {
            ...project,
            uploadRoot: exportData.uploadRoot || project.uploadRoot,
            labels: exportData.labels.map((l) => ({
              id: l.id,
              name: l.name,
              color: l.color,
              count: 0,
              createdAt: Date.now(),
            })),
            imageLabels: exportData.assignments.map((a) =>
              dbService.ensureImageLabelId({
                id: buildImageIdentity(a.relativePath, a.size, a.lastModified),
                relativePath: a.relativePath,
                filename: a.filename,
                size: a.size,
                lastModified: a.lastModified,
                label: a.label,
                labeledAt: Date.now(),
              })
            ),
            formatVersion: 2,
            labeledImages: exportData.assignments.length,
          };
        } else {
          const rawProj = data as ProjectData;
          project = {
            ...rawProj,
            imageLabels: (rawProj.imageLabels || []).map((il: ImageLabel) =>
              dbService.ensureImageLabelId(il)
            ),
            formatVersion: 2,
          };
        }

        project.labeledImages = countUniqueLabeledImages(project.imageLabels);

        await dbService.saveProject(project);
        localStorage.setItem('lastActiveProjectId', project.id);

        onImportProjectRef.current(project);
      } catch (error) {
        console.error('Failed to import project data:', error);
      }
    },
    [onImportProjectRef]
  );

  return {
    isExporting,
    exportPreferences,
    setExportPreferences,
    handleExport,
    handleUpdateExportPreferences,
    handleImportData,
  };
}
