import { useMemo, useCallback } from 'react';
import { ImageFile, Label, ImageLabel } from '../../types';
import { isInFolder, imageMatchesLabel, getLabelNameById } from '../../utils/paths';

interface UseViewerNavigationProps {
  images: ImageFile[];
  imageLabels: ImageLabel[];
  labels: Label[];
  selectedLabel: string | null;
  selectedFolder: string | null;
  selectedImage: ImageFile | null;
  setSelectedImage: (image: ImageFile | null) => void;
}

export function useViewerNavigation({
  images,
  imageLabels,
  labels,
  selectedLabel,
  selectedFolder,
  selectedImage,
  setSelectedImage,
}: UseViewerNavigationProps) {
  const labelName = getLabelNameById(labels, selectedLabel);

  const filteredImages = useMemo(() => {
    return images.filter((image) => {
      if (selectedFolder && !isInFolder(image.relativePath, selectedFolder)) {
        return false;
      }

      if (!labelName) return true;

      const imageLabel = imageLabels.find((l) => imageMatchesLabel(image, l));
      return imageLabel?.label === labelName;
    });
  }, [images, imageLabels, selectedFolder, labelName]);

  const navigationState = useMemo(() => {
    if (!selectedImage) {
      return { hasPrevious: false, hasNext: false };
    }
    const currentIndex = filteredImages.findIndex((img) => img.id === selectedImage.id);
    return {
      hasPrevious: currentIndex > 0,
      hasNext: currentIndex >= 0 && currentIndex < filteredImages.length - 1,
    };
  }, [selectedImage, filteredImages]);

  const handlePreviousImage = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(filteredImages[currentIndex - 1]);
    }
  }, [selectedImage, filteredImages, setSelectedImage]);

  const handleNextImage = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentIndex + 1]);
    }
  }, [selectedImage, filteredImages, setSelectedImage]);

  return {
    filteredImages,
    navigationState,
    handlePreviousImage,
    handleNextImage,
  };
}
