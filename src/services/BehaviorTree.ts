
import { UnitData, Faction } from "../models/UnitTypes";
import { GridPosition, manhattanDistance } from "../lib/gridUtils";
import { RelationshipStatus } from "./DiplomacySystem";

// Behavior Tree Node Types
export enum NodeType {
  SELECTOR,
  SEQUENCE,
  ACTION,
  CONDITION
}

// Behavior Tree State
export enum NodeState {
  SUCCESS,
  FAILURE,
  RUNNING
}

// Base Node class
export abstract class BehaviorNode {
  protected _state: NodeState = NodeState.FAILURE;
  
  get state(): NodeState {
    return this._state;
  }
  
  abstract execute(): NodeState;
}

// Selector Node: Returns SUCCESS if any child succeeds
export class SelectorNode extends BehaviorNode {
  children: BehaviorNode[];
  
  constructor(children: BehaviorNode[]) {
    super();
    this.children = children;
  }
  
  execute(): NodeState {
    for (const child of this.children) {
      const state = child.execute();
      
      if (state !== NodeState.FAILURE) {
        this._state = state;
        return this._state;
      }
    }
    
    this._state = NodeState.FAILURE;
    return this._state;
  }
}

// Sequence Node: Returns FAILURE if any child fails
export class SequenceNode extends BehaviorNode {
  children: BehaviorNode[];
  
  constructor(children: BehaviorNode[]) {
    super();
    this.children = children;
  }
  
  execute(): NodeState {
    for (const child of this.children) {
      const state = child.execute();
      
      if (state !== NodeState.SUCCESS) {
        this._state = state;
        return this._state;
      }
    }
    
    this._state = NodeState.SUCCESS;
    return this._state;
  }
}

// Action node base class
export abstract class ActionNode extends BehaviorNode {
  constructor() {
    super();
  }
}

// Condition node base class
export abstract class ConditionNode extends BehaviorNode {
  constructor() {
    super();
  }
}

// Decorator node (modifies the behavior of its child)
export abstract class DecoratorNode extends BehaviorNode {
  protected child: BehaviorNode;
  
  constructor(child: BehaviorNode) {
    super();
    this.child = child;
  }
}

// Inverter node (changes SUCCESS to FAILURE and vice versa)
export class InverterNode extends DecoratorNode {
  execute(): NodeState {
    const childState = this.child.execute();
    
    if (childState === NodeState.SUCCESS) {
      this._state = NodeState.FAILURE;
    } else if (childState === NodeState.FAILURE) {
      this._state = NodeState.SUCCESS;
    } else {
      this._state = childState;
    }
    
    return this._state;
  }
}

// Parallel node (executes all children simultaneously)
export class ParallelNode extends BehaviorNode {
  children: BehaviorNode[];
  requiredSuccesses: number;
  
  constructor(children: BehaviorNode[], requiredSuccesses: number) {
    super();
    this.children = children;
    this.requiredSuccesses = requiredSuccesses;
  }
  
  execute(): NodeState {
    let successCount = 0;
    
    for (const child of this.children) {
      const state = child.execute();
      
      if (state === NodeState.SUCCESS) {
        successCount++;
      } else if (state === NodeState.RUNNING) {
        this._state = NodeState.RUNNING;
        return this._state;
      }
    }
    
    this._state = (successCount >= this.requiredSuccesses) ? 
      NodeState.SUCCESS : NodeState.FAILURE;
    return this._state;
  }
}

// Specialized node for checking enemy units based on diplomatic status
export class CheckEnemyByDiplomacyNode extends ConditionNode {
  private unit: UnitData;
  private position: GridPosition;
  private units: Array<{ unitData: UnitData, position: GridPosition }>;
  private relationshipStatus: RelationshipStatus;
  private range: number;
  
  constructor(
    unit: UnitData,
    position: GridPosition,
    units: Array<{ unitData: UnitData, position: GridPosition }>,
    relationshipStatus: RelationshipStatus,
    range: number = -1 // -1 means use unit's detection range
  ) {
    super();
    this.unit = unit;
    this.position = position;
    this.units = units;
    this.relationshipStatus = relationshipStatus;
    this.range = range > 0 ? range : unit.detectionRange;
  }
  
