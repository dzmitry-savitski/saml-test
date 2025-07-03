import { atom } from 'jotai';
import type { ServiceProvider } from '../types/samlConfig';

// Atom to hold the list of Service Providers
export const spListAtom = atom<ServiceProvider[]>([]); 