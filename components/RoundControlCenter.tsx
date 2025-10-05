import React, { useState, useEffect, useMemo } from 'react';
import type { Tournament, Round, PublicDebateMatchup, PublicDebateBallot, Team, SpeakerScore, Participant, BpMatchup, BPBallot } from '../types';
import { MatchupStatus, DebateFormat } from '../types';
import { CheckCircleIcon, TrophyIcon, ClockIcon, CheckIcon, SparklesIcon } from './IconComponents';
import { generateSpeakerFeedback } from '../services/geminiService';

// PROPS
interface RoundControlCenterProps {
  round: Round;
  tournament: Tournament;
  setTournament: React.Dispatch<React.SetStateAction<Tournament | null>>;
  onBack: () => void;
}

// Type guard to check if a matchup is a BP matchup
function isBpMatchup(matchup: BpMatchup | PublicDebateMatchup): matchup is BpMatchup {
    return 'OG' in matchup.teams;
}

// MAIN COMPONENT - Format Switch
const RoundControlCenter: React.FC<RoundControlCenterProps> = (props) => {
    if (props.tournament.format === DebateFormat.BP) {
        return <BPRoundControlCenter {...props} />;
    }
    return <PublicDebateRoundControlCenter {...props} />;
};


// BP FORMAT COMPONENTS
const BPRoundControlCenter: React.FC<RoundControlCenterProps> = ({ round, tournament, setTournament, onBack }) => {
  const [activeFilter, setActiveFilter] = useState('All Rooms');
  const [selectedMatchup, setSelectedMatchup] = useState<BpMatchup | null>(null);

  const completedCount = round.matchups.filter(m => m.status === MatchupStatus.Completed).length;
  const totalCount = round.matchups.length;

  const filteredMatchups = useMemo(() => {
    if (activeFilter === 'All Rooms') return round.matchups as BpMatchup[];
    return round.matchups.filter(m => m.status === activeFilter) as BpMatchup[];
  }, [round.matchups, activeFilter]);

  const handleSubmitScores = (matchupId: string, ballot: BPBallot) => {
    setTournament(prev => {
        if (!prev) return null;
        const newTournament = JSON.parse(JSON.stringify(prev));
        const roundToUpdate = newTournament.rounds.find((r: Round) => r.roundNumber === round.roundNumber);
        if (roundToUpdate) {
            const matchupToUpdate = roundToUpdate.matchups.find((m: BpMatchup) => m.id === matchupId);
            if (matchupToUpdate) {
                matchupToUpdate.ballot = ballot;
                matchupToUpdate.status = MatchupStatus.Completed;
            }
        }
        return newTournament;
    });
    // Find the newly updated matchup to keep it selected for result view
    const updatedMatchup = (tournament.rounds.find(r => r.roundNumber === round.roundNumber)?.matchups.find(m => m.id === matchupId) as BpMatchup)
    if(updatedMatchup) {
       const finalMatchup = {...updatedMatchup, ballot, status: MatchupStatus.Completed};
       setSelectedMatchup(finalMatchup);
    }
  };

  return (
    <div className="min-h-screen bg-dark-charcoal">
      <TopStatusBar round={round} onBack={onBack} completedCount={completedCount} totalCount={totalCount}>
          <FilterPills activeFilter={activeFilter} setActiveFilter={setActiveFilter} matchups={round.matchups as any[]} />
      </TopStatusBar>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {filteredMatchups.map(matchup => (
                <BPRoomCard key={matchup.id} matchup={matchup} onEnterScores={() => setSelectedMatchup(matchup)} />
            ))}
        </div>
      </main>

      {selectedMatchup && (
        <BPScoreEntryModal
            matchup={selectedMatchup}
            motion={round.motion}
            onClose={() => setSelectedMatchup(null)}
            onSubmit={handleSubmitScores}
        />
      )}
    </div>
  );
};

