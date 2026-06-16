import React, { useState, useEffect, useCallback, useRef } from "react";
import { ImageViewerProps } from "../types";
import { X, ChevronLeft, ChevronRight, Tag, Check, Save } from "lucide-react";

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  labels,
  onLabelImage,
  onCreateLabel,
}) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCreateLabelDialog, setShowCreateLabelDialog] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [animateFlash, setAnimateFlash] = useState(false);
  const prevLabelsLengthRef = useRef<number>(image.labels?.length || 0);


  const predefinedColors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#6b7280",
    "#f59e0b",
  ];

  useEffect(() => {
    if (image.url) {
      setImageUrl(image.url);
      setIsLoading(false);
    } else {
      const url = URL.createObjectURL(image.file);
      setImageUrl(url);
      setIsLoading(false);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [image]);

  useEffect(() => {
    // Reset zoom and pan when image changes
    setZoom(1);
    setPan({ x: 0, y: 0 });
    // Update labels length ref to prevent false flash on navigation
    prevLabelsLengthRef.current = image.labels?.length || 0;
  }, [image]);

  useEffect(() => {
    // Trigger rating flash animation when label is assigned
    const currentLength = image.labels?.length || 0;
    if (currentLength > prevLabelsLengthRef.current) {
      setAnimateFlash(true);
      const timer = setTimeout(() => setAnimateFlash(false), 350);
      prevLabelsLengthRef.current = currentLength;
      return () => clearTimeout(timer);
    }
    prevLabelsLengthRef.current = currentLength;
  }, [image.labels]);

  const handleLabelClick = useCallback(
    (labelId: string) => {
      onLabelImage(labelId);
      if (hasNext) onNext();
    },
    [onLabelImage, hasNext, onNext]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious) {
            onPrevious();
          }
          break;
        case "ArrowRight":
          if (hasNext) {
            onNext();
          }
          break;
        case "+":
        case "=":
          e.preventDefault();
          setZoom((prev) => Math.min(prev * 1.2, 5));
          break;
        case "-":
          e.preventDefault();
          setZoom((prev) => Math.max(prev / 1.2, 0.1));
          break;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+0 or Cmd+0 for reset
            setZoom(1);
            setPan({ x: 0, y: 0 });
          } else {
            // Just '0' for label shortcut
            const keyNum = parseInt(e.key);
            if (!isNaN(keyNum) && keyNum >= 0 && keyNum < labels.length) {
              onLabelImage(labels[keyNum].id);
            }
          }
          break;
        default:
          // Check for label shortcuts (1-9)
          const keyNum = parseInt(e.key);
          if (
            !isNaN(keyNum) &&
            keyNum >= 1 &&
            keyNum <= 9 &&
            keyNum <= labels.length
          ) {
            handleLabelClick(labels[keyNum - 1].id);
          }
          break;
      }
    },
    [
      isOpen,
      onClose,
      hasPrevious,
      hasNext,
      onPrevious,
      onNext,
      labels,
      onLabelImage,
      handleLabelClick,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);


  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      onCreateLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName("");
      setNewLabelColor("#3b82f6");
      setShowCreateLabelDialog(false);
    }
  };

  const handleCancelCreateLabel = () => {
    setNewLabelName("");
    setNewLabelColor("#3b82f6");
    setShowCreateLabelDialog(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex">
      {/* Main Image Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
          <button
            className="p-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white"
            onClick={onClose}
          >
            <X size={24} />
          </button>

          <div className="text-white">
            <div className="font-medium">{image.name}</div>
            <div
              className="text-sm text-gray-300 truncate max-w-md"
              title={image.relativePath}
            >
              {image.relativePath}
            </div>
            <div className="text-sm text-gray-400">
              {(image.size / 1024 / 1024).toFixed(1)} MB •{" "}
              {new Date(image.lastModified).toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPrevious && (
              <button
                className="p-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white"
                onClick={onPrevious}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {hasNext && (
              <button
                className="p-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white"
                onClick={onNext}
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {isLoading ? (
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div>Loading image...</div>
            </div>
          ) : (
            <div className={`relative w-full h-full max-h-[calc(100vh-180px)] flex items-center justify-center rounded-lg border-2 transition-all duration-300 ${
              animateFlash
                ? "border-indigo-500 animate-rating-flash"
                : "border-transparent"
            }`}>
              <img
                src={imageUrl}
                alt={image.name}
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                  transition: zoom === 1 ? "transform 0.3s ease" : "none",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
                draggable={false}
              />
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-center gap-2 p-4 bg-black bg-opacity-50">
          <button
            className="flex items-center gap-1 px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-sm text-white"
            onClick={() => setZoom((prev) => Math.min(prev * 1.2, 5))}
            title="Zoom In"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span>Zoom In</span>
          </button>
          <span className="text-white text-sm px-2 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="flex items-center gap-1 px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-sm text-white"
            onClick={() => setZoom((prev) => Math.max(prev / 1.2, 0.1))}
            title="Zoom Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13H5v-2h14v2z" />
            </svg>
            <span>Zoom Out</span>
          </button>
          <button
            className="px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-sm text-white ml-2"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Aside View - Labels */}
      <div className="w-80 bg-cursor-sidebar border-l border-cursor-border flex flex-col">
        <div className="p-4 border-b border-cursor-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Assign Label</h3>
              <p className="text-cursor-text-secondary text-sm mt-1">
                Click a label to assign it to this image
              </p>
            </div>
            <button
              className="px-3 py-1 bg-cursor-accent hover:bg-blue-600 rounded-sm text-white text-sm"
              onClick={() => setShowCreateLabelDialog(true)}
              title="Create New Label"
            >
              + New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {labels.map((label, index) => {
              const isAlreadyLabeled =
                image.labels?.includes(label.name) || false;
              return (
                <button
                  key={label.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isAlreadyLabeled
                      ? "bg-blue-900 bg-opacity-30 border-blue-700 hover:bg-blue-800"
                      : "bg-cursor-bg hover:bg-cursor-hover border-cursor-border"
                  }`}
                  onClick={() => handleLabelClick(label.id)}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-white"
                    style={{ backgroundColor: label.color }}
                  />
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium">{label.name}</div>
                    <div className="text-cursor-text-secondary text-sm">
                      {label.count} images
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAlreadyLabeled && (
                      <Check size={16} className="text-blue-400" />
                    )}
                    <div className="text-cursor-text-secondary text-sm">
                      {index + 1}
                    </div>
                  </div>
                </button>
              );
            })}

            {labels.length === 0 && (
              <div className="text-center text-cursor-text-secondary py-8">
                <Tag size={48} className="mx-auto mb-4 opacity-50" />
                <p>No labels created yet</p>
                <p className="text-sm">
                  Create labels to start categorizing images
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Current Labels Status */}
        {image.labels && image.labels.length > 0 && (
          <div className="p-4 border-t border-cursor-border">
            <div className="space-y-2">
              <div className="text-blue-400 text-sm font-medium">
                Currently labeled as:
              </div>
              <div className="flex flex-wrap gap-2">
                {image.labels.map((labelName) => {
                  const label = labels.find((l) => l.name === labelName);
                  return (
                    <div
                      key={labelName}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-900 bg-opacity-50 rounded-full border border-blue-700"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label?.color || "#6b7280" }}
                      />
                      <span className="text-white text-sm">{labelName}</span>
                      <Check size={12} className="text-blue-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 border-t border-cursor-border">
          <div className="text-cursor-text-secondary text-xs space-y-1">
            <div>• Click labels or use keyboard shortcuts (1-9) to assign</div>
            <div>• Arrow keys (←→) to navigate</div>
            <div>• +/- to zoom, Ctrl+0 to reset</div>
            <div>• ESC to close viewer</div>
          </div>
        </div>
      </div>

      {/* Create Label Dialog */}
      {showCreateLabelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center">
          <div className="bg-cursor-sidebar border border-cursor-border rounded-lg w-full max-w-md mx-4">
            <div className="p-4 border-b border-cursor-border">
              <h3 className="text-lg font-semibold text-white">
                Create New Label
              </h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-cursor-text-secondary mb-2">
                  Label Name
                </label>
                <input
                  type="text"
                  placeholder="Enter label name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full px-3 py-2 bg-cursor-bg border border-cursor-border rounded-sm text-white placeholder-cursor-text-secondary focus:outline-hidden focus:border-cursor-accent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-cursor-text-secondary mb-2">
                  Choose Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 ${
                        newLabelColor === color
                          ? "border-white"
                          : "border-cursor-border"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewLabelColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-cursor-border flex gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-cursor-accent hover:bg-blue-600 rounded-sm text-white"
                onClick={handleCreateLabel}
              >
                <Save size={16} />
                Create Label
              </button>
              <button
                className="px-4 py-2 border border-cursor-border hover:bg-cursor-hover rounded-sm text-white"
                onClick={handleCancelCreateLabel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
