import React from "react";
import { Tile } from "../services/MapGenerator";
import { UnitData } from "../models/UnitTypes";

interface GameInfoProps {
  selectedTile: Tile | null;
  selectedUnit: UnitData | null;
  setActiveUnit: (unitId: string | null) => void;
  availableUnits: UnitData[];
}

const GameInfo: React.FC<GameInfoProps> = ({
  selectedTile,
  selectedUnit,
  setActiveUnit,
  availableUnits
}) => {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg w-full">
      <h2 className="text-xl font-bold mb-3">Game Info</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Terrain Info */}
        <div className="bg-gray-700 p-3 rounded">
          <h3 className="text-lg font-semibold mb-2">Selected Terrain</h3>
          {selectedTile ? (
            <>
              <div className="flex items-center mb-1">
                <div 
                  className="w-4 h-4 mr-2 rounded" 
                  style={{ backgroundColor: selectedTile.terrain.color }}
                />
                <span>{selectedTile.terrain.displayName}</span>
              </div>
              
              <div className="mt-2 text-sm">
                <div>Movement Cost: {selectedTile.terrain.movementCost}</div>
                <div>Resource: {selectedTile.resource}</div>
                <div>Position: ({selectedTile.position.x}, {selectedTile.position.y})</div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 italic">No tile selected</p>
          )}
        </div>
        
        {/* Unit Controls */}
        <div className="bg-gray-700 p-3 rounded">
          <h3 className="text-lg font-semibold mb-2">Units</h3>
          
          {/* Currently selected unit */}
          {selectedUnit ? (
            <div className="mb-2">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 mr-2 rounded-full" 
                  style={{ backgroundColor: selectedUnit.color }}
                />
                <span>
                  {selectedUnit.name} ({selectedUnit.movementType})
                </span>
              </div>
              <div className="mt-1 text-sm">
                Movement Points: {selectedUnit.movementPoints}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic mb-2">No unit selected</p>
          )}
          
          {/* Unit selection */}
          <div className="mt-3">
            <p className="text-sm mb-1">Select Unit:</p>
            <div className="flex space-x-2">
              {availableUnits.map(unit => (
                <button
                  key={unit.id}
                  className={`px-2 py-1 text-xs rounded ${selectedUnit?.id === unit.id ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => setActiveUnit(unit.id)}
                >
                  {unit.name}
                </button>
              ))}
              {selectedUnit && (
                <button
                  className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-red-700"
                  onClick={() => setActiveUnit(null)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-300">
        <p>Click on a unit to select it, then click on a destination tile to move.</p>
        <p>
          <span className="inline-block w-3 h-3 bg-blue-300 opacity-50 mr-1 align-text-bottom"></span> 
          Shows movement range
          <span className="inline-block w-3 h-3 bg-yellow-300 opacity-80 ml-3 mr-1 align-text-bottom"></span>
          Shows path
        </p>
      </div>
      
      {/* Game Controls Section */}
      <div className="mt-4 bg-gray-700 p-3 rounded">
        <h3 className="text-lg font-semibold mb-2">Game Controls</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>
            <span className="font-bold text-white">Left Click on Tile:</span> 
            Select terrain and view its details
          </li>
          <li>
            <span className="font-bold text-white">Left Click on Unit:</span> 
            Select a unit and show its movement range
          </li>
          <li>
            <span className="font-bold text-white">Move Unit:</span> 
            Click on a highlighted tile within the blue movement range
          </li>
          <li>
            <span className="font-bold text-white">Clear Unit Selection:</span> 
            Click the "Clear" button in the Unit Controls section
          </li>
        </ul>
        <div className="mt-3 text-xs text-gray-400 italic">
          Tip: Hover over tiles to preview potential movement paths
        </div>
      </div>
    </div>
  );
};

export default GameInfo;
