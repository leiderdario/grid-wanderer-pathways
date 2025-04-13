
// Scriptable object equivalent for terrain types
export enum TerrainType {
  WATER = "water",
  PLAINS = "plains",
  FOREST = "forest",
  MOUNTAIN = "mountain",
}

export enum ResourceType {
  NONE = "none",
  MINERALS = "minerals",
  FUEL = "fuel",
}

export interface TerrainData {
  type: TerrainType;
  movementCost: number;
  isWalkable: boolean;
  isFlyable: boolean;
  resourceType: ResourceType;
  color: string;
  displayName: string;
}

// Our terrain data definitions
export const TerrainTiles: Record<TerrainType, TerrainData> = {
  [TerrainType.WATER]: {
    type: TerrainType.WATER,
    movementCost: 99, // Impassable for ground units
    isWalkable: false,
    isFlyable: true,
    resourceType: ResourceType.NONE,
    color: "#4287f5",
    displayName: "Water",
  },
  [TerrainType.PLAINS]: {
    type: TerrainType.PLAINS,
    movementCost: 1,
    isWalkable: true,
    isFlyable: true,
    resourceType: ResourceType.NONE,
    color: "#7ece73",
    displayName: "Plains",
  },
  [TerrainType.FOREST]: {
    type: TerrainType.FOREST,
    movementCost: 2,
    isWalkable: true,
    isFlyable: true,
    resourceType: ResourceType.NONE,
    color: "#2e5d29",
    displayName: "Forest",
  },
  [TerrainType.MOUNTAIN]: {
    type: TerrainType.MOUNTAIN,
    movementCost: 3,
    isWalkable: true,
    isFlyable: true,
    resourceType: ResourceType.NONE,
    color: "#8a8a8a",
    displayName: "Mountain",
  }
};

// Resource overlays for terrain
export const ResourceOverlays: Record<ResourceType, { color: string; displayName: string }> = {
  [ResourceType.NONE]: {
    color: "transparent",
    displayName: "None",
  },
  [ResourceType.MINERALS]: {
    color: "#f1c232",
    displayName: "Minerals",
  },
  [ResourceType.FUEL]: {
    color: "#cc0000",
    displayName: "Fuel",
  }
};
