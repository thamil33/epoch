# Project State – ScrAI

## Purpose and Vision
- **Goal:** Deliver an AI-guided simulation sandbox where players describe bespoke scenarios and guide outcomes through natural-language commands.
- **Experience:** Users configure a scenario (module selection, entities, environment, temporal context, optional rules) and iteratively advance phases while an LLM resolves world events.
- **Current Scope:** Two simulation modules ship today—`Territorial` for map-based strategy loops and `Narrative` for story-driven progressions. Both rely on Gemini-style JSON generation to produce initial states and resolve phases.

## Architecture Overview
- **Frontend stack:** React 19 + TypeScript 5.8, bundled by Vite 6. Styling leans on Tailwind-style utility classes (no Tailwind dependency yet—classnames are hard-coded).
- **Entry point:** `src/App.tsx` orchestrates scenario setup, simulation lifecycle, AI calls, and module-specific rendering. Root mounted in `src/index.tsx`.
- **State model:** Shared types in `src/types.ts` define simulation entities, resources, dimensionality, and module contracts. `SimulationState` is the single source of truth for the running scenario.
- **Module system:** `moduleRegistry` + `moduleInitializer` dynamically register `TerritorialModule` and `NarrativeModule`, each implementing the `SimulationModule` interface (`modules/interfaces.ts`). Modules encapsulate:
	- JSON schemas for LLM prompts (scenario initialization, phase resolution, optional communications/analysis).
	- Post-processing to normalize AI responses (e.g., map cell coercion, abstract-state flattening).
	- Feature toggles for communication/analysis routes and the module-specific UI renderer.
- **UI components:**
	- `ScenarioSetup` handles module selection, scenario authoring, advanced sliders, and template persistence (localStorage key `epochScraiTemplates`).
	- `SimulationScreen` presents the main loop, combines module-rendered views (`MapView`/`AbstractStateView`), player controls, command input, and log history. Optional modals (`EntitiesInfo`, `CommunicationModal`, `AnalysisModal`) expose side flows.
	- Visual surfaces such as `MapView` remain placeholders, signalling future interactivity work.

## Simulation & Data Flow
1. **Module selection:** `ScenarioSetup` pulls available module metadata from the registry and enforces module-specific validation rules (e.g., Territorial requires ≥2 entities).
2. **Initialization:** `App.handleSimulationCreate` acquires the selected module, sends a structured prompt to the configured LLM provider (`services/llm/providerFactory`), and passes the JSON response into `module.initializeScenario` for normalization + module-specific enrichment.
3. **State hydration:** Entities gain colors, IDs, and player assignments. Module-specific payloads (map grid or abstract state) merge into `SimulationState`, alongside initial log entries.
4. **Phase progression:** Player commands feed `module.resolvePhase`, which re-prompts the LLM with current state, command, and tuning settings (`eventFrequency`, `aiAggressiveness`). Returned partial state updates are merged and logged.
5. **Mid-phase actions:** Territorial module exposes opt-in `handleCommunication` and `handleAnalysis` flows; each wraps another JSON-schema-guarded LLM call and appends log entries prefixed with `[Communication]` or `[Analysis]`.
6. **Termination:** `gameOver`/`winner` flags propagate from module responses. UI renders a summary screen once true.

## AI / LLM Integration
- **Provider abstraction:** `services/llm/providerFactory.ts` dynamically instantiates either Gemini (`@google/genai`) or OpenAI-compatible providers, translating Gemini schemas to JSON Schema when needed (`schema.ts`). Provider choice is driven by `.env` variables parsed in `services/llm/config.ts`.
- **Environment requirements:**
	- `VITE_LLM_PROVIDER` (defaults to `gemini`).
	- Provider-specific keys (e.g., `VITE_GEMINI_API_KEY`, `VITE_OPENROUTER_API_KEY`). Missing Gemini keys throw immediately in `getGeminiClient`.
- **Caching:** Both provider factory and Gemini client cache singletons to avoid repeated setup.
- **Legacy surface:** `services/geminiService.ts` mirrors much of the module logic but is no longer referenced, indicating legacy API code that could be removed or aligned with the modular system to reduce drift.

