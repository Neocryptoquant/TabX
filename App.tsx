import React, { useState } from 'react';
import type { Tournament, DebateFormat } from './types';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import RoundControlCenter from './components/RoundControlCenter';

const App: React.FC = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [managedRound, setManagedRound] = useState<number | null>(null);

  const startTournament = (name: string, format: DebateFormat) => {
    setTournament({
      name,
      format,
      status: 'running',
      participants: [],
      teams: [],
      adjudicators: [],
      rounds: [],
    });
  };
  
  const resetTournament = () => {
    setTournament(null);
    setManagedRound(null);
  }

  const activeRound = tournament && managedRound !== null 
    ? tournament.rounds.find(r => r.roundNumber === managedRound) 
    : null;

  return (
    <div className="min-h-screen bg-dark-charcoal text-cream-white">
      {!tournament ? (
        <SetupScreen onSetupComplete={startTournament} />
      ) : activeRound ? (
        <RoundControlCenter
          round={activeRound}
          tournament={tournament}
          setTournament={setTournament}
          onBack={() => setManagedRound(null)}
        />
      ) : (
        <Dashboard 
          tournament={tournament} 
          setTournament={setTournament} 
          setManagedRound={setManagedRound} 
          onReset={resetTournament}
        />
      )}
    </div>
  );
};

export default App;