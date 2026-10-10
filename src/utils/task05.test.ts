/**
 * TASK-05 Automated Verification Suite
 * Validates Nigerian Garment Templates, Local Measurement Vocabulary,
 * Fractional Value Parsing, Disambiguation, and Western Regression.
 */

import { DEFAULT_TEMPLATES, getPartsForGarment } from './templates';
import { parseMeasurements, normalizeFractions, getPartSynonyms } from './parser';
import { DEFAULT_PART_LABELS } from '../hooks/useLabels';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING TASK-05 COMPREHENSIVE VERIFICATION SUITE');
console.log('======================================================\n');

// ─── TEST 01: Agbada Template ───
console.log('--- TEST 01: Agbada Template ---');
const agbadaTemplate = DEFAULT_TEMPLATES.find(t => t.name === 'Agbada');
assert(!!agbadaTemplate, 'Agbada template exists in DEFAULT_TEMPLATES');
assert(agbadaTemplate?.parts.includes('wingspan') ?? false, 'Agbada includes wingspan');
assert(agbadaTemplate?.parts.includes('agbada_length') ?? false, 'Agbada includes agbada_length');
assert(agbadaTemplate?.parts.includes('buba_length') ?? false, 'Agbada includes buba_length');
assert(agbadaTemplate?.parts.includes('round_sleeve') ?? false, 'Agbada includes round_sleeve');
assert(agbadaTemplate?.parts.includes('lap') ?? false, 'Agbada includes lap (thigh)');
assert(agbadaTemplate?.parts.includes('chest') ?? false, 'Agbada includes chest');
assert(agbadaTemplate?.parts.includes('trouser_length') ?? false, 'Agbada includes trouser_length');

// ─── TEST 02: Senator & Kaftan Templates ───
console.log('\n--- TEST 02: Senator & Kaftan Templates ---');
const senatorTemplate = DEFAULT_TEMPLATES.find(t => t.name === 'Senator');
assert(!!senatorTemplate, 'Senator template exists');
assert(senatorTemplate?.parts.includes('round_sleeve') ?? false, 'Senator includes round_sleeve');
assert(senatorTemplate?.parts.includes('lap') ?? false, 'Senator includes lap');
assert(senatorTemplate?.parts.includes('ankle') ?? false, 'Senator includes ankle');
assert(senatorTemplate?.parts.includes('top_length') ?? false, 'Senator includes top_length');
assert(senatorTemplate?.parts.includes('trouser_length') ?? false, 'Senator includes trouser_length');

const kaftanTemplate = DEFAULT_TEMPLATES.find(t => t.name === 'Kaftan');
assert(!!kaftanTemplate, 'Kaftan template exists');
assert(kaftanTemplate?.parts.includes('kaftan_length') ?? false, 'Kaftan includes kaftan_length');
assert(kaftanTemplate?.parts.includes('round_sleeve') ?? false, 'Kaftan includes round_sleeve');
assert(kaftanTemplate?.parts.includes('lap') ?? false, 'Kaftan includes lap');

// ─── TEST 03: Buba & Sokoto Template ───
console.log('\n--- TEST 03: Buba & Sokoto Template ---');
const bubaTemplate = DEFAULT_TEMPLATES.find(t => t.name === 'Buba & Sokoto');
assert(!!bubaTemplate, 'Dedicated Buba & Sokoto template exists');
assert(bubaTemplate?.parts.includes('buba_length') ?? false, 'Buba & Sokoto includes buba_length');
assert(bubaTemplate?.parts.includes('round_sleeve') ?? false, 'Buba & Sokoto includes round_sleeve');
assert(bubaTemplate?.parts.includes('lap') ?? false, 'Buba & Sokoto includes lap');
assert(bubaTemplate?.parts.includes('trouser_length') ?? false, 'Buba & Sokoto includes trouser_length');
assert(bubaTemplate?.parts.includes('ankle') ?? false, 'Buba & Sokoto includes ankle');

