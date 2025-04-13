
import { UnitData, Faction } from "../models/UnitTypes";
import { GridPosition } from "../lib/gridUtils";
import { PathFinder } from "./PathFinder";
import { UtilityAI, AIContext, AIAction } from "./UtilityAI";
import { BehaviorNode, SelectorNode, SequenceNode, NodeState, 
         CheckEnemyByDiplomacyNode, CheckSupplyLevelNode, FindNearestSupplyBaseNode,
         behaviorWorkerPool } from "./BehaviorTree";
import { CombatSystem } from "./CombatSystem";
import { GameMap } from "./MapGenerator";
import { DiplomacySystem, RelationshipStatus } from "./DiplomacySystem";
import { SupplySystem } from "./SupplySystem";

// States that a unit can be in
export enum UnitState {
  IDLE = "idle",
  MOVING = "moving",
  ATTACKING = "attacking",
  RETREATING = "retreating",
  RESUPPLYING = "resupplying"
}

// Results from executing a unit action
export interface UnitActionResult {
  success: boolean;
  newPosition?: GridPosition;
  targetUnit?: UnitData;
  combatOccurred?: boolean;
  unitKilled?: boolean;
  message?: string;
  resourcesConsumed?: {
    fuel: number;
    ammo: number;
  };
  diplomaticAction?: {
    type: string;
    value: number;
  };
}

export class UnitController {
  private map: GameMap;
  private pathFinder: PathFinder;
  private utilityAI: UtilityAI;
  private combatSystem: CombatSystem;
  private diplomacySystem: DiplomacySystem;
  private supplySystem: SupplySystem;
  
  constructor(map: GameMap) {
    this.map = map;
    this.pathFinder = new PathFinder(map);
    this.utilityAI = new UtilityAI(map);
    this.diplomacySystem = new DiplomacySystem();
    this.supplySystem = new SupplySystem(map);
    this.combatSystem = new CombatSystem(map, this.diplomacySystem, this.supplySystem);
  }
  
  // Process a turn for an AI-controlled unit
  public processUnitTurn(
    unit: UnitData,
    position: GridPosition,
    allUnits: Array<{
      unit: UnitData,
      position: GridPosition
    }>
  ): UnitActionResult {
    // Skip processing for player-controlled units
    if (unit.faction === Faction.PLAYER) {
      return { success: false };
    }
    
    // Prepare AI context
    const enemies = allUnits
      .filter(u => {
        // Use diplomatic relations to determine enemies
        const relationStatus = this.diplomacySystem.getRelationshipStatus(
          unit.faction, u.unit.faction
        );
        return relationStatus === RelationshipStatus.WAR || 
               relationStatus === RelationshipStatus.HOSTILE;
      })
      .map(u => ({ unitData: u.unit, position: u.position }));
      
    const allies = allUnits
      .filter(u => {
        // Use diplomatic relations to determine allies
        if (u.unit.id === unit.id) return false;
        
        const relationStatus = this.diplomacySystem.getRelationshipStatus(
          unit.faction, u.unit.faction
        );
        return relationStatus === RelationshipStatus.FRIENDLY || 
               relationStatus === RelationshipStatus.ALLIED ||
               u.unit.faction === unit.faction;
      })
      .map(u => ({ unitData: u.unit, position: u.position }));
    
    // Get supply bases information
    const supplyBases = this.supplySystem.getBases()
      .map(base => ({ position: base.position, faction: base.faction }));
    
    const context: AIContext = {
      unit,
      position,
      enemies,
      allies,
      map: this.map,
      supplyBases,
      diplomacySystem: this.diplomacySystem,
      supplySystem: this.supplySystem
    };
    
    // Check if unit needs resupply (low on fuel or ammo)
    const needsResupply = unit.fuelCurrent < unit.fuelMax * 0.3 || 
                         unit.ammunitionCurrent < unit.ammunitionMax * 0.3;
                         
    // If low on supplies and not in supply range, prioritize finding supply
    if (needsResupply) {
      const supplyInfo = this.supplySystem.calculateUnitSupply(unit, position);
      
      if (!supplyInfo.inSupplyRange) {
        // Create a behavior tree to find nearest supply
        const findSupplyNode = new FindNearestSupplyBaseNode(unit, position, supplyBases);
        
        // Execute synchronously for now (could be async with worker)
        findSupplyNode.execute();
        const supplyBase = findSupplyNode.getResult();
        
        if (supplyBase) {
          return this.executeMove(unit, position, supplyBase, "Moving to resupply");
        }
      } else if (supplyInfo.inSupplyRange) {
        // Already in supply range, resupply the unit
        const resupplyResult = this.supplySystem.resupplyUnit(unit, position);
        
        if (resupplyResult.resupplied) {
          return {
            success: true,
            message: `Resupplied with ${resupplyResult.fuelAdded} fuel and ${resupplyResult.ammoAdded} ammo`
          };
        }
      }
    }
    
    // Get best action from utility AI
    const decision = this.utilityAI.evaluateBestAction(context);
    console.log(`${unit.name} decided to ${decision.action} with score ${decision.score}`);
    
    // Execute the decided action
    switch (decision.action) {
      case AIAction.ATTACK:
        if (decision.targetPosition && decision.targetUnit) {
          // Check if unit has enough ammo
          const canAttack = this.supplySystem.canUnitAttack(unit);
          if (!canAttack.canAttack) {
            // Can't attack, try to move to resupply instead
            return this.executeRetreat(unit, position, "Retreating to resupply");
          }
          
          return this.executeAttack(unit, position, decision.targetUnit, decision.targetPosition);
        }
        break;
        
      case AIAction.MOVE_TO_ENEMY:
        if (decision.targetPosition) {
          // Check if unit has enough fuel
          const path = this.pathFinder.findPath(
            position,
            decision.targetPosition,
            unit.movementType,
            unit.movementPoints
          );
          
          if (path) {
            const canMove = this.supplySystem.canUnitMove(unit, path.path);
            if (!canMove.canMove) {
              // Can't move, try to find supply
              return this.executeRetreat(unit, position, "Retreating due to low fuel");
            }
          }
          
          return this.executeMove(unit, position, decision.targetPosition);
        }
        break;
        
      case AIAction.RETREAT:
        if (decision.targetPosition) {
          return this.executeRetreat(unit, position, "Retreating from danger");
        }
        break;
        
      case AIAction.PATROL:
        if (decision.targetPosition) {
          return this.executePatrol(unit, position, decision.targetPosition);
        }
        break;
        
      case AIAction.IDLE:
      default:
        // Do nothing
        return { success: true, message: "Standing by" };
    }
    
    // Fallback to idle if action couldn't be executed
    return { success: true, message: "No action available" };
  }
  
