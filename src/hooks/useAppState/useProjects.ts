import { useState, useEffect, useCallback } from 'react';
import { ImageLabel, ProjectData } from '../../types';
import { dbService } from '../../services/database';
import { countUniqueLabeledImages } from '../../utils/paths';
import { useLatest } from '../useLatest';
import { usePostHog } from '@posthog/react';

interface UseProjectsProps {
  onProjectSelected: (project: ProjectData) => void;
  onProjectClosed: () => void;
}

function migrateProjectLabels(project: ProjectData): ProjectData {
  const migratedLabels = (project.imageLabels || []).map((il: ImageLabel) =>
    dbService.ensureImageLabelId(il)
  );
  return {
    ...project,
    imageLabels: migratedLabels,
    labeledImages: countUniqueLabeledImages(migratedLabels),
    formatVersion: 2,
  };
}

export function useProjects({ onProjectSelected, onProjectClosed }: UseProjectsProps) {
  const posthog = usePostHog();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);

  const onProjectSelectedRef = useLatest(onProjectSelected);
  const onProjectClosedRef = useLatest(onProjectClosed);
  const currentProjectRef = useLatest(currentProject);

  const refreshProjectsList = useCallback(async () => {
    try {
      const allProjects = await dbService.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to refresh projects list:', error);
    }
  }, []);

  // Initialize DB and load last active project (mount once)
  useEffect(() => {
    let cancelled = false;

    const initializeProjects = async () => {
      try {
        await dbService.init();
        const allProjects = await dbService.getAllProjects();
        if (cancelled) return;

        setProjects(allProjects);

        const lastId = localStorage.getItem('lastActiveProjectId');
        if (lastId) {
          const found = allProjects.find((p) => p.id === lastId);
          if (found) {
            const project = migrateProjectLabels(found);
            if (cancelled) return;

            setCurrentProject(project);
            onProjectSelectedRef.current(project);
            console.info('Auto-loaded last active project:', project.name);
            return;
          }
        }
        console.info('No active project loaded. Showing dashboard.');
      } catch (error) {
        console.error('Failed to initialize projects:', error);
      }
    };

    initializeProjects();
    return () => {
      cancelled = true;
    };
  }, [onProjectSelectedRef]);

  const handleSelectProject = useCallback(async (projectId: string) => {
    try {
      const project = await dbService.getProject(projectId);
      if (project) {
        const updatedProject = migrateProjectLabels(project);
        localStorage.setItem('lastActiveProjectId', projectId);
        setCurrentProject(updatedProject);
        onProjectSelectedRef.current(updatedProject);
      }
    } catch (error) {
      console.error('Failed to select project:', error);
    }
  }, [onProjectSelectedRef]);

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
      onProjectSelectedRef.current(newProject);
      posthog?.capture('project_created', { project_id: newProject.id });
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      posthog?.captureException(error as Error);
      throw error;
    }
  }, [refreshProjectsList, onProjectSelectedRef, posthog]);

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
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)));

        setCurrentProject((prev) =>
          prev && prev.id === projectId ? updatedProject : prev
        );
      }
    } catch (error) {
      console.error('Failed to rename project:', error);
    }
  }, []);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await dbService.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      posthog?.capture('project_deleted', { project_id: projectId });

      const active = currentProjectRef.current;
      if (active && active.id === projectId) {
        localStorage.removeItem('lastActiveProjectId');
        setCurrentProject(null);
        onProjectClosedRef.current();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      posthog?.captureException(error as Error);
    }
  }, [currentProjectRef, onProjectClosedRef, posthog]);

  const handleCloseProject = useCallback(() => {
    localStorage.removeItem('lastActiveProjectId');
    setCurrentProject(null);
    onProjectClosedRef.current();
  }, [onProjectClosedRef]);

  const updateProjectState = useCallback(async (updatedProject: ProjectData) => {
    await dbService.saveProject(updatedProject);
    setCurrentProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
  }, []);

  return {
    projects,
    setProjects,
    currentProject,
    setCurrentProject,
    handleSelectProject,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
    handleCloseProject,
    updateProjectState,
  };
}
