import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { spListAtom } from '../state/spAtoms';
import type { ServiceProvider } from '../types/samlConfig';

const LOCAL_STORAGE_KEY = 'saml-sp-list';

export function useSPStore() {
  const [spList, setSpList] = useAtom(spListAtom);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ServiceProvider[] = JSON.parse(stored);
        setSpList(parsed);
      } catch (e) {
        // Ignore parse errors, start fresh
        setSpList([]);
      }
    }
  }, [setSpList]);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(spList));
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