// ─── TEST 04: Traditional Cap / Fila Template ───
console.log('\n--- TEST 04: Traditional Cap / Fila Template ---');
const capTemplate = DEFAULT_TEMPLATES.find(t => t.name === 'Traditional Cap / Fila');
assert(!!capTemplate, 'Traditional Cap / Fila template exists');
assert(capTemplate?.parts.includes('cap_size') ?? false, 'Cap includes cap_size');
assert(capTemplate?.parts.includes('head_circumference') ?? false, 'Cap includes head_circumference');
assert(capTemplate?.parts.includes('cap_height') ?? false, 'Cap includes cap_height');
assert(!capTemplate?.parts.includes('chest') && !capTemplate?.parts.includes('trouser_length'), 'Cap has NO unrelated torso or trouser fields');

// ─── TEST 05 & 06: Local Vocabulary & Fractional Values ───
console.log('\n--- TEST 05 & 06: Local Vocabulary & Fractional Parsing ---');
// Fractional conversion
assert(normalizeFractions('Cap size 22 and a half') === 'Cap size 22.5', '"22 and a half" normalizes to "22.5"');
assert(normalizeFractions('Chest 42 and a quarter') === 'Chest 42.25', '"42 and a quarter" normalizes to "42.25"');
assert(normalizeFractions('Lap 28 and three quarters') === 'Lap 28.75', '"28 and three quarters" normalizes to "28.75"');
assert(normalizeFractions('Head circumference 22 1/2') === 'Head circumference 22.5', '"22 1/2" normalizes to "22.5"');

// Spoken Example A: "Agbada length 54, wingspan 62, chest 42"
const parsedA = parseMeasurements('Agbada length 54, wingspan 62, chest 42.');
assert(parsedA.measurements['agbada_length'] === 54, 'Example A: agbada_length is 54', `got ${parsedA.measurements['agbada_length']}`);
assert(parsedA.measurements['wingspan'] === 62, 'Example A: wingspan is 62', `got ${parsedA.measurements['wingspan']}`);
assert(parsedA.measurements['chest'] === 42, 'Example A: chest is 42', `got ${parsedA.measurements['chest']}`);

// Spoken Example B: "Lap 28, round sleeve 16, trouser length 42"
const parsedB = parseMeasurements('Lap 28, round sleeve 16, trouser length 42.');
assert(parsedB.measurements['lap'] === 28, 'Example B: lap is 28', `got ${parsedB.measurements['lap']}`);
assert(parsedB.measurements['round_sleeve'] === 16, 'Example B: round_sleeve is 16', `got ${parsedB.measurements['round_sleeve']}`);
assert(parsedB.measurements['trouser_length'] === 42, 'Example B: trouser_length is 42', `got ${parsedB.measurements['trouser_length']}`);

// Spoken Example C: "Cap size 22 and a half"
const parsedC = parseMeasurements('Cap size 22 and a half.');
assert(parsedC.measurements['cap_size'] === 22.5, 'Example C: cap_size is 22.5', `got ${parsedC.measurements['cap_size']}`);

// Spoken Example E: "Chest 42 and a half, waist 36, sleeve 25"
const parsedE = parseMeasurements('Chest 42 and a half, waist 36, sleeve 25.');
assert(parsedE.measurements['chest'] === 42.5, 'Example E: chest is 42.5', `got ${parsedE.measurements['chest']}`);
assert(parsedE.measurements['waist'] === 36, 'Example E: waist is 36', `got ${parsedE.measurements['waist']}`);
assert(parsedE.measurements['sleeve'] === 25, 'Example E: sleeve is 25', `got ${parsedE.measurements['sleeve']}`);

// ─── TEST 07: Separate Garment Lengths (Buba vs Agbada) ───
console.log('\n--- TEST 07: Separate Buba Length vs Agbada Length ---');
// Spoken Example D: "Buba length 34, Agbada length 56"
const parsedD = parseMeasurements('Buba length 34, Agbada length 56.');
assert(parsedD.measurements['buba_length'] === 34, 'Example D: buba_length is 34', `got ${parsedD.measurements['buba_length']}`);
assert(parsedD.measurements['agbada_length'] === 56, 'Example D: agbada_length is 56', `got ${parsedD.measurements['agbada_length']}`);
assert(parsedD.measurements['buba_length'] !== parsedD.measurements['agbada_length'], 'buba_length and agbada_length are distinct');

