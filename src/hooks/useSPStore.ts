import { useAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { spListAtom } from '../state/spAtoms';
import type { ServiceProvider } from '../types/samlConfig';

const LOCAL_STORAGE_KEY = 'saml-sp-list';

export function useSPStore() {
  const [spList, setSpList] = useAtom(spListAtom);
  const hasLoadedStorage = useRef(false);

  // Load from localStorage on mount (only once)
  useEffect(() => {
    if (hasLoadedStorage.current) return;
    
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ServiceProvider[] = JSON.parse(stored);
        
        // Migrate existing SPs to include name field if missing
        const migrated = parsed.map(sp => {
          if (!sp.name) {
            return {
              ...sp,
              name: sp.id // Use ID as name for existing SPs
            };
          }
          return sp;
        });
        
        setSpList(migrated);
      } catch {
        // Ignore parse errors, start fresh
        setSpList([]);
      }
    }
    hasLoadedStorage.current = true;
  }, [setSpList]);

  // Persist to localStorage on change
  useEffect(() => {
    // Only persist if we've already loaded (to avoid overwriting with empty array)
    if (hasLoadedStorage.current) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(spList));
    }
  }, [spList]);

  // CRUD operations
  const addSP = (sp: ServiceProvider) => {
    setSpList((prev) => [...prev, sp]);
  };

  const updateSP = (id: string, updated: Partial<ServiceProvider>) => {
    setSpList((prev) => prev.map(sp => sp.id === id ? { ...sp, ...updated } : sp));
  };

  const deleteSP = (id: string) => {
    setSpList((prev) => prev.filter(sp => sp.id !== id));
  };

  const getSP = (id: string) => {
    return spList.find(sp => sp.id === id);
  };

  return {
    spList,
    addSP,
    updateSP,
    deleteSP,
    getSP,
    setSpList, // Expose for bulk import/export
  };
} 