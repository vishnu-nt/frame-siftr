import { useState, useCallback } from 'react';
import { ImageFile, ImageLabel, ProjectData } from '../../types';
import { thumbnailCache } from '../../services/thumbnailCache';
import { reconcileImagesWithLabels } from '../../utils/paths';
import { useLatest } from '../useLatest';

interface UseImagesProps {
  currentProject: ProjectData | null;
  imageLabels: ImageLabel[];
  updateProjectState: (project: ProjectData) => Promise<void>;
}

export function useImages({ currentProject, imageLabels, updateProjectState }: UseImagesProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [mismatchInfo, setMismatchInfo] = useState<{
    newImages: ImageFile[];
    newUploadRoot: string;
  } | null>(null);

  const currentProjectRef = useLatest(currentProject);
  const imageLabelsRef = useLatest(imageLabels);

  const applyUploadedImages = useCallback(
    async (newImages: ImageFile[], uploadRoot: string) => {
      thumbnailCache.clear();

      const reconciled = reconcileImagesWithLabels(newImages, imageLabelsRef.current);
      setImages(reconciled);

      const project = currentProjectRef.current;
      if (project) {
        const updatedProject: ProjectData = {
          ...project,
          uploadRoot: uploadRoot || project.uploadRoot,
          totalImages: reconciled.length,
          lastModified: Date.now(),
          formatVersion: 2,
        };
        await updateProjectState(updatedProject);
      }
      setMismatchInfo(null);
    },
    [currentProjectRef, imageLabelsRef, updateProjectState]
  );

  const handleImagesUploaded = useCallback(
    async (newImages: ImageFile[], uploadRoot: string) => {
      const project = currentProjectRef.current;
      if (
        project?.uploadRoot &&
        uploadRoot &&
        project.uploadRoot !== uploadRoot &&
        imageLabelsRef.current.length > 0
      ) {
        setMismatchInfo({ newImages, newUploadRoot: uploadRoot });
        return;
      }

      await applyUploadedImages(newImages, uploadRoot);
    },
    [currentProjectRef, imageLabelsRef, applyUploadedImages]
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

  const updateImagesLabel = useCallback((image: ImageFile, labelName: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === image.id ? { ...img, labels: [labelName] } : img))
    );
  }, []);

  const reconcileInMemoryImages = useCallback((nextImageLabels: ImageLabel[]) => {
    setImages((prev) => (prev.length > 0 ? reconcileImagesWithLabels(prev, nextImageLabels) : prev));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
    setMismatchInfo(null);
  }, []);

  return {
    images,
    setImages,
    mismatchInfo,
    setMismatchInfo,
    handleImagesUploaded,
    handleResolveMismatch,
    updateImagesLabel,
    reconcileInMemoryImages,
    clearImages,
  };
}
