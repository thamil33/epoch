
import React from 'react';
import { Entity, MapCell } from '../types';

interface MapViewProps {
  map: MapCell[][];
  entities: Entity[];
}

const MapView: React.FC<MapViewProps> = ({ map, entities }) => {

  return (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <div className="w-full aspect-video bg-slate-800/60 flex items-center justify-center rounded-md border-2 border-dashed border-slate-700">
          <p className="text-slate-500 font-semibold tracking-wider">Interactive Map Placeholder</p>
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
            {entities.map(entity => (
                <div key={entity.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${entity.color}`}></div>
                    <span className="text-sm text-slate-300">{entity.name}{entity.isPlayer && ' (User)'}</span>
                </div>
            ))}
             <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-700/50"></div>
                <span className="text-sm text-slate-300">Neutral</span>
            </div>
        </div>
    </div>
  );
};

export default MapView;
