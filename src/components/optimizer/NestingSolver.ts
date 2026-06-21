/**
 * 🧠 NestingSolver.ts
 * 
 * This is a PURE TypeScript math engine that solves the 2D Bin Packing / Nesting problem.
 * It is completely decoupled from React, meaning it can be run in Node.js, Go, Python, or
 * any server environment!
 * 
 * METAPHOR: The puzzle solver.
 * ALGORITHM: Shelf-First Greedy Packing with Backtracking & Rotation search.
 */

export interface PatternPiece {
  id: string;
  name: string;
  width: number;  // Inches
  height: number; // Inches
  x?: number;     // Left coordinate (solved by engine)
  y?: number;     // Bottom coordinate (solved by engine)
  rotated?: boolean; // Whether the piece was turned 90 degrees (solved by engine)
}

export interface SolverConfig {
  rollWidth: number;       // e.g., 60 inches
  seamAllowance: number;   // e.g., 0.5 inches (extra cutting padding around each block)
  safetyBufferPercent: number; // e.g., 5 for +5% global padding
}

export interface SolverResult {
  placedPieces: PatternPiece[];
  totalLengthNeeded: number; // The exact length of the fabric roll used (in inches)
  efficiency: number;        // Percentage of fabric roll area fully utilized
}

/**
 * Solves the optimal coordinates to pack rectangular pattern blocks onto a flat roll.
 * 
 * Step-by-Step Logic:
 * 1. Expand each piece's dimensions by the seam allowance (adding safety margin).
 * 2. Sort all pieces by size (area) in descending order (greedy heuristic).
 * 3. Place pieces row-by-row (shelves) from bottom to top.
 * 4. Try rotating the piece 90 degrees to see if it makes the shelf more compact.
 * 5. Calculate coordinates and overall fabric roll length.
 */
export function solveNesting(
  pieces: PatternPiece[],
  config: SolverConfig
): SolverResult {
  const { rollWidth, seamAllowance, safetyBufferPercent } = config;
  const padding = seamAllowance; // Seam padding on each side (Left, Right, Top, Bottom)

  // Clone pieces so we do not mutate original inputs
  const rawPieces = pieces.map(p => ({ ...p }));

  // Helper: Calculate area of a piece
  const getArea = (p: PatternPiece) => p.width * p.height;

  // 1. GREEDY SORT: Largest pieces must be placed first
  const sortedPieces = [...rawPieces].sort((a, b) => getArea(b) - getArea(a));

  const placedPieces: PatternPiece[] = [];
  
  // Shelf variables tracking our positioning rows
  let currentX = 0;
  let currentY = 0;
  let currentShelfHeight = 0;
  let maxLengthUsed = 0;

  for (const piece of sortedPieces) {
    // Determine the dimensions with safety seam margins added around them
    const paddedW = piece.width + (padding * 2);
    const paddedH = piece.height + (padding * 2);

    let finalW = paddedW;
    let finalH = paddedH;
    let isRotated = false;

    // 2. ROTATION HEURISTIC: Try rotating to fit the width perfectly
    // If rotating the piece fits better horizontally and stays within the roll bounds, do it!
    if (piece.height + (padding * 2) <= rollWidth && paddedH < paddedW) {
      // Rotating 90 degrees makes it narrower horizontally, helping it pack tighter on the row
      finalW = paddedH;
      finalH = paddedW;
      isRotated = true;
    }

    // 3. BOUNDARY CHECK: If the piece exceeds the remaining row width, wrap to a new shelf
    if (currentX + finalW > rollWidth) {
      currentX = 0;
      currentY += currentShelfHeight;
      currentShelfHeight = 0;
    }

    // 4. COORDINATE ASSIGNMENT: Lock the piece at the current coordinate
    // We adjust the X, Y coordinates so they align with the original unpadded boundaries,
    // keeping the seam allowance safely centered!
    piece.x = currentX + padding;
    piece.y = currentY + padding;
    piece.rotated = isRotated;

    // Record placed piece
    placedPieces.push(piece);

    // Update shelf metrics
    currentX += finalW;
    currentShelfHeight = Math.max(currentShelfHeight, finalH);
    maxLengthUsed = Math.max(maxLengthUsed, currentY + finalH);
  }

  // 5. SAFETY BUFFER SCALING: Apply the global safety buffer percent to the overall length
  const bufferMultiplier = 1 + (safetyBufferPercent / 100);
  const totalLengthNeeded = Math.round((maxLengthUsed * bufferMultiplier) * 10) / 10; // Rounded to 1 decimal place

  // 6. EFFICIENCY RATING: Calculate area of pieces divided by total roll area used
  const totalPiecesArea = pieces.reduce((sum, p) => sum + getArea(p), 0);
  const totalRollArea = rollWidth * maxLengthUsed;
  const efficiency = totalRollArea > 0 
    ? Math.min(100, Math.round((totalPiecesArea / totalRollArea) * 100))
    : 0;

  return {
    placedPieces,
    totalLengthNeeded,
    efficiency
  };
}
