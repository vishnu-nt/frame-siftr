import { useRef, useMemo } from 'react';
import { useSelection } from './useAppState/useSelection';
import { useProjects } from './useAppState/useProjects';
import { useLabels } from './useAppState/useLabels';
import { useImages } from './useAppState/useImages';
import { useExportImport } from './useAppState/useExportImport';
import { useViewerNavigation } from './useAppState/useViewerNavigation';
import { countUniqueLabeledImages } from '../utils/paths';
import { ProjectData } from '../types';

export const useAppState = () => {
  // Refs break circular deps between projects ↔ labels/images/exportImport.
  // Assigned each render so callbacks always reach the latest hook return values.
  const labelsRef = useRef<ReturnType<typeof useLabels>>(null!);
  const imagesRef = useRef<ReturnType<typeof useImages>>(null!);
  const exportImportRef = useRef<ReturnType<typeof useExportImport>>(null!);

  const selection = useSelection();

  const projects = useProjects({
    onProjectSelected: (project) => {
      labelsRef.current.loadLabelsState(project.labels, project.imageLabels);
      imagesRef.current.clearImages();
      selection.resetSelection();
      if (project.exportPreferences) {
        exportImportRef.current.setExportPreferences(project.exportPreferences);
      }
    },
    onProjectClosed: () => {
      labelsRef.current.resetLabelsState();
      imagesRef.current.clearImages();
      selection.resetSelection();
    },
  });

  const labels = useLabels({
    currentProject: projects.currentProject,
    updateProjectState: projects.updateProjectState,
    onImagesLabelUpdated: (image, labelName) => {
      imagesRef.current.updateImagesLabel(image, labelName);
    },
    onImagesLabelsReconciled: (nextImageLabels) => {
      imagesRef.current.reconcileInMemoryImages(nextImageLabels);
    },
  });
  labelsRef.current = labels;

  const images = useImages({
    currentProject: projects.currentProject,
    imageLabels: labels.imageLabels,
    updateProjectState: projects.updateProjectState,
  });
  imagesRef.current = images;

  const exportImport = useExportImport({
    currentProject: projects.currentProject,
    images: images.images,
    labels: labels.labels,
    imageLabels: labels.imageLabels,
    updateProjectState: projects.updateProjectState,
    onImportProject: (importedProject: ProjectData) => {
      projects.setCurrentProject(importedProject);
      labels.loadLabelsState(importedProject.labels, importedProject.imageLabels);
      images.reconcileInMemoryImages(importedProject.imageLabels);
      projects.setProjects((prev) => {
        const exists = prev.some((p) => p.id === importedProject.id);
        if (exists) {
          return prev.map((p) => (p.id === importedProject.id ? importedProject : p));
        }
        return [importedProject, ...prev].sort((a, b) => b.lastModified - a.lastModified);
      });
      if (importedProject.exportPreferences) {
        exportImportRef.current.setExportPreferences(importedProject.exportPreferences);
      }
    },
  });
  exportImportRef.current = exportImport;

  const navigation = useViewerNavigation({
    images: images.images,
    imageLabels: labels.imageLabels,
    labels: labels.labels,
    selectedLabel: selection.selectedLabel,
    selectedFolder: selection.selectedFolder,
    selectedImage: selection.selectedImage,
    setSelectedImage: selection.setSelectedImage,
  });

  const labeledImageCount = useMemo(
    () => countUniqueLabeledImages(labels.imageLabels),
    [labels.imageLabels]
  );

  return {
    selectedImage: selection.selectedImage,
    selectedLabel: selection.selectedLabel,
    selectedFolder: selection.selectedFolder,
    isImageViewerOpen: selection.isImageViewerOpen,
    isLabelManagerOpen: selection.isLabelManagerOpen,
    isSettingsOpen: selection.isSettingsOpen,
    setIsSettingsOpen: selection.setIsSettingsOpen,
    setIsLabelManagerOpen: selection.setIsLabelManagerOpen,
    handleImageSelect: selection.handleImageSelect,
    handleLabelSelect: selection.handleLabelSelect,
    handleFolderSelect: selection.handleFolderSelect,
    handleCloseImageViewer: selection.handleCloseImageViewer,

    projects: projects.projects,
    currentProject: projects.currentProject,
    handleSelectProject: projects.handleSelectProject,
    handleCreateProject: projects.handleCreateProject,
    handleRenameProject: projects.handleRenameProject,
    handleDeleteProject: projects.handleDeleteProject,
    handleCloseProject: projects.handleCloseProject,

    labels: labels.labels,
    imageLabels: labels.imageLabels,
    handleImageLabel: labels.handleImageLabel,
    handleCreateLabel: labels.handleCreateLabel,
    handleUpdateLabel: labels.handleUpdateLabel,
    handleDeleteLabel: labels.handleDeleteLabel,

    images: images.images,
    mismatchInfo: images.mismatchInfo,
    handleImagesUploaded: images.handleImagesUploaded,
    handleResolveMismatch: images.handleResolveMismatch,

    isExporting: exportImport.isExporting,
    exportPreferences: exportImport.exportPreferences,
    handleExport: exportImport.handleExport,
    handleUpdateExportPreferences: exportImport.handleUpdateExportPreferences,
    handleImportData: exportImport.handleImportData,

    filteredImages: navigation.filteredImages,
    handlePreviousImage: navigation.handlePreviousImage,
    handleNextImage: navigation.handleNextImage,
    navigationState: navigation.navigationState,

    labeledImageCount,
  };
};
