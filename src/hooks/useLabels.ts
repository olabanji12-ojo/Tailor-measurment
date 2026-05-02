import { useState, useCallback } from 'react';
import { MEASUREMENT_PARTS } from '../utils/parser';

const LABELS_KEY = 'tailor_custom_labels';
const PARTS_KEY = 'tailor_custom_parts';

const loadLabels = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(LABELS_KEY) || '{}'); }
  catch { return {}; }
};

const loadCustomParts = (): string[] => {
  try { return JSON.parse(localStorage.getItem(PARTS_KEY) || '[]'); }
  catch { return []; }
};

export const useLabels = () => {
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(loadLabels);
  const [customParts, setCustomParts] = useState<string[]>(loadCustomParts);

  // All active parts = standard + custom
  const allParts = [...MEASUREMENT_PARTS, ...customParts];

  // Get display label for any part
  const getLabel = useCallback((part: string): string => {
    return customLabels[part] || part;
  }, [customLabels]);

  // Rename any part (standard or custom)
  const renameLabel = useCallback((part: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    setCustomLabels(prev => {
      const next = { ...prev };
      if (!trimmed || trimmed.toLowerCase() === part.toLowerCase()) {
        delete next[part];
      } else {
        next[part] = trimmed;
      }
      localStorage.setItem(LABELS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Reset a single label to default
  const resetLabel = useCallback((part: string) => {
    setCustomLabels(prev => {
      const next = { ...prev };
      delete next[part];
      localStorage.setItem(LABELS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Reset ALL labels (renames only, keeps custom parts)
  const resetAllLabels = useCallback(() => {
    localStorage.removeItem(LABELS_KEY);
    setCustomLabels({});
  }, []);

  // Add a brand new measurement part
  const addCustomPart = useCallback((partName: string) => {
    const trimmed = partName.trim().toLowerCase();
    if (!trimmed) return;
    // Don't add duplicates
    if (MEASUREMENT_PARTS.includes(trimmed)) return;
    setCustomParts(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      localStorage.setItem(PARTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Remove a custom part entirely
  const removeCustomPart = useCallback((partName: string) => {
    setCustomParts(prev => {
      const next = prev.filter(p => p !== partName);
      localStorage.setItem(PARTS_KEY, JSON.stringify(next));
      return next;
    });
    // Also remove its label if it had one
    setCustomLabels(prev => {
      const next = { ...prev };
      delete next[partName];
      localStorage.setItem(LABELS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Match a spoken word to any part (standard or custom), by name or label
  const findPartByLabel = useCallback((word: string): string | null => {
    const lower = word.toLowerCase();
    for (const [part, label] of Object.entries(customLabels)) {
      if (label.toLowerCase() === lower) return part;
    }
    if (MEASUREMENT_PARTS.includes(lower)) return lower;
    if (customParts.includes(lower)) return lower;
    return null;
  }, [customLabels, customParts]);

  const hasCustomLabel = (part: string) => !!customLabels[part];

  return {
    customLabels, customParts, allParts,
    getLabel, renameLabel, resetLabel, resetAllLabels,
    addCustomPart, removeCustomPart,
    findPartByLabel, hasCustomLabel,
  };
};
