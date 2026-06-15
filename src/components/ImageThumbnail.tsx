import React, { useState, useEffect, useRef } from 'react';
import { ImageFile, Label } from '../types';
import { Tag, Check, X } from 'lucide-react';
import { getFolderPrefix } from '../utils/paths';
import { useThumbnail } from '../hooks/useThumbnail';

interface ImageThumbnailProps {
  image: ImageFile;
  categories: Label[];
  onSelect: () => void;
  onLabel: (labelId: string) => void;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
  image,
  categories,
  onSelect,
  onLabel,
}) => {
  const imageUrl = useThumbnail(image);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [isLabeled, setIsLabeled] = useState(false);
  const [animateFlash, setAnimateFlash] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevLabelsLengthRef = useRef<number>(image.labels?.length || 0);

  useEffect(() => {
    // Check if image is already labeled
    setIsLabeled(!!(image.labels && image.labels.length > 0));

    // Trigger pulse animation if labels count increased (a label was assigned)
    const currentLength = image.labels?.length || 0;
    if (currentLength > prevLabelsLengthRef.current) {
      setAnimateFlash(true);
      const timer = setTimeout(() => setAnimateFlash(false), 350);
      prevLabelsLengthRef.current = currentLength;
      return () => clearTimeout(timer);
    }
    prevLabelsLengthRef.current = currentLength;
  }, [image.labels]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLabelMenu(false);
      }
    };

    if (showLabelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLabelMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLabelMenu(!showLabelMenu);
  };

  const handleLabelSelect = (labelId: string) => {
    onLabel(labelId);
    setShowLabelMenu(false);
    setIsLabeled(true);
  };

  const getLabelColor = (labelId: string) => {
    const label = categories.find(c => c.id === labelId);
    return label?.color || '#6b7280';
  };

  return (
    <div className="relative group">
      <div
        className={`relative w-full h-full border rounded-lg overflow-hidden cursor-pointer hover:border-cursor-accent transition-colors ${
          animateFlash 
            ? 'border-indigo-500 animate-rating-flash' 
            : 'border-cursor-border'
        }`}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
      >

        {/* Image */}
        <div className="w-full h-40 bg-cursor-sidebar flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={image.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-cursor-text-secondary">Loading...</div>
          )}
        </div>

        {/* Label Indicators */}
        {isLabeled && image.labels && image.labels.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1">
            {image.labels.slice(0, 3).map((labelName, index) => (
              <div
                key={index}
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: getLabelColor(labelName) }}
              />
            ))}
            {image.labels.length > 3 && (
              <div className="w-3 h-3 rounded-full border border-white bg-cursor-text-secondary flex items-center justify-center">
                <span className="text-xs text-white">+</span>
              </div>
            )}
          </div>
        )}

        {/* Label Status */}
        <div className="absolute top-2 right-2">
          {isLabeled ? (
            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          ) : (
            <div className="w-6 h-6 bg-cursor-border rounded-full flex items-center justify-center">
              <Tag size={12} className="text-cursor-text-secondary" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2">
          <div className="text-xs text-white truncate" title={image.relativePath}>
            {image.name}
          </div>
          {getFolderPrefix(image.relativePath) && (
            <div className="text-xs text-gray-400 truncate" title={image.relativePath}>
              {getFolderPrefix(image.relativePath)}
            </div>
          )}
          <div className="text-xs text-gray-300">
            {(image.size / 1024 / 1024).toFixed(1)} MB
          </div>
        </div>
      </div>

      {/* Label Menu */}
      {showLabelMenu && (
        <div ref={menuRef} className="absolute top-full left-0 right-0 bg-cursor-sidebar border border-cursor-border rounded-lg shadow-lg z-50 mt-1">
          <div className="p-2">
            <div className="text-xs text-cursor-text-secondary mb-2">Assign Label:</div>
            {categories.map((label) => {
              const isAlreadyApplied = image.labels?.includes(label.name) || false;
              return (
                <button
                  key={label.id}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left ${
                    isAlreadyApplied
                      ? 'bg-green-900 bg-opacity-30 text-green-400 cursor-not-allowed'
                      : 'hover:bg-cursor-hover'
                  }`}
                  onClick={() => !isAlreadyApplied && handleLabelSelect(label.id)}
                  disabled={isAlreadyApplied}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm">{label.name}</span>
                  {isAlreadyApplied && <Check size={14} className="ml-auto" />}
                </button>
              );
            })}
            
            <button
              className="w-full flex items-center gap-2 p-2 hover:bg-cursor-hover rounded text-left border-t border-cursor-border mt-2 pt-2"
              onClick={() => setShowLabelMenu(false)}
            >
              <X size={16} />
              <span className="text-sm">Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
