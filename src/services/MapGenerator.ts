
import { PerlinNoise } from "../lib/perlinNoise";
import { TerrainType, ResourceType, TerrainData, TerrainTiles } from "../models/TerrainTypes";
import { GridPosition } from "../lib/gridUtils";

export interface Tile {
  position: GridPosition;
  terrain: TerrainData;
  resource: ResourceType;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[][];
}

export class MapGenerator {
  private terrainNoise: PerlinNoise;
  private resourceNoise: PerlinNoise;
  
  constructor(seed?: number) {
    this.terrainNoise = new PerlinNoise(seed);
    this.resourceNoise = new PerlinNoise(seed ? seed + 100 : undefined);
  }

  public generateMap(width: number, height: number): GameMap {
    const tiles: Tile[][] = [];
    
    // Initialize the tiles array
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        // Generate terrain type based on Perlin noise
        const terrainValue = this.terrainNoise.octaveNoise(x, y, 4, 0.5);
        const terrain = this.getTerrainFromNoiseValue(terrainValue);
        
        // Generate resources based on separate noise function
        const resourceValue = this.resourceNoise.octaveNoise(x, y, 2, 0.3);
        const resource = this.getResourceFromNoiseValue(resourceValue, terrain.type);
        
        tiles[y][x] = {
          position: { x, y },
          terrain,
          resource
        };
      }
    }

    return {
      width,
      height,
      tiles
    };
  }

  private getTerrainFromNoiseValue(value: number): TerrainData {
    if (value < 0.3) {
      return TerrainTiles[TerrainType.WATER];
    } else if (value < 0.6) {
      return TerrainTiles[TerrainType.PLAINS];
    } else if (value < 0.8) {
      return TerrainTiles[TerrainType.FOREST];
    } else {
      return TerrainTiles[TerrainType.MOUNTAIN];
    }
  }

  private getResourceFromNoiseValue(value: number, terrainType: TerrainType): ResourceType {
    // Resources should be rare, and different terrains have different resources
    if (value > 0.85) {
      if (terrainType === TerrainType.MOUNTAIN) {
        return ResourceType.MINERALS;
      } else if (terrainType === TerrainType.PLAINS || terrainType === TerrainType.FOREST) {
        return ResourceType.FUEL;
      }
    }
    return ResourceType.NONE;
  }
}
