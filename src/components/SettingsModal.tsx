import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ExportPreferences, ExportPathLayout } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ExportPreferences;
  onSave: (preferences: ExportPreferences) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSave,
}) => {
  const [localPrefs, setLocalPrefs] = useState<ExportPreferences>(preferences);

  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences);
    }
  }, [isOpen, preferences]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localPrefs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="bg-cursor-sidebar border border-cursor-border rounded-lg w-full max-w-md mx-4 shadow-xl"
        role="dialog"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-cursor-border">
          <h2 id="settings-title" className="text-lg font-semibold text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-cursor-hover rounded-sm"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-cursor-text">Export preferences</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localPrefs.includeEmptyLabels}
              onChange={(e) =>
                setLocalPrefs((prev) => ({ ...prev, includeEmptyLabels: e.target.checked }))
              }
              className="rounded-sm border-cursor-border"
            />
            <span className="text-sm text-cursor-text">
              Include empty label folders (labels with no images)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localPrefs.includeUnlabeled}
              onChange={(e) =>
                setLocalPrefs((prev) => ({ ...prev, includeUnlabeled: e.target.checked }))
              }
              className="rounded-sm border-cursor-border"
            />
            <span className="text-sm text-cursor-text">
              Include unlabeled images in an &quot;Unlabeled&quot; folder
            </span>
          </label>

          <div>
            <label htmlFor="path-layout" className="block text-sm text-cursor-text mb-1">
              Path layout inside label folders
            </label>
            <select
              id="path-layout"
              value={localPrefs.pathLayout}
              onChange={(e) =>
                setLocalPrefs((prev) => ({
                  ...prev,
                  pathLayout: e.target.value as ExportPathLayout,
                }))
              }
              className="w-full bg-cursor-bg border border-cursor-border rounded-sm px-3 py-2 text-sm text-cursor-text"
            >
              <option value="flat">Flat (LabelName/image.jpg)</option>
              <option value="preserve">Preserve subfolders (LabelName/photos/2024/image.jpg)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-cursor-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-cursor-border hover:bg-cursor-hover rounded-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-cursor-accent hover:bg-blue-600 text-white rounded-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