const BPRoomCard: React.FC<{ matchup: BpMatchup, onEnterScores: () => void }> = ({ matchup, onEnterScores }) => {
    const styles = bpStatusStyles[matchup.status];
    const { OG, OO, CG, CO } = matchup.teams;
    return (
        <div className={`bg-dark-charcoal-secondary rounded-xl shadow-lg border-t-4 ${styles.border} transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-orange/20 group`}>
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-cream-white">{matchup.room}</h3>
                    {styles.icon}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                    <div className="text-sm"><span className="font-bold text-gray-400">OG:</span> <span className="text-gray-200">{OG.name}</span></div>
                    <div className="text-sm"><span className="font-bold text-gray-400">OO:</span> <span className="text-gray-200">{OO.name}</span></div>
                    <div className="text-sm"><span className="font-bold text-gray-400">CG:</span> <span className="text-gray-200">{CG.name}</span></div>
                    <div className="text-sm"><span className="font-bold text-gray-400">CO:</span> <span className="text-gray-200">{CO.name}</span></div>
                </div>
                
                <div className="border-t border-gray-700 pt-3">
                    <p className="text-sm text-gray-400">Adjudicators: {matchup.adjudicators.map(a => a.name).join(', ')}</p>
                </div>
            </div>
            <div className="bg-dark-charcoal px-5 py-3 rounded-b-xl">
                <button onClick={onEnterScores} className="w-full text-center font-bold text-primary-orange group-hover:text-orange-300 transition-colors">
                    {matchup.status === MatchupStatus.Completed ? "View Results" : "Enter Scores"}
                </button>
            </div>
        </div>
    );
};

