/**
 * Professional Tailor Measurement Parser
 * Handles both "Keyword + Value" and standalone "Value" extraction.
 */

export const MEASUREMENT_PARTS = [
  'waist',
  'chest',
  'shoulder',
  'length',
  'sleeve',
  'arm',
  'wrist',
  'hip',
  'thigh',
  'inseam',
  'neck'
];

export interface ParsedResult {
  structured: Record<string, number>;
  standaloneNumbers: number[];
}

export const parseMeasurements = (text: string): ParsedResult => {
  const structured: Record<string, number> = {};
  const lowerText = text.toLowerCase();
  
  // 1. Explicit Keyword Extraction (e.g. "waist 32")
  MEASUREMENT_PARTS.forEach(part => {
    // Look for the part name followed by a number
    const regex = new RegExp(`${part}\\D*(\\d+(?:\\.\\d+)?)`, 'g');
    let match;
    while ((match = regex.exec(lowerText)) !== null) {
      structured[part] = parseFloat(match[1]);
    }
  });

  // 2. Standalone Number Extraction (e.g. just "32")
  // We want to find numbers that are NOT immediately preceded by a keyword
  // This is tricky with regex, so we'll do a simpler approach: 
  // Find all numbers and filter out those already captured by keywords.
  
  const allNumbersRegex = /(\d+(?:\.\d+)?)/g;
  const allNumbers: { val: number; index: number }[] = [];
  let numMatch;
  while ((numMatch = allNumbersRegex.exec(lowerText)) !== null) {
    allNumbers.push({ val: parseFloat(numMatch[1]), index: numMatch.index });
  }

  // Filter out numbers that belong to a keyword match
  const keywordMatchIndices: number[] = [];
  MEASUREMENT_PARTS.forEach(part => {
    const regex = new RegExp(`${part}\\D*(\\d+(?:\\.\\d+)?)`, 'g');
    let m;
    while ((m = regex.exec(lowerText)) !== null) {
      // Find where the number starts in this match
      const numStr = m[1];
      const matchStart = m.index;
      const numStart = lowerText.indexOf(numStr, matchStart);
      keywordMatchIndices.push(numStart);
    }
  });

  const standaloneNumbers = allNumbers
    .filter(n => !keywordMatchIndices.includes(n.index))
    .map(n => n.val);

  return { structured, standaloneNumbers };
};