## Frontend Experience
- **Loading UX:** Global overlay conveys progress text for initialization, phase resolution, communications, and analysis. Separate `isLoading`/`isMidPhaseLoading` flags prevent overlapping spinners.
- **Error handling:** Exceptions bubble into user-friendly banners. Special-cased messaging highlights missing API keys (`API_KEY` substring heuristic).
- **Persistence:** Scenario templates persist locally per module. No backend storage layer is present.
- **Accessibility considerations:** Focus management and keyboard handling are minimal (e.g., modals rely on click propagation). Future work could improve accessibility and screen-reader support.

## Build, Tooling, & Scripts
- **Package management:** Pure frontend workspace with Vite scripts (`dev`, `build`, `preview`). No test runner configured.
- **Dependencies:**
	- Runtime: `@google/genai`, `react`, `react-dom`, `zod`.
	- Dev: `@vitejs/plugin-react`, `typescript`, `vite`, `@types/node`.
- **Config files:**
	- `tsconfig.json` (not reviewed in detail—assumed Vite defaults with React JSX).
	- `vite.config.ts` expected to enable React plugin and environment variable exposure.
- **Assets/metadata:** `metadata.json` describes the app; may target Vercel/Edge-style deployments.

## Observed Strengths
- Clear separation between core app orchestration and module-specific logic, enabling future module expansion.
- Consistent JSON-schema enforcement increases reliability of LLM outputs and provides a path toward runtime validation.
- User guidance is strong: descriptive helper copy, module-specific validation, and advanced settings gating.
- Caching providers and schema conversion abstractions simplify multi-provider support.

## Risks & Gaps
- **LLM Dependence:** Every major action requires a successful JSON response; no offline fallback or graceful degradation exists.
- **Validation:** Incoming JSON is trusted after `JSON.parse`. There is no runtime schema validation (e.g., `zod`) to guarantee shape correctness before state updates, leaving room for crashes on malformed responses.
- **UI Placeholders:** `MapView` is non-interactive, so Territorial gameplay feedback is limited. Abstract states are read-only key/value pairs.
- **Testing Void:** No automated tests (unit, integration, or contract) exist, making regressions likely as modules evolve.
- **Error Surfacing:** Errors caught at the top level only expose minimal details; more granular logging or telemetry would aid debugging.
- **Dead Code:** `services/geminiService.ts` duplicates logic and risks divergence from the modular pipeline.
- **Security:** `.env` relies on build-time variables; there’s no guard against accidentally committing secrets (no `.env` in repo, but ensure `.gitignore` is configured). All requests originate client-side, so provider API keys are exposed to the browser unless proxied.

## Opportunities & Next Steps
1. **Implement runtime validation:** Use `zod` (already installed) to parse and validate LLM responses before mutating state.
2. **Enhance Territorial UX:** Replace the placeholder map with a render of `MapCell` data (e.g., canvas or grid visualization) and surface cell-level tooltips.
3. **Harden provider routing:** Consider server-side proxying to shield API keys, or integrate rate-limiting/backoff for quota errors.
4. **Expand module ecosystem:** Define a lightweight module authoring guide and explore additional modules (e.g., economic, diplomatic) using the existing interface.
5. **Introduce testing strategy:** Start with unit tests for provider factory/config parsing and component-level tests for ScenarioSetup validation logic.
6. **Unify legacy services:** Either delete `services/geminiService.ts` or refactor it into thin wrappers around the module interface to avoid drift.
7. **Accessibility polish:** Add focus trapping to modals, keyboard shortcuts for actions, and aria-label enhancements.
8. **Telemetry & analytics:** Track user commands and simulation outcomes (with consent) to inform balancing and feature prioritization.

## Status Summary
- **Core flow functional** (scenario creation → iterative phases with AI-driven outcomes).
- **No automated quality gates**; manual testing required.
- **Infrastructure light** (pure frontend; relies entirely on third-party LLM endpoints).
- **Documentation** kick-started with this report; future updates should capture roadmap progress and module additions.
