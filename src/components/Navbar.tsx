import React, { useRef, useState, useEffect } from 'react';
import { Settings, Tag, Upload, Home, Edit3, Check, X, LogOut } from 'lucide-react';
import { ExportMode } from '../types';
import { ExportDropdown } from './ExportDropdown';

interface NavbarProps {
  onManageCategories: () => void;
  onExport: (mode: ExportMode) => void;
  onOpenSettings: () => void;
  totalImages: number;
  labeledImages: number;
  isExporting?: boolean;
  onFilesProcessed?: (files: File[]) => void;
  projectName: string;
  projectId: string;
  onRenameProject: (projectId: string, newName: string) => void;
  onCloseProject: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onManageCategories,
  onExport,
  onOpenSettings,
  totalImages,
  labeledImages,
  isExporting,
  onFilesProcessed,
  projectName,
  projectId,
  onRenameProject,
  onCloseProject,
  onLogout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(projectName);

  useEffect(() => {
    setEditName(projectName);
  }, [projectName]);

  const handleFolderUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && onFilesProcessed) {
      onFilesProcessed(files);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const progressPercentage = totalImages > 0 ? (labeledImages / totalImages) * 100 : 0;

  return (
    <div className="h-12 bg-cursor-sidebar border-b border-cursor-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 bg-cursor-sidebar hover:bg-cursor-hover border border-cursor-border rounded text-xs text-cursor-text font-medium"
          onClick={onCloseProject}
          title="Back to Projects Dashboard"
        >
          <Home size={14} />
          <span>Dashboard</span>
        </button>

        <div className="h-4 w-px bg-cursor-border mx-1" />

        {isEditingName ? (
          <div className="flex items-center gap-1 mr-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="px-2 py-0.5 bg-cursor-bg border border-cursor-accent rounded text-xs text-white focus:outline-none w-32"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editName.trim()) {
                    onRenameProject(projectId, editName.trim());
                  }
                  setIsEditingName(false);
                } else if (e.key === 'Escape') {
                  setEditName(projectName);
                  setIsEditingName(false);
                }
              }}
            />
            <button
              onClick={() => {
                if (editName.trim()) {
                  onRenameProject(projectId, editName.trim());
                }
                setIsEditingName(false);
              }}
              className="p-0.5 text-green-500 hover:bg-cursor-hover rounded"
              title="Save Name"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setEditName(projectName);
                setIsEditingName(false);
              }}
              className="p-0.5 text-red-400 hover:bg-cursor-hover rounded"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mr-1 group">
            <span
              className="text-xs font-semibold text-white truncate max-w-[120px] cursor-pointer hover:text-cursor-accent"
              onClick={() => setIsEditingName(true)}
              title="Click to rename project"
            >
              {projectName}
            </span>
            <button
              onClick={() => setIsEditingName(true)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-cursor-text-secondary hover:text-white rounded transition"
              title="Rename Project"
            >
              <Edit3 size={12} />
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-cursor-border mx-1" />

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        />

        <button
          className="flex items-center gap-1.5 px-2.5 py-1 bg-cursor-accent hover:bg-blue-600 rounded text-white text-xs font-medium"
          onClick={handleFolderUpload}
        >
          <Upload size={14} />
          <span>Upload Folder</span>
        </button>

        <button
          className="flex items-center gap-1.5 px-2.5 py-1 border border-cursor-border hover:bg-cursor-hover rounded text-xs"
          onClick={onManageCategories}
        >
          <Tag size={14} />
          <span>Categories</span>
        </button>

        <ExportDropdown
          onExport={onExport}
          variant="secondary"
          isExporting={isExporting}
          canExportFiles={labeledImages > 0 && totalImages > 0}
          menuPlacement="below"
          className="w-auto"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-cursor-text-secondary">
            {labeledImages} / {totalImages}
          </span>
          <span className="text-cursor-text-secondary">
            ({progressPercentage.toFixed(1)}%)
          </span>
        </div>

        <div className="w-24 h-1.5 bg-cursor-border rounded-full overflow-hidden">
          <div
            className="h-full bg-cursor-accent transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-[10px] text-cursor-text-secondary mr-1">
          {totalImages > 0 && <>{totalImages - labeledImages} remaining</>}
        </div>

        <button
          className="p-1 hover:bg-cursor-hover rounded text-cursor-text-secondary hover:text-white transition-colors"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>

        {onLogout && (
          <button
            className="p-1 hover:bg-red-500/10 hover:text-red-400 rounded text-cursor-text-secondary transition-colors"
            onClick={onLogout}
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

