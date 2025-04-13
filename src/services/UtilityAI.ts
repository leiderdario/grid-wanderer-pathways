import { UnitData, Faction } from "../models/UnitTypes";
import { GridPosition, manhattanDistance } from "../lib/gridUtils";
import { GameMap } from "./MapGenerator";
import { TerrainType } from "../models/TerrainTypes";
import { PathFinder } from "./PathFinder";
import { DiplomacySystem } from "./DiplomacySystem";
import { SupplySystem } from "./SupplySystem";

// Available actions for the AI
export enum AIAction {
  IDLE = "idle",
  MOVE_TO_ENEMY = "moveToEnemy",
  ATTACK = "attack",
  RETREAT = "retreat",
  PATROL = "patrol"
}

// Context data for AI decisions
export interface AIContext {
  unit: UnitData;
  position: GridPosition;
  enemies: Array<{
    unitData: UnitData;
    position: GridPosition;
  }>;
  allies: Array<{
    unitData: UnitData;
    position: GridPosition;
  }>;
  map: GameMap;
  supplyBases?: Array<{
    position: GridPosition;
    faction: Faction;
  }>;
  diplomacySystem?: DiplomacySystem;
  supplySystem?: SupplySystem;
}

// Result of utility evaluation
export interface UtilityResult {
  action: AIAction;
  score: number;
  targetPosition?: GridPosition;
  targetUnit?: UnitData;
}

export class UtilityAI {
  private pathFinder: PathFinder;
  
  constructor(map: GameMap) {
    this.pathFinder = new PathFinder(map);
  }
  
  // Main decision function
  public evaluateBestAction(context: AIContext): UtilityResult {
    const evaluations: UtilityResult[] = [
      this.evaluateAttack(context),
      this.evaluateMoveToEnemy(context),
      this.evaluateRetreat(context),
      this.evaluatePatrol(context),
      this.evaluateIdle(context)
    ];
    
    // Sort by score and return highest
    evaluations.sort((a, b) => b.score - a.score);
    return evaluations[0];
  }
  
  // Attack utility function
  private evaluateAttack(context: AIContext): UtilityResult {
    const { unit, position, enemies } = context;
    let highestScore = 0;
    let targetEnemy = null;
    let targetPosition = null;
    
    for (const enemy of enemies) {
      const distance = manhattanDistance(position, enemy.position);
      
      // Only consider enemies in range
      if (distance <= unit.attackRange) {
        // Calculate tactical advantage
        const healthRatio = unit.health / unit.maxHealth;
        const enemyHealthRatio = enemy.unitData.health / enemy.unitData.maxHealth;
        
        // Factors influencing attack decision
        const powerDiff = unit.attackPower - enemy.unitData.defense;
        const healthAdvantage = healthRatio - enemyHealthRatio;
        
        // Calculate score based on unit's aggressiveness and other factors
        const score = (
          (unit.aggressiveness * 0.5) +
          (enemyHealthRatio < 0.3 ? 0.3 : 0) +
          (healthAdvantage > 0 ? 0.2 : -0.1) +
          (powerDiff > 0 ? 0.2 : -0.1)
        );
        
        if (score > highestScore) {
          highestScore = score;
          targetEnemy = enemy.unitData;
          targetPosition = enemy.position;
        }
      }
    }
    
    return {
      action: AIAction.ATTACK,
      score: highestScore,
      targetPosition,
      targetUnit: targetEnemy
    };
  }
  
  // Move to enemy utility function
  private evaluateMoveToEnemy(context: AIContext): UtilityResult {
    const { unit, position, enemies } = context;
    let highestScore = 0;
    let targetEnemy = null;
    let targetPosition = null;
    
    // If no enemies, can't pursue
    if (enemies.length === 0) {
      return {
        action: AIAction.MOVE_TO_ENEMY,
        score: 0
      };
    }
    
    for (const enemy of enemies) {
      const distance = manhattanDistance(position, enemy.position);
      
      // If enemy is outside attack range but inside detection range
      if (distance > unit.attackRange && distance <= unit.detectionRange) {
        // Calculate pursuit score
        const healthRatio = unit.health / unit.maxHealth;
        const score = (
          (unit.aggressiveness * 0.6) +
          (unit.sensorWeight * 0.3) +
          (healthRatio > 0.7 ? 0.2 : -0.1) +
          (1 - (distance / unit.detectionRange) * 0.2)
        );
        
        if (score > highestScore) {
          highestScore = score;
          targetEnemy = enemy.unitData;
          targetPosition = enemy.position;
        }
      }
    }
    
    return {
      action: AIAction.MOVE_TO_ENEMY,
      score: highestScore,
      targetPosition,
      targetUnit: targetEnemy
    };
  }
  
