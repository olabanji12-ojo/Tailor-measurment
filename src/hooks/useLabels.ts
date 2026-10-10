import { useState, useCallback } from 'react';
import { MEASUREMENT_PARTS } from '../utils/parser';

const LABELS_KEY = 'tailor_custom_labels';
const PARTS_KEY = 'tailor_custom_parts';

export const DEFAULT_PART_LABELS: Record<string, string> = {
  // Nigerian & African Bespoke Fields
  agbada_length: 'Agbada Length',
  buba_length: 'Buba Length',
  wingspan: 'Agbada Wingspan / Span',
  round_sleeve: 'Round Sleeve',
  lap: 'Lap / Thigh',
  trouser_length: 'Trouser Length',
  top_length: 'Top Length',
  kaftan_length: 'Kaftan Length',
  cap_size: 'Cap / Fila Size',
  head_circumference: 'Head Circumference',
  cap_height: 'Cap Height',

  // Classic Anatomical Fields
  neck: 'Neck',
  shoulder: 'Shoulder',
  chest: 'Chest',
  waist: 'Waist',
  hip: 'Hip',
  thigh: 'Thigh',
  knee: 'Knee',
  ankle: 'Ankle',
  calf: 'Calf',
  sleeve: 'Sleeve Length',
  arm: 'Arm Length',
  wrist: 'Wrist',
  inseam: 'Inseam',
  length: 'Full Length',
  bicep: 'Bicep',
  underbust: 'Underbust',
  bust: 'Bust',
  back: 'Back',
  stomach: 'Stomach',
  bust_point: 'Bust Point',
  dart_length: 'Dart Length',
  back_length: 'Back Length',
  gown_length: 'Gown Length',
  skirt_length: 'Skirt Length',
  shorts_length: 'Shorts Length'
};

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

  // Get display label for any part (custom > default label > pretty title-cased key)
  const getLabel = useCallback((part: string): string => {
    if (customLabels[part]) return customLabels[part];
    if (DEFAULT_PART_LABELS[part]) return DEFAULT_PART_LABELS[part];
    return part
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
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

  // Match a spoken word to any part (standard or custom), by name, label or default label
  const findPartByLabel = useCallback((word: string): string | null => {
    const lower = word.toLowerCase().trim();
    // 1. Custom labels
    for (const [part, label] of Object.entries(customLabels)) {
      if (label.toLowerCase() === lower) return part;
    }
    // 2. Default labels
    for (const [part, label] of Object.entries(DEFAULT_PART_LABELS)) {
      if (label.toLowerCase() === lower) return part;
    }
    // 3. Exact key match
    if (MEASUREMENT_PARTS.includes(lower)) return lower;
    const lowerUnderscore = lower.replace(/\s+/g, '_');
    if (MEASUREMENT_PARTS.includes(lowerUnderscore)) return lowerUnderscore;
    if (customParts.includes(lower)) return lower;
    if (customParts.includes(lowerUnderscore)) return lowerUnderscore;
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
