
// Utility functions for grid operations
export interface GridPosition {
  x: number;
  y: number;
}

export function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function euclideanDistance(a: GridPosition, b: GridPosition): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function arePositionsEqual(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

export function getNeighbors(position: GridPosition, width: number, height: number): GridPosition[] {
  const neighbors: GridPosition[] = [];
  const directions = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 },  // Right
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }, // Left
  ];

  for (const dir of directions) {
    const newPos = {
      x: position.x + dir.x,
      y: position.y + dir.y,
    };

    // Check if the new position is within the grid boundaries
    if (newPos.x >= 0 && newPos.x < width && newPos.y >= 0 && newPos.y < height) {
      neighbors.push(newPos);
    }
  }

  return neighbors;
}

// Convert a Grid Position to a unique string key
export function posToKey(pos: GridPosition): string {
  return `${pos.x},${pos.y}`;
}
