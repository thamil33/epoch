import React, { useState } from 'react';
import { SimulationState } from '../types';
import EntitiesInfo from './EntitiesInfo';
import CommunicationModal from './CommunicationModal';
import AnalysisModal from './AnalysisModal';
import { CommandIcon, UsersIcon, ScrollIcon, BrainCircuitIcon } from './icons';
import { moduleRegistry } from '../modules/moduleRegistry';

interface SimulationScreenProps {
  simulationState: SimulationState;
  onPhaseAdvance: (command: string) => void;
  onCommunicationSubmit: (targetEntityId: number, message: string) => void;
  onAnalysisSubmit: (question: string) => void;
}

const SimulationScreen: React.FC<SimulationScreenProps> = ({ simulationState, onPhaseAdvance, onCommunicationSubmit, onAnalysisSubmit }) => {
  const [command, setCommand] = useState('');
  const [isEntitiesModalOpen, setIsEntitiesModalOpen] = useState(false);
  const [isCommunicationModalOpen, setIsCommunicationModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const playerEntity = simulationState.entities.find(f => f.isPlayer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      onPhaseAdvance(command.trim());
      setCommand('');
    }
  };

  if (simulationState.gameOver) {
      return (
          <div className="text-center max-w-2xl mx-auto bg-slate-800 p-8 rounded-lg border border-amber-400/50 shadow-lg">
              <h2 className="text-4xl font-cinzel text-amber-300">The Simulation has Concluded</h2>
              <p className="text-2xl mt-4 text-slate-200">
                {simulationState.winner ? `Optimal outcome achieved by ${simulationState.winner}!` : "The simulation has reached a terminal state."}
              </p>
              <p className="mt-6 text-slate-400">The final log entry reads:</p>
              <blockquote className="mt-2 border-l-4 border-slate-600 pl-4 italic text-slate-300">
                {simulationState.log[0]}
              </blockquote>
          </div>
      )
  }

  const renderMainView = () => {
    const module = moduleRegistry.get(simulationState.module);
    if (module) {
      return module.renderUI(simulationState, {});
    }
    return <div className="text-center text-slate-500">No state to display.</div>;
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Map/State and Sim Info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h2 className="text-xl font-cinzel text-slate-200">Scenario: {simulationState.worldName} - Phase {simulationState.phase}</h2>
              <p className="text-sm text-slate-400 mt-1">{simulationState.worldDescription}</p>
              <div className="text-xs mt-2 text-slate-400/80 font-semibold grid grid-cols-2 gap-x-4">
                  <p>START DATE: <span className="text-amber-300/80">{simulationState.dimensionality.startDate}</span></p>
                  <p>TIME PER PHASE: <span className="text-amber-300/80">{simulationState.dimensionality.timePerPhase}</span></p>
              </div>
          </div>
          {renderMainView()}
        </div>

        {/* Right Column: Player Controls and Log */}
        <div className="flex flex-col gap-6">
          {playerEntity && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`text-lg font-bold font-cinzel ${playerEntity.color.replace('bg-', 'text-')}`}>{playerEntity.name} (User)</h3>
                      <p className="text-sm text-slate-400 italic mt-1">{playerEntity.description}</p>
                    </div>
                    <button 
                        onClick={() => setIsEntitiesModalOpen(true)}
                        className="text-slate-400 hover:text-amber-300 transition-colors p-1 ml-2 flex-shrink-0"
                        aria-label="View all entities"
                    >
                        <UsersIcon className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                      {Object.entries(playerEntity.resources).map(([key, value]) => (
                          <div key={key}>
                              <p className="text-xs uppercase text-slate-400 tracking-wider">{key}</p>
                              <p className="text-xl font-bold text-slate-100">{value}</p>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-cinzel text-slate-200">Phase Input</h3>
                <div className="flex items-center gap-2">
                    {(() => {
                      const module = moduleRegistry.get(simulationState.module);
                      return (
                        <>
                          {module?.canHandleCommunication() && (
                            <button onClick={() => setIsCommunicationModalOpen(true)} className="p-1 text-slate-400 hover:text-amber-300 transition-colors" aria-label="Send Communication">
                                <ScrollIcon className="w-5 h-5" />
                            </button>
                          )}
                          {module?.canHandleAnalysis() && (
                            <button onClick={() => setIsAnalysisModalOpen(true)} className="p-1 text-slate-400 hover:text-amber-300 transition-colors" aria-label="Consult AI Analyst">
                                <BrainCircuitIcon className="w-5 h-5" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
              </div>
              <form onSubmit={handleSubmit}>
                  <textarea 
                      className="w-full h-24 bg-slate-900 border border-slate-600 rounded-md p-3 mt-2 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-colors text-sm"
                      placeholder={`Enter input for Phase ${simulationState.phase}...`}
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                  />
                  <button 
                      type="submit"
                      disabled={!command.trim()}
                      className="mt-2 w-full flex items-center justify-center bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                      <CommandIcon className="w-4 h-4 mr-2"/>
                      Advance Phase
                  </button>
              </form>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex-grow">
              <h3 className="font-cinzel text-slate-200 mb-2">Simulation Log</h3>
              <div className="h-96 overflow-y-auto pr-2 space-y-4">
                  {simulationState.log.map((entry, index) => {
                      const phaseNumber = simulationState.phase - index;
                      const title = phaseNumber > 1 ? `Phase ${phaseNumber - 1} Summary` : 'Initialization';
                      const isMidPhaseAction = entry.startsWith('[');
                      return (
                          <div key={index}>
                              <p className={`text-sm font-semibold ${isMidPhaseAction ? 'text-amber-400/80' : 'text-slate-400'}`}>{isMidPhaseAction ? `Phase ${simulationState.phase} Action` : title}</p>
                              <p className="text-slate-300 text-sm leading-relaxed">{entry}</p>
                          </div>
                      );
                  })}
              </div>
          </div>
        </div>
      </div>
      {isEntitiesModalOpen && (
        <EntitiesInfo
            entities={simulationState.entities}
            onClose={() => setIsEntitiesModalOpen(false)}
        />
      )}
      {isCommunicationModalOpen && (
        <CommunicationModal
            entities={simulationState.entities.filter(f => !f.isPlayer)}
            onClose={() => setIsCommunicationModalOpen(false)}
            onSubmit={onCommunicationSubmit}
        />
      )}
      {isAnalysisModalOpen && (
        <AnalysisModal
            onClose={() => setIsAnalysisModalOpen(false)}
            onSubmit={onAnalysisSubmit}
        />
      )}
    </>
  );
};

export default SimulationScreen;
