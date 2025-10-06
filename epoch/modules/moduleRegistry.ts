import { SimulationModule } from './interfaces';

class ModuleRegistry {
  private modules: Map<string, SimulationModule> = new Map();

  register(module: SimulationModule): void {
    this.modules.set(module.name, module);
  }

  get(moduleName: string): SimulationModule | undefined {
    return this.modules.get(moduleName);
  }

  getAll(): SimulationModule[] {
    return Array.from(this.modules.values());
  }

  has(moduleName: string): boolean {
    return this.modules.has(moduleName);
  }

  listNames(): string[] {
    return Array.from(this.modules.keys());
  }
}

export const moduleRegistry = new ModuleRegistry();
