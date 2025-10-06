import React from 'react';
import { Type } from "@google/genai";
import { SimulationModule } from './interfaces';
import { ScenarioInput, SimulationState } from '../types';
import AbstractStateView from '../components/AbstractStateView';
import { getLLMProvider } from '../services/llm/providerFactory';

// Schema definitions (extracted from geminiService.ts for Narrative module)
const resourceSchema = {
    type: Type.ARRAY,
    description: 'An array of 2-4 thematically appropriate resource objects.',
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: 'The name of the resource (e.g., Gold, Credibility).' },
            value: { type: Type.INTEGER, description: 'The integer value of the resource.' }
        },
        required: ['name', 'value']
    }
};

const abstractStateSchema = {
    type: Type.ARRAY,
    description: 'An array of key-value pairs representing the state of an abstract scenario.',
    items: {
        type: Type.OBJECT,
        properties: {
            key: { type: Type.STRING, description: 'The key for the state variable (e.g., \'Debate Topic\').' },
            value: { type: Type.STRING, description: 'The value for the state variable (can be string or number, returned as a string).' }
        },
        required: ['key', 'value']
    }
};

const scenarioSchema = {
  type: Type.OBJECT,
  properties: {
    worldName: { type: Type.STRING, description: 'A creative and evocative name for the scenario.' },
    worldDescription: { type: Type.STRING, description: 'A one-paragraph summary of the scenario\'s setting, derived from the user\'s overview and environment description.' },
    entities: {
      type: Type.ARRAY,
      description: 'A list of the entities provided by the user, expanded with balanced starting resources.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'The name of the entity.' },
          description: { type: Type.STRING, description: 'The description of the entity provided by the user.' },
          resources: { ...resourceSchema, description: 'An array of 2-4 thematically appropriate resource objects with their starting integer values (between 50-150).' }
        },
        required: ['name', 'description', 'resources']
      }
    },
    abstractState: { ...abstractStateSchema, description: 'An array of key-value pairs for the initial state of an abstract scenario.' }
  },
  required: ['worldName', 'worldDescription', 'entities', 'abstractState']
};

const phaseResolutionSchema = {
    type: Type.OBJECT,
    properties: {
        logEntry: { type: Type.STRING, description: 'A narrative summary of the events of this phase, written in a compelling, story-like manner. This should include the outcomes of all entity actions and any emergent world events.' },
        updatedEntities: {
            type: Type.ARRAY,
            description: 'The complete list of entities with their properties (like resources) updated based on the phase events.',
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    resources: resourceSchema
                },
                required: ['name', 'description', 'resources']
            }
        },
        updatedAbstractState: { ...abstractStateSchema, description: 'The updated array of key-value pairs for an abstract scenario.' },
        gameOver: { type: Type.BOOLEAN, description: 'Set to true if a winning or losing condition has been met according to the scenario\'s context.' },
        winner: { type: Type.STRING, nullable: true, description: 'The name of the winning entity if gameOver is true, otherwise null.' }
    },
    required: ['logEntry', 'updatedEntities', 'updatedAbstractState', 'gameOver']
};

class NarrativeModule implements SimulationModule {
  name = 'Narrative';
  simulationType = 'real-time' as const; // Changed to real-time as per requirements

  getScenarioSchema(scenarioInput: ScenarioInput) {
    return scenarioSchema;
  }

  getPhaseResolutionSchema(simulationState: SimulationState) {
    return phaseResolutionSchema;
  }

  async initializeScenario(scenarioInput: ScenarioInput, aiResponse: any): Promise<Partial<SimulationState>> {
    const systemInstruction = `You are a world-building AI for a dynamic simulation. Generate a complete, balanced, and interesting starting scenario based on the user's detailed input.
    - The first entity listed by the user will be user-controlled.
    - This is a Narrative simulation. Focus on creating a compelling opening scene.
    - Generate an 'abstractState' with 2-5 key-value pairs that establish the initial narrative situation (e.g., [{key: 'Current Mood', value: 'Tense'}, {key: 'Location', value: 'Throne Room'}]).
    - For the 'Observer' entity, create one or two simple, narrative-focused resources, like 'Clarity' or 'Suspicion'.
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

    const llm = getLLMProvider();
    const aiResult = aiResponse ?? await llm.generateJson<any>({
      prompt: finalPrompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: scenarioSchema,
    });

    // Convert abstractState array to object
  const initialAbstractStateArray = Array.isArray(aiResult.abstractState) ? aiResult.abstractState : [];
  const abstractStateObject = initialAbstractStateArray.reduce((acc: any, item: any) => {
    if (item && item.key) {
      acc[item.key] = item.value;
    }
    return acc;
  }, {} as { [key: string]: string | number | boolean });

    return {
      worldName: aiResult.worldName,
      worldDescription: aiResult.worldDescription,
      abstractState: abstractStateObject
    };
  }

  async resolvePhase(simulationState: SimulationState, playerCommand: string, aiResponse: any): Promise<Partial<SimulationState>> {
    const playerEntity = simulationState.entities.find(f => f.isPlayer);
    if (!playerEntity) throw new Error("User-controlled entity not found.");

    const systemInstruction = `You are the Simulation Core AI. Your role is to resolve a simulation turn (phase).
    - Module: Narrative
    - This is a Narrative simulation. The user's command is a story action.
    - Interpret the user's action and advance the narrative. Describe what happens next in a compelling way.
    - Update the 'abstractState' to reflect the new narrative situation.
    - Do NOT generate commands for other entities. Do not change entity resources unless the narrative makes it absolutely necessary.
    - Return the updated state strictly according to the provided JSON schema.
    `;

    const prompt = `
    Settings:
    - Event Frequency: ${simulationState.advancedSettings.eventFrequency}/10
    - AI Aggressiveness: ${simulationState.advancedSettings.aiAggressiveness}/10

    Current State:
    ${JSON.stringify({ ...simulationState, advancedSettings: undefined }, null, 2)}

    User Command for ${playerEntity.name}: "${playerCommand}"

    Now, resolve the phase and return the updated simulation state.
    `;

    const llm = getLLMProvider();
    const result = aiResponse ?? await llm.generateJson<any>({
      prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: phaseResolutionSchema,
    });

    // Convert abstractState array to object
  const updatedAbstractStateArray = Array.isArray(result.updatedAbstractState) ? result.updatedAbstractState : [];
  const abstractStateObject = updatedAbstractStateArray.reduce((acc: any, item: any) => {
    if (item && item.key) {
      acc[item.key] = item.value;
    }
    return acc;
  }, {} as { [key: string]: string | number | boolean });

    return {
      log: [result.logEntry],
      entities: result.updatedEntities,
      abstractState: abstractStateObject,
      gameOver: result.gameOver,
      winner: result.winner
    };
  }

  canHandleCommunication(): boolean {
    return false; // Narrative module doesn't support communication in phase-based mode
  }

  canHandleAnalysis(): boolean {
    return false; // Narrative module doesn't support analysis in phase-based mode
  }

  // Communication and analysis are not implemented for real-time narrative module
  // These would be handled differently in real-time mode

  renderUI(simulationState: SimulationState, uiProps: any) {
    if (!simulationState.abstractState) {
      return <div className="text-center text-slate-500">No abstract state to display.</div>;
    }

    return <AbstractStateView abstractState={simulationState.abstractState} />;
  }
}

export const narrativeModule = new NarrativeModule();
