import { useState, useCallback } from 'react';
import { Label, ImageLabel, ImageFile, ProjectData } from '../../types';
import { dbService } from '../../services/database';
import {
  buildImageIdentity,
  imageMatchesLabel,
  countUniqueLabeledImages,
  sanitizeLabelName,
  getLabelNameById,
} from '../../utils/paths';
import { useLatest } from '../useLatest';

interface UseLabelsProps {
  currentProject: ProjectData | null;
  updateProjectState: (project: ProjectData) => Promise<void>;
  onImagesLabelUpdated: (image: ImageFile, labelName: string) => void;
  onImagesLabelsReconciled: (imageLabels: ImageLabel[]) => void;
}

export function useLabels({
  currentProject,
  updateProjectState,
  onImagesLabelUpdated,
  onImagesLabelsReconciled,
}: UseLabelsProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [imageLabels, setImageLabels] = useState<ImageLabel[]>([]);

  const currentProjectRef = useLatest(currentProject);
  const labelsRef = useLatest(labels);
  const imageLabelsRef = useLatest(imageLabels);
  const onImagesLabelUpdatedRef = useLatest(onImagesLabelUpdated);
  const onImagesLabelsReconciledRef = useLatest(onImagesLabelsReconciled);

  const generateLabelId = () =>
    `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleImageLabel = useCallback(
    async (image: ImageFile, labelId: string) => {
      try {
        const prevLabels = labelsRef.current;
        const prevImageLabels = imageLabelsRef.current;
        const label = prevLabels.find((l) => l.id === labelId);
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

        const existingIndex = prevImageLabels.findIndex((l) => imageMatchesLabel(image, l));
        const isNewLabel = existingIndex < 0;
        const previousLabelName = existingIndex >= 0 ? prevImageLabels[existingIndex].label : null;

        await dbService.saveLabel(imageLabel);

        const nextImageLabels =
          existingIndex >= 0
            ? prevImageLabels.map((l, i) => (i === existingIndex ? imageLabel : l))
            : [...prevImageLabels, imageLabel];

        const updatedLabels = prevLabels.map((l) => {
          if (l.id === labelId) {
            return { ...l, count: isNewLabel ? l.count + 1 : l.count };
          }
          if (previousLabelName && l.name === previousLabelName && !isNewLabel) {
            return { ...l, count: Math.max(0, l.count - 1) };
          }
          return l;
        });

        setImageLabels(nextImageLabels);
        setLabels(updatedLabels);
        onImagesLabelUpdatedRef.current(image, label.name);

        const project = currentProjectRef.current;
        if (project) {
          await updateProjectState({
            ...project,
            labels: updatedLabels,
            imageLabels: nextImageLabels,
            lastModified: Date.now(),
            labeledImages: countUniqueLabeledImages(nextImageLabels),
          });
        }
      } catch (error) {
        console.error('Failed to label image:', error);
      }
    },
    [labelsRef, imageLabelsRef, updateProjectState, onImagesLabelUpdatedRef, currentProjectRef]
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

        const nextLabels = [...labelsRef.current, newLabel];
        setLabels(nextLabels);

        const project = currentProjectRef.current;
        if (project) {
          await updateProjectState({
            ...project,
            labels: nextLabels,
            lastModified: Date.now(),
          });
        }
      } catch (error) {
        console.error('Failed to create label:', error);
      }
    },
    [labelsRef, updateProjectState, currentProjectRef]
  );

  const handleUpdateLabel = useCallback(
    async (id: string, name: string, color: string) => {
      try {
        const prevLabels = labelsRef.current;
        const existing = prevLabels.find((l) => l.id === id);
        if (!existing) return;

        const sanitizedName = sanitizeLabelName(name);
        const updatedLabel: Label = { ...existing, name: sanitizedName, color };
        const nextLabels = prevLabels.map((l) => (l.id === id ? updatedLabel : l));
        setLabels(nextLabels);

        await dbService.saveCategory(updatedLabel);

        const renamed = existing.name !== sanitizedName;
        let nextImageLabels = imageLabelsRef.current;

        if (renamed) {
          nextImageLabels = imageLabelsRef.current.map((il) =>
            il.label === existing.name ? { ...il, label: sanitizedName } : il
          );
          setImageLabels(nextImageLabels);

          const changedAssignments = imageLabelsRef.current.filter(
            (il) => il.label === existing.name
          );
          for (const assignment of changedAssignments) {
            await dbService.saveLabel({ ...assignment, label: sanitizedName });
          }

          onImagesLabelsReconciledRef.current(nextImageLabels);
        }

        const project = currentProjectRef.current;
        if (project) {
          await updateProjectState({
            ...project,
            labels: nextLabels,
            imageLabels: nextImageLabels,
            lastModified: Date.now(),
            labeledImages: countUniqueLabeledImages(nextImageLabels),
          });
        }
      } catch (error) {
        console.error('Failed to update label:', error);
      }
    },
    [labelsRef, imageLabelsRef, updateProjectState, currentProjectRef, onImagesLabelsReconciledRef]
  );

  const handleDeleteLabel = useCallback(
    async (id: string) => {
      try {
        const prevLabels = labelsRef.current;
        const deleted = prevLabels.find((l) => l.id === id);
        if (!deleted) return;

        const nextLabels = prevLabels.filter((l) => l.id !== id);
        const prevImageLabels = imageLabelsRef.current;
        const assignmentsToDelete = prevImageLabels.filter((il) => il.label === deleted.name);
        const nextImageLabels = prevImageLabels.filter((il) => il.label !== deleted.name);

        setLabels(nextLabels);
        setImageLabels(nextImageLabels);

        await dbService.deleteCategory(id);
        for (const assignment of assignmentsToDelete) {
          await dbService.deleteImageLabel(assignment.id);
        }

        onImagesLabelsReconciledRef.current(nextImageLabels);

        const project = currentProjectRef.current;
        if (project) {
          await updateProjectState({
            ...project,
            labels: nextLabels,
            imageLabels: nextImageLabels,
            labeledImages: countUniqueLabeledImages(nextImageLabels),
            lastModified: Date.now(),
          });
        }
      } catch (error) {
        console.error('Failed to delete label:', error);
      }
    },
    [labelsRef, imageLabelsRef, updateProjectState, currentProjectRef, onImagesLabelsReconciledRef]
  );

  const resetLabelsState = useCallback(() => {
    setLabels([]);
    setImageLabels([]);
  }, []);

  const loadLabelsState = useCallback((projectLabels: Label[], projectImageLabels: ImageLabel[]) => {
    setLabels(projectLabels);
    setImageLabels(projectImageLabels);
  }, []);

  return {
    labels,
    setLabels,
    imageLabels,
    setImageLabels,
    getLabelNameById: (labelId: string | null) => getLabelNameById(labels, labelId),
    handleImageLabel,
    handleCreateLabel,
    handleUpdateLabel,
    handleDeleteLabel,
    resetLabelsState,
    loadLabelsState,
  };
}
