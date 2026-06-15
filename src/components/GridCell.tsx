import React, { memo, CSSProperties } from 'react';
import { ImageFile, Label } from '../types';
import { ImageThumbnail } from './ImageThumbnail';

const GRID_GAP = 16;

export interface GridCellProps {
  images: ImageFile[];
  columnCount: number;
  categories: Label[];
  onImageSelect: (image: ImageFile) => void;
  onImageLabel: (image: ImageFile, labelId: string) => void;
}

export interface GridCellRenderProps extends GridCellProps {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  ariaAttributes: {
    'aria-colindex': number;
    role: 'gridcell';
  };
}

export const GridCell = memo(function GridCell({
  columnIndex,
  rowIndex,
  style,
  images,
  columnCount,
  categories,
  onImageSelect,
  onImageLabel,
}: GridCellRenderProps) {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= images.length) {
    return <div style={style} />;
  }

  const image = images[index];

  return (
    <div style={{ ...style, padding: GRID_GAP / 2 }}>
      <ImageThumbnail
        image={image}
        categories={categories}
        onSelect={() => onImageSelect(image)}
        onLabel={(categoryId) => onImageLabel(image, categoryId)}
      />
    </div>
  );
});
