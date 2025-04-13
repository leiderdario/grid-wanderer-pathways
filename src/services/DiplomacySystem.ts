
import { Faction } from "../models/UnitTypes";

// Diplomatic relationship scores (-100 to +100)
export enum RelationshipStatus {
  WAR = "war",              // -100 to -60
  HOSTILE = "hostile",      // -59 to -20
  NEUTRAL = "neutral",      // -19 to +19
  FRIENDLY = "friendly",    // +20 to +59
  ALLIED = "allied",        // +60 to +100
}

export interface DiplomaticAction {
  type: string;
  description: string;
  value: number;
  origin: Faction;
  target: Faction;
}

export interface DiplomaticRelation {
  factionA: Faction;
  factionB: Faction;
  score: number;
  status: RelationshipStatus;
}

export class DiplomacySystem {
  // Store relations between factions as a matrix
  private relations: Map<string, number> = new Map();
  private actionHistory: DiplomaticAction[] = [];
  private actionListeners: ((action: DiplomaticAction) => void)[] = [];
  
  constructor() {
    // Initialize with default relations
    this.setRelation(Faction.PLAYER, Faction.ENEMY, -80); // War
    this.setRelation(Faction.PLAYER, Faction.NEUTRAL, 0); // Neutral
    this.setRelation(Faction.ENEMY, Faction.NEUTRAL, -10); // Slightly negative
  }
  
  // Create a unique key for the relation between two factions
  private getRelationKey(factionA: Faction, factionB: Faction): string {
    // Always sort to ensure we get the same key regardless of order
    const sorted = [factionA, factionB].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }
  
  // Set relation between two factions
  public setRelation(factionA: Faction, factionB: Faction, value: number): void {
    // Clamp value between -100 and 100
    const clampedValue = Math.max(-100, Math.min(100, value));
    this.relations.set(this.getRelationKey(factionA, factionB), clampedValue);
  }
  
  // Get current relation between two factions
  public getRelation(factionA: Faction, factionB: Faction): number {
    // If factions are the same, they're perfectly allied
    if (factionA === factionB) return 100;
    
    const key = this.getRelationKey(factionA, factionB);
    const relation = this.relations.get(key);
    
    return relation !== undefined ? relation : 0; // Default to neutral
  }
  
  // Modify relation between factions
  public modifyRelation(factionA: Faction, factionB: Faction, delta: number, actionType: string, description: string): void {
    const currentRelation = this.getRelation(factionA, factionB);
    const newRelation = Math.max(-100, Math.min(100, currentRelation + delta));
    
    this.setRelation(factionA, factionB, newRelation);
    
    // Record the action
    const action: DiplomaticAction = {
      type: actionType,
      description: description,
      value: delta,
      origin: factionA,
      target: factionB
    };
    
    this.actionHistory.push(action);
    this.notifyListeners(action);
  }
  
  // Get current relationship status
  public getRelationshipStatus(factionA: Faction, factionB: Faction): RelationshipStatus {
    const score = this.getRelation(factionA, factionB);
    
    if (score <= -60) return RelationshipStatus.WAR;
    if (score <= -20) return RelationshipStatus.HOSTILE;
    if (score < 20) return RelationshipStatus.NEUTRAL;
    if (score < 60) return RelationshipStatus.FRIENDLY;
    return RelationshipStatus.ALLIED;
  }
  
  // Get faction color for UI display based on relation to player
  public getRelativeColor(faction: Faction, relativeTo: Faction = Faction.PLAYER): string {
    if (faction === relativeTo) return '#14e314'; // Player/self - green
    
    const status = this.getRelationshipStatus(faction, relativeTo);
    switch (status) {
      case RelationshipStatus.WAR: return '#e31414'; // Red
      case RelationshipStatus.HOSTILE: return '#f97316'; // Orange
      case RelationshipStatus.NEUTRAL: return '#888888'; // Gray
      case RelationshipStatus.FRIENDLY: return '#3b82f6'; // Blue
      case RelationshipStatus.ALLIED: return '#14e314'; // Green
      default: return '#888888';
    }
  }
  
  // Add listener for diplomatic actions
  public addActionListener(callback: (action: DiplomaticAction) => void): void {
    this.actionListeners.push(callback);
  }
  
  // Remove listener
  public removeActionListener(callback: (action: DiplomaticAction) => void): void {
    this.actionListeners = this.actionListeners.filter(listener => listener !== callback);
  }
  
  // Notify all listeners of a diplomatic action
  private notifyListeners(action: DiplomaticAction): void {
    for (const listener of this.actionListeners) {
      listener(action);
    }
  }
  
  // Get diplomatic action history
  public getActionHistory(): DiplomaticAction[] {
    return [...this.actionHistory];
  }
  
  // Define common diplomatic actions with their relation impacts
  public static DiplomaticActions = {
    ATTACK_UNIT: {
      type: "ATTACK_UNIT",
      value: -15,
      description: "Attacked a unit"
    },
    DESTROY_UNIT: {
      type: "DESTROY_UNIT",
      value: -25,
      description: "Destroyed a unit"
    },
    ATTACK_BASE: {
      type: "ATTACK_BASE",
      value: -40,
      description: "Attacked a base or outpost"
    },
    CAPTURE_BASE: {
      type: "CAPTURE_BASE",
      value: -50,
      description: "Captured a base or outpost"
    },
    ENTER_TERRITORY: {
      type: "ENTER_TERRITORY",
      value: -5,
      description: "Entered controlled territory"
    },
    PROVIDE_SUPPLIES: {
      type: "PROVIDE_SUPPLIES",
      value: 10,
      description: "Provided supplies"
    },
    DEFEND_ALLY: {
      type: "DEFEND_ALLY",
      value: 15,
      description: "Defended an ally"
    }
  };
}
