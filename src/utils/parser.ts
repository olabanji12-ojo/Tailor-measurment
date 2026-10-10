/**
 * Professional Tailor Voice Engine (African & Nigerian Bespoke Aware)
 * Supports local measurement vocabulary, fractions, regional synonyms and ambiguous term protection.
 */

export const MEASUREMENT_PARTS = [
  'waist', 'chest', 'shoulder', 'length', 'sleeve', 'arm', 'wrist', 
  'hip', 'thigh', 'inseam', 'neck', 'bust', 'back', 'stomach', 'ankle', 'knee',
  'bicep', 'calf', 'underbust',
  // Female-specific parts
  'bust_point', 'dart_length', 'back_length',
  // Nigerian & African garment-specific measurements
  'agbada_length', 'buba_length', 'wingspan', 'round_sleeve', 'lap',
  'cap_size', 'head_circumference', 'cap_height',
  // Other garment-specific lengths
  'kaftan_length', 'shorts_length', 'gown_length', 'skirt_length', 'trouser_length', 'top_length'
];

export interface VoiceCommand {
  type: 'finish' | 'clear' | 'next' | 'add';
  target?: string;
  value?: number;
}

export interface AmbiguousMeasurement {
  term: string;
  value: number;
  options: string[];
}

export interface ParsedResult {
  measurements: Record<string, number>;
  commands: VoiceCommand[];
  ambiguous?: AmbiguousMeasurement[];
  rawText: string;
}

export interface TermMapping {
  key: string;
  patterns: string[];
}

/**
 * Ordered vocabulary mapping: specific multi-word phrases appear before generic words.
 * For example: 'agbada_length' before 'length', 'round_sleeve' before 'sleeve'.
 */
export const VOCABULARY_MAP: TermMapping[] = [
  // Specific Nigerian Garment Lengths
  { key: 'agbada_length', patterns: ['agbada length', 'agbada full length', 'agbada'] },
  { key: 'buba_length', patterns: ['buba length', 'buba top length', 'buba top', 'buba'] },
  { key: 'kaftan_length', patterns: ['kaftan length'] },
  { key: 'trouser_length', patterns: ['trouser length', 'trousers length', 'trouser', 'pant length', 'pants length', 'sokoto length'] },
  { key: 'top_length', patterns: ['top length', 'shirt length'] },
  { key: 'gown_length', patterns: ['gown length'] },
  { key: 'skirt_length', patterns: ['skirt length'] },
  { key: 'shorts_length', patterns: ['shorts length'] },
  { key: 'back_length', patterns: ['back length'] },
  { key: 'dart_length', patterns: ['dart length'] },
  
  // Agbada Wingspan / Span
  { key: 'wingspan', patterns: ['agbada wingspan', 'agbada span', 'wingspan', 'wing span', 'agbada width', 'span'] },

  // Sleeves & Arms (multi-word before single word)
  { key: 'round_sleeve', patterns: ['round sleeve', 'round of sleeve', 'round arm', 'arm round', 'sleeve round', 'round bicep', 'arm circumference'] },
  { key: 'sleeve', patterns: ['sleeve length', 'sleeve', 'long sleeve', 'short sleeve'] },
  { key: 'bicep', patterns: ['bicep', 'biceps'] },
  { key: 'wrist', patterns: ['wrist', 'round wrist'] },
  { key: 'arm', patterns: ['arm length', 'arm'] },

  // Lower Body (Lap / Thigh / Ankle)
  { key: 'lap', patterns: ['round lap', 'lap size', 'lap', 'round thigh', 'thigh circumference', 'thigh'] },
  { key: 'knee', patterns: ['knee', 'round knee'] },
  { key: 'calf', patterns: ['calf', 'round calf'] },
  { key: 'ankle', patterns: ['ankle opening', 'leg opening', 'ankle circumference', 'round ankle', 'ankle'] },
  { key: 'inseam', patterns: ['inseam'] },

  // Traditional Caps & Headwear
  { key: 'head_circumference', patterns: ['head circumference', 'circumference of head', 'head round', 'round head', 'head size', 'head'] },
  { key: 'cap_size', patterns: ['cap size', 'fila size', 'hat size', 'cap', 'fila'] },
  { key: 'cap_height', patterns: ['cap height', 'fila height', 'cap depth', 'fila depth'] },

  // Torso / Upper Body
  { key: 'bust_point', patterns: ['bust point'] },
  { key: 'underbust', patterns: ['underbust', 'under bust'] },
  { key: 'bust', patterns: ['bust', 'round bust'] },
  { key: 'chest', patterns: ['chest', 'round chest', 'chest size'] },
  { key: 'neck', patterns: ['neck circumference', 'neck size', 'round neck', 'neck'] },
  { key: 'shoulder', patterns: ['back shoulder', 'shoulder width', 'shoulder'] },
  { key: 'waist', patterns: ['round waist', 'waist'] },
  { key: 'hip', patterns: ['round hip', 'hips', 'hip'] },
  { key: 'stomach', patterns: ['stomach', 'round stomach', 'belly'] },
  { key: 'back', patterns: ['back width', 'across back', 'back'] },

  // Generic length (matched last so it doesn't shadow specific garment lengths)
  { key: 'length', patterns: ['full length', 'length'] }
];

/**
 * Ambiguous terms that must NOT be silently misclassified.
 */
export const AMBIGUOUS_TERMS: Record<string, { term: string; options: string[] }> = {
  hand: { term: 'hand', options: ['sleeve', 'wrist', 'round_sleeve'] },
  bottom: { term: 'bottom', options: ['ankle', 'hip'] },
  body: { term: 'body', options: ['chest', 'length'] },
};

