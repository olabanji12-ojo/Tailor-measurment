import { MEASUREMENT_PARTS } from './parser';

export type Gender = 'male' | 'female';

export interface GarmentTemplate {
  name: string;
  parts: string[];
  recommendedFor: Gender[]; // Helps us suggest templates based on selected gender
}

export const DEFAULT_TEMPLATES: GarmentTemplate[] = [
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
  // ---- Nigerian Garment Templates ----
  {
    name: 'Agbada / Buba',
    parts: ['neck', 'shoulder', 'chest', 'waist', 'bicep', 'sleeve', 'top_length', 'trouser_length'],
    recommendedFor: ['male']
  },
  {
    name: 'Senator',
    parts: ['neck', 'shoulder', 'chest', 'waist', 'top_length', 'trouser_length', 'thigh', 'knee', 'ankle'],
    recommendedFor: ['male']
  },
  {
    name: 'Kaftan',
    parts: ['neck', 'shoulder', 'chest', 'sleeve', 'kaftan_length'],
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

// Helper function to get the parts for a specific garment
export const getPartsForGarment = (garmentName: string): string[] => {
  const template = DEFAULT_TEMPLATES.find(t => t.name === garmentName);
  return template ? template.parts : [...MEASUREMENT_PARTS];
};
