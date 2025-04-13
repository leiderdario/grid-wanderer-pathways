
import { GridPosition, manhattanDistance, posToKey } from "../lib/gridUtils";
import { UnitData, Faction, MovementType } from "../models/UnitTypes";
import { PathFinder } from "./PathFinder";
import { GameMap } from "./MapGenerator";

export interface SupplyBase {
  id: string;
  position: GridPosition;
  faction: Faction;
  name: string;
  fuelProduction: number;
  ammunitionProduction: number;
  supplyRange: number;
  capturable: boolean;
}

export interface SupplyRoute {
  start: SupplyBase;
  end: GridPosition;
  path: GridPosition[];
  cost: number;
  type: 'fuel' | 'ammo' | 'both';
}

export interface ResourceConsumption {
  fuelConsumed: number;
  ammunitionConsumed: number;
}

export class SupplySystem {
  private bases: SupplyBase[] = [];
  private supplyRoutes: SupplyRoute[] = [];
  private map: GameMap;
  private pathFinder: PathFinder;
  
  constructor(map: GameMap) {
    this.map = map;
    this.pathFinder = new PathFinder(map);
    
    // Initialize with some default supply bases
    this.addBase({
      id: 'player-hq',
      position: { x: 2, y: 2 },
      faction: Faction.PLAYER,
      name: 'Player HQ',
      fuelProduction: 20,
      ammunitionProduction: 15,
      supplyRange: 8,
      capturable: false
    });
    
    this.addBase({
      id: 'enemy-hq',
      position: { x: map.width - 3, y: map.height - 3 },
      faction: Faction.ENEMY,
      name: 'Enemy HQ',
      fuelProduction: 20,
      ammunitionProduction: 15,
      supplyRange: 8,
      capturable: false
    });
    
    // Add some capturable outposts
    this.addBase({
      id: 'outpost-1',
      position: { x: Math.floor(map.width / 2), y: Math.floor(map.height / 2) },
      faction: Faction.NEUTRAL,
      name: 'Central Outpost',
      fuelProduction: 15,
      ammunitionProduction: 10,
      supplyRange: 6,
      capturable: true
    });
    
    this.addBase({
      id: 'outpost-2',
      position: { x: Math.floor(map.width / 3), y: Math.floor(map.height / 3 * 2) },
      faction: Faction.NEUTRAL,
      name: 'West Outpost',
      fuelProduction: 10,
      ammunitionProduction: 5,
      supplyRange: 5,
      capturable: true
    });
    
    this.addBase({
      id: 'outpost-3',
      position: { x: Math.floor(map.width / 3 * 2), y: Math.floor(map.height / 3) },
      faction: Faction.NEUTRAL,
      name: 'East Outpost',
      fuelProduction: 5,
      ammunitionProduction: 10,
      supplyRange: 5,
      capturable: true
    });
  }
  
  // Add a base
  public addBase(base: SupplyBase): void {
    this.bases.push(base);
  }
  
  // Get all bases
  public getBases(): SupplyBase[] {
    return [...this.bases];
  }
  
  // Get bases by faction
  public getBasesByFaction(faction: Faction): SupplyBase[] {
    return this.bases.filter(base => base.faction === faction);
  }
  
  // Capture a base (change ownership)
  public captureBase(baseId: string, newFaction: Faction): boolean {
    const baseIndex = this.bases.findIndex(base => base.id === baseId);
    if (baseIndex === -1 || !this.bases[baseIndex].capturable) return false;
    
    this.bases[baseIndex] = {
      ...this.bases[baseIndex],
      faction: newFaction
    };
    
    return true;
  }
  
  // Calculate if a unit is in supply range and what supplies it can receive
  public calculateUnitSupply(unit: UnitData, unitPosition: GridPosition): {
    inSupplyRange: boolean;
    nearestBase?: SupplyBase;
    supplyDistance?: number;
    canReceiveFuel: boolean;
    canReceiveAmmo: boolean;
  } {
    // Get bases of the same faction
    const factionalBases = this.getBasesByFaction(unit.faction);
    
    let nearestBase: SupplyBase | undefined;
    let minDistance = Infinity;
    
    for (const base of factionalBases) {
      const distance = manhattanDistance(unitPosition, base.position);
      
      if (distance <= base.supplyRange && distance < minDistance) {
        nearestBase = base;
        minDistance = distance;
      }
    }
    
    return {
      inSupplyRange: nearestBase !== undefined,
      nearestBase,
      supplyDistance: nearestBase ? minDistance : undefined,
      canReceiveFuel: nearestBase !== undefined && nearestBase.fuelProduction > 0,
      canReceiveAmmo: nearestBase !== undefined && nearestBase.ammunitionProduction > 0,
    };
  }
  
