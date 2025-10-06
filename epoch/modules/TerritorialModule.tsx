import React from 'react';
import { Type } from "@google/genai";
import { SimulationModule } from './interfaces';
import { ScenarioInput, SimulationState, MapCell } from '../types';
import { MAP_DIMENSIONS } from '../constants';
import MapView from '../components/MapView';
import { getLLMProvider } from '../services/llm/providerFactory';

// Schema definitions (extracted from geminiService.ts for Territorial module)
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
    map: {
      type: Type.ARRAY,
      description: `A ${MAP_DIMENSIONS.height}x${MAP_DIMENSIONS.width} grid representing the world map.`,
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            entityId: { type: Type.INTEGER, description: 'The index of the controlling entity in the entities array, or -1 for neutral/unclaimed territory.' },
            terrain: { type: Type.STRING, description: 'One of: plains, forest, mountain, water.' }
          },
          required: ['entityId', 'terrain']
        }
      }
    }
  },
  required: ['worldName', 'worldDescription', 'entities', 'map']
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
        updatedMap: {
            type: Type.ARRAY,
            description: `The entire ${MAP_DIMENSIONS.height}x${MAP_DIMENSIONS.width} map grid, updated to reflect territorial changes.`,
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        entityId: { type: Type.INTEGER, description: 'The new controlling entity index, or -1 for neutral.' },
                        terrain: { type: Type.STRING, description: 'The terrain of the cell (should not change from input). One of: plains, forest, mountain, water.' }
                    },
                    required: ['entityId', 'terrain']
                }
            }
        },
        gameOver: { type: Type.BOOLEAN, description: 'Set to true if a winning or losing condition has been met according to the scenario\'s context.' },
        winner: { type: Type.STRING, nullable: true, description: 'The name of the winning entity if gameOver is true, otherwise null.' }
    },
    required: ['logEntry', 'updatedEntities', 'updatedMap', 'gameOver']
};

const simpleLogSchema = {
    type: Type.OBJECT,
    properties: {
        logEntry: { type: Type.STRING, description: 'A narrative summary of the outcome of this interaction, written in a compelling, story-like manner for the simulation log.' },
    },
    required: ['logEntry']
};

class TerritorialModule implements SimulationModule {
  name = 'Territorial';
  simulationType = 'phase-based' as const;

  getScenarioSchema(scenarioInput: ScenarioInput) {
    return scenarioSchema;
  }

  getPhaseResolutionSchema(simulationState: SimulationState) {
    return phaseResolutionSchema;
  }

