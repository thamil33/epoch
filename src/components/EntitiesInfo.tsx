import React, { useState } from 'react';
import { Entity } from '../types';
import { XIcon, ChevronDownIcon, ChevronUpIcon, UsersIcon } from './icons';

interface EntitiesInfoProps {
  entities: Entity[];
  onClose: () => void;
}

const EntitiesInfo: React.FC<EntitiesInfoProps> = ({ entities, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold py-2 px-4 rounded-lg shadow-lg border border-slate-600"
        >
          <UsersIcon className="w-5 h-5 mr-2" />
          Known Entities
          <ChevronUpIcon className="w-5 h-5 ml-2" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-40"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-2xl font-cinzel text-slate-100">Known Entities</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-amber-300 transition-colors">
                <ChevronDownIcon className="w-6 h-6" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-amber-300 transition-colors">
                <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {entities.map(entity => (
            <div key={entity.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 flex flex-col">
              <h3 className={`text-xl font-bold font-cinzel ${entity.color.replace('bg-', 'text-')}`}>{entity.name}{entity.isPlayer && ' (User)'}</h3>
              <p className="text-sm text-slate-400 italic mt-1 mb-4 flex-grow">{entity.description}</p>
              <div className="mt-auto grid grid-cols-3 gap-4 text-center border-t border-slate-700 pt-4">
                {Object.entries(entity.resources).map(([key, value]) => (
                    <div key={key}>
                        <p className="text-xs uppercase text-slate-400 tracking-wider">{key}</p>
                        <p className="text-xl font-bold text-slate-100">{value}</p>
                    </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntitiesInfo;