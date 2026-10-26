import { useEffect, useState } from 'react';
import type { CollectionView } from '../../shared/api';

/** Alle Wissenssammlungen mit Stand – aktualisiert sich beim Einlesen von selbst. */
export function useCollections() {
  const [collections, setCollections] = useState<CollectionView[] | null>(null);

  useEffect(() => {
    void window.api.listCollections().then(setCollections);
    return window.api.onCollectionsChanged(setCollections);
  }, []);

  return collections;
}
