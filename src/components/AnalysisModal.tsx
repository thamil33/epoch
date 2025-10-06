import React, { useState } from 'react';
import { XIcon, BrainCircuitIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

interface AnalysisModalProps {
  onClose: () => void;
  onSubmit: (question: string) => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ onClose, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onSubmit(question.trim());
      onClose();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold py-2 px-4 rounded-lg shadow-lg border border-slate-600"
        >
          <BrainCircuitIcon className="w-5 h-5 mr-2" />
          Request Analysis
          <ChevronUpIcon className="w-5 h-5 ml-2" />
        </button>
      </div>
    );
  }


  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-40"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-2xl font-cinzel text-slate-100">Consult AI Analyst</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-amber-300 transition-colors">
                <ChevronDownIcon className="w-6 h-6" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-amber-300 transition-colors">
                <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-slate-300 mb-2">Your Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full h-32 bg-slate-900 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-colors text-sm"
              placeholder="Ask the AI analyst for insights, e.g., 'What are the weaknesses of the Northern entity?' or 'Should we invest in our economy?'"
            />
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={!question.trim()}
              className="flex items-center justify-center bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              <BrainCircuitIcon className="w-4 h-4 mr-2" />
              Request Analysis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnalysisModal;