import React from 'react';
import type { DebateFormat } from '../types';

interface HeaderProps {
  tournamentName: string;
  tournamentFormat: DebateFormat;
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ tournamentName, tournamentFormat, onReset }) => {
  return (
    <header className="bg-dark-charcoal-secondary/80 backdrop-blur-sm shadow-md sticky top-0 z-10 border-b border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
             <button onClick={onReset} className="text-3xl font-bold text-cream-white tracking-tight hover:text-primary-orange transition-colors">
              {tournamentName}
            </button>
          </div>
          <div>
            <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-bold bg-primary-orange/20 text-primary-orange border border-primary-orange/50">
              {tournamentFormat}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;