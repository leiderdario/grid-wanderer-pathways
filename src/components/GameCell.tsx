
import React from "react";
import { Tile } from "../services/MapGenerator";
import { ResourceOverlays } from "../models/TerrainTypes";
import { cn } from "@/lib/utils";

interface GameCellProps {
  tile: Tile;
  isSelected: boolean;
  isPath: boolean;
  isInRange: boolean;
  isUnitPresent: boolean;
  unitColor?: string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const GameCell: React.FC<GameCellProps> = ({
  tile,
  isSelected,
  isPath,
  isInRange,
  isUnitPresent,
  unitColor,
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const { terrain, resource } = tile;
  const resourceOverlay = ResourceOverlays[resource];

  return (
    <div
      className={cn(
        "relative w-8 h-8 border border-gray-800/20 flex items-center justify-center cursor-pointer transition-all",
        isSelected && "ring-2 ring-white ring-opacity-80",
        isPath && "ring-2 ring-yellow-300 ring-opacity-80",
        isInRange && !isPath && "ring-1 ring-blue-300 ring-opacity-50"
      )}
      style={{ backgroundColor: terrain.color }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Resource overlay */}
      {resource !== "none" && (
        <div 
          className="absolute inset-0 opacity-60 flex items-center justify-center"
          style={{ backgroundColor: resourceOverlay.color }}
        >
          <span className="text-xs font-bold text-white">
            {resource === "minerals" ? "M" : "F"}
          </span>
        </div>
      )}
      
      {/* Unit marker */}
      {isUnitPresent && (
        <div 
          className="absolute inset-1 rounded-full"
          style={{ backgroundColor: unitColor || "red" }}
        />
      )}
    </div>
  );
};

export default GameCell;
