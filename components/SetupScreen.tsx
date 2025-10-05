import React, { useState } from 'react';
import { DebateFormat } from '../types';
import { TrophyIcon, SparklesIcon } from './IconComponents';
import AiSetupModal from './AiSetupModal';

interface SetupScreenProps {
  onSetupComplete: (name: string, format: DebateFormat) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<DebateFormat>(DebateFormat.BP);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSetupComplete(name.trim(), format);
    }
  };

  const handleAiSetup = (aiName: string, aiFormat: DebateFormat) => {
    setName(aiName);
    setFormat(aiFormat);
    setIsAiModalOpen(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-charcoal p-4">
      <div className="w-full max-w-md bg-dark-charcoal-secondary rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
            <TrophyIcon className="mx-auto h-16 w-16 text-primary-orange" />
            <h1 className="text-5xl font-black mt-4 text-cream-white tracking-tighter">
                TabX
            </h1>
            <p className="text-gray-400 mt-2">The future of debate tabulation.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="tournament-name" className="block text-sm font-bold text-gray-300 mb-2">
              Tournament Name
            </label>
            <input
              type="text"
              id="tournament-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g., Winter Invitational 2024"
              required
            />
          </div>
          <div>
            <label htmlFor="debate-format" className="block text-sm font-bold text-gray-300 mb-2">
              Debate Format
            </label>
            <select
              id="debate-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as DebateFormat)}
              className="input-field"
            >
              {Object.values(DebateFormat).map((df) => (
                <option key={df} value={df}>
                  {df}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full btn-primary"
          >
            Create Tournament
          </button>
        </form>
      </div>

       <button 
          onClick={() => setIsAiModalOpen(true)}
          className="fixed bottom-8 right-8 btn-primary !rounded-full !p-4 shadow-2xl z-50 transform hover:scale-110 transition-transform"
          aria-label="Set up with AI"
          title="Set up with AI"
      >
          <SparklesIcon className="w-8 h-8" />
      </button>

      {isAiModalOpen && (
          <AiSetupModal 
              onClose={() => setIsAiModalOpen(false)}
              onSetupComplete={handleAiSetup}
          />
      )}
    </div>
  );
};

export default SetupScreen;