---
applyTo: '**'
---
# Project Source Code located in `src/`

# Important Files
- `src/App.tsx`: Main application component orchestrating scenario setup, simulation lifecycle, AI calls, and module-specific rendering.
- `src/index.tsx`: Entry point that mounts the root React component.
- `src/types.ts`: Shared types defining simulation entities, resources, dimensionality, and module contracts.
- `src/modules/`: Directory containing simulation modules like `TerritorialModule` and `NarrativeModule`, each implementing the `SimulationModule` interface.
- `src/components/`: Directory for UI components such as `ScenarioSetup`, `SimulationScreen`, `MapView`, and `AbstractStateView`.
- `src/services/llm/`: Directory for LLM provider abstractions and configurations, including `providerFactory.ts` and `config.ts`.
- `.env`: Environment configuration file for setting LLM provider and API keys. 
- `metadata.json`: Metadata file describing the app, potentially for deployment platforms like Vercel.
- `vite.config.ts`: Vite configuration file enabling React plugin and environment variable exposure.
- `tsconfig.json`: TypeScript configuration file (assumed to follow Vite defaults with React JSX).
- `package.json`: Project manifest file listing dependencies and scripts.

# Use analysis in `docs/project_state.md` as a living document—update it when modules evolve, tests get added, or LLM integration changes.
