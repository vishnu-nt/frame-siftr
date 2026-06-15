import { useState, useCallback } from 'react';
import { ImageFile } from '../../types';

export function useSelection() {
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const resetSelection = useCallback(() => {
    setSelectedImage(null);
    setSelectedLabel(null);
    setSelectedFolder(null);
    setIsImageViewerOpen(false);
    setIsLabelManagerOpen(false);
    setIsSettingsOpen(false);
  }, []);

  const handleCloseImageViewer = useCallback(() => {
    setIsImageViewerOpen(false);
    setSelectedImage(null);
  }, []);

  return {
    selectedImage,
    setSelectedImage,
    selectedLabel,
    setSelectedLabel,
    selectedFolder,
    setSelectedFolder,
    isImageViewerOpen,
    setIsImageViewerOpen,
    isLabelManagerOpen,
    setIsLabelManagerOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    handleImageSelect,
    handleLabelSelect,
    handleFolderSelect,
    handleCloseImageViewer,
    resetSelection,
  };
}
