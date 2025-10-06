
import React, { useState, useCallback } from 'react';
import { SimulationState, ScenarioInput, Entity } from './types';
import ScenarioSetup from './components/ScenarioSetup';
import SimulationScreen from './components/SimulationScreen';
import { ENTITY_COLORS } from './constants';
import './modules/moduleInitializer'; // Import to initialize modules
import { moduleRegistry } from './modules/moduleRegistry';
import { getLLMProvider } from './services/llm/providerFactory';

const App: React.FC = () => {
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMidPhaseLoading, setIsMidPhaseLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSimulationCreate = useCallback(async (scenarioInput: ScenarioInput) => {
    setLoadingMessage("Calibrating simulation parameters...");
    setIsLoading(true);
    setError(null);
    try {
      const module = moduleRegistry.get(scenarioInput.module);
      if (!module) {
        throw new Error(`Module '${scenarioInput.module}' not found`);
      }
      // Initialize the scenario using the AI service with the module's schema
  const llm = getLLMProvider();
      const systemInstruction = `You are a world-building AI for a dynamic simulation. Generate a complete, balanced, and interesting starting scenario based on the user's detailed input.
      - The first entity listed by the user will be user-controlled.
      - Module: ${scenarioInput.module}.
      - Interpret all the user's inputs to create a cohesive and thematic world.
      - Return the data strictly according to the provided JSON schema.`;

      const finalPrompt = `
        A user has designed a new scenario with the following components:

        1. Module: ${scenarioInput.module}
        2. Overview:
        "${scenarioInput.overview}"

        3. Entities:
        ${scenarioInput.entities.map(f => `- ${f.name}: ${f.description}`).join('\n')}

        4. Environment (Where):
        "${scenarioInput.environment}"

        5. Dimensionality (When):
        - Start Date: ${scenarioInput.dimensionality.startDate}
        - Time Per Phase: ${scenarioInput.dimensionality.timePerPhase}
        - Context: ${scenarioInput.dimensionality.historicalContext}

        6. Optional Rules:
        "${scenarioInput.rules || 'No special rules provided.'}"

        Now, using all of this information, generate the complete starting scenario JSON.
      `;

      const initialState = await llm.generateJson<any>({
        prompt: finalPrompt,
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: module.getScenarioSchema(scenarioInput),
      });

      // Get module-specific initialization data
  const moduleData = await module.initializeScenario(scenarioInput, initialState);

      const entitiesWithDetails: Entity[] = initialState.entities.map((entity: any, index: number) => {
        const resourcesObject = entity.resources.reduce((acc: any, resource: any) => {
          acc[resource.name] = resource.value;
          return acc;
        }, {} as { [key: string]: number });

        return {
          ...entity,
          id: index,
          isPlayer: index === 0, // Designate the first entity as the player
          color: ENTITY_COLORS[index % ENTITY_COLORS.length],
          resources: resourcesObject
        }
      });

      const finalSimulationState: SimulationState = {
        module: scenarioInput.module,
        worldName: moduleData.worldName || initialState.worldName,
        worldDescription: moduleData.worldDescription || initialState.worldDescription,
        entities: entitiesWithDetails,
        phase: 1,
        log: [`Simulation for scenario '${moduleData.worldName || initialState.worldName}' initialized. [${scenarioInput.dimensionality.startDate}] Phase 1 begins.`],
        gameOver: false,
        advancedSettings: scenarioInput.settings,
        dimensionality: scenarioInput.dimensionality,
        ...moduleData, // Include module-specific data (map, abstractState, etc.)
      };

      setSimulationState(finalSimulationState);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error && e.message.includes('API_KEY')
        ? `${e.message}`
        : 'Simulation initialization failed. The core logic is unstable. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePhaseAdvance = useCallback(async (command: string) => {
    if (!simulationState) return;
    setLoadingMessage("Processing phase events and resolving outcomes...");
    setIsLoading(true);
    setError(null);
    try {
      const module = moduleRegistry.get(simulationState.module);
      if (!module) {
        throw new Error(`Module '${simulationState.module}' not found`);
      }

      // Get module-specific phase resolution data
      const moduleData = await module.resolvePhase(simulationState, command, null);

      const entities = moduleData.entities ?? simulationState.entities;
      const normalizedEntities: Entity[] = entities.map((entityUpdate: any, index: number) => {
        const resourcesSource = Array.isArray(entityUpdate.resources)
          ? entityUpdate.resources
          : Object.entries(entityUpdate.resources ?? {}).map(([name, value]) => ({ name, value }));

        const resourcesObject = (resourcesSource as Array<{ name: string; value: number }>).reduce(
          (acc: Record<string, number>, resource) => {
            if (resource && typeof resource.name === 'string' && typeof resource.value === 'number') {
              acc[resource.name] = resource.value;
            }
            return acc;
          },
          {}
        );

        const fallbackEntity: Entity = simulationState.entities[index] ?? {
          id: index,
          name: entityUpdate.name ?? `Entity ${index + 1}`,
          description: entityUpdate.description ?? '',
          isPlayer: Boolean(entityUpdate.isPlayer && entityUpdate.isPlayer !== false),
          color: ENTITY_COLORS[index % ENTITY_COLORS.length],
          resources: {},
        };

        return {
          ...fallbackEntity,
          ...entityUpdate,
          resources: resourcesObject,
        };
      });

      const mergedLogEntries = moduleData.log && moduleData.log.length > 0 ? moduleData.log : ['Phase advanced.'];
      const newSimulationState: SimulationState = {
        ...simulationState,
        ...moduleData,
        entities: normalizedEntities,
        map: moduleData.map ?? simulationState.map,
        phase: simulationState.phase + 1,
        log: [...mergedLogEntries, ...simulationState.log],
        gameOver: moduleData.gameOver ?? simulationState.gameOver,
        winner: moduleData.winner ?? simulationState.winner,
      };

      setSimulationState(newSimulationState);

    } catch (e) {
      console.error(e);
      const message = e instanceof Error && e.message.includes('API_KEY')
        ? `${e.message}`
        : 'A processing anomaly occurred. The phase could not be resolved. Please try another command.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [simulationState]);

  const handleCommunicationSubmit = useCallback(async (targetEntityId: number, message: string) => {
    if (!simulationState) return;
    setLoadingMessage("Transmitting communication...");
    setIsMidPhaseLoading(true);
    setError(null);
    try {
      const module = moduleRegistry.get(simulationState.module);
      if (!module || !module.canHandleCommunication() || !module.handleCommunication) {
        throw new Error("Communication not supported by this module");
      }

      const result = await module.handleCommunication(simulationState, targetEntityId, message, null);

      setSimulationState(prev => prev ? ({ ...prev, log: [result.logEntry, ...prev.log] }) : null);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error && e.message.includes('API_KEY')
        ? `${e.message}`
        : "Your message was not delivered. The communication attempt failed.";
      setError(message);
    } finally {
      setIsMidPhaseLoading(false);
    }
  }, [simulationState]);

  const handleAnalysisSubmit = useCallback(async (question: string) => {
    if (!simulationState) return;
    setLoadingMessage("The AI consultant is analyzing the data...");
    setIsMidPhaseLoading(true);
    setError(null);
    try {
      const module = moduleRegistry.get(simulationState.module);
      if (!module || !module.canHandleAnalysis() || !module.handleAnalysis) {
        throw new Error("Analysis not supported by this module");
      }

      const result = await module.handleAnalysis(simulationState, question, null);

      setSimulationState(prev => prev ? ({ ...prev, log: [result.logEntry, ...prev.log] }) : null);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error && e.message.includes('API_KEY')
        ? `${e.message}`
        : "The consultant is unavailable. Please try again later.";
      setError(message);
    } finally {
      setIsMidPhaseLoading(false);
    }
  }, [simulationState]);

  const loading = isLoading || isMidPhaseLoading;

  return (
    <div className="bg-slate-900 text-slate-200 min-h-screen">
      <header className="bg-slate-950/50 p-4 border-b border-slate-700/50 flex items-center justify-center">
        <h1 className="text-3xl font-bold font-cinzel text-amber-300 tracking-widest">ScrAI</h1>
      </header>
      <main className="p-4 md:p-8">
        {loading && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <svg className="animate-spin h-12 w-12 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-slate-300 font-cinzel text-center px-4">{loadingMessage}</p>
          </div>
        )}
        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg mb-4 text-center">
                <h3 className="font-bold">An Error Occurred</h3>
                <p>{error}</p>
                <button onClick={() => setError(null)} className="mt-2 text-sm font-semibold underline">Dismiss</button>
            </div>
        )}
        {!simulationState ? (
          <ScenarioSetup 
            onScenarioCreate={handleSimulationCreate}
          />
        ) : (
          <SimulationScreen 
            simulationState={simulationState} 
            onPhaseAdvance={handlePhaseAdvance}
            onCommunicationSubmit={handleCommunicationSubmit}
            onAnalysisSubmit={handleAnalysisSubmit}
          />
        )}
      </main>
    </div>
  );
};

export default App;
