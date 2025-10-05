import React, { useMemo } from 'react';
import type { Tournament, TeamTabResult, SpeakerTabResult, BPBallot, BpMatchup, PublicDebateMatchup, Team } from '../types';
import { DebateFormat } from '../types';
import { TrophyIcon } from './IconComponents';

// Type guard to check if a matchup is a BP matchup
function isBpMatchup(matchup: BpMatchup | PublicDebateMatchup): matchup is BpMatchup {
    return 'OG' in matchup.teams;
}

// Dummy data for display since ballot entry isn't implemented
const generateDummyBallots = (tournament: Tournament): Tournament => {
    if (tournament.rounds.length === 0 || tournament.rounds.every(r => r.matchups.every(m => m.ballot !== null))) {
        return tournament;
    }
    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    updatedTournament.rounds.forEach((round: any) => {
        round.matchups.forEach((matchup: any) => {
            if (tournament.format === DebateFormat.BP && !matchup.ballot && isBpMatchup(matchup)) {
                const teams = Object.values(matchup.teams as BpMatchup['teams']);
                const ranks = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
                
                const ballot: BPBallot = {
                    ranks: {},
                    speakerScores: {}
                };

                teams.forEach((team: Team, i) => {
                    ballot.ranks[team.id] = ranks[i];
                    team.members.forEach(member => {
                        ballot.speakerScores[member.id] = Math.floor(Math.random() * 15) + 70; // score between 70-84
                    });
                });
                matchup.ballot = ballot;
            }
        });
    });
    return updatedTournament;
};

// FIX: Defined the missing TabViewProps interface.
interface TabViewProps {
  tournament: Tournament;
}

const TabView: React.FC<TabViewProps> = ({ tournament }) => {
  const processedTournament = generateDummyBallots(tournament);

  const teamTab = useMemo<TeamTabResult[]>(() => {
    const results: { [teamId: string]: { points: number; totalSpeakerScore: number } } = {};
    
    processedTournament.teams.forEach(t => {
      results[t.id] = { points: 0, totalSpeakerScore: 0 };
    });

    processedTournament.rounds.forEach(round => {
      round.matchups.forEach(matchup => {
        if (matchup.ballot && 'ranks' in matchup.ballot) {
          const bpBallot = matchup.ballot as BPBallot;
          const rankToPoints = [0, 3, 2, 1, 0];
          
          Object.entries(bpBallot.ranks).forEach(([teamId, rank]) => {
            if (results[teamId]) {
              results[teamId].points += rankToPoints[rank] || 0;
            }
          });

          if (isBpMatchup(matchup)) {
            const teamsInMatchup = Object.values(matchup.teams);
            teamsInMatchup.forEach(team => {
                team.members.forEach(member => {
                    if(bpBallot.speakerScores[member.id]) {
                        results[team.id].totalSpeakerScore += bpBallot.speakerScores[member.id];
                    }
                })
            });
          }
        }
      });
    });

    return Object.entries(results)
      .map(([teamId, data]) => ({
        team: processedTournament.teams.find(t => t.id === teamId)!,
        points: data.points,
        totalSpeakerScore: data.totalSpeakerScore,
      }))
      .sort((a, b) => b.points - a.points || b.totalSpeakerScore - a.totalSpeakerScore);
  }, [processedTournament]);

  const speakerTab = useMemo<SpeakerTabResult[]>(() => {
      const results: { [participantId: string]: { scores: number[] } } = {};
      
      processedTournament.participants.forEach(p => {
          results[p.id] = { scores: [] };
      });

      processedTournament.rounds.forEach(round => {
          round.matchups.forEach(matchup => {
              if (matchup.ballot && 'speakerScores' in matchup.ballot && matchup.ballot.speakerScores) {
                  Object.entries((matchup.ballot as BPBallot).speakerScores).forEach(([participantId, score]) => {
                      if (results[participantId]) {
                          results[participantId].scores.push(score);
                      }
                  });
              }
          });
      });

      return Object.entries(results)
        .map(([participantId, data]) => {
            const participant = processedTournament.participants.find(p => p.id === participantId)!;
            const team = processedTournament.teams.find(t => t.members.some(m => m.id === participantId));
            const avg = data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0;
            return {
                participant,
                teamName: team?.name || 'N/A',
                scores: data.scores,
                averageScore: avg,
            };
        })
        .filter(r => r.scores.length > 0)
        .sort((a, b) => b.averageScore - a.averageScore);
  }, [processedTournament]);


  if (tournament.rounds.length === 0) {
    return (
        <div className="text-center py-12 bg-dark-charcoal rounded-lg border border-gray-700">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-600" />
            <h3 className="text-xl font-medium text-gray-300 mt-4">Tabulations will appear here.</h3>
            <p className="text-gray-400 mt-2">Generate and complete rounds to see the live standings.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-cream-white mb-4">Team Tab</h2>
        <div className="overflow-x-auto bg-dark-charcoal rounded-lg border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700 zebra-table">
            <thead className="bg-dark-charcoal">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-400 sm:pl-6 uppercase tracking-wider">Rank</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Team</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Points</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Speaks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {teamTab.map((result, index) => (
                <tr key={result.team.id} className={index === 0 ? 'bg-primary-orange/20' : ''}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-lg font-bold text-white sm:pl-6">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-md text-gray-300">{result.team.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-md font-bold text-white">{result.points}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-md text-gray-300">{result.totalSpeakerScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-cream-white mb-4">Speaker Tab</h2>
         <div className="overflow-x-auto bg-dark-charcoal rounded-lg border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700 zebra-table">
            <thead className="bg-dark-charcoal">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-400 sm:pl-6 uppercase tracking-wider">Rank</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Speaker</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Team</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Average Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {speakerTab.map((result, index) => (
                 <tr key={result.participant.id} className={index === 0 ? 'bg-electric-blue/10' : ''}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-lg font-bold text-white sm:pl-6">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-md text-gray-300">{result.participant.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-md text-gray-300">{result.teamName}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-md font-bold text-white">{result.averageScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TabView;