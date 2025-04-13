
import React, { useState, useEffect, useCallback } from "react";
import { MapGenerator, GameMap, Tile } from "../services/MapGenerator";
import { PathFinder } from "../services/PathFinder";
import { GridPosition, posToKey } from "../lib/gridUtils";
import { UnitTypes, UnitData, Faction } from "../models/UnitTypes";
import { CombatSystem, CombatResult } from "../services/CombatSystem";
import { UtilityAI, AIContext } from "../services/UtilityAI";
import { UnitController, UnitState } from "../services/UnitController";
import GameGrid from "./GameGrid";
import GameInfo from "./GameInfo";
import { useToast } from "@/hooks/use-toast";

interface Unit {
  id: string;
  position: GridPosition;
  unitTypeId: string;
  unitData: UnitData;
  health: number;
  state: UnitState;
  color: string;
}

const GameManager: React.FC = () => {
  const [map, setMap] = useState<GameMap | null>(null);
  const [pathFinder, setPathFinder] = useState<PathFinder | null>(null);
  const [combatSystem, setCombatSystem] = useState<CombatSystem | null>(null);
  const [unitController, setUnitController] = useState<UnitController | null>(null);
  
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentPath, setCurrentPath] = useState<GridPosition[] | null>(null);
  const [tilesInRange, setTilesInRange] = useState<Map<string, number>>(new Map());
  const [turn, setTurn] = useState<number>(1);
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  
  const { toast } = useToast();
  
  // Initialize the game
  useEffect(() => {
    // Generate map
    const mapGenerator = new MapGenerator(Math.round(Math.random() * 1000));
    const newMap = mapGenerator.generateMap(20, 20);
    setMap(newMap);
    
    // Create systems
    const finder = new PathFinder(newMap);
    setPathFinder(finder);
    
    const combat = new CombatSystem(newMap);
    setCombatSystem(combat);
    
    const controller = new UnitController(newMap);
    setUnitController(controller);
    
    // Add initial units
    const initialUnits: Unit[] = [
      {
        id: "unit-infantry-1",
        position: { x: 5, y: 5 },
        unitTypeId: "infantry",
        unitData: { ...UnitTypes["infantry"] },
        health: UnitTypes["infantry"].health,
        state: UnitState.IDLE,
        color: UnitTypes["infantry"].color
      },
      {
        id: "unit-helicopter-1",
        position: { x: 7, y: 7 },
        unitTypeId: "helicopter",
        unitData: { ...UnitTypes["helicopter"] },
        health: UnitTypes["helicopter"].health,
        state: UnitState.IDLE,
        color: UnitTypes["helicopter"].color
      },
      {
        id: "unit-tank-1",
        position: { x: 3, y: 6 },
        unitTypeId: "tank",
        unitData: { ...UnitTypes["tank"] },
        health: UnitTypes["tank"].health,
        state: UnitState.IDLE,
        color: UnitTypes["tank"].color
      },
      // Enemy units
      {
        id: "enemy-infantry-1",
        position: { x: 15, y: 15 },
        unitTypeId: "enemy-infantry",
        unitData: { ...UnitTypes["enemy-infantry"] },
        health: UnitTypes["enemy-infantry"].health,
        state: UnitState.IDLE,
        color: UnitTypes["enemy-infantry"].color
      },
      {
        id: "enemy-helicopter-1",
        position: { x: 17, y: 14 },
        unitTypeId: "enemy-helicopter",
        unitData: { ...UnitTypes["enemy-helicopter"] },
        health: UnitTypes["enemy-helicopter"].health,
        state: UnitState.IDLE,
        color: UnitTypes["enemy-helicopter"].color
      },
      {
        id: "enemy-tank-1",
        position: { x: 13, y: 16 },
        unitTypeId: "enemy-tank",
        unitData: { ...UnitTypes["enemy-tank"] },
        health: UnitTypes["enemy-tank"].health,
        state: UnitState.IDLE,
        color: UnitTypes["enemy-tank"].color
      }
    ];
    setUnits(initialUnits);
  }, []);

  // Find reachable tiles when active unit changes
  useEffect(() => {
    if (!pathFinder || !selectedUnit) {
      setTilesInRange(new Map());
      return;
    }
    
    const reachableTiles = pathFinder.findMovementRange(
      selectedUnit.position,
      selectedUnit.unitData.movementType,
      selectedUnit.unitData.movementPoints
    );
    setTilesInRange(reachableTiles);
  }, [selectedUnit, pathFinder, units]);

  // Calculate path when a tile is selected
  useEffect(() => {
    if (!pathFinder || !selectedTile || !selectedUnit) {
      setCurrentPath(null);
      return;
    }
    
    // Don't calculate path if clicking on self
    if (selectedUnit.position.x === selectedTile.position.x && 
        selectedUnit.position.y === selectedTile.position.y) {
      setCurrentPath(null);
      return;
    }
    
    // Check if there's a unit at the target tile
    const unitAtTarget = units.find(u => 
      u.position.x === selectedTile.position.x && 
      u.position.y === selectedTile.position.y
    );
    
    // If there's an enemy unit at the target, don't show movement path
    if (unitAtTarget && unitAtTarget.unitData.faction !== selectedUnit.unitData.faction) {
      // Check if in attack range
      const distance = Math.abs(selectedUnit.position.x - unitAtTarget.position.x) +
                      Math.abs(selectedUnit.position.y - unitAtTarget.position.y);
                      
      if (distance <= selectedUnit.unitData.attackRange) {
        // Show attack indicator instead of path
        setCurrentPath([selectedUnit.position, unitAtTarget.position]);
      } else {
        setCurrentPath(null);
      }
      return;
    }
    
    // If the tile is in range and not occupied by another unit, find path
    if (tilesInRange.has(posToKey(selectedTile.position)) && !unitAtTarget) {
      const pathResult = pathFinder.findPath(
        selectedUnit.position, 
        selectedTile.position,
        selectedUnit.unitData.movementType,
        selectedUnit.unitData.movementPoints
      );
      
      if (pathResult) {
        setCurrentPath(pathResult.path);
      } else {
        setCurrentPath(null);
      }
    } else {
      setCurrentPath(null);
    }
  }, [selectedTile, selectedUnit, pathFinder, units, tilesInRange]);

  // Handle unit movement
  const moveUnit = useCallback(() => {
    if (!selectedUnit || !currentPath || currentPath.length <= 1) return;
    
    // Check if this is an attack path (only 2 points and second point has enemy)
    if (currentPath.length === 2) {
      const targetPos = currentPath[1];
      const targetUnit = units.find(u => 
        u.position.x === targetPos.x && 
        u.position.y === targetPos.y && 
        u.unitData.faction !== selectedUnit.unitData.faction
      );
      
      if (targetUnit && combatSystem) {
        // It's an attack!
        handleCombat(selectedUnit, targetUnit);
        return;
      }
    }
    
    // Regular movement
    // Create a new units array with the updated position
    const newUnits = [...units];
    const unitIndex = newUnits.findIndex(u => u.id === selectedUnit.id);
    
    if (unitIndex !== -1) {
      newUnits[unitIndex] = {
        ...newUnits[unitIndex],
        position: currentPath[currentPath.length - 1],
        state: UnitState.MOVING
      };
      
      setUnits(newUnits);
      setCurrentPath(null);
      setSelectedTile(null);
      
      // After moving, check if any enemy is now in range for automatic attack
      checkAutoAttack(newUnits[unitIndex], newUnits);
    }
  }, [selectedUnit, currentPath, units, combatSystem]);
  
  // Handle combat between units
  const handleCombat = useCallback((attacker: Unit, defender: Unit) => {
    if (!combatSystem) return;
    
    const result = combatSystem.resolveCombat(
      attacker.unitData,
      attacker.position,
      defender.unitData,
      defender.position
    );
    
    // Update units based on combat result
    const newUnits = [...units];
    const defenderIndex = newUnits.findIndex(u => u.id === defender.id);
    
    if (defenderIndex !== -1) {
      // Update defender health
      newUnits[defenderIndex] = {
        ...newUnits[defenderIndex],
        health: result.defenderRemainingHealth,
        state: result.defenderRemainingHealth > 0 ? UnitState.IDLE : UnitState.IDLE
      };
      
      // If killed, remove the unit
      if (result.isKill) {
        newUnits.splice(defenderIndex, 1);
      }
    }
    
    // Update attacker state
    const attackerIndex = newUnits.findIndex(u => u.id === attacker.id);
    if (attackerIndex !== -1) {
      newUnits[attackerIndex] = {
        ...newUnits[attackerIndex],
        state: UnitState.ATTACKING
      };
    }
    
    // Update log
    const logMessage = `${attacker.unitData.name} attacked ${defender.unitData.name} for ${result.damage} damage! ${result.isKill ? '(DEFEATED)' : ''}`;
    setCombatLog(prevLog => [logMessage, ...prevLog.slice(0, 9)]);
    
    // Show toast notification
    toast({
      title: "Combat Result",
      description: logMessage,
      variant: result.isKill ? "destructive" : "default",
    });
    
    setUnits(newUnits);
    setCurrentPath(null);
    setSelectedTile(null);
  }, [combatSystem, units, toast]);
  
  // Check for automatic attacks after moving
  const checkAutoAttack = useCallback((unit: Unit, allUnits: Unit[]) => {
    const enemiesInRange = allUnits.filter(other => 
      other.unitData.faction !== unit.unitData.faction &&
      Math.abs(unit.position.x - other.position.x) + 
      Math.abs(unit.position.y - other.position.y) <= unit.unitData.attackRange
    );
    
    if (enemiesInRange.length > 0) {
      // Find the weakest enemy
      const target = enemiesInRange.reduce((weakest, current) => 
        current.health < weakest.health ? current : weakest
      , enemiesInRange[0]);
      
      // Auto-attack the weakest enemy
      handleCombat(unit, target);
    }
  }, [handleCombat]);

  // Process AI turn
  const processAITurn = useCallback(() => {
    if (!unitController || !map) return;
    
    const enemyUnits = units.filter(u => u.unitData.faction === Faction.ENEMY);
    if (enemyUnits.length === 0) {
      setPlayerTurn(true);
      setTurn(turn + 1);
      return;
    }
    
    // Process each enemy unit's turn
    const newUnits = [...units];
    let logMessages: string[] = [];
    
    // Format units for AI processing
    const unitsForAI = units.map(u => ({ unit: u.unitData, position: u.position }));
    
    for (const enemyUnit of enemyUnits) {
      const result = unitController.processUnitTurn(
        enemyUnit.unitData,
        enemyUnit.position,
        unitsForAI
      );
      
      const enemyIndex = newUnits.findIndex(u => u.id === enemyUnit.id);
      if (enemyIndex === -1) continue;
      
      // Handle movement
      if (result.newPosition) {
        newUnits[enemyIndex] = {
          ...newUnits[enemyIndex],
          position: result.newPosition,
          state: UnitState.MOVING
        };
        
        // Update the AI's perception of unit positions
        const unitAIIndex = unitsForAI.findIndex(u => u.unit.id === enemyUnit.unitData.id);
        if (unitAIIndex !== -1) {
          unitsForAI[unitAIIndex].position = result.newPosition;
        }
        
        logMessages.push(`${enemyUnit.unitData.name} moved to (${result.newPosition.x}, ${result.newPosition.y})`);
      }
      
      // Handle combat
      if (result.combatOccurred && result.targetUnit) {
        const targetIndex = newUnits.findIndex(u => u.unitData.id === result.targetUnit!.id);
        
        if (targetIndex !== -1) {
          // Apply damage (simplified for now)
          const damage = Math.max(1, enemyUnit.unitData.attackPower - newUnits[targetIndex].unitData.defense);
          newUnits[targetIndex].health -= damage;
          
          logMessages.push(`${enemyUnit.unitData.name} attacked ${newUnits[targetIndex].unitData.name} for ${damage} damage!`);
          
          // Check if target was killed
          if (newUnits[targetIndex].health <= 0) {
            logMessages.push(`${newUnits[targetIndex].unitData.name} was defeated!`);
            newUnits.splice(targetIndex, 1);
          }
        }
      }
    }
    
    // Update units and log
    setUnits(newUnits);
    
    // Add messages to log
    setCombatLog(prevLog => [...logMessages, ...prevLog.slice(0, 10 - logMessages.length)]);
    
    // End AI turn
    setPlayerTurn(true);
    setTurn(turn + 1);
    
    // Check win/loss conditions
    checkGameEndCondition(newUnits);
  }, [unitController, units, turn, map]);
  
  // End player turn and start AI turn
  const endPlayerTurn = useCallback(() => {
    setPlayerTurn(false);
    setSelectedUnit(null);
    setSelectedTile(null);
    setCurrentPath(null);
    
    // Add a small delay before AI turn for better UX
    setTimeout(processAITurn, 500);
  }, [processAITurn]);
  
  // Check if game has ended
  const checkGameEndCondition = useCallback((currentUnits: Unit[]) => {
    const playerUnits = currentUnits.filter(u => u.unitData.faction === Faction.PLAYER);
    const enemyUnits = currentUnits.filter(u => u.unitData.faction === Faction.ENEMY);
    
    if (playerUnits.length === 0) {
      // Player lost
      toast({
        title: "Defeat!",
        description: "All your units have been defeated.",
        variant: "destructive",
      });
    } else if (enemyUnits.length === 0) {
      // Player won
      toast({
        title: "Victory!",
        description: "You've defeated all enemy units!",
        variant: "default",
      });
    }
  }, [toast]);

  // Set active unit
  const handleSetActiveUnit = useCallback((unit: Unit | null) => {
    // Only allow selecting player units during player turn
    if (unit && unit.unitData.faction === Faction.PLAYER && playerTurn) {
      setSelectedUnit(unit);
    } else {
      setSelectedUnit(null);
    }
  }, [playerTurn]);

  if (!map || !pathFinder) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Grid Wanderer AI & Combat</h1>
      
      <div className="flex flex-col items-center">
        <div className="mb-4 w-full max-w-3xl">
          <div className="bg-gray-800 text-white p-2 rounded-lg flex justify-between items-center">
            <div>
              <span className="font-bold">Turn: {turn}</span>
              <span className="ml-4 px-2 py-1 rounded bg-blue-600">
                {playerTurn ? "Player Turn" : "Enemy Turn"}
              </span>
            </div>
            {playerTurn && (
              <button 
                className="bg-green-600 hover:bg-green-700 text-white py-1 px-4 rounded-lg shadow"
                onClick={endPlayerTurn}
              >
                End Turn
              </button>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          {/* Game grid component */}
          <GameGrid
            map={map}
            selectedTile={selectedTile}
            setSelectedTile={setSelectedTile}
            currentPath={currentPath}
            tilesInRange={tilesInRange}
            units={units.map(u => ({
              id: u.id,
              position: u.position,
              unitTypeId: u.unitTypeId,
              color: u.color
            }))}
            hoveredTile={hoveredTile}
            setHoveredTile={setHoveredTile}
          />
        </div>
        
        <div className="mb-4 w-full max-w-3xl">
          {/* Game info and unit control component */}
          <GameInfo
            selectedTile={selectedTile}
            selectedUnit={selectedUnit?.unitData || null}
            setActiveUnit={(unitId: string | null) => {
              if (!unitId) {
                handleSetActiveUnit(null);
                return;
              }
              
              const unit = units.find(u => u.unitTypeId === unitId);
              if (unit) {
                handleSetActiveUnit(unit);
              }
            }}
            availableUnits={Object.values(UnitTypes)}
          />
        </div>
        
        {/* Movement controls */}
        <div className="mb-6">
          {currentPath && currentPath.length > 1 && playerTurn && (
            <button 
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg shadow"
              onClick={moveUnit}
            >
              {currentPath.length === 2 && units.some(u => 
                u.position.x === currentPath[1].x && 
                u.position.y === currentPath[1].y && 
                u.unitData.faction !== selectedUnit?.unitData.faction
              ) ? "Attack" : "Move Unit"}
            </button>
          )}
        </div>
        
        {/* Combat log */}
        <div className="bg-gray-800 text-gray-200 p-4 rounded-lg mb-4 max-w-3xl w-full">
          <h3 className="text-lg font-semibold mb-2">Combat Log</h3>
          <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
            {combatLog.map((log, index) => (
              <p key={index} className="border-b border-gray-700 pb-1">
                {log}
              </p>
            ))}
          </div>
        </div>
        
        {/* Unit details */}
        {selectedUnit && (
          <div className="bg-gray-800 text-gray-200 p-4 rounded-lg mb-4 max-w-3xl w-full">
            <h3 className="text-lg font-semibold mb-2">{selectedUnit.unitData.name} Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>Health: {selectedUnit.health}/{selectedUnit.unitData.maxHealth}</p>
                <p>Attack: {selectedUnit.unitData.attackPower}</p>
                <p>Defense: {selectedUnit.unitData.defense}</p>
              </div>
              <div>
                <p>Range: {selectedUnit.unitData.attackRange}</p>
                <p>Movement: {selectedUnit.unitData.movementPoints}</p>
                <p>Class: {selectedUnit.unitData.unitClass}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Debug info */}
        <div className="bg-gray-800 text-gray-200 p-4 rounded-lg mb-4 max-w-3xl w-full">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <div className="text-sm space-y-1">
            <p>
              Hover Position: {hoveredTile ? `(${hoveredTile.position.x}, ${hoveredTile.position.y})` : 'None'}
            </p>
            <p>
              Selected Unit: {selectedUnit ? selectedUnit.unitData.name : 'None'}
            </p>
            <p>
              Path Length: {currentPath ? currentPath.length : 0} 
              {currentPath && currentPath.length > 0 ? 
                ` - (${currentPath[0].x}, ${currentPath[0].y}) to (${currentPath[currentPath.length-1].x}, ${currentPath[currentPath.length-1].y})`
                : ''}
            </p>
            <p>
              Units Remaining: Player {units.filter(u => u.unitData.faction === Faction.PLAYER).length} / 
              Enemy {units.filter(u => u.unitData.faction === Faction.ENEMY).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameManager;