  // Execute attack action
  private executeAttack(
    attacker: UnitData,
    attackerPos: GridPosition,
    defender: UnitData,
    defenderPos: GridPosition
  ): UnitActionResult {
    // Resolve combat
    const result = this.combatSystem.resolveCombat(
      attacker,
      attackerPos,
      defender,
      defenderPos
    );
    
    return {
      success: true,
      targetUnit: defender,
      combatOccurred: true,
      unitKilled: result.isKill,
      message: `Attacked ${defender.name} for ${result.damage} damage`,
      resourcesConsumed: {
        fuel: 0,
        ammo: result.ammunitionConsumed
      },
      diplomaticAction: result.diplomaticConsequence ? {
        type: result.diplomaticConsequence.type,
        value: result.diplomaticConsequence.value
      } : undefined
    };
  }
  
  // Execute move action
  private executeMove(
    unit: UnitData,
    currentPos: GridPosition,
    targetPos: GridPosition,
    message?: string
  ): UnitActionResult {
    // Find path to target
    const pathResult = this.pathFinder.findPath(
      currentPos,
      targetPos,
      unit.movementType,
      unit.movementPoints
    );
    
    // If no path found or path is just current position
    if (!pathResult || pathResult.path.length <= 1) {
      return { 
        success: false,
        message: "No valid path found"
      };
    }
    
    // Check if unit has enough fuel
    const supplyCheck = this.supplySystem.canUnitMove(unit, pathResult.path);
    if (!supplyCheck.canMove) {
      return {
        success: false,
        message: supplyCheck.reason || "Insufficient resources for movement"
      };
    }
    
    // Get the farthest reachable position in the path
    const reachableIndex = Math.min(unit.movementPoints, pathResult.path.length - 1);
    const newPosition = pathResult.path[reachableIndex];
    
    // Calculate and consume fuel
    const resourceConsumption = this.supplySystem.calculateMovementConsumption(
      unit, 
      pathResult.path.slice(0, reachableIndex + 1)
    );
    
    unit.fuelCurrent -= resourceConsumption.fuelConsumed;
    
    // Check if moving into another faction's territory
    const baseAtNewPosition = this.supplySystem.getBaseAtPosition(newPosition);
    let diplomaticAction;
    
    if (baseAtNewPosition && baseAtNewPosition.faction !== unit.faction) {
      // Entering another faction's territory
      diplomaticAction = {
        type: "ENTER_TERRITORY",
        value: -5
      };
      
      this.diplomacySystem.modifyRelation(
        unit.faction,
        baseAtNewPosition.faction,
        -5,
        "ENTER_TERRITORY",
        `${unit.name} entered territory controlled by ${baseAtNewPosition.faction}`
      );
      
      // If this is a capturable base and unit is at that position, capture it
      if (baseAtNewPosition.capturable) {
        this.supplySystem.captureBase(baseAtNewPosition.id, unit.faction);
        
        // Major diplomatic hit for capturing a base
        this.diplomacySystem.modifyRelation(
          unit.faction,
          baseAtNewPosition.faction,
          -50,
          "CAPTURE_BASE",
          `${unit.name} captured ${baseAtNewPosition.name}`
        );
        
        diplomaticAction = {
          type: "CAPTURE_BASE",
          value: -50
        };
      }
    }
    
    return {
      success: true,
      newPosition,
      message: message || `Moved to (${newPosition.x}, ${newPosition.y})`,
      resourcesConsumed: {
        fuel: resourceConsumption.fuelConsumed,
        ammo: 0
      },
      diplomaticAction
    };
  }
  
