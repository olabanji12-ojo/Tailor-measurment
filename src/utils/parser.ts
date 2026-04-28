import type { MeasurementData } from '../types';

export const BODY_PARTS = [
  'waist',
  'chest',
  'bust',
  'shoulder',
  'sleeve',
  'neck',
  'length',
  'hips',
  'thigh',
  'inseam',
  'outseam',
  'cuff',
  'wrist',
  'armhole'
] as const;

export type BodyPart = typeof BODY_PARTS[number];

/**
 * Parses raw text to extract body measurements.
 * Matches patterns like "waist 32", "chest: 40", "length - 45.5"
 */
export const parseMeasurements = (text: string): MeasurementData => {
  const measurements: MeasurementData = {};
  
  // Normalize text: lowercase and remove extra whitespace
  const cleanText = text.toLowerCase().trim();

  BODY_PARTS.forEach((part) => {
    // Regex explanation:
    // (?:^|\s) - start of string or whitespace (prevents matching "long" as "on")
    // ${part} - the keyword
    // \s*[:\-]?\s* - optional colon/dash and whitespace
    // (\d+(?:\.\d+)?) - capture group for number (integer or decimal)
    const regex = new RegExp(`(?:^|\\s)${part}\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)`, 'gi');
    
    let match;
    // Use exec in a loop to find the LAST mention of a part (more likely to be the correction)
    while ((match = regex.exec(cleanText)) !== null) {
      measurements[part] = parseFloat(match[1]);
    }
  });

  return measurements;
};
