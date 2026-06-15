import React from 'react';
import { Folder, ChevronDown, ChevronRight } from 'lucide-react';
import { FolderTreeNode } from '../utils/paths';

export interface FolderTreeItemProps {
  node: FolderTreeNode;
  depth: number;
  selectedFolder: string | null;
  expandedFolders: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string | null) => void;
}

export const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  node,
  depth,
  selectedFolder,
  expandedFolders,
  onToggle,
  onSelect,
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFolder === node.path;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        className={`w-full flex items-center gap-1 p-1.5 rounded text-left hover:bg-cursor-hover text-sm ${
          isSelected ? 'bg-cursor-active' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) onToggle(node.path);
          onSelect(node.path);
        }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="w-3.5" />
        )}
        <Folder size={14} />
        <span className="truncate flex-1">{node.name}</span>
        <span className="text-cursor-text-secondary text-xs">{node.imageCount}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFolder={selectedFolder}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
