import { moduleRegistry } from './moduleRegistry';
import { territorialModule } from './TerritorialModule';
import { narrativeModule } from './NarrativeModule';

// Initialize and register all available simulation modules
export function initializeModules(): void {
  moduleRegistry.register(territorialModule);
  moduleRegistry.register(narrativeModule);
}

// Call initialization when this module is imported
initializeModules();
