import { useEffect, useSyncExternalStore } from 'react';
import { ImageFile } from '../types';
import { thumbnailCache } from '../services/thumbnailCache';

export function useThumbnail(image: ImageFile): string {
  const url = useSyncExternalStore(
    (onStoreChange) => thumbnailCache.subscribe(image.id, onStoreChange),
    () => thumbnailCache.get(image.id) ?? '',
    () => ''
  );

  useEffect(() => {
    if (!thumbnailCache.get(image.id)) {
      thumbnailCache.request(image, 1);
    }
  }, [image]);

  return url;
}