  async initializeScenario(scenarioInput: ScenarioInput, aiResponse: any): Promise<Partial<SimulationState>> {
    const systemInstruction = `You are a world-building AI for a dynamic simulation. Generate a complete, balanced, and interesting starting scenario based on the user's detailed input.
    - The first entity listed by the user will be user-controlled.
    - This is a Territorial simulation. Generate a map that is ${MAP_DIMENSIONS.height} rows and ${MAP_DIMENSIONS.width} columns. Entity territories should be somewhat clustered.
    - For ALL entities, dynamically create 2-4 thematically appropriate resource types and return them as an array of name-value pair objects (e.g., [{name: 'Souls', value: 100}]).
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
      const result = aiResponse ?? await llm.generateJson<any>({
        prompt: finalPrompt,
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: scenarioSchema,
      });

      const mapWithEntityNulls: MapCell[][] = Array.isArray(result.map)
        ? result.map.map((row: any) =>
            Array.isArray(row)
              ? row.map((cell: any) => ({
                  ...cell,
                  entityId: cell.entityId === -1 ? null : cell.entityId,
                }))
              : []
          )
        : [];

      return {
        worldName: result.worldName ?? '',
        worldDescription: result.worldDescription ?? '',
        map: mapWithEntityNulls
      };
  }

  async resolvePhase(simulationState: SimulationState, playerCommand: string, aiResponse: any): Promise<Partial<SimulationState>> {
    const playerEntity = simulationState.entities.find(f => f.isPlayer);
    if (!playerEntity) throw new Error("User-controlled entity not found.");

    const systemInstruction = `You are the Simulation Core AI. Your role is to resolve a simulation turn (phase).
    - Module: Territorial
    - You will receive the current simulation state, settings, and the user's command.
    - Each phase represents "${simulationState.dimensionality.timePerPhase}".
    - Based on the 'eventFrequency' setting (1=rare, 10=constant), decide if a random world event, opportunity, or crisis occurs. Describe it vividly in the log entry.
    - For each non-player entity, generate a plausible, strategic command. Their behavior should be guided by the 'aiAggressiveness' setting (1=passive, 10=warmongering) and their description.
    - Resolve all actions simultaneously (the user's, the AI's, and any world events).
    - Update entity resources based on outcomes.
    - Update the map based on actions. A successful attack might change a map cell's entityId.
    - Write a single, compelling narrative summary of ALL events that occurred. This is the log entry.
    - Terrain must not be changed. Return the updated state strictly according to the provided JSON schema.`;

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

      const mapWithEntityNulls: MapCell[][] = Array.isArray(result.updatedMap)
        ? result.updatedMap.map((row: any) =>
            Array.isArray(row)
              ? row.map((cell: any) => ({
                  terrain: cell?.terrain ?? 'plains',
                  entityId: cell?.entityId === -1 ? null : cell?.entityId ?? null,
                }))
              : []
          )
        : simulationState.map ?? [];

      return {
        log: [result.logEntry ?? 'Phase resolved.'],
        entities: result.updatedEntities ?? simulationState.entities,
        map: mapWithEntityNulls,
        gameOver: typeof result.gameOver === 'boolean' ? result.gameOver : simulationState.gameOver,
        winner: result.winner ?? simulationState.winner,
      };
  }

  canHandleCommunication(): boolean {
    return true;
  }

  canHandleAnalysis(): boolean {
    return true;
  }

  getCommunicationSchema(simulationState: SimulationState) {
    return simpleLogSchema;
  }

  getAnalysisSchema(simulationState: SimulationState) {
    return simpleLogSchema;
  }

  async handleCommunication(simulationState: SimulationState, targetEntityId: number, message: string, aiResponse: any): Promise<{ logEntry: string }> {
    const playerEntity = simulationState.entities.find(f => f.isPlayer);
    const targetEntity = simulationState.entities.find(f => f.id === targetEntityId);
  if (!playerEntity || !targetEntity) throw new Error("Entity not found.");

    const systemInstruction = `You are the Simulation Core AI. The user is sending a message to another entity.
    - You will receive the simulation state and the message.
    - Adopt the persona of the target entity (${targetEntity.name}) and write a short, in-character response based on their description, the current state, and the user's message.
    - Create a log entry that summarizes the interaction. It should start with "[Communication]". For example: "[Communication] A message was sent to the ${targetEntity.name}. Their terse reply suggests they are not interested in an alliance."
    - Return only the JSON object with the log entry.`;

    const prompt = `
    Current simulation state: ${JSON.stringify(simulationState, null, 2)}
    User Entity (${playerEntity.name}) sends the following message to ${targetEntity.name}: "${message}"

    Generate the response and craft the log entry.
    `;

    const llm = getLLMProvider();
    const result = aiResponse ?? await llm.generateJson<{ logEntry: string }>({
      prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: simpleLogSchema,
    });

    return result;
  }

  async handleAnalysis(simulationState: SimulationState, question: string, aiResponse: any): Promise<{ logEntry: string }> {
    const playerEntity = simulationState.entities.find(f => f.isPlayer);
    if (!playerEntity) throw new Error("User-controlled entity not found.");

    const systemInstruction = `You are the Simulation Core AI, acting as a wise, analytical consultant for the user's entity, the ${playerEntity.name}.
    - The user will ask you a question.
    - Based on the current simulation state, provide a short, insightful, and strategic response. You can offer advice, reveal a potential opportunity, or warn of a hidden danger. Your response should be helpful but not all-knowing.
    - Create a log entry that summarizes the consultation. It should start with "[Analysis]". For example: "[Analysis] When asked about the western border, the analysis indicated that the Silent Cult's recent movements might be a prelude to an invasion."
    - Return only the JSON object with the log entry.`;

    const prompt = `
    Current simulation state: ${JSON.stringify(simulationState, null, 2)}
    The user, controller of the ${playerEntity.name}, asks: "${question}"

    Provide a response and craft the log entry.
    `;

    const llm = getLLMProvider();
    const result = aiResponse ?? await llm.generateJson<{ logEntry: string }>({
      prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: simpleLogSchema,
    });

    return result;
  }

  renderUI(simulationState: SimulationState, uiProps: any) {
    if (!simulationState.map) {
      return <div className="text-center text-slate-500">No territorial state to display.</div>;
    }

    return <MapView map={simulationState.map} entities={simulationState.entities} />;
  }
}

export const territorialModule = new TerritorialModule();
