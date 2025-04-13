
// Definition of unit types
export enum MovementType {
  GROUND = "ground",
  AIR = "air",
}

export enum UnitClass {
  INFANTRY = "infantry",
  VEHICLE = "vehicle",
  AIRCRAFT = "aircraft",
}

export enum Faction {
  PLAYER = "player",
  ENEMY = "enemy",
  NEUTRAL = "neutral",
}

export interface UnitData {
  id: string;
  name: string;
  unitClass: UnitClass;
  movementType: MovementType;
  movementPoints: number;
  color: string;
  faction: Faction;
  
  // Combat stats
  health: number;
  maxHealth: number;
  attackPower: number;
  attackRange: number;
  defense: number;
  
  // AI properties
  detectionRange: number;
  aggressiveness: number; // 0-1, higher means more likely to attack
  sensorWeight: number; // 0-1, influence of seeing enemies on decisions
  healthWeight: number; // 0-1, influence of own health on decisions
  allyWeight: number; // 0-1, influence of nearby allies on decisions
  
  // Supply system
  fuelCurrent: number;
  fuelMax: number;
  fuelConsumptionRate: number; // per tile movement
  ammunitionCurrent: number;
  ammunitionMax: number;
  ammunitionConsumptionRate: number; // per attack
}

// Our unit definitions
export const UnitTypes: Record<string, UnitData> = {
  "infantry": {
    id: "infantry",
    name: "Infantry",
    unitClass: UnitClass.INFANTRY,
    movementType: MovementType.GROUND,
    movementPoints: 4,
    color: "#e31414",
    faction: Faction.PLAYER,
    health: 100,
    maxHealth: 100,
    attackPower: 30,
    attackRange: 2,
    defense: 10,
    detectionRange: 5,
    aggressiveness: 0.5,
    sensorWeight: 0.7,
    healthWeight: 0.5,
    allyWeight: 0.3,
    fuelCurrent: 50,
    fuelMax: 50,
    fuelConsumptionRate: 1,
    ammunitionCurrent: 30, 
    ammunitionMax: 30,
    ammunitionConsumptionRate: 5
  },
  "helicopter": {
    id: "helicopter",
    name: "Helicopter",
    unitClass: UnitClass.AIRCRAFT,
    movementType: MovementType.AIR,
    movementPoints: 7,
    color: "#1434e3",
    faction: Faction.PLAYER,
    health: 150,
    maxHealth: 150,
    attackPower: 45,
    attackRange: 3,
    defense: 5,
    detectionRange: 7,
    aggressiveness: 0.7,
    sensorWeight: 0.8,
    healthWeight: 0.3,
    allyWeight: 0.2,
    fuelCurrent: 100,
    fuelMax: 100,
    fuelConsumptionRate: 3,
    ammunitionCurrent: 40, 
    ammunitionMax: 40,
    ammunitionConsumptionRate: 8
  },
  "tank": {
    id: "tank",
    name: "Tank",
    unitClass: UnitClass.VEHICLE,
    movementType: MovementType.GROUND,
    movementPoints: 5,
    color: "#14e314",
    faction: Faction.PLAYER,
    health: 200,
    maxHealth: 200,
    attackPower: 60,
    attackRange: 3,
    defense: 30,
    detectionRange: 4,
    aggressiveness: 0.6,
    sensorWeight: 0.6,
    healthWeight: 0.4,
    allyWeight: 0.5,
    fuelCurrent: 150,
    fuelMax: 150,
    fuelConsumptionRate: 2,
    ammunitionCurrent: 20, 
    ammunitionMax: 20,
    ammunitionConsumptionRate: 10
  },
  "enemy-infantry": {
    id: "enemy-infantry",
    name: "Enemy Infantry",
    unitClass: UnitClass.INFANTRY,
    movementType: MovementType.GROUND,
    movementPoints: 4,
    color: "#870000",
    faction: Faction.ENEMY,
    health: 90,
    maxHealth: 90,
    attackPower: 25,
    attackRange: 2,
    defense: 8,
    detectionRange: 4,
    aggressiveness: 0.8,
    sensorWeight: 0.7,
    healthWeight: 0.4,
    allyWeight: 0.6,
    fuelCurrent: 50,
    fuelMax: 50,
    fuelConsumptionRate: 1,
    ammunitionCurrent: 25, 
    ammunitionMax: 25,
    ammunitionConsumptionRate: 5
  },
  "enemy-helicopter": {
    id: "enemy-helicopter",
    name: "Enemy Chopper",
    unitClass: UnitClass.AIRCRAFT,
    movementType: MovementType.AIR,
    movementPoints: 6,
    color: "#000087",
    faction: Faction.ENEMY,
    health: 130,
    maxHealth: 130,
    attackPower: 40,
    attackRange: 3,
    defense: 4,
    detectionRange: 6,
    aggressiveness: 0.9,
    sensorWeight: 0.8,
    healthWeight: 0.2,
    allyWeight: 0.3,
    fuelCurrent: 90,
    fuelMax: 90,
    fuelConsumptionRate: 3,
    ammunitionCurrent: 35, 
    ammunitionMax: 35,
    ammunitionConsumptionRate: 7
  },
  "enemy-tank": {
    id: "enemy-tank",
    name: "Enemy Tank",
    unitClass: UnitClass.VEHICLE,
    movementType: MovementType.GROUND,
    movementPoints: 4,
    color: "#008700",
    faction: Faction.ENEMY,
    health: 180,
    maxHealth: 180,
    attackPower: 55,
    attackRange: 3,
    defense: 25,
    detectionRange: 3,
    aggressiveness: 0.7,
    sensorWeight: 0.5,
    healthWeight: 0.3,
    allyWeight: 0.7,
    fuelCurrent: 120,
    fuelMax: 120,
    fuelConsumptionRate: 2,
    ammunitionCurrent: 15, 
    ammunitionMax: 15,
    ammunitionConsumptionRate: 10
  },
  "neutral-outpost": {
    id: "neutral-outpost",
    name: "Neutral Outpost",
    unitClass: UnitClass.VEHICLE,
    movementType: MovementType.GROUND,
    movementPoints: 0, // Stationary
    color: "#888888",
    faction: Faction.NEUTRAL,
    health: 150,
    maxHealth: 150,
    attackPower: 20,
    attackRange: 2,
    defense: 40,
    detectionRange: 5,
    aggressiveness: 0.3,
    sensorWeight: 0.5,
    healthWeight: 0.5,
    allyWeight: 0.2,
    fuelCurrent: 200,
    fuelMax: 200,
    fuelConsumptionRate: 0,
    ammunitionCurrent: 50, 
    ammunitionMax: 50,
    ammunitionConsumptionRate: 2
  }
};

