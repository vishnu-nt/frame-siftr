import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  Trash2,
  Edit3,
  Upload,
  Play,
  Calendar,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { ProjectData } from '../types';
import { supabase } from '../services/supabaseClient';

interface ProjectDashboardProps {
  projects: ProjectData[];
  onCreateProject: (name: string) => Promise<any>;
  onSelectProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onImportProject: (data: any) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  onCreateProject,
  onSelectProject,
  onRenameProject,
  onDeleteProject,
  onImportProject,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch active session's user email
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUserEmail(session?.user?.email || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;

    // Show warning if project name already exists
    const duplicate = projects.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg('A project with this name already exists (you can still create it, but names will match).');
    } else {
      setErrorMsg('');
    }

    try {
      await onCreateProject(trimmed);
      setNewProjectName('');
      setErrorMsg('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartRename = (project: ProjectData) => {
    setEditingProjectId(project.id);
    setEditName(project.name);
  };

  const handleSaveRename = (projectId: string) => {
    if (editName.trim()) {
      onRenameProject(projectId, editName.trim());
    }
    setEditingProjectId(null);
  };

  const handleCancelRename = () => {
    setEditingProjectId(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          onImportProject(data);
        } catch (err) {
          alert('Failed to parse JSON file. Make sure it is a valid export.');
        }
      };
      reader.readAsText(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-cursor-bg text-cursor-text flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col gap-8 z-10">
        {/* Header */}
        <div className="text-center md:text-left md:flex md:items-center md:justify-between border-b border-cursor-border pb-6 gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center md:justify-start gap-3">
              <FolderPlus className="text-cursor-accent" size={32} />
              <span>Cullr</span>
            </h1>
            <p className="text-cursor-text-secondary mt-2 text-sm">
              Organize, filter, and label folders of images locally in your browser.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:items-end gap-3 shrink-0">
            {userEmail && (
              <div className="flex items-center justify-center gap-3 bg-cursor-sidebar/60 border border-cursor-border px-3 py-1.5 rounded-lg text-xs">
                <span className="text-cursor-text-secondary truncate max-w-[180px]" title={userEmail}>
                  Logged in as <strong className="text-white font-medium">{userEmail}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded border border-red-500/20 transition-all font-semibold"
                >
                  Logout
                </button>
              </div>
            )}
            <div className="flex gap-3 justify-center w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-cursor-sidebar hover:bg-[#151b2e] border border-cursor-border rounded text-sm font-medium transition"
              >
                <Upload size={16} />
                <span>Import Project JSON</span>
              </button>
            </div>
          </div>
        </div>


        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Create new project card */}
          <div className="md:col-span-1 bg-cursor-sidebar/40 backdrop-blur-md border border-cursor-border rounded-xl p-6 shadow-xl flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Plus size={20} className="text-cursor-accent" />
              <span>New Project</span>
            </h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-cursor-text-secondary uppercase tracking-wider mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vacation Photos"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-cursor-bg border border-cursor-border rounded focus:border-cursor-accent outline-none text-sm text-white"
                  required
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-yellow-500/80 leading-normal">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full py-2 px-4 bg-cursor-accent hover:bg-blue-600 text-white rounded text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <FolderPlus size={16} />
                <span>Create & Open</span>
              </button>
            </form>
          </div>

          {/* Projects List */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 pl-1">
              <Folder size={20} className="text-cursor-accent" />
              <span>Recent Projects</span>
            </h2>

            {projects.length === 0 ? (
              <div className="bg-cursor-sidebar/20 border border-dashed border-cursor-border rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
                <Folder size={40} className="text-cursor-text-secondary opacity-40" />
                <p className="text-sm text-cursor-text-secondary">No projects found. Create one to get started!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
                {projects.map((project) => {
                  const hasUpload = !!project.uploadRoot;
                  const isEditing = editingProjectId === project.id;
                  const progress =
                    project.totalImages > 0
                      ? (project.labeledImages / project.totalImages) * 100
                      : 0;

                  return (
                    <div
                      key={project.id}
                      className="group bg-cursor-sidebar/30 hover:bg-cursor-sidebar/60 border border-cursor-border rounded-lg p-4 transition duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 bg-cursor-bg border border-cursor-accent rounded text-sm text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRename(project.id)}
                              className="p-1 text-green-500 hover:bg-cursor-hover rounded"
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="p-1 text-red-400 hover:bg-cursor-hover rounded"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <h3 className="font-medium text-white truncate text-base flex items-center gap-2">
                            <span
                              className="hover:text-cursor-accent cursor-pointer truncate"
                              onClick={() => onSelectProject(project.id)}
                            >
                              {project.name}
                            </span>
                            <button
                              onClick={() => handleStartRename(project)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-cursor-text-secondary hover:text-white rounded transition"
                              title="Rename"
                            >
                              <Edit3 size={14} />
                            </button>
                          </h3>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cursor-text-secondary">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>Modified {formatDate(project.lastModified)}</span>
                          </span>
                          {hasUpload ? (
                            <span className="truncate max-w-[200px]" title={project.uploadRoot}>
                              Folder: <span className="font-mono text-white/70">{project.uploadRoot}</span>
                            </span>
                          ) : (
                            <span className="text-yellow-500/70">No folder selected</span>
                          )}
                        </div>

                        {/* Progress */}
                        {project.totalImages > 0 && (
                          <div className="flex items-center gap-3 mt-1 max-w-xs">
                            <div className="flex-1 h-1.5 bg-cursor-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cursor-accent transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-cursor-text-secondary min-w-[50px]">
                              {project.labeledImages}/{project.totalImages} ({progress.toFixed(0)}%)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => onSelectProject(project.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cursor-accent/10 hover:bg-cursor-accent text-cursor-accent hover:text-white rounded text-xs font-semibold transition"
                        >
                          <Play size={12} />
                          <span>Open</span>
                        </button>

                        <button
                          onClick={() => setDeletingProjectId(project.id)}
                          className="p-1.5 text-cursor-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded transition"
                          title="Delete Project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Styled deletion confirmation dialog */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cursor-sidebar border border-cursor-border rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Project</h3>
            <p className="text-sm text-cursor-text-secondary mb-6 leading-relaxed">
              Are you sure you want to delete project{' '}
              <strong className="text-white">
                "{projects.find((p) => p.id === deletingProjectId)?.name}"
              </strong>
              ? This will remove all image labeling and assignments from IndexedDB. This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="px-4 py-2 bg-transparent hover:bg-cursor-hover border border-cursor-border rounded text-sm text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProject(deletingProjectId);
                  setDeletingProjectId(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