// ─── TEST 08: Ambiguous Vocabulary Protection ───
console.log('\n--- TEST 08: Ambiguous Vocabulary Protection ---');
const parsedAmbiguous = parseMeasurements('Hand 25, waist 32.');
assert(parsedAmbiguous.measurements['sleeve'] === undefined, 'Spoken "hand 25" is NOT silently assigned to sleeve');
assert(parsedAmbiguous.measurements['wrist'] === undefined, 'Spoken "hand 25" is NOT silently assigned to wrist');
assert(parsedAmbiguous.measurements['waist'] === 32, 'Unambiguous "waist 32" in same phrase is still captured');
assert((parsedAmbiguous.ambiguous?.length ?? 0) > 0, 'Ambiguous term "hand" is flagged for user confirmation');
assert(parsedAmbiguous.ambiguous?.[0]?.term === 'hand', 'Flagged ambiguous term is "hand"');

// ─── TEST 09: Display Labels for Local Nigerian Vocabulary ───
console.log('\n--- TEST 09: Display Labels for Local Vocabulary ---');
assert(DEFAULT_PART_LABELS['agbada_length'] === 'Agbada Length', 'agbada_length has user-friendly label');
assert(DEFAULT_PART_LABELS['buba_length'] === 'Buba Length', 'buba_length has user-friendly label');
assert(DEFAULT_PART_LABELS['wingspan'] === 'Agbada Wingspan / Span', 'wingspan has user-friendly label');
assert(DEFAULT_PART_LABELS['round_sleeve'] === 'Round Sleeve', 'round_sleeve has user-friendly label');
assert(DEFAULT_PART_LABELS['lap'] === 'Lap / Thigh', 'lap has user-friendly label');
assert(DEFAULT_PART_LABELS['cap_size'] === 'Cap / Fila Size', 'cap_size has user-friendly label');

// ─── TEST 10: Cross-Garment Synonym Fallbacks ───
console.log('\n--- TEST 10: Cross-Garment Synonym Fallbacks ---');
const lapSynonyms = getPartSynonyms('lap');
assert(lapSynonyms.includes('thigh'), '"lap" synonyms include "thigh"');
const thighSynonyms = getPartSynonyms('thigh');
assert(thighSynonyms.includes('lap'), '"thigh" synonyms include "lap"');
const roundSleeveSynonyms = getPartSynonyms('round_sleeve');
assert(roundSleeveSynonyms.includes('bicep'), '"round_sleeve" synonyms include "bicep"');
const capSizeSynonyms = getPartSynonyms('cap_size');
assert(capSizeSynonyms.includes('head_circumference'), '"cap_size" synonyms include "head_circumference"');

// ─── TEST 14: Western Garment Regression ───
console.log('\n--- TEST 14: Western Garment Regression ---');
const shirtParts = getPartsForGarment('Shirt');
assert(shirtParts.includes('neck') && shirtParts.includes('chest') && shirtParts.includes('sleeve'), 'Shirt parts intact');
const trouserParts = getPartsForGarment('Trouser');
assert(trouserParts.includes('waist') && trouserParts.includes('thigh') && trouserParts.includes('trouser_length'), 'Trouser parts intact');
const suitParts = getPartsForGarment('Suit / Blazer');
assert(suitParts.includes('chest') && suitParts.includes('bicep') && suitParts.includes('sleeve'), 'Suit parts intact');
const gownParts = getPartsForGarment('Gown');
assert(gownParts.includes('gown_length') && gownParts.includes('bust_point'), 'Gown parts intact');

// Western measurement speech parsing
const westernSpeech = parseMeasurements('Waist 32, chest 40, shoulder 18.');
assert(westernSpeech.measurements['waist'] === 32, 'Western speech: waist is 32');
assert(westernSpeech.measurements['chest'] === 40, 'Western speech: chest is 40');
assert(westernSpeech.measurements['shoulder'] === 18, 'Western speech: shoulder is 18');

// Legacy template alias fallback
const legacyAgbadaParts = getPartsForGarment('Agbada / Buba');
assert(legacyAgbadaParts.includes('wingspan') && legacyAgbadaParts.includes('agbada_length'), 'Legacy "Agbada / Buba" alias resolves to expanded Agbada parts');

console.log('\n======================================================');
console.log(`📊 FINAL TEST REPORT: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
