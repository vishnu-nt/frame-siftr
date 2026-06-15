import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProjectData, Label, ImageLabel } from '../types';
import { buildImageIdentity } from '../utils/paths';

interface ImageCategorizerDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectData;
  };
  categories: {
    key: string;
    value: Label;
  };
  labels: {
    key: string;
    value: ImageLabel;
  };
}

class DatabaseService {
  private db: IDBPDatabase<ImageCategorizerDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<ImageCategorizerDB>('image-categorizer', 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('labels')) {
            db.deleteObjectStore('labels');
          }
          db.createObjectStore('labels', { keyPath: 'id' });
        } else if (!db.objectStoreNames.contains('labels')) {
          db.createObjectStore('labels', { keyPath: 'id' });
        }
      },
    });
  }

  async saveProject(project: ProjectData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['projects', 'categories', 'labels'], 'readwrite');

    await tx.objectStore('projects').put(project);

    for (const label of project.labels) {
      await tx.objectStore('categories').put(label);
    }

    for (const imageLabel of project.imageLabels) {
      const withId = this.ensureImageLabelId(imageLabel);
      await tx.objectStore('labels').put(withId);
    }

    await tx.done;
  }

  async getProject(projectId: string): Promise<ProjectData | null> {
    if (!this.db) throw new Error('Database not initialized');
    return (await this.db.get('projects', projectId)) || null;
  }

  async getAllProjects(): Promise<ProjectData[]> {
    if (!this.db) throw new Error('Database not initialized');
    const projects = await this.db.getAll('projects');
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  }

  async saveLabel(label: ImageLabel): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('labels', this.ensureImageLabelId(label));
  }

  async getAllLabels(): Promise<ImageLabel[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAll('labels');
  }

  async removeLabel(imageLabel: ImageLabel): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('labels', this.ensureImageLabelId(imageLabel).id);
  }

  async saveCategory(category: Label): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('categories', category);
  }

  async getAllCategories(): Promise<Label[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAll('categories');
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('projects', projectId);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('categories', categoryId);
  }

  async deleteImageLabel(imageLabelId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('labels', imageLabelId);
  }

  async exportProject(projectId: string): Promise<ProjectData | null> {
    return await this.getProject(projectId);
  }

  ensureImageLabelId(label: ImageLabel): ImageLabel {
    const relativePath = label.relativePath || label.filename || '';
    const id =
      label.id ||
      buildImageIdentity(relativePath, label.size, label.lastModified);
    return {
      ...label,
      id,
      relativePath,
      filename: label.filename || relativePath.split('/').pop() || relativePath,
    };
  }

  async createDefaultProject(): Promise<ProjectData> {
    const defaultProject: ProjectData = {
      id: `project_${Date.now()}`,
      name: 'Default Project',
      createdAt: Date.now(),
      lastModified: Date.now(),
      labels: [],
      imageLabels: [],
      totalImages: 0,
      labeledImages: 0,
      formatVersion: 2,
    };

    await this.saveProject(defaultProject);
    return defaultProject;
  }
}

export const dbService = new DatabaseService();