  // Calculate supply consumption for movement
  public calculateMovementConsumption(
    unit: UnitData, 
    path: GridPosition[]
  ): ResourceConsumption {
    // Each tile moved consumes fuel based on unit type
    const tilesCount = Math.max(0, path.length - 1); // Don't count starting position
    const fuelConsumed = tilesCount * unit.fuelConsumptionRate;
    
    return {
      fuelConsumed,
      ammunitionConsumed: 0 // Movement doesn't consume ammo
    };
  }
  
  // Calculate supply consumption for combat
  public calculateCombatConsumption(unit: UnitData): ResourceConsumption {
    return {
      fuelConsumed: 0, // Combat doesn't consume fuel
      ammunitionConsumed: unit.ammunitionConsumptionRate
    };
  }
  
  // Check if a unit can move along a path
  public canUnitMove(unit: UnitData, path: GridPosition[]): {
    canMove: boolean;
    reason?: string;
  } {
    const consumption = this.calculateMovementConsumption(unit, path);
    
    if (unit.fuelCurrent < consumption.fuelConsumed) {
      return {
        canMove: false,
        reason: "Not enough fuel"
      };
    }
    
    return { canMove: true };
  }
  
  // Check if a unit can attack
  public canUnitAttack(unit: UnitData): {
    canAttack: boolean;
    reason?: string;
  } {
    const consumption = this.calculateCombatConsumption(unit);
    
    if (unit.ammunitionCurrent < consumption.ammunitionConsumed) {
      return {
        canAttack: false,
        reason: "Not enough ammunition"
      };
    }
    
    return { canAttack: true };
  }
  
  // Calculate supply routes between bases and units
  public calculateSupplyRoutes(faction: Faction): SupplyRoute[] {
    const factionalBases = this.getBasesByFaction(faction);
    const routes: SupplyRoute[] = [];
    
    // For now just generate simple routes between bases
    for (let i = 0; i < factionalBases.length; i++) {
      for (let j = i + 1; j < factionalBases.length; j++) {
        const start = factionalBases[i];
        const end = factionalBases[j].position;
        
        const pathResult = this.pathFinder.findPath(
          start.position,
          end,
          MovementType.GROUND, // Fixed: Use MovementType.GROUND enum instead of string
          undefined  // No movement point limit for routes
        );
        
        if (pathResult) {
          routes.push({
            start,
            end,
            path: pathResult.path,
            cost: pathResult.cost,
            type: 'both'
          });
        }
      }
    }
    
    this.supplyRoutes = routes;
    return routes;
  }
  
  // Resupply a unit at a base
  public resupplyUnit(unit: UnitData, position: GridPosition): {
    fuelAdded: number;
    ammoAdded: number;
    resupplied: boolean;
  } {
    const supplyInfo = this.calculateUnitSupply(unit, position);
    
    if (!supplyInfo.inSupplyRange || !supplyInfo.nearestBase) {
      return {
        fuelAdded: 0,
        ammoAdded: 0,
        resupplied: false
      };
    }
    
    const base = supplyInfo.nearestBase;
    
    // Calculate how much of each resource to add
    const fuelNeeded = unit.fuelMax - unit.fuelCurrent;
    const ammoNeeded = unit.ammunitionMax - unit.ammunitionCurrent;
    
    const fuelAdded = Math.min(fuelNeeded, base.fuelProduction);
    const ammoAdded = Math.min(ammoNeeded, base.ammunitionProduction);
    
    // Update the unit's resources
    unit.fuelCurrent += fuelAdded;
    unit.ammunitionCurrent += ammoAdded;
    
    return {
      fuelAdded,
      ammoAdded,
      resupplied: fuelAdded > 0 || ammoAdded > 0
    };
  }
  
  // Get existing supply routes
  public getSupplyRoutes(): SupplyRoute[] {
    return [...this.supplyRoutes];
  }
  
  // Get a base by position
  public getBaseAtPosition(position: GridPosition): SupplyBase | undefined {
    return this.bases.find(base => 
      base.position.x === position.x && base.position.y === position.y
    );
  }
}