  // Retreat utility function
  private evaluateRetreat(context: AIContext): UtilityResult {
    const { unit, position, enemies, allies } = context;
    
    // Calculate health factor
    const healthRatio = unit.health / unit.maxHealth;
    let retreatScore = 0;
    
    // Low health increases retreat score
    if (healthRatio < 0.3) {
      retreatScore += 0.7;
    } else if (healthRatio < 0.5) {
      retreatScore += 0.4;
    }
    
    // Being outnumbered increases retreat score
    const nearbyEnemies = enemies.filter(e => 
      manhattanDistance(position, e.position) <= unit.detectionRange
    );
    
    const nearbyAllies = allies.filter(a => 
      manhattanDistance(position, a.position) <= unit.detectionRange
    );
    
    if (nearbyEnemies.length > nearbyAllies.length + 1) {
      retreatScore += 0.3;
    }
    
    // Lower aggressiveness increases retreat tendency
    retreatScore += (1 - unit.aggressiveness) * 0.3;
    
    // Find nearest ally to retreat to
    let retreatPosition: GridPosition | undefined;
    let minDistance = Infinity;
    
    for (const ally of allies) {
      const distance = manhattanDistance(position, ally.position);
      if (distance < minDistance && distance > 0) {
        minDistance = distance;
        retreatPosition = ally.position;
      }
    }
    
    // If no allies, move away from enemies
    if (!retreatPosition && nearbyEnemies.length > 0) {
      // Calculate average enemy position
      const avgX = nearbyEnemies.reduce((sum, e) => sum + e.position.x, 0) / nearbyEnemies.length;
      const avgY = nearbyEnemies.reduce((sum, e) => sum + e.position.y, 0) / nearbyEnemies.length;
      
      // Move in opposite direction
      retreatPosition = {
        x: position.x + (position.x > avgX ? 2 : -2),
        y: position.y + (position.y > avgY ? 2 : -2)
      };
      
      // Clamp to map bounds
      retreatPosition.x = Math.max(0, Math.min(context.map.width - 1, retreatPosition.x));
      retreatPosition.y = Math.max(0, Math.min(context.map.height - 1, retreatPosition.y));
    }
    
    return {
      action: AIAction.RETREAT,
      score: retreatScore,
      targetPosition: retreatPosition
    };
  }
  
  // Patrol utility function
  private evaluatePatrol(context: AIContext): UtilityResult {
    const { unit, position } = context;
    
    // Patrol is a moderate priority fallback action when no enemies are in range
    let patrolScore = 0.2;
    
    // Generate a random position nearby to patrol to
    const patrolRadius = 3;
    const patrolPosition: GridPosition = {
      x: position.x + Math.floor(Math.random() * (patrolRadius * 2 + 1)) - patrolRadius,
      y: position.y + Math.floor(Math.random() * (patrolRadius * 2 + 1)) - patrolRadius
    };
    
    // Clamp to map bounds
    patrolPosition.x = Math.max(0, Math.min(context.map.width - 1, patrolPosition.x));
    patrolPosition.y = Math.max(0, Math.min(context.map.height - 1, patrolPosition.y));
    
    return {
      action: AIAction.PATROL,
      score: patrolScore,
      targetPosition: patrolPosition
    };
  }
  
  // Idle utility function
  private evaluateIdle(context: AIContext): UtilityResult {
    // Idle is the lowest priority action
    return {
      action: AIAction.IDLE,
      score: 0.1
    };
  }
}
