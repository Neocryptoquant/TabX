import React, { useState, useEffect } from 'react';
import type { Tournament, Round, Team, BPDrawAdjudicator, BpMatchup, PublicDebateMatchup } from '../types';
import { DebateFormat, RoundStatus, MatchupStatus } from '../types';
import { generateDrawBP, generateMotions } from '../services/geminiService';
// FIX: Imported ListIcon to resolve reference error.
import { WandIcon, BookOpenIcon, ListIcon } from './IconComponents';
import LoadingSpinner from './LoadingSpinner';

interface RoundsViewProps {
  tournament: Tournament;
  setTournament: React.Dispatch<React.SetStateAction<Tournament | null>>;
  setManagedRound: (roundNumber: number) => void;
}

const RoundsView: React.FC<RoundsViewProps> = ({ tournament, setTournament, setManagedRound }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motionTheme, setMotionTheme] = useState('');
  const [isGeneratingMotions, setIsGeneratingMotions] = useState(false);

  const handleGenerateDraw = async () => {
    if (tournament.format === DebateFormat.BP) {
        if (tournament.teams.length < 4 || tournament.teams.length % 4 !== 0) {
            setError("BP format requires at least 4 teams, and the total number must be a multiple of 4.");
            return;
        }
        if (tournament.adjudicators.length === 0) {
            setError("Please add at least one adjudicator before generating a draw.");
            return;
        }
    }

    setIsLoading(true);
    setError(null);
    try {
      const drawData = await generateDrawBP(tournament.teams, tournament.adjudicators, tournament.rounds as any);
      
      const findTeam = (name: string): Team => {
          const team = tournament.teams.find(t => t.name === name);
          if (!team) {
              throw new Error(`The AI generated a draw with an unknown team: "${name}". Please check your team list for typos or regenerate the draw.`);
          }
          return team;
      };

      const newRound: Round = {
        roundNumber: tournament.rounds.length + 1,
        motion: '',
        status: RoundStatus.Pending,
        matchups: drawData.map((match: any, index: number) : BpMatchup => {
            const findAdjudicator = (name: string): BPDrawAdjudicator => {
                const adj = tournament.adjudicators.find(a => a.name === name);
                return adj ? { id: adj.id, name: adj.name } : { id: 'unknown', name: name };
            }

            return {
                id: `${tournament.rounds.length + 1}-${index}`,
                room: match.room,
                status: MatchupStatus.NotStarted,
                teams: {
                    OG: findTeam(match.teams.OG),
                    OO: findTeam(match.teams.OO),
                    CG: findTeam(match.teams.CG),
                    CO: findTeam(match.teams.CO),
                },
                adjudicators: match.adjudicators.map(findAdjudicator),
                ballot: null,
            };
        })
      };
      
      setTournament(prev => prev ? { ...prev, rounds: [...prev.rounds, newRound] } : null);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateMotions = async (roundIndex: number) => {
      if (!motionTheme) {
          alert("Please provide a theme for the motions.");
          return;
      }
      setIsGeneratingMotions(true);
      try {
          const motions = await generateMotions(motionTheme);
          if (motions.length > 0) {
              setMotionForRound(roundIndex, motions[0]);
          }
      } catch (e: any) {
          setError(e.message);
      } finally {
          setIsGeneratingMotions(false);
      }
  };

  const setMotionForRound = (roundIndex: number, motion: string) => {
      setTournament(prev => {
          if (!prev) return null;
          const newRounds = [...prev.rounds];
          newRounds[roundIndex].motion = motion;
          return { ...prev, rounds: newRounds };
      });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-3xl font-bold text-cream-white mb-4 sm:mb-0">Rounds</h2>
        {tournament.format !== DebateFormat.Public && (
            <button onClick={handleGenerateDraw} disabled={isLoading} className="btn-primary">
            <WandIcon className="w-5 h-5 mr-2" />
            {isLoading ? 'Generating...' : `Generate Round ${tournament.rounds.length + 1}`}
            </button>
        )}
      </div>

      {error && <div className="bg-error-coral/20 border border-error-coral/50 text-error-coral p-3 rounded-lg mb-4">{error}</div>}
      
      {isLoading && <div className="flex justify-center p-8"><LoadingSpinner text="Generating Draw with Gemini..." /></div>}
      
      {tournament.rounds.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-dark-charcoal rounded-lg border border-gray-700">
            <ListIcon className="mx-auto h-12 w-12 text-gray-600" />
            <h3 className="text-xl font-medium text-gray-300 mt-4">No rounds yet.</h3>
            <p className="text-gray-400 mt-2">Click "Generate Round" to create the first draw!</p>
        </div>
      )}

      <div className="space-y-8">
        {tournament.rounds.map((round, roundIndex) => (
          <div key={round.roundNumber} className="bg-dark-charcoal p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-primary-orange">Round {round.roundNumber}</h3>
                <button 
                    onClick={() => setManagedRound(round.roundNumber)} 
                    className="btn-secondary px-4 py-2 text-sm"
                >
                    Control Center
                </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-400 mb-2">Motion</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                    type="text" 
                    value={round.motion} 
                    onChange={e => setMotionForRound(roundIndex, e.target.value)}
                    placeholder="Enter motion for this round"
                    className="input-field flex-grow"
                />
                 <div className="flex-grow sm:flex-grow-0 flex gap-2">
                  <input 
                    type="text"
                    value={motionTheme}
                    onChange={e => setMotionTheme(e.target.value)}
                    placeholder="Motion theme..."
                    className="input-field w-full"
                  />
                  <button onClick={() => handleGenerateMotions(roundIndex)} disabled={isGeneratingMotions} className="btn-secondary p-3">
                      <WandIcon className="w-5 h-5"/>
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">{round.matchups.length} debates in this round.</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoundsView;