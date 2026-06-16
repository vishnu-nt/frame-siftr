import React, { useState } from 'react';
import { LabelManagerProps, Label } from '../types';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';

const predefinedColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#f59e0b'
];

export const CategoryManager: React.FC<LabelManagerProps> = ({
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(predefinedColors[0]);
  const [isOpen, setIsOpen] = useState(true);

  const handleCreate = () => {
    if (newLabelName.trim()) {
      onCreateLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName('');
      setNewLabelColor(predefinedColors[0]);
      setShowCreateForm(false);
    }
  };

  const handleUpdate = () => {
    if (editingLabel && newLabelName.trim()) {
      onUpdateLabel(editingLabel.id, newLabelName.trim(), newLabelColor);
      setEditingLabel(null);
      setNewLabelName('');
      setNewLabelColor(predefinedColors[0]);
    }
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setNewLabelName(label.name);
    setNewLabelColor(label.color);
  };

  const handleCancel = () => {
    setEditingLabel(null);
    setShowCreateForm(false);
    setNewLabelName('');
    setNewLabelColor(predefinedColors[0]);
  };

  const handleDelete = (labelId: string) => {
    if (window.confirm('Are you sure you want to delete this label? This action cannot be undone.')) {
      onDeleteLabel(labelId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-cursor-sidebar border border-cursor-border rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cursor-border">
          <h2 className="text-lg font-semibold text-white">Manage Labels</h2>
          <button
            className="p-1 hover:bg-cursor-hover rounded-sm"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Labels List */}
          <div className="space-y-2">
            <div className="text-sm text-cursor-text-secondary mb-2">
              Existing Labels ({labels.length})
            </div>
            
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center justify-between p-3 bg-cursor-hover rounded-sm border border-cursor-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-white">{label.name}</span>
                  <span className="text-xs text-cursor-text-secondary">
                    ({label.count} images)
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 hover:bg-cursor-active rounded-sm"
                    onClick={() => handleEdit(label)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="p-1 hover:bg-red-600 rounded-sm text-red-400"
                    onClick={() => handleDelete(label.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Create/Edit Form */}
          {(showCreateForm || editingLabel) && (
            <div className="border border-cursor-border rounded-lg p-4 bg-cursor-hover">
              <div className="text-sm text-cursor-text-secondary mb-3">
                {editingLabel ? 'Edit Label' : 'Create New Label'}
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Label name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full px-3 py-2 bg-cursor-bg border border-cursor-border rounded-sm text-white placeholder-cursor-text-secondary focus:outline-hidden focus:border-cursor-accent"
                />
                
                <div>
                  <div className="text-xs text-cursor-text-secondary mb-2">Choose Color:</div>
                  <div className="grid grid-cols-5 gap-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded border-2 ${
                          newLabelColor === color ? 'border-white' : 'border-cursor-border'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewLabelColor(color)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-2 px-3 py-2 bg-cursor-accent hover:bg-blue-600 rounded-sm text-white text-sm"
                    onClick={editingLabel ? handleUpdate : handleCreate}
                  >
                    <Save size={16} />
                    <span>{editingLabel ? 'Update' : 'Create'}</span>
                  </button>
                  
                  <button
                    className="px-3 py-2 border border-cursor-border hover:bg-cursor-hover rounded-sm text-sm"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Button */}
          {!showCreateForm && !editingLabel && (
            <button
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-cursor-border hover:border-cursor-accent hover:bg-cursor-hover rounded-lg transition-colors"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus size={20} />
              <span>Create New Label</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cursor-border">
          <div className="text-xs text-cursor-text-secondary text-center">
            Labels help organize your images. Each image can have one label.
          </div>
        </div>
      </div>
    </div>
  );
};
