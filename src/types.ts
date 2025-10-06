
import React from 'react';

export type ModuleType = string; // Dynamic module type for extensibility

export type SimulationType = 'phase-based' | 'real-time';

export interface Entity {
  id: number;
  name: string;
  description: string;
  isPlayer: boolean;
  color: string;
  resources: {
    [key: string]: number;
  };
}

export interface MapCell {
  entityId: number | null;
  terrain: 'plains' | 'forest' | 'mountain' | 'water';
}

export interface AdvancedSettings {
  eventFrequency: number; // Scale of 1-10
  aiAggressiveness: number; // Scale of 1-10
}

export type HistoricalContext = 'Historical' | 'Semi-Historical' | 'Fictional';

export interface Dimensionality {
    startDate: string;
    timePerPhase: string;
    historicalContext: HistoricalContext;
}

export interface SimulationState {
  module: ModuleType;
  worldName: string;
  worldDescription: string;
  entities: Entity[];
  map?: MapCell[][];
  abstractState?: {
      [key: string]: string | number | boolean;
  };
  phase: number;
  log: string[];
  dimensionality: Dimensionality;
  gameOver: boolean;
  winner?: string;
  advancedSettings: AdvancedSettings;
}

export type ScenarioRepresentation = 'Territorial' | 'Abstract';

export interface ScenarioInput {
    module: ModuleType;
    overview: string;
    entities: { name: string; description: string }[];
    environment: string;
    dimensionality: Dimensionality;
    rules: string;
    representation: ScenarioRepresentation;
    settings: AdvancedSettings;
}

export interface Template {
  name: string;
  data: ScenarioInput;
}
