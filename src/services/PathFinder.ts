
import { GridPosition, posToKey, getNeighbors, manhattanDistance } from "../lib/gridUtils";
import { GameMap } from "./MapGenerator";
import { MovementType } from "../models/UnitTypes";

export interface PathNode {
  position: GridPosition;
  gCost: number; // Cost from start node
  hCost: number; // Heuristic (estimated) cost to end node
  fCost: number; // gCost + hCost
  parent: PathNode | null;
}

export interface Path {
  path: GridPosition[];
  cost: number;
}

export class PathFinder {
  private map: GameMap;

  constructor(map: GameMap) {
    this.map = map;
  }

  // A* pathfinding algorithm implementation
  public findPath(
    startPos: GridPosition, 
    endPos: GridPosition, 
    movementType: MovementType,
    maxMovementPoints?: number
  ): Path | null {
    // If positions are equal, return empty path
    if (startPos.x === endPos.x && startPos.y === endPos.y) {
      return { path: [], cost: 0 };
    }

    // Create start node
    const startNode: PathNode = {
      position: startPos,
      gCost: 0,
      hCost: manhattanDistance(startPos, endPos),
      fCost: 0, // Will be calculated later
      parent: null
    };
    startNode.fCost = startNode.gCost + startNode.hCost;

    // Initialize open and closed sets
    const openSet: PathNode[] = [startNode];
    const closedSet: Map<string, PathNode> = new Map();
    
    // While there are nodes to process
    while (openSet.length > 0) {
      // Sort by fCost and get the node with lowest fCost
      openSet.sort((a, b) => a.fCost - b.fCost);
      const currentNode = openSet.shift()!;
      
      // Check if we reached the end
      if (currentNode.position.x === endPos.x && currentNode.position.y === endPos.y) {
        // Reconstruct path
        return this.reconstructPath(currentNode);
      }
      
      // Add current to closed set
      closedSet.set(posToKey(currentNode.position), currentNode);
      
      // Process neighbors
      const neighbors = getNeighbors(currentNode.position, this.map.width, this.map.height);
      for (const neighborPos of neighbors) {
        // Get terrain data
        const neighborTile = this.map.tiles[neighborPos.y][neighborPos.x];
        
        // Skip if not walkable (for ground units) or already in closed set
        if (
          (movementType === MovementType.GROUND && !neighborTile.terrain.isWalkable) ||
          (movementType === MovementType.AIR && !neighborTile.terrain.isFlyable) ||
          closedSet.has(posToKey(neighborPos))
        ) {
          continue;
        }
        
        // Calculate movement cost
        const movementCost = movementType === MovementType.AIR ? 1 : neighborTile.terrain.movementCost;
        const gCost = currentNode.gCost + movementCost;
        
        // If maxMovementPoints is provided, skip if exceeds it
        if (maxMovementPoints !== undefined && gCost > maxMovementPoints) {
          continue;
        }
        
        // Check if node is already in open set
        const existingOpenNode = openSet.find(node => node.position.x === neighborPos.x && node.position.y === neighborPos.y);
        
        if (!existingOpenNode || gCost < existingOpenNode.gCost) {
          // Create new node or update existing
          const hCost = manhattanDistance(neighborPos, endPos);
          const neighborNode: PathNode = {
            position: neighborPos,
            gCost: gCost,
            hCost: hCost,
            fCost: gCost + hCost,
            parent: currentNode
          };
          
          if (!existingOpenNode) {
            openSet.push(neighborNode);
          } else {
            // Update existing node
            existingOpenNode.gCost = gCost;
            existingOpenNode.fCost = gCost + existingOpenNode.hCost;
            existingOpenNode.parent = currentNode;
          }
        }
      }
    }
    
    // No path found
    return null;
  }
  
  // Find all positions that can be reached with a given amount of movement points
  public findMovementRange(
    position: GridPosition,
    movementType: MovementType,
    movementPoints: number
  ): Map<string, number> {
    // Map of position keys to their movement cost
    const reachableTiles: Map<string, number> = new Map();
    reachableTiles.set(posToKey(position), 0);
    
    // Queue of positions to process
    const queue: { pos: GridPosition; remainingPoints: number }[] = [
      { pos: position, remainingPoints: movementPoints }
    ];
    
    while (queue.length > 0) {
      const { pos, remainingPoints } = queue.shift()!;
      
      // Get neighbors
      const neighbors = getNeighbors(pos, this.map.width, this.map.height);
      
      for (const neighborPos of neighbors) {
        // Get terrain data
        const neighborTile = this.map.tiles[neighborPos.y][neighborPos.x];
        
        // Skip if not traversable for this movement type
        if (
          (movementType === MovementType.GROUND && !neighborTile.terrain.isWalkable) ||
          (movementType === MovementType.AIR && !neighborTile.terrain.isFlyable)
        ) {
          continue;
        }
        
        // Calculate movement cost
        const movementCost = movementType === MovementType.AIR ? 1 : neighborTile.terrain.movementCost;
        const costToEnter = reachableTiles.get(posToKey(pos))! + movementCost;
        const neighborKey = posToKey(neighborPos);
        
        // If we can move to this tile with less cost than previously calculated
        // or if this is the first time we're seeing this tile
        if (
          (!reachableTiles.has(neighborKey) || costToEnter < reachableTiles.get(neighborKey)!) &&
          costToEnter <= movementPoints
        ) {
          reachableTiles.set(neighborKey, costToEnter);
          
          // Add to queue if we still have movement points left
          const newRemainingPoints = movementPoints - costToEnter;
          if (newRemainingPoints > 0) {
            queue.push({
              pos: neighborPos,
              remainingPoints: newRemainingPoints
            });
          }
        }
      }
    }
    
    return reachableTiles;
  }
  
  // Reconstruct path from end node back to start
  private reconstructPath(endNode: PathNode): Path {
    const path: GridPosition[] = [];
    let currentNode: PathNode | null = endNode;
    
    while (currentNode !== null) {
      path.unshift(currentNode.position);
      currentNode = currentNode.parent;
    }
    
    return {
      path,
      cost: endNode.gCost
    };
  }
}