  // Execute retreat action
  private executeRetreat(
    unit: UnitData,
    currentPos: GridPosition,
    message?: string
  ): UnitActionResult {
    // Find all friendly bases
    const friendlyBases = this.supplySystem.getBasesByFaction(unit.faction);
    
    if (friendlyBases.length === 0) {
      return {
        success: false,
        message: "No friendly bases to retreat to"
      };
    }
    
    // Find nearest base
    let nearestBase = friendlyBases[0];
    let minDistance = Number.MAX_SAFE_INTEGER;
    
    for (const base of friendlyBases) {
      const distance = Math.abs(base.position.x - currentPos.x) + 
                      Math.abs(base.position.y - currentPos.y);
                      
      if (distance < minDistance) {
        nearestBase = base;
        minDistance = distance;
      }
    }
    
    // Move toward the nearest base
    return this.executeMove(unit, currentPos, nearestBase.position, 
      message || "Retreating to nearest friendly base");
  }
  
  // Execute patrol action
  private executePatrol(
    unit: UnitData,
    currentPos: GridPosition,
    targetPos: GridPosition
  ): UnitActionResult {
    // Check if the target position is beyond detection range
    const distance = Math.abs(targetPos.x - currentPos.x) + 
                    Math.abs(targetPos.y - currentPos.y);
                    
    // If too far, create a closer random patrol point
    if (distance > unit.detectionRange) {
      const angle = Math.random() * Math.PI * 2;
      const patrolRadius = Math.min(unit.detectionRange, unit.movementPoints * 2);
      const deltaX = Math.round(Math.cos(angle) * patrolRadius);
      const deltaY = Math.round(Math.sin(angle) * patrolRadius);
      
      // Ensure within map bounds
      targetPos = {
        x: Math.max(0, Math.min(this.map.width - 1, currentPos.x + deltaX)),
        y: Math.max(0, Math.min(this.map.height - 1, currentPos.y + deltaY))
      };
    }
    
    return this.executeMove(unit, currentPos, targetPos, "Patrolling area");
  }
  
  // Get current diplomatic relations
  public getDiplomaticRelations(): Record<string, number> {
    const relations: Record<string, number> = {};
    
    for (const factionA of Object.values(Faction)) {
      for (const factionB of Object.values(Faction)) {
        if (factionA !== factionB) {
          const key = `${factionA}_${factionB}`;
          relations[key] = this.diplomacySystem.getRelation(factionA as Faction, factionB as Faction);
        }
      }
    }
    
    return relations;
  }
  
  // Get the diplomacy system
  public getDiplomacySystem(): DiplomacySystem {
    return this.diplomacySystem;
  }
  
  // Get the supply system
  public getSupplySystem(): SupplySystem {
    return this.supplySystem;
  }
}

// Custom behavior tree nodes for unit actions
export class IsEnemyInRangeNode extends BehaviorNode {
  private unit: UnitData;
  private position: GridPosition;
  private enemies: Array<{ unitData: UnitData, position: GridPosition }>;
  
  constructor(
    unit: UnitData,
    position: GridPosition,
    enemies: Array<{ unitData: UnitData, position: GridPosition }>
  ) {
    super();
    this.unit = unit;
    this.position = position;
    this.enemies = enemies;
  }
  
  execute(): NodeState {
    const enemyInRange = this.enemies.some(enemy => {
      const distance = Math.abs(enemy.position.x - this.position.x) + 
                       Math.abs(enemy.position.y - this.position.y);
      return distance <= this.unit.attackRange;
    });
    
    this._state = enemyInRange ? NodeState.SUCCESS : NodeState.FAILURE;
    return this._state;
  }
}
