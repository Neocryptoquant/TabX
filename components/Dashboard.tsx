import React, { useState } from 'react';
import type { Tournament } from '../types';
import Header from './Header';
import ParticipantsManager from './ParticipantsManager';
import RoundsView from './RoundsView';
import TabView from './TabView';
import { UsersIcon, ListIcon, TrophyIcon } from './IconComponents';

type Tab = 'participants' | 'rounds' | 'tab';

interface DashboardProps {
  tournament: Tournament;
  setTournament: React.Dispatch<React.SetStateAction<Tournament | null>>;
  setManagedRound: (roundNumber: number) => void;
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ tournament, setTournament, setManagedRound, onReset }) => {
  const [activeTab, setActiveTab] = useState<Tab>('participants');

  const TABS: { id: Tab; name: string; icon: React.ElementType }[] = [
    { id: 'participants', name: 'Participants', icon: UsersIcon },
    { id: 'rounds', name: 'Rounds', icon: ListIcon },
    { id: 'tab', name: 'Tab', icon: TrophyIcon },
  ];
  
  const renderContent = () => {
    switch (activeTab) {
      case 'participants':
        return <ParticipantsManager tournament={tournament} setTournament={setTournament} />;
      case 'rounds':
        return <RoundsView tournament={tournament} setTournament={setTournament} setManagedRound={setManagedRound} />;
      case 'tab':
        return <TabView tournament={tournament} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header tournamentName={tournament.name} tournamentFormat={tournament.format} onReset={onReset} />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-dark-charcoal-secondary border border-gray-700 rounded-xl shadow-lg">
          <div className="px-4 sm:px-6 border-b border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'tab-active'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                  } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-lg transition-colors duration-200`}
                >
                  <tab.icon className="-ml-0.5 mr-2 h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="p-4 sm:p-6">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;