import React, { useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ImageGrid } from './ImageGrid';
import { ImageViewer } from './ImageViewer';
import { CategoryManager } from './CategoryManager';
import { SettingsModal } from './SettingsModal';
import { useAppState } from '../hooks/useAppState';
import { FileUploadService } from '../services/fileUpload';
import { ProjectDashboard } from './ProjectDashboard';
import { FolderOpen, AlertTriangle, Upload } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const Layout: React.FC = () => {
  const {
    images,
    labels,
    imageLabels,
    selectedImage,
    selectedLabel,
    selectedFolder,
    isImageViewerOpen,
    isLabelManagerOpen,
    currentProject,
    labeledImageCount,
    handleImageSelect,
    handleLabelSelect,
    handleFolderSelect,
    handleImageLabel,
    handleCreateLabel,
    handleUpdateLabel,
    handleDeleteLabel,
    handleExport,
    handleImportData,
    handleUpdateExportPreferences,
    exportPreferences,
    isExporting,
    isSettingsOpen,
    setIsSettingsOpen,
    handleImagesUploaded,
    handleCloseImageViewer,
    handlePreviousImage,
    handleNextImage,
    filteredImages,
    navigationState,
    setIsLabelManagerOpen,
    // Multi-project exports
    projects,
    handleSelectProject,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
    handleCloseProject,
    mismatchInfo,
    handleResolveMismatch,
  } = useAppState();

  const reuploadInputRef = useRef<HTMLInputElement>(null);

  const handleManageLabels = () => {
    setIsLabelManagerOpen(!isLabelManagerOpen);
  };

  const handleFilesProcessed = async (files: File[]) => {
    try {
      const { images: imageFiles, uploadRoot } = await FileUploadService.processFileList(files);
      await handleImagesUploaded(imageFiles, uploadRoot);
      console.info(`Processed ${imageFiles.length} image files`);
    } catch (error) {
      console.error('Error processing files:', error);
    }
  };

  const handleReuploadClick = () => {
    reuploadInputRef.current?.click();
  };

  if (!currentProject) {
    return (
      <ProjectDashboard
        projects={projects}
        onCreateProject={handleCreateProject}
        onSelectProject={handleSelectProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onImportProject={handleImportData}
      />
    );
  }

  const showReuploadPrompt = currentProject.totalImages > 0 && images.length === 0;

  return (
    <div className="flex h-screen bg-cursor-bg text-cursor-text">
      <Sidebar
        labels={labels}
        images={images}
        imageLabels={imageLabels}
        uploadRoot={currentProject?.uploadRoot}
        onLabelSelect={handleLabelSelect}
        selectedLabel={selectedLabel}
        selectedFolder={selectedFolder}
        onFolderSelect={handleFolderSelect}
        onExport={handleExport}
        onImportData={handleImportData}
        isExporting={isExporting}
      />

      <div className="flex-1 flex flex-col">
        <Navbar
          onManageCategories={handleManageLabels}
          onExport={handleExport}
          onOpenSettings={() => setIsSettingsOpen(true)}
          totalImages={images.length}
          labeledImages={labeledImageCount}
          isExporting={isExporting}
          onFilesProcessed={handleFilesProcessed}
          projectName={currentProject.name}
          projectId={currentProject.id}
          onRenameProject={handleRenameProject}
          onCloseProject={handleCloseProject}
          onLogout={() => supabase.auth.signOut()}
        />


        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {showReuploadPrompt ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-cursor-bg p-8 text-center">
              <div className="bg-cursor-sidebar/40 border border-cursor-border rounded-xl p-8 max-w-lg w-full shadow-2xl flex flex-col items-center gap-6">
                <FolderOpen className="text-cursor-accent animate-pulse" size={48} />
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Source Folder Required</h2>
                  <p className="text-sm text-cursor-text-secondary leading-relaxed">
                    This project requires loading the local folder{' '}
                    <strong className="text-white">"{currentProject.uploadRoot}"</strong> to retrieve
                    your {currentProject.totalImages} images and resume.
                  </p>
                </div>
                <input
                  ref={reuploadInputRef}
                  type="file"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleFilesProcessed(files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                />
                <button
                  onClick={handleReuploadClick}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cursor-accent hover:bg-blue-600 text-white rounded text-sm font-semibold transition"
                >
                  <Upload size={16} />
                  <span>Select Folder "{currentProject.uploadRoot}"</span>
                </button>
              </div>
            </div>
          ) : (
            <ImageGrid
              images={filteredImages}
              totalImages={images.length}
              selectedCategory={selectedLabel}
              selectedFolder={selectedFolder}
              onImageSelect={handleImageSelect}
              onImageLabel={handleImageLabel}
              categories={labels}
            />
          )}
        </div>
      </div>

      {isImageViewerOpen && selectedImage && (
        <ImageViewer
          image={selectedImage}
          isOpen={isImageViewerOpen}
          onClose={handleCloseImageViewer}
          onPrevious={handlePreviousImage}
          onNext={handleNextImage}
          hasPrevious={navigationState.hasPrevious}
          hasNext={navigationState.hasNext}
          labels={labels}
          onLabelImage={(labelId) => handleImageLabel(selectedImage, labelId)}
          onCreateLabel={handleCreateLabel}
        />
      )}

      {isLabelManagerOpen && (
        <CategoryManager
          labels={labels}
          onCreateLabel={handleCreateLabel}
          onUpdateLabel={handleUpdateLabel}
          onDeleteLabel={handleDeleteLabel}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={exportPreferences}
        onSave={handleUpdateExportPreferences}
      />

      {/* Mismatch Warning Modal */}
      {mismatchInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cursor-sidebar border border-cursor-border rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 text-yellow-500 mb-4">
              <AlertTriangle size={24} className="shrink-0" />
              <h3 className="text-lg font-semibold text-white">Folder Name Mismatch</h3>
            </div>
            <p className="text-sm text-cursor-text-secondary mb-6 leading-relaxed">
              The uploaded folder <strong className="text-white">"{mismatchInfo.newUploadRoot}"</strong> does
              not match the expected folder <strong className="text-white">"{currentProject.uploadRoot}"</strong>.
              <br /><br />
              Would you like to update the project folder path and use this new folder? (Labels will only match if relative image paths are identical).
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleResolveMismatch(false)}
                className="px-4 py-2 bg-transparent hover:bg-cursor-hover border border-cursor-border rounded text-sm text-white transition"
              >
                Select Another Folder
              </button>
              <button
                onClick={() => handleResolveMismatch(true)}
                className="px-4 py-2 bg-cursor-accent hover:bg-blue-600 text-white rounded text-sm font-medium transition"
              >
                Use "{mismatchInfo.newUploadRoot}"
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
