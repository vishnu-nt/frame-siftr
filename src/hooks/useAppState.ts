import { useState, useEffect, useCallback } from 'react';
import {
  ImageFile,
  Label,
  ImageLabel,
  ProjectData,
  ExportDataV2,
  ExportPreferences,
  ExportMode,
  DEFAULT_EXPORT_PREFERENCES,
} from '../types';
import { dbService } from '../services/database';
import { thumbnailCache } from '../services/thumbnailCache';
import {
  buildExportPlan,
  writeToDirectory,
  pickExportDirectory,
  buildZipBlob,
  downloadBlob,
  formatExportSummary,
  isDirectoryPickerSupported,
} from '../services/exportService';
import {
  buildImageIdentity,
  countUniqueLabeledImages,
  imageMatchesLabel,
  isInFolder,
  isSafeRelativePath,
  reconcileImagesWithLabels,
  sanitizeLabelName,
} from '../utils/paths';

function migrateImageLabel(raw: ImageLabel): ImageLabel {
  const relativePath = raw.relativePath || raw.filename || '';
  return dbService.ensureImageLabelId({
    ...raw,
    relativePath,
    filename: raw.filename || relativePath.split('/').pop() || relativePath,
  });
}

export const useAppState = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [imageLabels, setImageLabels] = useState<ImageLabel[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPreferences, setExportPreferences] = useState<ExportPreferences>(
    DEFAULT_EXPORT_PREFERENCES
  );
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [mismatchInfo, setMismatchInfo] = useState<{
    newImages: ImageFile[];
    newUploadRoot: string;
  } | null>(null);

  const refreshProjectsList = useCallback(async () => {
    try {
      const allProjects = await dbService.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to refresh projects list:', error);
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await dbService.init();

        const allProjects = await dbService.getAllProjects();
        setProjects(allProjects);

        const lastId = localStorage.getItem('lastActiveProjectId');
        if (lastId) {
          let project = allProjects.find((p) => p.id === lastId);
          if (project) {
            const migratedLabels = (project.imageLabels || []).map(migrateImageLabel);
            project = {
              ...project,
              imageLabels: migratedLabels,
              labeledImages: countUniqueLabeledImages(migratedLabels),
              formatVersion: 2,
            };

            setCurrentProject(project);
            setLabels(project.labels);
            setImageLabels(migratedLabels);
            setExportPreferences(project.exportPreferences ?? DEFAULT_EXPORT_PREFERENCES);
            console.log('Auto-loaded last active project:', project.name);
            return;
          }
        }
        console.log('No active project loaded. Showing dashboard.');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  const handleSelectProject = useCallback(async (projectId: string) => {
    try {
      const project = await dbService.getProject(projectId);
      if (project) {
        const migratedLabels = (project.imageLabels || []).map(migrateImageLabel);
        const updatedProject: ProjectData = {
          ...project,
          imageLabels: migratedLabels,
          labeledImages: countUniqueLabeledImages(migratedLabels),
          formatVersion: 2,
        };

        localStorage.setItem('lastActiveProjectId', projectId);
        setCurrentProject(updatedProject);
        setLabels(updatedProject.labels);
        setImageLabels(migratedLabels);
        setImages([]); // clear images in memory, requires upload
        setExportPreferences(updatedProject.exportPreferences ?? DEFAULT_EXPORT_PREFERENCES);
        setSelectedLabel(null);
        setSelectedFolder(null);
        setMismatchInfo(null);
      }
    } catch (error) {
      console.error('Failed to select project:', error);
    }
  }, []);

  const handleCreateProject = useCallback(async (name: string) => {
    try {
      const newProject: ProjectData = {
        id: `project_${Date.now()}`,
        name: name.trim() || 'New Project',
        createdAt: Date.now(),
        lastModified: Date.now(),
        labels: [],
        imageLabels: [],
        totalImages: 0,
        labeledImages: 0,
        formatVersion: 2,
      };

      await dbService.saveProject(newProject);
      await refreshProjectsList();

      localStorage.setItem('lastActiveProjectId', newProject.id);
      setCurrentProject(newProject);
      setLabels([]);
      setImageLabels([]);
      setImages([]);
      setExportPreferences(DEFAULT_EXPORT_PREFERENCES);
      setSelectedLabel(null);
      setSelectedFolder(null);
      setMismatchInfo(null);
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }, [refreshProjectsList]);

  const handleRenameProject = useCallback(async (projectId: string, newName: string) => {
    try {
      const project = await dbService.getProject(projectId);
      if (project) {
        const updatedProject: ProjectData = {
          ...project,
          name: newName.trim(),
          lastModified: Date.now(),
        };
        await dbService.saveProject(updatedProject);
        
        // Update local list
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)));

        if (currentProject && currentProject.id === projectId) {
          setCurrentProject(updatedProject);
        }
      }
    } catch (error) {
      console.error('Failed to rename project:', error);
    }
  }, [currentProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await dbService.deleteProject(projectId);
      
      setProjects((prev) => prev.filter((p) => p.id !== projectId));

      if (currentProject && currentProject.id === projectId) {
        localStorage.removeItem('lastActiveProjectId');
        setCurrentProject(null);
        setLabels([]);
        setImageLabels([]);
        setImages([]);
        setSelectedLabel(null);
        setSelectedFolder(null);
        setMismatchInfo(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }, [currentProject]);

  const handleCloseProject = useCallback(() => {
    localStorage.removeItem('lastActiveProjectId');
    setCurrentProject(null);
    setLabels([]);
    setImageLabels([]);
    setImages([]);
    setSelectedLabel(null);
    setSelectedFolder(null);
    setMismatchInfo(null);
  }, []);

  const generateLabelId = () =>
    `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getLabelNameById = useCallback(
    (labelId: string | null) => {
      if (!labelId) return null;
      return labels.find((l) => l.id === labelId)?.name ?? null;
    },
    [labels]
  );

  const handleImageSelect = useCallback((image: ImageFile) => {
    setSelectedImage(image);
    setIsImageViewerOpen(true);
  }, []);

  const handleLabelSelect = useCallback((labelId: string | null) => {
    setSelectedLabel(labelId);
  }, []);

  const handleFolderSelect = useCallback((folderPath: string | null) => {
    setSelectedFolder(folderPath);
  }, []);

  const handleImageLabel = useCallback(
    async (image: ImageFile, labelId: string) => {
      try {
        const label = labels.find((l) => l.id === labelId);
        if (!label) return;

        const imageLabel = dbService.ensureImageLabelId({
          id: buildImageIdentity(image.relativePath, image.size, image.lastModified),
          relativePath: image.relativePath,
          filename: image.name,
          size: image.size,
          lastModified: image.lastModified,
          label: label.name,
          labeledAt: Date.now(),
        });

        const existingIndex = imageLabels.findIndex((l) =>
          imageMatchesLabel(image, l)
        );
        const isNewLabel = existingIndex < 0;
        const previousLabelName = existingIndex >= 0 ? imageLabels[existingIndex].label : null;

        await dbService.saveLabel(imageLabel);

        const nextImageLabels =
          existingIndex >= 0
            ? imageLabels.map((l, i) => (i === existingIndex ? imageLabel : l))
            : [...imageLabels, imageLabel];

        setImageLabels(nextImageLabels);

        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, labels: [label.name] } : img
          )
        );

        setLabels((prev) =>
          prev.map((l) => {
            if (l.id === labelId) {
              return { ...l, count: isNewLabel ? l.count + 1 : l.count };
            }
            if (previousLabelName && l.name === previousLabelName && !isNewLabel) {
              return { ...l, count: Math.max(0, l.count - 1) };
            }
            return l;
          })
        );

        if (currentProject) {
          const updatedLabels = labels.map((l) => {
            if (l.id === labelId && isNewLabel) return { ...l, count: l.count + 1 };
            if (previousLabelName && l.name === previousLabelName && !isNewLabel) {
              return { ...l, count: Math.max(0, l.count - 1) };
            }
            return l;
          });

          const updatedProject: ProjectData = {
            ...currentProject,
            labels: updatedLabels,
            imageLabels: nextImageLabels,
            lastModified: Date.now(),
            labeledImages: countUniqueLabeledImages(nextImageLabels),
          };
          await dbService.saveProject(updatedProject);
          setCurrentProject(updatedProject);
          setLabels(updatedLabels);
          setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
        }
      } catch (error) {
        console.error('Failed to label image:', error);
      }
    },
    [labels, imageLabels, currentProject]
  );

  const handleCreateLabel = useCallback(
    async (name: string, color: string) => {
      try {
        const sanitized = sanitizeLabelName(name);
        const newLabel: Label = {
          id: generateLabelId(),
          name: sanitized,
          color,
          count: 0,
          createdAt: Date.now(),
        };

        await dbService.saveCategory(newLabel);
        const nextLabels = [...labels, newLabel];
        setLabels(nextLabels);

        if (currentProject) {
          const updatedProject: ProjectData = {
            ...currentProject,
            labels: nextLabels,
            lastModified: Date.now(),
          };
          await dbService.saveProject(updatedProject);
          setCurrentProject(updatedProject);
          setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
        }
      } catch (error) {
        console.error('Failed to create label:', error);
      }
    },
    [labels, currentProject]
  );

  const handleUpdateLabel = useCallback(
    async (id: string, name: string, color: string) => {
      try {
        const updatedLabel: Label = {
          ...labels.find((l) => l.id === id)!,
          name: sanitizeLabelName(name),
          color,
        };

        await dbService.saveCategory(updatedLabel);
        const nextLabels = labels.map((l) => (l.id === id ? updatedLabel : l));
        setLabels(nextLabels);

        if (currentProject) {
          const updatedProject: ProjectData = {
            ...currentProject,
            labels: nextLabels,
            lastModified: Date.now(),
          };
          await dbService.saveProject(updatedProject);
          setCurrentProject(updatedProject);
          setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
        }
      } catch (error) {
        console.error('Failed to update label:', error);
      }
    },
    [labels, currentProject]
  );

  const handleDeleteLabel = useCallback(
    async (id: string) => {
      try {
        const deleted = labels.find((l) => l.id === id);
        const nextLabels = labels.filter((l) => l.id !== id);
        const nextImageLabels = imageLabels.filter((il) => il.label !== deleted?.name);
        setLabels(nextLabels);
        setImageLabels(nextImageLabels);

        if (currentProject) {
          const updatedProject: ProjectData = {
            ...currentProject,
            labels: nextLabels,
            imageLabels: nextImageLabels,
            labeledImages: countUniqueLabeledImages(nextImageLabels),
            lastModified: Date.now(),
          };
          await dbService.saveProject(updatedProject);
          setCurrentProject(updatedProject);
          setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
        }
      } catch (error) {
        console.error('Failed to delete label:', error);
      }
    },
    [labels, imageLabels, currentProject]
  );

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
      alert(
        'Folder export is not supported in this browser. Use Export as ZIP or try Chrome/Edge.'
      );
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
  }, [
    currentProject,
    images,
    labels,
    imageLabels,
    exportPreferences,
    confirmMissingFromSession,
  ]);

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
        await dbService.saveProject(updatedProject);
        setCurrentProject(updatedProject);
        setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
      }
    },
    [currentProject]
  );

  const handleImportData = useCallback(async (data: ProjectData | ExportDataV2) => {
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
        project = {
          ...(data as ProjectData),
          imageLabels: ((data as ProjectData).imageLabels || []).map(migrateImageLabel),
          formatVersion: 2,
        };
      }

      project.labeledImages = countUniqueLabeledImages(project.imageLabels);

      await dbService.saveProject(project);
      localStorage.setItem('lastActiveProjectId', project.id);
      setCurrentProject(project);
      setLabels(project.labels);
      setImageLabels(project.imageLabels);
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === project.id);
        if (exists) {
          return prev.map((p) => (p.id === project.id ? project : p));
        }
        return [project, ...prev].sort((a, b) => b.lastModified - a.lastModified);
      });

      if (images.length > 0) {
        setImages(reconcileImagesWithLabels(images, project.imageLabels));
      }
    } catch (error) {
      console.error('Failed to import project data:', error);
    }
  }, [images]);

  const applyUploadedImages = useCallback(
    async (newImages: ImageFile[], uploadRoot: string) => {
      thumbnailCache.clear();

      const reconciled = reconcileImagesWithLabels(newImages, imageLabels);
      setImages(reconciled);

      if (currentProject) {
        const updatedProject: ProjectData = {
          ...currentProject,
          uploadRoot: uploadRoot || currentProject.uploadRoot,
          totalImages: reconciled.length,
          lastModified: Date.now(),
          formatVersion: 2,
        };
        await dbService.saveProject(updatedProject);
        setCurrentProject(updatedProject);
        setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
      }
      setMismatchInfo(null);
    },
    [currentProject, imageLabels]
  );

  const handleImagesUploaded = useCallback(
    async (newImages: ImageFile[], uploadRoot: string) => {
      if (
        currentProject?.uploadRoot &&
        uploadRoot &&
        currentProject.uploadRoot !== uploadRoot &&
        imageLabels.length > 0
      ) {
        setMismatchInfo({ newImages, newUploadRoot: uploadRoot });
        return;
      }

      await applyUploadedImages(newImages, uploadRoot);
    },
    [currentProject, imageLabels, applyUploadedImages]
  );

  const handleResolveMismatch = useCallback(
    async (acceptNewRoot: boolean) => {
      if (!mismatchInfo) return;

      if (acceptNewRoot) {
        await applyUploadedImages(mismatchInfo.newImages, mismatchInfo.newUploadRoot);
      } else {
        setMismatchInfo(null);
      }
    },
    [mismatchInfo, applyUploadedImages]
  );

  const handleCloseImageViewer = useCallback(() => {
    setIsImageViewerOpen(false);
    setSelectedImage(null);
  }, []);

  const getFilteredImages = useCallback(() => {
    const labelName = getLabelNameById(selectedLabel);

    return images.filter((image) => {
      if (selectedFolder && !isInFolder(image.relativePath, selectedFolder)) {
        return false;
      }

      if (!labelName) return true;

      const imageLabel = imageLabels.find((l) => imageMatchesLabel(image, l));
      return imageLabel?.label === labelName;
    });
  }, [images, imageLabels, selectedLabel, selectedFolder, getLabelNameById]);

  const handlePreviousImage = useCallback(() => {
    if (!selectedImage) return;
    const filteredImages = getFilteredImages();
    const currentIndex = filteredImages.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(filteredImages[currentIndex - 1]);
    }
  }, [selectedImage, getFilteredImages]);

  const handleNextImage = useCallback(() => {
    if (!selectedImage) return;
    const filteredImages = getFilteredImages();
    const currentIndex = filteredImages.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentIndex + 1]);
    }
  }, [selectedImage, getFilteredImages]);

  const getNavigationState = useCallback(() => {
    if (!selectedImage) {
      return { hasPrevious: false, hasNext: false };
    }
    const filteredImages = getFilteredImages();
    const currentIndex = filteredImages.findIndex((img) => img.id === selectedImage.id);
    return {
      hasPrevious: currentIndex > 0,
      hasNext: currentIndex < filteredImages.length - 1,
    };
  }, [selectedImage, getFilteredImages]);

  const labeledImageCount = countUniqueLabeledImages(imageLabels);

  return {
    images,
    labels,
    imageLabels,
    selectedImage,
    selectedLabel,
    selectedFolder,
    isImageViewerOpen,
    isLabelManagerOpen,
    currentProject,
    labeledImageCount,
    handleImageSelect,
    handleLabelSelect,
    handleFolderSelect,
    handleImageLabel,
    handleCreateLabel,
    handleUpdateLabel,
    handleDeleteLabel,
    handleExport,
    handleImportData,
    handleUpdateExportPreferences,
    exportPreferences,
    isExporting,
    isSettingsOpen,
    setIsSettingsOpen,
    handleImagesUploaded,
    handleCloseImageViewer,
    handlePreviousImage,
    handleNextImage,
    getFilteredImages,
    getNavigationState,
    setIsLabelManagerOpen,
    // Multi-project exports
    projects,
    handleSelectProject,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
    handleCloseProject,
    mismatchInfo,
    handleResolveMismatch,
  };
};
