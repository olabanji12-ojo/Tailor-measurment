import { MEASUREMENT_PARTS } from './parser';

export type Gender = 'male' | 'female';

export interface GarmentTemplate {
  name: string;
  parts: string[];
  recommendedFor: Gender[]; // Helps us suggest templates based on selected gender
}

export const DEFAULT_TEMPLATES: GarmentTemplate[] = [
  // ---- Preserved Classic & Western Garments ----
  {
    name: 'Shirt',
    parts: ['neck', 'shoulder', 'chest', 'underbust', 'waist', 'bust_point', 'dart_length', 'bicep', 'wrist', 'sleeve', 'top_length'],
    recommendedFor: ['male', 'female']
  },
  {
    name: 'Trouser',
    parts: ['waist', 'hip', 'thigh', 'knee', 'calf', 'ankle', 'trouser_length'],
    recommendedFor: ['male', 'female']
  },
  {
    name: 'Suit / Blazer',
    parts: ['neck', 'shoulder', 'chest', 'waist', 'hip', 'bicep', 'wrist', 'sleeve', 'top_length'],
    recommendedFor: ['male', 'female']
  },
  {
    name: 'Gown',
    parts: ['shoulder', 'chest', 'bust_point', 'underbust', 'waist', 'hip', 'dart_length', 'back_length', 'gown_length'],
    recommendedFor: ['female']
  },
  {
    name: 'Skirt',
    parts: ['waist', 'hip', 'back_length', 'skirt_length'],
    recommendedFor: ['female']
  },

  // ---- Expanded Nigerian & African Garment Templates ----
  {
    name: 'Agbada',
    parts: [
      'chest',
      'shoulder',
      'wingspan',
      'agbada_length',
      'buba_length',
      'neck',
      'sleeve',
      'round_sleeve',
      'waist',
      'lap',
      'trouser_length'
    ],
    recommendedFor: ['male']
  },
  {
    name: 'Senator',
    parts: [
      'neck',
      'shoulder',
      'chest',
      'sleeve',
      'round_sleeve',
      'top_length',
      'waist',
      'hip',
      'lap',
      'knee',
      'trouser_length',
      'ankle'
    ],
    recommendedFor: ['male']
  },
  {
    name: 'Kaftan',
    parts: [
      'neck',
      'shoulder',
      'chest',
      'sleeve',
      'round_sleeve',
      'kaftan_length',
      'waist',
      'lap',
      'trouser_length'
    ],
    recommendedFor: ['male', 'female']
  },
  {
    name: 'Buba & Sokoto',
    parts: [
      'neck',
      'shoulder',
      'chest',
      'buba_length',
      'sleeve',
      'round_sleeve',
      'waist',
      'lap',
      'trouser_length',
      'ankle'
    ],
    recommendedFor: ['male', 'female']
  },
  {
    name: 'Traditional Cap / Fila',
    parts: [
      'cap_size',
      'head_circumference',
      'cap_height'
    ],
    recommendedFor: ['male', 'female']
  },
  {
    name: 'Ankara Blouse',
    parts: ['shoulder', 'chest', 'underbust', 'waist', 'bust_point', 'dart_length', 'top_length', 'sleeve'],
    recommendedFor: ['female']
  },
  {
    name: 'Shorts / Knickers',
    parts: ['waist', 'hip', 'thigh', 'knee', 'shorts_length'],
    recommendedFor: ['male', 'female']
  },
  {
    name: 'Full Body',
    parts: [...MEASUREMENT_PARTS], // Everything
    recommendedFor: ['male', 'female']
  }
];

// Helper function to get default templates for a specific gender
export const getTemplatesForGender = (gender: Gender): string[] => {
  return DEFAULT_TEMPLATES
    .filter(t => t.recommendedFor.includes(gender))
    .map(t => t.name);
};

// Helper function to get the parts for a specific garment (with alias support for legacy records)
export const getPartsForGarment = (garmentName: string): string[] => {
  const norm = garmentName.trim().toLowerCase();
  
  // Direct match
  const direct = DEFAULT_TEMPLATES.find(t => t.name.toLowerCase() === norm);
  if (direct) return direct.parts;

  // Legacy & synonym aliases
  if (norm === 'agbada / buba' || norm === 'agbada') {
    return DEFAULT_TEMPLATES.find(t => t.name === 'Agbada')?.parts || [];
  }
  if (norm === 'cap' || norm === 'fila' || norm === 'traditional cap') {
    return DEFAULT_TEMPLATES.find(t => t.name === 'Traditional Cap / Fila')?.parts || [];
  }
  if (norm === 'buba' || norm === 'sokoto') {
    return DEFAULT_TEMPLATES.find(t => t.name === 'Buba & Sokoto')?.parts || [];
  }

  return [...MEASUREMENT_PARTS];
};
