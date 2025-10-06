import React from 'react';
import { ModuleType, SimulationType, SimulationState, ScenarioInput } from '../types';

export interface SimulationModule {
  name: ModuleType;
  simulationType: SimulationType;
  getScenarioSchema: (scenarioInput: ScenarioInput) => any;
  initializeScenario: (scenarioInput: ScenarioInput, aiResponse: any) => Promise<Partial<SimulationState>>;
  getPhaseResolutionSchema: (simulationState: SimulationState) => any;
  resolvePhase: (simulationState: SimulationState, playerCommand: string, aiResponse: any) => Promise<Partial<SimulationState>>;
  canHandleCommunication: () => boolean;
  canHandleAnalysis: () => boolean;
  getCommunicationSchema?: (simulationState: SimulationState) => any;
  handleCommunication?: (simulationState: SimulationState, targetEntityId: number, message: string, aiResponse: any) => Promise<{ logEntry: string }>;
  getAnalysisSchema?: (simulationState: SimulationState) => any;
  handleAnalysis?: (simulationState: SimulationState, question: string, aiResponse: any) => Promise<{ logEntry: string }>;
  renderUI: (simulationState: SimulationState, uiProps: any) => React.JSX.Element;
}
