import { create } from "zustand";
import { loadPreferences, savePreferences, type Preferences } from "../lib/persistence";

export const useAppPreferences = create<Preferences>()(() => loadPreferences());

export function setAppPreferences(preferences: Preferences) {
  useAppPreferences.setState(preferences);
}

const unsubscribe = useAppPreferences.subscribe((preferences) => savePreferences(preferences));

import.meta.hot?.dispose(unsubscribe);
