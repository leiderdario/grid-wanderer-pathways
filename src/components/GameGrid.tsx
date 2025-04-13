
import React from "react";
import GameCell from "./GameCell";
import { GameMap, Tile } from "../services/MapGenerator";
import { GridPosition, posToKey } from "@/lib/gridUtils";

interface Unit {
  id: string;
  position: GridPosition;
  unitTypeId: string;
  color: string;
}

interface GameGridProps {
  map: GameMap;
  selectedTile: Tile | null;
  setSelectedTile: (tile: Tile | null) => void;
  currentPath: GridPosition[] | null;
  tilesInRange: Map<string, number>;
  units: Unit[];
  hoveredTile: Tile | null;
  setHoveredTile: (tile: Tile | null) => void;
}

const GameGrid: React.FC<GameGridProps> = ({
  map,
  selectedTile,
  setSelectedTile,
  currentPath,
  tilesInRange,
  units,
  hoveredTile,
  setHoveredTile
}) => {
  // Function to handle cell click
  const handleCellClick = (tile: Tile) => {
    setSelectedTile(tile);
  };

  // Function to find a unit at a position
  const findUnitAtPosition = (pos: GridPosition): Unit | undefined => {
    return units.find(
      unit => unit.position.x === pos.x && unit.position.y === pos.y
    );
  };

  // Function to check if position is in path
  const isPositionInPath = (pos: GridPosition): boolean => {
    if (!currentPath) return false;
    return currentPath.some(pathPos => pathPos.x === pos.x && pathPos.y === pos.y);
  };

  return (
    <div className="inline-block bg-gray-900 p-2 rounded-lg">
      <div className="grid grid-cols-20 gap-0">
        {map.tiles.map((row, y) => (
          <React.Fragment key={y}>
            {row.map((tile, x) => {
              const unit = findUnitAtPosition(tile.position);
              const isSelected = selectedTile?.position.x === x && selectedTile?.position.y === y;
              const isPath = isPositionInPath(tile.position);
              const posKey = posToKey(tile.position);
              const isInRange = tilesInRange.has(posKey);

              return (
                <GameCell
                  key={`${x}-${y}`}
                  tile={tile}
                  isSelected={isSelected}
                  isPath={isPath}
                  isInRange={isInRange}
                  isUnitPresent={!!unit}
                  unitColor={unit?.color}
                  onClick={() => handleCellClick(tile)}
                  onMouseEnter={() => setHoveredTile(tile)}
                  onMouseLeave={() => setHoveredTile(null)}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default GameGrid;
