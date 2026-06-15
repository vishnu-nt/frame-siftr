import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FolderOutput, FileArchive, FileJson } from 'lucide-react';
import { ExportMode } from '../types';

interface ExportDropdownProps {
  onExport: (mode: ExportMode) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  isExporting?: boolean;
  canExportFiles?: boolean;
  className?: string;
  menuPlacement?: 'above' | 'below';
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExport,
  variant = 'primary',
  disabled = false,
  isExporting = false,
  canExportFiles = true,
  className = '',
  menuPlacement = 'above',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const baseButtonClass =
    variant === 'primary'
      ? 'bg-cursor-accent hover:bg-blue-600 text-white'
      : 'border border-cursor-border hover:bg-cursor-hover text-cursor-text';

  const fileExportDisabled = disabled || isExporting || !canExportFiles;
  const jsonDisabled = disabled || isExporting;

  const fileExportTitle = !canExportFiles
    ? 'Upload images and label them to export files'
    : isExporting
      ? 'Export in progress'
      : undefined;

  const handleSelect = (mode: ExportMode) => {
    setIsOpen(false);
    onExport(mode);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${variant === 'primary' ? 'w-full' : ''} ${baseButtonClass} ${
          disabled || isExporting ? 'opacity-60 cursor-not-allowed' : ''
        }`}
        onClick={() => !disabled && !isExporting && setIsOpen((prev) => !prev)}
        disabled={disabled || isExporting}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Download size={16} />
        <span>{isExporting ? 'Exporting…' : 'Export'}</span>
        <ChevronDown size={14} className="ml-auto" />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 bg-cursor-sidebar border border-cursor-border rounded shadow-lg z-50 py-1 min-w-[200px] ${
            menuPlacement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-cursor-hover disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => !fileExportDisabled && handleSelect('folder')}
            disabled={fileExportDisabled}
            title={fileExportTitle}
          >
            <FolderOutput size={16} />
            <span>Export as folder</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-cursor-hover disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => !fileExportDisabled && handleSelect('zip')}
            disabled={fileExportDisabled}
            title={fileExportTitle}
          >
            <FileArchive size={16} />
            <span>Export as ZIP</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-cursor-hover disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => !jsonDisabled && handleSelect('json')}
            disabled={jsonDisabled}
          >
            <FileJson size={16} />
            <span>Export JSON</span>
          </button>
        </div>
      )}
    </div>
  );
};