  execute(): NodeState {
    const hostileUnits = this.units.filter(other => {
      // Check diplomatic relationship via status
      if (this.relationshipStatus === RelationshipStatus.WAR || 
          this.relationshipStatus === RelationshipStatus.HOSTILE) {
        // Only consider units of different factions
        if (other.unitData.faction === this.unit.faction) return false;
      }
      
      // Check if in range
      const distance = manhattanDistance(this.position, other.position);
      return distance <= this.range;
    });
    
    this._state = hostileUnits.length > 0 ? NodeState.SUCCESS : NodeState.FAILURE;
    return this._state;
  }
}

// Specialized node for checking supply status
export class CheckSupplyLevelNode extends ConditionNode {
  private unit: UnitData;
  private threshold: number; // 0.0 to 1.0
  private checkFuel: boolean;
  private checkAmmo: boolean;
  
  constructor(
    unit: UnitData,
    threshold: number = 0.2,
    checkFuel: boolean = true,
    checkAmmo: boolean = true
  ) {
    super();
    this.unit = unit;
    this.threshold = Math.max(0, Math.min(1, threshold)); // Clamp to 0-1
    this.checkFuel = checkFuel;
    this.checkAmmo = checkAmmo;
  }
  
  execute(): NodeState {
    let lowSupply = false;
    
    if (this.checkFuel) {
      const fuelRatio = this.unit.fuelCurrent / this.unit.fuelMax;
      if (fuelRatio <= this.threshold) {
        lowSupply = true;
      }
    }
    
    if (!lowSupply && this.checkAmmo) {
      const ammoRatio = this.unit.ammunitionCurrent / this.unit.ammunitionMax;
      if (ammoRatio <= this.threshold) {
        lowSupply = true;
      }
    }
    
    this._state = lowSupply ? NodeState.SUCCESS : NodeState.FAILURE;
    return this._state;
  }
}

// Specialized action node for finding nearest supply base
export class FindNearestSupplyBaseNode extends ActionNode {
  private unit: UnitData;
  private position: GridPosition;
  private supplyBases: Array<{ position: GridPosition, faction: Faction }>;
  private result: GridPosition | null = null;
  
  constructor(
    unit: UnitData,
    position: GridPosition,
    supplyBases: Array<{ position: GridPosition, faction: Faction }>
  ) {
    super();
    this.unit = unit;
    this.position = position;
    this.supplyBases = supplyBases;
  }
  
  execute(): NodeState {
    // Filter bases by same faction
    const friendlyBases = this.supplyBases.filter(base => 
      base.faction === this.unit.faction
    );
    
    if (friendlyBases.length === 0) {
      this._state = NodeState.FAILURE;
      return this._state;
    }
    
    // Find the nearest base
    let nearestBase = friendlyBases[0];
    let minDistance = manhattanDistance(this.position, nearestBase.position);
    
    for (let i = 1; i < friendlyBases.length; i++) {
      const base = friendlyBases[i];
      const distance = manhattanDistance(this.position, base.position);
      
      if (distance < minDistance) {
        nearestBase = base;
        minDistance = distance;
      }
    }
    
    this.result = nearestBase.position;
    this._state = NodeState.SUCCESS;
    return this._state;
  }
  
  getResult(): GridPosition | null {
    return this.result;
  }
}

// Worker for asynchronous behavior tree execution
// This is a simulation of worker threads since we can't use real ones in the browser
export class BehaviorTreeWorker {
  private _isRunning = false;
  private _workQueue: Array<{ 
    node: BehaviorNode, 
    callback: (state: NodeState) => void 
  }> = [];
  
  constructor() {
    this.processQueue();
  }
  
  // Queue a behavior tree for execution
  enqueue(node: BehaviorNode, callback: (state: NodeState) => void): void {
    this._workQueue.push({ node, callback });
  }
  
  // Process the queue in the background
  private async processQueue(): Promise<void> {
    while (true) {
      if (this._workQueue.length > 0) {
        this._isRunning = true;
        const work = this._workQueue.shift()!;
        
        // Simulate non-blocking execution with setTimeout
        setTimeout(() => {
          try {
            const state = work.node.execute();
            work.callback(state);
          } catch (error) {
            console.error("Error in behavior tree execution:", error);
            work.callback(NodeState.FAILURE);
          }
        }, 0);
      } else {
        this._isRunning = false;
      }
      
      // Release the thread to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  get isRunning(): boolean {
    return this._isRunning;
  }
  
  get queueSize(): number {
    return this._workQueue.length;
  }
}

// Global behavior tree worker pool
export const behaviorWorkerPool = new BehaviorTreeWorker();
