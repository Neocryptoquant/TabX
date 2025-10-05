export enum DebateFormat {
  BP = 'British Parliamentary',
  Public = 'Public Debate',
  PublicSpeaking = 'Public Speaking',
  Spar = 'Sparring',
}

export enum RoundStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
}

export enum MatchupStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  ScoresEntered = 'Scores Entered',
  Completed = 'Completed',
  Issue = 'Issue',
}


export interface Participant {
  id: string;
  name: string;
}

export interface Adjudicator {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  members: [Participant, Participant];
}

export interface BPBallot {
  ranks: { [teamId: string]: number }; // teamId -> rank
  speakerScores: { [participantId: string]: number }; // participantId -> score
}

export interface SpeakerScore {
  speakerId: string;
  name: string;
  score: number;
}

export interface PublicDebateBallot {
  govScores: [SpeakerScore, SpeakerScore];
  oppScores: [SpeakerScore, SpeakerScore];
  bestSpeakerId: string;
  winner: 'gov' | 'opp';
  privateComments?: string;
}

export interface BPDrawAdjudicator {
    id: string;
    name: string;
}

export interface BpMatchup {
  id: string;
  room: string;
  teams: {
    OG: Team;
    OO: Team;
    CG: Team;
    CO: Team;
  };
  adjudicators: BPDrawAdjudicator[];
  ballot: BPBallot | null;
  status: MatchupStatus;
}

export interface PublicDebateMatchup {
  id: string;
  room: string;
  venue?: string;
  status: MatchupStatus;
  teams: {
    gov: Team;
    opp: Team;
  };
  adjudicators: Adjudicator[];
  ballot: PublicDebateBallot | null;
}


export interface Round {
  roundNumber: number;
  motion: string;
  status: RoundStatus;
  matchups: (BpMatchup[] | PublicDebateMatchup[]);
}

export interface Tournament {
  name: string;
  format: DebateFormat;
  status: 'setup' | 'running' | 'finished';
  participants: Participant[];
  teams: Team[];
  adjudicators: Adjudicator[];
  rounds: Round[];
}

export interface TeamTabResult {
  team: Team;
  points: number;
  totalSpeakerScore: number;
}

export interface SpeakerTabResult {
  participant: Participant;
  teamName: string;
  scores: number[];
  averageScore: number;
}