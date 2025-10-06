
import React, { useState, useEffect } from 'react';
import { WorldIcon, XIcon, SaveIcon } from './icons';
import { AdvancedSettings, Dimensionality, HistoricalContext, ScenarioInput, ScenarioRepresentation, Template, ModuleType } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import { moduleRegistry } from '../modules/moduleRegistry';

interface ScenarioSetupProps {
  onScenarioCreate: (scenarioInput: ScenarioInput) => void;
}

const InputField: React.FC<{ label: string; children: React.ReactNode; description: string }> = ({ label, children, description }) => (
    <div className="mb-6">
        <label className="block text-lg font-cinzel text-slate-100 mb-1">{label}</label>
        <p className="text-sm text-slate-400 mb-2">{description}</p>
        {children}
    </div>
);

const ModuleCard: React.FC<{ title: string; description: string; onClick: () => void }> = ({ title, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg p-6 transition-all duration-200 transform hover:scale-105"
  >
    <h3 className="text-xl font-cinzel text-amber-300">{title}</h3>
    <p className="text-slate-400 mt-2">{description}</p>
  </button>
);


const ScenarioSetup: React.FC<ScenarioSetupProps> = ({ onScenarioCreate }) => {
  const [module, setModule] = useState<ModuleType | null>(null);
  const [overview, setOverview] = useState('');
  const [entities, setEntities] = useState<{name: string, description: string}[]>([]);
  const [currentEntityName, setCurrentEntityName] = useState('');
  const [currentEntityDesc, setCurrentEntityDesc] = useState('');
  const [environment, setEnvironment] = useState('');
  const [dimensionality, setDimensionality] = useState<Dimensionality>({
      startDate: '',
      timePerPhase: '',
      historicalContext: 'Fictional',
  });
  const [representation, setRepresentation] = useState<ScenarioRepresentation>('Territorial');
  const [rules, setRules] = useState('');
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('custom');

  useEffect(() => {
    try {
      const savedTemplatesRaw = localStorage.getItem('epochScraiTemplates');
      if (savedTemplatesRaw) {
        setTemplates(JSON.parse(savedTemplatesRaw));
      }
    } catch (error) {
      console.error("Failed to load templates from localStorage", error);
    }
  }, []);

  const resetForm = () => {
    setOverview('');
    setEntities([]);
    setEnvironment('');
    setDimensionality({
        startDate: '',
        timePerPhase: '',
        historicalContext: 'Fictional',
    });
    setRepresentation('Territorial');
    setRules('');
    setSettings(DEFAULT_SETTINGS);
  };

  const handleSaveTemplate = () => {
    if (!module) return;
    const templateName = prompt("Enter a name for this scenario template:");
    if (!templateName || !templateName.trim()) return;
    
    const trimmedName = templateName.trim();
    const newTemplate: Template = {
        name: trimmedName,
        data: {
            module,
            overview,
            entities,
            environment,
            dimensionality,
            representation,
            rules,
            settings,
        }
    };

    const existingTemplateIndex = templates.findIndex(t => t.name === trimmedName);
    let updatedTemplates;

    if (existingTemplateIndex > -1) {
        updatedTemplates = [...templates];
        updatedTemplates[existingTemplateIndex] = newTemplate;
        alert(`Template "${trimmedName}" updated!`);
    } else {
        updatedTemplates = [...templates, newTemplate];
        alert(`Template "${trimmedName}" saved!`);
    }

    setTemplates(updatedTemplates);
    localStorage.setItem('epochScraiTemplates', JSON.stringify(updatedTemplates));
    setSelectedTemplateKey(trimmedName);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    setSelectedTemplateKey(key);

    if (key === 'custom') {
        resetForm();
    } else {
        const template = templates.find(t => t.name === key);
        if (template) {
            const { data } = template;
            setModule(data.module);
            setOverview(data.overview);
            setEntities(data.entities);
            setEnvironment(data.environment);
            setDimensionality(data.dimensionality);
            setRepresentation(data.representation);
            setRules(data.rules);
            setSettings(data.settings);
        }
    }
  };

  const handleAddEntity = () => {
    if (currentEntityName.trim() && currentEntityDesc.trim()) {
        setEntities([...entities, { name: currentEntityName.trim(), description: currentEntityDesc.trim() }]);
        setCurrentEntityName('');
        setCurrentEntityDesc('');
    }
  };

  const handleRemoveEntity = (index: number) => {
    setEntities(entities.filter((_, i) => i !== index));
  };

  const handleDimensionalityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDimensionality(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleHistoricalContextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDimensionality(prev => ({ ...prev, historicalContext: e.target.value as HistoricalContext }));
  };

   const handleRepresentationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRepresentation(e.target.value as ScenarioRepresentation);
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, [e.target.name]: parseInt(e.target.value, 10) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!module) return;

    const selectedModule = moduleRegistry.get(module);
    if (!selectedModule) return;

    const isTerritorialValid = module === 'Territorial' && overview.trim() && entities.length > 1;
    const isNarrativeValid = module === 'Narrative' && overview.trim();
    const isOtherModuleValid = module !== 'Territorial' && module !== 'Narrative' && overview.trim();

    if (isTerritorialValid || isNarrativeValid || isOtherModuleValid) {
      onScenarioCreate({
          overview,
          entities: module === 'Narrative' ? [{name: 'Observer', description: 'A neutral point-of-view for the narrative.'}] : entities,
          environment,
          dimensionality,
          representation: module === 'Narrative' ? 'Abstract' : representation,
          rules,
          settings,
          module,
      });
    }
  };

  const isFormValid = (() => {
    if (!module || !overview.trim()) return false;
    if (module === 'Territorial') return entities.length >= 2;
    return true; // Default validation for other modules
  })();

  if (!module) {
    const availableModules = moduleRegistry.getAll();

    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-cinzel font-bold text-slate-100">Select a Simulation Module</h2>
            <p className="text-slate-400 mt-2">Choose the core framework for your scenario.</p>
        </div>
        <div className={`w-full grid gap-6 ${availableModules.length === 2 ? 'md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {availableModules.map(mod => (
            <ModuleCard
              key={mod.name}
              title={`${mod.name} Module`}
              description={mod.simulationType === 'phase-based'
                ? "For complex, multi-entity simulations with strategic resource management and optional map-based interactions."
                : "For open-ended, story-driven scenarios where the focus is on dynamic events and outcomes in a more abstract context."
              }
              onClick={() => setModule(mod.name)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center">
        <div className="text-center mb-8">
            <button onClick={() => setModule(null)} className="text-sm text-amber-400 hover:text-amber-300 mb-2">&larr; Back to Module Selection</button>
            <h2 className="text-3xl font-cinzel font-bold text-slate-100">Configure {module} Simulation</h2>
            <p className="text-slate-400 mt-2">Define the parameters for your scenario.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 md:p-8">
            
            <div className="mb-6">
                <label htmlFor="template-select" className="block text-sm font-medium text-slate-300 mb-2">Load Template</label>
                <select 
                    id="template-select"
                    value={selectedTemplateKey}
                    onChange={handleTemplateChange}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                >
                    <option value="custom">-- Custom Scenario --</option>
                    {templates.filter(t => t.data.module === module).map(template => (
                        <option key={template.name} value={template.name}>{template.name}</option>
                    ))}
                </select>
            </div>

            <InputField label="Overview" description="A short, broad description of the desired scenario.">
                <textarea
                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-colors"
                    placeholder="e.g., A simulation of market competition between two emerging tech companies."
                    value={overview}
                    onChange={(e) => setOverview(e.target.value)}
                />
            </InputField>

            {module === 'Territorial' && (
              <InputField label="Entities: Who" description="Create at least two entities. The first one will be user-controlled.">
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                      <div className="space-y-3">
                          <input type="text" placeholder="Entity Name" value={currentEntityName} onChange={e => setCurrentEntityName(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 outline-none focus:ring-1 focus:ring-amber-400"/>
                          <textarea placeholder="Entity Description" value={currentEntityDesc} onChange={e => setCurrentEntityDesc(e.target.value)} className="w-full h-20 bg-slate-800 border border-slate-600 rounded-md p-2 outline-none focus:ring-1 focus:ring-amber-400"/>
                      </div>
                      <button type="button" onClick={handleAddEntity} disabled={!currentEntityName.trim() || !currentEntityDesc.trim()} className="mt-2 text-sm bg-amber-600/50 hover:bg-amber-600/80 text-amber-100 font-semibold py-1 px-3 rounded disabled:bg-slate-600 disabled:cursor-not-allowed">Add Entity</button>
                  </div>
                  <div className="mt-4 space-y-2">
                      {entities.map((entity, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-800 p-2 rounded-md">
                            <p className="text-slate-300"><span className="font-bold">{entity.name}</span>{index === 0 && <span className="text-xs text-amber-400/80 ml-2">(User-Controlled)</span>}</p>
                            <button type="button" onClick={() => handleRemoveEntity(index)} className="text-slate-500 hover:text-red-400"><XIcon className="w-4 h-4"/></button>
                          </div>
                      ))}
                  </div>
              </InputField>
            )}

             <InputField label="Environment: Where" description="Describe the environment where the simulation unfolds.">
                <textarea
                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-colors"
                    placeholder="e.g., A digital marketplace with fluctuating user interest and venture capital injections."
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                />
            </InputField>

            <InputField label="Dimensionality: When" description="Set the temporal context for your scenario.">
                <div className="grid md:grid-cols-2 gap-4">
                    <input type="text" name="startDate" placeholder="Starting Date" value={dimensionality.startDate} onChange={handleDimensionalityChange} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 outline-none focus:ring-1 focus:ring-amber-400"/>
                    <input type="text" name="timePerPhase" placeholder="Time Per Phase" value={dimensionality.timePerPhase} onChange={handleDimensionalityChange} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 outline-none focus:ring-1 focus:ring-amber-400"/>
                </div>
                <div className="mt-3 flex items-center space-x-4">
                    {(['Fictional', 'Semi-Historical', 'Historical'] as HistoricalContext[]).map(hc => (
                        <label key={hc} className="flex items-center text-slate-300">
                           <input type="radio" name="historicalContext" value={hc} checked={dimensionality.historicalContext === hc} onChange={handleHistoricalContextChange} className="mr-2 bg-slate-700 accent-amber-500"/>
                           {hc}
                        </label>
                    ))}
                </div>
            </InputField>

            {module === 'Territorial' && (
              <InputField label="Scenario Representation" description="Choose how the core of the scenario is simulated.">
                  <div className="flex items-center space-x-4">
                      {(['Territorial', 'Abstract'] as ScenarioRepresentation[]).map(rep => (
                          <label key={rep} className="flex items-center text-slate-300">
                            <input type="radio" name="representation" value={rep} checked={representation === rep} onChange={handleRepresentationChange} className="mr-2 bg-slate-700 accent-amber-500"/>
                            {rep === 'Territorial' ? 'Territorial (Grid Map)' : 'Abstract (State-based)'}
                          </label>
                      ))}
                  </div>
              </InputField>
            )}

            <InputField label="Rules: What / How (Optional)" description="Add any specific mechanics or context for the AI to follow.">
                <textarea
                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-colors"
                    placeholder="e.g., Technological breakthroughs have a 10% chance per phase. Direct hostile actions are forbidden."
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                />
            </InputField>

            <div className="mt-6 border-t border-slate-700 pt-6">
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-amber-400 hover:text-amber-300 font-semibold">
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                </button>
                {showAdvanced && (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="eventFrequency" className="block text-sm font-medium text-slate-300">Event Frequency: <span className="font-bold text-slate-100">{settings.eventFrequency}</span></label>
                            <p className="text-xs text-slate-500 mb-1">Controls how often random events occur.</p>
                            <input type="range" id="eventFrequency" name="eventFrequency" min="1" max="10" value={settings.eventFrequency} onChange={handleSettingChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                        </div>
                        {module === 'Territorial' && (
                          <div>
                              <label htmlFor="aiAggressiveness" className="block text-sm font-medium text-slate-300">AI Aggressiveness: <span className="font-bold text-slate-100">{settings.aiAggressiveness}</span></label>
                              <p className="text-xs text-slate-500 mb-1">Determines the strategic behavior of AI entities.</p>
                              <input type="range" id="aiAggressiveness" name="aiAggressiveness" min="1" max="10" value={settings.aiAggressiveness} onChange={handleSettingChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                          </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6 space-y-4">
                <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="w-full flex items-center justify-center bg-slate-600/50 hover:bg-slate-600/80 text-slate-100 font-bold py-3 px-6 rounded-lg transition-colors border border-slate-500"
                >
                    <SaveIcon className="w-5 h-5 mr-2" />
                    Save as Template
                </button>
                <button
                    type="submit"
                    disabled={!isFormValid}
                    className="w-full flex items-center justify-center bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                >
                    <WorldIcon className="w-5 h-5 mr-2" />
                    Initialize Simulation
                </button>
            </div>
             {!isFormValid && module === 'Territorial' && <p className="text-xs text-center text-red-400/80 mt-2">Please provide an overview and at least two entities.</p>}
             {!isFormValid && module === 'Narrative' && <p className="text-xs text-center text-red-400/80 mt-2">Please provide an overview for the narrative.</p>}
             {!isFormValid && module !== 'Territorial' && module !== 'Narrative' && <p className="text-xs text-center text-red-400/80 mt-2">Please provide an overview for the simulation.</p>}
        </form>
    </div>
  );
};

export default ScenarioSetup;