/**
 * Cross-garment synonym fallbacks
 */
export const SYNONYM_MAP: Record<string, string[]> = {
  lap: ['lap', 'thigh'],
  thigh: ['thigh', 'lap'],
  round_sleeve: ['round_sleeve', 'bicep', 'arm'],
  bicep: ['bicep', 'round_sleeve', 'arm'],
  wingspan: ['wingspan'],
  agbada_length: ['agbada_length'],
  buba_length: ['buba_length'],
  cap_size: ['cap_size', 'head_circumference'],
  head_circumference: ['head_circumference', 'cap_size'],
  top_length: ['top_length', 'length'],
  trouser_length: ['trouser_length', 'length'],
  ankle: ['ankle'],
  sleeve: ['sleeve', 'arm'],
};

export const getPartSynonyms = (part: string): string[] => {
  return SYNONYM_MAP[part.toLowerCase()] || [part.toLowerCase()];
};

/**
 * Converts spoken fractional terms into clean decimal numbers
 * Example: "22 and a half" -> "22.5", "42 and a quarter" -> "42.25"
 */
export const normalizeFractions = (text: string): string => {
  let cleaned = text;

  // Fractions: "22 and a half", "22 and half", "22 half"
  cleaned = cleaned.replace(/(\d+)\s*(?:and\s+)?(?:a\s+)?half\b/gi, '$1.5');
  // Fractions: "22 and a quarter", "22 and quarter", "22 quarter"
  cleaned = cleaned.replace(/(\d+)\s*(?:and\s+)?(?:a\s+|one\s+)?quarter\b/gi, '$1.25');
  // Fractions: "22 and three quarters", "22 three quarters", "22 three quarter"
  cleaned = cleaned.replace(/(\d+)\s*(?:and\s+)?three\s*quarters?\b/gi, '$1.75');
  // Fractions: "22 and an eighth", "22 and one eighth"
  cleaned = cleaned.replace(/(\d+)\s*(?:and\s+)?(?:an\s+|one\s+)?eighth\b/gi, '$1.125');
  // Fractions: "22 and three eighths"
  cleaned = cleaned.replace(/(\d+)\s*(?:and\s+)?three\s*eighths?\b/gi, '$1.375');
  // Numeric fraction symbols: "22 1/2", "22 1/4", "22 3/4"
  cleaned = cleaned.replace(/(\d+)\s*1\/2\b/g, '$1.5');
  cleaned = cleaned.replace(/(\d+)\s*1\/4\b/g, '$1.25');
  cleaned = cleaned.replace(/(\d+)\s*3\/4\b/g, '$1.75');
  // Spoken decimal: "22 point 5" -> "22.5"
  cleaned = cleaned.replace(/(\d+)\s*point\s*(\d+)\b/gi, '$1.$2');

  return cleaned;
};

/**
 * Advanced Parser: Detects measurements, structural commands, fractions, and ambiguous terms.
 */
export const parseMeasurements = (text: string): ParsedResult => {
  const normalizedText = normalizeFractions(text);
  const lowerText = normalizedText.toLowerCase().trim();
  const result: ParsedResult = {
    measurements: {},
    commands: [],
    ambiguous: [],
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

  // 2. CHECK FOR AMBIGUOUS MEASUREMENTS
  // Guard against silently misclassifying ambiguous words (e.g. "hand 25", "bottom 18")
  Object.entries(AMBIGUOUS_TERMS).forEach(([termKey, info]) => {
    const ambRegex = new RegExp(`\\b${termKey}\\b(?:\\s+(?:is|was|at|of|around))?\\s+(\\d+(?:\\.\\d+)?)(?:\\s*(?:inches|inch|cm|centimeters|m|meters|in|"))?\\b`, 'gi');
    let ambMatch;
    while ((ambMatch = ambRegex.exec(lowerText)) !== null) {
      result.ambiguous!.push({
        term: info.term,
        value: parseFloat(ambMatch[1]),
        options: info.options
      });
    }
  });

  // 3. SMART MEASUREMENT EXTRACTION
  // Clean punctuation that confuses regex while preserving decimal points
  const cleanText = lowerText.replace(/[:,-]/g, ' ');
  
  // Track matched text intervals to prevent shorter substrings from re-matching
  const matchedRanges: Array<{ start: number; end: number }> = [];

  const isOverlapping = (start: number, end: number) => {
    return matchedRanges.some(r => (start >= r.start && start < r.end) || (end > r.start && end <= r.end));
  };

  for (const mapping of VOCABULARY_MAP) {
    // If canonical key already captured, continue
    if (result.measurements[mapping.key] !== undefined) continue;

    for (const pattern of mapping.patterns) {
      // Escape special characters in pattern
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Look for: [Pattern] [optional filler words] [Number] [optional units]
      const regex = new RegExp(`\\b${escapedPattern}\\b(?:\\s+(?:is|was|at|of|around))?\\s+(\\d+(?:\\.\\d+)?)(?:\\s*(?:inches|inch|cm|centimeters|m|meters|in|"))?\\b`, 'gi');
      
      let m;
      while ((m = regex.exec(cleanText)) !== null) {
        const start = m.index;
        const end = regex.lastIndex;

        if (!isOverlapping(start, end)) {
          result.measurements[mapping.key] = parseFloat(m[1]);
          matchedRanges.push({ start, end });
          break; // Stop checking other patterns for this canonical key
        }
      }

      if (result.measurements[mapping.key] !== undefined) break;
    }
  }

  return result;
};
