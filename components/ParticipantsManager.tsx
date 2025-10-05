import React, { useState } from 'react';
import type { Tournament, Participant, Adjudicator, Team } from '../types';
import { DebateFormat } from '../types';
import { PlusIcon, TrashIcon, SparklesIcon } from './IconComponents';
import AiTeamEntryModal from './AiTeamEntryModal';

interface ParticipantsManagerProps {
  tournament: Tournament;
  setTournament: React.Dispatch<React.SetStateAction<Tournament | null>>;
}

const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({ tournament, setTournament }) => {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newAdjudicatorName, setNewAdjudicatorName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [teamMember1Id, setTeamMember1Id] = useState<string>('');
  const [teamMember2Id, setTeamMember2Id] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);


  const addParticipant = () => {
    if (newParticipantName.trim()) {
      const newParticipant: Participant = { id: Date.now().toString(), name: newParticipantName.trim() };
      setTournament(prev => prev ? { ...prev, participants: [...prev.participants, newParticipant] } : null);
      setNewParticipantName('');
    }
  };

  const removeParticipant = (id: string) => {
     setTournament(prev => {
        if (!prev) return null;
        const isParticipantInTeam = prev.teams.some(team => team.members.some(m => m.id === id));
        if (isParticipantInTeam) {
            alert("Cannot remove a participant who is part of a team. Please remove the team first.");
            return prev;
        }
        return { ...prev, participants: prev.participants.filter(p => p.id !== id) };
    });
  };
  
  const addAdjudicator = () => {
    if (newAdjudicatorName.trim()) {
      const newAdjudicator: Adjudicator = { id: Date.now().toString(), name: newAdjudicatorName.trim() };
      setTournament(prev => prev ? { ...prev, adjudicators: [...prev.adjudicators, newAdjudicator] } : null);
      setNewAdjudicatorName('');
    }
  };

  const removeAdjudicator = (id: string) => {
    setTournament(prev => prev ? { ...prev, adjudicators: prev.adjudicators.filter(a => a.id !== id) } : null);
  };
  
  const addTeam = () => {
    if (newTeamName.trim() && teamMember1Id && teamMember2Id && teamMember1Id !== teamMember2Id) {
      const member1 = tournament.participants.find(p => p.id === teamMember1Id);
      const member2 = tournament.participants.find(p => p.id === teamMember2Id);
      if (member1 && member2) {
        const newTeam: Team = {
          id: Date.now().toString(),
          name: newTeamName.trim(),
          members: [member1, member2],
        };
        setTournament(prev => prev ? { ...prev, teams: [...prev.teams, newTeam] } : null);
        setNewTeamName('');
        setTeamMember1Id('');
        setTeamMember2Id('');
      }
    }
  };

  const removeTeam = (id: string) => {
    setTournament(prev => prev ? { ...prev, teams: prev.teams.filter(t => t.id !== id) } : null);
  };

  const handleAiAddTeams = (teamNames: string[]) => {
    const newParticipants: Participant[] = [];
    const newTeams: Team[] = [];

    teamNames.forEach(name => {
        const p1: Participant = { id: `${Date.now()}-${name}-1`, name: `Speaker 1 from ${name}`};
        const p2: Participant = { id: `${Date.now()}-${name}-2`, name: `Speaker 2 from ${name}`};
        newParticipants.push(p1, p2);
        const newTeam: Team = { id: `${Date.now()}-${name}`, name, members: [p1, p2] };
        newTeams.push(newTeam);
    });

    setTournament(prev => {
        if (!prev) return null;
        return {
            ...prev,
            participants: [...prev.participants, ...newParticipants],
            teams: [...prev.teams, ...newTeams]
        };
    });
    setIsAiModalOpen(false);
  };


  const availableParticipants = tournament.participants.filter(
      p => !tournament.teams.some(t => t.members[0].id === p.id || t.members[1].id === p.id)
  );
  
  const isTeamFormat = tournament.format === DebateFormat.BP || tournament.format === DebateFormat.Public;

  return (
    <div>
      <h2 className="text-3xl font-bold text-cream-white mb-6">Manage Participants</h2>
      
      {isTeamFormat && (
          <>
            {/* Team Management */}
            <Section title="Teams" count={tournament.teams.length}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {tournament.teams.map(team => (
                      <EntityCard key={team.id} name={team.name} onRemove={() => removeTeam(team.id)}>
                          <p className="text-sm text-gray-400">{team.members.map(m => m.name).join(' & ')}</p>
                      </EntityCard>
                  ))}
              </div>
              <div className="bg-dark-charcoal p-4 rounded-lg border border-gray-700">
                  <h4 className="font-semibold mb-3 text-lg text-cream-white">Add New Team</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team Name" className="input-field" />
                      <select value={teamMember1Id} onChange={e => setTeamMember1Id(e.target.value)} className="input-field">
                          <option value="">Select Member 1</option>
                          {availableParticipants.filter(p => p.id !== teamMember2Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={teamMember2Id} onChange={e => setTeamMember2Id(e.target.value)} className="input-field">
                          <option value="">Select Member 2</option>
                          {availableParticipants.filter(p => p.id !== teamMember1Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                       <button onClick={addTeam} className="btn-primary col-span-1 sm:col-span-2">
                        <PlusIcon className="w-5 h-5 mr-2" /> Add Team
                       </button>
                  </div>
              </div>
            </Section>
          </>
      )}

      {/* Adjudicator Management */}
      <Section title="Adjudicators" count={tournament.adjudicators.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {tournament.adjudicators.map(adj => <EntityCard key={adj.id} name={adj.name} onRemove={() => removeAdjudicator(adj.id)} />)}
          </div>
            <div className="flex space-x-2">
              <input type="text" value={newAdjudicatorName} onChange={e => setNewAdjudicatorName(e.target.value)} placeholder="Adjudicator Name" className="input-field flex-grow" />
              <button onClick={addAdjudicator} className="btn-primary px-4"><PlusIcon className="w-5 h-5" /></button>
          </div>
      </Section>

      {/* Participant Management */}
      <Section title={isTeamFormat ? "Available Debaters" : "Participants"} count={tournament.participants.length}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {tournament.participants.map(p => <EntityCard key={p.id} name={p.name} onRemove={() => removeParticipant(p.id)} />)}
        </div>
        <div className="flex space-x-2">
            <input type="text" value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} placeholder="Participant Name" className="input-field flex-grow" />
            <button onClick={addParticipant} className="btn-primary px-4"><PlusIcon className="w-5 h-5" /></button>
        </div>
      </Section>
      
       {isTeamFormat && (
         <button 
            onClick={() => setIsAiModalOpen(true)}
            className="fixed bottom-8 right-8 btn-primary !rounded-full !p-4 shadow-2xl z-20 transform hover:scale-110 transition-transform"
            aria-label="Add teams with AI"
            title="Add teams with AI"
        >
            <SparklesIcon className="w-8 h-8" />
        </button>
       )}

      {isAiModalOpen && (
          <AiTeamEntryModal 
              onClose={() => setIsAiModalOpen(false)}
              onComplete={handleAiAddTeams}
          />
      )}

    </div>
  );
};

const Section: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
    <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
            <h3 className="text-xl font-semibold text-gray-300">{title}</h3>
            <span className="bg-dark-charcoal text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-gray-600">{count}</span>
        </div>
        {children}
    </div>
);

const EntityCard: React.FC<{ name: string, onRemove: () => void, children?: React.ReactNode }> = ({ name, onRemove, children }) => (
    <div className="bg-dark-charcoal rounded-lg p-3 flex justify-between items-center border border-gray-700">
        <div>
            <p className="font-medium text-cream-white">{name}</p>
            {children}
        </div>
        <button onClick={onRemove} className="text-gray-500 hover:text-error-coral transition-colors">
            <TrashIcon className="w-5 h-5" />
        </button>
    </div>
);


export default ParticipantsManager;