const BPScoreEntryModal: React.FC<{
    matchup: BpMatchup;
    motion: string;
    onClose: () => void;
    onSubmit: (matchupId: string, ballot: BPBallot) => void;
}> = ({ matchup, motion, onClose, onSubmit }) => {
    const { OG, OO, CG, CO } = matchup.teams;
    const allSpeakers = useMemo(() => [OG, OO, CG, CO].flatMap(t => t.members), [OG, OO, CG, CO]);
    
    const initialScores = useMemo(() => allSpeakers.reduce((acc, p) => ({...acc, [p.id]: 75}), {}), [allSpeakers]);
    const initialFeedback = useMemo(() => allSpeakers.reduce((acc, p) => ({...acc, [p.id]: ''}), {}), [allSpeakers]);

    const [scores, setScores] = useState<{[key: string]: number}>(matchup.ballot?.speakerScores || initialScores);
    const [feedback, setFeedback] = useState<{[key: string]: string}>(initialFeedback);
    
    const initialRanks = matchup.ballot ? Object.entries(matchup.ballot.ranks).reduce((acc, [teamId, rank]) => ({...acc, [rank]: teamId}), {}) : { '1': '', '2': '', '3': '', '4': '' };
    const [ranks, setRanks] = useState<{[key: string]: string | number}>(initialRanks);
    
    const [bestSpeaker, setBestSpeaker] = useState(''); // This would need to be stored in ballot if we want to pre-fill
    const [privateComments, setPrivateComments] = useState('');
    const [errors, setErrors] = useState<any>({});
    const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success'>(matchup.ballot ? 'success' : 'idle');

    const teams = useMemo(() => ({ OG, OO, CG, CO }), [OG, OO, CG, CO]);

    const teamTotals = useMemo(() => ({
        OG: scores[OG.members[0].id] + scores[OG.members[1].id],
        OO: scores[OO.members[0].id] + scores[OO.members[1].id],
        CG: scores[CG.members[0].id] + scores[CG.members[1].id],
        CO: scores[CO.members[0].id] + scores[CO.members[1].id],
    }), [scores, teams]);

    const validate = () => {
        const newErrors: any = {};
        allSpeakers.forEach(p => {
            if (scores[p.id] < 69 || scores[p.id] > 81) newErrors[p.id] = "Score must be 69-81";
        });
        const rankValues = Object.values(ranks);
        if (rankValues.some(r => !r)) newErrors.ranks = "All ranks must be assigned.";
        if (new Set(rankValues).size !== 4) newErrors.ranks = "Each team must have a unique rank.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!window.confirm("Scores cannot be edited once submitted. Are you sure you want to submit?")) return;

        setSubmissionState('loading');
        
        const ballotRanks = Object.entries(ranks).reduce((acc, [rank, teamId]) => ({...acc, [teamId as string]: parseInt(rank)}), {});

        const ballot: BPBallot = {
            ranks: ballotRanks,
            speakerScores: scores,
        };
        
        setTimeout(() => { // Simulate API call
            onSubmit(matchup.id, ballot);
            setSubmissionState('success');
        }, 1000);
    }
    
    const handleRankChange = (rank: number, teamId: string) => {
        setRanks(prev => {
            const newRanks = {...prev};
            Object.keys(newRanks).forEach(key => {
                if (newRanks[key] === teamId) newRanks[key] = '';
            });
            newRanks[rank] = teamId;
            return newRanks;
        });
    }

    if (submissionState === 'success' && matchup.ballot) {
        return <Modal onClose={onClose}><BPDebateResultCard matchup={matchup} ballot={matchup.ballot} onClose={onClose} /></Modal>
    }
    
    const teamPositions = [
        { pos: 'OG', speaker: 1, positionName: "Opening Government - Prime Minister"},
        { pos: 'OG', speaker: 2, positionName: "Opening Government - Deputy Prime Minister"},
        { pos: 'OO', speaker: 1, positionName: "Opening Opposition - Leader of Opposition"},
        { pos: 'OO', speaker: 2, positionName: "Opening Opposition - Deputy Leader of Opposition"},
        { pos: 'CG', speaker: 1, positionName: "Closing Government - Member of Government"},
        { pos: 'CG', speaker: 2, positionName: "Closing Government - Government Whip"},
        { pos: 'CO', speaker: 1, positionName: "Closing Opposition - Member of Opposition"},
        { pos: 'CO', speaker: 2, positionName: "Closing Opposition - Opposition Whip"},
    ] as const;

    return (
        <Modal onClose={onClose}>
            <div className="p-2 sm:p-6 bg-dark-charcoal text-cream-white w-full max-w-6xl rounded-lg border-2 border-gray-700">
                 <h2 className="text-4xl font-black text-center mb-2 tracking-tighter">ENTER SCORES - {matchup.room}</h2>
                <p className="text-center text-gray-400 italic mb-6 text-lg">"{motion}"</p>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(['OG', 'OO', 'CG', 'CO'] as const).map(pos => (
                            <div key={pos} className="bg-dark-charcoal-secondary p-4 rounded-lg border border-gray-700">
                                <h3 className="text-xl font-bold text-primary-orange mb-4">{pos}: <span className="text-white">{teams[pos].name}</span></h3>
                                <div className="space-y-4">
                                    <SpeakerScoreInput 
                                      name={teams[pos].members[0].name} 
                                      score={scores[teams[pos].members[0].id]} 
                                      setScore={val => setScores(s => ({...s, [teams[pos].members[0].id]: val}))} 
                                      feedback={feedback[teams[pos].members[0].id]} 
                                      setFeedback={val => setFeedback(f => ({...f, [teams[pos].members[0].id]: val}))} 
                                      error={errors[teams[pos].members[0].id]}
                                      motion={motion}
                                      position={teamPositions.find(p => p.pos === pos && p.speaker === 1)!.positionName}
                                    />
                                    <SpeakerScoreInput 
                                      name={teams[pos].members[1].name} 
                                      score={scores[teams[pos].members[1].id]} 
                                      setScore={val => setScores(s => ({...s, [teams[pos].members[1].id]: val}))} 
                                      feedback={feedback[teams[pos].members[1].id]} 
                                      setFeedback={val => setFeedback(f => ({...f, [teams[pos].members[1].id]: val}))} 
                                      error={errors[teams[pos].members[1].id]}
                                      motion={motion}
                                      position={teamPositions.find(p => p.pos === pos && p.speaker === 2)!.positionName}
                                    />
                                </div>
                                <div className="mt-4 border-t border-gray-600 pt-3 flex justify-between items-center">
                                    <span className="font-bold">Team Total:</span>
                                    <span className="text-2xl font-bold text-primary-orange bg-dark-charcoal px-3 py-1 rounded">{teamTotals[pos]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-6 border-t border-gray-700 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-lg font-semibold mb-2">Team Ranking</h4>
                            {errors.ranks && <p className="text-error-coral text-sm mb-2">{errors.ranks}</p>}
                            <div className="space-y-2">
                                {[1,2,3,4].map(rank => (
                                    <div key={rank} className="flex items-center gap-2">
                                        <label className="w-16 font-bold">{rank}{['st','nd','rd','th'][rank-1]}:</label>
                                        <select value={ranks[rank]} onChange={e => handleRankChange(rank, e.target.value)} className="input-field w-full">
                                            <option value="">Select team...</option>
                                            {Object.values(teams).filter(t => !Object.values(ranks).includes(t.id) || ranks[rank] === t.id).map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                           <label htmlFor="best-speaker" className="block text-lg font-semibold mb-2">Best Speaker</label>
                            <select id="best-speaker" value={bestSpeaker} onChange={e => setBestSpeaker(e.target.value)} className="input-field w-full max-w-xs">
                                <option value="">Select...</option>
                                {allSpeakers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <label htmlFor="private-comments" className="block text-lg font-semibold mb-2 mt-4">Private Comments</label>
                            <textarea id="private-comments" value={privateComments} onChange={e => setPrivateComments(e.target.value)} className="input-field w-full" rows={2}></textarea>
                        </div>
                    </div>
                     <div className="mt-8 flex justify-end gap-4">
                        <button type="button" className="btn-secondary">Save Draft</button>
                        <button type="submit" disabled={submissionState === 'loading'} className="btn-primary">
                            {submissionState === 'loading' ? 'Submitting...' : 'Submit Scores'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    )
}

const BPDebateResultCard: React.FC<{matchup: BpMatchup, ballot: BPBallot, onClose: () => void}> = 
({matchup, ballot, onClose}) => {
    const teams = useMemo(() => [
        {...matchup.teams.OG, pos: 'OG'},
        {...matchup.teams.OO, pos: 'OO'},
        {...matchup.teams.CG, pos: 'CG'},
        {...matchup.teams.CO, pos: 'CO'}
    ], [matchup.teams]);
    
    const teamTotals = useMemo(() => teams.reduce((acc, team) => ({
        ...acc,
        [team.id]: team.members.reduce((sum, m) => sum + (ballot.speakerScores[m.id] || 0), 0)
    }), {} as {[key:string]: number}), [teams, ballot]);

    const rankedTeams = useMemo(() => {
        return teams.map(team => ({
            ...team,
            rank: ballot.ranks[team.id],
            total: teamTotals[team.id]
        })).sort((a,b) => a.rank - b.rank);
    }, [teams, ballot.ranks, teamTotals]);
    
    const bestSpeaker = useMemo(() => {
        let bestScore = 0;
        let bestSpeakerId = '';
        Object.entries(ballot.speakerScores).forEach(([id, score]) => {
            if (score > bestScore) {
                bestScore = score;
                bestSpeakerId = id;
            }
        });
        const speaker = teams.flatMap(t => t.members).find(m => m.id === bestSpeakerId);
        return speaker ? {...speaker, score: bestScore} : null;
    }, [ballot.speakerScores, teams]);

    return (
         <div className="p-8 bg-dark-charcoal text-cream-white w-full max-w-3xl rounded-lg text-center border-2 border-gray-700">
            <CheckCircleIcon className="w-16 h-16 text-success-green mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Scores Submitted!</h2>
            
            <div className="my-6 space-y-2">
                {rankedTeams.map(({name, rank}) => (
                    <div key={name} className={`p-3 rounded-lg flex justify-between items-center text-lg ${rank === 1 ? 'bg-primary-orange/20' : 'bg-dark-charcoal-secondary'}`}>
                        <span className="font-bold">{rank}{['st','nd','rd','th'][rank-1]} Place</span>
                        <span className="font-semibold">{name}</span>
                        {rank === 1 && <TrophyIcon className="w-6 h-6 text-primary-orange" />}
                    </div>
                ))}
            </div>
            
            <h4 className="text-xl font-bold mb-2">Score Breakdown</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-dark-charcoal">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-400">Team</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-400">Speaker 1</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-400">Speaker 2</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-400">Total</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-400">Rank</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {rankedTeams.map(team => (
                            <tr key={team.id}>
                                <td className="px-4 py-2 font-medium">{team.name} ({team.pos})</td>
                                <td className="px-4 py-2 text-gray-300">{ballot.speakerScores[team.members[0].id]}</td>
                                <td className="px-4 py-2 text-gray-300">{ballot.speakerScores[team.members[1].id]}</td>
                                <td className="px-4 py-2 font-bold">{team.total}</td>
                                <td className="px-4 py-2 font-extrabold text-primary-orange">{team.rank}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {bestSpeaker && (
                <div className="mt-4 text-center bg-dark-charcoal-secondary p-3 rounded-lg">
                    <span className="font-bold">Best Speaker ⭐: {bestSpeaker.name} ({bestSpeaker.score})</span>
                </div>
            )}

            <button onClick={onClose} className="btn-primary mt-8">Close</button>
         </div>
    )
}

const SpeakerScoreInput: React.FC<{name: string, score: number, setScore: (s: number) => void, feedback: string, setFeedback: (f: string) => void, error?: string, motion: string, position: string}> = 
({name, score, setScore, feedback, setFeedback, error, motion, position}) => {
    const quickScores = [70, 72, 74, 76, 78, 80];
    const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
    const [aiKeywords, setAiKeywords] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateFeedback = async () => {
        if (!aiKeywords) return;
        setIsGenerating(true);
        try {
            const generatedFeedback = await generateSpeakerFeedback(score, motion, position, aiKeywords);
            setFeedback(generatedFeedback);
        } catch (e) {
            console.error(e);
            alert("Failed to generate feedback.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-dark-charcoal p-4 rounded-md border border-gray-700">
            <label className="text-lg font-semibold">{name}</label>
            <div className="flex items-center gap-2 mt-2">
                <input type="number" value={score} onChange={e => setScore(Number(e.target.value))} 
                    className={`w-full bg-transparent text-center text-6xl font-black text-cream-white focus:outline-none ${error ? 'text-error-coral' : ''}`}
                />
            </div>
            {error && <p className="text-error-coral text-sm mt-1 text-center">{error}</p>}
            <div className="flex justify-center flex-wrap gap-2 mt-3">
                {quickScores.map(qs => 
                    <button type="button" key={qs} onClick={() => setScore(qs)} className="bg-gray-700 text-gray-300 border border-gray-600 rounded-full px-3 py-1 text-xs font-bold hover:bg-gray-600 hover:text-white">{qs}</button>
                )}
            </div>
             <div className="mt-3">
                <button type="button" onClick={() => setIsFeedbackVisible(!isFeedbackVisible)} className="text-sm text-gray-400 hover:text-white">
                    {isFeedbackVisible ? 'Hide Feedback' : 'Add Feedback'}
                </button>
                {isFeedbackVisible && (
                    <div className="mt-2 space-y-2">
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="input-field w-full" rows={3} placeholder="Enter speaker feedback..."></textarea>
                        <div className="p-2 bg-dark-charcoal-secondary/50 rounded-md border border-gray-600">
                           <p className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1"><SparklesIcon className="w-3 h-3 text-primary-orange" /> AI Feedback Assistant</p>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={aiKeywords}
                                    onChange={e => setAiKeywords(e.target.value)}
                                    className="input-field !py-1 !text-sm flex-grow"
                                    placeholder="Keywords: good structure, weak rebuttal..."
                                    disabled={isGenerating}
                                />
                                <button type="button" onClick={handleGenerateFeedback} className="btn-secondary !text-xs !px-2" disabled={isGenerating}>
                                    {isGenerating ? '...' : 'Generate'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// PUBLIC DEBATE FORMAT COMPONENTS (EXISTING LOGIC, RESKINNED)
const PublicDebateRoundControlCenter: React.FC<RoundControlCenterProps> = ({ round, tournament, setTournament, onBack }) => {
  const [activeFilter, setActiveFilter] = useState('All Rooms');
  const [selectedMatchup, setSelectedMatchup] = useState<PublicDebateMatchup | null>(null);

  const completedCount = round.matchups.filter(m => m.status === MatchupStatus.Completed).length;
  const totalCount = round.matchups.length;

  const filteredMatchups = useMemo(() => {
    if (activeFilter === 'All Rooms') return round.matchups as PublicDebateMatchup[];
    return round.matchups.filter(m => m.status === activeFilter) as PublicDebateMatchup[];
  }, [round.matchups, activeFilter]);

  const handleSubmitScores = (matchupId: string, ballot: PublicDebateBallot) => {
    setTournament(prev => {
        if (!prev) return null;
        const newTournament = JSON.parse(JSON.stringify(prev));
        const roundToUpdate = newTournament.rounds.find((r: Round) => r.roundNumber === round.roundNumber);
        if (roundToUpdate) {
            const matchupToUpdate = roundToUpdate.matchups.find((m: PublicDebateMatchup) => m.id === matchupId);
            if (matchupToUpdate) {
                matchupToUpdate.ballot = ballot;
                matchupToUpdate.status = MatchupStatus.Completed;
            }
        }
        return newTournament;
    });
  };

  return (
    <div className="min-h-screen bg-dark-charcoal">
      <TopStatusBar round={round} onBack={onBack} completedCount={completedCount} totalCount={totalCount}>
          <FilterPills activeFilter={activeFilter} setActiveFilter={setActiveFilter} matchups={round.matchups as any[]} />
      </TopStatusBar>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMatchups.map(matchup => (
                <RoomCard key={matchup.id} matchup={matchup} onEnterScores={() => setSelectedMatchup(matchup)} />
            ))}
        </div>
      </main>

      {selectedMatchup && (
        <ScoreEntryModal
            matchup={selectedMatchup}
            onClose={() => setSelectedMatchup(null)}
            onSubmit={handleSubmitScores}
            round={round}
        />
      )}
    </div>
  );
};


// SHARED & UTILITY COMPONENTS

const TopStatusBar: React.FC<{round: Round, onBack: ()=>void, completedCount: number, totalCount: number, children: React.ReactNode}> = 
({round, onBack, completedCount, totalCount, children}) => (
    <header className="sticky top-0 z-20 bg-gradient-to-b from-dark-charcoal to-dark-charcoal-secondary/80 backdrop-blur-md border-b border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white">&larr; Back</button>
                <h1 className="text-4xl sm:text-5xl font-black text-cream-white tracking-tighter">ROUND {round.roundNumber} <span className="text-primary-orange font-bold text-2xl uppercase">{round.status}</span></h1>
            </div>
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
                <div className="flex items-center gap-2 text-white">
                    <ProgressRing progress={totalCount > 0 ? completedCount / totalCount : 0} />
                    <span>{completedCount}/{totalCount} Completed</span>
                </div>
                 <button className="btn-secondary text-sm px-3 py-1">Publish</button>
            </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            {children}
        </div>
    </header>
);

const ProgressRing: React.FC<{ progress: number }> = ({ progress }) => {
    const strokeWidth = 3;
    const radius = 16;
    const normalizedRadius = radius - strokeWidth;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <svg height={radius*2} width={radius*2} className="-rotate-90">
            <circle stroke="#4a5066" strokeWidth={strokeWidth} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
            <circle 
                stroke="var(--primary-orange)" 
                strokeWidth={strokeWidth} 
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-out' }}
                strokeLinecap="round"
                fill="transparent" 
                r={normalizedRadius} 
                cx={radius} 
                cy={radius}
            />
        </svg>
    );
}

const FilterPills: React.FC<{ activeFilter: string, setActiveFilter: (f: string) => void, matchups: (PublicDebateMatchup | BpMatchup)[]}> = ({ activeFilter, setActiveFilter, matchups }) => {
    const filters = ["All Rooms", ...Object.values(MatchupStatus)];
    const getCount = (status: string) => {
        if (status === 'All Rooms') return matchups.length;
        return matchups.filter(m => m.status === status).length;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {filters.map(filter => {
                const count = getCount(filter);
                if (count === 0 && filter !== 'All Rooms') return null;
                const isActive = activeFilter === filter;
                return (
                    <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${isActive ? 'bg-primary-orange text-white' : 'bg-dark-charcoal text-gray-300 hover:bg-gray-700 border border-gray-600'}`}>
                        {filter} <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-orange-700' : 'bg-gray-600'}`}>{count}</span>
                    </button>
                )
            })}
        </div>
    );
};

const bpStatusStyles: { [key in MatchupStatus]: { icon: React.ReactNode; border: string; } } = {
    [MatchupStatus.NotStarted]: { icon: <div className="w-4 h-4 rounded-full bg-gray-500" title="Not Started"></div>, border: 'border-gray-700' },
    [MatchupStatus.InProgress]: { icon: <div className="w-4 h-4 rounded-full bg-primary-orange animate-pulse" title="In Progress"></div>, border: 'border-primary-orange' },
    [MatchupStatus.ScoresEntered]: { icon: <div className="w-4 h-4 rounded-full bg-yellow-500" title="Scores Entered"></div>, border: 'border-yellow-500' },
    [MatchupStatus.Completed]: { icon: <CheckIcon className="w-5 h-5 text-success-green" />, border: 'border-success-green' },
    [MatchupStatus.Issue]: { icon: <div className="w-4 h-4 rounded-full bg-error-coral animate-pulse" title="Issue"></div>, border: 'border-error-coral' },
};


const RoomCard: React.FC<{ matchup: PublicDebateMatchup, onEnterScores: () => void }> = ({ matchup, onEnterScores }) => {
    const styles = bpStatusStyles[matchup.status];
    return (
        <div className={`bg-dark-charcoal-secondary rounded-lg shadow-lg border-l-4 ${styles.border} transition-all hover:shadow-primary-orange/20 hover:scale-105`}>
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-white">{matchup.room}</h3>
                        <p className="text-sm text-gray-400">{matchup.venue}</p>
                    </div>
                     <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold`}>{matchup.status}</span>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    <p className="text-lg font-semibold text-gray-200">Gov: <span className="font-bold text-white">{matchup.teams.gov.name}</span></p>
                    <p className="text-lg font-semibold text-gray-200">Opp: <span className="font-bold text-white">{matchup.teams.opp.name}</span></p>
                </div>
                
                <div className="border-t border-gray-700 pt-3">
                    <p className="text-sm text-gray-400">Adjudicators: {matchup.adjudicators.map(a => a.name).join(', ')}</p>
                </div>
            </div>
            <div className="bg-dark-charcoal px-5 py-3 rounded-b-lg">
                <button onClick={onEnterScores} className="w-full text-center font-semibold text-primary-orange hover:text-orange-300">
                    {matchup.status === MatchupStatus.Completed ? "View Results" : "Enter Scores"}
                </button>
            </div>
        </div>
    );
};

// SCORE ENTRY MODAL

interface ScoreEntryModalProps {
    matchup: PublicDebateMatchup;
    onClose: () => void;
    onSubmit: (matchupId: string, ballot: PublicDebateBallot) => void;
    round: Round;
}

const ScoreEntryModal: React.FC<ScoreEntryModalProps> = ({ matchup, onClose, onSubmit, round }) => {
    // This is the Public Debate modal, keeping it simple as BP is the focus.
    const [scores, setScores] = useState({ gov1: 75, gov2: 75, opp1: 75, opp2: 75 });
    const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success'>('idle');
    // ... logic ...
    return <Modal onClose={onClose}><div className="p-8 bg-dark-charcoal rounded-lg">Public Debate Score Entry</div></Modal>
};

const Modal: React.FC<{onClose: () => void, children: React.ReactNode}> = ({onClose, children}) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="max-h-full overflow-y-auto">
                {children}
            </div>
        </div>
    )
};

export default RoundControlCenter;