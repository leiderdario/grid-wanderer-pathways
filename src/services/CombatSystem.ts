
import { UnitData, UnitClass } from "../models/UnitTypes";
import { GridPosition } from "../lib/gridUtils";
import { GameMap } from "./MapGenerator";
import { TerrainType } from "../models/TerrainTypes";
import { DiplomacySystem } from "./DiplomacySystem";
import { SupplySystem } from "./SupplySystem";

// Combat result interface
export interface CombatResult {
  attacker: UnitData;
  defender: UnitData;
  damage: number;
  isKill: boolean;
  defenderRemainingHealth: number;
  ammunitionConsumed: number;
  diplomaticConsequence?: {
    type: string;
    value: number;
    description: string;
  };
}

// Terrain modifiers for combat
interface TerrainModifiers {
  attackModifier: number;
  defenseModifier: number;
}

export class CombatSystem {
  private map: GameMap;
  private diplomacySystem?: DiplomacySystem;
  private supplySystem?: SupplySystem;
  
  // Class advantage matrix
  private classAdvantage: Record<UnitClass, Record<UnitClass, number>> = {
    [UnitClass.INFANTRY]: {
      [UnitClass.INFANTRY]: 1.0,
      [UnitClass.VEHICLE]: 0.7,
      [UnitClass.AIRCRAFT]: 0.4,
    },
    [UnitClass.VEHICLE]: {
      [UnitClass.INFANTRY]: 1.5,
      [UnitClass.VEHICLE]: 1.0,
      [UnitClass.AIRCRAFT]: 0.6,
    },
    [UnitClass.AIRCRAFT]: {
      [UnitClass.INFANTRY]: 1.8,
      [UnitClass.VEHICLE]: 1.4,
      [UnitClass.AIRCRAFT]: 1.0,
    }
  };
  
  constructor(map: GameMap, diplomacySystem?: DiplomacySystem, supplySystem?: SupplySystem) {
    this.map = map;
    this.diplomacySystem = diplomacySystem;
    this.supplySystem = supplySystem;
  }
  
  // Main combat resolution function
  public resolveCombat(
    attacker: UnitData,
    attackerPos: GridPosition,
    defender: UnitData,
    defenderPos: GridPosition
  ): CombatResult {
    // Check if attacker has enough ammunition
    let ammunitionConsumed = 0;
    if (this.supplySystem) {
      const supplyCheck = this.supplySystem.canUnitAttack(attacker);
      if (!supplyCheck.canAttack) {
        // Not enough ammo, return minimal damage
        return {
          attacker,
          defender,
          damage: 1, // Minimum damage
          isKill: defender.health <= 1,
          defenderRemainingHealth: Math.max(0, defender.health - 1),
          ammunitionConsumed: 0
        };
      }
      ammunitionConsumed = attacker.ammunitionConsumptionRate;
      attacker.ammunitionCurrent -= ammunitionConsumed;
    }
    
    // Get terrain modifiers
    const attackerTerrain = this.map.tiles[attackerPos.y][attackerPos.x].terrain;
    const defenderTerrain = this.map.tiles[defenderPos.y][defenderPos.x].terrain;
    
    const attackerMods = this.getTerrainModifiers(attackerTerrain.type);
    const defenderMods = this.getTerrainModifiers(defenderTerrain.type);
    
    // Calculate base damage
    let damage = attacker.attackPower;
    
    // Apply class advantage
    damage *= this.classAdvantage[attacker.unitClass][defender.unitClass];
    
    // Apply terrain modifiers
    damage *= attackerMods.attackModifier;
    
    // Apply defender's defense and terrain
    const effectiveDefense = defender.defense * defenderMods.defenseModifier;
    
    // Check for supply-based penalties for the defender
    if (this.supplySystem) {
      const defenderSupply = this.supplySystem.calculateUnitSupply(defender, defenderPos);
      // Units out of supply range have reduced defense
      if (!defenderSupply.inSupplyRange) {
        damage *= 1.2; // 20% more damage to out-of-supply units
      }
    }
    
    // Calculate final damage (minimum 1)
    const finalDamage = Math.max(1, Math.round(damage - effectiveDefense));
    
    // Apply damage and check for kill
    const remainingHealth = Math.max(0, defender.health - finalDamage);
    const isKill = remainingHealth <= 0;
    
    // Handle diplomatic consequences
    let diplomaticConsequence;
    if (this.diplomacySystem && attacker.faction !== defender.faction) {
      const actionType = isKill ? 
        "DESTROY_UNIT" : 
        "ATTACK_UNIT";
      
      const actionValue = isKill ? -25 : -15;
      
      // Apply diplomatic penalty
      this.diplomacySystem.modifyRelation(
        attacker.faction,
        defender.faction,
        actionValue,
        actionType,
        `${attacker.name} ${isKill ? 'destroyed' : 'attacked'} ${defender.name}`
      );
      
      diplomaticConsequence = {
        type: actionType,
        value: actionValue,
        description: `${isKill ? 'Destroying' : 'Attacking'} enemy units decreases diplomatic relations`
      };
    }
    
    return {
      attacker,
      defender,
      damage: finalDamage,
      isKill,
      defenderRemainingHealth: remainingHealth,
      ammunitionConsumed,
      diplomaticConsequence
    };
  }
  
  // Get terrain modifiers for different terrain types
  private getTerrainModifiers(terrainType: TerrainType): TerrainModifiers {
    switch (terrainType) {
      case TerrainType.PLAINS:
        return {
          attackModifier: 1.0,
          defenseModifier: 1.0
        };
      case TerrainType.FOREST:
        return {
          attackModifier: 0.9,
          defenseModifier: 1.2
        };
      case TerrainType.MOUNTAIN:
        return {
          attackModifier: 1.1,
          defenseModifier: 1.3
        };
      case TerrainType.WATER:
        return {
          attackModifier: 0.8,
          defenseModifier: 0.7
        };
      default:
        return {
          attackModifier: 1.0,
          defenseModifier: 1.0
        };
    }
  }
  
  // Set the diplomacy system reference
  public setDiplomacySystem(diplomacySystem: DiplomacySystem): void {
    this.diplomacySystem = diplomacySystem;
  }
  
  // Set the supply system reference
  public setSupplySystem(supplySystem: SupplySystem): void {
    this.supplySystem = supplySystem;
  }
}
