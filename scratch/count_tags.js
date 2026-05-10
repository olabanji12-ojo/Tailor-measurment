import fs from 'fs';

const content = fs.readFileSync('c:/Users/emman/OneDrive/Desktop/Tailor/Tailor-Measurement/src/components/SetupJobScreen.tsx', 'utf-8');

let openDivs = 0;
let closedDivs = 0;

const divRegex = /<div|<\/div/g;
let match;
while ((match = divRegex.exec(content)) !== null) {
  if (match[0] === '<div') openDivs++;
  else closedDivs++;
}

console.log(`Open Divs: ${openDivs}`);
console.log(`Closed Divs: ${closedDivs}`);

let openSections = 0;
let closedSections = 0;
const sectionRegex = /<section|<\/section/g;
while ((match = sectionRegex.exec(content)) !== null) {
  if (match[0] === '<section') openSections++;
  else closedSections++;
}
console.log(`Open Sections: ${openSections}`);
console.log(`Closed Sections: ${closedSections}`);
