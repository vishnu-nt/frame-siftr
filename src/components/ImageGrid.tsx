import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  CSSProperties,
} from "react";
import { Grid } from "react-window";
import { ImageFile, Label } from "../types";
import { ImageThumbnail } from "./ImageThumbnail";
import { thumbnailCache } from "../services/thumbnailCache";

const MIN_CELL_WIDTH = 200;
const CELL_HEIGHT = 228;
const GRID_GAP = 16;
const GRID_PADDING = 16;

import { GridCell, GridCellProps } from "./GridCell";

export interface ImageGridProps {
  images: ImageFile[];
  totalImages: number;
  selectedCategory: string | null;
  selectedFolder: string | null;
  onImageSelect: (image: ImageFile) => void;
  onImageLabel: (image: ImageFile, labelId: string) => void;
  categories: Label[];
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  totalImages,
  selectedCategory,
  selectedFolder,
  onImageSelect,
  onImageLabel,
  categories,
}) => {
  const [columnCount, setColumnCount] = useState(1);
  const [columnWidth, setColumnWidth] = useState(MIN_CELL_WIDTH);

  const handleGridResize = useCallback(
    (size: { width: number; height: number }) => {
      const innerWidth = Math.max(0, size.width);
      const cols = Math.max(1, Math.floor(innerWidth / MIN_CELL_WIDTH));
      const colWidth = Math.max(1, Math.floor(innerWidth / cols));
      setColumnCount(cols);
      setColumnWidth(colWidth);
    },
    []
  );

  const rowCount = useMemo(
    () => (images.length === 0 ? 0 : Math.ceil(images.length / columnCount)),
    [images.length, columnCount],
  );

  const cellProps = useMemo<GridCellProps>(
    () => ({
      images,
      columnCount,
      categories,
      onImageSelect,
      onImageLabel,
    }),
    [images, columnCount, categories, onImageSelect, onImageLabel],
  );

  const handleCellsRendered = useCallback(
    (
      visible: {
        columnStartIndex: number;
        columnStopIndex: number;
        rowStartIndex: number;
        rowStopIndex: number;
      },
      overscan: {
        columnStartIndex: number;
        columnStopIndex: number;
        rowStartIndex: number;
        rowStopIndex: number;
      },
    ) => {
      thumbnailCache.requestVisibleRange(
        images,
        columnCount,
        visible.rowStartIndex,
        visible.rowStopIndex,
        visible.columnStartIndex,
        visible.columnStopIndex,
        10,
      );
      thumbnailCache.requestVisibleRange(
        images,
        columnCount,
        overscan.rowStartIndex,
        overscan.rowStopIndex,
        overscan.columnStartIndex,
        overscan.columnStopIndex,
        5,
      );
    },
    [images, columnCount],
  );

  if (totalImages === 0) {
    return (
      <div
        id="image-grid-container"
        className="flex-1 flex items-center justify-center"
      >
        <div className="text-center">
          <div className="text-6xl text-cursor-text-secondary mb-4">📁</div>
          <h3 className="text-xl text-cursor-text-secondary mb-2">
            No Images Found
          </h3>
          <p className="text-cursor-text-secondary">
            Upload a folder of images to get started
          </p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div
        id="image-grid-container"
        className="flex-1 flex items-center justify-center"
      >
        <div className="text-center">
          <h3 className="text-xl text-cursor-text-secondary mb-2">
            No matching images
          </h3>
          <p className="text-cursor-text-secondary">
            {selectedCategory || selectedFolder
              ? "Try a different label or folder filter"
              : "No images match the current filters"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="image-grid-container"
      className="flex flex-1 flex-col min-h-0 w-full h-full"
      style={{ padding: GRID_PADDING }}
    >
      <Grid
        cellComponent={GridCell as any}
        cellProps={cellProps}
        columnCount={columnCount}
        columnWidth={columnWidth}
        rowCount={rowCount}
        rowHeight={CELL_HEIGHT}
        overscanCount={2}
        onCellsRendered={handleCellsRendered}
        onResize={handleGridResize}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};
