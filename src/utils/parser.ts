/**
 * Professional Tailor Voice Engine (Scalable & Command-Aware)
 */

export const MEASUREMENT_PARTS = [
  'waist', 'chest', 'shoulder', 'length', 'sleeve', 'arm', 'wrist', 
  'hip', 'thigh', 'inseam', 'neck', 'bust', 'back', 'stomach', 'ankle', 'knee'
];

export interface VoiceCommand {
  type: 'finish' | 'clear' | 'next' | 'add';
  target?: string;
  value?: number;
}

export interface ParsedResult {
  measurements: Record<string, number>;
  commands: VoiceCommand[];
  rawText: string;
}

/**
 * Advanced Parser: Detects both measurements and structural commands
 */
export const parseMeasurements = (text: string): ParsedResult => {
  const lowerText = text.toLowerCase().trim();
  const result: ParsedResult = {
    measurements: {},
    commands: [],
    rawText: text
  };

  // 1. COMMAND DETECTION
  
  // FINISH / SAVE
  if (/\b(finish|save|done|complete|finalize|end session)\b/.test(lowerText)) {
    result.commands.push({ type: 'finish' });
  }

  // NEXT / FORWARD
  if (/\b(next|forward|continue|skip)\b/.test(lowerText)) {
    result.commands.push({ type: 'next' });
  }

  // CLEAR / RESET / DELETE
  if (/\b(clear|reset|delete|wipe|erase|remove)\b/.test(lowerText)) {
    const clearRegex = /\b(clear|reset|delete|wipe|erase|remove)\s+([a-z\s]+)\b/;
    const match = lowerText.match(clearRegex);
    if (match) {
      result.commands.push({ type: 'clear', target: match[2].trim() });
    } else {
      result.commands.push({ type: 'clear' });
    }
  }

  // ADD (Dynamic Part Addition)
  // Pattern: "Add [Part Name] [Value]"
  const addRegex = /\badd\s+([a-z\s]+?)\s+(\d+(?:\.\d+)?)\b/g;
  let addMatch;
  while ((addMatch = addRegex.exec(lowerText)) !== null) {
    result.commands.push({ 
      type: 'add', 
      target: addMatch[1].trim(), 
      value: parseFloat(addMatch[2]) 
    });
  }

  // 2. STRICT MEASUREMENT EXTRACTION
  // We only capture a measurement if it is PAIRED with a label
  MEASUREMENT_PARTS.forEach(part => {
    // Look for: [Part Name] [optional words] [Number]
    // Example: "waist is 32", "waist 32.5"
    const regex = new RegExp(`\\b${part}\\b(?:\\s+(?:is|was|at|of))?\\s+(\\d+(?:\\.\\d+)?)\\b`, 'g');
    let m;
    while ((m = regex.exec(lowerText)) !== null) {
      result.measurements[part] = parseFloat(m[1]);
    }
  });

  return result;
};
