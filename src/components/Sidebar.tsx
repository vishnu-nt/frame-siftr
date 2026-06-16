import React, { useState, useMemo } from "react";
import {
  FolderOpen,
  Folder,
  Tag,
  Upload,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { SidebarProps } from "../types";
import { ExportDropdown } from "./ExportDropdown";
import {
  buildFolderTree,
  FolderTreeNode,
  countUniqueLabeledImages,
} from "../utils/paths";
import { FolderTreeItem } from "./FolderTreeItem";

export const Sidebar: React.FC<SidebarProps> = ({
  labels,
  images,
  imageLabels,
  uploadRoot,
  onLabelSelect,
  selectedLabel,
  selectedFolder,
  onFolderSelect,
  onExport,
  onImportData,
  isExporting,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["labels", "folders"]),
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [showImportDialog, setShowImportDialog] = useState(false);

  const folderTree = useMemo(
    () => buildFolderTree(images.map((i) => i.relativePath)),
    [images],
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleFolder = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setExpandedFolders(next);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          onImportData(data);
          setShowImportDialog(false);
        } catch {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    }
  };

  const getLabelFileCount = (labelId: string) => {
    const label = labels.find((l) => l.id === labelId);
    if (!label) return 0;
    return imageLabels.filter((il) => il.label === label.name).length;
  };

  const labeledImageCount = countUniqueLabeledImages(imageLabels);

  return (
    <div className="w-64 bg-cursor-sidebar border-r border-cursor-border flex flex-col">
      <div className="p-4 border-b border-cursor-border">
        <h1 className="text-lg font-semibold text-white">Frame Siftr</h1>
        {uploadRoot && (
          <p
            className="text-xs text-cursor-text-secondary mt-1 truncate"
            title={uploadRoot}
          >
            Folder: {uploadRoot}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <button
            className="w-full flex items-center justify-between p-2 hover:bg-cursor-hover rounded-sm text-left"
            onClick={() => toggleSection("labels")}
          >
            <div className="flex items-center gap-2">
              {expandedSections.has("labels") ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <Tag size={16} />
              <span>Labels</span>
            </div>
            <span className="text-cursor-text-secondary text-sm">
              {labels.length}
            </span>
          </button>

          {expandedSections.has("labels") && (
            <div className="ml-6 mt-1 space-y-1">
              <button
                className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-cursor-hover ${
                  selectedLabel === null ? "bg-cursor-active" : ""
                }`}
                onClick={() => onLabelSelect(null)}
              >
                <Folder size={16} />
                <span>All Images</span>
                <span className="ml-auto text-cursor-text-secondary text-sm">
                  {images.length}
                </span>
              </button>

              {labels.map((label) => (
                <button
                  key={label.id}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-cursor-hover ${
                    selectedLabel === label.id ? "bg-cursor-active" : ""
                  }`}
                  onClick={() => onLabelSelect(label.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span>{label.name}</span>
                  <span className="ml-auto text-cursor-text-secondary text-sm">
                    {getLabelFileCount(label.id)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            className="w-full flex items-center justify-between p-2 hover:bg-cursor-hover rounded-sm text-left mt-4"
            onClick={() => toggleSection("folders")}
          >
            <div className="flex items-center gap-2">
              {expandedSections.has("folders") ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <FolderOpen size={16} />
              <span>Folders</span>
            </div>
            <span className="text-cursor-text-secondary text-sm">
              {folderTree.length}
            </span>
          </button>

          {expandedSections.has("folders") && (
            <div className="ml-2 mt-1">
              <button
                className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-cursor-hover text-sm ${
                  selectedFolder === null ? "bg-cursor-active" : ""
                }`}
                onClick={() => onFolderSelect(null)}
              >
                <ImageIcon size={14} />
                <span>All folders</span>
                <span className="ml-auto text-cursor-text-secondary text-xs">
                  {images.length}
                </span>
              </button>

              {folderTree.length === 0 ? (
                <p className="text-xs text-cursor-text-secondary p-2">
                  Upload a folder to see structure
                </p>
              ) : (
                folderTree.map((node) => (
                  <FolderTreeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedFolder={selectedFolder}
                    expandedFolders={expandedFolders}
                    onToggle={toggleFolder}
                    onSelect={onFolderSelect}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-cursor-border space-y-2">
        <div className="text-xs text-cursor-text-secondary mb-1">
          {labeledImageCount} labeled
        </div>
        <ExportDropdown
          onExport={onExport}
          variant="primary"
          isExporting={isExporting}
          canExportFiles={labeledImageCount > 0 && images.length > 0}
          className="w-full"
        />

        <button
          className="w-full flex items-center gap-2 p-2 border border-cursor-border hover:bg-cursor-hover rounded-sm"
          onClick={() => setShowImportDialog(true)}
        >
          <Upload size={16} />
          <span>Import Data</span>
        </button>

        {showImportDialog && (
          <div className="absolute bottom-20 left-4 right-4 bg-cursor-sidebar border border-cursor-border rounded-sm p-4">
            <h3 className="text-sm font-medium mb-2">Import Project Data</h3>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-sm"
            />
            <button
              className="mt-2 text-xs text-cursor-text-secondary hover:text-cursor-text"
              onClick={() => setShowImportDialog(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
