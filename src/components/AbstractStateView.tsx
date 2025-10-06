
import React from 'react';

interface AbstractStateViewProps {
  abstractState: {
    [key: string]: string | number | boolean;
  };
}

const AbstractStateView: React.FC<AbstractStateViewProps> = ({ abstractState }) => {
  return (
    <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-cinzel text-slate-200 mb-4 border-b border-slate-700/50 pb-2">Simulation State</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {Object.entries(abstractState).map(([key, value]) => (
                <div key={key} className="bg-slate-800/60 p-3 rounded-md">
                    <p className="text-sm uppercase text-slate-400 tracking-wider">{key.replace(/_/g, ' ')}</p>
                    <p className="text-xl font-semibold text-slate-100 break-words">{String(value)}</p>
                </div>
            ))}
        </div>
    </div>
  );
};

export default AbstractStateView;
